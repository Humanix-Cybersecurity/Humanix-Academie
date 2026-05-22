// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue DEMO Open Core — 2 saisons × 3 episodes = 6 modules genériques.
//
// Ce catalogue est livre dans le repo PUBLIC AGPLv3. Il sert de fallback
// quand le catalogue commercial complet (prisma/catalog-saisons.ts) n'est
// pas disponible — par exemple sur un fork OSS ou une install self-host
// qui n'a pas le contenu premium.
//
// LICENCE DU CONTENU DEMO : CC BY-SA 4.0
//   Reutilisable par les forks AGPL avec attribution. Les sources sont
//   des recommandations publiques (ANSSI, CERT-FR, NIST, Verizon DBIR).
//
// CONTRASTE AVEC LE CATALOGUE COMMERCIAL :
//   - Demo : 2 saisons (mots de passe, phishing reconnaitre) × 3 modules
//   - Pro/Cloud : 27 saisons × 6 modules = 159 modules officiels avec
//     scenarios crafted par experts, persona-specific, IA generatives,
//     simulation phishing, vishing, smishing, quishing, deepfakes...
//
// Cf. docs/OPEN_CORE.md pour l'architecture complete.

import type { CatalogSaison } from "./catalog-saisons-shared";

export const CATALOG_SAISONS_DEMO: CatalogSaison[] = [
  {
    slug: "mots-de-passe-bases",
    title: "Mots de passe : les bases",
    description:
      "Les 3 regles d'or pour proteger ses comptes : longueur, unicite, double authentification. Source : recommandations publiques ANSSI.",
    coverEmoji: "🔑",
    order: 1,
    audience: "tous",
    episodes: [
      {
        slug: "01-longueur",
        title: "La longueur compte",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-reutilisation",
        title: "Ne JAMAIS reutiliser",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "03-double-auth",
        title: "La double authentification",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "reconnaitre-phishing",
    title: "Reconnaitre un phishing",
    description:
      "Les 3 reflexes essentiels face a un email suspect : verifier le domaine, resister a l'urgence, signaler. Source : recommandations publiques CERT-FR.",
    coverEmoji: "🎣",
    order: 2,
    audience: "tous",
    episodes: [
      {
        slug: "01-domaine",
        title: "Verifier le domaine",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-urgence",
        title: "Le levier d'urgence",
        durationMinutes: 5,
        difficulty: "medium",
      },
      {
        slug: "03-signaler",
        title: "Signaler un phishing",
        durationMinutes: 4,
        difficulty: "easy",
      },
    ],
  },
  {
    slug: "mobile-essentiels",
    title: "Mobile : les essentiels",
    description:
      "Les 3 reflexes mobiles qui evitent 80% des incidents : verrouillage automatique, Wi-Fi public, permissions d'apps. Source : recommandations publiques ANSSI et CNIL.",
    coverEmoji: "📱",
    order: 3,
    audience: "tous",
    episodes: [
      {
        slug: "01-verrouillage",
        title: "Le verrouillage en 30 secondes",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-wifi-public",
        title: "Le Wi-Fi du cafe qui s'appelle Free-Airport",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-permissions",
        title: "La lampe-torche qui veut acceder aux contacts",
        durationMinutes: 5,
        difficulty: "easy",
      },
    ],
  },
  // -----------------------------------------------------------------------------
  // SAISON "MAITRISE DE L'IA" (mai 2026, post-launch sprint)
  // 12 episodes officiels. Le contenu pedagogique detaille (MDX scenario,
  // quiz, choix) est ajoute progressivement dans content/saisons/maitrise-ia/.
  // Pour les episodes sans MDX, le moteur fallback (cf. components/Episode
  // Player.tsx) sert un contenu generique base sur le titre + description.
  // Sources : MIT Media Lab "Your Brain on ChatGPT" 2025, Stanford HAI
  // "Cognitive Offloading at Scale" 2025, ANSSI, AI Act EU.
  // -----------------------------------------------------------------------------
  {
    slug: "maitrise-ia",
    title: "Maitrise de l'IA generative",
    description:
      "12 episodes pour utiliser ChatGPT, Claude et consorts sans deleguer ton esprit critique. Hallucinations, atrophie cognitive, shadow AI, deepfakes, AI Act. Source : MIT Media Lab 2025, Stanford HAI, ANSSI, AI Act EU.",
    coverEmoji: "🧠",
    order: 4,
    audience: "tous",
    episodes: [
      {
        slug: "01-hallucinations",
        title: "Quand ChatGPT invente : la mecanique des hallucinations",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "02-autorite-textuelle",
        title: "Le piege de l'autorite textuelle",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "03-atrophie-critique",
        title: "L'atrophie du muscle critique (MIT 2025)",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-mes-donnees-partent-ou",
        title: "Mes donnees partent ou ?",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-shadow-ai",
        title: "Shadow AI : quand l'IT ne sait pas",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-deepfakes-vocaux",
        title: "Deepfakes vocaux : 3 secondes d'audio suffisent",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "07-biais-equite",
        title: "Biais & equite : quand un LLM exclut sans le voir",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "08-prompt-injection",
        title: "Prompt injection : manipuler un assistant IA",
        durationMinutes: 7,
        difficulty: "hard",
      },
      {
        slug: "09-verifier-sources",
        title: "Verifier les sources : la methode des 3 sources",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "10-co-pilote-pas-pilote",
        title: "Co-pilote, pas pilote : workflow avec l'humain final",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "11-ai-act-2026",
        title: "AI Act 2026 : ce qui change pour ton equipe",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "12-charte-ia",
        title: "Batir une charte IA pour ton entreprise",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
];
