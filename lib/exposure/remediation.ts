// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Génération du PLAN DE REMÉDIATION personnalisé à partir des résultats de
// checks. Fonction PURE (pas d'I/O). Chaque item cite une source officielle
// (cybermalveillance.gouv.fr, CNIL) et pointe vers le micro-module pédagogique
// pertinent de la saison `exposition-numerique`.

import type { ExposureInput } from "./exposure-score";

export type RemediationItem = {
  key: string;
  label: string;
  why: string;
  /** Priorité 1 = urgent, 2 = important, 3 = bonne pratique */
  priority: 1 | 2 | 3;
  /** Source officielle FR pour crédibilité + blindage */
  sourceUrl: string;
  sourceLabel: string;
  /** Slug d'épisode de la saison exposition-numerique (déclenchement micro-module) */
  episodeSlug: string;
};

const E = (slug: string) => `exposition-numerique/${slug}`;

export function deriveRemediationPlan(input: ExposureInput): RemediationItem[] {
  const items: RemediationItem[] = [];

  if (input.passwordPwned) {
    items.push({
      key: "change-pwd-everywhere",
      label: "Changer ce mot de passe partout, avec un mot de passe unique par site",
      why: "Un mot de passe fuité et réutilisé permet le credential stuffing : un attaquant rejoue le couple email+mdp sur des milliers de sites.",
      priority: 1,
      sourceUrl: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/mots-de-passe",
      sourceLabel: "cybermalveillance.gouv.fr",
      episodeSlug: E("01-mot-de-passe-compromis"),
    });
    items.push({
      key: "password-manager",
      label: "Adopter un gestionnaire de mots de passe",
      why: "Retenir un mot de passe unique par site est impossible à la main. Un gestionnaire (KeePassXC souverain) le fait pour toi.",
      priority: 1,
      sourceUrl: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/gestionnaires-de-mots-de-passe",
      sourceLabel: "cybermalveillance.gouv.fr",
      episodeSlug: E("01-mot-de-passe-compromis"),
    });
  }

  // MFA : toujours recommandé (le filet de sécurité universel).
  items.push({
    key: "enable-mfa",
    label: "Activer la double authentification (MFA) partout où c'est possible",
    why: "Même si un mot de passe fuite, la MFA empêche la connexion sans ton second facteur.",
    priority: input.passwordPwned ? 1 : 2,
    sourceUrl: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/securiser-ses-comptes-double-authentification",
    sourceLabel: "cybermalveillance.gouv.fr",
    episodeSlug: E("03-activer-la-mfa"),
  });

  if (input.domainBreaches > 0) {
    items.push({
      key: "watch-org-accounts",
      label: "Surveiller les comptes liés à ton organisation et signaler tout accès suspect",
      why: "Ton organisation apparaît dans des fuites publiques : redouble de vigilance sur les tentatives d'hameçonnage ciblé.",
      priority: 2,
      sourceUrl: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/hameconnage-phishing",
      sourceLabel: "cybermalveillance.gouv.fr",
      episodeSlug: E("02-email-dans-une-fuite"),
    });
  }

  if (input.sensitiveDataInBreaches) {
    items.push({
      key: "monitor-bank",
      label: "Surveiller tes relevés bancaires et opposer si nécessaire",
      why: "Des données sensibles (mdp/CB/identité) figurent dans ces fuites. Surveille toute opération inhabituelle.",
      priority: 1,
      sourceUrl: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/fraude-carte-bancaire",
      sourceLabel: "cybermalveillance.gouv.fr",
      episodeSlug: E("06-reflexes-apres-fuite"),
    });
  }

  // Bonnes pratiques universelles.
  items.push({
    key: "email-aliases",
    label: "Cloisonner tes emails (alias, adresses dédiées perso/admin/achats)",
    why: "Un alias compromis se jette sans impacter tes autres comptes.",
    priority: 3,
    sourceUrl: "https://www.cnil.fr/fr/cnil-direct/question/proteger-mon-adresse-electronique",
    sourceLabel: "CNIL",
    episodeSlug: E("04-alias-et-cloisonnement"),
  });
  items.push({
    key: "data-broker-optout",
    label: "Demander l'effacement de tes données aux courtiers (droit RGPD art. 17)",
    why: "Réduire ton empreinte limite la surface d'attaque et le doxxing.",
    priority: 3,
    sourceUrl: "https://www.cnil.fr/fr/le-droit-leffacement-supprimer-vos-donnees-en-ligne",
    sourceLabel: "CNIL",
    episodeSlug: E("05-opt-out-data-brokers"),
  });

  // Tri par priorité (1 d'abord).
  return items.sort((a, b) => a.priority - b.priority);
}
