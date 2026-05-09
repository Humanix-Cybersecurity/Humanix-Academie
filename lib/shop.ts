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
    minLevel: 4,
    description: "Le summum du raffinement cyber.",
    rarity: "legendary",
  },
  {
    slug: "trophy",
    name: "Trophée légendaire",
    emoji: "🏆",
    category: "ACCESSORY",
    price: 800,
    minLevel: 5,
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
];

// Mapping background slug → tailwind gradient classes pour le rendu mascot
export const BACKGROUND_GRADIENTS: Record<string, string> = {
  "bg-aurora": "from-orange-200 via-pink-200 to-amber-200",
  "bg-space": "from-purple-700 via-indigo-700 to-blue-900",
  "bg-ocean": "from-cyan-200 via-blue-300 to-blue-500",
  "bg-sakura": "from-pink-100 via-rose-200 to-pink-300",
  "bg-cyber": "from-fuchsia-500 via-violet-600 to-cyan-500",
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
