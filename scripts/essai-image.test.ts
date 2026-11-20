// SPDX-License-Identifier: AGPL-3.0-or-later
//
// essai-image.sh lance une image contre un PostgreSQL jetable et dit si elle
// sert. Impossible de tirer et de démarrer de vraies images dans la suite : on
// exécute donc le script pour de bon, avec bash, dans un bac à sable où le
// moteur de conteneurs et sleep sont des doublures. La doublure du moteur
// journalise chaque appel et répond d'après de petits fichiers d'état : à quel
// essai /api/health passe à 200, ce que répond la page d'accueil, quand le
// conteneur s'arrête, quelle étape du montage échoue.
//
// Ce que ces tests protègent :
//   - l'essai ÉCHOUE quand l'image ne sert pas. Le job qu'il remplace est
//     resté vert six mois sans que le conteneur réponde une seule fois ;
//   - il n'attend pas la fin du délai quand le conteneur est déjà arrêté ;
//   - tout ce qu'il crée est retiré, qu'il réussisse ou non ;
//   - la base et l'application reçoivent le même mot de passe, et aucun
//     secret ne passe par la ligne de commande ;
//   - les outils que le script suppose. Le chemin de chaque essai ne contient
//     que les doublures et bash : un outil de plus dans le script, et tout
//     tombe ici plutôt que sur un exécuteur de la CI, qui n'a pas awk.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(import.meta.dirname, "essai-image.sh");
const RACINE = resolve(import.meta.dirname, "..");
const BASH_DISPONIBLE = spawnSync("bash", ["-c", "exit 0"]).status === 0;

// Tout ce que le script a le droit d'appeler en plus des doublures.
const OUTILS_SUPPOSES = ["bash"];

const IMAGE = "ghcr.io/humanix-cybersecurity/humanix-academie@sha256:essai";
const RESEAU = "humanix-essai-T";
const BASE = "humanix-essai-pg-T";
const APP = "humanix-essai-app-T";
const IMAGE_BASE = "humanix-essai-pg:T";

// Doublure du moteur. Uniquement des commandes internes au shell : elle tourne
// avec le même chemin fermé que le script. Écrite sans la forme
// dollar-accolade, que String.raw prendrait pour une interpolation.
function doublureMoteur(nom: string): string {
  return (
    String.raw`#!/bin/sh
# Doublure du moteur de conteneurs : journalise l'appel, répond d'après
# $BAC/etat.
e="$BAC/etat"
lire() { v=""; [ -f "$e/$1" ] && read -r v < "$e/$1"; echo "$v"; }
arrete() {
  apres="$(lire arret-apres)"
  [ -n "$apres" ] && [ "$(lire appels-sante)" -ge "$apres" ]
}
` +
    `echo "${nom} $*" >> "$BAC/journal"\n` +
    String.raw`case "$1" in
  network)
    if [ "$2" = "create" ] && [ -f "$e/reseau-echoue" ]; then exit 1; fi
    ;;
  build)
    if [ -f "$e/construction-echoue" ]; then exit 1; fi
    ;;
  run)
    for image; do :; done
    case "$image" in
      humanix-essai-pg:*)
        if [ -f "$e/base-echoue" ]; then exit 125; fi
        echo "$POSTGRES_PASSWORD" > "$e/recu-mdp-base"
        echo "$POSTGRES_READONLY_PASSWORD" > "$e/recu-mdp-lecture"
        ;;
      *)
        if [ -f "$e/lancement-echoue" ]; then exit 125; fi
        echo "$DATABASE_URL" > "$e/recu-url"
        echo "$AUTH_SECRET" > "$e/recu-secret"
        ;;
    esac
    ;;
  exec)
    for url; do :; done
    case "$url" in
      */api/health)
        n="$(lire appels-sante)"
        n=$((n + 1))
        echo "$n" > "$e/appels-sante"
        # Comme le vrai moteur : pas d'exec dans un conteneur arrêté.
        if arrete; then exit 1; fi
        if [ "$n" -ge "$(lire sante-a-partir-de)" ]; then
          echo 200
        else
          lire sante-avant
        fi
        ;;
      *)
        lire accueil
        ;;
    esac
    ;;
  inspect)
    if arrete; then echo false; else echo true; fi
    ;;
  logs)
    for conteneur; do :; done
    echo "LIGNE DU JOURNAL DE $conteneur"
    case "$conteneur" in
      humanix-essai-app-*)
        if [ -f "$e/journal-app" ]; then
          while IFS= read -r ligne; do echo "$ligne"; done < "$e/journal-app"
        fi
        ;;
    esac
    ;;
esac
exit 0
`
  );
}

