// SPDX-License-Identifier: AGPL-3.0-or-later
//
// ANECDOTES_SEED_DEMO - 6 incidents cyber publics de 2024, fortement
// mediatises et sourcables, livres en open source dans le repo public.
//
// USAGE : seeding d'une instance en mode DEMO ou d'un fork OSS pur.
// Le catalogue complet (16+ anecdotes 2018-2024, curation hebdo) reste
// dans le repo prive content-pro/lib/anecdotes/seed-data.ts.
//
// Cf. prisma/seed-data-loader.ts -> loadAnecdoteSeeds() qui bascule
// sur ce catalogue quand DEMO_MODE=true.
//
// LICENCE DU CONTENU : CC BY-SA 4.0. Sources : presse francaise grand
// public (Le Monde, Numerama, ZDNet, Next INpact, BFMTV), faits avéres
// et déclarations officielles (CNIL, communiqués des organisations).

import { AnecdoteCategory } from "@prisma/client";
import type { SeedAnecdote } from "./seed-types";

export const ANECDOTES_SEED_DEMO: SeedAnecdote[] = [
  {
    slug: "demo-france-travail-43m-citoyens",
    title: "France Travail : 43 millions de citoyens exposés en mars 2024",
    summary:
      "Le 13 mars 2024, France Travail (ex-Pole Emploi) annonce qu'un sous-traitant Cap Emploi a subi une intrusion : 43 millions de demandeurs d'emploi des 20 dernières années sont concernés (nom, prénom, date de naissance, NIR, adresse, email, téléphone). Pas de mot de passe ni de RIB compromis, mais le jackpot pour les escrocs.",
    lesson:
      "La donnée personnelle stockée par sous-traitance reste sous ta responsabilité (RGPD art. 28). Un incident chez ton prestataire = ton incident. La chaîne de sous-traitance doit être auditée, contractualisée, et limitée au strict nécessaire (principe de minimisation).",
    miniAction:
      "Liste tes 3 principaux sous-traitants qui traitent des données personnelles. Vérifie que tu as une clause RGPD signée et un schéma d'incident clair (qui appelle qui, sous combien d'heures).",
    sourceUrl:
      "https://www.cnil.fr/fr/violation-de-donnees-france-travail-cap-emploi",
    sourceLabel: "CNIL, communiqué officiel du 13 mars 2024",
    category: AnecdoteCategory.DATA_LEAK,
    incidentDate: "2024-03-13",
  },
  {
    slug: "demo-free-19m-abonnes-2024",
    title: "Free : 19 millions de comptes et 5 millions d'IBAN volés en octobre 2024",
    summary:
      "Le 25 octobre 2024, l'opérateur Free confirme une intrusion via un outil de gestion interne. 19 millions de comptes (état civil, email, téléphone) et 5 millions d'IBAN exposés. Les données sont mises en vente sur un forum underground. Free notifie individuellement les clients impactés.",
    lesson:
      "Un IBAN ne sert pas à voler de l'argent directement, mais à monter des arnaques crédibles (faux courrier de remboursement, faux RIB de rupture). La vigilance post-fuite doit durer des mois, pas des jours.",
    miniAction:
      "Si tu es client Free : vérifie tes mails reçus depuis octobre 2024 pour la notification individuelle, et surveille tout courrier 'urgent' évoquant ton IBAN dans les 12 mois à venir. En cas de doute : appelle ton conseiller bancaire sur son numéro habituel.",
    sourceUrl: "https://www.numerama.com/cyberguerre/1837619-piratage-de-free-iban-comptes-bancaires-tout-savoir.html",
    sourceLabel: "Numerama, 26 octobre 2024",
    category: AnecdoteCategory.DATA_LEAK,
    incidentDate: "2024-10-25",
  },
  {
    slug: "demo-chu-cannes-ransomware-2024",
    title: "Le CHU de Cannes paralysé par un rançongiciel en avril 2024",
    summary:
      "Le 16 avril 2024, le centre hospitalier de Cannes Simone Veil détecte une cyberattaque. Le SI est coupé, retour au papier pendant plusieurs semaines. Le groupe LockBit revendique l'attaque et publie des données médicales et RH après refus de l'hôpital de payer la rançon.",
    lesson:
      "Le secteur santé reste la cible n°1 en France (CERT-FR, panorama 2024). La continuité d'activité en mode dégradé (papier, fax, communication par téléphone) doit être préparée AVANT l'incident, pas découverte pendant.",
    miniAction:
      "Note 3 process critiques de ton organisation et écris en 10 lignes comment ils tournent SANS informatique. Si tu n'y arrives pas, c'est qu'il faut faire l'exercice avec ton équipe.",
    sourceUrl: "https://www.lemonde.fr/pixels/article/2024/04/17/cyberattaque-contre-l-hopital-de-cannes-l-etablissement-met-en-place-une-cellule-de-crise_6228377_4408996.html",
    sourceLabel: "Le Monde, 17 avril 2024",
    category: AnecdoteCategory.RANSOMWARE,
    incidentDate: "2024-04-16",
  },
  {
    slug: "demo-viamedis-almerys-fevrier-2024",
    title: "Viamedis & Almerys : 33 millions d'assurés santé exposés en février 2024",
    summary:
      "Début février 2024, deux opérateurs de tiers payant (Viamedis et Almerys) annoncent successivement des intrusions par phishing ciblé. 33 millions d'assurés mutuelle concernés : état civil, situation familiale, numéro de sécurité sociale, nom de la mutuelle. La CNIL ouvre une procédure de contrôle.",
    lesson:
      "Le phishing ciblé d'un compte technicien suffit à compromettre des bases massives. L'authentification multifacteur sur les comptes back-office N'EST PAS optionnelle - c'est le verrou minimal légal pour traiter des données sensibles (CNIL).",
    miniAction:
      "Audite cette semaine les comptes 'admin' / 'opérateur' de tes outils métier : MFA activée ? Sessions limitées dans le temps ? Logs d'accès consultés ? Si non sur l'un des 3, c'est une priorité.",
    sourceUrl: "https://www.cnil.fr/fr/violations-de-donnees-viamedis-et-almerys-la-cnil-ouvre-des-procedures-de-controle",
    sourceLabel: "CNIL, communiqué officiel du 7 février 2024",
    category: AnecdoteCategory.DATA_LEAK,
    incidentDate: "2024-02-01",
  },
  {
    slug: "demo-anydesk-rotation-clefs-2024",
    title: "AnyDesk : intrusion sur les serveurs de production en février 2024",
    summary:
      "Le 2 février 2024, AnyDesk (logiciel de prise en main à distance utilisé par 170 000 entreprises) annonce qu'un attaquant a accédé à ses systèmes de production. L'éditeur force la rotation des mots de passe de tous les utilisateurs et révoque ses certificats de signature de code.",
    lesson:
      "Quand un outil de prise en main à distance est compromis, tout le parc client devient suspect. Garder l'inventaire des logiciels installés (et désinstaller ce qui ne sert plus) est un acte de cybersécurité concret.",
    miniAction:
      "Liste les 5 logiciels installés sur ton poste qui ont les droits 'admin' ou 'prise en main à distance'. Désinstalle ceux que tu n'as pas utilisés depuis 3 mois. Le reste : à jour ? MFA activée ?",
    sourceUrl: "https://anydesk.com/en/public-statement",
    sourceLabel: "AnyDesk, communiqué officiel du 2 février 2024",
    category: AnecdoteCategory.SUPPLY_CHAIN,
    incidentDate: "2024-02-02",
  },
  {
    slug: "demo-direct-assurance-aout-2024",
    title: "Direct Assurance : 6 millions de clients exposés en août 2024",
    summary:
      "Le 28 août 2024, Direct Assurance (filiale d'AXA) notifie une intrusion via un sous-traitant : 6 millions d'assurés concernés (état civil, contrats, sinistres, parfois RIB). Les pirates exigent une rançon refusée par l'assureur. Une partie des données est publiée sur un forum.",
    lesson:
      "Un assureur conserve tout : état civil, contrats, sinistres parfois sensibles, IBAN. Un seul compte sous-traitant compromis et tout est exposé. La règle : minimisation (seules les données utiles) + chiffrement au repos systématique.",
    miniAction:
      "Si tu es client Direct Assurance : vérifie tes mails depuis fin août 2024 pour la notification d'incident. Ne réponds JAMAIS à un mail t'invitant à 'reconfirmer' un RIB ou un mot de passe à la suite de cet incident - c'est un signal de phishing post-fuite.",
    sourceUrl: "https://www.lemonde.fr/pixels/article/2024/08/30/cyberattaque-contre-direct-assurance-les-donnees-de-millions-de-clients-derobees_6296973_4408996.html",
    sourceLabel: "Le Monde, 30 août 2024",
    category: AnecdoteCategory.DATA_LEAK,
    incidentDate: "2024-08-28",
  },
];
