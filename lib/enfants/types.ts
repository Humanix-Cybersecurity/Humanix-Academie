// SPDX-License-Identifier: AGPL-3.0-or-later
//
// « L'école de Hex » - espace enfants (9-12 ans) de la partie gratuite Famille.
//
// PRINCIPE : public, AUCUN compte, AUCUNE donnée collectée (enfants = mineurs,
// posture RGPD stricte). Tout tourne côté navigateur. La progression (étoiles)
// est gardée en localStorage, jamais en base.
//
// Le contenu est un petit moteur typé : un « monde » enchaîne des « activités »
// de 4 types (BD, repère-le-piège, tri, quiz). On ajoute un monde/activité en
// éditant lib/enfants/parcours.ts - pas de MDX, pas de schéma Prisma.

/** Une case de BD : un grand emoji + (option) narration et bulle de dialogue. */
export type BDPanel = {
  /** Grand emoji-illustration de la case (ex: "🦊", "🎁💻"). */
  emoji: string;
  /** Narration courte au-dessus (1 phrase max). */
  texte?: string;
  /** Réplique dans une bulle. */
  bulle?: string;
  /** Qui parle (couleur/position de la bulle). */
  qui?: "hex" | "enfant" | "piege" | "narrateur";
};

/** Choix simple proposé pendant/à la fin d'une activité. */
export type Choix = {
  id: string;
  label: string;
  emoji?: string;
  /** true = bonne réponse. */
  bon: boolean;
  /** Réaction de Hex après le choix (1 phrase joyeuse, jamais culpabilisante). */
  reaction: string;
};

/** BD interactive : quelques cases, un choix, une morale. */
export type ActiviteBD = {
  type: "bd";
  id: string;
  titre: string;
  panels: BDPanel[];
  question?: { consigne: string; options: Choix[] };
  /** La chute / le réflexe à retenir, 1 phrase. */
  morale: string;
};

/** Repère le piège : un écran, des éléments à toucher. Gagné quand tous les
 *  pièges (et eux seuls) sont trouvés. */
export type ActiviteRepere = {
  type: "repere";
  id: string;
  titre: string;
  consigne: string;
  /** Titre de l'écran simulé (ex: "Tu reçois ce message…"). */
  ecran: string;
  elements: {
    id: string;
    emoji: string;
    texte: string;
    /** true = élément suspect à repérer. */
    piege: boolean;
    reaction: string;
  }[];
};

/** Tri rapide : un paquet de cartes à classer en 2 catégories (gauche/droite). */
export type ActiviteTri = {
  type: "tri";
  id: string;
  titre: string;
  consigne: string;
  gauche: { label: string; emoji: string };
  droite: { label: string; emoji: string };
  cartes: {
    id: string;
    emoji: string;
    label: string;
    bon: "gauche" | "droite";
    reaction: string;
  }[];
};

/** Quiz illustré : une image, une question, 2-3 grosses réponses. */
export type ActiviteQuiz = {
  type: "quiz";
  id: string;
  titre: string;
  emoji: string;
  question: string;
  options: Choix[];
};

/** Jeu des paires : relier chaque carte de gauche à sa carte de droite
 *  (ex: un danger et le bon réflexe). Gagné quand tout est relié. */
export type ActivitePaires = {
  type: "paires";
  id: string;
  titre: string;
  consigne: string;
  paires: {
    id: string;
    gauche: { emoji: string; label: string };
    droite: { emoji: string; label: string };
  }[];
};

export type Activite =
  | ActiviteBD
  | ActiviteRepere
  | ActiviteTri
  | ActiviteQuiz
  | ActivitePaires;

/** Un « monde » = un parcours thématique enchaînant des activités. */
export type Monde = {
  slug: string;
  titre: string;
  sousTitre: string;
  emoji: string;
  /** Clé de palette Tailwind utilisée pour la couleur du monde. */
  couleur:
    | "sky"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "cyan"
    | "orange"
    | "lime"
    | "teal"
    | "indigo"
    | "fuchsia"
    | "blue"
    | "red"
    | "pink"
    | "yellow";
  /** false = carte « bientôt » non jouable (teaser sur le hub). */
  disponible: boolean;
  activites: Activite[];
};
