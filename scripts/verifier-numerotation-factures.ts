// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Preuve que la numerotation des factures ne fait PAS de trou.
//
// POURQUOI CE SCRIPT ET PAS UN TEST VITEST
//
//   La propriete a demontrer -- « un rollback rend le numero » -- n'existe que
//   dans un vrai moteur transactionnel. Avec un double de Prisma, elle serait
//   vraie par construction et le test ne prouverait rien.
//
// COMMENT LE LANCER
//
//   docker run -d --name humanix-verif-pg \
//     -e POSTGRES_USER=humanix -e POSTGRES_PASSWORD=verif \
//     -e POSTGRES_DB=humanix -p 55433:5432 postgres:16-alpine
//   export DATABASE_URL="postgresql://humanix:verif@127.0.0.1:55433/humanix"
//   npx prisma db push --skip-generate
//   npx tsx scripts/verifier-numerotation-factures.ts
//   docker rm -f humanix-verif-pg
//
// NE JAMAIS le pointer sur la base de production : il ecrit des factures.

import { PrismaClient } from "@prisma/client";
import { emettreFacture, EmissionImpossible } from "../lib/facturation/emettre";
import { allouerNumero } from "../lib/facturation/numerotation";

const db = new PrismaClient();
let echecs = 0;

function verif(nom: string, ok: boolean, detail = "") {
  if (!ok) echecs++;
  console.log(
    `  [${ok ? "OK  " : "ECHEC"}] ${nom}${detail ? "  -> " + detail : ""}`,
  );
}

const LIGNE = [
  { designation: "Abonnement Pro", quantite: 16, prixUnitaireTtcCentimes: 300 },
];
const PRESTEE = new Date("2026-08-17T22:54:02Z");
const EMISE = new Date("2026-08-20T10:00:00Z");

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (/humanix-academie\.fr|prod/i.test(url)) {
    throw new Error("refus : ce script ecrit des factures, jamais sur la prod");
  }

  const t = await db.tenant.create({
    data: { name: "Verif", slug: `verif-${Date.now()}`, plan: "pro" },
  });

  // 1. Aucune facture sans coordonnees de l'acheteur.
  let motif = "";
  try {
    await emettreFacture({ tenantId: t.id, presteeLe: PRESTEE, lignes: LIGNE });
  } catch (e) {
    motif = e instanceof EmissionImpossible ? e.motif : String(e);
  }
  verif(
    "refuse d'emettre sans adresse du client",
    motif === "identite_facturation_absente",
    motif,
  );

  await db.identiteFacturation.create({
    data: {
      tenantId: t.id,
      raisonSociale: "Verif SARL",
      adresse: "1 rue Test",
      codePostal: "75002",
      ville: "Paris",
      pays: "FR",
      siren: "123456789",
    },
  });

  // 2. Numerotation continue.
  const nums: string[] = [];
  for (let i = 0; i < 3; i++) {
    const f = await emettreFacture({
      tenantId: t.id,
      paiementRef: `tr_${t.id}_${i}`,
      presteeLe: PRESTEE,
      emiseLe: EMISE,
      lignes: LIGNE,
    });
    nums.push(f.numero);
  }
  verif(
    "numerotation continue",
    nums.join(",") === "FA-2026-0001,FA-2026-0002,FA-2026-0003",
    nums.join(", "),
  );

  // 3. Les montants du cas reel : 48,00 EUR TTC.
  const f1 = await db.facture.findUnique({ where: { numero: "FA-2026-0001" } });
  verif(
    "48,00 TTC = 40,00 HT + 8,00 TVA",
    f1?.totalTtcCentimes === 4800 &&
      f1?.totalHtCentimes === 4000 &&
      f1?.tvaCentimes === 800,
    `TTC=${f1?.totalTtcCentimes} HT=${f1?.totalHtCentimes} TVA=${f1?.tvaCentimes}`,
  );

  // 4. Idempotence : un webhook rejoue ne double pas la facture.
  const rejeu = await emettreFacture({
    tenantId: t.id,
    paiementRef: `tr_${t.id}_0`,
    presteeLe: PRESTEE,
    lignes: LIGNE,
  });
  verif(
    "rejeu du webhook : pas de doublon",
    rejeu.numero === "FA-2026-0001" && (await db.facture.count()) === 3,
    rejeu.numero,
  );

  // 5. LE POINT CENTRAL : un rollback rend le numero.
  try {
    await db.$transaction(async (tx) => {
      const n = await allouerNumero(tx, 2026);
      if (n !== "FA-2026-0004") throw new Error(`numero inattendu ${n}`);
      throw new Error("echec simule apres allocation");
    });
  } catch {
    // attendu
  }
  // On LIT le compteur, on ne consomme pas de numero : sinon le controle
  // creerait lui-meme le trou qu'il pretend exclure (erreur commise au 1er jet).
  const compteur = await db.compteurFacture.findUnique({
    where: { annee: 2026 },
  });
  verif(
    "apres rollback le compteur est intact",
    compteur?.dernier === 3,
    `dernier=${compteur?.dernier}`,
  );

  const suivante = await emettreFacture({
    tenantId: t.id,
    paiementRef: `tr_${t.id}_apres`,
    presteeLe: PRESTEE,
    emiseLe: EMISE,
    lignes: LIGNE,
  });
  verif(
    "la facture suivante prend le numero rendu",
    suivante.numero === "FA-2026-0004",
    suivante.numero,
  );

  // 6. Temoin : une SEQUENCE Postgres, elle, laisserait un trou. C'est la
  //    raison d'etre de CompteurFacture.
  const seqNom = `temoin_${Date.now()}`;
  await db.$executeRawUnsafe(`CREATE SEQUENCE ${seqNom} START 1`);
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(`SELECT nextval('${seqNom}')`);
      throw new Error("echec simule");
    });
  } catch {
    // attendu
  }
  const seq = await db.$queryRawUnsafe<{ nextval: bigint }[]>(
    `SELECT nextval('${seqNom}')`,
  );
  await db.$executeRawUnsafe(`DROP SEQUENCE ${seqNom}`);
  verif(
    "TEMOIN : une SEQUENCE aurait saute de 1 a 2",
    Number(seq[0].nextval) === 2,
    `nextval=${seq[0].nextval}`,
  );

  // 7. Concurrence.
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      emettreFacture({
        tenantId: t.id,
        paiementRef: `tr_${t.id}_c${i}`,
        presteeLe: PRESTEE,
        emiseLe: EMISE,
        lignes: LIGNE,
      }),
    ),
  );
  const toutes = await db.facture.findMany({
    where: { tenantId: t.id },
    orderBy: { numero: "asc" },
    select: { numero: true },
  });
  const rangs = toutes.map((f) => Number(f.numero.split("-")[2]));
  const contigus = rangs.every((r, i) => i === 0 || r === rangs[i - 1] + 1);
  verif(
    "20 emissions concurrentes : uniques et contigus",
    new Set(rangs).size === rangs.length && contigus,
    `${rangs.length} factures, ${rangs[0]}..${rangs[rangs.length - 1]}`,
  );

  console.log(echecs === 0 ? "\n  TOUT PASSE" : `\n  ${echecs} ECHEC(S)`);
  await db.$disconnect();
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERREUR:", e instanceof Error ? e.message : String(e));
  await db.$disconnect();
  process.exit(1);
});
