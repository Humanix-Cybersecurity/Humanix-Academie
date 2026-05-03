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

const CONTENT_ROOT = path.join(process.cwd(), "content", "saisons");

export function listSaisons(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function listEpisodes(saisonSlug: string): string[] {
  const dir = path.join(CONTENT_ROOT, saisonSlug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
}

export function loadEpisode(saisonSlug: string, episodeSlug: string): EpisodeContent | null {
  const file = path.join(CONTENT_ROOT, saisonSlug, `${episodeSlug}.mdx`);
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
