// SPDX-License-Identifier: AGPL-3.0-or-later
//
// update-postgres.sh arrête une pile, retire son pod et la fait recréer sur
// une nouvelle image de PostgreSQL : impossible de le lancer contre un vrai
// podman dans la suite. On l'exécute donc pour de bon, avec bash, dans un bac
// à sable où podman, systemctl, curl, flock, sleep et le client du socket
// HAProxy sont des doublures. Chaque doublure journalise son appel et répond
// d'après de petits fichiers d'état : quels conteneurs existent et tournent,
// sur quelle image est la base, ce que sert le registre, ce que dit HAProxy.
//
// Ce que ces tests protègent :
//   - l'ordre des gestes, parce qu'il n'y en a qu'un de sûr : rien n'est
//     arrêté avant que l'image soit là et que sa version soit lue, la base
//     s'arrête après l'application, le pod part après l'unité ;
//   - les refus, tous avant le premier arrêt ;
//   - ce qui est remis en place quand un geste échoue, selon qu'il échoue
//     avant ou après le retrait du pod ;
//   - le retour à `ready` côté HAProxy, sans lequel une pile revenue saine en
//     couleur a ne recevrait aucune requête après une livraison en couleur b.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(import.meta.dirname, "update-postgres.sh");
const BASH_DISPONIBLE = spawnSync("bash", ["-c", "exit 0"]).status === 0;

const IMAGE = "docker.io/library/postgres:16-alpine";
// Identifiants d'image, 64 chiffres hexadécimaux comme ceux de podman.
const ANCIENNE = "667495ca2ac3".padEnd(64, "0");
const NOUVELLE = "f377d590e547".padEnd(64, "1");

// Les doublures sont écrites sans la forme dollar-accolade, que String.raw
// prendrait pour une interpolation.
const DOUBLURE_PODMAN = String.raw`#!/bin/sh
# Doublure de podman : journalise l'appel, répond d'après $BAC/etat.
echo "podman $*" >> "$BAC/journal"
e="$BAC/etat"
retirer() { grep -vxF "$1" "$2" > "$2.tmp"; mv "$2.tmp" "$2"; }
case "$1" in
  pod)
    case "$2" in
      exists) [ -f "$e/pod" ]; exit $? ;;
      stop) : > "$e/en-service" ;;
      start) cp "$e/presents" "$e/en-service" ;;
      rm)
        [ -f "$e/retrait-pod-echoue" ] && exit 125
        # Comme le vrai podman : sans -f, un pod dont un conteneur tourne
        # ne se retire pas.
        if [ "$3" != "-f" ] && [ -s "$e/en-service" ]; then exit 125; fi
        rm -f "$e/pod"
        cp "$e/hors-du-pod" "$e/presents"
        : > "$e/en-service"
        ;;
    esac
    exit 0
    ;;
  ps)
    tous=0; filtre=""; format=""
    shift
    while [ $# -gt 0 ]; do
      case "$1" in
        -a) tous=1 ;;
        --filter) filtre="$2"; shift ;;
        --format) format="$2"; shift ;;
      esac
      shift
    done
    if [ "$tous" = 1 ]; then liste="$e/presents"; else liste="$e/en-service"; fi
    case "$filtre" in
      pod=*)
        for n in $(grep -vxF -f "$e/hors-du-pod" "$liste"); do
          case "$format" in
            *Labels*) echo "$n $(cat "$e/projet/$n" 2>/dev/null)" ;;
            *) echo "$n" ;;
          esac
        done
        ;;
      label=*)
        p="$(echo "$filtre" | sed 's/.*=//')"
        for n in $(cat "$liste"); do
          if [ "$(cat "$e/projet/$n" 2>/dev/null)" = "$p" ]; then echo "$n"; fi
        done
        ;;
      *) cat "$liste" ;;
    esac
    exit 0
    ;;
  inspect)
    grep -qxF "$2" "$e/presents" || exit 125
    case "$4" in
      *Mounts*) echo "volume $(cat "$e/volume")" ;;
      *ImageName*) cat "$e/nom-image" ;;
      *ExitCode*) cat "$e/code-arret-pg" ;;
      *.Image*) cat "$e/image/$2" ;;
    esac
    exit 0
    ;;
  exec)
    grep -qxF "$2" "$e/en-service" || exit 1
    id="$(cat "$e/image/$2")"
    case "$*" in
      *pg_isready*) if [ -f "$e/pg-muette/$id" ]; then exit 1; fi ;;
      *server_version*)
        # Par défaut le serveur répond dans la version de son image.
        if [ -f "$e/version-serveur/$id" ]; then
          cat "$e/version-serveur/$id"
        else
          cat "$e/versions/$id"
        fi
        ;;
      *Saison*)
        if [ -f "$e/recree" ] && [ -f "$e/canari-apres" ]; then
          cat "$e/canari-apres"
        else
          cat "$e/canari"
        fi
        ;;
    esac
    exit 0
    ;;
  image)
    # podman image inspect <nom ou identifiant> --format <gabarit>
    if [ "$3" = "$(cat "$e/nom-image")" ]; then id="$(cat "$e/tag")"; else id="$3"; fi
    case "$5" in
      *Config.Env*)
        echo "PATH=/usr/local/bin:/usr/bin"
        echo "PG_MAJOR=$(cut -d. -f1 "$e/versions/$id")"
        echo "PG_VERSION=$(cat "$e/versions/$id")"
        ;;
      *) if [ -f "$e/prefixe-sha256" ]; then echo "sha256:$id"; else echo "$id"; fi ;;
    esac
    exit 0
    ;;
  pull)
    [ -f "$e/retrait-echoue" ] && exit 125
    cp "$e/distant" "$e/tag"
    echo "Getting image source signatures"
    exit 0
    ;;
  tag)
    if [ "$3" = "$(cat "$e/nom-image")" ]; then printf '%s\n' "$2" > "$e/tag"; fi
    exit 0
    ;;
  stop)
    for nom; do :; done
    retirer "$nom" "$e/en-service"
    exit 0
    ;;
  logs) cat "$e/journal-pg"; exit 0 ;;
  volume) [ -f "$e/volume-existe" ]; exit $? ;;
  port)
    # Un conteneur arrêté est passé sous silence, sans erreur.
    grep -qxF "$2" "$e/en-service" || exit 0
    cat "$e/ports/$2"
    exit 0
    ;;
esac
exit 0
`;

