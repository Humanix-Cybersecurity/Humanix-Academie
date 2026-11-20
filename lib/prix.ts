// SPDX-License-Identifier: AGPL-3.0-or-later
// Les prix des plans, en un seul endroit.
//
// POURQUOI CE MODULE EXISTE
//
//   Jusqu'au 2026-11-20, la grille et le paiement tenaient chacun leur table.
//   /tarifs et /souscrire affichaient l'annuel Pro a 2,50 EUR par utilisateur
//   et par mois (-17 %) ; le paiement prelevait 3 EUR moins 10 %, soit
//   2,70 EUR : 2 592 EUR au lieu de 2 400 pour 80 sieges. Meme ecart sur
//   Starter : 15 EUR par mois affiches en annuel, 19 preleves. La console et
//   le formulaire de devis annoncaient eux aussi « -10 % », et trois ecrans
//   ecrivaient « HT » des prix que les CGV disent TTC. Trouve en repondant a
//   un prospect, pas par un test.
//
//   Ici, une seule table. La grille de /tarifs (lib/pricing.ts), le montant
//   preleve par Mollie (lib/mollie.ts), le configurateur de la console,
//   l'estimation du formulaire de devis et l'audit flash la lisent tous.
//   lib/prix-affiche-preleve.test.ts compare ce que la grille affiche a ce que
//   le paiement preleve, siege par siege.
//
// TTC, TVA francaise de 20 % incluse : decision du 2026-08-20, « le prix
// affiche est le prix preleve » (CGV article 4). Le detail HT figure sur la
// facture (lib/facturation/montants.ts).
//
// Ce module n'importe rien a l'execution (lib/plans.ts importe la base de
// donnees) : il doit rester utilisable dans un composant client comme dans le
// webhook de paiement.

import type { PlanId } from "@/lib/plans";

// `null` = le plan n'a pas de prix de cette forme (forfait OU par siege), ou
// il est sur devis (Enterprise).

/** Forfait mensuel, sans engagement (€ TTC). */
export const PLAN_PRICE_EUR_MONTHLY: Record<PlanId, number | null> = {
  starter: 19, // au-dela des sieges gratuits (PLAN_FREE_SEATS), jusqu'a 15
  pro: null, // au siege, cf. PLAN_PRICE_PER_USER_EUR_MONTHLY
  enterprise: null, // sur devis
};

/**
 * Forfait PAR MOIS en engagement annuel : le chiffre que la grille affiche
 * (« 15 €/mois »). L'echeance annuelle vaut douze fois ce prix, prelevee en
 * une fois.
 */
export const PLAN_PRICE_EUR_MONTHLY_BILLED_ANNUALLY: Record<
  PlanId,
  number | null
> = {
  starter: 15, // 180 EUR par an, -21 % sur le mensuel
  pro: null,
  enterprise: null,
};

/** Prix par siege et par mois, sans engagement (€ TTC). */
export const PLAN_PRICE_PER_USER_EUR_MONTHLY: Record<PlanId, number | null> = {
  starter: null,
  pro: 3, // de 16 a 250 sieges
  enterprise: null,
};

/**
 * Prix par siege et PAR MOIS en engagement annuel (« 2,50 €/utilisateur/mois »).
 */
export const PLAN_PRICE_PER_USER_EUR_MONTHLY_BILLED_ANNUALLY: Record<
  PlanId,
  number | null
> = {
  starter: null,
  pro: 2.5, // 30 EUR par siege et par an, -17 % sur le mensuel
  enterprise: null,
};

export type CycleFacturation = "monthly" | "annual";

/**
 * Prix d'UN MOIS, en centimes TTC, pour `sieges` sieges : le chiffre que la
 * grille et le simulateur affichent (« /mois »). En annuel, c'est le douzieme
 * de l'echeance. `null` = sur devis.
 *
 * Le forfait Starter ne depend pas du nombre de sieges. Son sous-palier
 * gratuit (jusqu'a PLAN_FREE_SEATS sieges) ne passe jamais par ici : il n'a
 * ni prix a afficher ni paiement a creer.
 */
export function prixMensuelCentimes(
  plan: PlanId,
  cycle: CycleFacturation,
  sieges: number,
): number | null {
  const annuel = cycle === "annual";
  const forfait = (
    annuel ? PLAN_PRICE_EUR_MONTHLY_BILLED_ANNUALLY : PLAN_PRICE_EUR_MONTHLY
  )[plan];
  if (forfait !== null) return Math.round(forfait * 100);
  const parSiege = (
    annuel
      ? PLAN_PRICE_PER_USER_EUR_MONTHLY_BILLED_ANNUALLY
      : PLAN_PRICE_PER_USER_EUR_MONTHLY
  )[plan];
  if (parSiege !== null) return Math.round(parSiege * 100) * sieges;
  return null;
}

/**
 * Montant d'UNE ECHEANCE, en centimes TTC : ce que Mollie preleve. Un mois en
 * mensuel, douze mois d'un coup en annuel. `null` = sur devis.
 */
export function montantEcheanceCentimes(
  plan: PlanId,
  cycle: CycleFacturation,
  sieges: number,
): number | null {
  const mensuel = prixMensuelCentimes(plan, cycle, sieges);
  if (mensuel === null) return null;
  return cycle === "annual" ? mensuel * 12 : mensuel;
}

/**
 * Remise de l'engagement annuel sur le mensuel, en pourcentage entier : 17
 * pour Pro, 21 pour Starter. Calculee, jamais ecrite : une etiquette
 * « -10 % » a cote d'un prix a -17 % a tenu six mois dans la console.
 */
export function remiseAnnuellePourcent(plan: PlanId): number | null {
  const mensuel = prixMensuelCentimes(plan, "monthly", 1);
  const annuel = prixMensuelCentimes(plan, "annual", 1);
  if (mensuel === null || annuel === null || mensuel === 0) return null;
  return Math.round((1 - annuel / mensuel) * 100);
}

/**
 * « 19 », « 2,50 », « 2 400 » : un montant en euros, sans le symbole. Les
 * centimes ne s'affichent que s'il y en a.
 *
 * Assemble a la main, sans toLocaleString : le separateur de milliers varie
 * d'un moteur ICU a l'autre, et un composant client rendu deux fois (serveur
 * puis navigateur) ne doit pas produire deux textes (cf. lib/date-paris.ts).
 */
export function formaterPrix(centimes: number): string {
  const signe = centimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centimes));
  const euros = String(Math.floor(abs / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    " ",
  );
  const reste = abs % 100;
  return reste === 0
    ? `${signe}${euros}`
    : `${signe}${euros},${String(reste).padStart(2, "0")}`;
}

/**
 * Prix public d'un plan, en une ligne : « 19 €/mois TTC · forfait »,
 * « 3 €/utilisateur/mois TTC », « Tarif sur devis ». C'est le prix sans
 * engagement, celui qui sert de reference.
 */
export function libellePrixPlan(plan: PlanId): string {
  const forfait = PLAN_PRICE_EUR_MONTHLY[plan];
  if (forfait !== null) {
    return `${formaterPrix(Math.round(forfait * 100))} €/mois TTC · forfait`;
  }
  const parSiege = PLAN_PRICE_PER_USER_EUR_MONTHLY[plan];
  if (parSiege !== null) {
    return `${formaterPrix(Math.round(parSiege * 100))} €/utilisateur/mois TTC`;
  }
  return "Tarif sur devis";
}
