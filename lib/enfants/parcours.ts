// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Contenu de « L'école de Hex » (enfants 9-12 ans).
// Tout est gratuit (AGPL). Pour ajouter un monde : pousse un objet ici.
// Ton : simple, joyeux, JAMAIS culpabilisant. Phrases courtes, mots faciles.
// Règle projet : pas de tiret cadratin dans les chaînes.

import type { Monde } from "@/lib/enfants/types";

export const MONDES: Monde[] = [
  // ===========================================================================
  // MONDE 1 - Les pièges du Net
  // ===========================================================================
  {
    slug: "pieges-du-net",
    titre: "Les pièges du Net",
    sousTitre: "Repère les arnaques et les faux cadeaux",
    emoji: "🎣",
    couleur: "sky",
    disponible: true,
    activites: [
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
  // MONDE 2 - Le secret des mots de passe
  // ===========================================================================
  {
    slug: "secret-mots-de-passe",
    titre: "Le secret des mots de passe",
    sousTitre: "Fabrique un mot de passe super costaud",
    emoji: "🔑",
    couleur: "emerald",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-secret",
        titre: "Le coffre au trésor",
        panels: [
          {
            emoji: "🦊🔑",
            qui: "hex",
            bulle: "Un mot de passe, c'est comme la clé secrète d'un coffre : et le trésor, c'est TOI !",
          },
          {
            emoji: "🧒",
            texte: "À la récré, un copain te demande :",
          },
          {
            emoji: "🗣️",
            qui: "enfant",
            bulle: "Dis, c'est quoi ton mot de passe ? On est amis non ?",
          },
          {
            emoji: "🦊🤔",
            qui: "hex",
            bulle: "Même à un super copain… une clé secrète, ça reste secret.",
          },
        ],
        question: {
          consigne: "Tu réponds quoi ?",
          options: [
            {
              id: "dire",
              label: "Je lui dis, c'est mon ami",
              emoji: "💬",
              bon: false,
              reaction:
                "On apprend : même à un ami, un mot de passe ne se partage pas. Il pourrait l'oublier… ou le répéter.",
            },
            {
              id: "garde",
              label: "Je garde mon secret, gentiment",
              emoji: "🤐",
              bon: true,
              reaction: "Bravo ! Un secret reste un secret, même entre amis.",
            },
          ],
        },
        morale:
          "Mon mot de passe est secret. Je ne le dis à personne, même pas à un ami.",
      },
      {
        type: "paires",
        id: "paires-costaud",
        titre: "La recette d'un mot de passe costaud",
        consigne: "Relie chaque ingrédient à ce qu'il veut dire.",
        paires: [
          {
            id: "long",
            gauche: { emoji: "📏", label: "Long" },
            droite: { emoji: "🔢", label: "Au moins 12 lettres" },
          },
          {
            id: "secret",
            gauche: { emoji: "🤫", label: "Secret" },
            droite: { emoji: "🙊", label: "Je ne le dis à personne" },
          },
          {
            id: "different",
            gauche: { emoji: "🔀", label: "Différent" },
            droite: { emoji: "🚪", label: "Pas le même partout" },
          },
          {
            id: "bizarre",
            gauche: { emoji: "🎲", label: "Surprenant" },
            droite: { emoji: "🚫", label: "Pas mon prénom ni 1234" },
          },
        ],
      },
      {
        type: "tri",
        id: "tri-costaud-faible",
        titre: "Costaud ou tout mou ?",
        consigne: "Ce mot de passe, il tient le coup ou pas ?",
        gauche: { label: "Costaud", emoji: "💪" },
        droite: { label: "Tout mou", emoji: "🫠" },
        cartes: [
          {
            id: "1234",
            emoji: "🔢",
            label: "« 1234 »",
            bon: "droite",
            reaction: "Tout mou ! C'est le 1er que tout le monde essaie.",
          },
          {
            id: "prenom",
            emoji: "🧒",
            label: "Mon prénom",
            bon: "droite",
            reaction: "Tout mou ! Trop facile à deviner.",
          },
          {
            id: "phrase",
            emoji: "🦜",
            label: "« Bateau-Pizza-Lune-7 »",
            bon: "gauche",
            reaction: "Costaud ! Long, surprenant, super.",
          },
          {
            id: "azerty",
            emoji: "⌨️",
            label: "« azerty »",
            bon: "droite",
            reaction: "Tout mou ! Ce sont juste les touches du clavier.",
          },
          {
            id: "histoire",
            emoji: "📖",
            label: "Une phrase rigolote longue",
            bon: "gauche",
            reaction: "Costaud ! Une phrase secrète, c'est malin.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-mdp",
        titre: "Le grand test",
        emoji: "⚽🔑",
        question:
          "Au foot, un copain te redemande ton mot de passe. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je lui dis tout bas",
            emoji: "🤏",
            bon: false,
            reaction: "Non ! Tout bas ou tout fort, ça reste secret.",
          },
          {
            id: "b",
            label: "Je l'écris sur un papier pour lui",
            emoji: "📝",
            bon: false,
            reaction:
              "Non ! Un papier peut se perdre ou se lire. Secret = secret.",
          },
          {
            id: "c",
            label: "Je garde mon secret, même avec un ami",
            emoji: "🤐",
            bon: true,
            reaction: "PARFAIT ! Tu protèges ton trésor comme un pro 🔐",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 3 - Les inconnus en ligne
  // ===========================================================================
  {
    slug: "inconnus-en-ligne",
    titre: "Les inconnus en ligne",
    sousTitre: "Qui est vraiment derrière l'écran ?",
    emoji: "👋",
    couleur: "violet",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-derriere-ecran",
        titre: "Qui es-tu vraiment ?",
        panels: [
          {
            emoji: "🎮💬",
            texte: "Dans un jeu en ligne, un joueur t'écrit :",
          },
          {
            emoji: "🕵️",
            qui: "piege",
            bulle: "Salut ! T'es trop fort ! On s'appelle ? Envoie une photo de toi !",
          },
          {
            emoji: "🦊❓",
            qui: "hex",
            bulle: "Derrière « Léo_12 », on ne sait pas qui c'est vraiment. Un enfant ? Un adulte ?",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "photo",
              label: "J'envoie une photo, il a l'air sympa",
              emoji: "📸",
              bon: false,
              reaction:
                "On apprend : « sympa » dans un jeu ne veut pas dire qu'on le connaît. On n'envoie pas de photo.",
            },
            {
              id: "refuse",
              label: "Je refuse et j'en parle à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Tu gardes tes infos et tu préviens un adulte.",
            },
          ],
        },
        morale:
          "Derrière un pseudo, on ne sait jamais qui c'est vraiment. Je reste prudent.",
      },
      {
        type: "repere",
        id: "repere-questions",
        titre: "Les questions trop curieuses",
        consigne: "Touche les questions qui veulent en savoir TROP sur toi.",
        ecran: "Un joueur inconnu te pose plein de questions 👇",
        elements: [
          {
            id: "bravo",
            emoji: "👏",
            texte: "« Tu joues super bien ! »",
            piege: false,
            reaction: "Ça, c'est juste gentil 🙂",
          },
          {
            id: "adresse",
            emoji: "🏠",
            texte: "« Tu habites où ? »",
            piege: true,
            reaction: "Oui ! Mon adresse, ça ne se donne pas.",
          },
          {
            id: "photo",
            emoji: "📸",
            texte: "« Envoie une photo de toi »",
            piege: true,
            reaction: "Bravo ! Une photo de moi, je garde pour moi.",
          },
          {
            id: "ecole",
            emoji: "🎒",
            texte: "« C'est quoi le nom de ton école ? »",
            piege: true,
            reaction: "Bien vu ! Mon école, ça reste privé.",
          },
          {
            id: "demain",
            emoji: "📅",
            texte: "« On rejoue demain ? »",
            piege: false,
            reaction: "Ça, c'est normal pour un jeu 🙂",
          },
        ],
      },
      {
        type: "tri",
        id: "tri-dire-garder",
        titre: "Je peux dire, ou je garde pour moi ?",
        consigne: "Range chaque info du bon côté.",
        gauche: { label: "Je peux dire", emoji: "💬" },
        droite: { label: "Je garde pour moi", emoji: "🤐" },
        cartes: [
          {
            id: "pseudo",
            emoji: "🎮",
            label: "Mon pseudo de jeu",
            bon: "gauche",
            reaction: "Oui, un pseudo n'est pas mon vrai nom.",
          },
          {
            id: "adresse",
            emoji: "🏠",
            label: "Mon adresse",
            bon: "droite",
            reaction: "Je garde pour moi ! Ça, c'est privé.",
          },
          {
            id: "photo",
            emoji: "🤳",
            label: "Une photo de moi",
            bon: "droite",
            reaction: "Je garde pour moi ! Une photo, c'est perso.",
          },
          {
            id: "jeu",
            emoji: "🕹️",
            label: "Mon jeu préféré",
            bon: "gauche",
            reaction: "Oui, ça peut se dire, pas de souci.",
          },
          {
            id: "ecole",
            emoji: "🏫",
            label: "Le nom de mon école",
            bon: "droite",
            reaction: "Je garde pour moi ! On pourrait me retrouver.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-inconnu",
        titre: "Le grand test",
        emoji: "🎁👤",
        question:
          "Un inconnu dans un jeu veut ton adresse pour t'envoyer un cadeau. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je donne mon adresse",
            emoji: "🏠",
            bon: false,
            reaction:
              "Non ! Un vrai cadeau ne demande pas ton adresse en secret.",
          },
          {
            id: "b",
            label: "Je donne juste ma ville",
            emoji: "🗺️",
            bon: false,
            reaction: "Non ! Même un petit bout d'info, on garde pour soi.",
          },
          {
            id: "c",
            label: "Je refuse et j'en parle à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu ne te laisses pas avoir 💪",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 4 - Mes photos et ma vie privée
  // ===========================================================================
  {
    slug: "photos-vie-privee",
    titre: "Mes photos, ma vie privée",
    sousTitre: "Ce qu'on montre… et ce qu'on garde pour soi",
    emoji: "📸",
    couleur: "rose",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-photo",
        titre: "La photo rigolote",
        panels: [
          {
            emoji: "📸😄",
            texte: "Tu prends une photo trop drôle avec un copain !",
          },
          {
            emoji: "🌍",
            qui: "narrateur",
            texte: "Tu as envie de la publier… partout, tout de suite.",
          },
          {
            emoji: "🦊🤔",
            qui: "hex",
            bulle: "Attends : une photo en ligne peut rester longtemps et être vue par BEAUCOUP de gens.",
          },
        ],
        question: {
          consigne: "Tu fais quoi avant de publier ?",
          options: [
            {
              id: "publie",
              label: "Je publie partout, c'est marrant",
              emoji: "🚀",
              bon: false,
              reaction:
                "On apprend : une fois publiée, une photo est difficile à reprendre. On réfléchit avant.",
            },
            {
              id: "reflechit",
              label: "Je réfléchis et je demande à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Réfléchir avant de publier, c'est très malin.",
            },
          ],
        },
        morale:
          "Avant de publier une photo, je réfléchis et je demande à un adulte.",
      },
      {
        type: "paires",
        id: "paires-reflexe",
        titre: "Le bon réflexe",
        consigne: "Relie chaque situation au bon réflexe.",
        paires: [
          {
            id: "genante",
            gauche: { emoji: "😬", label: "Photo gênante" },
            droite: { emoji: "🚫", label: "Je ne la publie pas" },
          },
          {
            id: "copain",
            gauche: { emoji: "👥", label: "Photo d'un copain" },
            droite: { emoji: "🙋", label: "Je demande son accord" },
          },
          {
            id: "secret",
            gauche: { emoji: "🔑", label: "Mon mot de passe" },
            droite: { emoji: "🤐", label: "Je garde secret" },
          },
          {
            id: "doute",
            gauche: { emoji: "🤔", label: "J'ai un doute" },
            droite: { emoji: "🧑‍🦰", label: "Je demande à un adulte" },
          },
        ],
      },
      {
        type: "repere",
        id: "repere-photo",
        titre: "Cette photo en dit trop !",
        consigne: "Touche tout ce qui pourrait dire OÙ tu es ou QUI tu es.",
        ecran: "Tu veux publier cette photo. Qu'est-ce qui en dit trop ? 👇",
        elements: [
          {
            id: "sourire",
            emoji: "😀",
            texte: "Ton beau sourire",
            piege: false,
            reaction: "Ton sourire, c'est juste toi 🙂",
          },
          {
            id: "adresse",
            emoji: "🏠",
            texte: "Le numéro sur ta maison",
            piege: true,
            reaction: "Oui ! Ça montre où tu habites.",
          },
          {
            id: "ecole",
            emoji: "🎒",
            texte: "Le nom de l'école sur ton pull",
            piege: true,
            reaction: "Bravo ! On pourrait savoir où tu vas en classe.",
          },
          {
            id: "chat",
            emoji: "🐱",
            texte: "Ton chat qui dort",
            piege: false,
            reaction: "Le chat ne dit rien sur toi 🙂",
          },
          {
            id: "plaque",
            emoji: "🚗",
            texte: "La plaque de la voiture",
            piege: true,
            reaction: "Bien vu ! Ça aussi, ça donne des indices.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-photo",
        titre: "Le grand test",
        emoji: "🤳🏠",
        question:
          "Tu veux publier une photo où on voit ton adresse. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je publie quand même",
            emoji: "🚀",
            bon: false,
            reaction: "Non ! Ton adresse ne doit pas se balader en ligne.",
          },
          {
            id: "b",
            label: "Je la publie juste à mes amis",
            emoji: "👯",
            bon: false,
            reaction: "Attention ! Une photo peut être renvoyée à d'autres.",
          },
          {
            id: "c",
            label: "Je cache l'adresse ou je ne publie pas, et je demande",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu protèges ta vie privée comme un pro 📸",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 5 - Vrai ou bobard ? (esprit critique)
  // ===========================================================================
  {
    slug: "vrai-ou-bobard",
    titre: "Vrai ou bobard ?",
    sousTitre: "Apprends à flairer les fausses infos",
    emoji: "🧠",
    couleur: "cyan",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-cest-vrai",
        titre: "C'est vrai, ça ?",
        panels: [
          {
            emoji: "📱🍬",
            texte: "Tu vois une vidéo qui dit :",
          },
          {
            emoji: "📢",
            qui: "piege",
            bulle: "Les bonbons rendent INVINCIBLE ! Partage à 10 amis ou tu auras un malheur !",
          },
          {
            emoji: "🦊🤨",
            qui: "hex",
            bulle: "Ça fait peur pour te forcer à partager… et c'est trop bizarre pour être vrai.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "partage",
              label: "Je partage à 10 amis, au cas où",
              emoji: "📤",
              bon: false,
              reaction:
                "On apprend : « partage ou malheur », c'est une fausse menace. On ne partage pas.",
            },
            {
              id: "verifie",
              label: "Je ne partage pas et je vérifie",
              emoji: "🔎",
              bon: true,
              reaction: "Bravo ! Tu gardes la tête froide, comme un détective.",
            },
          ],
        },
        morale:
          "Si une info fait très peur ou semble trop belle, c'est souvent un bobard.",
      },
      {
        type: "tri",
        id: "tri-vrai-bobard",
        titre: "Vrai ou bobard ?",
        consigne: "Cette info, on peut la croire… ou pas ?",
        gauche: { label: "Sûrement vrai", emoji: "✅" },
        droite: { label: "Bobard", emoji: "🐟" },
        cartes: [
          {
            id: "mains",
            emoji: "🧼",
            label: "Un médecin explique calmement comment se laver les mains",
            bon: "gauche",
            reaction: "Oui, c'est calme, clair et utile.",
          },
          {
            id: "malheur",
            emoji: "😱",
            label: "« PARTAGE OU TU AURAS UN AN DE MALHEUR »",
            bon: "droite",
            reaction: "Bobard ! La peur sert à te forcer.",
          },
          {
            id: "telephone",
            emoji: "📱",
            label: "« Gagne un téléphone en cliquant ! »",
            bon: "droite",
            reaction: "Bobard ! Trop beau pour être vrai.",
          },
          {
            id: "meteo",
            emoji: "🌧️",
            label: "La météo annonce de la pluie demain",
            bon: "gauche",
            reaction: "Oui, ça arrive tout le temps 🙂",
          },
          {
            id: "chat",
            emoji: "🐱",
            label: "« Ce chat parle 5 langues, clique vite ! »",
            bon: "droite",
            reaction: "Bobard ! Et le « clique vite », c'est un piège.",
          },
        ],
      },
      {
        type: "paires",
        id: "paires-alerte",
        titre: "Les signaux d'alerte",
        consigne: "Relie chaque signal à ce qu'il cache.",
        paires: [
          {
            id: "majuscules",
            gauche: { emoji: "📢", label: "ÉCRIT EN MAJUSCULES" },
            droite: { emoji: "⚡", label: "On veut te faire réagir vite" },
          },
          {
            id: "menace",
            gauche: { emoji: "😱", label: "« Partage sinon malheur »" },
            droite: { emoji: "🎭", label: "C'est une fausse peur" },
          },
          {
            id: "troptbeau",
            gauche: { emoji: "🤩", label: "Trop beau pour être vrai" },
            droite: { emoji: "🪤", label: "Souvent un piège" },
          },
          {
            id: "verifier",
            gauche: { emoji: "🔎", label: "Je vérifie" },
            droite: { emoji: "🧑‍🦰", label: "Je demande à un adulte" },
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-bobard",
        titre: "Le grand test",
        emoji: "✉️😱",
        question:
          "Un message dit : « Partage ou il t'arrive malheur ». Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je partage à tout le monde",
            emoji: "📣",
            bon: false,
            reaction: "Non ! C'est exactement ce que le bobard veut.",
          },
          {
            id: "b",
            label: "Je partage juste à 2 amis",
            emoji: "👬",
            bon: false,
            reaction: "Non ! Partager un bobard, même un peu, ça le propage.",
          },
          {
            id: "c",
            label: "Je ne partage pas et j'en parle",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu as un super esprit critique 🧠",
          },
        ],
      },
    ],
  },
];

export function getMonde(slug: string): Monde | undefined {
  return MONDES.find((m) => m.slug === slug);
}
