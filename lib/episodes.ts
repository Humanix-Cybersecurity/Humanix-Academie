// SPDX-License-Identifier: AGPL-3.0-or-later
// Loader des episodes : MDX dans /content/saisons/*
// Le frontmatter decrit le scenario, les choix, le debrief, le quiz.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Choice = {
  id: string;
  label: string;
  outcome: "good" | "bad" | "neutral";
  feedback: string;
  points: number;
};

export type QuizQuestion = {
  question: string;
  choices: { id: string; label: string; correct: boolean }[];
  explanation: string;
};

export type EpisodeContent = {
  saisonSlug: string;
  episodeSlug: string;
  meta: {
    title: string;
    durationMinutes: number;
    persona: string;
    objective: string;
    scenario: string;
    choices: Choice[];
    debrief: string;
    quiz: QuizQuestion[];
    xpReward: number;
  };
  body: string; // contenu MDX additionnel
};

// =============================================================================
// Open Core : 2 sources de contenu possibles, dans cet ordre de priorite :
//   1. content/saisons/        catalogue commercial complet (repo prive,
//                              monte en submodule ou copie au deploy en prod).
//                              Disponible UNIQUEMENT chez les operateurs sous
//                              contrat avec Humanix Cybersecurity, ou chez
//                              les forks qui ont developpe leur propre contenu.
//   2. content/saisons-demo/   2 saisons CC BY-SA generiques, livrees dans le
//                              repo public AGPL. Permettent a un fork OSS pur
//                              d'avoir une plateforme fonctionnelle out-of-the-box.
//
// Le code resout dynamiquement la source : si content/saisons/ contient au
// moins une saison, on l'utilise. Sinon, on bascule sur content/saisons-demo/.
// Aucune variable d'env requise — auto-detection par presence de contenu.
//
// Mode DEMO (DEMO_MODE=true) : on force content/saisons-demo/ meme si le
// catalog commercial est present sur le disque (symlink content-pro/).
// La demo publique doit refleter l'experience OSS pure et ne PAS exposer
// le contenu premium en MDX brut via l'URL /apprendre/<saison>/<episode>.
//
// Cf. docs/OPEN_CORE.md pour l'architecture detaillee.
// =============================================================================
const CONTENT_ROOT_PRO = path.join(process.cwd(), "content", "saisons");
const CONTENT_ROOT_DEMO = path.join(process.cwd(), "content", "saisons-demo");
const IS_DEMO_MODE = process.env.DEMO_MODE === "true";

/**
 * Resout le repertoire racine du contenu MDX. Privilegie le catalogue
 * commercial si present, sinon retombe sur les saisons demo OSS.
 *
 * En mode DEMO, on force le fallback sur saisons-demo meme si le
 * catalog commercial est present (cf. en-tete de fichier).
 *
 * @returns le path absolu du dossier de contenu actif, ou null si aucun
 *   contenu n'est disponible (cas erreur d'installation).
 */
function resolveContentRoot(): string | null {
  // En mode DEMO, on saute directement au fallback OSS.
  if (IS_DEMO_MODE) {
    if (fs.existsSync(CONTENT_ROOT_DEMO)) return CONTENT_ROOT_DEMO;
    return null;
  }
  // 1. Catalogue commercial complet : on verifie qu'il existe ET contient
  //    au moins une saison (sous-dossier). Un dossier vide = on bascule
  //    sur la demo (cas d'un submodule pas encore initialise).
  if (fs.existsSync(CONTENT_ROOT_PRO)) {
    const entries = fs
      .readdirSync(CONTENT_ROOT_PRO, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    if (entries.length > 0) return CONTENT_ROOT_PRO;
  }
  // 2. Fallback Open Core : saisons demo CC BY-SA.
  if (fs.existsSync(CONTENT_ROOT_DEMO)) return CONTENT_ROOT_DEMO;
  // 3. Aucun contenu : l'app retourne des listes vides. La UI degrade
  //    gracieusement (cf. components/learner/LearnerEmptyState.tsx).
  return null;
}

export function listSaisons(): string[] {
  const root = resolveContentRoot();
  if (!root) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function listEpisodes(saisonSlug: string): string[] {
  const root = resolveContentRoot();
  if (!root) return [];
  const dir = path.join(root, saisonSlug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
}

export function loadEpisode(
  saisonSlug: string,
  episodeSlug: string,
): EpisodeContent | null {
  const root = resolveContentRoot();
  if (!root) return null;
  const file = path.join(root, saisonSlug, `${episodeSlug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return {
    saisonSlug,
    episodeSlug,
    meta: data as EpisodeContent["meta"],
    body: content,
  };
}
