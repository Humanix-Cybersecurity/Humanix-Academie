// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue HumaniX Académie - 25 saisons × 6 épisodes = 150 modules officiels.
//
// Ce catalogue alimente la BDD (table Saison + Episode) au seeding. Le contenu
// pédagogique détaillé (scenario, choix, quiz) est dans `content/saisons/...`
// au format MDX et chargé à l'exécution par lib/episodes.ts.
//
// PHILOSOPHIE : le titre + la description doivent être assez précis pour qu'un
// prospect feuilletant le catalogue voie immédiatement la promesse de chaque
// module. Quand un MDX manque, la page épisode utilise un fallback générique
// (cf. components/EpisodePlayer.tsx). Le contenu MDX peut être enrichi
// progressivement par l'équipe ou les experts contributeurs (cf. /experts).
//
// CONVENTION xpReward / coinsReward :
//  - episode "easy"   :  40 XP / 8 coins
//  - episode "medium" :  60 XP / 12 coins
//  - episode "hard"   :  90 XP / 18 coins
// Ces valeurs sont moyennes : le moteur d'épisode peut les majorer en cas de
// quiz parfait (cf. EpisodePlayer.tsx).

export type CatalogEpisode = {
  slug: string;
  title: string;
  durationMinutes: number; // 5-10 min cible (5 min/sem)
  difficulty: "easy" | "medium" | "hard";
};

export type CatalogSaison = {
  slug: string;
  title: string;
  description: string;
  coverEmoji: string;
  order: number;
  // Audience suggérée : "tous" / "managers" / "rh" / "compta" / "dev" / etc.
  audience: string;
  episodes: CatalogEpisode[];
};

const xp = (d: CatalogEpisode["difficulty"]) =>
  d === "easy" ? 40 : d === "hard" ? 90 : 60;
const coins = (d: CatalogEpisode["difficulty"]) =>
  d === "easy" ? 8 : d === "hard" ? 18 : 12;

export function rewardsFor(diff: CatalogEpisode["difficulty"]) {
  return { xpReward: xp(diff), coinsReward: coins(diff) };
}

