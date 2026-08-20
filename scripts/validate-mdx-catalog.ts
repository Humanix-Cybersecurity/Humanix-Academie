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
import matter from "gray-matter";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "prisma", "catalog-saisons.ts");
// Le catalogue DEMO OSS contient les saisons livrees dans le repo public
// (CC BY-SA 4.0). Une instance commerciale a les deux catalogues fusionnes.
// On valide les MDX contre l'UNION des deux pour eviter les faux orphelins.
const CATALOG_DEMO = path.join(ROOT, "prisma", "catalog-saisons-demo.ts");
// Sources MDX : content/saisons/ (commercial, via submodule content-pro/,
// gitignored cote OSS) + content/saisons-demo/ (OSS public, CC BY-SA).
const CONTENT_ROOTS = [
  path.join(ROOT, "content", "saisons"),
  path.join(ROOT, "content", "saisons-demo"),
];

const isStrict = process.argv.includes("--strict");

type CatalogEntry = { saisonSlug: string; episodeSlug: string };

function parseCatalogFile(filePath: string): CatalogEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, "utf-8");
  return parseCatalogSource(src);
}

function extractCatalogEntries(): CatalogEntry[] {
  // Sources de verite : catalogue COMMERCIAL (via submodule content-pro/) +
  // catalogue DEMO (livre dans le repo public AGPLv3). Une instance complete
  // a les deux fusionnes ; un fork OSS pur a uniquement le demo.
  // On accepte un MDX si son slug matche L'UN ou L'AUTRE des deux.
  const commercialEntries = parseCatalogFile(CATALOG);
  const demoEntries = parseCatalogFile(CATALOG_DEMO);

  if (commercialEntries.length === 0 && demoEntries.length === 0) {
    console.log(
      `ℹ Aucun catalogue trouve (ni ${path.relative(ROOT, CATALOG)}, ni ${path.relative(ROOT, CATALOG_DEMO)}).`,
    );
    console.log("  Skip validation.");
    return [];
  }

  if (commercialEntries.length === 0) {
    console.log(
      `ℹ Catalog commercial absent (${path.relative(ROOT, CATALOG)}). Validation contre demo uniquement.`,
    );
  }
  if (demoEntries.length === 0) {
    console.log(
      `ℹ Catalog demo absent (${path.relative(ROOT, CATALOG_DEMO)}). Validation contre commercial uniquement.`,
    );
  }

  // Union des deux : on deduplique par couple (saison, episode).
  const seen = new Set<string>();
  const merged: CatalogEntry[] = [];
  for (const e of [...commercialEntries, ...demoEntries]) {
    const key = `${e.saisonSlug}/${e.episodeSlug}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(e);
    }
  }
  return merged;
}

function parseCatalogSource(src: string): CatalogEntry[] {
  // Le catalog est du TS qu'on parse a la regex : pas envie de tirer ts-morph
  // pour un script de CI. On match les blocs "slug:" + on identifie la saison
  // courante via le dernier "slug:" de niveau saison.
  // Approche pragmatique : on lit la structure attendue (saisons -> episodes)
  // en se basant sur l'imbrication des accolades.
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
  "enquetes", // Mode Enqueteur - loader lib/investigations/loader.ts
]);

function listMdxFiles(): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const seen = new Set<string>();
  for (const root of CONTENT_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const saison of fs.readdirSync(root, { withFileTypes: true })) {
      if (!saison.isDirectory()) continue;
      if (IGNORED_SUBDIRS.has(saison.name)) continue;
      const dir = path.join(root, saison.name);
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".mdx")) continue;
        const key = `${saison.name}/${f}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          saisonSlug: saison.name,
          episodeSlug: f.replace(/\.mdx$/, ""),
        });
      }
    }
  }
  return out;
}

/**
 * Episodes que le lecteur sert REELLEMENT, et dont le frontmatter est
 * incomplet.
 *
 * POURQUOI ON PASSE PAR loadEpisode ET PAS PAR LE SYSTEME DE FICHIERS
 *
 *   Un MDX peut exister sans jamais etre charge : 19 fichiers de
 *   content/saisons-demo sont dans ce cas, et le generateur de secours sert
 *   un contenu complet a leur place. Les signaler serait une fausse alerte.
 *
 *   Inversement, un episode SANS MDX est parfaitement servi par le secours.
 *   Ce qui casse la production, c'est uniquement le cas intermediaire : un
 *   MDX charge, mais ampute de ce que le lecteur consomme.
 *
 *   On interroge donc le chargeur lui-meme. Le controle teste le vrai chemin.
 */
