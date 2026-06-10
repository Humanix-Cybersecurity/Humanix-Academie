"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions du dashboard RSSI /admin/exposition (Phase 2 B2B).
//
// POSTURE "on se blinde au max" :
//   - Toutes les actions sont RSSI/ADMIN-gated + plan enterprise.
//   - L'activation exige la confirmation EXPLICITE de la signature du DPA
//     art.28 (case a cocher) ET au moins un domaine declare. On enregistre
//     alors exposureMonitoringDpaSignedAt = now() (gate legal materialise).
//   - Meme une fois ces conditions reunies cote tenant, la veille reste
//     INERTE tant que le kill switch plateforme EXPOSURE_B2B_ENABLED n'est
//     pas a "true" (cf. isB2bGloballyEnabled). L'UI le signale.
//   - L'assignation de formation passe TOUJOURS par validateAndAssignTraining
//     (validation RSSI humaine), jamais automatiquement.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import {
  validateAndAssignTraining,
  dismissExposure,
} from "@/lib/exposure/b2b-assign";
import {
  buildSiemExport,
  serializeSiemExport,
} from "@/lib/exposure/b2b-siem-export";
import { buildComplianceReport } from "@/lib/exposure/b2b-report";

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Garde commune : RSSI/ADMIN/SUPERADMIN + plan enterprise (feature
 * exposure_monitoring). Renvoie tenantId + identite de l'acteur.
 */
async function requireExposureAdmin(): Promise<
  | { ok: true; tenantId: string; userId: string; role: string }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "unauthorized" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { ok: false, error: "forbidden" };
  }
  const tenantId = session.user.tenantId as string | undefined;
  if (!tenantId) return { ok: false, error: "no_tenant" };

  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "exposure_monitoring")) {
    return { ok: false, error: "plan_required" };
  }
  return { ok: true, tenantId, userId: session.user.id as string, role };
}

/**
 * Parse la liste de domaines saisie (virgules / sauts de ligne / espaces).
 * Garde uniquement des domaines plausibles (anti-saisie accidentelle d'email
 * complet ou de texte libre), en minuscules, dedupliques.
 */
function parseDomains(raw: string): string[] {
  const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/;
  const seen = new Set<string>();
  for (const tok of raw.split(/[\s,;]+/)) {
    let d = tok.trim().toLowerCase();
    if (!d) continue;
    // Tolere une saisie "@domaine.fr" ou "user@domaine.fr".
    if (d.includes("@")) d = d.slice(d.lastIndexOf("@") + 1);
    if (DOMAIN_RE.test(d)) seen.add(d);
  }
  return [...seen].slice(0, 25);
}

/**
 * Active la veille pour le tenant : enregistre l'opt-in + la signature DPA +
 * les domaines. Exige la case "DPA signe" cochee et >= 1 domaine valide.
 * NB : n'active PAS le kill switch plateforme (hors perimetre tenant).
 */
export async function enableExposureMonitoring(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireExposureAdmin();
  if (!guard.ok) return guard;

  const dpaConfirmed = formData.get("dpaConfirmed") === "on";
  if (!dpaConfirmed) {
    return { ok: false, error: "dpa_not_confirmed" };
  }
  const domains = parseDomains(String(formData.get("domains") ?? ""));
  if (domains.length === 0) {
    return { ok: false, error: "no_valid_domain" };
  }

  await db.tenant.update({
    where: { id: guard.tenantId },
    data: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: new Date(),
      exposureDomains: domains,
    },
  });

  void auditLog({
    action: "EXPOSURE_MONITORING_ENABLED",
    outcome: "SUCCESS",
    tenantId: guard.tenantId,
    actor: { userId: guard.userId, role: guard.role },
    target: { type: "tenant", id: guard.tenantId },
    message: "Veille d'exposition activee (opt-in tenant + DPA art.28 confirme).",
    metadata: { domains, domainCount: domains.length },
  });

  revalidatePath("/admin/exposition");
  return {
    ok: true,
    message: `Veille configuree sur ${domains.length} domaine(s).`,
  };
}

