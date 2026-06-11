// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Assignation de formation à un salarié exposé — UNIQUEMENT après VALIDATION
// RSSI humaine. C'est le maillon "feature cœur" (exposition -> formation ->
// suivi), mais cadenassé : jamais déclenché automatiquement par le cron.
//
// Réutilise le mécanisme d'auto-enrôlement éprouvé (Progress NOT_STARTED),
// comme la remédiation phishing et autoAssignMandatorySaisons.

import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { isB2bMonitoringActive } from "@/lib/exposure/b2b-flags";

// Épisode de remédiation assigné par défaut (le plus pertinent pour une
// fuite d'organisation). Fait partie de la saison exposition-numerique.
const REMEDIATION_SAISON = "exposition-numerique";
const REMEDIATION_EPISODE = "02-email-dans-une-fuite";

export type AssignResult =
  | { ok: true; episodeId: string }
  | { ok: false; error: "not_found" | "monitoring_inactive" | "no_episode" | "wrong_status" };

/**
 * Valide une exposition (RSSI) et assigne la formation de remédiation au
 * salarié. Passe le statut NEW -> TRAINING_ASSIGNED. Idempotent côté Progress.
 */
export async function validateAndAssignTraining(
  exposureId: string,
  tenantId: string,
  validatorUserId: string,
): Promise<AssignResult> {
  const exposure = await db.employeeExposure.findFirst({
    where: { id: exposureId, tenantId },
    select: { id: true, userId: true, status: true },
  });
  if (!exposure) return { ok: false, error: "not_found" };
  if (exposure.status === "TRAINING_ASSIGNED" || exposure.status === "REMEDIATED") {
    return { ok: false, error: "wrong_status" };
  }

  // Re-vérifie la triple garde (défense en profondeur : on ne valide pas si
  // la veille a été désactivée entre-temps).
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: true,
      exposureDomains: true,
    },
  });
  if (!tenant || !isB2bMonitoringActive(tenant)) {
    return { ok: false, error: "monitoring_inactive" };
  }

  // Résout l'épisode de remédiation (scopé tenant ou platform-wide).
  const episode = await db.episode.findFirst({
    where: {
      slug: REMEDIATION_EPISODE,
      saison: { slug: REMEDIATION_SAISON },
    },
    select: { id: true, saisonId: true },
  });
  if (!episode) return { ok: false, error: "no_episode" };

  await db.$transaction(async (tx) => {
    // Auto-enrôlement : Progress NOT_STARTED si pas déjà présent.
    await tx.progress.upsert({
      where: {
        userId_episodeId: { userId: exposure.userId, episodeId: episode.id },
      },
      update: {}, // ne pas écraser un éventuel COMPLETED
      create: {
        tenantId,
        userId: exposure.userId,
        saisonId: episode.saisonId,
        episodeId: episode.id,
        status: "NOT_STARTED",
        score: 0,
      },
    });
    await tx.employeeExposure.update({
      where: { id: exposure.id },
      data: {
        status: "TRAINING_ASSIGNED",
        validatedByUserId: validatorUserId,
        validatedAt: new Date(),
        assignedEpisodeId: episode.id,
      },
    });
  });

  void auditLog({
    action: "EXPOSURE_TRAINING_ASSIGNED",
    outcome: "SUCCESS",
    tenantId,
    actor: { userId: validatorUserId, role: "RSSI" },
    target: { type: "employee_exposure", id: exposure.id },
    message: "Formation de remediation assignee apres validation RSSI.",
  });

  return { ok: true, episodeId: episode.id };
}

/** Écarte une exposition (faux positif). Statut -> DISMISSED. */
export async function dismissExposure(
  exposureId: string,
  tenantId: string,
  validatorUserId: string,
): Promise<{ ok: boolean }> {
  const res = await db.employeeExposure.updateMany({
    where: { id: exposureId, tenantId, status: { in: ["NEW", "VALIDATED"] } },
    data: {
      status: "DISMISSED",
      validatedByUserId: validatorUserId,
      validatedAt: new Date(),
    },
  });
  return { ok: res.count > 0 };
}
