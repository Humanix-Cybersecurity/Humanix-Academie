// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Boucle fermee : une menace REELLE vient de toucher des collaborateurs,
// on leur pousse la formation correspondante dans l'heure.
//
// CE QUE CE MODULE FAIT, DANS L'ORDRE
//
//   1. Normalise les adresses recues et calcule une cle d'idempotence.
//   2. Si ce declencheur a deja ete traite : renvoie le resultat precedent,
//      sans rien refaire (le pont amont rejoue sur tout code != 200/202).
//   3. Resout les adresses en utilisateurs ACTIFS du tenant. Les inconnues
//      sont comptees, jamais conservees.
//   4. Resout la menace en une saison publiee, puis en son premier episode :
//      d'abord la suggestion du pont (`trigger_module`), sinon la
//      cartographie partagee lib/threat-modules.ts, avec les saisons
//      « juste apres » promues en tete.
//   5. Plafonne : une personne ne recoit pas deux fois la meme saison en
//      sept jours, ni plus de deux declenchements toutes saisons confondues.
//      Sans ca, un EDR bavard transforme la formation en spam.
//   6. Assigne l'episode (Progress NOT_STARTED, comme l'auto-assignation
//      d'onboarding) et notifie, en une transaction pour la partie base.
//   7. Trace : ThreatTrigger + recipients, un Event, un webhook sortant.
//
// CE QU'IL NE FAIT PAS, DELIBEREMENT
//
//   - Il ne nomme jamais qui a clique : la notification dit « ceci a circule
//     dans l'entreprise », pas « vous avez ouvert ». Meme ligne que les
//     episodes sur la surveillance des salaries.
//   - Il n'envoie pas de mail en mode demo (sendEmail s'en charge) et ne
//     fait jamais echouer l'assignation sur un echec d'envoi : la base
//     d'abord, le mail ensuite, en meilleur effort.
//   - Il n'ecrit rien en `dry_run` : le plan complet est calcule et rendu,
//     ce qui permet a un MSSP de brancher un outil sans rien declencher.

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { rankSaisonSlugsForLiveThreat } from "@/lib/threat-modules";
import { fireWebhook } from "@/lib/webhooks/dispatcher";
import { notifierDeclenchement } from "./notification";

// ---------------------------------------------------------------------------
// Politique de plafonnement. Constantes plutot que configuration tenant pour
// le MVP : on veut d'abord observer ce que produit un vrai branchement.
// ---------------------------------------------------------------------------
export const FENETRE_PLAFOND_JOURS = 7;
export const MAX_DECLENCHEMENTS_PAR_PERSONNE = 2;
export const MAX_MEME_SAISON_PAR_PERSONNE = 1;

export const STATUTS = [
  "assigned",
  "already_done",
  "all_throttled",
  "no_match",
  "no_recipients",
  "dry_run",
] as const;
export type StatutDeclencheur = (typeof STATUTS)[number];

export const ISSUES = [
  "assigned",
  "in_progress",
  "already_done",
  "throttled",
] as const;
export type IssueDestinataire = (typeof ISSUES)[number];

export type DeclencheurEntree = {
  source: string;
  logins: string[];
  reason: string;
  trigger_module?: string | null;
  subject?: string | null;
  from_address?: string | null;
  verdict?: string | null;
  external_id?: string | null;
  dry_run?: boolean;
};

export type DeclencheurContexte = {
  tenantId: string;
  apiKeyId?: string | null;
};

export type DeclencheurResultat = {
  trigger_id: string | null;
  replay: boolean;
  status: StatutDeclencheur;
  saison: { slug: string; title: string } | null;
  episode: { id: string; slug: string; title: string } | null;
  recipients: {
    requested: number;
    matched: number;
    assigned: number;
    in_progress: number;
    already_done: number;
    throttled: number;
    notified: number;
  };
};

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_SLUG = /^[a-z0-9][a-z0-9-]{1,79}$/;

export function normaliserAdresses(logins: string[]): string[] {
  const vues = new Set<string>();
  for (const brut of logins) {
    const e = String(brut ?? "")
      .trim()
      .toLowerCase();
    if (e && RE_EMAIL.test(e)) vues.add(e);
  }
  return Array.from(vues);
}