const DOUBLURE_SYSTEMCTL = String.raw`#!/bin/sh
# Doublure de « systemctl --user » pour l'unité de la pile. Son démarrage fait
# ce que fait la vraie : elle crée ce qui manque sur les images présentes,
# puis démarre le pod.
echo "systemctl $*" >> "$BAC/journal"
e="$BAC/etat"
case "$2" in
  is-active) [ "$(cat "$e/unite")" = "active" ]; exit $? ;;
  stop)
    echo inactive > "$e/unite"
    [ -f "$e/arret-incomplet" ] || : > "$e/en-service"
    exit 0
    ;;
  reset-failed) exit 0 ;;
  start)
    if [ -f "$e/demarrage-echoue" ]; then echo failed > "$e/unite"; exit 1; fi
    if [ ! -f "$e/pod" ]; then
      : > "$e/pod"
      : > "$e/recree"
      for n in $(cat "$e/pile"); do
        grep -qxF "$n" "$e/presents" || echo "$n" >> "$e/presents"
        cp "$e/projet-pile" "$e/projet/$n"
        case "$n" in
          *postgres) cp "$e/tag" "$e/image/$n" ;;
        esac
      done
      if [ -f "$e/volume-apres" ]; then cp "$e/volume-apres" "$e/volume"; fi
    fi
    cp "$e/presents" "$e/en-service"
    echo active > "$e/unite"
    exit 0
    ;;
esac
exit 0
`;

const DOUBLURE_CURL = String.raw`#!/bin/sh
# Doublure de curl. En local, /api/health ne répond que sur le port d'un
# conteneur applicatif qui tourne, dont la base tourne, et que le scénario n'a
# pas rendu muet. Par le nom public, d'après le fichier « public-ok ».
echo "curl $*" >> "$BAC/journal"
e="$BAC/etat"
for url; do :; done
case "$url" in
  http://127.0.0.1:*)
    port="$(echo "$url" | sed -E 's#^http://127\.0\.0\.1:([0-9]+)/api/health$#\1#')"
    pg="$(cat "$e/pg")"
    for f in "$e"/ports/*; do
      [ -f "$f" ] || continue
      nom="$(basename "$f")"
      grep -q ":$port\$" "$f" || continue
      grep -qxF "$nom" "$e/en-service" || continue
      grep -qxF "$pg" "$e/en-service" || exit 7
      if grep -qx "$port" "$e/muets"; then exit 7; fi
      if [ -f "$e/app-muette/$(cat "$e/image/$pg")" ]; then exit 7; fi
      echo '{"status":"ok"}'
      exit 0
    done
    exit 7
    ;;
  https://*)
    [ -f "$e/public-ok" ] || exit 7
    echo '{"status":"ok"}'
    exit 0
    ;;
esac
exit 7
`;