/** Desactive la veille (conserve l'historique DPA pour tracabilite). */
export async function disableExposureMonitoring(): Promise<ActionResult> {
  const guard = await requireExposureAdmin();
  if (!guard.ok) return guard;

  await db.tenant.update({
    where: { id: guard.tenantId },
    data: { exposureMonitoringEnabled: false },
  });

  void auditLog({
    action: "EXPOSURE_MONITORING_DISABLED",
    outcome: "SUCCESS",
    tenantId: guard.tenantId,
    actor: { userId: guard.userId, role: guard.role },
    target: { type: "tenant", id: guard.tenantId },
    message: "Veille d'exposition desactivee.",
  });

  revalidatePath("/admin/exposition");
  return { ok: true, message: "Veille desactivee." };
}

/**
 * VALIDATION RSSI : valide une exposition et assigne la formation de
 * remediation au salarie (NEW -> TRAINING_ASSIGNED). Seul point qui
 * declenche une assignation.
 */
export async function validateExposureAction(
  exposureId: string,
): Promise<ActionResult> {
  const guard = await requireExposureAdmin();
  if (!guard.ok) return guard;

  const res = await validateAndAssignTraining(
    exposureId,
    guard.tenantId,
    guard.userId,
  );
  revalidatePath("/admin/exposition");
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, message: "Formation de remediation assignee." };
}

/** Ecarte une exposition (faux positif) : statut -> DISMISSED. */
export async function dismissExposureAction(
  exposureId: string,
): Promise<ActionResult> {
  const guard = await requireExposureAdmin();
  if (!guard.ok) return guard;

  const res = await dismissExposure(exposureId, guard.tenantId, guard.userId);
  revalidatePath("/admin/exposition");
  if (!res.ok) return { ok: false, error: "not_found" };
  return { ok: true, message: "Exposition ecartee." };
}

// ---------------------------------------------------------------------------
// Phase 3 : exports (SIEM + rapport de posture). Renvoient le contenu prêt à
// télécharger côté client (Blob). Gated triple garde + audit accountability.
// ---------------------------------------------------------------------------

type DownloadResult =
  | { ok: true; filename: string; content: string; mime: string }
  | { ok: false; error: string };

/** Export SIEM des événements d'exposition (JSON ou CEF). */
export async function exportSiemAction(
  format: "json" | "cef",
): Promise<DownloadResult> {
  const guard = await requireExposureAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const data = await buildSiemExport(guard.tenantId);
  if (!data.ok) return { ok: false, error: data.reason };

  void auditLog({
    action: "EXPOSURE_REPORT_EXPORTED",
    outcome: "SUCCESS",
    tenantId: guard.tenantId,
    actor: { userId: guard.userId, role: guard.role },
    target: { type: "siem_export", label: `${data.count} evenement(s) / ${format}` },
    message: "Export SIEM des expositions.",
    metadata: { format, count: data.count },
  });

  const content = serializeSiemExport(data, format);
  const stamp = data.generatedAt.slice(0, 10);
  return {
    ok: true,
    filename: `humanix-exposition-siem-${stamp}.${format === "cef" ? "cef" : "json"}`,
    content,
    mime: format === "cef" ? "text/plain" : "application/json",
  };
}

/** Rapport de posture de conformité (markdown, agrégé, NIS2/RGPD art.32). */
export async function exportComplianceReportAction(): Promise<DownloadResult> {
  const guard = await requireExposureAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const report = await buildComplianceReport(guard.tenantId);
  if (!report.ok) return { ok: false, error: report.reason };

  void auditLog({
    action: "EXPOSURE_REPORT_EXPORTED",
    outcome: "SUCCESS",
    tenantId: guard.tenantId,
    actor: { userId: guard.userId, role: guard.role },
    target: { type: "compliance_report", label: "posture" },
    message: "Export du rapport de posture d'exposition.",
    metadata: { kind: "compliance_report" },
  });

  const stamp = report.generatedAt.slice(0, 10);
  return {
    ok: true,
    filename: `humanix-exposition-rapport-${stamp}.md`,
    content: report.markdown,
    mime: "text/markdown",
  };
}