// ============================================================================
// 25 SAISONS THÉMATIQUES - 150 ÉPISODES
// ============================================================================
export const CATALOG_SAISONS: CatalogSaison[] = [
  // --- Fondamentaux humains (saisons 1-5) ---
  {
    slug: "phishing",
    title: "Phishing & ingénierie sociale",
    description:
      "Détecter mails, SMS et appels piégés en 5 secondes. Cas réels français.",
    coverEmoji: "🎣",
    order: 1,
    audience: "tous",
    episodes: [
      {
        slug: "01-mail-du-pdg",
        title: "Le mail du PDG",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "02-faux-rib",
        title: "Le faux RIB fournisseur",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-sms-suspect",
        title: "Le SMS de la livraison",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-faux-microsoft",
        title: "Le faux Microsoft 365",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-vishing",
        title: "Le coup de fil du faux support",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-spear-phishing",
        title: "Le spear phishing ciblé direction",
        durationMinutes: 8,
        difficulty: "hard",
      },
    ],
  },
  {
    slug: "mots-de-passe",
    title: "Mots de passe & double authentification",
    description:
      "Gestionnaire, MFA, phrase de passe : la triade qui sauve une entreprise.",
    coverEmoji: "🔑",
    order: 2,
    audience: "tous",
    episodes: [
      {
        slug: "01-collection-postit",
        title: "La collection de post-it",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-double-auth",
        title: "La double authentification",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "03-gestionnaire",
        title: "Choisir un gestionnaire de mots de passe",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-phrase-passe",
        title: "Construire une phrase de passe inviolable",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "05-fuite-credentials",
        title: "Que faire si vos identifiants ont fuité",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-passkeys",
        title: "Les passkeys : l'avenir sans mot de passe",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "donnees-sensibles",
    title: "Données sensibles & RGPD au quotidien",
    description:
      "Manipuler les données clients sans bavure. Registre, droits, fuite.",
    coverEmoji: "📁",
    order: 3,
    audience: "tous",
    episodes: [
      {
        slug: "01-3-questions",
        title: "La règle des 3 questions",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-rgpd-pratique",
        title: "RGPD au quotidien - les 5 réflexes",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-fuite-72h",
        title: "Que faire dans les 72h après une fuite",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-droit-acces",
        title: "Quand un client demande ses données",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-registre",
        title: "Tenir un registre des traitements",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-sous-traitant",
        title: "Vérifier un sous-traitant RGPD",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "teletravail",
    title: "Télétravail & nomadisme",
    description:
      "Wi-Fi public, vol de matériel, posture, environnement familial.",
    coverEmoji: "💻",
    order: 4,
    audience: "tous",
    episodes: [
      {
        slug: "01-wifi-gare",
        title: "Le Wi-Fi de la gare",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "02-laptop-train",
        title: "Mon laptop oublié dans le train",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-coworking",
        title: "Bonnes pratiques en coworking",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-vpn",
        title: "VPN d'entreprise : quand, comment, pourquoi",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-environnement-familial",
        title: "Travailler en famille sans fuite",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "06-shoulder-surfing",
        title: "Le voisin de TGV qui regarde l'écran",
        durationMinutes: 5,
        difficulty: "easy",
      },
    ],
  },
  {
    slug: "fraude-president",
    title: "Fraude au président & FOVI",
    description:
      "L'escroquerie qui coûte le plus cher aux PME françaises. Cas Vinci, Pathé, BNP.",
    coverEmoji: "💼",
    order: 5,
    audience: "compta",
    episodes: [
      {
        slug: "01-mecanisme",
        title: "Anatomie d'une fraude au président",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-faux-virement",
        title: "Le faux virement urgent du DG",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-changement-rib",
        title: "Le changement de RIB en pleine paie",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-deepfake-vocal",
        title: "Le deepfake vocal du dirigeant",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "05-double-validation",
        title: "Mettre en place la double validation",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-cas-pathe",
        title: "Cas réel : 19 M€ chez Pathé",
        durationMinutes: 8,
        difficulty: "hard",
      },
    ],
  },

  // --- Menaces fortes (saisons 6-10) ---
  {
    slug: "ransomware",
    title: "Ransomware & extorsion",
    description:
      "Le ransomware n'arrive pas qu'aux autres. Cas CHU de Brest, Saint-Nazaire, Norsk Hydro.",
    coverEmoji: "🔒",
    order: 6,
    audience: "tous",
    episodes: [
      {
        slug: "01-comprendre",
        title: "Comprendre un ransomware en 5 min",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "02-vecteurs",
        title: "Les 3 portes d'entrée d'un ransomware",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-payer-ou-pas",
        title: "Faut-il payer la rançon ?",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-double-extorsion",
        title: "Le piège de la double extorsion",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-cas-chu-brest",
        title: "Cas réel : CHU de Brest paralysé 3 semaines",
        durationMinutes: 9,
        difficulty: "hard",
      },
      {
        slug: "06-reflexes-immediats",
        title: "Les 6 réflexes des 60 premières minutes",
        durationMinutes: 8,
        difficulty: "hard",
      },
    ],
  },
  {
    slug: "reseaux-sociaux-pro",
    title: "Réseaux sociaux & e-réputation",
    description:
      "Ce que vos employés postent sur LinkedIn et Twitter peut couler l'entreprise.",
    coverEmoji: "🌐",
    order: 7,
    audience: "tous",
    episodes: [
      {
        slug: "01-osint-perso",
        title: "Tout ce qu'on trouve sur vous en 10 min (OSINT)",
        durationMinutes: 8,
        difficulty: "medium",
      },
      {
        slug: "02-photo-bureau",
        title: "La photo de bureau qui leak un client",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "03-checkin",
        title: "Le check-in qui révèle une réunion confidentielle",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-faux-recruteur",
        title: "Le faux recruteur sur LinkedIn",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-bad-buzz",
        title: "Désamorcer un bad buzz",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-charte-rs",
        title: "Construire une charte réseaux sociaux",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "mobile-smartphone",
    title: "Sécurité du smartphone professionnel",
    description:
      "Apps piégées, MDM, BYOD, perte/vol : le mobile, premier vecteur d'attaque 2026.",
    coverEmoji: "📱",
    order: 8,
    audience: "tous",
    episodes: [
      {
        slug: "01-stockage-perte",
        title: "Smartphone perdu : les 4 premières heures",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-apps-piegees",
        title: "Repérer une app piégée sur les stores",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-bluetooth-airdrop",
        title: "Bluetooth, AirDrop : le risque oublié",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-mdm-byod",
        title: "MDM ou BYOD : choisir intelligemment",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "05-pegasus-stalkerware",
        title: "Pegasus, stalkerware : signes et défense",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "06-charging-juice-jacking",
        title: "Le piège de la borne de recharge USB",
        durationMinutes: 5,
        difficulty: "easy",
      },
    ],
  },
  {
    slug: "wifi-reseaux",
    title: "Wi-Fi & connexions douteuses",
    description:
      "Hôtel, café, train, salon pro : ne jamais faire confiance à un réseau inconnu.",
    coverEmoji: "📶",
    order: 9,
    audience: "tous",
    episodes: [
      {
        slug: "01-evil-twin",
        title: "L'Evil Twin du salon professionnel",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-captive-portal",
        title: "Les portails captifs piégés",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-partage-connexion",
        title: "Le partage de connexion mobile (la solution)",
        durationMinutes: 4,
        difficulty: "easy",
      },
      {
        slug: "04-vpn-grand-public",
        title: "Les VPN grand public : utiles ou pas ?",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-hotel-conference",
        title: "Wi-Fi d'hôtel et de conférence",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "06-rogue-ap",
        title: "Le rogue access point dans l'open space",
        durationMinutes: 7,
        difficulty: "hard",
      },
    ],
  },
  {
    slug: "stockage-cloud",
    title: "USB, cloud & stockage de données",
    description:
      "Dropbox, Drive, OneDrive, clés USB : où stocker quoi et comment.",
    coverEmoji: "☁️",
    order: 10,
    audience: "tous",
    episodes: [
      {
        slug: "01-cle-usb-trouvee",
        title: "La clé USB trouvée sur le parking",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-shadow-it",
        title: "Shadow IT : le Drive perso pour bosser",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-partage-public",
        title: "Le lien Google Drive public oublié",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-chiffrer-fichiers",
        title: "Chiffrer un fichier sensible (3 méthodes)",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-dropbox-paradox",
        title: "Dropbox vs OneDrive vs Drive : règles d'usage",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-recyclage-materiel",
        title: "Recycler un PC ou un disque sans fuite",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },

  // --- Tendances 2026 (saisons 11-15) ---
  {
    slug: "ia-generative",
    title: "IA générative au bureau",
    description: "ChatGPT, Copilot, Mistral, Gemini : utiliser sans fuiter.",
    coverEmoji: "🤖",
    order: 11,
    audience: "tous",
    episodes: [
      {
        slug: "01-ce-que-vous-tapez",
        title: "Ce que vous tapez dans ChatGPT n'est pas privé",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "02-fuite-samsung",
        title: "Cas réel : la fuite de code chez Samsung",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-prompt-injection",
        title: "Le prompt injection en clair",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-charte-ia",
        title: "Construire une charte IA pour votre équipe",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-mistral-souverain",
        title: "Choisir une IA souveraine : Mistral, Voxia",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-deepfake-detection",
        title: "Détecter un texte/image généré par IA",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "deepfakes",
    title: "Deepfakes vocaux & vidéo",
    description:
      "La voix de votre dirigeant clonée en 3 secondes d'audio. Cas Arup, WPP, Ferrari.",
    coverEmoji: "🎭",
    order: 12,
    audience: "tous",
    episodes: [
      {
        slug: "01-clonage-voix",
        title: "Comment on clone une voix en 3 secondes",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-cas-arup",
        title: "Cas réel : 25 M$ chez Arup par deepfake visio",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "03-mots-secrets",
        title: "Le mot-secret qui sauve des millions",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-detection-visio",
        title: "Repérer un deepfake en visio",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-faux-candidat",
        title: "Le faux candidat à l'embauche par visio",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-protocole-validation",
        title: "Le protocole de re-validation par canal alternatif",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "email-pro",
    title: "Bonnes pratiques email pro",
    description:
      "Listes de diffusion, pièces jointes, signatures : maîtriser le canal n°1 de l'attaque.",
    coverEmoji: "✉️",
    order: 13,
    audience: "tous",
    episodes: [
      {
        slug: "01-cci-cco",
        title: "Cc, Cci, Cco : ne plus jamais se tromper",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-pieces-jointes",
        title: "Pièces jointes : avant d'ouvrir, 3 questions",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-signature-electronique",
        title: "Signature électronique vs simple PDF signé",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-envoi-mauvais-destinataire",
        title: "Envoyé au mauvais destinataire : que faire",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-reply-all-piege",
        title: "Le piège du Reply-All",
        durationMinutes: 4,
        difficulty: "easy",
      },
      {
        slug: "06-spf-dkim-dmarc",
        title: "SPF, DKIM, DMARC : ce que doit savoir un dirigeant",
        durationMinutes: 8,
        difficulty: "hard",
      },
    ],
  },
  {
    slug: "crise-cyber",
    title: "Gestion de crise cyber",
    description:
      "Les 60 premières minutes, qui prévenir, comment rédiger une notification.",
    coverEmoji: "🚨",
    order: 14,
    audience: "managers",
    episodes: [
      {
        slug: "01-detection",
        title: "Détecter qu'on est attaqué (signaux faibles)",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-cellule-crise",
        title: "Monter une cellule de crise en 30 min",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "03-confinement",
        title: "Confinement immédiat sans perdre les preuves",
        durationMinutes: 7,
        difficulty: "hard",
      },
      {
        slug: "04-cnil-72h",
        title: "Notification CNIL 72h : le mode d'emploi",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-communication",
        title: "Communiquer à ses clients sans paniquer",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-rex",
        title: "Le retour d'expérience qui évite la récidive",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "supply-chain",
    title: "Supply chain & prestataires",
    description:
      "L'attaque par votre fournisseur : SolarWinds, Kaseya, MOVEit.",
    coverEmoji: "🔗",
    order: 15,
    audience: "managers",
    episodes: [
      {
        slug: "01-comprendre-supply",
        title: "Comprendre une attaque supply chain",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-solarwinds",
        title: "Cas réel : SolarWinds et 18 000 victimes",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "03-evaluer-prestataire",
        title: "Évaluer la cyber d'un prestataire en 30 min",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-clauses-contrats",
        title: "Les 5 clauses cyber à mettre dans tout contrat",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-acces-vpn-presta",
        title: "Donner un accès VPN à un prestataire en sécurité",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-sortie-presta",
        title: "Le offboarding d'un prestataire : ne rien oublier",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },

  // --- Hygiène organisationnelle (saisons 16-20) ---
  {
    slug: "sauvegardes",
    title: "Sauvegardes & restauration",
    description:
      "La règle 3-2-1, tester ses sauvegardes, ne pas se faire chiffrer ses backups.",
    coverEmoji: "💾",
    order: 16,
    audience: "tous",
    episodes: [
      {
        slug: "01-regle-3-2-1",
        title: "La règle 3-2-1 expliquée simplement",
        durationMinutes: 6,
        difficulty: "easy",
      },
      {
        slug: "02-tester-restauration",
        title: "Tester une restauration (la vérité brutale)",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-immutable-backup",
        title: "Les sauvegardes immuables anti-ransomware",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-cloud-backup",
        title: "Sauvegarde dans le cloud : choisir son fournisseur FR",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-rto-rpo",
        title: "RTO et RPO : les 2 chiffres à fixer avant tout",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-erreur-humaine",
        title: "Restaurer après une erreur humaine (file deletion)",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "acces-physiques",
    title: "Accès physiques & cartes",
    description:
      "Tailgating, badges, locaux, salle serveur : la cyber commence à la porte.",
    coverEmoji: "🚪",
    order: 17,
    audience: "tous",
    episodes: [
      {
        slug: "01-tailgating",
        title: "Le tailgating à l'entrée des bureaux",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-badge-perdu",
        title: "Mon badge a été perdu",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "03-faux-technicien",
        title: "Le faux technicien climatisation",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-bureau-vide",
        title: "Le bureau vide : 5 minutes, 1 fuite",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "05-poubelle-papier",
        title: "La benne à papier : trésor pour attaquant",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-salle-serveur",
        title: "Qui peut entrer dans la salle serveur ?",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "visios-meetings",
    title: "Réunions, visios & écoutes",
    description:
      "Zoom, Teams, salons publics : ne pas exposer ses secrets en réunion.",
    coverEmoji: "🎙️",
    order: 18,
    audience: "tous",
    episodes: [
      {
        slug: "01-zoom-bombing",
        title: "Le Zoom bombing en réunion strategique",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "02-train-confidentiel",
        title: "La conversation confidentielle dans le train",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "03-fond-ecran",
        title: "Ce que votre fond d'écran révèle en visio",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-enregistrement-illicite",
        title: "Quelqu'un m'enregistre à mon insu",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-partage-ecran",
        title: "Le partage d'écran qui leak un mot de passe",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-coffee-shop",
        title: "Travailler en coffee-shop : posture et acoustique",
        durationMinutes: 5,
        difficulty: "easy",
      },
    ],
  },
  {
    slug: "nis2-pme",
    title: "NIS2 & conformité PME",
    description:
      "Comprendre si vous êtes concerné, ce qu'on vous demande, comment se mettre en règle.",
    coverEmoji: "📋",
    order: 19,
    audience: "managers",
    episodes: [
      {
        slug: "01-suis-je-concerne",
        title: "Suis-je concerné par NIS2 ?",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "02-article-21",
        title: "Article 21 : les 10 mesures à mettre en oeuvre",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "03-article-23",
        title: "Article 23 : la notification d'incident",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-sanctions",
        title: "Les sanctions NIS2 : ce que vous risquez vraiment",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-roadmap-mise-en-conformite",
        title: "Construire une roadmap de mise en conformité 90j",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "06-audit-csirt",
        title: "Que se passe-t-il si le CSIRT vous audite ?",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "cyber-dirigeants",
    title: "Cyber pour dirigeants",
    description: "La cyber vue du COMEX : risque, ROI, assurance, gouvernance.",
    coverEmoji: "👑",
    order: 20,
    audience: "managers",
    episodes: [
      {
        slug: "01-cyber-comex",
        title: "Présenter la cyber à son COMEX",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "02-roi-cyber",
        title: "Calculer le ROI d'une démarche cyber",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-assurance-cyber",
        title: "L'assurance cyber : ce qu'elle couvre vraiment",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-rssi-temps-partage",
        title: "Recruter un RSSI à temps partagé pour PME",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-gouvernance",
        title: "Construire une gouvernance cyber légère",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-rapport-conseil",
        title: "Rapporter au conseil : structure et indicateurs",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },

  // --- Spécialisations métier (saisons 21-25) ---
  {
    slug: "cyber-rh",
    title: "Cyber pour les RH",
    description:
      "Recrutement, paie, données salariés, on/offboarding sans fuite.",
    coverEmoji: "👥",
    order: 21,
    audience: "rh",
    episodes: [
      {
        slug: "01-onboarding-cyber",
        title: "Construire un onboarding cyber qui tient la route",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "02-offboarding",
        title: "Le offboarding sans laisser d'accès oublié",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-fuite-paie",
        title: "Quand le fichier paie part en fuite",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-faux-cv",
        title: "Le faux CV piégé en pièce jointe",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-donnees-candidats",
        title: "Données candidats : combien de temps les garder ?",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-comite-entreprise",
        title: "Cyber et CSE : ce qu'il faut transmettre",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "cyber-compta",
    title: "Cyber pour la comptabilité & finance",
    description:
      "Factures piégées, virements, faux fournisseurs, rapprochements.",
    coverEmoji: "💰",
    order: 22,
    audience: "compta",
    episodes: [
      {
        slug: "01-facture-piegee",
        title: "La facture PDF piégée",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "02-faux-fournisseur",
        title: "Le faux fournisseur qui change de RIB",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-double-validation-virement",
        title: "La double validation de virement (vraie ou faux semblant)",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "04-rapprochement-bancaire",
        title: "Rapprochement bancaire : repérer une fraude",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "05-clos-mensuel",
        title: "Clôture mensuelle : les pièges classiques",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-erp-securite",
        title: "Sécuriser son ERP / logiciel comptable",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "cyber-dev",
    title: "Cyber pour les développeurs",
    description: "Secrets, dépendances, OWASP top 10, code review, CI/CD.",
    coverEmoji: "👨‍💻",
    order: 23,
    audience: "dev",
    episodes: [
      {
        slug: "01-secrets-en-clair",
        title: "Le secret commit dans Git par accident",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "02-dependances",
        title: "Dépendances : npm audit, Renovate, supply chain",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "03-injection",
        title: "Les 3 injections que tout dev doit reconnaître",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-csrf-xss",
        title: "CSRF et XSS expliquées clairement",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "05-code-review-secu",
        title: "La code review orientée sécurité",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "06-cicd-secrets",
        title: "Secrets en CI/CD : GitHub Actions, GitLab",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "cyber-collaboration",
    title: "Outils de collaboration : Slack, Teams, Notion",
    description:
      "Les fuites du quotidien dans les outils de chat et de docs partagés.",
    coverEmoji: "💬",
    order: 24,
    audience: "tous",
    episodes: [
      {
        slug: "01-slack-public",
        title: "Le canal public Slack qui leak un client",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "02-teams-invites",
        title: "Inviter un externe dans Teams sans tout exposer",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "03-notion-public",
        title: "La page Notion publique trouvée par Google",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "04-bots-integrations",
        title: "Les bots et intégrations : qui lit quoi",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-historique-message",
        title: "Tout reste : penser à l'historique de chat",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "06-quitter-prestataire",
        title: "Le prestataire qui part : couper les accès chat",
        durationMinutes: 6,
        difficulty: "medium",
      },
    ],
  },
  {
    slug: "vie-privee-bureau",
    title: "Vie privée & données perso au bureau",
    description:
      "Mélanger pro et perso, ce qu'on a le droit de stocker, droit à la déconnexion.",
    coverEmoji: "🛡️",
    order: 25,
    audience: "tous",
    episodes: [
      {
        slug: "01-mail-perso-pro",
        title: "Le mail perso sur le poste pro",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "02-photos-perso",
        title: "Les photos perso sur le drive de l'entreprise",
        durationMinutes: 5,
        difficulty: "easy",
      },
      {
        slug: "03-droit-deconnexion",
        title: "Le droit à la déconnexion en pratique",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "04-monitoring-employes",
        title: "Ce que l'employeur a le droit de surveiller",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-parents-cyber",
        title: "Vos enfants tombent dans une arnaque : que faire",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-deces-numerique",
        title: "Préparer son décès numérique pour ses proches",
        durationMinutes: 7,
        difficulty: "medium",
      },
    ],
  },
  // --- Saison dediee DPO (audience specialisee) ---
  {
    slug: "dpo-quotidien",
    title: "Le quotidien du DPO",
    description:
      "AIPD, contrôle CNIL, transferts hors UE, profilage. Pour les DPO qui veulent passer du textuel à l'opérationnel.",
    coverEmoji: "🛡",
    order: 26,
    audience: "dpo",
    episodes: [
      {
        slug: "01-aipd",
        title: "Mener une AIPD sans s'y noyer",
        durationMinutes: 8,
        difficulty: "medium",
      },
      {
        slug: "02-controle-cnil",
        title: "Le contrôle CNIL sonne à la porte",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "03-transferts-hors-ue",
        title: "Transferts de données hors UE - TIA, BCR, DPF",
        durationMinutes: 8,
        difficulty: "hard",
      },
      {
        slug: "04-profilage-decision-auto",
        title: "Profilage et décisions automatisées (article 22)",
        durationMinutes: 7,
        difficulty: "medium",
      },
      {
        slug: "05-base-legale",
        title: "Choisir la bonne base légale (article 6)",
        durationMinutes: 6,
        difficulty: "medium",
      },
      {
        slug: "06-mutualisation-pme",
        title: "Le DPO mutualisé en PME : organiser sa pratique",
        durationMinutes: 6,
        difficulty: "easy",
      },
    ],
  },
];

/**
 * Vérification d'intégrité du catalogue (anti-doublons + comptage).
 * Appelé en début de seed pour fail-fast.
 */
export function validateCatalog(): {
  totalSaisons: number;
  totalEpisodes: number;
} {
  const saisonSlugs = new Set<string>();
  let totalEpisodes = 0;
  for (const s of CATALOG_SAISONS) {
    if (saisonSlugs.has(s.slug)) {
      throw new Error(`Doublon de saison : ${s.slug}`);
    }
    saisonSlugs.add(s.slug);
    const episodeSlugs = new Set<string>();
    for (const e of s.episodes) {
      if (episodeSlugs.has(e.slug)) {
        throw new Error(`Doublon d'épisode dans ${s.slug} : ${e.slug}`);
      }
      episodeSlugs.add(e.slug);
      totalEpisodes++;
    }
  }
  return { totalSaisons: CATALOG_SAISONS.length, totalEpisodes };
}
