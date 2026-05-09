#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// CLI Humanix Cybersecurity pour generer, inspecter et verifier les licences.
//
// Usage :
//   npm run licensing:keygen
//     → Genere une nouvelle paire de cles Ed25519 dans
//       humanix-license-keypair.json (gitignored). A faire UNE FOIS par
//       environnement (prod, staging). Copier la pubkey dans
//       lib/license/public-key.ts puis stocker la privkey en lieu sur.
//
//   npm run licensing:generate -- --tenant="Acme Corp" --plan=pro --seats=100 --years=1 --domain=academie.acme.fr
//     → Emet une nouvelle licence signee. Output : la string licence
//       a fournir au client (HUMANIX_LICENSE_KEY).
//
//   npm run licensing:inspect -- "<license-string>"
//     → Decode et affiche le contenu d'une licence (sans verifier la
//       signature). Utile pour debug.
//
//   npm run licensing:verify -- "<license-string>"
//     → Verifie complete (signature + dates + domain).
//
// PREREQUIS : la cle privee doit etre dans humanix-license-keypair.json
// (cf. license:keygen) ou pointee par HUMANIX_LICENSE_PRIVATE_KEY_FILE.

import fs from "node:fs";
import path from "node:path";
import { decodeLicense } from "../lib/license/format";
import { generateKeyPair, signLicense } from "../lib/license/sign";
import { verifyLicenseString } from "../lib/license/verify";
import type { LicensePayload } from "../lib/license/types";

const KEYPAIR_FILE = path.join(process.cwd(), "humanix-license-keypair.json");

const args = process.argv.slice(2);
const command = args[0];

