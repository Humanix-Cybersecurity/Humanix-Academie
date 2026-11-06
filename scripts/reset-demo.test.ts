// SPDX-License-Identifier: AGPL-3.0-or-later
//
// reset-demo.sh arrête la démo, vide sa base et la relance : impossible de le
// lancer contre un vrai podman dans la suite. On l'exécute donc pour de bon,
// avec bash, dans un bac à sable où podman, podman-compose, curl, flock et
// sleep sont des doublures. Chaque doublure journalise son appel et répond
// d'après de petits fichiers d'état : quels conteneurs tournent, quel port
// chacun publie, lesquels restent muets.
//
// Ce que ces tests protègent : le port sur lequel le script attend le retour
// de l'application. Il le lisait dans .humanix-deployed, que deploy.sh écrit
// à chaque livraison mais qu'un redémarrage de l'hôte ne réécrit pas. Le
// 2026-11-06, après un redémarrage, ce fichier annonçait le port de la
// couleur b alors que la pile était revenue en couleur a.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(import.meta.dirname, "reset-demo.sh");
const BASH_DISPONIBLE = spawnSync("bash", ["-c", "exit 0"]).status === 0;

const A = "humanix-demo-app";
const B = "humanix-demo-appb";
const POSTGRES = "humanix-demo-postgres";

// La trace d'une livraison en couleur b, restée telle quelle après un
// redémarrage de l'hôte qui a ramené la pile en couleur a.
const TRACE_COULEUR_B = "commit=0123abc\ncouleur=b\nport=3011\n";
const TRACE_COULEUR_A = "commit=0123abc\ncouleur=a\nport=3001\n";

// Les doublures sont écrites sans la forme dollar-accolade, que String.raw
// prendrait pour une interpolation.
const DOUBLURE_PODMAN = String.raw`#!/bin/sh
# Doublure de podman : journalise l'appel, répond d'après $BAC/etat.
echo "podman $*" >> "$BAC/journal"
etat="$BAC/etat"
case "$1" in
  ps)
    if [ "$2" = "-a" ]; then cat "$etat/presents"; else cat "$etat/en-service"; fi
    ;;
  port)
    # Comme le vrai podman (lu dans son source, 5.4.0) : un conteneur arrêté
    # est passé sous silence, sans erreur. Un script qui demanderait le port
    # après avoir arrêté la démo n'obtiendrait rien.
    grep -qx "$2" "$etat/en-service" || exit 0
    cat "$etat/reponse-port/$2"
    ;;
  stop)
    for nom; do :; done
    grep -vx "$nom" "$etat/en-service" > "$etat/en-service.tmp"
    mv "$etat/en-service.tmp" "$etat/en-service"
    ;;
  start)
    echo "$2" >> "$etat/en-service"
    ;;
  exec)
    case "$*" in
      *count*) printf '12\n2\n3\n5\n80\n' ;;
    esac
    ;;
esac
exit 0
`;

const DOUBLURE_CURL = String.raw`#!/bin/sh
# Doublure de curl : /api/health ne répond que sur le port d'un conteneur
# qui tourne et que le scénario n'a pas rendu muet.
echo "curl $*" >> "$BAC/journal"
for url; do :; done
port="$(echo "$url" | sed -E 's#^http://127\.0\.0\.1:([0-9]+)/api/health$#\1#')"
nom="$(grep -E " $port\$" "$BAC/etat/ports" | cut -d' ' -f1)"
if [ -n "$nom" ] && grep -qx "$nom" "$BAC/etat/en-service" \
  && ! grep -qx "$port" "$BAC/etat/muets"; then
  echo '{"status":"ok"}'
  exit 0
fi
exit 7
`;

function doublureMuette(nom: string): string {
  return `#!/bin/sh\necho "${nom} $*" >> "$BAC/journal"\nexit 0\n`;
}

type Couleur = {
  nom: string;
  /** Port publié sur l'hôte. */
  port: number;
  /** Ce que répond « podman port » ; par défaut la forme courte. */
  reponsePort?: string;
  /** Faux pour une couleur présente mais arrêtée. */
  enService?: boolean;
  /** Vrai si /api/health ne doit jamais répondre sur son port. */
  muette?: boolean;
};

type Scenario = {
  couleurs: Couleur[];
  /** Contenu de .humanix-deployed ; null pour ne pas créer le fichier. */
  trace: string | null;
};

const bacs: string[] = [];