/**
 * Cle d'idempotence. L'identifiant de la source prime ; a defaut, une
 * empreinte du contenu, pour qu'un rejeu strict du meme message soit une
 * lecture et pas une seconde assignation.
 */
export function cleIdempotence(
  entree: DeclencheurEntree,
  adresses: string[],
): string {
  const fourni = (entree.external_id ?? "").trim();
  if (fourni) return fourni.slice(0, 200);
  const h = createHash("sha256");
  h.update(entree.source.toLowerCase());
  h.update("\n");
  h.update([...adresses].sort().join(","));
  h.update("\n");
  h.update((entree.subject ?? "").trim());
  h.update("\n");
  h.update((entree.from_address ?? "").trim().toLowerCase());
  h.update("\n");
  h.update(entree.reason.trim());
  return `fp_${h.digest("hex")}`;
}

/** Texte libre soumis a la cartographie : tout ce que la source a dit. */
function requeteMenace(entree: DeclencheurEntree): string {
  return [entree.reason, entree.subject, entree.from_address, entree.verdict]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .join(" ");
}

function statutDepuis(c: DeclencheurResultat["recipients"]): StatutDeclencheur {
  if (c.matched === 0) return "no_recipients";
  if (c.assigned + c.in_progress > 0) return "assigned";
  if (c.throttled > 0) return "all_throttled";
  return "already_done";
}

function resultatDepuisLigne(
  ligne: {
    id: string;
    status: string;
    saisonSlug: string | null;
    episodeId: string | null;
    recipientsRequested: number;
    recipientsMatched: number;
    recipientsAssigned: number;
    recipientsThrottled: number;
    recipientsNotified: number;
  },
  saison: { slug: string; title: string } | null,
  episode: { id: string; slug: string; title: string } | null,
  detail: { in_progress: number; already_done: number },
): DeclencheurResultat {
  return {
    trigger_id: ligne.id,
    replay: true,
    status: (STATUTS as readonly string[]).includes(ligne.status)
      ? (ligne.status as StatutDeclencheur)
      : "assigned",
    saison,
    episode,
    recipients: {
      requested: ligne.recipientsRequested,
      matched: ligne.recipientsMatched,
      assigned: ligne.recipientsAssigned,
      in_progress: detail.in_progress,
      already_done: detail.already_done,
      throttled: ligne.recipientsThrottled,
      notified: ligne.recipientsNotified,
    },
  };
}

async function rejouer(
  tenantId: string,
  source: string,
  externalId: string,
): Promise<DeclencheurResultat | null> {
  const ligne = await db.threatTrigger.findUnique({
    where: { tenantId_source_externalId: { tenantId, source, externalId } },
    include: {
      recipients: { select: { outcome: true } },
    },
  });
  if (!ligne) return null;
  const detail = {
    in_progress: ligne.recipients.filter((r) => r.outcome === "in_progress")
      .length,
    already_done: ligne.recipients.filter((r) => r.outcome === "already_done")
      .length,
  };
  let saison: { slug: string; title: string } | null = null;
  let episode: { id: string; slug: string; title: string } | null = null;
  if (ligne.episodeId) {
    const ep = await db.episode.findUnique({
      where: { id: ligne.episodeId },
      select: {
        id: true,
        slug: true,
        title: true,
        saison: { select: { slug: true, title: true } },
      },
    });
    if (ep) {
      episode = { id: ep.id, slug: ep.slug, title: ep.title };
      saison = { slug: ep.saison.slug, title: ep.saison.title };
    }
  } else if (ligne.saisonSlug) {
    saison = { slug: ligne.saisonSlug, title: ligne.saisonSlug };
  }
  return resultatDepuisLigne(ligne, saison, episode, detail);
}

type SaisonResolue = {
  id: string;
  slug: string;
  title: string;
  episode: { id: string; slug: string; title: string };
};

/**
 * Choisit la saison dans l'ordre des candidats, en ne retenant que celles
 * qui existent, sont publiees, visibles du tenant, et ont un episode publie.
 */
