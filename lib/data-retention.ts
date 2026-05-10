// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Retention configurable des donnees personnelles - RGPD art. 5.1.e
// (limitation de la conservation).
//
// PHILOSOPHIE :
//   - L'admin du tenant configure Tenant.dataRetentionDays (null = pas de
//     purge auto, opt-in).
//   - Le cron tourne quotidiennement (cf. app/api/cron/data-retention-purge)
//     ET on expose un bouton "executer maintenant" dans l'UI admin.
//   - Tout est traceable : preview avant action, AuditLog apres action.
//
// CE QU'ON PURGE QUAND user inactif > N jours :
//   - DELETE Event > seuil       (telemetry, peu de valeur retroactive)
//   - DELETE AuditLog > seuil    SAUF actions critiques (cf. PROTECTED_AUDIT_ACTIONS)
//   - ANONYMIZE User inactif    (email/name/IP vides, ID conserve pour
//                                 integrite FK Progress / Event)
//
// CE QU'ON GARDE :
//   - Progress (parcours pedago anonyme apres anonymisation user)
//   - Stats agregees (cyber-meteo, scores tenant)
//   - AuditLog d'actions critiques : TENANT_*, USER_DELETED,
//     DATA_ERASURE_*, BILLING_* (preuve fiscale = 10 ans), DATA_RETENTION_*

import { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import { auditLog, AuditActions, AuditOutcomes } from "@/lib/audit";

export const RETENTION_MIN_DAYS = 30;
export const RETENTION_MAX_DAYS = 3650; // 10 ans
export const RETENTION_RECOMMENDED_DAYS = 730; // 2 ans (formation cyber B2B)

/**
 * Actions d'audit qu'on conserve INDEFINIMENT (jamais purgees, meme en
 * dehors de la fenetre de retention). Justification :
 *   - TENANT_*, USER_DELETED, DATA_ERASURE_COMPLETED : preuves de
 *     traitement RGPD, attendues si la CNIL audite.
 *   - BILLING_* : conservation comptable / fiscale 10 ans (Code de commerce).
 *   - DATA_RETENTION_* : meta-trace de la politique elle-meme.
 */
const PROTECTED_AUDIT_ACTIONS: AuditAction[] = [
  AuditAction.TENANT_CREATED,
  AuditAction.TENANT_UPDATED,
  AuditAction.TENANT_DELETED,
  AuditAction.USER_DELETED,
  AuditAction.DATA_ERASURE_REQUESTED,
  AuditAction.DATA_ERASURE_COMPLETED,
  AuditAction.DATA_RETENTION_CONFIGURED,
  AuditAction.DATA_RETENTION_PURGED,
  AuditAction.BILLING_SUBSCRIPTION_CREATED,
  AuditAction.BILLING_SUBSCRIPTION_UPDATED,
  AuditAction.BILLING_SUBSCRIPTION_CANCELED,
  AuditAction.BILLING_PAYMENT_FAILED,
];

export type RetentionPreview = {
  /** Snapshot du seuil applique (now - dataRetentionDays). */
  cutoff: Date;
  /** Tenant.dataRetentionDays utilise pour le calcul. null = pas de purge. */
  retentionDays: number | null;
  /** Nb de Event a supprimer (> cutoff). */
  eventsToDelete: number;
  /** Nb de AuditLog a supprimer (> cutoff, hors actions protegees). */
  auditLogsToDelete: number;
  /** Nb de User a anonymiser (inactifs > cutoff, pas deja anonymises). */
  usersToAnonymize: number;
};

export type RetentionResult = {
  ok: true;
  cutoff: Date;
  eventsDeleted: number;
  auditLogsDeleted: number;
  usersAnonymized: number;
};

/**
 * Valide qu'une duree de retention est dans les bornes acceptables.
 */
export function isValidRetentionDays(days: number): boolean {
  return (
    Number.isInteger(days) &&
    days >= RETENTION_MIN_DAYS &&
    days <= RETENTION_MAX_DAYS
  );
}

/**
 * Calcule la date "cutoff" = (now - days). Tout enregistrement avec
 * createdAt/updatedAt strictement anterieur a cette date sera purge.
 *
 * UTC : on travaille en UTC pour eviter les decalages horaires entre
 * la JVM/Node host et la DB Postgres. Une retention de "30 jours"
 * signifie 30×24h = 720h exactement, peu importe le DST.
 *
 * Exporte pour testabilite (cf. data-retention.test.ts).
 */
export function cutoffFromRetention(days: number, now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff;
}

/**
 * Detecte les users qu'on peut anonymiser sans risque : inactifs depuis
 * plus longtemps que la retention ET pas deja anonymises (l'email contient
 * "@anonymized.local" est notre signal).
 *
 * Exporte pour testabilite et reutilisation par d'autres modules RGPD
 * (cf. lib/data-erasure.ts, app/api/cron/data-retention-purge).
 */
export function isAnonymizedEmail(email: string): boolean {
  return email.endsWith("@anonymized.local");
}

/**
 * Calcule sans modifier la DB ce qui SERAIT purge.
 * Utilise par l'UI admin pour afficher l'impact avant confirmation.
 */
export async function previewPurge(
  tenantId: string,
  now: Date = new Date(),
): Promise<RetentionPreview> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { dataRetentionDays: true },
  });
  if (!tenant?.dataRetentionDays) {
    return {
      cutoff: now,
      retentionDays: null,
      eventsToDelete: 0,
      auditLogsToDelete: 0,
      usersToAnonymize: 0,
    };
  }
  const cutoff = cutoffFromRetention(tenant.dataRetentionDays, now);

  const [eventsToDelete, auditLogsToDelete, candidateUsers] =
    await Promise.all([
      db.event.count({
        where: { tenantId, createdAt: { lt: cutoff } },
      }),
      db.auditLog.count({
        where: {
          tenantId,
          createdAt: { lt: cutoff },
          action: { notIn: PROTECTED_AUDIT_ACTIONS },
        },
      }),
      db.user.findMany({
        where: {
          tenantId,
          // Inactif : aucune activite recente. On utilise lastSeenAt qui
          // est mis a jour a chaque session, fallback lastLoginAt, fallback
          // createdAt (jamais connecte depuis sa creation).
          OR: [
            {
              AND: [
                { lastSeenAt: { lt: cutoff } },
                {
                  OR: [
                    { lastLoginAt: { lt: cutoff } },
                    { lastLoginAt: null },
                  ],
                },
              ],
            },
            {
              AND: [
                { lastSeenAt: null },
                { lastLoginAt: { lt: cutoff } },
              ],
            },
            {
              AND: [
                { lastSeenAt: null },
                { lastLoginAt: null },
                { createdAt: { lt: cutoff } },
              ],
            },
          ],
        },
        select: { id: true, email: true },
      }),
    ]);

  // Filtre cote app : pas deja anonymises.
  const usersToAnonymize = candidateUsers.filter(
    (u) => !isAnonymizedEmail(u.email),
  ).length;

  return {
    cutoff,
    retentionDays: tenant.dataRetentionDays,
    eventsToDelete,
    auditLogsToDelete,
    usersToAnonymize,
  };
}

