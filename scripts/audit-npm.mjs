// SPDX-License-Identifier: AGPL-3.0-or-later
//
// `npm audit` avec acceptations de risque DATEES.
//
// POURQUOI CE SCRIPT
//
//   `npm audit` n'a aucun mecanisme d'exception. Face a un avis sans
//   correctif amont, il ne reste que trois choix : laisser le pipeline
//   rouge, retirer l'audit, ou baisser le seuil. Les trois finissent
//   pareil -- un controle qu'on n'ecoute plus.
//
//   Trivy, lui, sait le faire, et le depot porte deja ses acceptations
//   datees dans `.trivyignore.yaml`. Ce script lit LE MEME FICHIER : une
//   acceptation se decide a un seul endroit, et les deux scanners disent
//   la meme chose.
//
// CE QUI REND L'EXCEPTION SURE
//
//   Elle expire. Passe `expired_at`, ce script echoue MEME SI L'AVIS A
//   DISPARU -- il faut alors venir retirer l'entree a la main. Une
//   acceptation oubliee devient donc bruyante, jamais silencieuse.
//
// Usage : node scripts/audit-npm.mjs [--prefix <dir>] [--omit-dev]

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const prefix = args.includes("--prefix")
  ? args[args.indexOf("--prefix") + 1]
  : null;
const omitDev = args.includes("--omit-dev");

/**
 * Lit les acceptations depuis .trivyignore.yaml.
 *
 * Analyse volontairement minimale, sans dependance : le job planifie
 * n'installe pas node_modules, donc pas de parseur YAML disponible. Le
 * format lu est celui, plat et stable, que nous ecrivons nous-memes.
 */
function lireAcceptations() {
  let brut;
  try {
    brut = readFileSync(
      new URL("../.trivyignore.yaml", import.meta.url),
      "utf8",
    );
  } catch {
    return [];
  }
  const acceptations = [];
  let courante = null;
  for (const ligne of brut.split("\n")) {
    const sansCommentaire = ligne.replace(/\s+#.*$/, "");
    const id = sansCommentaire.match(/^\s*-\s*id:\s*(\S+)/);
    if (id) {
      if (courante) acceptations.push(courante);
      courante = { ids: [id[1]] };
      continue;
    }
    if (!courante) continue;
    const ghsa = sansCommentaire.match(/^\s*ghsa:\s*(\S+)/);
    if (ghsa) courante.ids.push(ghsa[1]);
    const exp = sansCommentaire.match(/^\s*expired_at:\s*(\S+)/);
    if (exp) courante.expire = exp[1];
  }
  if (courante) acceptations.push(courante);
  return acceptations.filter((a) => a.expire);
}

function auditJson() {
  const argv = ["audit", "--json", "--audit-level=high"];
  if (omitDev) argv.push("--omit=dev");
  if (prefix) argv.push("--prefix", prefix);
  try {
    return JSON.parse(
      execFileSync("npm", argv, {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
  } catch (e) {
    // `npm audit` sort en code non nul DES QU'il trouve quelque chose : ce
    // n'est pas une erreur, c'est son resultat. Le JSON est sur stdout.
    if (e.stdout) return JSON.parse(e.stdout);
    throw e;
  }
}

const aujourdhui = new Date().toISOString().slice(0, 10);
const acceptations = lireAcceptations();
const cible = prefix ? `${prefix} ` : "";

// Une acceptation perimee fait echouer, meme si l'avis a disparu. C'est
// tout l'interet : elle force une re-revue au lieu de dormir.
const perimees = acceptations.filter((a) => a.expire < aujourdhui);
if (perimees.length > 0) {
  console.error(
    `\n✗ ${perimees.length} acceptation(s) de risque PERIMEE(S) dans .trivyignore.yaml :\n`,
  );
  for (const a of perimees)
    console.error(`   ${a.ids.join(" / ")}  expiree le ${a.expire}`);
  console.error(
    "\n  Re-examiner puis retirer l'entree, ou reporter la date en le justifiant.\n",
  );
  process.exit(1);
}

const valides = new Set(acceptations.flatMap((a) => a.ids));
const rapport = auditJson();
const vulns = Object.values(rapport.vulnerabilities ?? {}).filter(
  (v) => v.severity === "high" || v.severity === "critical",
);

// `npm audit` signale AUSSI les paquets touches PAR RICOCHET, et leur `via`
// pointe alors par NOM vers le fautif au lieu de porter l'avis :
//
//   deepmerge-ts    via: [ { url: ".../GHSA-ggr8-..." } ]   <- l'avis
//   @prisma/config  via: [ "deepmerge-ts" ]                 <- un renvoi
//   prisma          via: [ "@prisma/config" ]               <- un renvoi
//
// Sans remonter ces renvois, les deux derniers passeraient pour non
// couverts et l'acceptation ne servirait a rien.
const parNom = Object.fromEntries(
  Object.values(rapport.vulnerabilities ?? {}).map((v) => [v.name, v]),
);

function identifiantsDe(vuln, vus = new Set()) {
  if (!vuln || vus.has(vuln.name)) return [];
  vus.add(vuln.name);
  const trouves = [];
  for (const via of vuln.via ?? []) {
    if (typeof via === "string") {
      trouves.push(...identifiantsDe(parNom[via], vus));
    } else {
      trouves.push(
        ...(via.url?.match(/GHSA-[a-z0-9-]+/i) ?? []),
        ...(via.cve ?? []),
      );
    }
  }
  return trouves;
}

const restantes = [];
const acceptees = [];
for (const v of vulns) {
  const identifiants = [...new Set(identifiantsDe(v))];
  // Couverte seulement si TOUS ses avis sont acceptes : un paquet touche par
  // deux avis dont un seul est accepte doit rester bloquant.
  const couverte =
    identifiants.length > 0 && identifiants.every((id) => valides.has(id));
  (couverte ? acceptees : restantes).push({
    nom: v.name,
    severite: v.severity,
    identifiants,
  });
}

for (const a of acceptees) {
  console.log(
    `  ○ ${a.nom} (${a.severite}) — acceptation datee : ${a.identifiants.join(", ")}`,
  );
}

if (restantes.length > 0) {
  console.error(
    `\n✗ ${restantes.length} vulnerabilite(s) ${cible}HIGH/CRITICAL sans acceptation :\n`,
  );
  for (const r of restantes)
    console.error(`   ${r.nom} (${r.severite})  ${r.identifiants.join(", ")}`);
  console.error(
    "\n  `npm audit` pour le detail. Corriger, ou documenter dans .trivyignore.yaml avec une date.\n",
  );
  process.exit(1);
}

console.log(`✓ Aucune vulnerabilite ${cible}HIGH/CRITICAL non acceptee.`);