async function resoudreSaison(
  tenantId: string,
  entree: DeclencheurEntree,
): Promise<SaisonResolue | null> {
  const candidats: string[] = [];
  const suggestion = (entree.trigger_module ?? "").trim().toLowerCase();
  if (suggestion && RE_SLUG.test(suggestion)) candidats.push(suggestion);
  for (const s of rankSaisonSlugsForLiveThreat(requeteMenace(entree))) {
    if (!candidats.includes(s)) candidats.push(s);
  }
  if (candidats.length === 0) return null;

  const saisons = await db.saison.findMany({
    where: {
      slug: { in: candidats },
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      episodes: {
        where: { isPublished: true },
        orderBy: { slug: "asc" }, // 01-, 02- : l'ordre pedagogique
        take: 1,
        select: { id: true, slug: true, title: true },
      },
    },
  });
  const parSlug = new Map(saisons.map((s) => [s.slug, s]));
  for (const slug of candidats) {
    const s = parSlug.get(slug);
    if (s && s.episodes[0]) {
      return { id: s.id, slug: s.slug, title: s.title, episode: s.episodes[0] };
    }
  }
  return null;
}

type PlanDestinataire = {
  userId: string;
  email: string;
  prenom: string | null;
  outcome: IssueDestinataire;
  creerProgress: boolean;
};

/**
 * Applique le plafonnement puis l'etat de progression existant, et decide
 * pour chaque personne ce qu'on fait. Aucune ecriture ici.
 */
async function planifierDestinataires(
  utilisateurs: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
  }[],
  saison: SaisonResolue,
): Promise<PlanDestinataire[]> {
  const ids = utilisateurs.map((u) => u.id);
  const depuis = new Date(
    Date.now() - FENETRE_PLAFOND_JOURS * 24 * 60 * 60 * 1000,
  );

  const recents = await db.threatTriggerRecipient.findMany({
    where: {
      userId: { in: ids },
      createdAt: { gte: depuis },
      outcome: { in: ["assigned", "in_progress"] },
    },
    select: { userId: true, trigger: { select: { saisonSlug: true } } },
  });
  const totalParUser = new Map<string, number>();
  const memeSaisonParUser = new Map<string, number>();
  for (const r of recents) {
    totalParUser.set(r.userId, (totalParUser.get(r.userId) ?? 0) + 1);
    if (r.trigger.saisonSlug === saison.slug) {
      memeSaisonParUser.set(
        r.userId,
        (memeSaisonParUser.get(r.userId) ?? 0) + 1,
      );
    }
  }

  const progressions = await db.progress.findMany({
    where: { userId: { in: ids }, episodeId: saison.episode.id },
    select: { userId: true, status: true },
  });
  const progressParUser = new Map(
    progressions.map((p) => [p.userId, p.status]),
  );

  return utilisateurs.map((u) => {
    const prenom = u.firstName ?? (u.name ? u.name.split(" ")[0] : null);
    const plafonne =
      (totalParUser.get(u.id) ?? 0) >= MAX_DECLENCHEMENTS_PAR_PERSONNE ||
      (memeSaisonParUser.get(u.id) ?? 0) >= MAX_MEME_SAISON_PAR_PERSONNE;
    if (plafonne) {
      return {
        userId: u.id,
        email: u.email,
        prenom,
        outcome: "throttled",
        creerProgress: false,
      };
    }
    const etat = progressParUser.get(u.id);
    if (etat === "COMPLETED") {
      return {
        userId: u.id,
        email: u.email,
        prenom,
        outcome: "already_done",
        creerProgress: false,
      };
    }
    if (etat === "IN_PROGRESS") {
      return {
        userId: u.id,
        email: u.email,
        prenom,
        outcome: "in_progress",
        creerProgress: false,
      };
    }
    // NOT_STARTED existant : deja assigne, on ne recree pas mais on notifie.
    return {
      userId: u.id,
      email: u.email,
      prenom,
      outcome: "assigned",
      creerProgress: etat === undefined,
    };
  });
}