async function episodesServisIncomplets(): Promise<{
  servis: number;
  incomplets: { cle: string; champs: string[] }[];
}> {
  const { loadEpisode } = await import("../lib/episodes");
  const catalogues = [
    { chemin: CATALOG, racine: ROOT },
    { chemin: CATALOG_DEMO, racine: ROOT },
  ];
  const vus = new Set<string>();
  const incomplets: { cle: string; champs: string[] }[] = [];
  let servis = 0;

  for (const { chemin } of catalogues) {
    if (!fs.existsSync(chemin)) continue;
    for (const e of parseCatalogFile(chemin)) {
      const cle = `${e.saisonSlug}/${e.episodeSlug}`;
      if (vus.has(cle)) continue;
      vus.add(cle);

      let charge: Awaited<ReturnType<typeof loadEpisode>>;
      try {
        charge = await loadEpisode(e.saisonSlug, e.episodeSlug);
      } catch (err) {
        incomplets.push({
          cle,
          champs: [`chargement impossible (${(err as Error).message.slice(0, 60)})`],
        });
        continue;
      }
      // Pas de MDX : le secours prend le relais et fournit un contenu
      // complet. Ce n'est pas un defaut.
      if (!charge) continue;
      servis++;

      const meta = charge.meta as unknown as Record<string, unknown>;
      const champs: string[] = [];
      if (!String(meta.scenario ?? "").trim()) champs.push("scenario");
      if (!Array.isArray(meta.choices) || meta.choices.length < 2) {
        champs.push("choices (>= 2)");
      }
      if (!String(meta.debrief ?? "").trim()) champs.push("debrief");
      // Le piege : un tableau VIDE est present, typé, et casse le lecteur.
      // Il affiche « Question 1 / 0 » puis lit quiz[0], qui n'existe pas.
      if (!Array.isArray(meta.quiz) || meta.quiz.length === 0) {
        champs.push("quiz (>= 1 question)");
      }
      if (champs.length > 0) incomplets.push({ cle, champs });
    }
  }
  return { servis, incomplets };
}

async function main(): Promise<void> {
  const catalog = extractCatalogEntries();

  // Aucun catalogue trouve (ni commercial ni demo) : on a deja affiche le
  // message d'information dans extractCatalogEntries(). On exit sans erreur.
  if (catalog.length === 0) {
    console.log("✓ Aucune validation a effectuer (aucun catalogue dispo).");
    return;
  }

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

  // === Frontmatter incomplet : BLOQUANT ===================================
  //
  // POURQUOI CE CONTROLE EXISTE
  //
  //   Le 2026-08-20, un utilisateur a signale que deux saisons « ne marchaient
  //   pas ». Leurs 12 episodes avaient bien un MDX -- ce script les declarait
  //   donc conformes -- mais aucun n'avait de `debrief` ni de `quiz`.
  //
  //   Le lecteur d'episode passe alors a l'etape quiz avec un tableau vide :
  //   il affiche « Question 1 / 0 » et lit `quiz[0]`, qui n'existe pas.
  //   L'episode devient impossible a terminer, donc la saison entiere est
  //   inutilisable -- et rien ne le signalait avant la mise en production.
  //
  //   Verifier la PRESENCE du fichier ne suffit pas : il faut verifier qu'il
  //   contient ce que le lecteur consomme.
  const { servis: vusServis, incomplets } = await episodesServisIncomplets();

  if (incomplets.length > 0) {
    console.error("");
    console.error(`✗ ${incomplets.length} episode(s) servi(s) au frontmatter incomplet :`);
    for (const i of incomplets.slice(0, 30)) {
      console.error(`  - ${i.cle} : ${i.champs.join(", ")}`);
    }
    if (incomplets.length > 30) {
      console.error(`  ... et ${incomplets.length - 30} autre(s)`);
    }
    console.error("");
    console.error("→ Le lecteur d'episode consomme scenario, choices, debrief");
    console.error("  et quiz. Un episode qui n'a pas les quatre est INUTILISABLE");
    console.error("  en production, meme si son fichier existe.");
    process.exit(1);
  }

  console.log(
    `✓ Frontmatter complet sur les ${vusServis} episode(s) reellement servi(s).`,
  );
}

main();