const DOUBLURE_HAPROXY = String.raw`#!/bin/sh
# Doublure du client du socket HAProxy : le script l'appelle par
# « python3 -c <code> <socket> <commande> ». Statut de chaque serveur dans
# $BAC/etat/haproxy/<serveur>, en colonne 18 comme le vrai « show stat ».
echo "haproxy $4" >> "$BAC/journal"
e="$BAC/etat"
case "$4" in
  "show stat")
    echo "# pxname,svname,qcur,qmax,scur,smax,slim,stot,bin,bout,dreq,dresp,ereq,econ,eresp,wretr,wredis,status,weight"
    for f in "$e"/haproxy/*; do
      [ -f "$f" ] || continue
      echo "$(cat "$e/backend"),$(basename "$f"),0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,$(cat "$f"),1"
    done
    ;;
  "set server "*" state ready")
    s="$(echo "$4" | sed -E 's#^set server [^/]+/([^ ]+) state ready$#\1#')"
    [ -f "$e/haproxy-fige" ] || echo UP > "$e/haproxy/$s"
    ;;
esac
exit 0
`;

const DOUBLURE_FLOCK = String.raw`#!/bin/sh
echo "flock $*" >> "$BAC/journal"
[ -f "$BAC/etat/verrou-pris" ] && exit 1
exit 0
`;

const DOUBLURE_DUMP = String.raw`#!/bin/sh
echo "dump-securite $*" >> "$BAC/journal"
[ -f "$BAC/etat/dump-echoue" ] && exit 2
exit 0
`;

function doublureMuette(nom: string): string {
  return `#!/bin/sh\necho "${nom} $*" >> "$BAC/journal"\nexit 0\n`;
}

type Pile = "demo" | "prod";

type Scenario = {
  pile?: Pile;
  /** Couleur applicative en service au départ ; l'unité recrée toujours a. */
  couleur?: "a" | "b";
  /** Version de la base en service. */
  versionAvant?: string;
  /** Version de l'image que sert le registre. */
  versionDistante?: string;
  /** Identifiant de l'image que sert le registre. */
  imageDistante?: string;
  /** Statut de chaque serveur côté HAProxy ; absent : pas de socket. */
  haproxy?: Record<string, string>;
  /** Fichiers d'état en plus ou à la place, chemin relatif vers contenu. */
  etat?: Record<string, string>;
  /** Lignes du .env de la pile, à la place de celles par défaut. */
  env?: string[];
};

const bacs: string[] = [];
const sockets: Server[] = [];

function noms(pile: Pile) {
  const projet = `humanix-${pile}`;
  return {
    projet,
    unite: `podman-compose@${projet}`,
    pod: `pod_${projet}`,
    pg: `${projet}-postgres`,
    tts: `${projet}-tts`,
    a: `${projet}-app`,
    b: `${projet}-appb`,
    vector: `${projet}_vector_1`,
    volume: `humanix_${pile}_pg`,
    portA: pile === "prod" ? 3000 : 3001,
    portB: pile === "prod" ? 3010 : 3011,
  };
}

