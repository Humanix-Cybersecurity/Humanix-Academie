// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Phase 3 (B2B reporting) - export SIEM des événements d'exposition.
//
// Émet les EmployeeExposure d'un tenant en deux formats standards :
//   - JSON normalisé (ingestion générique : Splunk HEC, Elastic, etc.)
//   - CEF (ArcSight Common Event Format), ligne par événement.
//
// GATED triple garde : l'export ne renvoie rien si la veille n'est pas active.
// Les données restent celles DU tenant (ses propres comptes salariés, sur ses
// domaines déclarés), exportées vers SON SIEM - couvert par le DPA art.28.

import { db } from "@/lib/db";
import { isB2bMonitoringActive } from "@/lib/exposure/b2b-flags";

export type SiemEvent = {
  id: string;
  detectedAt: string; // ISO
  status: string;
  matchedDomain: string;
  subject: string; // email du salarié concerné (corrélation SIEM)
  breachTitle: string;
  breachOrganization: string | null;
  validatedAt: string | null;
};

export type SiemExport =
  | { ok: true; generatedAt: string; count: number; events: SiemEvent[] }
  | { ok: false; reason: "inactive" | "no_tenant" };

/** Échappe une valeur d'extension CEF (espace conservé, = et \ échappés). */
function cefExt(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/=/g, "\\=")
    .replace(/\r?\n/g, " ");
}

/** Échappe un champ d'en-tête CEF (| et \ échappés). */
function cefHeader(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

const CEF_SEVERITY: Record<string, number> = {
  NEW: 6,
  VALIDATED: 7,
  TRAINING_ASSIGNED: 5,
  REMEDIATED: 2,
  DISMISSED: 1,
};

/** Sérialise un événement en ligne CEF (ArcSight). */
export function toCefLine(e: SiemEvent): string {
  const sev = CEF_SEVERITY[e.status] ?? 5;
  const epoch = Date.parse(e.detectedAt);
  const ext = [
    `suser=${cefExt(e.subject)}`,
    `cs1Label=matchedDomain`,
    `cs1=${cefExt(e.matchedDomain)}`,
    `cs2Label=breachOrganization`,
    `cs2=${cefExt(e.breachOrganization ?? e.breachTitle)}`,
    `cs3Label=status`,
    `cs3=${cefExt(e.status)}`,
    Number.isFinite(epoch) ? `end=${epoch}` : "",
    `externalId=${cefExt(e.id)}`,
  ]
    .filter(Boolean)
    .join(" ");
  return [
    "CEF:0",
    cefHeader("Humanix"),
    cefHeader("Academie"),
    cefHeader("1.0"),
    cefHeader("EMPLOYEE_EXPOSURE"),
    cefHeader("Compte salarie expose dans une fuite"),
    String(sev),
    ext,
  ].join("|");
}

/** Construit l'export SIEM d'un tenant (gated triple garde). */
export async function buildSiemExport(tenantId: string): Promise<SiemExport> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: true,
      exposureDomains: true,
    },
  });
  if (!tenant) return { ok: false, reason: "no_tenant" };
  if (!isB2bMonitoringActive(tenant)) return { ok: false, reason: "inactive" };

  const rows = await db.employeeExposure.findMany({
    where: { tenantId },
    orderBy: { detectedAt: "desc" },
    take: 5000,
    select: {
      id: true,
      detectedAt: true,
      status: true,
      matchedDomain: true,
      validatedAt: true,
      user: { select: { email: true } },
      breach: { select: { title: true, organization: true } },
    },
  });

  const events: SiemEvent[] = rows.map((r) => ({
    id: r.id,
    detectedAt: r.detectedAt.toISOString(),
    status: r.status,
    matchedDomain: r.matchedDomain,
    subject: r.user?.email ?? "",
    breachTitle: r.breach?.title ?? "",
    breachOrganization: r.breach?.organization ?? null,
    validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
  }));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    count: events.length,
    events,
  };
}

/** Rend l'export au format demandé (chaîne prête à télécharger). */
export function serializeSiemExport(
  data: Extract<SiemExport, { ok: true }>,
  format: "json" | "cef",
): string {
  if (format === "cef") {
    return data.events.map(toCefLine).join("\n") + "\n";
  }
  return JSON.stringify(
    {
      generatedAt: data.generatedAt,
      count: data.count,
      events: data.events,
    },
    null,
    2,
  );
}
