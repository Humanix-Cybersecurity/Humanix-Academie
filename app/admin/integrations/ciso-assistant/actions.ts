"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de l'admin console CISO Assistant.
//
// Toutes les actions :
//   - Verifient le role (ADMIN / RSSI / SUPERADMIN) via requireAdmin()
//   - Logent dans AuditLog (CISO_CONNECTION_CONFIGURED, CISO_CONNECTION_TESTED,
//     CISO_CONNECTION_DELETED, CISO_SYNC_STARTED)
//   - Sont strictement scoped au tenant de l'admin (pas de cross-tenant)
//
// La sync elle-meme tourne en fire-and-forget : runSync() ne fait que
// creer le run et retourne le runId. L'execution reelle (login CISO +
// upserts) tourne en arriere-plan et ecrit dans run.logs. L'UI streame
// les logs via SSE -> /api/admin/ciso-sync/[runId]/stream.

import { revalidatePath } from "next/cache";
import { AuditAction, AuditOutcome, AuditSeverity } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import {
  encryptCisoPassword,
  decryptCisoPassword,
} from "@/lib/ciso-assistant/encryption";
import { testCisoConnection } from "@/lib/ciso-assistant/client";
import { runCisoSync } from "@/lib/ciso-assistant/sync";
import {
  SUPPORTED_FRAMEWORKS,
  type FrameworkRef,
} from "@/lib/mapping-grc";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return {
    tenantId: session.user.tenantId as string,
    actor: {
      userId: session.user.id as string,
      email: session.user.email as string,
      role: role as string,
    },
  };
}

export async function saveConnection(formData: FormData): Promise<{
  ok: true;
}> {
  const { tenantId, actor } = await requireAdmin();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const folderName =
    String(formData.get("folderName") ?? "").trim() || "Humanix Académie";
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim() || null;
  const verifySSL = formData.get("verifySSL") === "on";
  const createAppliedControls = formData.get("createAppliedControls") === "on";
  const createFindings = formData.get("createFindings") === "on";
  const createRiskScenarios = formData.get("createRiskScenarios") === "on";
  const syncOwnerAsActor = formData.get("syncOwnerAsActor") === "on";
  const createIncidents = formData.get("createIncidents") === "on";

  if (!baseUrl || !username) {
    throw new Error("Base URL et username obligatoires");
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("Base URL doit commencer par http:// ou https://");
  }
  if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new Error("Email du responsable invalide");
  }

  const existing = await db.cisoAssistantConnection.findUnique({
    where: { tenantId },
  });

  // Si pas de nouveau password fourni et la conn existe, on garde l'ancien.
  let passwordEnc: string;
  if (password) {
    passwordEnc = encryptCisoPassword(password);
  } else if (existing) {
    passwordEnc = existing.passwordEnc;
  } else {
    throw new Error("Password obligatoire pour une nouvelle connexion");
  }

  await db.cisoAssistantConnection.upsert({
    where: { tenantId },
    create: {
      tenantId,
      baseUrl,
      username,
      passwordEnc,
      folderName,
      ownerEmail,
      verifySSL,
      createAppliedControls,
      createFindings,
      createRiskScenarios,
      syncOwnerAsActor,
      createIncidents,
    },
    update: {
      baseUrl,
      username,
      passwordEnc,
      folderName,
      ownerEmail,
      verifySSL,
      createAppliedControls,
      createFindings,
      createRiskScenarios,
      syncOwnerAsActor,
      createIncidents,
    },
  });

  await auditLog({
    action: AuditAction.CISO_CONNECTION_CONFIGURED,
    actor,
    tenantId,
    target: { type: "ciso_connection", label: baseUrl },
    message: `Connexion CISO Assistant ${existing ? "mise à jour" : "configurée"}`,
    metadata: { baseUrl, folderName, verifySSL },
  });

  revalidatePath("/admin/integrations/ciso-assistant");
  return { ok: true };
}

export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
  detail?: string;
}> {
  const { tenantId, actor } = await requireAdmin();
  const conn = await db.cisoAssistantConnection.findUnique({
    where: { tenantId },
  });
  if (!conn) {
    return { ok: false, message: "Aucune connexion configurée" };
  }
  const password = decryptCisoPassword(conn.passwordEnc);
  const result = await testCisoConnection({
    baseUrl: conn.baseUrl,
    username: conn.username,
    password,
    folderName: conn.folderName,
    verifySSL: conn.verifySSL,
  });

  await db.cisoAssistantConnection.update({
    where: { tenantId },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: result.ok ? "ok" : result.reason,
      lastTestError: result.ok ? null : result.error.slice(0, 500),
    },
  });

  await auditLog({
    action: AuditAction.CISO_CONNECTION_TESTED,
    outcome: result.ok ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
    severity: result.ok ? AuditSeverity.INFO : AuditSeverity.WARNING,
    actor,
    tenantId,
    target: { type: "ciso_connection", label: conn.baseUrl },
    message: result.ok
      ? `Connexion OK (${result.existingEvidences} evidences existantes)`
      : `Echec : ${result.reason}`,
    metadata: result.ok
      ? { folderId: result.folderId, existingEvidences: result.existingEvidences }
      : { reason: result.reason },
  });

  revalidatePath("/admin/integrations/ciso-assistant");

  if (result.ok) {
    return {
      ok: true,
      message: `Connexion OK — folder « ${conn.folderName} » (${result.existingEvidences} evidence(s) existante(s)).`,
      detail: `ID interne : ${result.folderId}`,
    };
  }
  return {
    ok: false,
    message: `Échec : ${result.reason}`,
    detail: result.error.slice(0, 300),
  };
}

export async function deleteConnection(): Promise<{ ok: true }> {
  const { tenantId, actor } = await requireAdmin();
  const conn = await db.cisoAssistantConnection.findUnique({
    where: { tenantId },
  });
  if (!conn) return { ok: true };
  await db.cisoAssistantConnection.delete({ where: { tenantId } });
  await auditLog({
    action: AuditAction.CISO_CONNECTION_DELETED,
    actor,
    tenantId,
    target: { type: "ciso_connection", label: conn.baseUrl },
    message: "Connexion CISO Assistant supprimée",
  });
  revalidatePath("/admin/integrations/ciso-assistant");
  return { ok: true };
}

export async function startSync(formData: FormData): Promise<{
  runId: string;
}> {
  const { tenantId, actor } = await requireAdmin();
  const frameworkRaw = String(formData.get("framework") ?? "");
  if (!(SUPPORTED_FRAMEWORKS as readonly string[]).includes(frameworkRaw)) {
    throw new Error(`Framework non supporté : ${frameworkRaw}`);
  }
  const framework = frameworkRaw as FrameworkRef;

  // Garde-fou : pas plus d'un run "running" par tenant en parallele.
  const running = await db.cisoAssistantSyncRun.count({
    where: { tenantId, status: "running" },
  });
  if (running > 0) {
    throw new Error(
      "Une synchronisation est déjà en cours pour ce tenant. Attendez sa fin.",
    );
  }

  const { runId } = await runCisoSync({
    tenantId,
    framework,
    triggeredBy: actor.userId,
    actor,
  });

  revalidatePath("/admin/integrations/ciso-assistant");
  return { runId };
}
