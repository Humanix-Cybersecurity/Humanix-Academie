// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Garantit que les modules de contenu OPTIONNELS existent, en generant un
// substitut vide pour ceux qui manquent.
//
// USAGE :
//   npx tsx scripts/resoudre-contenu-optionnel.ts            # genere
//   npx tsx scripts/resoudre-contenu-optionnel.ts --verifier # controle seul
//
// ---------------------------------------------------------------------
// POURQUOI CE SCRIPT EXISTE
// ---------------------------------------------------------------------
//
// Quatre modules de contenu commercial sont des SYMLINKS vers le submodule
// prive `content-pro/`, et ils sont gitignores. Sur un fork AGPLv3 pur ils
// n'existent tout simplement pas.
//
// Jusqu'ici, prisma/seed-data-loader.ts les chargeait par un `require()`
// entoure d'un try/catch. Ca marchait, mais avec un defaut grave : TOUTE
// transformation du mode d'execution casse ce chargement EN SILENCE.
//
// Mesure du 2026-08-12, meme code, deux modes d'execution :
//
//   tsx (mode historique)       : 58 saisons, source=commercial
//   bundle ESM (esbuild + node) :  5 saisons, source=demo
//
// Le `catch` avalait l'echec et le code concluait poliment "pas de
// catalogue commercial". Aucune erreur, aucun journal : le site serait
// passe de 63 saisons a 5 sans que rien ne le signale.
//
// En garantissant que les fichiers existent TOUJOURS, le loader peut
// utiliser des imports STATIQUES. Trois consequences :
//
//   1. Le bundling, la compilation ou le passage a `node` ne cassent plus
//      rien : la resolution se fait a la compilation, pas a l'execution.
//   2. Un fichier reellement manquant fait ECHOUER LE BUILD, bruyamment,
//      au lieu de degrader silencieusement en production.
//   3. On peut enfin retirer tsx (donc esbuild) de l'image runtime, ce qui
//      supprime 30 des 38 alertes de securite du depot.
//
// Le substitut genere exporte un tableau VIDE. Le loader retombe alors sur
// les jeux de donnees demo, exactement comme avant. Le comportement
// fonctionnel est inchange ; seule la mecanique de resolution change.