function creerBac(scenario: Scenario = {}): string {
  const pile = scenario.pile ?? "demo";
  const n = noms(pile);
  // Le chemin d'un socket Unix est borné à une centaine d'octets : un
  // répertoire temporaire profond (macOS, certains exécuteurs) repasse par
  // /tmp plutôt que de faire échouer le socket de HAProxy.
  const racine = tmpdir().length > 60 ? "/tmp" : tmpdir();
  const bac = mkdtempSync(join(racine, "upg-"));
  bacs.push(bac);

  const repertoire = join(bac, pile);
  mkdirSync(repertoire);
  writeFileSync(
    join(repertoire, ".env"),
    (
      scenario.env ?? [
        `STACK=${pile}`,
        "CONTAINER_ENGINE=podman",
        `APP_HOST_PORT=${n.portA}`,
        "COMPOSE_FILE=docker-compose.humanix.yml",
        `NEXT_PUBLIC_APP_URL=https://${pile}.exemple.test`,
      ]
    )
      .concat("")
      .join("\n"),
  );

  const couleur = scenario.couleur === "b" ? n.b : n.a;
  const annexes = pile === "prod" ? [n.tts, n.vector] : [n.tts];
  const presents = [n.pg, ...annexes, couleur];
  // Ce que l'unité crée : toujours la couleur a.
  const pileCreee = [n.pg, ...annexes, n.a];
  const lignes = (l: string[]) => l.map((x) => `${x}\n`).join("");

  const etat: Record<string, string> = {
    pg: `${n.pg}\n`,
    "nom-image": `${IMAGE}\n`,
    presents: lignes(presents),
    "en-service": lignes(presents),
    "hors-du-pod": "",
    pod: "",
    unite: "active\n",
    pile: lignes(pileCreee),
    "projet-pile": `${n.projet}\n`,
    [`image/${n.pg}`]: `${ANCIENNE}\n`,
    tag: `${ANCIENNE}\n`,
    distant: `${scenario.imageDistante ?? NOUVELLE}\n`,
    [`versions/${ANCIENNE}`]: `${scenario.versionAvant ?? "16.13"}\n`,
    [`versions/${NOUVELLE}`]: `${scenario.versionDistante ?? "16.16"}\n`,
    volume: `${n.volume}\n`,
    "volume-existe": "",
    [`ports/${n.a}`]: `127.0.0.1:${n.portA}\n`,
    [`ports/${n.b}`]: `127.0.0.1:${n.portB}\n`,
    canari: "5|2\n",
    "code-arret-pg": "0\n",
    "journal-pg": "LOG:  database system is shut down\n",
    muets: "",
    backend: `backend_${pile}\n`,
    "pg-muette/.garde": "",
    "app-muette/.garde": "",
    "haproxy/.garde": "",
  };
  for (const c of new Set([...presents, ...pileCreee])) {
    etat[`projet/${c}`] = `${n.projet}\n`;
  }
  for (const [serveur, statut] of Object.entries(scenario.haproxy ?? {})) {
    etat[`haproxy/${serveur}`] = `${statut}\n`;
  }
  Object.assign(etat, scenario.etat ?? {});
  for (const [chemin, contenu] of Object.entries(etat)) {
    const cible = join(bac, "etat", chemin);
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, contenu);
  }
  // Le fichier de garde n'est pas un serveur HAProxy.
  rmSync(join(bac, "etat", "haproxy", ".garde"));

  writeFileSync(join(bac, "journal"), "");

  // Un vrai socket, pour que « [ -S ] » dise vrai ; c'est la doublure de
  // python3 qui répond à sa place.
  if (scenario.haproxy) {
    const chemin = join(bac, "h.sock");
    const serveur = createServer();
    serveur.listen(chemin);
    sockets.push(serveur);
    if (!statSync(chemin).isSocket()) {
      throw new Error(`socket de test non créé : ${chemin}`);
    }
  }

  const bin = join(bac, "bin");
  mkdirSync(bin);
  const doublures: Record<string, string> = {
    podman: DOUBLURE_PODMAN,
    systemctl: DOUBLURE_SYSTEMCTL,
    curl: DOUBLURE_CURL,
    python3: DOUBLURE_HAPROXY,
    flock: DOUBLURE_FLOCK,
    sleep: doublureMuette("sleep"),
    "dump-securite": DOUBLURE_DUMP,
  };
  for (const [nom, contenu] of Object.entries(doublures)) {
    writeFileSync(join(bin, nom), contenu);
    chmodSync(join(bin, nom), 0o755);
  }
  return bac;
}

type Resultat = {
  code: number | null;
  /** Sortie standard et sortie d'erreur du script. */
  sortie: string;
  /** Un appel de doublure par ligne, dans l'ordre. */
  journal: string[];
  /** Identifiant de l'image que désigne le tag à la fin. */
  tag: string;
};

function lancer(bac: string, args: string[], entree = ""): Resultat {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    input: entree,
    env: {
      ...process.env,
      PATH: `${join(bac, "bin")}:${process.env.PATH ?? ""}`,
      BAC: bac,
      HUMANIX_DEMO_DIR: join(bac, "demo"),
      HUMANIX_PROD_DIR: join(bac, "prod"),
      HUMANIX_PG_LOCK: join(bac, "verrou"),
      HUMANIX_DEMO_LOCK: join(bac, "verrou-demo"),
      HUMANIX_HAPROXY_SOCKET: join(bac, "h.sock"),
      HUMANIX_DUMP_SECURITE: join(bac, "bin", "dump-securite"),
      // Quelques tours d'attente ; la doublure de sleep rend la main aussitôt.
      HUMANIX_PG_WAIT: "3",
      HUMANIX_HEALTH_WAIT: "9",
    },
  });
  return {
    code: r.status,
    sortie: `${r.stdout}${r.stderr}`,
    journal: readFileSync(join(bac, "journal"), "utf8")
      .split("\n")
      .filter(Boolean),
    tag: readFileSync(join(bac, "etat", "tag"), "utf8").trim(),
  };
}

