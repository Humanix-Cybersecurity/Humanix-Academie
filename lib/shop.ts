// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue de la boutique Hex
// Seed-data : la BDD est peuplée depuis ce catalogue.
// Pour ajouter un item : ajouter ici + relancer `npm run db:seed`

export type ShopItemSeed = {
  slug: string;
  name: string;
  emoji: string;
  category: "HAT" | "GLASSES" | "ACCESSORY" | "BACKGROUND";
  price: number;
  minLevel: number;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  /**
   * SAISONNALITE (mai 2026) : si seasonalWindow est defini, l'item
   * n'est dispo que dans cette fenetre annuelle (ex. Halloween =
   * 15 octobre - 5 novembre). Le seed convertit ces deux entiers en
   * DateTime relatifs a l'annee courante.
   *
   * Format : { fromMonth (1-12), fromDay (1-31), toMonth, toDay }
   * Si toMonth < fromMonth, on accepte l'overflow d'annee (ex.
   * 22 dec -> 7 jan).
   */
  seasonalWindow?: {
    fromMonth: number;
    fromDay: number;
    toMonth: number;
    toDay: number;
  };
};

export const SHOP_CATALOG: ShopItemSeed[] = [
  // CHAPEAUX
  {
    slug: "graduation-cap",
    name: "Chapeau de diplômé",
    emoji: "🎓",
    category: "HAT",
    price: 50,
    minLevel: 1,
    description: "Pour les renards studieux.",
    rarity: "common",
  },
  {
    slug: "wizard-hat",
    name: "Chapeau de magicien",
    emoji: "🎩",
    category: "HAT",
    price: 120,
    minLevel: 2,
    description: "Style classique, élégant.",
    rarity: "common",
  },
  {
    slug: "helmet-cyber",
    name: "Casque cyber",
    emoji: "🪖",
    category: "HAT",
    price: 90,
    minLevel: 1,
    description: "Prêt au combat numérique.",
    rarity: "common",
  },
  {
    slug: "santa-hat",
    name: "Bonnet de Noël",
    emoji: "🎅",
    category: "HAT",
    price: 60,
    minLevel: 1,
    description: "Édition spéciale fin d'année — disponible 22 déc → 7 jan.",
    rarity: "rare",
    seasonalWindow: { fromMonth: 12, fromDay: 22, toMonth: 1, toDay: 7 },
  },
  {
    slug: "pumpkin-hat",
    name: "Citrouille d'Halloween",
    emoji: "🎃",
    category: "HAT",
    price: 80,
    minLevel: 1,
    description: "Édition Cybermois — disponible 15 oct → 5 nov.",
    rarity: "rare",
    seasonalWindow: { fromMonth: 10, fromDay: 15, toMonth: 11, toDay: 5 },
  },
  {
    slug: "ghost-accessory",
    name: "Petit fantôme",
    emoji: "👻",
    category: "ACCESSORY",
    price: 100,
    minLevel: 2,
    description: "Compagnon discret pour le Cybermois.",
    rarity: "epic",
    seasonalWindow: { fromMonth: 10, fromDay: 15, toMonth: 11, toDay: 5 },
  },
  {
    slug: "summer-palm",
    name: "Décor plage",
    emoji: "🌴",
    category: "BACKGROUND",
    price: 70,
    minLevel: 1,
    description: "Vibes d'été — disponible 1er juillet → 31 août.",
    rarity: "rare",
    seasonalWindow: { fromMonth: 7, fromDay: 1, toMonth: 8, toDay: 31 },
  },
  {
    slug: "key-password-day",
    name: "Clé numérique",
    emoji: "🔐",
    category: "ACCESSORY",
    price: 50,
    minLevel: 1,
    description: "Édition World Password Day — disponible 1-7 mai.",
    rarity: "rare",
    seasonalWindow: { fromMonth: 5, fromDay: 1, toMonth: 5, toDay: 7 },
  },
  {
    slug: "crown-gold",
    name: "Couronne d'or",
    emoji: "👑",
    category: "HAT",
    price: 350,
    minLevel: 3,
    description: "Pour les leaders cyber.",
    rarity: "epic",
  },

  // LUNETTES
  {
    slug: "shades",
    name: "Lunettes noires",
    emoji: "🕶️",
    category: "GLASSES",
    price: 70,
    minLevel: 1,
    description: "Mode incognito.",
    rarity: "common",
  },
  {
    slug: "geek-glasses",
    name: "Lunettes de geek",
    emoji: "👓",
    category: "GLASSES",
    price: 50,
    minLevel: 1,
    description: "Vision tech ultra-claire.",
    rarity: "common",
  },
  {
    slug: "vr-goggles",
    name: "Lunettes VR",
    emoji: "🥽",
    category: "GLASSES",
    price: 150,
    minLevel: 2,
    description: "Immersion totale.",
    rarity: "rare",
  },

  // ACCESSOIRES
  {
    slug: "shield",
    name: "Bouclier de protection",
    emoji: "🛡️",
    category: "ACCESSORY",
    price: 130,
    minLevel: 2,
    description: "Premier rempart cyber.",
    rarity: "common",
  },
  {
    slug: "sword",
    name: "Épée du cyber-guerrier",
    emoji: "⚔️",
    category: "ACCESSORY",
    price: 220,
    minLevel: 3,
    description: "Pour traquer les attaquants.",
    rarity: "rare",
  },
  {
    slug: "medal",
    name: "Médaille du mérite",
    emoji: "🎖️",
    category: "ACCESSORY",
    price: 300,
    minLevel: 3,
    description: "Reconnaissance officielle.",
    rarity: "rare",
  },
  {
    slug: "diamond",
    name: "Diamant de prestige",
    emoji: "💎",
    category: "ACCESSORY",
    price: 600,
    // Refonte 10 niveaux (mai 2026) : L4 ancien = top-2, devient L7 (Veilleur)
    // pour rester du haut de gamme dans la nouvelle echelle.
    minLevel: 7,
    description: "Le summum du raffinement cyber.",
    rarity: "legendary",
  },
  {
    slug: "trophy",
    name: "Trophée légendaire",
    emoji: "🏆",
    category: "ACCESSORY",
    price: 800,
    // Refonte 10 niveaux : L5 ancien = endgame, devient L10 (Maitre).
    // Le texte "Reserve aux Maitres" colle pile au nouveau L10.
    minLevel: 10,
    description: "Réservé aux Maîtres Cyber.",
    rarity: "legendary",
  },

  // BACKGROUNDS
  {
    slug: "bg-aurora",
    name: "Aurore",
    emoji: "🌅",
    category: "BACKGROUND",
    price: 110,
    minLevel: 1,
    description: "Lever de soleil paisible.",
    rarity: "common",
  },
  {
    slug: "bg-space",
    name: "Espace",
    emoji: "🌌",
    category: "BACKGROUND",
    price: 180,
    minLevel: 2,
    description: "Vol galactique.",
    rarity: "rare",
  },
  {
    slug: "bg-ocean",
    name: "Océan",
    emoji: "🌊",
    category: "BACKGROUND",
    price: 140,
    minLevel: 1,
    description: "Profondeurs marines.",
    rarity: "common",
  },
  {
    slug: "bg-sakura",
    name: "Sakura",
    emoji: "🌸",
    category: "BACKGROUND",
    price: 260,
    minLevel: 2,
    description: "Cerisier au printemps.",
    rarity: "epic",
  },
  {
    slug: "bg-cyber",
    name: "Cyberpunk",
    emoji: "🌃",
    category: "BACKGROUND",
    price: 320,
    minLevel: 3,
    description: "Néons et hackers.",
    rarity: "epic",
  },

  // ============================================================================
  // EXTENSION REFONTE GAMIFICATION (mai 2026)
  // ============================================================================
  // 21 nouveaux items pour etoffer la boutique sur l'echelle 10 niveaux.
  // Prix progressifs : items endgame (L10) montent jusqu'a 6000 coins pour
  // donner un objectif d'epargne aux Maitres. Les items mid-tier (L4-L7)
  // remplissent le trou entre common (L1-L2) et legendary (L10).

  // ----- CHAPEAUX ADDITIONNELS (6) -----
  {
    slug: "pirate-hat",
    name: "Bandana de pirate",
    emoji: "🏴‍☠️",
    category: "HAT",
    price: 180,
    minLevel: 3,
    description: "Pour les chasseurs de menaces.",
    rarity: "rare",
  },
  {
    slug: "detective-hat",
    name: "Chapeau de detective",
    emoji: "🕵️",
    category: "HAT",
    price: 200,
    minLevel: 4,
    description: "Pour pister les indicateurs de compromission.",
    rarity: "rare",
  },
  {
    slug: "top-hat",
    name: "Haut-de-forme",
    emoji: "🎩",
    category: "HAT",
    price: 300,
    minLevel: 5,
    description: "Classe et autorite, version Gardien.",
    rarity: "epic",
  },
  {
    slug: "cyber-crown",
    name: "Couronne neon",
    emoji: "🤴",
    category: "HAT",
    price: 500,
    minLevel: 7,
    description: "Pour les Veilleurs qui voient l'invisible.",
    rarity: "epic",
  },
  {
    slug: "master-hat",
    name: "Couronne de Champion",
    emoji: "👑",
    category: "HAT",
    price: 1200,
    minLevel: 9,
    description: "Reservee aux Champions L9.",
    rarity: "legendary",
  },
  {
    slug: "crown-titanium",
    name: "Couronne titane Maitre",
    emoji: "🏵️",
    category: "HAT",
    price: 6000,
    minLevel: 10,
    description: "Endgame ultime. La couronne legendaire du Maitre L10.",
    rarity: "legendary",
  },

  // ----- LUNETTES ADDITIONNELLES (3) -----
  {
    slug: "monocle",
    name: "Monocle de gentleman",
    emoji: "🧐",
    category: "GLASSES",
    price: 100,
    minLevel: 2,
    description: "L'observation, premier reflexe cyber.",
    rarity: "common",
  },
  {
    slug: "3d-glasses",
    name: "Lunettes 3D retro",
    emoji: "👓",
    category: "GLASSES",
    price: 130,
    minLevel: 3,
    description: "Pour voir le monde en relief... et les fakes.",
    rarity: "rare",
  },
  {
    slug: "laser-goggles",
    name: "Lunettes laser",
    emoji: "🥽",
    category: "GLASSES",
    price: 400,
    minLevel: 6,
    description: "Detection tactique, niveau Sentinelle.",
    rarity: "epic",
  },

  // ----- ACCESSOIRES ADDITIONNELS (6) -----
  {
    slug: "backpack",
    name: "Sac a dos d'apprenti",
    emoji: "🎒",
    category: "ACCESSORY",
    price: 110,
    minLevel: 2,
    description: "Toujours pret pour la prochaine saison.",
    rarity: "common",
  },
  {
    slug: "magnifier",
    name: "Loupe d'enqueteur",
    emoji: "🔎",
    category: "ACCESSORY",
    price: 150,
    minLevel: 3,
    description: "Pour scruter chaque URL avant de cliquer.",
    rarity: "rare",
  },
  {
    slug: "cape",
    name: "Cape de heros",
    emoji: "🦸",
    category: "ACCESSORY",
    price: 400,
    minLevel: 5,
    description: "Le costume du Gardien.",
    rarity: "epic",
  },
  {
    slug: "amulet",
    name: "Amulette mystique",
    emoji: "🧿",
    category: "ACCESSORY",
    price: 700,
    minLevel: 7,
    description: "Protection mystique contre les zero-days.",
    rarity: "epic",
  },
  {
    slug: "legendary-medallion",
    name: "Medaillon legendaire",
    emoji: "🏵️",
    category: "ACCESSORY",
    price: 1500,
    minLevel: 8,
    description: "Octroyé aux Experts qui ont tout vu.",
    rarity: "legendary",
  },
  {
    slug: "aura-master",
    name: "Aura du Maitre",
    emoji: "💠",
    category: "ACCESSORY",
    price: 5000,
    minLevel: 10,
    description: "Endgame. L'aura visible des Maitres L10. Tres tres cher.",
    rarity: "legendary",
  },

  // ----- BACKGROUNDS ADDITIONNELS (6) -----
  {
    slug: "bg-forest",
    name: "Foret enchantee",
    emoji: "🌲",
    category: "BACKGROUND",
    price: 90,
    minLevel: 1,
    description: "Sous-bois mysterieux.",
    rarity: "common",
  },
  {
    slug: "bg-mountain",
    name: "Sommets enneiges",
    emoji: "🏔️",
    category: "BACKGROUND",
    price: 160,
    minLevel: 2,
    description: "Air pur, vision degagee.",
    rarity: "common",
  },
  {
    slug: "bg-neon",
    name: "Arcade neon",
    emoji: "🎮",
    category: "BACKGROUND",
    price: 280,
    minLevel: 4,
    description: "Atmosphere retrowave.",
    rarity: "rare",
  },
  {
    slug: "bg-castle",
    name: "Chateau cyber-medieval",
    emoji: "🏰",
    category: "BACKGROUND",
    price: 450,
    minLevel: 6,
    description: "La forteresse du Sentinelle.",
    rarity: "epic",
  },
  {
    slug: "bg-galaxy-supreme",
    name: "Galaxie supreme",
    emoji: "✨",
    category: "BACKGROUND",
    price: 1200,
    minLevel: 9,
    description: "Au-dela des etoiles.",
    rarity: "legendary",
  },
  {
    slug: "bg-cosmic-master",
    name: "Cosmos du Maitre",
    emoji: "🌌",
    category: "BACKGROUND",
    price: 5000,
    minLevel: 10,
    description: "Endgame. Le cosmos qui s'incline devant le Maitre L10.",
    rarity: "legendary",
  },
];