/**
 * Execute la purge selon la config du tenant.
 * Idempotent : tourner deux fois ne refait rien (les donnees ciblees ont
 * deja ete supprimees / anonymisees au 1er passage).
 *
 * Loggue une entree DATA_RETENTION_PURGED dans AuditLog avec les counters.
 */
export async function executePurge(
  tenantId: string,
  options: {
    /** Email de l'admin qui a declenche (null si cron). */
    triggeredByEmail?: string | null;
    /** Si true, c'est le cron, sinon c'est un trigger manuel UI. */
    automated?: boolean;
    now?: Date;
  } = {},
): Promise<RetentionResult> {
  const now = options.now ?? new Date();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { dataRetentionDays: true },
  });
  if (!tenant?.dataRetentionDays) {
    return {
      ok: true,
      cutoff: now,
      eventsDeleted: 0,
      auditLogsDeleted: 0,
      usersAnonymized: 0,
    };
  }
  const cutoff = cutoffFromRetention(tenant.dataRetentionDays, now);

  // === 1. Events ===
  const eventsRes = await db.event.deleteMany({
    where: { tenantId, createdAt: { lt: cutoff } },
  });

  // === 2. AuditLog (hors actions protegees) ===
  const auditRes = await db.auditLog.deleteMany({
    where: {
      tenantId,
      createdAt: { lt: cutoff },
      action: { notIn: [...PROTECTED_AUDIT_ACTIONS] as never },
    },
  });

  // === 3. Users inactifs : anonymisation ===
  const candidateUsers = await db.user.findMany({
    where: {
      tenantId,
      OR: [
        {
          AND: [
            { lastSeenAt: { lt: cutoff } },
            {
              OR: [{ lastLoginAt: { lt: cutoff } }, { lastLoginAt: null }],
            },
          ],
        },
        {
          AND: [{ lastSeenAt: null }, { lastLoginAt: { lt: cutoff } }],
        },
        {
          AND: [
            { lastSeenAt: null },
            { lastLoginAt: null },
            { createdAt: { lt: cutoff } },
          ],
        },
      ],
    },
    select: { id: true, email: true },
  });
  const toAnonymize = candidateUsers.filter(
    (u) => !isAnonymizedEmail(u.email),
  );

  let usersAnonymized = 0;
  for (const u of toAnonymize) {
    try {
      await db.user.update({
        where: { id: u.id },
        data: {
          email: `purged-${u.id}@anonymized.local`,
          name: null,
          mascotEmojiCustom: null,
          lastLoginIpHash: null,
          passwordHash: null,
          mfaSecret: null,
          mfaBackupCodesHash: null,
          // Le compte reste inactif apres anonymisation pour empecher
          // qu'un homonyme tombe par hasard dessus.
          isActive: false,
        },
      });
      usersAnonymized++;
    } catch (e) {
      // Conflit potentiel sur l'email (rare, anciens IDs) : on logge et
      // on continue sur le suivant.
      console.warn(
        `[data-retention] anonymization failed for user ${u.id}`,
        e,
      );
    }
  }

  // === 4. Met a jour le timestamp et trace l'AuditLog ===
  await db.tenant.update({
    where: { id: tenantId },
    data: { dataRetentionLastRunAt: now },
  });

  await auditLog({
    action: AuditActions.DATA_RETENTION_PURGED,
    outcome: AuditOutcomes.SUCCESS,
    actor: {
      email: options.triggeredByEmail ?? "system:cron-data-retention",
    },
    tenantId,
    message: options.automated
      ? "Purge automatique RGPD"
      : "Purge manuelle RGPD",
    metadata: {
      retentionDays: tenant.dataRetentionDays,
      cutoff: cutoff.toISOString(),
      eventsDeleted: eventsRes.count,
      auditLogsDeleted: auditRes.count,
      usersAnonymized,
      automated: !!options.automated,
    },
  });

  return {
    ok: true,
    cutoff,
    eventsDeleted: eventsRes.count,
    auditLogsDeleted: auditRes.count,
    usersAnonymized,
  };
}