function loadPrivateKey(): string {
  const fromEnv = process.env.HUMANIX_LICENSE_PRIVATE_KEY_FILE;
  const file = fromEnv ?? KEYPAIR_FILE;
  if (!fs.existsSync(file)) {
    console.error(
      `ERREUR : ${file} introuvable.\n` +
        `Lance d'abord 'npm run licensing:keygen' OU exporte HUMANIX_LICENSE_PRIVATE_KEY_FILE=/path/to/keypair.json`,
    );
    process.exit(2);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (typeof data.privateKeyPem !== "string") {
    console.error(`ERREUR : ${file} ne contient pas de privateKeyPem.`);
    process.exit(2);
  }
  return data.privateKeyPem;
}

function loadPublicKey(): string | undefined {
  if (process.env.HUMANIX_LICENSE_PUBLIC_KEY) {
    return process.env.HUMANIX_LICENSE_PUBLIC_KEY;
  }
  if (fs.existsSync(KEYPAIR_FILE)) {
    const data = JSON.parse(fs.readFileSync(KEYPAIR_FILE, "utf-8"));
    if (typeof data.publicKeyPem === "string") return data.publicKeyPem;
  }
  return undefined;
}

function parseFlag(name: string, fallback?: string): string {
  const flag = `--${name}=`;
  const found = args.find((a) => a.startsWith(flag));
  if (!found) {
    if (fallback !== undefined) return fallback;
    console.error(`ERREUR : flag --${name}=... requis.`);
    process.exit(2);
  }
  return found.slice(flag.length);
}

function parseFlagOpt(name: string): string | undefined {
  const flag = `--${name}=`;
  const found = args.find((a) => a.startsWith(flag));
  return found ? found.slice(flag.length) : undefined;
}

function commandKeygen(): void {
  if (fs.existsSync(KEYPAIR_FILE)) {
    console.error(
      `ERREUR : ${KEYPAIR_FILE} existe deja.\n` +
        `Pour eviter d'ecraser une cle privee de prod, suppression manuelle requise.`,
    );
    process.exit(2);
  }
  const keys = generateKeyPair();
  fs.writeFileSync(
    KEYPAIR_FILE,
    JSON.stringify(
      {
        publicKeyPem: keys.publicKeyPem,
        privateKeyPem: keys.privateKeyPem,
        generatedAt: new Date().toISOString(),
        notice:
          "PRIVATE KEY - NE JAMAIS COMMITER. Stocker dans 1Password / Bitwarden / KeePass / HSM.",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(`✓ Paire de cles Ed25519 generee dans ${KEYPAIR_FILE}`);
  console.log("");
  console.log("ETAPES SUIVANTES :");
  console.log(
    "  1. Copier la 'publicKeyPem' du JSON dans lib/license/public-key.ts",
  );
  console.log(
    "  2. Stocker la 'privateKeyPem' en lieu sur (1Password, Bitwarden, HSM)",
  );
  console.log("  3. Supprimer humanix-license-keypair.json apres copie");
  console.log("");
  console.log(
    "  4. Pour emettre les futures licences, exporter HUMANIX_LICENSE_PRIVATE_KEY_FILE",
  );
  console.log("     ou re-creer un keypair.json depuis le coffre-fort.");
}

function commandGenerate(): void {
  const tenant = parseFlag("tenant");
  const plan = parseFlag("plan");
  const seatsStr = parseFlag("seats", "");
  const yearsStr = parseFlag("years", "1");
  const domain = parseFlagOpt("domain") ?? null;
  const featuresStr = parseFlagOpt("features") ?? "";
  const licenseId = parseFlagOpt("id") ?? `lic_${Date.now().toString(36)}`;

  const validPlans = ["starter", "pro", "enterprise"];
  if (!validPlans.includes(plan)) {
    console.error(`ERREUR : plan invalide. Attendu : ${validPlans.join(", ")}`);
    process.exit(2);
  }

  const maxSeats = seatsStr === "" || seatsStr === "unlimited" ? null : parseInt(seatsStr, 10);
  if (maxSeats !== null && (!Number.isFinite(maxSeats) || maxSeats <= 0)) {
    console.error(`ERREUR : seats invalide.`);
    process.exit(2);
  }

  const years = parseFloat(yearsStr);
  if (!Number.isFinite(years) || years <= 0) {
    console.error(`ERREUR : years doit etre > 0.`);
    process.exit(2);
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + Math.floor(years));
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + Math.round((years % 1) * 12));

  const payload: LicensePayload = {
    v: 1,
    licenseId,
    issuedTo: tenant,
    domain,
    plan: plan as LicensePayload["plan"],
    maxSeats,
    featuresOverride: featuresStr
      ? featuresStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const privateKeyPem = loadPrivateKey();
  const licenseString = signLicense(payload, privateKeyPem);

  console.log("✓ Licence emise avec succes");
  console.log("");
  console.log("Payload :");
  console.log(JSON.stringify(payload, null, 2));
  console.log("");
  console.log("HUMANIX_LICENSE_KEY a transmettre au client :");
  console.log("");
  console.log(licenseString);
  console.log("");
  console.log("Le client la pose dans son .env :");
  console.log(`  HUMANIX_LICENSE_KEY="${licenseString.slice(0, 60)}..."`);
}

function commandInspect(): void {
  const licenseString = args[1];
  if (!licenseString) {
    console.error(`ERREUR : usage : license-tool inspect "<license-string>"`);
    process.exit(2);
  }
  const decoded = decodeLicense(licenseString);
  if (!decoded) {
    console.error(`ERREUR : format de licence invalide.`);
    process.exit(2);
  }
  console.log("✓ Format valide. Contenu (signature NON verifiee) :");
  console.log("");
  console.log(JSON.stringify(decoded, null, 2));
  console.log("");
  console.log("Pour verifier la signature : npm run licensing:verify");
}

function commandVerify(): void {
  const licenseString = args[1];
  if (!licenseString) {
    console.error(`ERREUR : usage : license-tool verify "<license-string>"`);
    process.exit(2);
  }
  const pubKey = loadPublicKey();
  if (pubKey) process.env.HUMANIX_LICENSE_PUBLIC_KEY = pubKey;

  const r = verifyLicenseString(licenseString);
  if (r.valid) {
    console.log(`✓ Licence VALIDE`);
    console.log(`  Emise pour    : ${r.license.issuedTo}`);
    console.log(`  Plan          : ${r.license.plan}`);
    console.log(`  Sieges max    : ${r.license.maxSeats ?? "illimite"}`);
    console.log(`  Domaine       : ${r.license.domain ?? "non lockee"}`);
    console.log(`  Emise le      : ${r.license.issuedAt}`);
    console.log(`  Expire le     : ${r.license.expiresAt}`);
    if (r.license.featuresOverride.length > 0) {
      console.log(`  Override      : ${r.license.featuresOverride.join(", ")}`);
    }
    if (r.warning) console.log(`  ⚠ ${r.warning}`);
  } else {
    console.error(`✗ Licence INVALIDE : ${r.error}`);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`Humanix Cybersecurity - outil de gestion des licences signees Ed25519

Commandes :
  keygen              Genere une paire de cles Ed25519 (1 fois par environnement)
  generate            Emet une nouvelle licence signee
  inspect <string>    Decode une licence sans verifier (debug)
  verify <string>     Verifie complete (signature + dates + domain)

Exemples :
  npm run licensing:keygen
  npm run licensing:generate -- --tenant="Acme Corp" --plan=pro --seats=100 --years=1
  npm run licensing:generate -- --tenant="Beta SAS" --plan=premium --domain=humanix.beta.fr --years=2
  npm run licensing:inspect "HUMANIX-LICENSE-v1.eyJ...."
  npm run licensing:verify "HUMANIX-LICENSE-v1.eyJ...."

Flags pour generate :
  --tenant=...       (obligatoire) nom de l'organisation
  --plan=...         (obligatoire) decouverte|solo|essentielle|pro|premium
  --seats=N          nombre de sieges max (default : illimite)
  --years=N          duree en annees (default : 1, accepte les decimales)
  --domain=...       cluster-lock domain (optionnel)
  --features=a,b,c   override de features (optionnel, vide = par plan)
  --id=lic_xxx       ID custom (optionnel, default : auto)
`);
}

switch (command) {
  case "keygen":
    commandKeygen();
    break;
  case "generate":
    commandGenerate();
    break;
  case "inspect":
    commandInspect();
    break;
  case "verify":
    commandVerify();
    break;
  case "--help":
  case "-h":
  case undefined:
    showHelp();
    break;
  default:
    console.error(`ERREUR : commande inconnue : ${command}`);
    showHelp();
    process.exit(2);
}