// Mapping background slug → tailwind gradient classes pour le rendu mascot
export const BACKGROUND_GRADIENTS: Record<string, string> = {
  "bg-aurora": "from-orange-200 via-pink-200 to-amber-200",
  "bg-space": "from-purple-700 via-indigo-700 to-blue-900",
  "bg-ocean": "from-cyan-200 via-blue-300 to-blue-500",
  "bg-sakura": "from-pink-100 via-rose-200 to-pink-300",
  "bg-cyber": "from-fuchsia-500 via-violet-600 to-cyan-500",
  // Refonte mai 2026 — 6 nouveaux fonds couvrant low/mid/endgame.
  "bg-forest": "from-green-200 via-emerald-300 to-teal-400",
  "bg-mountain": "from-slate-200 via-blue-200 to-indigo-300",
  "bg-neon": "from-pink-500 via-purple-500 to-indigo-500",
  "bg-castle": "from-stone-400 via-slate-500 to-zinc-700",
  "bg-galaxy-supreme":
    "from-violet-600 via-fuchsia-600 via-purple-700 to-indigo-900",
  // Endgame L10 : 4 stops + animation-gradient via class custom CSS
  "bg-cosmic-master":
    "from-purple-900 via-pink-600 via-amber-500 to-cyan-400",
};