// Ce que docker-entrypoint.sh écrit quand une étape « non bloquante » de la
// préparation échoue. Le script les cherche mot pour mot.
const MARQUEURS_D_ECHEC = [
  "migrate-legacy-trial ignoree (non bloquante)",
  "migrate-4-tiers-pivot ignoree (non bloquante)",
  "seed-catalog a echoue (non bloquant)",
  "bootstrap-admin a echoue",
];

// Le journal d'un démarrage réussi sur une base vierge et sans réseau, tel
// que relevé le 2026-11-19 sur l'image de main.
const JOURNAL_SAIN = [
  "[1/5] Attente Postgres...",
  "  -> Postgres pret",
  "[2/5] Synchronisation du schema Prisma...",
  "[2.5/5] Migrations legacy plans (idempotentes)...",
  "[migrate-4-tiers] no-op (aucune row legacy a migrer)",
  "[3/5] Seed du catalog partage (saisons, episodes, badges, boutique)...",
  "[seed-catalog] catalog OK - 5 saisons, 28 episodes, 60 badges, 48 items boutique (source: demo, 493ms)",
  "[4/5] Bootstrap admin...",
  "[5/5] Observatoire des fuites - premier import si necessaire...",
  "  -> Import partiel ou echec reseau, reessai au prochain cron",
  "  Pret. Ouvre http://localhost:3000",
];

const DOUBLURE_SLEEP = `#!/bin/sh\necho "sleep $*" >> "$BAC/journal"\nexit 0\n`;

type Scenario = {
  /** Numéro de l'essai de /api/health qui répond 200 ; 0 pour jamais. */
  santeAPartirDe: number;
  /** Ce que répond /api/health avant : 0 (connexion refusée) ou 503. */
  santeAvant?: number;
  /** Code de la page d'accueil. */
  accueil?: number;
  /** Le conteneur s'arrête à cet essai de /api/health. */
  arretApres?: number;
  /** Lignes que le conteneur de l'application a écrites dans son journal. */
  journalApp?: string[];
  /** Étapes du montage qui échouent. */
  echecs?: (
    "reseau-echoue" | "construction-echoue" | "base-echoue" | "lancement-echoue"
  )[];
};

const bacs: string[] = [];

function creerBac(scenario: Scenario): string {
  const bac = mkdtempSync(join(tmpdir(), "essai-image-"));
  bacs.push(bac);

  const etat = join(bac, "etat");
  mkdirSync(etat);
  const poser = (nom: string, valeur: string | number) =>
    writeFileSync(join(etat, nom), `${valeur}\n`);
  poser("appels-sante", 0);
  poser(
    "sante-a-partir-de",
    scenario.santeAPartirDe > 0 ? scenario.santeAPartirDe : 1_000_000,
  );
  poser("sante-avant", scenario.santeAvant ?? 0);
  poser("accueil", scenario.accueil ?? 200);
  if (scenario.arretApres !== undefined) {
    poser("arret-apres", scenario.arretApres);
  }
  for (const echec of scenario.echecs ?? []) {
    poser(echec, "");
  }
  if (scenario.journalApp) {
    poser("journal-app", scenario.journalApp.join("\n"));
  }
  writeFileSync(join(bac, "journal"), "");

  const bin = join(bac, "bin");
  mkdirSync(bin);
  const doublures: Record<string, string> = {
    docker: doublureMoteur("docker"),
    podman: doublureMoteur("podman"),
    sleep: DOUBLURE_SLEEP,
  };
  for (const [nom, contenu] of Object.entries(doublures)) {
    writeFileSync(join(bin, nom), contenu);
    chmodSync(join(bin, nom), 0o755);
  }

  const outils = join(bac, "outils");
  mkdirSync(outils);
  const dossiers = (process.env.PATH ?? "").split(":").filter(Boolean);
  for (const outil of OUTILS_SUPPOSES) {
    const trouve = dossiers
      .map((dossier) => join(dossier, outil))
      .find((chemin) => existsSync(chemin));
    if (!trouve) {
      throw new Error(`outil supposé introuvable sur ce poste : ${outil}`);
    }
    symlinkSync(trouve, join(outils, outil));
  }
  return bac;
}

type Resultat = {
  code: number | null;
  /** Sortie standard et sortie d'erreur du script. */
  sortie: string;
  /** Un appel de doublure par ligne, dans l'ordre. */
  journal: string[];
  /** Ce que la doublure a reçu par l'environnement. */
  recu: (nom: string) => string;
};

