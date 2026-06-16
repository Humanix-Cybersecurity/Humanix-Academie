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
  // ===========================================================================
  // MONDE 6 - Bien jouer en ligne (jeux vidéo)
  // ===========================================================================
  {
    slug: "bien-jouer-en-ligne",
    titre: "Bien jouer en ligne",
    sousTitre: "Les arnaques des jeux vidéo, déjouées",
    emoji: "🎮",
    couleur: "amber",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-vbucks",
        titre: "Les pièces gratuites",
        panels: [
          {
            emoji: "🎮💎",
            texte: "Tu cherches des pièces pour ton jeu. Un site promet :",
          },
          {
            emoji: "🎉",
            qui: "piege",
            bulle: "1000 pièces GRATUITES ! Entre vite ton mot de passe de compte ici !",
          },
          {
            emoji: "🦊🤨",
            qui: "hex",
            bulle: "Un vrai jeu ne te demande JAMAIS ton mot de passe sur un autre site.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "donne",
              label: "J'entre mon mot de passe pour les pièces",
              emoji: "🔑",
              bon: false,
              reaction:
                "On apprend : ce site veut voler ton compte. On ne tape jamais son mot de passe ailleurs que dans le vrai jeu.",
            },
            {
              id: "ferme",
              label: "Je ferme et je demande à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Pas de mot de passe = pas d'arnaque possible.",
            },
          ],
        },
        morale:
          "Pour gagner des trucs dans un jeu, on ne donne JAMAIS son mot de passe ailleurs.",
      },
      {
        type: "repere",
        id: "repere-chat-jeu",
        titre: "L'arnaque dans le tchat",
        consigne: "Touche les messages louches dans le tchat du jeu.",
        ecran: "Pendant la partie, le tchat s'agite 👇",
        elements: [
          {
            id: "gg",
            emoji: "🎯",
            texte: "« gg, tu joues super bien ! »",
            piege: false,
            reaction: "Ça, c'est juste sympa 🙂",
          },
          {
            id: "lien",
            emoji: "🔗",
            texte: "« clique ce lien pour 1000 pièces »",
            piege: true,
            reaction: "Oui ! Un lien pour des cadeaux = arnaque.",
          },
          {
            id: "mdp",
            emoji: "🔑",
            texte: "« donne ton mdp, je te booste »",
            piege: true,
            reaction: "Bravo ! Personne n'a besoin de ton mot de passe.",
          },
          {
            id: "rejoue",
            emoji: "📅",
            texte: "« on rejoue ce soir ? »",
            piege: false,
            reaction: "Normal pour un jeu 🙂",
          },
          {
            id: "mod",
            emoji: "📥",
            texte: "« télécharge ce mod-secret.exe »",
            piege: true,
            reaction: "Bien vu ! Un fichier inconnu peut être un virus.",
          },
        ],
      },
      {
        type: "tri",
        id: "tri-ok-stop",
        titre: "Dans le jeu : OK ou Stop ?",
        consigne: "Range chaque action du bon côté.",
        gauche: { label: "OK", emoji: "👍" },
        droite: { label: "Stop", emoji: "✋" },
        cartes: [
          {
            id: "ami",
            emoji: "🎮",
            label: "Jouer avec un ami que je connais",
            bon: "gauche",
            reaction: "OK ! Jouer entre amis, c'est le top.",
          },
          {
            id: "mdp",
            emoji: "🔑",
            label: "Un joueur demande mon mot de passe",
            bon: "droite",
            reaction: "Stop ! Mon mot de passe reste secret.",
          },
          {
            id: "achat",
            emoji: "💳",
            label: "Acheter un truc sans demander à mes parents",
            bon: "droite",
            reaction: "Stop ! On demande toujours avant d'acheter.",
          },
          {
            id: "pause",
            emoji: "🍽️",
            label: "Mettre en pause pour manger",
            bon: "gauche",
            reaction: "OK ! Le jeu peut attendre 🙂",
          },
          {
            id: "skins",
            emoji: "🎁",
            label: "Cliquer « skins gratuits » d'un site inconnu",
            bon: "droite",
            reaction: "Stop ! Gratuit + inconnu = piège.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-jeu",
        titre: "Le grand test",
        emoji: "🎮💎",
        question:
          "Un site promet des pièces gratuites si tu donnes ton mot de passe. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je donne mon mot de passe",
            emoji: "🔑",
            bon: false,
            reaction: "Non ! Ton compte se ferait voler aussitôt.",
          },
          {
            id: "b",
            label: "Je donne juste mon pseudo et mon mot de passe",
            emoji: "📝",
            bon: false,
            reaction: "Non ! Le mot de passe ne se donne jamais, nulle part.",
          },
          {
            id: "c",
            label: "Je ne donne rien, c'est une arnaque, j'en parle",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu protèges ton compte comme un champion 🏆",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 7 - Si ça va pas, j'en parle (cyberharcèlement)
  // ===========================================================================
  {
    slug: "si-ca-va-pas-jen-parle",
    titre: "Si ça va pas, j'en parle",
    sousTitre: "Quand on est méchant avec toi en ligne",
    emoji: "💬",
    couleur: "orange",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-messages-mechants",
        titre: "Des messages qui font mal",
        panels: [
          {
            emoji: "📱😢",
            texte: "Dans un groupe, des messages se moquent de toi.",
          },
          {
            emoji: "🦊💙",
            qui: "hex",
            bulle: "Stop. Ce n'est PAS ta faute. Et tu n'es pas tout seul, je suis là.",
          },
          {
            emoji: "🦊",
            qui: "hex",
            bulle: "On ne répond pas à la méchanceté par la méchanceté. On va trouver de l'aide.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "venge",
              label: "Je réponds une insulte encore plus forte",
              emoji: "😡",
              bon: false,
              reaction:
                "On apprend : se venger fait grossir la dispute, et ça ne te protège pas. Il y a mieux.",
            },
            {
              id: "parle",
              label: "Je garde une preuve, je bloque, et j'en parle à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo. En parler, c'est fort et c'est la bonne idée.",
            },
          ],
        },
        morale:
          "Si on est méchant avec toi en ligne, ce n'est jamais ta faute. Tu en parles à un adulte de confiance.",
      },
      {
        type: "paires",
        id: "paires-reflexe-harcele",
        titre: "Le bon réflexe quand ça va pas",
        consigne: "Relie chaque situation au bon réflexe.",
        paires: [
          {
            id: "insulte",
            gauche: { emoji: "😢", label: "On t'insulte" },
            droite: { emoji: "💙", label: "Ce n'est pas ta faute" },
          },
          {
            id: "message",
            gauche: { emoji: "📩", label: "Un message méchant" },
            droite: { emoji: "📸", label: "Je garde une preuve, je ne réponds pas" },
          },
          {
            id: "continue",
            gauche: { emoji: "🔁", label: "Ça continue" },
            droite: { emoji: "🚫", label: "Je bloque la personne" },
          },
          {
            id: "malheureux",
            gauche: { emoji: "😞", label: "Je me sens mal" },
            droite: { emoji: "🧑‍🦰", label: "J'en parle à un adulte de confiance" },
          },
        ],
      },
      {
        type: "tri",
        id: "tri-bon-reflexe",
        titre: "Bon réflexe, ou à éviter ?",
        consigne: "Range chaque réaction du bon côté.",
        gauche: { label: "Bon réflexe", emoji: "💚" },
        droite: { label: "À éviter", emoji: "🚫" },
        cartes: [
          {
            id: "insulter",
            emoji: "😡",
            label: "Répondre par une insulte",
            bon: "droite",
            reaction: "À éviter : ça nourrit la dispute.",
          },
          {
            id: "montrer",
            emoji: "🧑‍🦰",
            label: "Montrer les messages à un adulte",
            bon: "gauche",
            reaction: "Oui ! Demander de l'aide, c'est courageux.",
          },
          {
            id: "bloquer",
            emoji: "🚫",
            label: "Bloquer la personne",
            bon: "gauche",
            reaction: "Oui ! Tu n'as pas à subir ça.",
          },
          {
            id: "seul",
            emoji: "🤫",
            label: "Tout garder pour soi et pleurer seul",
            bon: "droite",
            reaction: "À éviter : tu mérites d'être aidé. Parles-en.",
          },
          {
            id: "preuve",
            emoji: "📸",
            label: "Faire une capture comme preuve",
            bon: "gauche",
            reaction: "Oui ! La preuve aide l'adulte à t'aider.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-harcele",
        titre: "Le grand test",
        emoji: "💬💙",
        question:
          "Quelqu'un t'envoie des messages méchants tous les jours. Le mieux ?",
        options: [
          {
            id: "a",
            label: "Je me venge en étant méchant aussi",
            emoji: "😡",
            bon: false,
            reaction: "Non : ça empire les choses et ça ne te protège pas.",
          },
          {
            id: "b",
            label: "Je fais comme si de rien et je garde tout pour moi",
            emoji: "🤐",
            bon: false,
            reaction: "Non : tu as le droit d'être aidé. Ne reste pas seul.",
          },
          {
            id: "c",
            label: "Je bloque, je garde une preuve et j'en parle à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT. Demander de l'aide, c'est la plus grande force 💙",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 8 - Mes écrans, mon équilibre (bien-être + sécurité)
  // ===========================================================================
  {
    slug: "mes-ecrans-mon-equilibre",
    titre: "Mes écrans, mon équilibre",
    sousTitre: "Faire des pauses et savoir dire stop",
    emoji: "⏰",
    couleur: "lime",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-encore-5-min",
        titre: "Encore 5 minutes !",
        panels: [
          {
            emoji: "🌙🎮",
            texte: "Il est tard, tes yeux piquent, mais le jeu est trop bien…",
          },
          {
            emoji: "🦊😴",
            qui: "hex",
            bulle: "Les écrans, c'est sympa ! Mais ton corps a besoin de pauses et de sommeil pour être au top.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "continue",
              label: "Je continue 1 heure en cachette",
              emoji: "🙈",
              bon: false,
              reaction:
                "On apprend : sans sommeil, on est fatigué et grognon. Le jeu sera encore là demain 🙂",
            },
            {
              id: "pause",
              label: "Je fais une pause et je vais dormir",
              emoji: "😴",
              bon: true,
              reaction: "Bravo ! Bien dormir, c'est un super-pouvoir.",
            },
          ],
        },
        morale:
          "Les écrans, c'est bien avec des pauses. Le sommeil et le jeu dehors rendent plus fort.",
      },
      {
        type: "tri",
        id: "tri-equilibre",
        titre: "Bon pour moi, ou trop ?",
        consigne: "Range chaque habitude du bon côté.",
        gauche: { label: "Équilibré", emoji: "😊" },
        droite: { label: "Trop", emoji: "⚠️" },
        cartes: [
          {
            id: "dehors",
            emoji: "⚽",
            label: "Un jeu, puis aller jouer dehors",
            bon: "gauche",
            reaction: "Équilibré ! Bouger, c'est important.",
          },
          {
            id: "nuit",
            emoji: "🌙",
            label: "Jouer toute la nuit en cachette",
            bon: "droite",
            reaction: "Trop ! Le sommeil passe avant.",
          },
          {
            id: "eteindre",
            emoji: "🛏️",
            label: "Éteindre les écrans avant de dormir",
            bon: "gauche",
            reaction: "Équilibré ! On dort beaucoup mieux.",
          },
          {
            id: "repas",
            emoji: "🍝",
            label: "Un écran pendant tout le repas en famille",
            bon: "droite",
            reaction: "Trop ! Le repas, c'est le moment ensemble.",
          },
          {
            id: "pause",
            emoji: "🧘",
            label: "Faire une pause pour reposer mes yeux",
            bon: "gauche",
            reaction: "Équilibré ! Tes yeux te disent merci.",
          },
        ],
      },
      {
        type: "repere",
        id: "repere-malaise",
        titre: "Stop ! J'en parle tout de suite",
        consigne: "Touche ce qui doit te faire ARRÊTER et prévenir un adulte.",
        ecran: "Sur internet, certaines choses ne sont pas pour toi 👇",
        elements: [
          {
            id: "chat",
            emoji: "🐱",
            texte: "Une vidéo de chat rigolote",
            piege: false,
            reaction: "Ça, c'est tout doux 🙂",
          },
          {
            id: "peur",
            emoji: "😱",
            texte: "Une image violente ou qui fait très peur",
            piege: true,
            reaction: "Oui : j'éteins et je préviens un adulte.",
          },
          {
            id: "secret",
            emoji: "🤫",
            texte: "« Garde ça secret, ne le dis pas aux adultes »",
            piege: true,
            reaction:
              "STOP. Un secret qu'on doit cacher aux adultes = on en parle tout de suite.",
          },
          {
            id: "jeu",
            emoji: "🎮",
            texte: "Un jeu rigolo avec un ami",
            piege: false,
            reaction: "Tout va bien 🙂",
          },
          {
            id: "camera",
            emoji: "📷",
            texte: "« Enlève tes vêtements devant la caméra »",
            piege: true,
            reaction:
              "STOP. Ce n'est JAMAIS normal. J'éteins et je préviens tout de suite un adulte de confiance.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-secret",
        titre: "Le grand test",
        emoji: "🤫🛡️",
        question:
          "Quelqu'un en ligne te demande de garder un « secret » rien qu'à vous deux. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je garde le secret",
            emoji: "🤐",
            bon: false,
            reaction:
              "Non : un adulte de confiance ne te demande jamais de cacher un secret aux autres adultes.",
          },
          {
            id: "b",
            label: "Je fais ce qu'il dit pour ne pas le fâcher",
            emoji: "😬",
            bon: false,
            reaction: "Non : tu n'as pas à obéir à ça. Ce n'est pas ta faute.",
          },
          {
            id: "c",
            label: "Je n'obéis pas et j'en parle tout de suite à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT. En parler, c'est exactement ce qu'il faut faire 💙",
          },
        ],
      },
    ],
  },
  // ===========================================================================
  // MONDE 9 - Acheter sans se faire avoir
  // ===========================================================================
  {
    slug: "acheter-sans-se-faire-avoir",
    titre: "Acheter sans se faire avoir",
    sousTitre: "Faux gratuits, achats cachés et boutons pièges",
    emoji: "🛒",
    couleur: "teal",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-gratuit-pas-gratuit",
        titre: "Gratuit… pas si gratuit",
        panels: [
          {
            emoji: "📲🆓",
            texte: "Tu installes un jeu marqué « GRATUIT ». Tu joues, c'est top !",
          },
          {
            emoji: "💳",
            qui: "piege",
            bulle: "Pour continuer, paie 9,99 € ! Vite, sinon tu perds tout !",
          },
          {
            emoji: "🦊🤔",
            qui: "hex",
            bulle: "« Gratuit » au début ne veut pas dire gratuit après. Et l'argent, ce n'est pas à toi de décider seul.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "paie",
              label: "J'appuie vite sur « Payer » pour continuer",
              emoji: "👆",
              bon: false,
              reaction:
                "On apprend : un achat, c'est de l'argent réel. On ne paie jamais sans demander à un adulte.",
            },
            {
              id: "demande",
              label: "Je demande à un adulte avant de payer",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! L'argent, on en parle toujours avec un adulte.",
            },
          ],
        },
        morale:
          "« Gratuit » au début peut devenir payant. Je ne paie jamais sans demander à un adulte.",
      },
      {
        type: "repere",
        id: "repere-pieges-payer",
        titre: "Les pièges pour te faire payer",
        consigne: "Touche les pièges qui veulent ton argent ou ton clic.",
        ecran: "Pendant le jeu, plein de choses s'affichent 👇",
        elements: [
          {
            id: "continuer",
            emoji: "▶️",
            texte: "« Continuer gratuitement »",
            piege: false,
            reaction: "Ça, c'est l'option normale 🙂",
          },
          {
            id: "achat",
            emoji: "🛍️",
            texte: "« ACHÈTE VITE, -50 % aujourd'hui ! »",
            piege: true,
            reaction: "Oui ! Te presser, c'est pour te faire payer sans réfléchir.",
          },
          {
            id: "gagnant",
            emoji: "🏆",
            texte: "« Tu es le 1 000 000e visiteur, clique ! »",
            piege: true,
            reaction: "Bravo ! Personne n'a vraiment gagné quoi que ce soit.",
          },
          {
            id: "croix",
            emoji: "❌",
            texte: "Une croix pour fermer la pub",
            piege: false,
            reaction: "Fermer la pub, c'est OK 🙂",
          },
          {
            id: "abo",
            emoji: "🧾",
            texte: "Un abonnement caché écrit tout petit",
            piege: true,
            reaction: "Bien vu ! Le tout-petit texte cache souvent un piège.",
          },
        ],
      },
      {
        type: "tri",
        id: "tri-seul-ou-demander",
        titre: "Tout seul, ou je demande d'abord ?",
        consigne: "Range chaque action du bon côté.",
        gauche: { label: "OK tout seul", emoji: "👍" },
        droite: { label: "Je demande d'abord", emoji: "🙋" },
        cartes: [
          {
            id: "bd",
            emoji: "📖",
            label: "Lire une histoire gratuite",
            bon: "gauche",
            reaction: "OK ! C'est gratuit et sans risque.",
          },
          {
            id: "pieces",
            emoji: "💰",
            label: "Acheter des pièces avec de l'argent",
            bon: "droite",
            reaction: "Je demande ! L'argent, c'est avec un adulte.",
          },
          {
            id: "carte",
            emoji: "💳",
            label: "Taper un numéro de carte bancaire",
            bon: "droite",
            reaction: "Je demande ! La carte, jamais sans un adulte.",
          },
          {
            id: "avatar",
            emoji: "🧑‍🎨",
            label: "Choisir mon avatar gratuit",
            bon: "gauche",
            reaction: "OK ! Aucun souci 🙂",
          },
          {
            id: "payer",
            emoji: "🛒",
            label: "Cliquer « Payer maintenant »",
            bon: "droite",
            reaction: "Je demande ! On ne paie pas tout seul.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-achat",
        titre: "Le grand test",
        emoji: "💳🎁",
        question:
          "Un jeu demande le numéro de carte bancaire pour « un cadeau gratuit ». Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je tape les chiffres de la carte",
            emoji: "🔢",
            bon: false,
            reaction: "Non ! Un cadeau gratuit ne demande jamais de carte.",
          },
          {
            id: "b",
            label: "Je demande juste à un copain",
            emoji: "🧒",
            bon: false,
            reaction: "Non ! Pour l'argent, c'est un adulte, pas un copain.",
          },
          {
            id: "c",
            label: "Je n'entre rien et je préviens un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu ne te fais pas avoir 💪",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 10 - IA : c'est vrai ou inventé ?
  // ===========================================================================
  {
    slug: "ia-vrai-ou-invente",
    titre: "IA : c'est vrai ou inventé ?",
    sousTitre: "Images et voix fabriquées par ordinateur",
    emoji: "🤖",
    couleur: "indigo",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-photo-bizarre",
        titre: "La photo trop incroyable",
        panels: [
          {
            emoji: "🐱🚗",
            texte: "Tu vois une photo d'un chat géant qui conduit une voiture.",
          },
          {
            emoji: "🦊🤖",
            qui: "hex",
            bulle: "Aujourd'hui, un ordinateur (on dit l'IA) peut fabriquer des images, et même des voix, très réalistes.",
          },
          {
            emoji: "🦊",
            qui: "hex",
            bulle: "Donc une image « preuve », ce n'est plus toujours vrai. On réfléchit avant de croire.",
          },
        ],
        question: {
          consigne: "Tu fais quoi avec cette photo ?",
          options: [
            {
              id: "croit",
              label: "Je la crois et je la partage partout",
              emoji: "📤",
              bon: false,
              reaction:
                "On apprend : une image incroyable peut être fabriquée. On ne partage pas sans vérifier.",
            },
            {
              id: "doute",
              label: "Je me dis que c'est peut-être inventé",
              emoji: "🤔",
              bon: true,
              reaction: "Bravo ! Tu gardes ton esprit de détective 🕵️",
            },
          ],
        },
        morale:
          "Une image ou une voix peut être fabriquée par un ordinateur. Je ne crois pas tout.",
      },
      {
        type: "tri",
        id: "tri-possible-invente",
        titre: "Possible en vrai, ou sûrement inventé ?",
        consigne: "Cette image ou cette voix, on peut y croire ?",
        gauche: { label: "Possible", emoji: "✅" },
        droite: { label: "Sûrement inventé", emoji: "🤖" },
        cartes: [
          {
            id: "ecole",
            emoji: "🌧️",
            label: "Une photo de ton école sous la pluie",
            bon: "gauche",
            reaction: "Possible, c'est tout simple 🙂",
          },
          {
            id: "chat-avion",
            emoji: "🐱✈️",
            label: "Un chat qui pilote un avion",
            bon: "droite",
            reaction: "Inventé ! Trop incroyable pour être vrai.",
          },
          {
            id: "voix-code",
            emoji: "🎙️",
            label: "Une « voix de maman » qui réclame un code par message",
            bon: "droite",
            reaction: "Méfiance ! Une voix peut être imitée. Je vérifie en vrai.",
          },
          {
            id: "vacances",
            emoji: "🏖️",
            label: "Une photo de tes vacances",
            bon: "gauche",
            reaction: "Possible, c'est normal 🙂",
          },
          {
            id: "star",
            emoji: "🎤",
            label: "Une vidéo où une star dit un truc jamais vu ailleurs",
            bon: "droite",
            reaction: "Inventé peut-être ! On vérifie avant de croire.",
          },
        ],
      },
      {
        type: "paires",
        id: "paires-ia",
        titre: "Le bon réflexe face à l'IA",
        consigne: "Relie chaque situation au bon réflexe.",
        paires: [
          {
            id: "incroyable",
            gauche: { emoji: "🤯", label: "Image trop incroyable" },
            droite: { emoji: "🧐", label: "Je me méfie" },
          },
          {
            id: "voix",
            gauche: { emoji: "🎙️", label: "Une voix réclame un code" },
            droite: { emoji: "📞", label: "Je vérifie en vrai (j'appelle)" },
          },
          {
            id: "doute",
            gauche: { emoji: "🤔", label: "Je ne suis pas sûr" },
            droite: { emoji: "🧑‍🦰", label: "Je demande à un adulte" },
          },
          {
            id: "preuve",
            gauche: { emoji: "🖼️", label: "Une « preuve » en image" },
            droite: { emoji: "✂️", label: "Une image peut être fabriquée" },
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-ia",
        titre: "Le grand test",
        emoji: "🎙️🔐",
        question:
          "Un message avec la « voix » de ton parent réclame un code secret. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "J'envoie le code, c'est sa voix",
            emoji: "🔢",
            bon: false,
            reaction: "Non ! Une voix peut être imitée par un ordinateur.",
          },
          {
            id: "b",
            label: "Je réponds au message pour demander",
            emoji: "💬",
            bon: false,
            reaction: "Non ! Le message peut être un faux. On vérifie autrement.",
          },
          {
            id: "c",
            label: "Je vais voir mon parent en vrai ou je l'appelle",
            emoji: "📞",
            bon: true,
            reaction: "PARFAIT ! Vérifier en vrai, c'est le bon réflexe 🤖🚫",
          },
        ],
      },
    ],
  },
  // ===========================================================================
  // MONDE 11 - La maison qui écoute (objets connectés)
  // ===========================================================================
  {
    slug: "la-maison-qui-ecoute",
    titre: "La maison qui écoute",
    sousTitre: "Assistants, caméras et jouets connectés",
    emoji: "🏠",
    couleur: "fuchsia",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-assistant",
        titre: "Le haut-parleur magique",
        panels: [
          {
            emoji: "🔊🏠",
            texte: "À la maison, un petit haut-parleur répond quand on lui parle.",
          },
          {
            emoji: "🦊👂",
            qui: "hex",
            bulle: "C'est pratique ! Mais il a un micro qui écoute pour répondre. On fait attention à ce qu'on dit devant.",
          },
        ],
        question: {
          consigne: "L'assistant te demande ton mot de passe pour « jouer ». Tu fais quoi ?",
          options: [
            {
              id: "dit",
              label: "Je le dis tout fort, c'est juste un jouet",
              emoji: "🗣️",
              bon: false,
              reaction:
                "On apprend : même à une machine, un mot de passe ne se dit pas. Et un micro peut tout entendre.",
            },
            {
              id: "refuse",
              label: "Je ne le dis pas et j'en parle à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Un secret reste un secret, même devant un micro.",
            },
          ],
        },
        morale:
          "Les objets connectés ont des micros et des caméras. Je fais attention à ce que je dis et montre devant.",
      },
      {
        type: "paires",
        id: "paires-objets",
        titre: "Chaque objet, son réflexe",
        consigne: "Relie chaque objet connecté au bon réflexe.",
        paires: [
          {
            id: "micro",
            gauche: { emoji: "🔊", label: "Assistant qui écoute" },
            droite: { emoji: "🤫", label: "Je ne dis pas de secrets devant" },
          },
          {
            id: "camera",
            gauche: { emoji: "📷", label: "Caméra connectée" },
            droite: { emoji: "🙈", label: "On peut la cacher ou l'éteindre" },
          },
          {
            id: "montre",
            gauche: { emoji: "⌚", label: "Montre qui sait où je suis" },
            droite: { emoji: "🧑‍🦰", label: "Un adulte règle qui peut voir" },
          },
          {
            id: "jouet",
            gauche: { emoji: "🧸", label: "Jouet qui parle" },
            droite: { emoji: "🔌", label: "On peut l'éteindre quand on veut" },
          },
        ],
      },
      {
        type: "tri",
        id: "tri-devant-objet",
        titre: "Devant un objet connecté : OK ou pas ?",
        consigne: "Range chaque idée du bon côté.",
        gauche: { label: "OK", emoji: "👍" },
        droite: { label: "Pas devant !", emoji: "🙊" },
        cartes: [
          {
            id: "meteo",
            emoji: "🌤️",
            label: "Demander la météo à l'assistant",
            bon: "gauche",
            reaction: "OK ! C'est exactement son rôle.",
          },
          {
            id: "mdp",
            emoji: "🔑",
            label: "Dire mon mot de passe tout fort",
            bon: "droite",
            reaction: "Pas devant ! Le micro pourrait l'entendre.",
          },
          {
            id: "musique",
            emoji: "🎵",
            label: "Mettre une chanson",
            bon: "gauche",
            reaction: "OK ! Aucun souci 🙂",
          },
          {
            id: "adresse",
            emoji: "🏠",
            label: "Donner mon adresse à un jouet connecté",
            bon: "droite",
            reaction: "Pas devant ! Mon adresse reste privée.",
          },
          {
            id: "eteindre",
            emoji: "🔌",
            label: "Demander à un adulte d'éteindre la caméra",
            bon: "gauche",
            reaction: "OK ! Super réflexe de prudence.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-objets",
        titre: "Le grand test",
        emoji: "🔊🔑",
        question:
          "Un jouet connecté te demande ton mot de passe pour « débloquer un jeu ». Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je le dis, c'est juste un jouet",
            emoji: "🧸",
            bon: false,
            reaction: "Non ! Jouet ou pas, un mot de passe ne se dit jamais.",
          },
          {
            id: "b",
            label: "Je l'écris pour le jouet",
            emoji: "📝",
            bon: false,
            reaction: "Non ! Ni à voix haute, ni écrit. C'est secret.",
          },
          {
            id: "c",
            label: "Je refuse et j'en parle à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu gardes tes secrets, même à la maison 🏠",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 12 - Où je suis (géolocalisation)
  // ===========================================================================
  {
    slug: "ou-je-suis",
    titre: "Où je suis",
    sousTitre: "Ne pas dire à tout le monde où tu te trouves",
    emoji: "🧭",
    couleur: "blue",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-position",
        titre: "La carte qui montre tout",
        panels: [
          {
            emoji: "📍🗺️",
            texte: "Une appli propose de partager ta position « avec tout le monde ».",
          },
          {
            emoji: "🦊🤔",
            qui: "hex",
            bulle: "Partager où tu es, c'est dire à des inconnus où te trouver. On garde ça pour les gens de confiance.",
          },
        ],
        question: {
          consigne: "Tu choisis quoi ?",
          options: [
            {
              id: "tout",
              label: "Je partage ma position avec tout le monde",
              emoji: "🌍",
              bon: false,
              reaction:
                "On apprend : « tout le monde », ça inclut des inconnus. On ne montre pas où on est à n'importe qui.",
            },
            {
              id: "off",
              label: "Je laisse coupé et je demande à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Ta position, c'est une info privée.",
            },
          ],
        },
        morale:
          "Montrer où tu es, c'est privé. Je ne partage ma position qu'avec des gens de confiance, avec un adulte.",
      },
      {
        type: "repere",
        id: "repere-localisation",
        titre: "Qu'est-ce qui dit où tu es ?",
        consigne: "Touche tout ce qui montre l'endroit où tu te trouves.",
        ecran: "Tu vas publier ça. Qu'est-ce qui révèle ta position ? 👇",
        elements: [
          {
            id: "humeur",
            emoji: "😄",
            texte: "« Trop contente aujourd'hui ! »",
            piege: false,
            reaction: "Ça ne dit pas où tu es 🙂",
          },
          {
            id: "lieu",
            emoji: "📍",
            texte: "Le petit drapeau « à l'école Jules-Ferry »",
            piege: true,
            reaction: "Oui ! Ça dit exactement où tu es.",
          },
          {
            id: "rue",
            emoji: "🪧",
            texte: "La plaque de ta rue en arrière-plan",
            piege: true,
            reaction: "Bravo ! On peut lire où tu habites.",
          },
          {
            id: "chat",
            emoji: "🐱",
            texte: "Ton chat sur le canapé",
            piege: false,
            reaction: "Le chat ne dit rien 🙂",
          },
          {
            id: "direct",
            emoji: "🔴",
            texte: "« Je suis en direct au parc, venez ! »",
            piege: true,
            reaction: "Bien vu ! En direct, des inconnus savent où venir.",
          },
        ],
      },
      {
        type: "tri",
        id: "tri-position",
        titre: "Je partage ma position avec qui ?",
        consigne: "Range chaque cas du bon côté.",
        gauche: { label: "Je peux (avec un adulte)", emoji: "👍" },
        droite: { label: "Non", emoji: "🚫" },
        cartes: [
          {
            id: "parent",
            emoji: "👨‍👩‍👧",
            label: "Mes parents savent où je suis",
            bon: "gauche",
            reaction: "Oui, c'est rassurant et normal.",
          },
          {
            id: "inconnu",
            emoji: "👤",
            label: "Un inconnu d'un jeu veut ma position",
            bon: "droite",
            reaction: "Non ! Jamais à un inconnu.",
          },
          {
            id: "public",
            emoji: "🌍",
            label: "Partager ma position « en public »",
            bon: "droite",
            reaction: "Non ! Tout le monde pourrait la voir.",
          },
          {
            id: "direct",
            emoji: "🔴",
            label: "Annoncer « je suis ici, venez ! »",
            bon: "droite",
            reaction: "Non ! On ne donne pas rendez-vous comme ça.",
          },
          {
            id: "off",
            emoji: "📴",
            label: "Couper la position quand je n'en ai pas besoin",
            bon: "gauche",
            reaction: "Oui ! Le bon réflexe par défaut.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-position",
        titre: "Le grand test",
        emoji: "📍👤",
        question:
          "Un inconnu dans un jeu te demande de partager ta position pour « jouer ensemble ». Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je partage ma position",
            emoji: "📍",
            bon: false,
            reaction: "Non ! Il saurait où te trouver en vrai.",
          },
          {
            id: "b",
            label: "Je donne juste mon quartier",
            emoji: "🏘️",
            bon: false,
            reaction: "Non ! Même un quartier, ça en dit trop.",
          },
          {
            id: "c",
            label: "Je refuse et j'en parle à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Ta position reste privée 🧭",
          },
        ],
      },
    ],
  },
  // ===========================================================================
  // MONDE 13 - Les défis qui dérapent
  // ===========================================================================
  {
    slug: "defis-qui-derapent",
    titre: "Les défis qui dérapent",
    sousTitre: "Quand un « défi » devient dangereux",
    emoji: "🌀",
    couleur: "red",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-defi",
        titre: "Le défi de trop",
        panels: [
          {
            emoji: "📹😬",
            texte: "Des copains te filment et te lancent un défi :",
          },
          {
            emoji: "👥",
            qui: "enfant",
            bulle: "Vas-y, retiens ta respiration le plus longtemps possible ! Tout le monde le fait !",
          },
          {
            emoji: "🦊🛑",
            qui: "hex",
            bulle: "Un défi qui peut te faire mal, ce n'est pas un jeu. Un vrai ami ne te pousse jamais au danger.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "fait",
              label: "Je le fais pour être comme les autres",
              emoji: "😰",
              bon: false,
              reaction:
                "On apprend : suivre le groupe ne rend pas un défi sûr. Tu as toujours le droit de dire non.",
            },
            {
              id: "non",
              label: "Je dis non et j'en parle à un adulte",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Dire non quand c'est dangereux, c'est très courageux.",
            },
          ],
        },
        morale:
          "Je ne fais pas un défi dangereux, même si tout le monde le fait. Dire non, c'est fort.",
      },
      {
        type: "tri",
        id: "tri-defi",
        titre: "Défi rigolo, ou dangereux ?",
        consigne: "Range chaque défi du bon côté.",
        gauche: { label: "Rigolo & sans danger", emoji: "😄" },
        droite: { label: "Dangereux", emoji: "🚫" },
        cartes: [
          {
            id: "danse",
            emoji: "💃",
            label: "Imiter une danse rigolote",
            bon: "gauche",
            reaction: "Rigolo ! Et sans aucun risque 🙂",
          },
          {
            id: "respiration",
            emoji: "😵",
            label: "Retenir sa respiration très longtemps",
            bon: "droite",
            reaction: "Dangereux ! Ça peut faire perdre connaissance.",
          },
          {
            id: "dessin",
            emoji: "🎨",
            label: "Faire le plus beau dessin",
            bon: "gauche",
            reaction: "Rigolo ! Un chouette défi 🙂",
          },
          {
            id: "avaler",
            emoji: "🧪",
            label: "Manger ou boire un truc pas fait pour ça",
            bon: "droite",
            reaction: "Dangereux ! On ne met jamais ça en bouche.",
          },
          {
            id: "grimper",
            emoji: "🧗",
            label: "Grimper là où c'est interdit",
            bon: "droite",
            reaction: "Dangereux ! On peut tomber.",
          },
        ],
      },
      {
        type: "paires",
        id: "paires-defi",
        titre: "Quand on me pousse",
        consigne: "Relie chaque situation au bon réflexe.",
        paires: [
          {
            id: "defi",
            gauche: { emoji: "😬", label: "On me met au défi" },
            droite: { emoji: "✋", label: "J'ai le droit de dire non" },
          },
          {
            id: "danger",
            gauche: { emoji: "⚠️", label: "C'est dangereux" },
            droite: { emoji: "🚫", label: "Je ne le fais pas" },
          },
          {
            id: "groupe",
            gauche: { emoji: "👥", label: "Tout le monde le fait" },
            droite: { emoji: "🤷", label: "Ça ne le rend pas sûr" },
          },
          {
            id: "doute",
            gauche: { emoji: "🤔", label: "Je ne sais pas quoi faire" },
            droite: { emoji: "🧑‍🦰", label: "J'en parle à un adulte" },
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-defi",
        titre: "Le grand test",
        emoji: "📹⚠️",
        question:
          "Des amis te filment et te défient de faire un truc dangereux. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je le fais pour ne pas avoir l'air nul",
            emoji: "😰",
            bon: false,
            reaction: "Non ! Ta sécurité passe avant le regard des autres.",
          },
          {
            id: "b",
            label: "Je le fais juste un petit peu",
            emoji: "😬",
            bon: false,
            reaction: "Non ! Un peu dangereux, c'est encore dangereux.",
          },
          {
            id: "c",
            label: "Je dis non et j'en parle à un adulte",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu es courageux ET malin 💪",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 14 - Les chaînes de messages
  // ===========================================================================
  {
    slug: "chaines-de-messages",
    titre: "Les chaînes de messages",
    sousTitre: "« Fais suivre ou sinon… » : on arrête tout",
    emoji: "🔗",
    couleur: "pink",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-chaine",
        titre: "Fais suivre ou sinon…",
        panels: [
          {
            emoji: "📩😱",
            texte: "Tu reçois ce message le soir :",
          },
          {
            emoji: "⛓️",
            qui: "piege",
            bulle: "Envoie ce message à 15 personnes ou il t'arrive malheur cette nuit !",
          },
          {
            emoji: "🦊😌",
            qui: "hex",
            bulle: "C'est une « chaîne ». Une fausse menace pour te faire peur et tout encombrer. Rien ne va t'arriver.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "envoie",
              label: "Je l'envoie à 15 amis, au cas où",
              emoji: "📤",
              bon: false,
              reaction:
                "On apprend : une chaîne est toujours fausse. L'envoyer fait juste peur aux autres. On arrête.",
            },
            {
              id: "arrete",
              label: "Je n'envoie à personne et j'en parle si ça m'inquiète",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Tu arrêtes la chaîne, comme un champion.",
            },
          ],
        },
        morale:
          "Une chaîne « envoie sinon malheur » est toujours fausse. Je l'arrête, je ne la fais pas suivre.",
      },
      {
        type: "repere",
        id: "repere-chaine",
        titre: "Repère la chaîne piège",
        consigne: "Touche ce qui montre que c'est une chaîne piège.",
        ecran: "Tu reçois ce long message 👇",
        elements: [
          {
            id: "bonnenuit",
            emoji: "🌙",
            texte: "« Bonne nuit ! »",
            piege: false,
            reaction: "Ça, c'est juste gentil 🙂",
          },
          {
            id: "envoie",
            emoji: "📤",
            texte: "« Envoie à 15 personnes »",
            piege: true,
            reaction: "Oui ! Te forcer à transmettre = chaîne.",
          },
          {
            id: "malheur",
            emoji: "😱",
            texte: "« Sinon il t'arrive malheur »",
            piege: true,
            reaction: "Bravo ! La fausse menace, c'est le piège.",
          },
          {
            id: "gain",
            emoji: "💰",
            texte: "« Tu gagneras 100 € si tu partages »",
            piege: true,
            reaction: "Bien vu ! On ne gagne rien en partageant.",
          },
          {
            id: "blague",
            emoji: "😄",
            texte: "Une petite blague",
            piege: false,
            reaction: "Une blague, c'est sans souci 🙂",
          },
        ],
      },
      {
        type: "tri",
        id: "tri-chaine",
        titre: "J'arrête, ou je peux transmettre ?",
        consigne: "Range chaque message du bon côté.",
        gauche: { label: "OK à partager", emoji: "👍" },
        droite: { label: "J'arrête la chaîne", emoji: "✋" },
        cartes: [
          {
            id: "menace",
            emoji: "😱",
            label: "« Envoie à 15 ou malheur »",
            bon: "droite",
            reaction: "J'arrête ! Fausse menace.",
          },
          {
            id: "prof",
            emoji: "🧑‍🏫",
            label: "Une vraie info de ma maîtresse pour la classe",
            bon: "gauche",
            reaction: "OK, c'est une vraie info utile.",
          },
          {
            id: "gain",
            emoji: "🤑",
            label: "« Gagne 1000 € en partageant »",
            bon: "droite",
            reaction: "J'arrête ! On ne gagne rien comme ça.",
          },
          {
            id: "blague",
            emoji: "😂",
            label: "Une blague rigolote à un ami",
            bon: "gauche",
            reaction: "OK ! Juste pour rire 🙂",
          },
          {
            id: "culpabilise",
            emoji: "😢",
            label: "« Partage ou tu es méchant »",
            bon: "droite",
            reaction: "J'arrête ! On ne te fait pas culpabiliser.",
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-chaine",
        titre: "Le grand test",
        emoji: "⛓️📵",
        question:
          "Un message dit : « Fais suivre à 15 amis ou il t'arrive malheur ». Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je l'envoie à 15 personnes",
            emoji: "📣",
            bon: false,
            reaction: "Non ! Tu ferais peur aux autres pour rien.",
          },
          {
            id: "b",
            label: "Je l'envoie à 2 amis pour être tranquille",
            emoji: "👬",
            bon: false,
            reaction: "Non ! Même à 2, tu propages la chaîne.",
          },
          {
            id: "c",
            label: "Je n'envoie à personne, c'est une fausse chaîne",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu coupes la chaîne net 🔗✂️",
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // MONDE 15 - Mon premier compte
  // ===========================================================================
  {
    slug: "mon-premier-compte",
    titre: "Mon premier compte",
    sousTitre: "S'inscrire en donnant le moins d'infos possible",
    emoji: "📧",
    couleur: "yellow",
    disponible: true,
    activites: [
      {
        type: "bd",
        id: "bd-compte",
        titre: "Crée ton compte !",
        panels: [
          {
            emoji: "📝",
            texte: "Un site veut que tu crées un compte pour jouer. Il demande :",
          },
          {
            emoji: "🪪",
            qui: "piege",
            bulle: "Ton vrai nom, ton adresse, ton âge, ton numéro et une photo de toi !",
          },
          {
            emoji: "🦊🤔",
            qui: "hex",
            bulle: "On ne s'inscrit pas partout, et on donne le MOINS d'infos possible. Un adulte doit être au courant.",
          },
        ],
        question: {
          consigne: "Tu fais quoi ?",
          options: [
            {
              id: "tout",
              label: "Je remplis tout vite avec mes vraies infos",
              emoji: "⚡",
              bon: false,
              reaction:
                "On apprend : un jeu n'a pas besoin de toute ta vie. On demande à un adulte et on donne le minimum.",
            },
            {
              id: "adulte",
              label: "Je demande à un adulte et je donne le minimum",
              emoji: "🛡️",
              bon: true,
              reaction: "Bravo ! Le minimum d'infos, c'est le bon réflexe.",
            },
          ],
        },
        morale:
          "Avant de créer un compte, je demande à un adulte et je donne le moins d'infos possible.",
      },
      {
        type: "tri",
        id: "tri-inscription",
        titre: "Pour m'inscrire : OK ou je garde ?",
        consigne: "Range chaque info du bon côté.",
        gauche: { label: "Souvent OK", emoji: "👍" },
        droite: { label: "Je garde / je demande", emoji: "🚫" },
        cartes: [
          {
            id: "pseudo",
            emoji: "🦸",
            label: "Un pseudo rigolo (pas mon vrai nom)",
            bon: "gauche",
            reaction: "OK ! Un pseudo protège ton vrai nom.",
          },
          {
            id: "adresse",
            emoji: "🏠",
            label: "Ma vraie adresse maison",
            bon: "droite",
            reaction: "Je garde ! Mon adresse reste privée.",
          },
          {
            id: "mdp",
            emoji: "🔑",
            label: "Choisir un mot de passe costaud",
            bon: "gauche",
            reaction: "OK ! C'est même une bonne idée 💪",
          },
          {
            id: "tel",
            emoji: "📱",
            label: "Mon numéro de téléphone",
            bon: "droite",
            reaction: "Je garde ! Pas besoin pour jouer.",
          },
          {
            id: "photo",
            emoji: "🤳",
            label: "Une vraie photo de moi",
            bon: "droite",
            reaction: "Je garde ! Ma photo, c'est perso.",
          },
        ],
      },
      {
        type: "paires",
        id: "paires-compte",
        titre: "Le bon réflexe à l'inscription",
        consigne: "Relie chaque situation au bon réflexe.",
        paires: [
          {
            id: "avant",
            gauche: { emoji: "📝", label: "Avant de m'inscrire" },
            droite: { emoji: "🧑‍🦰", label: "Je demande à un adulte" },
          },
          {
            id: "nom",
            gauche: { emoji: "🪪", label: "On veut mon nom complet" },
            droite: { emoji: "🤏", label: "Je donne le minimum" },
          },
          {
            id: "mail",
            gauche: { emoji: "✉️", label: "Un e-mail bizarre d'un inconnu" },
            droite: { emoji: "🙅", label: "Je n'ouvre pas, je montre à un adulte" },
          },
          {
            id: "mdp",
            gauche: { emoji: "🔑", label: "Mon mot de passe" },
            droite: { emoji: "💪", label: "Costaud et secret" },
          },
        ],
      },
      {
        type: "quiz",
        id: "quiz-compte",
        titre: "Le grand test",
        emoji: "📝🪪",
        question:
          "Un site veut ton nom, ton adresse et ta photo juste pour jouer. Tu fais quoi ?",
        options: [
          {
            id: "a",
            label: "Je remplis tout",
            emoji: "✍️",
            bon: false,
            reaction: "Non ! Un jeu n'a pas besoin de toutes ces infos.",
          },
          {
            id: "b",
            label: "Je mets juste mon adresse",
            emoji: "🏠",
            bon: false,
            reaction: "Non ! Ton adresse, on la garde privée.",
          },
          {
            id: "c",
            label: "Je demande à un adulte et je donne le minimum",
            emoji: "🛡️",
            bon: true,
            reaction: "PARFAIT ! Tu t'inscris comme un pro prudent 📧",
          },
        ],
      },
    ],
  },
];

export function getMonde(slug: string): Monde | undefined {
  return MONDES.find((m) => m.slug === slug);
}
