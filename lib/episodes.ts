// SPDX-License-Identifier: AGPL-3.0-or-later
// Loader des episodes : MDX dans /content/saisons/* et /content/saisons-demo/*
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
// Open Core : 2 sources de contenu, consultees dans cet ordre de priorite :
//   1. content/saisons/        catalogue commercial complet (repo prive,
//                              monte en submodule ou copie au deploy en prod).
//                              Disponible UNIQUEMENT chez les operateurs sous
//                              contrat avec Humanix Cybersecurity, ou chez
//                              les forks qui ont developpe leur propre contenu.
//   2. content/saisons-demo/   5 saisons CC BY-SA generiques, livrees dans le
//                              repo public AGPL. Permettent a un fork OSS pur
//                              d'avoir une plateforme fonctionnelle out-of-the-box.
//
// Le chargeur cherche CHAQUE MODULE dans le catalogue commercial puis, s'il
// n'y est pas, dans les saisons de demo. Aucune variable d'env requise :
// une racine absente ou vide est simplement sautee (fork OSS pur, submodule
// pas encore initialise).
//
// POURQUOI MODULE PAR MODULE, ET PLUS UNE RACINE POUR TOUTE L'INSTANCE
//
//   Le chargeur choisissait UNE racine : le catalogue commercial des qu'il
//   contenait une saison, la demo sinon. Or une base peut porter les saisons
//   de demo A COTE du catalogue commercial : le semis est additif, il ne
//   retire jamais une saison (cf. lib/catalog-seeder.ts). C'est le cas de la
//   production depuis juin 2026, et de toute instance semee avant l'arrivee
//   de son contenu.
//
//   Constate le 2026-11-20 : ces 5 saisons y sont publiees, donc proposees
//   sur /apprendre, et le produit y renvoie lui-meme (remediation phishing :
//   lib/phishing/repeat-offenders.ts ; exposition : lib/exposure/). Leurs
//   MDX etaient dans l'image, mais jamais lus : les 28 modules s'affichaient
//   en contenu generique (lib/episodes-fallback.ts), les memes trois choix
//   partout, sous un bandeau qui annonce un texte redige pour "bientot".
//
// Mode DEMO (DEMO_MODE=true) : on ne lit QUE content/saisons-demo/, meme si
// le catalog commercial est present sur le disque (symlink content-pro/).
// La demo publique doit refleter l'experience OSS pure et ne PAS exposer
// le contenu premium en MDX brut via l'URL /apprendre/<saison>/<episode>.
//
// Cf. docs/OPEN_CORE.md pour l'architecture detaillee.
// =============================================================================

// Evalues a chaque appel, et non a l'import : les tests deplacent le
// repertoire courant et changent DEMO_MODE (meme choix que
// lib/content-availability.ts).
function commercialRoot(): string {
  return path.join(process.cwd(), "content", "saisons");
}

function demoRoot(): string {
  return path.join(process.cwd(), "content", "saisons-demo");
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

function isDirectory(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Un slug designe UN dossier ou UN fichier, jamais un chemin. Les slugs
 * viennent de la base (saisons du catalogue, saisons propres a un espace)
 * ou d'une URL : on refuse tout ce qui ferait sortir de la racine de contenu.
 */
function isPathSegment(slug: string): boolean {
  if (slug === "" || slug === "." || slug === "..") return false;
  return !["/", "\\", "\0"].some((forbidden) => slug.includes(forbidden));
}

/**
 * Racines de contenu a consulter, par ordre de priorite.
 *
 *   - mode DEMO : les saisons de demo, et elles seules ;
 *   - sinon : le catalogue commercial, puis les saisons de demo pour ce
 *     qu'il ne contient pas.
 *
 * @returns les dossiers qui existent ; liste vide si aucun contenu n'est
 *   installe. L'app retourne alors des listes vides et l'UI degrade
 *   gracieusement (cf. components/learner/LearnerEmptyState.tsx).
 */
function resolveContentRoots(): string[] {
  const candidates = isDemoMode()
    ? [demoRoot()]
    : [commercialRoot(), demoRoot()];
  return candidates.filter(isDirectory);
}

/**
 * Chemin du MDX d'un module, dans la premiere racine qui le contient.
 */
function findEpisodeFile(
  saisonSlug: string,
  episodeSlug: string,
): string | null {
  if (!isPathSegment(saisonSlug) || !isPathSegment(episodeSlug)) return null;
  for (const root of resolveContentRoots()) {
    const file = path.join(root, saisonSlug, `${episodeSlug}.mdx`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/**
 * Saisons qui ont un dossier de contenu, toutes racines actives confondues.
 */
export function listSaisons(): string[] {
  const slugs = new Set<string>();
  for (const root of resolveContentRoots()) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) slugs.add(entry.name);
    }
  }
  return [...slugs];
}

/**
 * Modules d'une saison qui ont un MDX, c'est-a-dire ceux que loadEpisode()
 * sert rediges. Les autres modules de la saison s'affichent en contenu
 * generique.
 */
export function listEpisodes(saisonSlug: string): string[] {
  if (!isPathSegment(saisonSlug)) return [];
  const slugs = new Set<string>();
  for (const root of resolveContentRoots()) {
    const dir = path.join(root, saisonSlug);
    if (!isDirectory(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".mdx")) slugs.add(file.replace(/\.mdx$/, ""));
    }
  }
  return [...slugs].sort();
}

export function loadEpisode(
  saisonSlug: string,
  episodeSlug: string,
): EpisodeContent | null {
  const file = findEpisodeFile(saisonSlug, episodeSlug);
  if (!file) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  // Le frontmatter MDX est de qualite variable : certains episodes n'ont pas
  // de `debrief`, `choices` ou `quiz`. On garantit ici une forme stable pour
  // que les consommateurs (page episode, shuffle, EpisodePlayer, TTSButton)
  // ne manipulent jamais d'undefined -> evite les 500 SSR (ex. cleanForTTS).
  const meta = (data ?? {}) as EpisodeContent["meta"];
  return {
    saisonSlug,
    episodeSlug,
    meta: {
      ...meta,
      debrief: meta.debrief ?? "",
      choices: meta.choices ?? [],
      quiz: meta.quiz ?? [],
    },
    body: content,
  };
}