function lancer(
  scenario: Scenario,
  args: string[] = [IMAGE],
  variables: Record<string, string> = {},
): Resultat {
  const bac = creerBac(scenario);
  const r = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    // Environnement fermé : les doublures, bash, et rien d'autre. Pas le
    // chemin du poste, pas ses variables.
    env: {
      PATH: `${join(bac, "bin")}:${join(bac, "outils")}`,
      // Le script ne la lit pas ; le type de l'environnement l'exige.
      NODE_ENV: "test",
      BAC: bac,
      ESSAI_SUFFIXE: "T",
      // Trois essais de /api/health, deux secondes d'écart ; la doublure de
      // sleep rend la main aussitôt.
      ESSAI_ATTENTE: "6",
      ...variables,
    },
  });
  return {
    code: r.status,
    sortie: `${r.stdout}${r.stderr}`,
    journal: readFileSync(join(bac, "journal"), "utf8")
      .split("\n")
      .filter(Boolean),
    recu: (nom) => {
      const chemin = join(bac, "etat", `recu-${nom}`);
      return existsSync(chemin) ? readFileSync(chemin, "utf8").trim() : "";
    },
  };
}

const appels = (r: Resultat, debut: string) =>
  r.journal.filter((l) => l.startsWith(debut));

/** Vrai si tout ce que le script crée a été retiré, dans l'ordre. */
function aNettoye(r: Resultat, moteur = "docker"): boolean {
  const fin = r.journal.slice(-3);
  return (
    fin[0] === `${moteur} rm -f -v ${APP} ${BASE}` &&
    fin[1] === `${moteur} network rm ${RESEAU}` &&
    fin[2] === `${moteur} rmi ${IMAGE_BASE}`
  );
}

afterEach(() => {
  for (const bac of bacs.splice(0)) {
    rmSync(bac, { recursive: true, force: true });
  }
});

