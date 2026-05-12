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
];
