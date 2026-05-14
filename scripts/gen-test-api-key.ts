// SPDX-License-Identifier: AGPL-3.0-or-later
// Genere une cle API "test-ciso-connector" pour le premier tenant trouve.
// Usage local uniquement (pour tester le connecteur CISO Assistant).
//   docker exec humanix-app npx tsx scripts/gen-test-api-key.ts
// La cle plain est affichee une seule fois -- copier dans connectors/ciso-assistant/.env

import { PrismaClient } from "@prisma/client";
import { generateApiKey } from "../lib/crypto";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    console.error("Aucun tenant en base.");
    process.exit(1);
  }
  const { plain, prefix, hashed } = generateApiKey();
  await db.apiKey.create({
    data: {
      tenantId: tenant.id,
      name: "test-ciso-connector",
      prefix,
      hashedKey: hashed,
      scopes: "read,export",
    },
  });
  console.log("Tenant   :", tenant.name, `(${tenant.id})`);
  console.log("Prefix   :", prefix);
  console.log("API KEY  :", plain);
  console.log("");
  console.log("Ajouter dans connectors/ciso-assistant/.env :");
  console.log(`HUMANIX_API_KEY=${plain}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