import {
  existsSync,
  lstatSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const RACINE = resolve(import.meta.dirname, "..");

type ModuleOptionnel = {
  /** Chemin relatif a la racine du depot. */
  chemin: string;
  /** Nom du symbole exporte, attendu par seed-data-loader.ts. */
  symbole: string;
  /** Ce que contient ce module quand il est present. */
  role: string;
};

export const MODULES_OPTIONNELS: ModuleOptionnel[] = [
  {
    chemin: "prisma/catalog-saisons.ts",
    symbole: "CATALOG_SAISONS",
    role: "catalogue commercial des saisons",
  },
  {
    chemin: "lib/library-seed.ts",
    symbole: "LIBRARY_ARTICLES",
    role: "articles de la librairie cyber-RH",
  },
  {
    chemin: "lib/marketplace-seed.ts",
    symbole: "MARKETPLACE_MODULES",
    role: "modules de la marketplace officielle",
  },
  {
    chemin: "lib/anecdotes/seed-data.ts",
    symbole: "ANECDOTES_SEED",
    role: "anecdotes de la newsletter",
  },
];

function substitut(m: ModuleOptionnel): string {
  return `// SPDX-License-Identifier: AGPL-3.0-or-later
//
// FICHIER GENERE AUTOMATIQUEMENT - NE PAS EDITER, NE PAS COMMITER.
//
// Genere par scripts/resoudre-contenu-optionnel.ts parce que le submodule
// prive content-pro/ est absent de cette copie du depot.
//
// Contenu reel attendu ici : ${m.role}.
//
// Le tableau vide ci-dessous fait retomber prisma/seed-data-loader.ts sur
// les jeux de donnees demo (CC BY-SA, livres dans le depot public). C'est
// le comportement normal et voulu d'un fork AGPLv3 pur.
//
// Si tu vois ce fichier dans une instance COMMERCIALE, c'est une anomalie :
// content-pro/ n'a pas ete recupere au build, et le catalogue sera reduit
// aux seules saisons demo.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ${m.symbole}: any[] = [];
`;
}

/**
 * Un fork AGPLv3 pur DOIT le declarer explicitement.
 *
 * Sans cette variable, un module manquant fait echouer le build au lieu de
 * generer un substitut. C'est le meme raisonnement que le garde-fou de
 * scripts/deploy.sh (code 3), applique un cran plus tot : au BUILD plutot
 * qu'au deploiement.
 *
 * Le risque couvert est precis : une image COMMERCIALE construite sans que
 * content-pro/ ait ete recupere. Elle demarrerait, le site fonctionnerait,
 * et le catalogue serait tombe de 63 saisons a 5. Panne totalement
 * silencieuse, decouverte par un client.
 *
 * Un self-hoster pose la variable une fois et n'y pense plus. Une image
 * commerciale ne peut plus partir amputee par accident.
 */
const MODE_OSS = process.env.HUMANIX_OSS === "true";

function principal(): void {
  const verifierSeulement = process.argv.includes("--verifier");
  let generes = 0;
  let presents = 0;

  const manquants = MODULES_OPTIONNELS.filter(
    (m) => !existsSync(join(RACINE, m.chemin)),
  );

  if (manquants.length > 0 && !MODE_OSS && !verifierSeulement) {
    console.error(`
[contenu] ERREUR : ${manquants.length} module(s) de contenu commercial absent(s).

${manquants.map((m) => `    ${m.chemin}  (${m.role})`).join("\n")}

  Deux situations possibles.

  1. TU CONSTRUIS UNE IMAGE COMMERCIALE et le submodule content-pro/ n'a
     pas ete recupere. C'est le cas dangereux : sans ce garde-fou, le build
     reussirait, le site demarrerait, et le catalogue tomberait aux seules
     saisons demo. Panne silencieuse, decouverte par un client.

         git submodule update --init --recursive content-pro

  2. TU ES UN FORK AGPLv3 PUR et c'est normal : ces modules ne sont pas
     dans le depot public. Declare-le explicitement, une fois :

         HUMANIX_OSS=true npm run contenu:resoudre

     Des substituts vides seront generes, et l'application retombera sur
     les jeux de donnees demo livres sous CC BY-SA.
`);
    process.exit(3);
  }

  for (const m of MODULES_OPTIONNELS) {
    const abs = join(RACINE, m.chemin);

    // `existsSync` suit les liens symboliques : un symlink casse (content-pro
    // absent) est donc correctement detecte comme inexistant. C'est
    // exactement le cas qu'on veut couvrir.
    if (existsSync(abs)) {
      presents++;
      continue;
    }

    if (verifierSeulement) {
      console.error(`[contenu] MANQUANT : ${m.chemin}`);
      generes++;
      continue;
    }

    // Le chemin est un SYMLINK CASSE dans le cas qui nous occupe : le lien
    // vers content-pro/ existe (il est dans l'arbre git), mais sa cible non.
    // `writeFileSync` ecrirait alors dans la CIBLE inexistante et echouerait
    // en ENOENT. Il faut retirer le lien d'abord.
    //
    // `lstatSync` et non `statSync` : on veut l'etat du LIEN, pas de sa
    // cible. C'est toute la difference, et le test l'a montre.
    try {
      if (lstatSync(abs).isSymbolicLink()) {
        unlinkSync(abs);
      }
    } catch {
      // Le chemin n'existe pas du tout : rien a retirer.
    }

    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, substitut(m), "utf8");
    console.log(`[contenu] substitut genere : ${m.chemin}`);
    generes++;
  }

  console.log(
    `[contenu] ${presents} module(s) reel(s), ${generes} substitut(s)` +
      `${verifierSeulement ? " manquant(s)" : ""}.`,
  );

  if (verifierSeulement && generes > 0) {
    console.error(
      "[contenu] Lance `npm run contenu:resoudre` avant de builder.",
    );
    process.exit(1);
  }
}

// Ne s'execute que si appele directement, pas a l'import (les tests
// importent MODULES_OPTIONNELS).
if (process.argv[1] && process.argv[1].includes("resoudre-contenu-optionnel")) {
  principal();
}
