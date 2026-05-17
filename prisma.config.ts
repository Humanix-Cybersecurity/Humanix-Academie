// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Fichier de configuration Prisma — equivalent moderne du bloc
// `package.json#prisma` qui est deprecated et sera supprime en Prisma 7.
//
// Cf. https://pris.ly/prisma-config
//
// Pour le moment on n'expose ici QUE :
//   - Le chemin du schema (defaut, mais explicite c'est plus clair)
//   - La commande `seed` (anciennement dans package.json#prisma.seed)
//
// La cle `datasource` (avec `url`) sera ajoutee plus tard si on migre
// vers une version majeure ulterieure de Prisma + driver adapter. Tant
// qu'on reste sur Prisma 6.x avec `url = env("DATABASE_URL")` dans le
// schema, on n'a pas besoin du bloc datasource ici.

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // Migrations seed : commande lancee par `prisma db seed` et par
  // l'entrypoint Docker.
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
