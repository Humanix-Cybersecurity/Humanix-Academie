// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue des mascottes disponibles
// Chaque utilisateur peut choisir son animal totem ; le rendu (couleurs,
// niveaux, items boutique) reste identique — seul l'emoji principal change.

export type MascotSpecies = {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  unlockLevel: number; // niveau requis pour debloquer (0 = des le depart)
  isDefault?: boolean;
};

export const MASCOT_SPECIES: MascotSpecies[] = [
  // Disponibles immediatement
  {
    id: "fox",
    emoji: "🦊",
    name: "Hex",
    tagline: "Le renard malin, mascotte historique",
    unlockLevel: 0,
    isDefault: true,
  },
  {
    id: "cat",
    emoji: "🐱",
    name: "Miya",
    tagline: "Le chat curieux",
    unlockLevel: 0,
  },
  {
    id: "dog",
    emoji: "🐶",
    name: "Patou",
    tagline: "Le chien fidèle gardien",
    unlockLevel: 0,
  },
  {
    id: "panda",
    emoji: "🐼",
    name: "Bambou",
    tagline: "Le panda zen et bienveillant",
    unlockLevel: 0,
  },
  {
    id: "owl",
    emoji: "🦉",
    name: "Hibou",
    tagline: "Le sage qui voit dans la nuit",
    unlockLevel: 0,
  },
  {
    id: "frog",
    emoji: "🐸",
    name: "Croak",
    tagline: "La grenouille agile",
    unlockLevel: 0,
  },

  // Debloque niveau 2
  {
    id: "hippo",
    emoji: "🦛",
    name: "Bori",
    tagline: "L'hippopotame robuste",
    unlockLevel: 2,
  },
  {
    id: "wolf",
    emoji: "🐺",
    name: "Lupo",
    tagline: "Le loup en meute",
    unlockLevel: 2,
  },
  {
    id: "monkey",
    emoji: "🐵",
    name: "Bingo",
    tagline: "Le singe astucieux",
    unlockLevel: 2,
  },
  {
    id: "koala",
    emoji: "🐨",
    name: "Eucalyptus",
    tagline: "Le koala tranquille",
    unlockLevel: 2,
  },

  // Debloque niveau 3
  {
    id: "shark",
    emoji: "🦈",
    name: "Squale",
    tagline: "Le requin pour les confirmés",
    unlockLevel: 3,
  },
  {
    id: "snake",
    emoji: "🐍",
    name: "Vipère",
    tagline: "Le serpent stratégique",
    unlockLevel: 3,
  },
  {
    id: "tiger",
    emoji: "🐯",
    name: "Stripe",
    tagline: "Le tigre rayé majestueux",
    unlockLevel: 3,
  },

  // Debloque niveau 4 (rare)
  {
    id: "lion",
    emoji: "🦁",
    name: "Roy",
    tagline: "Le lion roi des cyber-experts",
    unlockLevel: 4,
  },
  {
    id: "dragon",
    emoji: "🐲",
    name: "Smaug",
    tagline: "Le dragon légendaire",
    unlockLevel: 5,
  },
  {
    id: "unicorn",
    emoji: "🦄",
    name: "Hexa",
    tagline: "La licorne, statut mythique",
    unlockLevel: 5,
  },
];

export function getMascotById(id: string): MascotSpecies {
  return MASCOT_SPECIES.find((m) => m.id === id) ?? MASCOT_SPECIES[0];
}

export function getAvailableMascots(level: number): {
  available: MascotSpecies[];
  locked: MascotSpecies[];
} {
  return {
    available: MASCOT_SPECIES.filter((m) => m.unlockLevel <= level),
    locked: MASCOT_SPECIES.filter((m) => m.unlockLevel > level),
  };
}