describe.skipIf(!BASH_DISPONIBLE)(
  "essai-image.sh : l'image sert-elle ?",
  { timeout: 30_000 },
  () => {
    it("réussit quand /api/health puis la page d'accueil répondent", () => {
      const r = lancer({ santeAPartirDe: 3 });

      expect(r.sortie).toContain("/api/health repond 200 (essai 3 sur 3)");
      expect(r.sortie).toContain("la page d'accueil repond 200");
      expect(r.sortie).toContain("ESSAI REUSSI");
      expect(r.code).toBe(0);
      // Deux attentes entre trois essais, pas une de plus.
      expect(appels(r, "sleep ")).toEqual(["sleep 2", "sleep 2"]);
      expect(aNettoye(r)).toBe(true);
    });

    it("monte l'essai dans l'ordre : réseau interne, base du dépôt, image", () => {
      const r = lancer({ santeAPartirDe: 1 });

      expect(r.journal.slice(0, 4)).toEqual([
        `docker network create --internal ${RESEAU}`,
        `docker build -q -t ${IMAGE_BASE} ${RACINE}/docker/postgres`,
        `docker run -d --name ${BASE} --network ${RESEAU} -e POSTGRES_USER=humanix -e POSTGRES_DB=humanix -e POSTGRES_PASSWORD -e POSTGRES_READONLY_PASSWORD ${IMAGE_BASE}`,
        `docker run -d --name ${APP} --network ${RESEAU} -e DATABASE_URL -e AUTH_SECRET ${IMAGE}`,
      ]);
    });

    it("ne publie aucun port et ne désactive pas la préparation de la base", () => {
      const r = lancer({ santeAPartirDe: 1 });

      const lancements = appels(r, "docker run ").join("\n");
      expect(lancements).not.toMatch(/ -p |--publish/);
      // L'essai doit faire ce que fait un premier démarrage auto-hébergé.
      expect(lancements).not.toContain("HUMANIX_PREPARER_AU_DEMARRAGE");
      expect(lancements).not.toContain("SKIP_MIGRATIONS");
    });

    it("donne le même mot de passe à la base et à l'application", () => {
      const r = lancer({ santeAPartirDe: 1 });

      const mdp = r.recu("mdp-base");
      expect(mdp).toMatch(/^essai\d{20}$/);
      expect(r.recu("mdp-lecture")).toBe(mdp);
      expect(r.recu("url")).toBe(
        `postgresql://humanix:${mdp}@${BASE}:5432/humanix?schema=public`,
      );
    });

    it("génère un AUTH_SECRET d'au moins 32 caractères, propre à l'essai", () => {
      const un = lancer({ santeAPartirDe: 1 });
      const deux = lancer({ santeAPartirDe: 1 });

      expect(un.recu("secret")).toMatch(/^essai-image-\d{25}$/);
      expect(un.recu("secret").length).toBeGreaterThanOrEqual(32);
      expect(deux.recu("secret")).not.toBe(un.recu("secret"));
    });

    it("ne fait passer aucun secret par la ligne de commande ni par sa sortie", () => {
      const r = lancer({ santeAPartirDe: 2, santeAvant: 503 });

      for (const valeur of [r.recu("mdp-base"), r.recu("secret")]) {
        expect(valeur).not.toBe("");
        expect(r.journal.join("\n")).not.toContain(valeur);
        expect(r.sortie).not.toContain(valeur);
      }
    });

    it("interroge l'application depuis le conteneur, sans suivre les redirections", () => {
      const r = lancer({ santeAPartirDe: 1 });

      const sondes = appels(r, `docker exec ${APP} node -e `);
      expect(sondes).toHaveLength(2);
      expect(sondes[0]).toContain('redirect: "manual"');
      expect(sondes[0].endsWith(" http://127.0.0.1:3000/api/health")).toBe(
        true,
      );
      expect(sondes[1].endsWith(" http://127.0.0.1:3000/")).toBe(true);
    });

    it("échoue quand /api/health ne répond jamais 200", () => {
      const r = lancer({ santeAPartirDe: 0, santeAvant: 503 });

      expect(r.sortie).toContain(
        "ECHEC : /api/health ne repond pas 200 apres 6 s (dernier code : 503)",
      );
      expect(r.sortie).not.toContain("ESSAI REUSSI");
      expect(r.code).toBe(1);
      expect(appels(r, `docker exec ${APP} `)).toHaveLength(3);
      expect(aNettoye(r)).toBe(true);
    });

    it("échoue quand rien n'écoute dans le conteneur", () => {
      const r = lancer({ santeAPartirDe: 0, santeAvant: 0 });

      expect(r.sortie).toContain("(dernier code : 0)");
      expect(r.code).toBe(1);
    });

    it("n'attend pas la fin du délai quand le conteneur s'est arrêté", () => {
      const r = lancer(
        { santeAPartirDe: 0, arretApres: 2 },
        [IMAGE],
        // Cinq minutes de délai : sans la détection, cent cinquante essais.
        { ESSAI_ATTENTE: "300" },
      );

      expect(r.sortie).toContain(
        "ECHEC : le conteneur s'est arrete avant de repondre",
      );
      expect(r.code).toBe(1);
      expect(appels(r, `docker exec ${APP} `)).toHaveLength(2);
      expect(appels(r, "sleep ")).toHaveLength(1);
      expect(aNettoye(r)).toBe(true);
    });

    it("affiche les journaux de l'application et de la base quand il échoue", () => {
      const r = lancer({ santeAPartirDe: 0, arretApres: 1 });

      expect(r.sortie).toContain(`LIGNE DU JOURNAL DE ${APP}`);
      expect(r.sortie).toContain(`LIGNE DU JOURNAL DE ${BASE}`);
      // Lus avant le nettoyage : après, il n'y a plus de conteneur à lire.
      const lecture = r.journal.indexOf(`docker logs --tail 80 ${APP}`);
      const retrait = r.journal.indexOf(`docker rm -f -v ${APP} ${BASE}`);
      expect(lecture).toBeGreaterThanOrEqual(0);
      expect(retrait).toBeGreaterThan(lecture);
    });

    it("affiche le journal de l'application quand il réussit", () => {
      const r = lancer({ santeAPartirDe: 1 });

      expect(r.sortie).toContain(`LIGNE DU JOURNAL DE ${APP}`);
      expect(r.sortie).not.toContain(`LIGNE DU JOURNAL DE ${BASE}`);
    });

    it("réussit sur le journal d'un démarrage sain, import de l'observatoire en échec compris", () => {
      const r = lancer({ santeAPartirDe: 1, journalApp: JOURNAL_SAIN });

      expect(r.sortie).toContain(
        "preparation : aucune etape en echec dans le journal",
      );
      expect(r.code).toBe(0);
    });

    it.each(MARQUEURS_D_ECHEC)(
      "échoue quand le conteneur sert mais que le journal dit « %s »",
      (marqueur) => {
        const r = lancer({
          santeAPartirDe: 1,
          journalApp: [...JOURNAL_SAIN, `  -> ${marqueur}, on continue`],
        });

        expect(r.sortie).toContain(
          `ECHEC : une etape de preparation a echoue : ${marqueur}`,
        );
        expect(r.sortie).not.toContain("ESSAI REUSSI");
        expect(r.code).toBe(1);
        expect(aNettoye(r)).toBe(true);
      },
    );

    it("cherche des marqueurs que docker-entrypoint.sh écrit vraiment", () => {
      // Si le point d'entrée reformule un de ces messages, l'essai cesserait
      // de le voir sans que rien ne tombe : c'est ici que ça tombe.
      const entree = readFileSync(join(RACINE, "docker-entrypoint.sh"), "utf8");
      const script = readFileSync(SCRIPT, "utf8");
      for (const marqueur of MARQUEURS_D_ECHEC) {
        expect(entree).toContain(marqueur);
        expect(script).toContain(`"${marqueur}"`);
      }
    });

    it("échoue quand la page d'accueil est en erreur", () => {
      const r = lancer({ santeAPartirDe: 1, accueil: 500 });

      expect(r.sortie).toContain("ECHEC : la page d'accueil repond 500");
      expect(r.code).toBe(1);
      expect(aNettoye(r)).toBe(true);
    });

    it("accepte une redirection sur la page d'accueil", () => {
      const r = lancer({ santeAPartirDe: 1, accueil: 307 });

      expect(r.sortie).toContain("la page d'accueil repond 307");
      expect(r.code).toBe(0);
    });

    it.each([
      ["le réseau ne se crée pas", "reseau-echoue", "le reseau"],
      [
        "l'image PostgreSQL ne se construit pas",
        "construction-echoue",
        "l'image PostgreSQL du depot ne se construit pas",
      ],
      [
        "PostgreSQL ne se lance pas",
        "base-echoue",
        "PostgreSQL n'a pas pu etre lance",
      ],
      [
        "l'image ne se lance pas",
        "lancement-echoue",
        "l'image n'a pas pu etre lancee",
      ],
    ] as const)("échoue et nettoie quand %s", (_cas, echec, message) => {
      const r = lancer({ santeAPartirDe: 1, echecs: [echec] });

      expect(r.sortie).toContain("ECHEC : ");
      expect(r.sortie).toContain(message);
      expect(r.code).toBe(1);
      // Aucune requête n'est partie vers une application qui n'existe pas.
      expect(appels(r, `docker exec ${APP} `)).toHaveLength(0);
      expect(aNettoye(r)).toBe(true);
    });

    const MAUVAIS_USAGES: [string, string[]][] = [
      ["aucune image", []],
      ["deux arguments", [IMAGE, "autre"]],
      ["une image vide", [""]],
    ];
    it.each(MAUVAIS_USAGES)("refuse %s sans rien créer", (_cas, args) => {
      const r = lancer({ santeAPartirDe: 1 }, args);

      expect(r.sortie).toContain("Usage :");
      expect(r.code).toBe(2);
      expect(r.journal).toEqual([]);
    });

    it.each([
      [
        "un suffixe qui sortirait d'un nom de conteneur",
        "ESSAI_SUFFIXE",
        "a b",
      ],
      ["un suffixe avec un point-virgule", "ESSAI_SUFFIXE", "x;y"],
      ["un délai qui n'est pas un nombre", "ESSAI_ATTENTE", "bientot"],
    ])("refuse %s sans rien créer", (_cas, nom, valeur) => {
      const r = lancer({ santeAPartirDe: 1 }, [IMAGE], { [nom]: valeur });

      expect(r.sortie).toContain(`${nom} invalide`);
      expect(r.code).toBe(2);
      expect(r.journal).toEqual([]);
    });

    it("suit CONTAINER_ENGINE", () => {
      const r = lancer({ santeAPartirDe: 1 }, [IMAGE], {
        CONTAINER_ENGINE: "podman",
      });

      expect(r.code).toBe(0);
      expect(appels(r, "docker ")).toEqual([]);
      expect(r.journal[0]).toBe(`podman network create --internal ${RESEAU}`);
      expect(aNettoye(r, "podman")).toBe(true);
    });

    it("prend le numéro de processus pour suffixe quand on ne lui en donne pas", () => {
      const bac = creerBac({ santeAPartirDe: 1 });
      const r = spawnSync("bash", [SCRIPT, IMAGE], {
        encoding: "utf8",
        env: {
          PATH: `${join(bac, "bin")}:${join(bac, "outils")}`,
          NODE_ENV: "test",
          BAC: bac,
        },
      });
      const journal = readFileSync(join(bac, "journal"), "utf8").split("\n");

      expect(r.status).toBe(0);
      expect(journal[0]).toMatch(
        /^docker network create --internal humanix-essai-\d+$/,
      );
    });
  },
);