export const RARITY_STYLE: Record<
  string,
  { ring: string; bg: string; label: string }
> = {
  common: { ring: "ring-gray-300", bg: "bg-gray-50", label: "Commun" },
  rare: { ring: "ring-cyan-400", bg: "bg-cyan-50", label: "Rare" },
  epic: { ring: "ring-purple-400", bg: "bg-purple-50", label: "Épique" },
  legendary: {
    ring: "ring-amber-400",
    bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
    label: "Légendaire",
  },
};

export const CATEGORY_LABEL: Record<string, { label: string; emoji: string }> =
  {
    HAT: { label: "Chapeaux", emoji: "🎩" },
    GLASSES: { label: "Lunettes", emoji: "🕶️" },
    ACCESSORY: { label: "Accessoires", emoji: "🛡️" },
    BACKGROUND: { label: "Décors", emoji: "🌌" },
  };

// Helpers pour recuperer les items equipes d'un user
export type EquippedItems = {
  hat?: string; // emoji
  glasses?: string; // emoji
  accessory?: string; // emoji
  background?: string; // gradient string
};

export function buildEquippedFromInventory(
  inventory: {
    item: { emoji: string; category: string; slug: string };
    isEquipped: boolean;
  }[],
): EquippedItems {
  const result: EquippedItems = {};
  for (const inv of inventory.filter((i) => i.isEquipped)) {
    if (inv.item.category === "HAT") result.hat = inv.item.emoji;
    if (inv.item.category === "GLASSES") result.glasses = inv.item.emoji;
    if (inv.item.category === "ACCESSORY") result.accessory = inv.item.emoji;
    if (inv.item.category === "BACKGROUND")
      result.background = BACKGROUND_GRADIENTS[inv.item.slug];
  }
  return result;
}