function creerBac(scenario: Scenario): string {
  const bac = mkdtempSync(join(tmpdir(), "reset-demo-"));
  bacs.push(bac);

  const demo = join(bac, "demo");
  mkdirSync(demo);
  writeFileSync(
    join(demo, ".env"),
    [
      "STACK=demo",
      "DEMO_MODE=true",
      "CONTAINER_ENGINE=podman",
      "APP_HOST_PORT=3001",
      "COMPOSE_FILE=docker-compose.humanix.yml",
      "",
    ].join("\n"),
  );
  writeFileSync(join(demo, "docker-compose.humanix.yml"), "");
  if (scenario.trace !== null) {
    writeFileSync(join(demo, ".humanix-deployed"), scenario.trace);
  }

  const etat = join(bac, "etat");
  mkdirSync(join(etat, "reponse-port"), { recursive: true });
  const lignes = (noms: string[]) => noms.map((n) => `${n}\n`).join("");
  const tournent = scenario.couleurs.filter((c) => c.enService !== false);
  writeFileSync(
    join(etat, "presents"),
    lignes([POSTGRES, ...scenario.couleurs.map((c) => c.nom)]),
  );
  writeFileSync(
    join(etat, "en-service"),
    lignes([POSTGRES, ...tournent.map((c) => c.nom)]),
  );
  writeFileSync(
    join(etat, "ports"),
    lignes(scenario.couleurs.map((c) => `${c.nom} ${c.port}`)),
  );
  writeFileSync(
    join(etat, "muets"),
    lignes(scenario.couleurs.filter((c) => c.muette).map((c) => `${c.port}`)),
  );
  for (const c of scenario.couleurs) {
    writeFileSync(
      join(etat, "reponse-port", c.nom),
      c.reponsePort ?? `127.0.0.1:${c.port}\n`,
    );
  }

  writeFileSync(join(bac, "journal"), "");
  writeFileSync(join(bac, "cron.log"), "");

  const bin = join(bac, "bin");
  mkdirSync(bin);
  const doublures: Record<string, string> = {
    podman: DOUBLURE_PODMAN,
    curl: DOUBLURE_CURL,
    "podman-compose": doublureMuette("podman-compose"),
    flock: doublureMuette("flock"),
    sleep: doublureMuette("sleep"),
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
  /** Ce que le script a écrit dans cron.log. */
  synthese: string;
};

function lancer(bac: string, ...args: string[]): Resultat {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(bac, "bin")}:${process.env.PATH ?? ""}`,
      BAC: bac,
      HUMANIX_DEMO_DIR: join(bac, "demo"),
      HUMANIX_CRON_LOG: join(bac, "cron.log"),
      HUMANIX_DEMO_LOCK: join(bac, "verrou"),
      // Trois tours d'attente ; la doublure de sleep rend la main aussitôt.
      HUMANIX_HEALTH_WAIT: "9",
    },
  });
  return {
    code: r.status,
    sortie: `${r.stdout}${r.stderr}`,
    journal: readFileSync(join(bac, "journal"), "utf8")
      .split("\n")
      .filter(Boolean),
    synthese: readFileSync(join(bac, "cron.log"), "utf8"),
  };
}

/** Les ports sur lesquels le script a sondé /api/health, sans doublon. */
function portsSondes(r: Resultat): string[] {
  const ports = r.journal
    .filter((l) => l.startsWith("curl "))
    .map((l) => /127\.0\.0\.1:(\d+)\/api\/health/.exec(l)?.[1] ?? "?");
  return [...new Set(ports)].sort();
}

function aTouche(r: Resultat): boolean {
  return r.journal.some((l) =>
    /^(podman (stop|start|exec)|podman-compose) /.test(l),
  );
}

afterEach(() => {
  for (const bac of bacs.splice(0)) {
    rmSync(bac, { recursive: true, force: true });
  }
});

describe.skipIf(!BASH_DISPONIBLE)(
  "reset-demo.sh : où attendre le retour de l'application",
  // Chaque scénario lance le script et quelques dizaines de doublures : une
  // demi-seconde d'ordinaire, davantage sur un exécuteur de CI chargé.
  { timeout: 30_000 },
  () => {
    it("attend sur le port de la couleur relancée, pas sur celui de la trace", () => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001 }],
        trace: TRACE_COULEUR_B,
      });

      const r = lancer(bac);

      expect(r.sortie).toContain("la demo repond sur 127.0.0.1:3001");
      expect(portsSondes(r)).toEqual(["3001"]);
      expect(r.code).toBe(0);
      expect(r.journal).toContain(`podman stop -t 30 ${A}`);
      expect(r.journal).toContain(`podman start ${A}`);
      expect(r.synthese).toContain("[demo-reset] OK 200 en");
      expect(r.synthese).toContain("personas=5 saisons=80");
    });

    it("demande le port à podman avant d'arrêter quoi que ce soit", () => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001 }],
        trace: TRACE_COULEUR_B,
      });

      const r = lancer(bac);

      const demande = r.journal.indexOf(`podman port ${A} 3000/tcp`);
      const arret = r.journal.indexOf(`podman stop -t 30 ${A}`);
      expect(demande).toBeGreaterThanOrEqual(0);
      expect(arret).toBeGreaterThan(demande);
    });

    it("suit la couleur b quand c'est elle qui sert", () => {
      const bac = creerBac({
        couleurs: [
          { nom: A, port: 3001, enService: false },
          { nom: B, port: 3011 },
        ],
        trace: TRACE_COULEUR_A,
      });

      const r = lancer(bac);

      expect(portsSondes(r)).toEqual(["3011"]);
      expect(r.code).toBe(0);
      expect(r.journal).toContain(`podman start ${B}`);
      expect(r.journal).not.toContain(`podman start ${A}`);
    });

    it("se passe du fichier de trace", () => {
      const bac = creerBac({
        couleurs: [{ nom: B, port: 3011 }],
        trace: null,
      });

      const r = lancer(bac);

      expect(portsSondes(r)).toEqual(["3011"]);
      expect(r.code).toBe(0);
    });

    it.each([
      ["la forme longue", "3000/tcp -> 127.0.0.1:3001\n"],
      ["une adresse IPv6", "::1:3001\n"],
      ["deux adresses pour le même port", "0.0.0.0:3001\n:::3001\n"],
    ])("comprend %s dans la réponse de podman", (_cas, reponsePort) => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001, reponsePort }],
        trace: TRACE_COULEUR_B,
      });

      const r = lancer(bac);

      expect(portsSondes(r)).toEqual(["3001"]);
      expect(r.code).toBe(0);
    });

    it("attend chacune des couleurs relancées", () => {
      const bac = creerBac({
        couleurs: [
          { nom: A, port: 3001 },
          { nom: B, port: 3011 },
        ],
        trace: TRACE_COULEUR_A,
      });

      const r = lancer(bac);

      expect(portsSondes(r)).toEqual(["3001", "3011"]);
      expect(r.code).toBe(0);
      expect(r.journal).toContain(`podman start ${A}`);
      expect(r.journal).toContain(`podman start ${B}`);
    });

    it("échoue si l'une des couleurs relancées reste muette", () => {
      const bac = creerBac({
        couleurs: [
          { nom: A, port: 3001 },
          { nom: B, port: 3011, muette: true },
        ],
        trace: TRACE_COULEUR_A,
      });

      const r = lancer(bac);

      expect(r.code).not.toBe(0);
      expect(r.sortie).toContain("la demo ne repond pas sur 127.0.0.1:3011");
      expect(r.synthese).toContain("[demo-reset] ECHEC");
      expect(r.synthese).toContain("etape=attente de la reponse");
    });

    it.each([
      ["ne dit rien du port", ""],
      ["répond autre chose qu'un port", "Error: no such container\n"],
    ])("ne touche à rien quand podman %s", (_cas, reponsePort) => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001, reponsePort }],
        trace: TRACE_COULEUR_A,
      });

      const r = lancer(bac);

      expect(r.code).not.toBe(0);
      expect(aTouche(r)).toBe(false);
      expect(r.sortie).toContain("rien n'a ete touche");
      expect(r.synthese).toContain("[demo-reset] ECHEC");
      expect(r.synthese).toContain("etape=garde-fous");
    });

    it("refuse de partir quand aucune couleur ne tourne", () => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001, enService: false }],
        trace: TRACE_COULEUR_A,
      });

      const r = lancer(bac);

      expect(r.code).not.toBe(0);
      expect(r.sortie).toContain("aucune couleur applicative ne tourne");
      expect(r.journal.some((l) => l.startsWith("podman port "))).toBe(false);
      expect(aTouche(r)).toBe(false);
      expect(r.synthese).toContain("etape=garde-fous");
    });

    it("signale l'échec quand la couleur relancée ne répond pas", () => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001, muette: true }],
        trace: TRACE_COULEUR_A,
      });

      const r = lancer(bac);

      expect(r.code).not.toBe(0);
      expect(r.journal).toContain(`podman start ${A}`);
      expect(r.sortie).toContain("la demo ne repond pas sur 127.0.0.1:3001");
      expect(r.synthese).toContain("etape=attente de la reponse");
    });

    it("--dry-run annonce le port réel et ne touche à rien", () => {
      const bac = creerBac({
        couleurs: [{ nom: A, port: 3001 }],
        trace: TRACE_COULEUR_B,
      });

      const r = lancer(bac, "--dry-run");

      expect(r.code).toBe(0);
      expect(r.sortie).toContain(
        `podman start ${A}, puis attente de http://127.0.0.1:3001/api/health`,
      );
      expect(r.sortie).not.toContain("3011");
      expect(aTouche(r)).toBe(false);
      expect(r.synthese).toBe("");
    });
  },
);