/** Rang du premier appel égal à `ligne` ; -1 s'il n'a pas eu lieu. */
function rang(r: Resultat, ligne: string): number {
  return r.journal.indexOf(ligne);
}

/** Nombre d'appels égaux à `ligne`. */
function fois(r: Resultat, ligne: string): number {
  return r.journal.filter((l) => l === ligne).length;
}

/** Vrai dès que le script a arrêté ou retiré quoi que ce soit. */
function aArrete(r: Resultat): boolean {
  return r.journal.some((l) =>
    /^(podman (stop|pod stop|pod rm)|systemctl --user (stop|start)) /.test(l),
  );
}

afterEach(() => {
  for (const serveur of sockets.splice(0)) {
    serveur.close();
  }
  for (const bac of bacs.splice(0)) {
    rmSync(bac, { recursive: true, force: true });
  }
});

describe.skipIf(!BASH_DISPONIBLE)(
  "update-postgres.sh",
  // Chaque scénario lance le script et quelques dizaines de doublures : une
  // demi-seconde d'ordinaire, davantage sur un exécuteur de CI chargé.
  { timeout: 30_000 },
  () => {
    describe("le renouvellement", () => {
      it("retire l'image, arrête dans l'ordre, retire le pod et relance l'unité", () => {
        const n = noms("demo");
        const bac = creerBac();

        const r = lancer(bac, ["demo"]);

        expect(r.sortie).toContain(
          "OK : PostgreSQL 16.13 -> 16.16 sur la pile demo",
        );
        expect(r.code).toBe(0);
        const etapes = [
          `podman pull ${IMAGE}`,
          `podman tag ${ANCIENNE} localhost/humanix-postgres-precedent:16.13`,
          `podman stop -t 30 ${n.a}`,
          `podman stop -t 60 ${n.pg}`,
          `systemctl --user stop ${n.unite}`,
          `podman pod rm ${n.pod}`,
          `systemctl --user start ${n.unite}`,
        ].map((ligne) => rang(r, ligne));
        expect(etapes).not.toContain(-1);
        expect(etapes).toEqual([...etapes].sort((x, y) => x - y));
        expect(r.tag).toBe(NOUVELLE);
        expect(r.sortie).toContain("base verifiee : PostgreSQL 16.16");
        expect(r.sortie).toContain("l'application repond sur 127.0.0.1:3001");
      });

      it("ne prend pas d'instantané pour la démo", () => {
        const r = lancer(creerBac(), ["demo"]);

        expect(r.code).toBe(0);
        expect(r.journal.some((l) => l.startsWith("dump-securite"))).toBe(
          false,
        );
      });

      it("prend l'instantané chiffré de la production avant le premier arrêt", () => {
        const n = noms("prod");
        const bac = creerBac({ pile: "prod" });

        const r = lancer(bac, ["prod", "--yes"]);

        expect(r.code).toBe(0);
        const instantane = rang(r, "dump-securite avant-postgres-16.16");
        expect(instantane).toBeGreaterThan(rang(r, `podman pull ${IMAGE}`));
        expect(instantane).toBeLessThan(rang(r, `podman stop -t 30 ${n.a}`));
        expect(r.sortie).toContain("l'application repond sur 127.0.0.1:3000");
      });

      it("renouvelle aussi quand seule l'image change, à version égale", () => {
        const bac = creerBac({ versionDistante: "16.13" });

        const r = lancer(bac, ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("OK : PostgreSQL 16.13 -> 16.13");
        expect(aArrete(r)).toBe(true);
      });

      it("suit le conteneur, pas le retrait : le tag déjà à jour ne suffit pas", () => {
        // La démo a été renouvelée d'abord : le tag commun désigne déjà la
        // nouvelle image, mais la base de la production tourne sur l'ancienne.
        const n = noms("prod");
        const bac = creerBac({ pile: "prod", etat: { tag: `${NOUVELLE}\n` } });

        const r = lancer(bac, ["prod", "--yes"]);

        expect(r.code).toBe(0);
        expect(rang(r, `podman pod rm ${n.pod}`)).toBeGreaterThan(-1);
        expect(r.sortie).toContain(
          "OK : PostgreSQL 16.13 -> 16.16 sur la pile prod",
        );
      });

      it("compare des identifiants d'image nus, que podman les préfixe ou non", () => {
        // Un préfixe sha256 d'un seul côté ferait dire que la base n'est pas
        // sur la bonne image, donc défaire un renouvellement réussi.
        const bac = creerBac({ etat: { "prefixe-sha256": "" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("base verifiee : PostgreSQL 16.16");
        expect(r.sortie).not.toContain("RETOUR ARRIERE");
      });

      it("reconnaît une base déjà à jour malgré un préfixe sha256", () => {
        const bac = creerBac({
          imageDistante: ANCIENNE,
          etat: { "prefixe-sha256": "" },
        });

        const r = lancer(bac, ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("rien a faire");
        expect(aArrete(r)).toBe(false);
      });

      it("ne fait rien quand la base tourne déjà sur l'image du tag", () => {
        const bac = creerBac({ imageDistante: ANCIENNE });

        const r = lancer(bac, ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("rien a faire");
        expect(aArrete(r)).toBe(false);
      });

      it("ramène la couleur a quand la pile servait en couleur b", () => {
        const n = noms("demo");
        const bac = creerBac({ couleur: "b" });

        const r = lancer(bac, ["demo"]);

        expect(r.code).toBe(0);
        expect(rang(r, `podman stop -t 30 ${n.b}`)).toBeGreaterThan(-1);
        expect(r.sortie).toContain("l'application repond sur 127.0.0.1:3001");
        expect(r.sortie).toContain(`La pile est revenue en ${n.a},`);
      });
    });

    describe("la confirmation en production", () => {
      it("n'arrête rien sans un oui", () => {
        const bac = creerBac({ pile: "prod" });

        const r = lancer(bac, ["prod"], "non\n");

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("de 16.13 a 16.16 ?");
        expect(r.sortie).toContain("abandon : rien n'a ete arrete");
        expect(aArrete(r)).toBe(false);
        expect(r.journal.some((l) => l.startsWith("dump-securite"))).toBe(
          false,
        );
      });

      it("n'arrête rien si personne ne répond", () => {
        const r = lancer(creerBac({ pile: "prod" }), ["prod"], "");

        expect(r.code).toBe(0);
        expect(aArrete(r)).toBe(false);
      });

      it("part sur un oui", () => {
        const r = lancer(creerBac({ pile: "prod" }), ["prod"], "oui\n");

        expect(r.code).toBe(0);
        expect(r.sortie).toContain(
          "OK : PostgreSQL 16.13 -> 16.16 sur la pile prod",
        );
      });
    });

    describe("--dry-run", () => {
      it("montre l'état et le plan, sans rien retirer ni arrêter", () => {
        const n = noms("demo");
        const bac = creerBac();

        const r = lancer(bac, ["demo", "--dry-run"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("PostgreSQL 16.13");
        expect(r.sortie).toContain(`podman pod rm ${n.pod}`);
        expect(r.sortie).toContain("--dry-run : rien n'a ete touche");
        expect(aArrete(r)).toBe(false);
        expect(r.journal.some((l) => /^podman (pull|tag) /.test(l))).toBe(
          false,
        );
        expect(r.tag).toBe(ANCIENNE);
      });
    });

    describe("les refus, avant le premier arrêt", () => {
      it.each<[string, Scenario, string]>([
        [
          "un .env qui déclare une autre pile",
          { env: ["STACK=prod", "CONTAINER_ENGINE=podman"] },
          "ne declare pas STACK=demo",
        ],
        [
          "une unité inactive",
          { etat: { unite: "inactive\n" } },
          "n'est pas active",
        ],
        [
          "un conteneur étranger dans le pod",
          { etat: { "projet/humanix-demo-tts": "autre-projet\n" } },
          "conteneurs etrangers a humanix-demo : humanix-demo-tts",
        ],
        [
          "un conteneur de la pile hors du pod",
          { etat: { "hors-du-pod": "humanix-demo-tts\n" } },
          "hors du pod pod_humanix-demo : humanix-demo-tts",
        ],
        [
          "une base montée sur un autre volume",
          { etat: { volume: "humanix-demo_postgres_data\n" } },
          "n'est pas sur le volume attendu (humanix_demo_pg)",
        ],
        [
          "une image épinglée par digest",
          {
            etat: {
              "nom-image": `docker.io/library/postgres@sha256:${NOUVELLE}\n`,
            },
          },
          "epinglee par digest",
        ],
        [
          "une base qui ne répond pas",
          { etat: { [`versions/${ANCIENNE}`]: "\n" } },
          "version du serveur illisible",
        ],
        [
          "un renouvellement déjà en cours",
          { etat: { "verrou-pris": "" } },
          "deja en cours",
        ],
      ])("refuse %s", (_cas, scenario, message) => {
        const r = lancer(creerBac(scenario), ["demo"]);

        expect(r.sortie).toContain(message);
        expect(r.sortie).toContain("rien n'a ete arrete");
        expect(r.code).not.toBe(0);
        expect(aArrete(r)).toBe(false);
        expect(r.journal.some((l) => l.startsWith("podman pull"))).toBe(false);
      });

      it("refuse une pile sans couleur applicative en service", () => {
        const n = noms("demo");
        const bac = creerBac({
          etat: { "en-service": `${n.pg}\n${n.tts}\n` },
        });

        const r = lancer(bac, ["demo"]);

        expect(r.sortie).toContain("aucune couleur applicative ne tourne");
        expect(r.code).not.toBe(0);
        expect(aArrete(r)).toBe(false);
      });

      it.each([
        [
          "un changement de version majeure",
          "17.2",
          "changement de version majeure",
        ],
        [
          "une image plus ancienne que la base",
          "16.9",
          "plus ancienne que la base",
        ],
      ])("refuse %s et remet le tag", (_cas, versionDistante, message) => {
        const bac = creerBac({ versionDistante });

        const r = lancer(bac, ["demo"]);

        expect(r.sortie).toContain(message);
        expect(r.code).not.toBe(0);
        expect(aArrete(r)).toBe(false);
        // Le retrait a déplacé le tag : laissé là, le prochain démarrage de
        // l'hôte après une livraison prendrait cette image sans prévenir.
        expect(r.tag).toBe(ANCIENNE);
        expect(r.sortie).not.toContain("L'image retiree reste sous le tag");
      });

      it("n'arrête rien si l'instantané de la production échoue", () => {
        const bac = creerBac({ pile: "prod", etat: { "dump-echoue": "" } });

        const r = lancer(bac, ["prod", "--yes"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("etape « instantane de securite »");
        expect(aArrete(r)).toBe(false);
        // Rien n'est arrêté, mais le tag a bougé : le script le dit.
        expect(r.tag).toBe(NOUVELLE);
        expect(r.sortie).toContain("L'image retiree reste sous le tag");
      });

      it("n'arrête rien si le registre ne répond pas", () => {
        const bac = creerBac({ etat: { "retrait-echoue": "" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("etape « retrait de l'image »");
        expect(aArrete(r)).toBe(false);
      });
    });

    describe("quand un geste échoue", () => {
      it("relance la pile sans la remplacer si PostgreSQL s'arrête mal", () => {
        const n = noms("demo");
        const bac = creerBac({
          etat: {
            "code-arret-pg": "137\n",
            "journal-pg": "LOG:  checkpoint starting\n",
          },
        });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("ne s'est pas arrete proprement (code 137)");
        expect(rang(r, `podman pod rm ${n.pod}`)).toBe(-1);
        expect(rang(r, `podman pod start ${n.pod}`)).toBeGreaterThan(-1);
        expect(r.sortie).toContain("la pile est revenue, PostgreSQL 16.13");
      });

      it("se fie au journal de PostgreSQL quand le code d'arrêt ne dit rien", () => {
        const bac = creerBac({ etat: { "code-arret-pg": "137\n" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("PostgreSQL arrete proprement");
      });

      it("revient à l'image d'avant si la nouvelle base ne démarre pas", () => {
        const n = noms("demo");
        const bac = creerBac({ etat: { [`pg-muette/${NOUVELLE}`]: "" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("etape « attente de PostgreSQL »");
        expect(rang(r, `podman tag ${ANCIENNE} ${IMAGE}`)).toBeGreaterThan(
          rang(r, `podman pod rm ${n.pod}`),
        );
        expect(fois(r, `systemctl --user start ${n.unite}`)).toBe(2);
        expect(r.tag).toBe(ANCIENNE);
        expect(r.sortie).toContain(
          "RETOUR ARRIERE reussi : la pile tourne de nouveau en PostgreSQL 16.13",
        );
      });

      it("revient à l'image d'avant si l'application ne suit pas", () => {
        const bac = creerBac({ etat: { [`app-muette/${NOUVELLE}`]: "" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("etape « attente de l'application »");
        expect(r.tag).toBe(ANCIENNE);
        expect(r.sortie).toContain("RETOUR ARRIERE reussi");
      });

      it("revient à l'image d'avant si le serveur ne répond pas dans la version de l'image", () => {
        // Le conteneur est bien sur la nouvelle image, mais c'est un serveur
        // 16.13 qui répond : le remplacement n'a pas eu lieu, quoi qu'en dise
        // l'identifiant.
        const bac = creerBac({
          etat: { [`version-serveur/${NOUVELLE}`]: "16.13\n" },
        });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain(
          "le serveur repond en version « 16.13 », 16.16 attendue",
        );
        expect(r.tag).toBe(ANCIENNE);
        expect(r.sortie).toContain("RETOUR ARRIERE reussi");
      });

      it("revient à l'image d'avant si le retrait du pod échoue", () => {
        const bac = creerBac({ etat: { "retrait-pod-echoue": "" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("etape « retrait du pod »");
        expect(rang(r, `podman tag ${ANCIENNE} ${IMAGE}`)).toBeGreaterThan(-1);
        expect(r.tag).toBe(ANCIENNE);
      });

      it("dit que le retour arrière est incomplet quand la base revenue n'est pas la même", () => {
        const bac = creerBac({ etat: { "canari-apres": "0|0\n" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain(
          "le canari a change : « 0|0 » au lieu de « 5|2 »",
        );
        expect(r.sortie).toContain("RETOUR ARRIERE INCOMPLET");
        expect(r.sortie).not.toContain("RETOUR ARRIERE reussi");
      });

      it("dit que le retour arrière est incomplet quand l'unité ne repart pas", () => {
        const bac = creerBac({ etat: { "demarrage-echoue": "" } });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("etape « recreation de la pile »");
        expect(r.sortie).toContain("RETOUR ARRIERE INCOMPLET");
        expect(r.sortie).toContain(
          "Le volume humanix_demo_pg n'a pas ete touche",
        );
      });

      it("ne relance rien si le volume de la base a disparu", () => {
        const n = noms("demo");
        const bac = creerBac();
        // Cas d'école : podman ne trouve plus le volume, le pod une fois retiré.
        rmSync(join(bac, "etat", "volume-existe"));

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("NE RIEN RELANCER");
        expect(rang(r, `systemctl --user start ${n.unite}`)).toBe(-1);
      });
    });

    describe("HAProxy", () => {
      it("remet à ready la couleur revenue, laissée en drain par une livraison", () => {
        const n = noms("demo");
        const bac = creerBac({
          couleur: "b",
          haproxy: { demo_a: "DRAIN", demo_b: "UP" },
        });

        const r = lancer(bac, ["demo"]);

        expect(r.sortie).toContain(
          "HAProxy pilotable : demo_a=DRAIN demo_b=UP",
        );
        expect(r.code).toBe(0);
        const pret = rang(
          r,
          "haproxy set server backend_demo/demo_a state ready",
        );
        expect(pret).toBeGreaterThan(
          rang(r, `systemctl --user start ${n.unite}`),
        );
        expect(r.sortie).toContain("HAProxy : demo_a est UP");
      });

      it("échoue sans retour arrière si HAProxy ne voit pas monter la couleur", () => {
        const n = noms("demo");
        const bac = creerBac({
          haproxy: { demo_a: "DRAIN", demo_b: "DOWN" },
          etat: { "haproxy-fige": "" },
        });

        const r = lancer(bac, ["demo"]);

        expect(r.code).not.toBe(0);
        expect(r.sortie).toContain("HAProxy : demo_a est « DRAIN » apres 15s");
        expect(r.sortie).toContain("mais HAProxy ne la sert pas");
        // La base est renouvelée et vérifiée : la défaire n'arrangerait rien.
        expect(fois(r, `podman pod rm ${n.pod}`)).toBe(1);
        expect(r.tag).toBe(NOUVELLE);
      });

      it("prévient et termine quand HAProxy n'est pas pilotable", () => {
        const r = lancer(creerBac(), ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain("ATTENTION : HAProxy non pilotable");
        expect(r.journal.some((l) => l.startsWith("haproxy set server"))).toBe(
          false,
        );
      });

      it("signale un nom public qui ne répond pas, sans échouer", () => {
        const r = lancer(creerBac(), ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain(
          "ATTENTION : https://demo.exemple.test/api/health ne repond pas depuis l'hote",
        );
      });

      it("note le contrôle public quand il répond", () => {
        const r = lancer(creerBac({ etat: { "public-ok": "" } }), ["demo"]);

        expect(r.code).toBe(0);
        expect(r.sortie).toContain(
          "controle public : https://demo.exemple.test/api/health repond",
        );
      });
    });

    it("refuse un appel sans pile, avant de toucher à quoi que ce soit", () => {
      const bac = creerBac();

      const r = lancer(bac, ["--yes"]);

      expect(r.code).toBe(1);
      expect(r.sortie).toContain("usage :");
      expect(r.journal).toEqual([]);
    });
  },
);
