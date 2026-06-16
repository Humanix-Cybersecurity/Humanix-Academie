// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Contenu de « L'école de Hex » (enfants 9-12 ans).
// Tout est gratuit (AGPL). Pour ajouter un monde : pousse un objet ici.
// Ton : simple, joyeux, JAMAIS culpabilisant. Phrases courtes, mots faciles.

import type { Monde } from "@/lib/enfants/types";

export const MONDES: Monde[] = [
  // ===========================================================================
  // MONDE 1 - Les pièges du Net (complet, jouable)
  // ===========================================================================
  {
    slug: "pieges-du-net",
    titre: "Les pièges du Net",
    sousTitre: "Repère les arnaques et les faux cadeaux",
    emoji: "🎣",
    couleur: "sky",
    disponible: true,
    activites: [
      // --- 1. BD : le faux cadeau ---
      {
        type: "bd",
        id: "bd-faux-cadeau",
        titre: "Le faux cadeau",
        panels: [
          {
            emoji: "🦊",
            qui: "hex",
            bulle: "Coucou ! Moi c'est Hex. On va déjouer des pièges ensemble ?",
          },
          {
            emoji: "💻🎮",
            texte: "Tu joues tranquille… et POP, un message apparaît :",
          },
          {
            emoji: "🎁✨",
            qui: "piege",
            bulle: "BRAVO ! Tu as gagné une console GRATUITE ! Clique VITE !!!",
          },
          {
            emoji: "🦊❓",
            qui: "hex",
            bulle: "Hmm… un cadeau énorme, gratuit, et il faut se dépêcher ? Bizarre, non ?",
          },
        ],
        question: {
          consigne: "À ta place, Hex ferait quoi ?",
          options: [
            {
              id: "clique",
              label: "Cliquer vite pour avoir la console",
              emoji: "👆",
              bon: false,
              reaction:
                "Aïe ! C'est ce que le piège veut. Pas de panique, maintenant tu sais : on ne clique pas.",
            },
            {
              id: "ferme",
              label: "Fermer le message et en parler à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction:
                "Exactement ! Un vrai champion. On ferme, et on demande à un adulte de confiance.",
            },
          ],
        },
        morale:
          "Un cadeau qui tombe du ciel et qui dit « VITE ! » = presque toujours un piège.",
      },

      // --- 2. Repère le piège ---
      {
        type: "repere",
        id: "repere-message",
        titre: "Repère ce qui cloche",
        consigne: "Touche TOUT ce qui est bizarre dans ce message.",
        ecran: "Tu reçois ce message d'un inconnu 👇",
        elements: [
          {
            id: "gratuit",
            emoji: "🎁",
            texte: "« Téléphone GRATUIT ! »",
            piege: true,
            reaction: "Oui ! Gratuit + trop beau = méfiance.",
          },
          {
            id: "vite",
            emoji: "⏰",
            texte: "« Vite, plus que 2 minutes ! »",
            piege: true,
            reaction: "Bravo ! Te presser, c'est pour t'empêcher de réfléchir.",
          },
          {
            id: "lien",
            emoji: "🔗",
            texte: "« clique-ici-cadeau.com »",
            piege: true,
            reaction: "Bien vu ! Un lien bizarre, on n'y touche pas.",
          },
          {
            id: "mdp",
            emoji: "🔑",
            texte: "« Donne ton mot de passe »",
            piege: true,
            reaction: "Super ! Un mot de passe, ça ne se donne JAMAIS.",
          },
          {
            id: "chat",
            emoji: "🐱",
            texte: "Une photo de chat",
            piege: false,
            reaction: "Ça, c'est juste un chat. Tout va bien 🙂",
          },
        ],
      },

      // --- 3. Tri : sûr ou piège ? ---
      {
        type: "tri",
        id: "tri-sur-piege",
        titre: "Sûr ou Piège ?",
        consigne: "Range chaque carte du bon côté.",
        gauche: { label: "Sûr", emoji: "👍" },
        droite: { label: "Piège", emoji: "🚫" },
        cartes: [
          {
            id: "demander",
            emoji: "🧑‍🦰",
            label: "Demander à un adulte si j'ai un doute",
            bon: "gauche",
            reaction: "Oui ! En parler, c'est le super-pouvoir n°1.",
          },
          {
            id: "mdp-inconnu",
            emoji: "🔑",
            label: "Donner mon mot de passe à un inconnu",
            bon: "droite",
            reaction: "Piège ! Mon mot de passe reste secret.",
          },
          {
            id: "gagne-1000",
            emoji: "💸",
            label: "« Tu as gagné 1000 € ! Clique ! »",
            bon: "droite",
            reaction: "Piège ! On ne gagne pas de l'argent par surprise.",
          },
          {
            id: "jeu-ami",
            emoji: "🎮",
            label: "Jouer avec un copain que je connais en vrai",
            bon: "gauche",
            reaction: "Sûr ! Tu le connais pour de vrai, c'est super.",
          },
          {
            id: "fermer-pub",
            emoji: "❌",
            label: "Fermer une pub sans cliquer dedans",
            bon: "gauche",
            reaction: "Sûr ! Fermer, c'est le bon réflexe.",
          },
        ],
      },

      // --- 4. Quiz illustré ---
      {
        type: "quiz",
        id: "quiz-final",
        titre: "Le grand test",
        emoji: "📱🎉",
        question:
          "Un message dit : « Tu as gagné un téléphone, clique ! ». Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je clique tout de suite",
            emoji: "👆",
            bon: false,
            reaction: "Oups ! C'est le piège. On respire et on ne clique pas.",
          },
          {
            id: "b",
            label: "Je donne mon adresse pour recevoir le cadeau",
            emoji: "🏠",
            bon: false,
            reaction: "Non ! Mes infos restent à moi. Jamais à un inconnu.",
          },
          {
            id: "c",
            label: "Je ferme et j'en parle à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu es devenu un vrai détective du Net 🕵️",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 2 - Le secret des mots de passe (teaser « bientôt »)
  // ===========================================================================
  {
    slug: "secret-mots-de-passe",
    titre: "Le secret des mots de passe",
    sousTitre: "Fabrique un mot de passe super costaud",
    emoji: "🔑",
    couleur: "emerald",
    disponible: false,
    activites: [],
  },

  // ===========================================================================
  // MONDE 3 - Les inconnus en ligne (teaser « bientôt »)
  // ===========================================================================
  {
    slug: "inconnus-en-ligne",
    titre: "Les inconnus en ligne",
    sousTitre: "Qui est vraiment derrière l'écran ?",
    emoji: "👋",
    couleur: "violet",
    disponible: false,
    activites: [],
  },
];

export function getMonde(slug: string): Monde | undefined {
  return MONDES.find((m) => m.slug === slug);
}
