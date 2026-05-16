// SPDX-License-Identifier: AGPL-3.0-or-later
// Loader des enquetes (Mode Enqueteur) depuis le filesystem MDX.
//
// Resolution :
//   1. `content-pro/content/enquetes/` : enquetes premium si le submodule
//      est present (mode self-host Enterprise / Cloud SaaS)
//   2. `content/enquetes-demo/` : 3 enquetes gratuites OSS (toujours
//      presentes dans le repo public)
//
// Les deux sont combinees : sur une instance avec content-pro, on a
// les 3 gratuites + les payantes (~12+). En fork OSS pur, seules les 3
// gratuites sont disponibles.
//
// Mode DEMO (DEMO_MODE=true) : on ignore content-pro meme si le
// submodule est present sur le disque. La demo publique doit refleter
// l'experience OSS pure (3 enquetes gratuites uniquement), pour ne pas
// induire les visiteurs en erreur et proteger le contenu commercial.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  InvestigationFrontmatterSchema,
  type Investigation,
} from "./types";

const CONTENT_DEMO = path.resolve(process.cwd(), "content/enquetes-demo");
const CONTENT_PRO = path.resolve(
  process.cwd(),
  "content-pro/content/enquetes",
);

/**
 * En mode DEMO, on bypass content-pro meme si le submodule est present.
 * La demo publique doit refleter l'experience OSS pure (3 enquetes
 * gratuites uniquement).
 */
const IS_DEMO_MODE = process.env.DEMO_MODE === "true";

/**
 * Lit, parse, valide un fichier MDX d'enquete. Retourne null en cas
 * d'erreur de validation (logge un warning, mais ne plante pas le serveur).
 *
 * On accepte un parseur tolerant : un fichier mal forme dans content/
 * NE doit PAS faire 500 sur la page liste. Il est juste exclu.
 */
function parseFile(filePath: string): Investigation | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const parsed = InvestigationFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      console.warn(
        `[investigations] ${path.basename(filePath)} invalid frontmatter: ${issues}`,
      );
      return null;
    }
    const slug = path.basename(filePath, ".mdx");
    return {
      ...parsed.data,
      slug,
      sourcePath: path.relative(process.cwd(), filePath),
    };
  } catch (err) {
    console.warn(
      `[investigations] failed to read ${path.basename(filePath)}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function listMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".mdx"))
      .map((d) => path.join(dir, d.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Liste TOUTES les enquetes disponibles (free OSS + paid si content-pro).
 * Ordonnees par difficulte croissante puis alphabetique.
 *
 * Mise en cache module-level : on lit le filesystem 1 fois par process.
 * En dev, redemarrer Next.js pour rafraichir. En prod, c'est correct
 * car le contenu est immutable au boot du container.
 */
let cache: Investigation[] | null = null;
export function listInvestigations(): Investigation[] {
  if (cache) return cache;
  const files = [
    ...listMdxFiles(CONTENT_DEMO),
    ...(IS_DEMO_MODE ? [] : listMdxFiles(CONTENT_PRO)),
  ];
  const investigations = files
    .map(parseFile)
    .filter((x): x is Investigation => x !== null)
    .sort((a, b) => {
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return a.slug.localeCompare(b.slug);
    });
  cache = investigations;
  return investigations;
}

/**
 * Retourne une enquete par slug, ou null si introuvable / mal formee.
 */
export function getInvestigationBySlug(slug: string): Investigation | null {
  return listInvestigations().find((i) => i.slug === slug) ?? null;
}

/**
 * Helpers de filtre pour la page liste.
 */
export function listFreeInvestigations(): Investigation[] {
  return listInvestigations().filter((i) => i.isFree);
}

export function listPaidInvestigations(): Investigation[] {
  return listInvestigations().filter((i) => !i.isFree);
}

/**
 * Reset cache : utile pour les tests (vi.mock + recharger).
 * Ne JAMAIS appeler en runtime, sauf si on veut re-lire le filesystem.
 */
export function __resetCache(): void {
  cache = null;
}
