// SPDX-License-Identifier: AGPL-3.0-or-later
// Quotas de Hex Chat : combien de messages, avec quel modele, selon le plan.
//
// Pourquoi : depuis le 2026-10-01 l'instance paie ses jetons Mistral
// (abonnement Pro, 25,50 EUR de credits API par mois). Le limiteur horaire
// par personne protegeait le debit du palier gratuit, pas un budget : un
// seul compte Pro pouvait consommer 43 200 messages par mois.
//
// Catalogue de prix de l'organisation, releve le 2026-10-01, en EUR par
// million de jetons :
//   mistral-small-latest    entree 0,13   sortie 0,51
//   mistral-large-latest    entree 0,43   sortie 1,28
//   mistral-medium-latest   entree 1,28   sortie 6,38  (3 a 5 fois large : exclu)
// Un message Hex au pire cas : environ 7 500 jetons en entree (prompt
// systeme, extraits RAG jusqu'a 12 000 caracteres, 20 messages
// d'historique) et 800 en sortie, soit 0,004 EUR sur large et 0,001 EUR
// sur small ; en usage courant deux a trois fois moins.
//
// Trois leviers, du plus efficace au plus simple :
//   1. le modele depend du plan : small pour le palier gratuit, le modele
//      configure (HEX_AI_MODEL, large en prod) pour les plans payants ;
//   2. des plafonds par jour, par personne et par espace, en plus de l'heure ;
//   3. un plafond quotidien de l'instance, HEX_DAILY_CAP, qui borne la
//      facture quoi qu'il arrive : 500 messages par jour = 2 EUR au pire
//      cas sur large, 60 EUR par mois au pire, 20 a 30 EUR en usage courant.
//
// Les compteurs sont ceux de lib/rate-limit.ts, en memoire : ils repartent
// de zero a chaque redemarrage du conteneur. Acceptable pour borner un
// budget, pas pour facturer.

import { checkRateLimit } from "@/lib/rate-limit";
import { getProviderKind } from "@/lib/ai/provider";
import type { PlanId } from "@/lib/plans";

export type QuotaPlan = {
  /** Messages par personne et par heure. */
  parHeure: number;
  /** Messages par personne et par jour. */
  parJour: number;
  /** Messages par espace (tenant) et par jour, toutes personnes confondues. */
  espaceParJour: number;
};

export const QUOTAS_HEX: Record<PlanId, QuotaPlan> = {
  starter: { parHeure: 12, parJour: 40, espaceParJour: 120 },
  pro: { parHeure: 60, parJour: 200, espaceParJour: 800 },
  enterprise: { parHeure: 200, parJour: 500, espaceParJour: 2500 },
};

/** Plafond quotidien de l'instance quand HEX_DAILY_CAP n'est pas renseigne. */
export const PLAFOND_INSTANCE_PAR_DEFAUT = 500;

/** Modele du palier gratuit quand HEX_AI_MODEL_STARTER n'est pas renseigne. */
export const MODELE_STARTER_PAR_DEFAUT = "mistral-small-latest";

/**
 * Plafond quotidien de messages pour toute l'instance. Renseigne par
 * HEX_DAILY_CAP ; sinon 500 avec Mistral (jetons factures), illimite avec
 * Ollama ou sans provider (rien a facturer).
 */
export function plafondInstanceParJour(): number {
  const brut = Number(process.env.HEX_DAILY_CAP?.trim());
  if (Number.isFinite(brut) && brut > 0) return Math.floor(brut);
  return getProviderKind() === "mistral"
    ? PLAFOND_INSTANCE_PAR_DEFAUT
    : Number.POSITIVE_INFINITY;
}

/**
 * Modele a demander au provider pour ce plan. `undefined` laisse le
 * provider appliquer sa configuration (HEX_AI_MODEL puis son defaut).
 * Seul Mistral facture au jeton : avec Ollama, un seul modele local.
 */
export function modelePourPlan(plan: PlanId): string | undefined {
  if (getProviderKind() !== "mistral") return undefined;
  if (plan === "starter") {
    return (
      process.env.HEX_AI_MODEL_STARTER?.trim() || MODELE_STARTER_PAR_DEFAUT
    );
  }
  return undefined;
}

export type PorteeQuota = "heure" | "jour" | "espace" | "instance";

export type VerdictQuota =
  | { ok: true }
  | {
      ok: false;
      portee: PorteeQuota;
      limite: number;
      /** Secondes avant la reouverture de la fenetre. */
      retryAfter: number;
    };

const HEURE_MS = 60 * 60 * 1000;
const JOUR_MS = 24 * HEURE_MS;

/**
 * Verifie, et consomme, les quotas dans l'ordre du plus particulier au plus
 * general : heure et jour de la personne, jour de l'espace, jour de
 * l'instance. Un refus sur l'heure, le cas courant, ne consomme donc ni le
 * compteur de l'espace ni celui de l'instance.
 */
export function verifierQuotasHex(params: {
  userId: string;
  tenantId: string | null | undefined;
  plan: PlanId;
}): VerdictQuota {
  const q = QUOTAS_HEX[params.plan];
  const etapes: Array<[PorteeQuota, string, number, number]> = [
    ["heure", `hex-chat:${params.userId}`, q.parHeure, HEURE_MS],
    ["jour", `hex-chat:jour:${params.userId}`, q.parJour, JOUR_MS],
  ];
  if (params.tenantId) {
    etapes.push([
      "espace",
      `hex-chat:espace:${params.tenantId}`,
      q.espaceParJour,
      JOUR_MS,
    ]);
  }
  const plafond = plafondInstanceParJour();
  if (Number.isFinite(plafond)) {
    etapes.push(["instance", "hex-chat:instance", plafond, JOUR_MS]);
  }
  for (const [portee, cle, limite, fenetre] of etapes) {
    const r = checkRateLimit(cle, limite, fenetre);
    if (!r.ok) return { ok: false, portee, limite, retryAfter: r.retryAfter };
  }
  return { ok: true };
}

/** Message affiche par Hex quand un quota est atteint. */
export function messageQuota(
  verdict: Exclude<VerdictQuota, { ok: true }>,
): string {
  switch (verdict.portee) {
    case "heure":
      return (
        `Tu as atteint la limite de ${verdict.limite} messages par heure sur ton plan. ` +
        "Réessaye dans un moment, ou passe sur un plan supérieur pour augmenter la cadence."
      );
    case "jour":
      return (
        `Tu as atteint la limite de ${verdict.limite} messages par jour sur ton plan. ` +
        "Hex revient demain, ou passe sur un plan supérieur."
      );
    case "espace":
      return (
        `Votre espace a atteint sa limite de ${verdict.limite} messages par jour. ` +
        "Hex revient demain pour tout le monde."
      );
    case "instance":
      return "Hex a tenu toutes les conversations prévues aujourd'hui sur cette instance. Il revient demain.";
  }
}
