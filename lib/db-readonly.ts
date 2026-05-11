// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Prisma client en lecture seule pour les usages analytiques (forecasts,
// risk-score, heatmaps, exports CSV admin) et les cron de telemetrie.
//
// Principe Least Privilege :
//   - Si DATABASE_URL_READONLY est defini -> on instancie un client
//     dedie qui se connecte avec un user Postgres en read-only
//     (SELECT uniquement, exclu des tables sensibles cf.
//     prisma/sql/setup-readonly-role.sql).
//   - Si DATABASE_URL_READONLY n'est pas defini -> on fallback sur le
//     client principal (`db`). Aucune regression fonctionnelle,
//     juste pas de defense en profondeur.
//
// Securite :
//   - Le client read-only NE PEUT PAS muter la DB meme si un bug code
//     appelait .create() ou .update() : la base refuserait au niveau
//     SQL avec "permission denied". C'est la garantie.
//   - Les credentials read-only peuvent etre rotates independamment.
//   - Si le credentials read-only fuit (log leak, memory dump),
//     l'attaquant ne peut que lire les analytics non-PII (vue
//     v_user_analytics). PasswordHash, mfaSecret, refresh_token sont
//     inaccessibles meme avec ces creds.
//
// USAGE :
//
//   import { dbReadOnly } from "@/lib/db-readonly";
//
//   const stats = await dbReadOnly.tenant.findMany({
//     select: { id: true, plan: true },
//   });
//
//   // Mutations refusees au niveau SQL :
//   // await dbReadOnly.tenant.update(...);  // -> erreur Prisma
//
// NB : on ne change PAS le shape Prisma (typage identique). C'est juste
// un client different qui se connecte avec une URL different.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prismaReadOnly?: PrismaClient;
};

/**
 * Indique si une connection read-only dediee est configuree.
 * Si false, `dbReadOnly` retombe sur le client principal.
 */
export function hasDedicatedReadonlyDb(): boolean {
  return Boolean(process.env.DATABASE_URL_READONLY);
}

function buildClient(): PrismaClient {
  const url = process.env.DATABASE_URL_READONLY;
  if (!url) {
    // Fallback : on retourne le client principal pour ne rien casser.
    // Le module `@/lib/db` est resolu de maniere lazy pour eviter une
    // dependance circulaire au moment du build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { db } = require("@/lib/db") as { db: PrismaClient };
    return db;
  }

  // Prisma 5.2+ : on prefere `datasourceUrl` (singulier) au lieu de
  // l'ancien `datasources: { db: { url } }`. La nouvelle API est plus
  // simple et stable a travers les majors v5 -> v6 -> v7.
  // Cf. https://www.prisma.io/docs/orm/reference/prisma-client-reference#datasourceurl
  return new PrismaClient({
    datasourceUrl: url,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const dbReadOnly: PrismaClient =
  globalForPrisma.prismaReadOnly ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaReadOnly = dbReadOnly;
}
