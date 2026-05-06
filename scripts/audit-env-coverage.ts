#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// Audit que toutes les variables d'environnement utilisees par le code
// sont documentees dans .env.example.
//
// Pourquoi : avant le launch OSS publique, on veut zero "trou de doc"
// qui pousserait un dev a hardcoder un secret par flemme. Un .env.example
// exhaustif est une garantie pre-launch.
//
// Usage : npm run audit:env (ajouter dans package.json) ou tsx scripts/audit-env-coverage.ts
// Exit 1 si une var utilisee n'est pas documentee.
//
// Whitelist : les variables HUMANIX_* sont uniquement consommees par les
// connecteurs tiers (cf. connectors/mcp-server/), pas par l'app principale.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.example");

// Variables consommees par des sous-projets autonomes (connectors/, etc.)
// ou par des outils dev (license-tool), donc volontairement absentes du
// .env.example racine.
const WHITELIST = new Set([
  "HUMANIX_API_KEY",
  "HUMANIX_BASE_URL",
  "HUMANIX_LICENSE_PRIVATE_KEY_FILE", // outil dev licensing:* uniquement
  "NODE_ENV", // Standard Node, jamais a documenter
  "VERCEL", // Plateforme runtime
  "VERCEL_URL",
]);

// Dossiers a scanner pour trouver process.env.X
const SCAN_DIRS = ["app", "lib", "components", "scripts", "prisma", "middleware.ts"];

function findUsedEnvVars(): Set<string> {
  const used = new Set<string>();
  const re = /process\.env\.([A-Z][A-Z0-9_]+)/g;

  for (const target of SCAN_DIRS) {
    const fullPath = path.join(ROOT, target);
    if (!fs.existsSync(fullPath)) continue;
    if (fs.statSync(fullPath).isFile()) {
      scanFile(fullPath, re, used);
    } else {
      walk(fullPath, (file) => scanFile(file, re, used));
    }
  }
  return used;
}

function walk(dir: string, cb: (file: string) => void) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, cb);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      cb(full);
    }
  }
}

function scanFile(file: string, re: RegExp, sink: Set<string>) {
  const content = fs.readFileSync(file, "utf-8");
  for (const m of content.matchAll(re)) {
    sink.add(m[1]!);
  }
}

function findDocumentedEnvVars(): Set<string> {
  const documented = new Set<string>();
  const content = fs.readFileSync(ENV_FILE, "utf-8");
  // Une ligne "FOO=" ou "FOO=" en debut de ligne, eventuellement avec espaces
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z][A-Z0-9_]+)\s*=/);
    if (m) documented.add(m[1]!);
  }
  return documented;
}

function main() {
  const used = findUsedEnvVars();
  const documented = findDocumentedEnvVars();

  const missing = [...used]
    .filter((v) => !documented.has(v) && !WHITELIST.has(v))
    .sort();

  console.log(`Variables utilisees : ${used.size}`);
  console.log(`Variables documentees : ${documented.size}`);
  console.log(`Whitelist : ${WHITELIST.size}`);

  if (missing.length === 0) {
    console.log("✓ Couverture .env.example complete.");
    process.exit(0);
  }

  console.error("\n✗ Variables utilisees non documentees dans .env.example :");
  for (const v of missing) {
    console.error(`  - ${v}`);
  }
  console.error(
    "\nAjoute-les dans .env.example avec une valeur par defaut + commentaire,",
  );
  console.error(
    "OU ajoute-les a la WHITELIST de scripts/audit-env-coverage.ts si elles",
  );
  console.error("sont consommees par un sous-projet autonome.");
  process.exit(1);
}

main();
