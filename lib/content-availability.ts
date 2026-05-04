// Determine si un episode du catalogue dispose d'un contenu MDX redige
// (par opposition au fallback generique de buildFallbackContent).
//
// Sert a afficher un badge "Expert" sur la liste des episodes :
// celui qui a un MDX a un scenario detaille rediger par un expert.
// Les autres restent jouables via le fallback structure (cf.
// app/apprendre/[saison]/[episode]/page.tsx).
import fs from "node:fs";
import path from "node:path";

const CONTENT_ROOT = path.join(process.cwd(), "content", "saisons");

export function hasExpertContent(
  saisonSlug: string,
  episodeSlug: string,
): boolean {
  if (!isSafeSlug(saisonSlug) || !isSafeSlug(episodeSlug)) return false;
  const file = path.join(CONTENT_ROOT, saisonSlug, `${episodeSlug}.mdx`);
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

export function listExpertEpisodes(): Array<{
  saisonSlug: string;
  episodeSlug: string;
}> {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  const result: Array<{ saisonSlug: string; episodeSlug: string }> = [];
  for (const saison of fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!saison.isDirectory()) continue;
    const dir = path.join(CONTENT_ROOT, saison.name);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".mdx")) continue;
      result.push({
        saisonSlug: saison.name,
        episodeSlug: f.replace(/\.mdx$/, ""),
      });
    }
  }
  return result.sort((a, b) =>
    a.saisonSlug === b.saisonSlug
      ? a.episodeSlug.localeCompare(b.episodeSlug)
      : a.saisonSlug.localeCompare(b.saisonSlug),
  );
}

export function countExpertEpisodes(): number {
  return listExpertEpisodes().length;
}

// Le slug catalogue est de la forme [a-z0-9-]+. On rejette tout ce qui
// pourrait sortir du repertoire (path traversal) ou casser fs.statSync.
function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}
