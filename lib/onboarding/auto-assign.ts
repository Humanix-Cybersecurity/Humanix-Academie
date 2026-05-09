// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Auto-assignation du parcours obligatoire a la creation d'un user.
//
// CAS D'USAGE :
//   Quand un nouveau collaborateur est cree (signup public, SCIM POST,
//   import CSV, invitation magic-link), on veut que sa premiere
//   connexion lui montre IMMEDIATEMENT les saisons obligatoires de son
//   tenant en haut de /apprendre, avec un statut "a faire".
//
//   Plutot que de creer des Progress.IN_PROGRESS (qui mentirait sur
//   l'engagement), on cree des Progress.NOT_STARTED sur le PREMIER
//   episode publie de chaque saison obligatoire. Quand l'user attaque
//   la saison, le Progress passe naturellement en IN_PROGRESS via le
//   flow normal.
//
//   Cela transforme un onboarding "viens chercher dans le catalogue"
//   en onboarding "voici ton parcours d'arrivee, on t'attend".
//
// IDEMPOTENCE :
//   Le @@unique([userId, episodeId]) sur Progress garantit qu'on ne
//   cree pas de doublons. Si l'user a deja une row (ex: re-import CSV
//   d'un user existant), on ne touche pas.
//
// BEST-EFFORT :
//   Un echec ici ne doit JAMAIS bloquer la creation du user (signup,
//   SCIM, etc.). Le caller wrap dans try/catch et log mais continue.

import { db } from "@/lib/db";

export type AutoAssignResult = {
  assigned: number;
  skipped: number;
  saisonSlugs: string[];
};

/**
 * Cree des rows Progress.NOT_STARTED pour les saisons obligatoires
 * du tenant, sur le premier episode publie de chaque saison. Idempotent
 * (pas d'ecrasement si une row existe deja).
 *
 * Renvoie un compte rendu (assigned / skipped / liste des saisons).
 */
export async function autoAssignMandatorySaisons(
  userId: string,
  tenantId: string,
): Promise<AutoAssignResult> {
  // 1) Saisons obligatoires de ce tenant (TenantSaisonConfig.isMandatory)
  const mandatoryConfigs = await db.tenantSaisonConfig.findMany({
    where: {
      tenantId,
      isMandatory: true,
      isActive: true,
      saison: { isPublished: true, tenantId },
    },
    select: {
      saisonId: true,
      saison: {
        select: {
          slug: true,
          episodes: {
            where: { isPublished: true },
            orderBy: { slug: "asc" }, // 01-, 02- ... = ordre alphabetique = ordre pedago
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (mandatoryConfigs.length === 0) {
    return { assigned: 0, skipped: 0, saisonSlugs: [] };
  }

  let assigned = 0;
  let skipped = 0;
  const saisonSlugs: string[] = [];

  for (const config of mandatoryConfigs) {
    const firstEpisode = config.saison.episodes[0];
    if (!firstEpisode) {
      skipped++; // saison obligatoire sans episode publie : on saute silencieusement
      continue;
    }

    // upsert idempotent
    const existing = await db.progress.findUnique({
      where: {
        userId_episodeId: { userId, episodeId: firstEpisode.id },
      },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.progress.create({
      data: {
        tenantId,
        userId,
        saisonId: config.saisonId,
        episodeId: firstEpisode.id,
        status: "NOT_STARTED",
        score: 0,
      },
    });
    assigned++;
    saisonSlugs.push(config.saison.slug);
  }

  return { assigned, skipped, saisonSlugs };
}

/**
 * Helper "fire and forget" pour les callers qui ne veulent pas du
 * Promise<AutoAssignResult> (ex: signup public ou SCIM POST qui ne
 * doivent pas attendre / faillir si l'auto-assign rate).
 *
 * Log un Event "user.onboarding_auto_assigned" en cas de succes pour
 * traçabilite, swallow l'erreur sinon.
 */
export async function fireAndForgetAutoAssign(
  userId: string,
  tenantId: string,
): Promise<void> {
  try {
    const result = await autoAssignMandatorySaisons(userId, tenantId);
    if (result.assigned > 0) {
      await db.event.create({
        data: {
          tenantId,
          userId,
          type: "user.onboarding_auto_assigned",
          payload: {
            assigned: result.assigned,
            skipped: result.skipped,
            saisonSlugs: result.saisonSlugs,
          },
        },
      });
    }
  } catch {
    // best-effort : ne casse jamais le flow d'onboarding
  }
}
