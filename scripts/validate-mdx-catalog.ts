#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// Valide la coherence entre prisma/catalog-saisons.ts et content/saisons/*.mdx.
//
// POURQUOI : avant la session du 4 mai 2026, 7 fichiers MDX rediges par des
// experts ne se chargeaient JAMAIS car leur slug ne matchait pas le catalog
// (ex: "02-le-faux-rib.mdx" vs slug catalog "02-faux-rib"). Le code retombait
// silencieusement sur buildFallbackContent. Cette regression vaut une demo
// rate devant des prospects.
//
// Ce script attrape ce genre de bug en CI :
//   - ERROR si un fichier MDX a un slug qui ne correspond a aucun episode catalog
//     (orphelin : du contenu redige qui ne sera jamais lu)
//   - WARN  si un episode catalog n'a pas de MDX (juste fallback generique,
//     pas grave mais bon a savoir)
//
// Le mode --strict transforme les WARN en ERROR (pour un cron audit interne).
// Sans --strict, seuls les orphelins font echouer la CI.
//
// Usage :
//   npm run validate:mdx           → CI mode (orphelins = error)
//   npm run validate:mdx -- --strict → tout mismatch = error

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "prisma", "catalog-saisons.ts");
const CONTENT_ROOT = path.join(ROOT, "content", "saisons");

const isStrict = process.argv.includes("--strict");

type CatalogEntry = { saisonSlug: string; episodeSlug: string };

function extractCatalogEntries(): CatalogEntry[] {
  // Le catalog est du TS qu'on parse a la regex : pas envie de tirer ts-morph
  // pour un script de CI. On match les blocs "slug:" + on identifie la saison
  // courante via le dernier "slug:" de niveau saison.
  // Approche pragmatique : on lit la structure attendue (saisons -> episodes)
  // en se basant sur l'imbrication des accolades.
  const src = fs.readFileSync(CATALOG, "utf-8");
  const entries: CatalogEntry[] = [];

  // Strategie simple : un saison est definie par "slug: \"X\",\n    title: \"...\""
  // suivi plus tard de "episodes: [" puis des "slug: \"YY-...\"".
  // On parcourt sequentiellement et on track la saison "active".

  const slugRe = /slug:\s*"([a-z0-9][a-z0-9-]*)"/g;
  const episodesStartRe = /episodes:\s*\[/g;

  // On obtient toutes les positions des slugs et des "episodes: [".
  type Marker = { type: "slug" | "episodesStart"; pos: number; slug?: string };
  const markers: Marker[] = [];

  for (const m of src.matchAll(slugRe)) {
    markers.push({ type: "slug", pos: m.index!, slug: m[1] });
  }
  for (const m of src.matchAll(episodesStartRe)) {
    markers.push({ type: "episodesStart", pos: m.index! });
  }
  markers.sort((a, b) => a.pos - b.pos);

  // Etat machine : "outsideEpisodes" → un slug = saison ; "insideEpisodes"
  // → un slug = episode (associe a la saison la plus recente).
  let currentSaison: string | null = null;
  let inEpisodes = false;
  // Pour fermer le bloc episodes, on cherche le ']' apparie au '[' d'episodes:
  // approximation : on quitte les episodes quand on rencontre un nouveau slug
  // qui ressemble a un slug de saison (kebab-case sans prefixe numerique
  // "01-", "02-"...). C'est suffisant en pratique car les slugs d'episode
  // commencent toujours par "[0-9]+-".
  const episodePrefixRe = /^[0-9]+-/;

  for (const mk of markers) {
    if (mk.type === "slug") {
      const s = mk.slug!;
      if (inEpisodes && !episodePrefixRe.test(s)) {
        // Probablement la saison suivante : on quitte les episodes courants.
        inEpisodes = false;
        currentSaison = s;
      } else if (inEpisodes) {
        if (currentSaison) {
          entries.push({ saisonSlug: currentSaison, episodeSlug: s });
        }
      } else {
        currentSaison = s;
      }
    } else if (mk.type === "episodesStart") {
      inEpisodes = true;
    }
  }

  return entries;
}

// Dossiers a IGNORER dans content/saisons/ : ces sous-dossiers contiennent
// du MDX qui ne suit pas la convention "catalogue Saison/Episode" et est
// charge par d'autres loaders dedies. Les y inclure produirait des
// faux-positifs "orphelins" alors que le contenu est tres bien charge.
const IGNORED_SUBDIRS = new Set([
  "enquetes", // Mode Enqueteur — loader lib/investigations/loader.ts
]);

function listMdxFiles(): CatalogEntry[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  const out: CatalogEntry[] = [];
  for (const saison of fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!saison.isDirectory()) continue;
    if (IGNORED_SUBDIRS.has(saison.name)) continue;
    const dir = path.join(CONTENT_ROOT, saison.name);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".mdx")) continue;
      out.push({
        saisonSlug: saison.name,
        episodeSlug: f.replace(/\.mdx$/, ""),
      });
    }
  }
  return out;
}

function main(): void {
  const catalog = extractCatalogEntries();
  const mdx = listMdxFiles();

  const catalogSet = new Set(
    catalog.map((e) => `${e.saisonSlug}/${e.episodeSlug}`),
  );
  const mdxSet = new Set(mdx.map((e) => `${e.saisonSlug}/${e.episodeSlug}`));

  // Orphelins : MDX qui n'a aucun episode catalog correspondant.
  const orphans = mdx.filter(
    (e) => !catalogSet.has(`${e.saisonSlug}/${e.episodeSlug}`),
  );

  // Episodes sans MDX : catalog declare mais pas de MDX (fallback generique).
  const missingMdx = catalog.filter(
    (e) => !mdxSet.has(`${e.saisonSlug}/${e.episodeSlug}`),
  );

  console.log(`Catalogue : ${catalog.length} episodes declares`);
  console.log(`MDX       : ${mdx.length} fichiers rediges`);
  console.log(`Couverture : ${mdx.length - orphans.length}/${catalog.length} (${Math.round(((mdx.length - orphans.length) / Math.max(1, catalog.length)) * 100)} %)`);
  console.log("");

  if (orphans.length > 0) {
    console.error(`✗ ${orphans.length} fichier(s) MDX orphelin(s) (slug ne matche pas le catalog) :`);
    for (const o of orphans) {
      console.error(`  - content/saisons/${o.saisonSlug}/${o.episodeSlug}.mdx`);
    }
    console.error("");
    console.error("→ Ce contenu redige n'est jamais charge. Renomme le fichier");
    console.error("  pour matcher un slug de prisma/catalog-saisons.ts, ou ajoute");
    console.error("  l'episode au catalog.");
    process.exit(1);
  }

  if (missingMdx.length > 0) {
    const lvl = isStrict ? "✗" : "⚠";
    console.log(`${lvl} ${missingMdx.length} episode(s) catalog sans MDX (fallback generique) :`);
    for (const m of missingMdx.slice(0, 10)) {
      console.log(`  - ${m.saisonSlug}/${m.episodeSlug}`);
    }
    if (missingMdx.length > 10) {
      console.log(`  ... et ${missingMdx.length - 10} autre(s)`);
    }
    console.log("");
    if (isStrict) {
      console.error("→ Mode strict : tout episode declare doit avoir un MDX.");
      process.exit(1);
    }
    console.log("→ Pas bloquant : le fallback generique de buildFallbackContent");
    console.log("  prend le relais. Ajoute --strict pour un audit complet.");
  }

  console.log("✓ Aucun MDX orphelin detecte.");
}

main();