function compter(plan: PlanDestinataire[]) {
  const c = { assigned: 0, in_progress: 0, already_done: 0, throttled: 0 };
  for (const p of plan) c[p.outcome] += 1;
  return c;
}

/**
 * Point d'entree. Voir l'en-tete du fichier pour le deroule complet.
 */
export async function traiterDeclencheur(
  entree: DeclencheurEntree,
  ctx: DeclencheurContexte,
): Promise<DeclencheurResultat> {
  const { tenantId } = ctx;
  const source = entree.source.trim().toLowerCase();
  const adresses = normaliserAdresses(entree.logins);
  const externalId = cleIdempotence(entree, adresses);
  const dryRun = entree.dry_run === true;

  // 2. Rejeu : meme reponse, aucun effet.
  if (!dryRun) {
    const precedent = await rejouer(tenantId, source, externalId);
    if (precedent) return precedent;
  }

  const vide: DeclencheurResultat["recipients"] = {
    requested: adresses.length,
    matched: 0,
    assigned: 0,
    in_progress: 0,
    already_done: 0,
    throttled: 0,
    notified: 0,
  };

  // 3. Destinataires : uniquement les utilisateurs actifs du tenant.
  const utilisateurs =
    adresses.length === 0
      ? []
      : await db.user.findMany({
          where: { tenantId, isActive: true, email: { in: adresses } },
          select: { id: true, email: true, name: true, firstName: true },
        });
  vide.matched = utilisateurs.length;

  // 4. Saison et episode.
  const saison =
    utilisateurs.length === 0 ? null : await resoudreSaison(tenantId, entree);

  if (utilisateurs.length === 0 || !saison) {
    const status: StatutDeclencheur = dryRun
      ? "dry_run"
      : utilisateurs.length === 0
        ? "no_recipients"
        : "no_match";
    let triggerId: string | null = null;
    if (!dryRun) {
      triggerId = await persisterSansDestinataires(
        ctx,
        entree,
        source,
        externalId,
        status,
        vide,
        saison,
      );
    }
    return {
      trigger_id: triggerId,
      replay: false,
      status,
      saison: saison ? { slug: saison.slug, title: saison.title } : null,
      episode: saison ? saison.episode : null,
      recipients: vide,
    };
  }

  // 5. Plafonnement et etat existant.
  const plan = await planifierDestinataires(utilisateurs, saison);
  const compte = compter(plan);
  const recipients: DeclencheurResultat["recipients"] = {
    ...vide,
    ...compte,
    notified: 0,
  };

  if (dryRun) {
    return {
      trigger_id: null,
      replay: false,
      status: "dry_run",
      saison: { slug: saison.slug, title: saison.title },
      episode: saison.episode,
      recipients,
    };
  }

  // 6. Ecritures, en une transaction. Un rejeu concurrent butera sur
  //    l'unicite : on le traite comme une lecture.
  const status = statutDepuis(recipients);
  let triggerId: string;
  try {
    triggerId = await db.$transaction(async (tx) => {
      const t = await tx.threatTrigger.create({
        data: {
          tenantId,
          apiKeyId: ctx.apiKeyId ?? null,
          source,
          externalId,
          reason: entree.reason.trim().slice(0, 4000),
          subject: entree.subject?.trim().slice(0, 500) || null,
          fromAddress: entree.from_address?.trim().slice(0, 320) || null,
          verdict: entree.verdict?.trim().slice(0, 80) || null,
          requestedModule: entree.trigger_module?.trim().slice(0, 80) || null,
          saisonSlug: saison.slug,
          episodeId: saison.episode.id,
          status,
          recipientsRequested: recipients.requested,
          recipientsMatched: recipients.matched,
          recipientsAssigned: recipients.assigned + recipients.in_progress,
          recipientsThrottled: recipients.throttled,
          recipientsNotified: 0,
        },
        select: { id: true },
      });
      await tx.threatTriggerRecipient.createMany({
        data: plan.map((p) => ({
          triggerId: t.id,
          userId: p.userId,
          outcome: p.outcome,
        })),
      });
      const aCreer = plan.filter((p) => p.creerProgress);
      if (aCreer.length > 0) {
        await tx.progress.createMany({
          data: aCreer.map((p) => ({
            tenantId,
            userId: p.userId,
            saisonId: saison.id,
            episodeId: saison.episode.id,
            status: "NOT_STARTED",
            score: 0,
          })),
          skipDuplicates: true,
        });
      }
      return t.id;
    });
  } catch (err) {
    if (estConflitUnicite(err)) {
      const precedent = await rejouer(tenantId, source, externalId);
      if (precedent) return precedent;
    }
    throw err;
  }

  // 7. Notification en meilleur effort, APRES la transaction.
  const aNotifier = plan.filter(
    (p) => p.outcome === "assigned" || p.outcome === "in_progress",
  );
  let notifies = 0;
  const horodatage = new Date();
  for (const p of aNotifier) {
    const ok = await notifierDeclenchement({
      to: p.email,
      prenom: p.prenom,
      saisonTitle: saison.title,
      episodeTitle: saison.episode.title,
      saisonSlug: saison.slug,
      episodeSlug: saison.episode.slug,
      subject: entree.subject ?? null,
    });
    if (ok) {
      notifies += 1;
      await db.threatTriggerRecipient
        .update({
          where: { triggerId_userId: { triggerId, userId: p.userId } },
          data: { notifiedAt: horodatage },
        })
        .catch(() => {});
    }
  }
  if (notifies > 0) {
    await db.threatTrigger
      .update({
        where: { id: triggerId },
        data: { recipientsNotified: notifies },
      })
      .catch(() => {});
  }
  recipients.notified = notifies;

  // Traces : un Event sans adresse, un webhook sortant pour le SOC.
  await db.event
    .create({
      data: {
        tenantId,
        type: "threat.trigger.received",
        payload: {
          triggerId,
          source,
          saisonSlug: saison.slug,
          episodeSlug: saison.episode.slug,
          ...recipients,
        },
      },
    })
    .catch(() => {});
  void fireWebhook(tenantId, "threat.trigger.fired", {
    triggerId,
    source,
    saisonSlug: saison.slug,
    saisonTitle: saison.title,
    episodeTitle: saison.episode.title,
    recipientsMatched: recipients.matched,
    recipientsAssigned: recipients.assigned + recipients.in_progress,
    recipientsThrottled: recipients.throttled,
    recipientsNotified: notifies,
  });

  return {
    trigger_id: triggerId,
    replay: false,
    status,
    saison: { slug: saison.slug, title: saison.title },
    episode: saison.episode,
    recipients,
  };
}

