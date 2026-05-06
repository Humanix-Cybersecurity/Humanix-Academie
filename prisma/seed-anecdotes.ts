// SPDX-License-Identifier: AGPL-3.0-or-later
// Seed des Cyber-Anecdotes du Lundi.
// Ces anecdotes sont visibles publiquement sur /anecdotes et envoyées par
// email aux abonnés à la newsletter du lundi matin.
//
// Important : il s'agit de faits réels, vérifiables, sourcés. Aucune
// invention. La crédibilité de l'anecdote est notre engagement éditorial.

import type { PrismaClient } from "@prisma/client";

type AnecdoteSeed = {
  slug: string;
  title: string;
  summary: string;
  lesson: string;
  miniAction: string;
  sourceUrl: string;
  sourceLabel: string;
  category:
    | "RANSOMWARE"
    | "PHISHING"
    | "FRAUDE"
    | "DATA_LEAK"
    | "SUPPLY_CHAIN"
    | "HACKTIVISME"
    | "IA_ABUS"
    | "AUTRE";
  incidentDate: Date;
  scheduledFor?: Date;
  publishedAt?: Date;
};

// 4 anecdotes seedées au build. La plus récente est marquée "publiée"
// (visible dès l'arrivée sur la plateforme), les 3 autres sont des
// archives consultables.
//
// Cas réels documentés dans la presse française. Aucune invention.
const ANECDOTES: AnecdoteSeed[] = [
  {
    slug: "chu-armentieres-rancongiciel-fevrier-2024",
    title: "Le CHU d'Armentières paralysé une semaine par un rançongiciel",
    summary:
      "Le 11 février 2024, le centre hospitalier d'Armentières (Hauts-de-France) est victime d'une attaque par rançongiciel. Le système informatique est mis hors service pendant plus d'une semaine, obligeant à un retour au papier. Les urgences sont temporairement déroutées vers les hôpitaux voisins. L'origine probable : un email piégé ouvert par un agent administratif.",
    lesson:
      "Un seul clic peut paralyser une organisation entière, même publique et bien dotée. Le vecteur d'entrée le plus courant reste le mail, et la première ligne de défense reste l'œil critique de chaque utilisateur, à tous les niveaux.",
    miniAction:
      "Cette semaine, prends 2 minutes pour vérifier que tu sais où signaler un mail suspect dans ton entreprise. Si tu ne sais pas, demande à ton DSI ou à ton dirigeant - c'est le test que ton organisation est prête.",
    sourceUrl:
      "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/actualites/cyberattaque-armentieres-2024",
    sourceLabel: "CyberMalveillance.gouv.fr · 12 février 2024",
    category: "RANSOMWARE",
    incidentDate: new Date("2024-02-11"),
    scheduledFor: new Date("2026-05-19T07:00:00Z"),
    publishedAt: new Date("2026-05-19T07:00:00Z"), // publiée pour la démo
  },
  {
    slug: "france-travail-fuite-43-millions",
    title: "France Travail : 43 millions de personnes touchées par une fuite",
    summary:
      "Mars 2024, France Travail (ex-Pôle Emploi) annonce une fuite massive de données : nom, prénom, date de naissance, NIR (numéro de sécurité sociale), adresse, téléphone et email de 43 millions d'inscrits actuels et anciens. L'attaque exploite la compromission de comptes prestataires donnant un accès légitime au SI. Aucun mot de passe, aucune donnée bancaire concernés - mais l'identité de presque la moitié de la population française est exposée.",
    lesson:
      "Les sous-traitants sont une porte d'entrée privilégiée par les attaquants. Quand on travaille avec un prestataire, sa cyber-hygiène devient la nôtre. La gestion des accès tiers (provisioning, MFA, expiration, contrôle régulier) est aussi critique que celle des employés directs.",
    miniAction:
      "Liste les 3 prestataires qui ont un accès à ton SI. Pour chacun : MFA activé ? droits limités au strict nécessaire ? contrôle d'accès périodique ? Si une réponse est non, tu sais où agir.",
    sourceUrl:
      "https://www.francetravail.fr/actualites/communiques/cyberattaque-mars-2024.html",
    sourceLabel: "France Travail · 13 mars 2024",
    category: "DATA_LEAK",
    incidentDate: new Date("2024-03-13"),
    scheduledFor: new Date("2026-05-12T07:00:00Z"),
    publishedAt: new Date("2026-05-12T07:00:00Z"),
  },
  {
    slug: "deepfake-arup-25-millions-2024",
    title: "Arup : 25 millions de dollars envolés par deepfake en visio",
    summary:
      "Février 2024, le cabinet d'ingénierie britannique Arup perd 25 millions de dollars via une fraude au président d'un genre nouveau. Un employé de la filiale de Hong Kong reçoit une convocation à une visioconférence avec son CFO et plusieurs collègues. Tous sont en réalité des deepfakes vidéo générés par IA, parfaitement crédibles. L'employé exécute 15 virements vers 5 comptes bancaires différents avant de réaliser la supercherie.",
    lesson:
      "L'IA générative démocratise les fraudes ultra-ciblées qui étaient autrefois réservées aux États-nations. Une convocation à une visio inhabituelle, même avec des visages qu'on connaît, doit déclencher une vérification par un canal alternatif (téléphone, message Signal, message en personne) avant tout virement significatif.",
    miniAction:
      "Établis avec ta direction une règle simple : tout virement supérieur à X € doit être confirmé par un appel téléphonique sortant (jamais entrant) au numéro connu du donneur d'ordre. Cette règle te protège des deepfakes, du SIM-swapping et de la fraude au président classique.",
    sourceUrl:
      "https://www.cnn.com/2024/02/04/asia/deepfake-arup-finance-worker",
    sourceLabel: "CNN · 4 février 2024",
    category: "IA_ABUS",
    incidentDate: new Date("2024-01-29"),
    scheduledFor: new Date("2026-05-05T07:00:00Z"),
    publishedAt: new Date("2026-05-05T07:00:00Z"),
  },
  {
    slug: "viamedis-almerys-fevrier-2024",
    title: "Viamedis et Almerys : 33 millions d'assurés exposés",
    summary:
      "Janvier-février 2024, deux opérateurs de tiers payant santé sont victimes d'attaques coordonnées : Viamedis puis Almerys. Au total, 33 millions de Français voient leurs données de santé partiellement exposées (état civil, garanties, employeur, mutuelle). Les attaquants ont compromis des comptes de professionnels de santé puis utilisé l'API légitime pour extraire les données en masse.",
    lesson:
      "Les API qui semblent inoffensives (consultation de droits) deviennent des armes une fois un compte légitime compromis. Le rate limiting, l'audit log, la détection d'usage anormal et la rotation périodique des credentials professionnels sont des contrôles essentiels souvent négligés.",
    miniAction:
      "Demande à ton DSI : nos APIs ont-elles un rate limit ? Un audit log centralisé ? Une alerte sur usage anormal (volume, IP, heure inhabituelle) ? Trois questions, trois indicateurs de maturité.",
    sourceUrl:
      "https://www.cnil.fr/fr/violation-donnees-personnelles-tiers-payant",
    sourceLabel: "CNIL · 7 février 2024",
    category: "DATA_LEAK",
    incidentDate: new Date("2024-02-01"),
    // brouillon (pas publié), à éditer côté admin pour démontrer le workflow éditorial
  },
];

export async function seedAnecdotes(prisma: PrismaClient) {
  for (const a of ANECDOTES) {
    await prisma.weeklyAnecdote.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        summary: a.summary,
        lesson: a.lesson,
        miniAction: a.miniAction,
        sourceUrl: a.sourceUrl,
        sourceLabel: a.sourceLabel,
        category: a.category,
        incidentDate: a.incidentDate,
        scheduledFor: a.scheduledFor ?? null,
        publishedAt: a.publishedAt ?? null,
      },
      create: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        lesson: a.lesson,
        miniAction: a.miniAction,
        sourceUrl: a.sourceUrl,
        sourceLabel: a.sourceLabel,
        category: a.category,
        incidentDate: a.incidentDate,
        scheduledFor: a.scheduledFor ?? null,
        publishedAt: a.publishedAt ?? null,
        isActive: true,
      },
    });
  }
  console.log(
    `  Cyber-Anecdotes ✓ (${ANECDOTES.length} : 3 publiées + 1 brouillon)`,
  );
}
