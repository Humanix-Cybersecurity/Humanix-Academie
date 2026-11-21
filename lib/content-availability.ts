// SPDX-License-Identifier: AGPL-3.0-or-later
// Determine si un episode du catalogue COMMERCIAL dispose d'un contenu MDX
// redige (par opposition au fallback generique de buildFallbackContent).
//
// Sert a la note de transparence de /comparatif, qui parle du catalogue
// commercial quel que soit le mode de l'instance : on ne lit donc ici que
// content/saisons.
//
// Le compteur "Expert" des cartes de /apprendre, lui, ne passe plus par ce
// fichier : il interroge le chargeur (listEpisodes de lib/episodes.ts), qui
// sait ce que le lecteur servira reellement, saisons de demo comprises.
import fs from "node:fs";
import path from "node:path";

// Lazy : process.cwd() est appele a chaque invocation pour permettre aux
// tests de mocker le cwd via vi.spyOn(process, "cwd").
function contentRoot(): string {
  return path.join(process.cwd(), "content", "saisons");
}

/**
 * Sous-dossiers de content/saisons qui ne sont PAS des saisons.
 *
 * content/saisons est un lien vers content-pro/content, qui porte aussi le
 * dossier des enquetes (Mode Enqueteur, charge par
 * lib/investigations/loader.ts). Ses MDX ne sont pas des modules du
 * catalogue. Les compter gonflait la note de transparence de /comparatif :
 * jusqu'au 2026-11-20 elle annoncait "503 episodes" rediges pour un
 * catalogue de 476 modules, soit les 476 modules et les 27 enquetes.
 *
 * UNE SEULE LISTE : scripts/validate-mdx-catalog.ts lit la meme. Un nouveau
 * dossier hors saisons doit y entrer pour que le validateur ne prenne pas
 * ses MDX pour des orphelins ; le compteur le saute alors du meme coup.
 */
export const NON_SAISON_SUBDIRS: ReadonlySet<string> = new Set([
  "enquetes", // Mode Enqueteur - loader lib/investigations/loader.ts
]);

export function hasExpertContent(
  saisonSlug: string,
  episodeSlug: string,
): boolean {
  if (!isSafeSlug(saisonSlug) || !isSafeSlug(episodeSlug)) return false;
  if (NON_SAISON_SUBDIRS.has(saisonSlug)) return false;
  const file = path.join(contentRoot(), saisonSlug, `${episodeSlug}.mdx`);
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
  const root = contentRoot();
  if (!fs.existsSync(root)) return [];
  const result: Array<{ saisonSlug: string; episodeSlug: string }> = [];
  for (const saison of fs.readdirSync(root, { withFileTypes: true })) {
    if (!saison.isDirectory()) continue;
    if (NON_SAISON_SUBDIRS.has(saison.name)) continue;
    const dir = path.join(root, saison.name);
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

/**
 * Nombre de modules du catalogue commercial qui ont un MDX. C'est le chiffre
 * que /comparatif met en face du nombre de modules annonces.
 */
export function countExpertEpisodes(): number {
  return listExpertEpisodes().length;
}

// Le slug catalogue est de la forme [a-z0-9-]+. On rejette tout ce qui
// pourrait sortir du repertoire (path traversal) ou casser fs.statSync.
function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}
