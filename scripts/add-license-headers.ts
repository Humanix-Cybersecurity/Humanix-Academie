#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// Ajoute un header SPDX-License-Identifier AGPL-3.0-or-later sur les fichiers
// source de l'app principale (Humanix Academie Community Edition).
//
// Approche moderne (FSF + Linux kernel) : on utilise SPDX au lieu d'un long
// boilerplate copyright en haut de chaque fichier. C'est :
//   - lisible par les outils (license-checker, FOSSology, REUSE compliance)
//   - 1 ligne au lieu de 14
//   - reconnu par GitHub pour l'affichage de licence
//
// Exclus volontairement :
//   - connectors/* (sous-projets MIT, ont leur propre LICENSE)
//   - outlook-addin/* (sous-projet MIT)
//   - node_modules/, .next/, coverage/
//   - next-env.d.ts (genere par Next, modifie a chaque build)
//   - fichiers qui ont deja un header SPDX
//
// Usage : tsx scripts/add-license-headers.ts [--dry-run] [--check]
//   --dry-run : affiche ce qui serait fait sans modifier
//   --check   : exit 1 si des fichiers manquent un header (utile en CI)

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HEADER = "// SPDX-License-Identifier: AGPL-3.0-or-later";

// Glob "include" : tout sous ces dossiers est candidat.
const INCLUDE_DIRS = ["app", "lib", "components", "scripts", "prisma"];
// Fichiers seules au niveau racine.
const INCLUDE_FILES = ["middleware.ts"];

// Glob "exclude" : meme si dans INCLUDE, on skippe.
const EXCLUDE_PATTERNS = [
  /node_modules\//,
  /\.next\//,
  /coverage\//,
  /next-env\.d\.ts$/,
  // Les sous-projets autonomes ont leur propre licence.
  /^connectors\//,
  /^outlook-addin\//,
];

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isCheck = args.includes("--check");

type Stats = {
  scanned: number;
  alreadyOk: number;
  added: number;
  skipped: number;
  missing: string[];
};

function shouldProcess(file: string): boolean {
  if (!/\.(ts|tsx)$/.test(file)) return false;
  const rel = path.relative(ROOT, file);
  for (const re of EXCLUDE_PATTERNS) {
    if (re.test(rel)) return false;
  }
  return true;
}

function hasHeader(content: string): boolean {
  // On accepte SPDX dans les 5 premieres lignes (apres shebang ou commentaire d'intro).
  const head = content.split("\n", 5).join("\n");
  return /SPDX-License-Identifier:/.test(head);
}

function addHeader(content: string): string {
  // Si le fichier commence par un shebang, on insere apres.
  if (content.startsWith("#!")) {
    const nl = content.indexOf("\n");
    if (nl === -1) return content + "\n" + HEADER + "\n";
    return content.slice(0, nl + 1) + HEADER + "\n" + content.slice(nl + 1);
  }
  // Si le fichier commence par "use client" ou "use server", on insere apres.
  const directiveMatch = content.match(/^(["']use (?:client|server)["'];?\s*\n)/);
  if (directiveMatch) {
    const offset = directiveMatch[0].length;
    return content.slice(0, offset) + HEADER + "\n" + content.slice(offset);
  }
  // Sinon en tete de fichier.
  return HEADER + "\n" + content;
}

function walk(dir: string, cb: (file: string) => void) {
  if (!fs.existsSync(dir)) return;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    cb(dir);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function main(): void {
  const stats: Stats = {
    scanned: 0,
    alreadyOk: 0,
    added: 0,
    skipped: 0,
    missing: [],
  };

  const targets = [...INCLUDE_DIRS, ...INCLUDE_FILES].map((p) =>
    path.join(ROOT, p),
  );

  for (const target of targets) {
    walk(target, (file) => {
      if (!shouldProcess(file)) {
        stats.skipped += 1;
        return;
      }
      stats.scanned += 1;
      const content = fs.readFileSync(file, "utf-8");
      if (hasHeader(content)) {
        stats.alreadyOk += 1;
        return;
      }
      const rel = path.relative(ROOT, file);
      stats.missing.push(rel);
      if (isCheck) return;
      const updated = addHeader(content);
      if (isDryRun) {
        console.log(`[dry-run] would add header → ${rel}`);
      } else {
        fs.writeFileSync(file, updated, "utf-8");
        console.log(`✓ ${rel}`);
      }
      stats.added += 1;
    });
  }

  console.log("");
  console.log(`Scanned   : ${stats.scanned}`);
  console.log(`Already OK: ${stats.alreadyOk}`);
  console.log(`Added     : ${stats.added}${isDryRun ? " (dry-run)" : ""}`);
  console.log(`Skipped   : ${stats.skipped}`);

  if (isCheck && stats.missing.length > 0) {
    console.error(`\n✗ ${stats.missing.length} fichier(s) sans header SPDX :`);
    for (const f of stats.missing) console.error(`  - ${f}`);
    console.error(
      "\nRegenere avec : npm run license:headers (ou tsx scripts/add-license-headers.ts)",
    );
    process.exit(1);
  }
  if (isCheck) {
    console.log("✓ Tous les fichiers source ont un header SPDX.");
  }
}

main();
