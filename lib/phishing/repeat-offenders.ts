// SPDX-License-Identifier: AGPL-3.0-or-later
//
// PROTECTION DES RÉCIDIVISTES (repeat-offender) — roadmap #2.
//
// Un « récidiviste » est un collaborateur qui a ÉCHOUÉ à plusieurs
// simulations de phishing (clic ou, pire, saisie de ses identifiants).
// On l'identifie pour permettre au RSSI/admin de lui (ré)assigner un module
// anti-phishing ciblé — décision HUMAINE, jamais automatique (posture :
// pas de sanction automatisée, on accompagne).
//
// 100 % data-driven : AUCUN appel IA (pas de coût token runtime). On compte
// les échecs en base et on réutilise le mécanisme d'auto-enrôlement éprouvé
// (Progress NOT_STARTED), comme l'exposition B2B (cf. lib/exposure/b2b-assign).

import { dbReadOnly as dbRO } from "@/lib/db-readonly";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";

/** Saison de remédiation assignée (anti-phishing, présente dans le socle). */
export const REMEDIATION_SAISON_SLUG = "reconnaitre-phishing";

/** Seuil par défaut : 2 simulations échouées = récidiviste. */
const DEFAULT_MIN_FAILS = 2;

export type RepeatOffender = {
  userId: string;
  name: string;
  email: string;
  service: string | null;
  /** Nombre de campagnes échouées (clic OU saisie), 1 par (user, campagne). */
  failCount: number;
  /** Détail : clics sans saisie. */
  clickCount: number;
  /** Détail : saisies d'identifiants (plus grave). */
  submitCount: number;
  lastFailAt: Date | null;
  /** A déjà une progression sur la saison de remédiation (évite le doublon). */
  remediationAssigned: boolean;
};

/**
 * Liste les récidivistes phishing d'un tenant (>= minFails échecs).
 * Lecture pure (client read-only). Volume modeste -> agrégation côté app.
 */
export async function listRepeatOffenders(
  tenantId: string,
  opts: { minFails?: number } = {},
): Promise<{ offenders: RepeatOffender[]; minFails: number }> {
  const minFails = Math.max(1, Math.min(10, opts.minFails ?? DEFAULT_MIN_FAILS));

  // Tous les échecs de simulation du tenant (clic OU saisie). Le couple
  // (userId, campaignId) est unique en base -> 1 ligne = 1 échec distinct.
  const rows = await dbRO.phishingResult.findMany({
    where: {
      campaign: { tenantId },
      OR: [{ clickedAt: { not: null } }, { submittedAt: { not: null } }],
    },
    select: {
      userId: true,
      clickedAt: true,
      submittedAt: true,
    },
  });
  if (rows.length === 0) return { offenders: [], minFails };

  type Acc = { fails: number; clicks: number; submits: number; last: Date | null };
  const byUser = new Map<string, Acc>();
  for (const r of rows) {
    const e = byUser.get(r.userId) ?? { fails: 0, clicks: 0, submits: 0, last: null };
    e.fails += 1;
    if (r.submittedAt) e.submits += 1;
    else if (r.clickedAt) e.clicks += 1;
    const when = r.submittedAt ?? r.clickedAt;
    if (when && (!e.last || when > e.last)) e.last = when;
    byUser.set(r.userId, e);
  }

  const offenderIds = [...byUser.entries()]
    .filter(([, e]) => e.fails >= minFails)
    .map(([id]) => id);
  if (offenderIds.length === 0) return { offenders: [], minFails };

  // Infos users (actifs uniquement) + statut remédiation déjà posée.
  const [users, remed] = await Promise.all([
    dbRO.user.findMany({
      where: { id: { in: offenderIds }, isActive: true },
      select: { id: true, name: true, email: true, service: true },
    }),
    dbRO.progress.findMany({
      where: {
        userId: { in: offenderIds },
        saison: { slug: REMEDIATION_SAISON_SLUG },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);
  const remedSet = new Set(remed.map((p) => p.userId));
  const userMap = new Map(users.map((u) => [u.id, u]));

  const offenders: RepeatOffender[] = [];
  for (const id of offenderIds) {
    const u = userMap.get(id);
    if (!u) continue; // user inactif ou supprimé -> on ignore
    const e = byUser.get(id)!;
    offenders.push({
      userId: id,
      name: u.name ?? "",
      email: u.email,
      service: u.service,
      failCount: e.fails,
      clickCount: e.clicks,
      submitCount: e.submits,
      lastFailAt: e.last,
      remediationAssigned: remedSet.has(id),
    });
  }

  // Tri : saisies d'identifiants d'abord (plus grave), puis nb d'échecs.
  offenders.sort(
    (a, b) => b.submitCount - a.submitCount || b.failCount - a.failCount,
  );
  return { offenders, minFails };
}

export type AssignRemediationResult =
  | { ok: true; episodeId: string }
  | { ok: false; error: "user_not_found" | "no_episode" };

/**
 * Assigne le module anti-phishing à un récidiviste (décision RSSI/admin).
 * Crée une Progress NOT_STARTED sur le 1er épisode publié de la saison de
 * remédiation. Idempotent (n'écrase pas un COMPLETED). Audit-loggé.
 */
export async function assignPhishingRemediation(
  userId: string,
  tenantId: string,
  actor: { userId: string; role: string; email?: string },
): Promise<AssignRemediationResult> {
  // Le user doit appartenir au tenant de l'acteur (anti cross-tenant).
  const user = await db.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "user_not_found" };

  const episode = await db.episode.findFirst({
    where: { isPublished: true, saison: { slug: REMEDIATION_SAISON_SLUG } },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
    select: { id: true, saisonId: true },
  });
  if (!episode) return { ok: false, error: "no_episode" };

  await db.progress.upsert({
    where: { userId_episodeId: { userId, episodeId: episode.id } },
    update: {}, // ne pas écraser une progression existante
    create: {
      tenantId,
      userId,
      saisonId: episode.saisonId,
      episodeId: episode.id,
      status: "NOT_STARTED",
      score: 0,
    },
  });

  void auditLog({
    action: "PHISHING_REMEDIATION_ASSIGNED",
    outcome: "SUCCESS",
    tenantId,
    actor: { userId: actor.userId, email: actor.email, role: actor.role },
    target: { type: "user", id: userId },
    message:
      "Module anti-phishing assigne a un recidiviste (decision RSSI/admin).",
  });

  return { ok: true, episodeId: episode.id };
}