async function persisterSansDestinataires(
  ctx: DeclencheurContexte,
  entree: DeclencheurEntree,
  source: string,
  externalId: string,
  status: StatutDeclencheur,
  recipients: DeclencheurResultat["recipients"],
  saison: SaisonResolue | null,
): Promise<string> {
  try {
    const t = await db.threatTrigger.create({
      data: {
        tenantId: ctx.tenantId,
        apiKeyId: ctx.apiKeyId ?? null,
        source,
        externalId,
        reason: entree.reason.trim().slice(0, 4000),
        subject: entree.subject?.trim().slice(0, 500) || null,
        fromAddress: entree.from_address?.trim().slice(0, 320) || null,
        verdict: entree.verdict?.trim().slice(0, 80) || null,
        requestedModule: entree.trigger_module?.trim().slice(0, 80) || null,
        saisonSlug: saison?.slug ?? null,
        episodeId: saison?.episode.id ?? null,
        status,
        recipientsRequested: recipients.requested,
        recipientsMatched: recipients.matched,
      },
      select: { id: true },
    });
    return t.id;
  } catch (err) {
    if (estConflitUnicite(err)) {
      const existant = await db.threatTrigger.findUnique({
        where: {
          tenantId_source_externalId: {
            tenantId: ctx.tenantId,
            source,
            externalId,
          },
        },
        select: { id: true },
      });
      if (existant) return existant.id;
    }
    throw err;
  }
}

function estConflitUnicite(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}
