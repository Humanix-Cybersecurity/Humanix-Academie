// SPDX-License-Identifier: AGPL-3.0-or-later
//
// publier-tags.sh pose les tags d'une image déjà au registre, désignée par son
// empreinte, puis vérifie qu'ils la désignent. Impossible de parler à un vrai
// registre dans la suite : on exécute donc le script pour de bon, avec bash,
// dans un bac à sable où `docker` est une doublure. Elle tient un petit
// registre (une référence et le nom de son manifeste par ligne, les
// manifestes dans des fichiers), journalise chaque appel, et peut refuser ou
// mal recopier.
//
// Ce que ces tests protègent :
//   - un tag n'est posé que sur le candidat, tel qu'il a été essayé : présent
//     au registre, et un index, que la commande recopie à l'identique ;
//   - rien n'est demandé au registre tant que le candidat ou la liste des
//     tags sont douteux ;
//   - après la pose, chaque tag est relu : son manifeste doit être, octet
//     pour octet, celui du candidat ;
//   - la lecture ne passe JAMAIS par `--format`. Le buildx 0.31 des
//     exécuteurs n'exécute pas un gabarit qui commence par `{{.Manifest` : il
//     rend son affichage par défaut. La première version du script, essayée
//     avec buildx 0.37, a échoué pour cela à son premier passage réel, le
//     2026-11-20. La doublure se comporte comme le 0.31 ;
//   - les outils que le script suppose. Le chemin de chaque essai ne contient
//     que la doublure et bash : un outil de plus dans le script, et tout tombe
//     ici plutôt que sur un exécuteur de la CI, qui n'a pas awk ;
//   - le workflow lui-même : la construction ne pousse aucun tag, et le job
//     qui les pose attend l'essai. Ce workflow ne tourne que sur `main` et sur
//     les tags : un retour en arrière ne se verrait qu'après la fusion.

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

const SCRIPT = resolve(import.meta.dirname, "publier-tags.sh");
const RACINE = resolve(import.meta.dirname, "..");
const BASH_DISPONIBLE = spawnSync("bash", ["-c", "exit 0"]).status === 0;

// Tout ce que le script a le droit d'appeler en plus de la doublure.
const OUTILS_SUPPOSES = ["bash"];

const DEPOT = "ghcr.io/humanix-cybersecurity/humanix-academie";
const EMPREINTE = "a".repeat(64);
const AUTRE_EMPREINTE = "b".repeat(64);
const CANDIDAT = `${DEPOT}@sha256:${EMPREINTE}`;

// Des manifestes bruts, tels qu'un registre les sert.
const descripteur = (chiffre: string, plus = "") =>
  `{"mediaType":"application/vnd.oci.image.manifest.v1+json","digest":"sha256:${chiffre.repeat(64)}","size":1234${plus}}`;

/** Un index comme BuildKit les écrit : indenté, avec son attestation. */
const indexDeBuildkit = (image: string, attestation: string) =>
  [
    "{",
    '  "schemaVersion": 2,',
    '  "mediaType": "application/vnd.oci.image.index.v1+json",',
    '  "manifests": [',
    `    ${descripteur(image, ',"platform":{"architecture":"amd64","os":"linux"}')},`,
    `    ${descripteur(
      attestation,
      `,"annotations":{"vnd.docker.reference.digest":"sha256:${image.repeat(64)}","vnd.docker.reference.type":"attestation-manifest"},"platform":{"architecture":"unknown","os":"unknown"}`,
    )}`,
    "  ]",
    "}",
  ].join("\n");

const MANIFESTES: Record<string, string> = {
  index: indexDeBuildkit("1", "2"),
  "autre-index": indexDeBuildkit("3", "4"),
  // Compact, clés triées : la forme des index des images officielles.
  "index-compact": `{"manifests":[${descripteur("5")}],"mediaType":"application/vnd.oci.image.index.v1+json","schemaVersion":2}`,
  "liste-docker": `{"schemaVersion":2,"mediaType":"application/vnd.docker.distribution.manifest.list.v2+json","manifests":[{"mediaType":"application/vnd.docker.distribution.manifest.v2+json","digest":"sha256:${"6".repeat(64)}","size":1234,"platform":{"architecture":"amd64","os":"linux"}}]}`,
  // Un manifeste d'image : une configuration et des couches, pas de liste.
  manifeste: [
    "{",
    '  "schemaVersion": 2,',
    '  "mediaType": "application/vnd.oci.image.manifest.v1+json",',
    `  "config": {"mediaType":"application/vnd.oci.image.config.v1+json","digest":"sha256:${"7".repeat(64)}","size":8546},`,
    `  "layers": [{"mediaType":"application/vnd.oci.image.layer.v1.tar+gzip","digest":"sha256:${"8".repeat(64)}","size":3626897}]`,
    "}",
  ].join("\n"),
  vide: "",
};

// Doublure de docker. Uniquement des commandes internes au shell : elle tourne
// avec le même chemin fermé que le script. Le registre est le fichier
// $BAC/registre ; pour une référence, la dernière ligne l'emporte, comme un
// tag qu'on déplace. Écrite sans la forme dollar-accolade, que String.raw
// prendrait pour une interpolation.
//
// `inspect` sans `--raw` répond comme le buildx 0.31 des exécuteurs devant un
// gabarit en `{{.Manifest` : l'affichage par défaut, quel que soit le gabarit.
const DOUBLURE_DOCKER = String.raw`#!/bin/sh
e="$BAC/etat"
echo "docker $*" >> "$BAC/journal"
if [ "$1" != "buildx" ] || [ "$2" != "imagetools" ]; then
  echo "doublure : commande inattendue : $*" >&2
  exit 64
fi
chercher() {
  manifeste=""
  while read -r r nom; do
    if [ "$r" = "$1" ]; then manifeste="$nom"; fi
  done < "$BAC/registre"
}
case "$3" in
  inspect)
    if [ "$4" != "--raw" ]; then
      echo "Name:      $4"
      echo "MediaType: application/vnd.oci.image.index.v1+json"
      echo "Digest:    sha256:0000000000000000000000000000000000000000000000000000000000000000"
      echo "Manifests:"
      echo "  Name:        $4"
      echo "  MediaType:   application/vnd.oci.image.manifest.v1+json"
      echo "  Platform:    unknown/unknown"
      echo "  Annotations:"
      echo "    vnd.docker.reference.type:   attestation-manifest"
      exit 0
    fi
    reference="$5"
    if [ "$reference" != "$CANDIDAT_ATTENDU" ] && [ -f "$e/relecture-echoue" ]; then
      echo "ERROR: registre injoignable" >&2
      exit 1
    fi
    chercher "$reference"
    if [ -z "$manifeste" ]; then
      echo "ERROR: $reference: not found" >&2
      exit 1
    fi
    while IFS= read -r ligne || [ -n "$ligne" ]; do
      printf '%s\n' "$ligne"
    done < "$BAC/manifestes/$manifeste"
    ;;
  create)
    if [ -f "$e/pose-echoue" ]; then
      echo "ERROR: denied: permission_denied" >&2
      exit 1
    fi
    for source; do :; done
    chercher "$source"
    shift 3
    while [ "$#" -gt 1 ]; do
      if [ "$1" = "--tag" ]; then
        if [ -f "$e/copie-infidele" ]; then
          echo "$2 autre-index" >> "$BAC/registre"
        else
          echo "$2 $manifeste" >> "$BAC/registre"
        fi
        shift 2
      else
        shift
      fi
    done
    ;;
esac
exit 0
`;

type Scenario = {
  /** Ce que le registre contient au départ : référence, nom du manifeste. */
  registre?: [string, string][];
  /** La pose des tags est refusée par le registre. */
  poseEchoue?: boolean;
  /** Les tags posés rendent un autre index que celui du candidat. */
  copieInfidele?: boolean;
  /** La relecture des tags échoue, le candidat reste lisible. */
  relectureEchoue?: boolean;
};

const REGISTRE_SAIN: [string, string][] = [[CANDIDAT, "index"]];

const bacs: string[] = [];

function creerBac(scenario: Scenario): string {
  const bac = mkdtempSync(join(tmpdir(), "publier-tags-"));
  bacs.push(bac);

  const etat = join(bac, "etat");
  mkdirSync(etat);
  if (scenario.poseEchoue) writeFileSync(join(etat, "pose-echoue"), "\n");
  if (scenario.relectureEchoue) {
    writeFileSync(join(etat, "relecture-echoue"), "\n");
  }
  if (scenario.copieInfidele) {
    writeFileSync(join(etat, "copie-infidele"), "\n");
  }
  const manifestes = join(bac, "manifestes");
  mkdirSync(manifestes);
  for (const [nom, contenu] of Object.entries(MANIFESTES)) {
    writeFileSync(join(manifestes, nom), contenu);
  }
  writeFileSync(
    join(bac, "registre"),
    (scenario.registre ?? REGISTRE_SAIN)
      .map((ligne) => `${ligne.join(" ")}\n`)
      .join(""),
  );
  writeFileSync(join(bac, "journal"), "");

  const bin = join(bac, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "docker"), DOUBLURE_DOCKER);
  chmodSync(join(bin, "docker"), 0o755);

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
  /** Un appel de la doublure par ligne, dans l'ordre. */
  journal: string[];
  /** Le manifeste qu'une référence désigne à la fin, ou "" si absente. */
  auRegistre: (reference: string) => string;
};

function lancer(
  scenario: Scenario,
  tags: string | undefined,
  args: string[] = [CANDIDAT],
  variables: Record<string, string> = {},
): Resultat {
  const bac = creerBac(scenario);
  const r = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    // Environnement fermé : la doublure, bash, et rien d'autre. Pas le chemin
    // du poste, pas ses variables.
    env: {
      PATH: `${join(bac, "bin")}:${join(bac, "outils")}`,
      // Le script ne la lit pas ; le type de l'environnement l'exige.
      NODE_ENV: "test",
      BAC: bac,
      // Pour la doublure seulement : distinguer le candidat des tags relus.
      CANDIDAT_ATTENDU: args[0] ?? "",
      ...(tags === undefined ? {} : { TAGS: tags }),
      ...variables,
    },
  });
  const registre = readFileSync(join(bac, "registre"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((ligne) => ligne.split(" "));
  return {
    code: r.status,
    sortie: `${r.stdout}${r.stderr}`,
    journal: readFileSync(join(bac, "journal"), "utf8")
      .split("\n")
      .filter(Boolean),
    auRegistre: (reference) =>
      registre.filter(([r0]) => r0 === reference).at(-1)?.[1] ?? "",
  };
}

const poses = (r: Resultat) =>
  r.journal.filter((l) => l.startsWith("docker buildx imagetools create"));
const lectures = (r: Resultat) =>
  r.journal.filter((l) => l.startsWith("docker buildx imagetools inspect"));

afterEach(() => {
  for (const bac of bacs.splice(0)) {
    rmSync(bac, { recursive: true, force: true });
  }
});

describe.skipIf(!BASH_DISPONIBLE)(
  "publier-tags.sh : les tags vont-ils sur l'image essayée ?",
  { timeout: 30_000 },
  () => {
    it("pose les tags sur le candidat, puis les relit", () => {
      const r = lancer({}, `${DEPOT}:edge\n${DEPOT}:main-5a25a92\n`);

      expect(r.sortie).toContain("TAGS POSES : 2 reference(s)");
      expect(r.code).toBe(0);
      expect(poses(r)).toEqual([
        `docker buildx imagetools create --tag ${DEPOT}:edge --tag ${DEPOT}:main-5a25a92 ${CANDIDAT}`,
      ]);
      expect(r.auRegistre(`${DEPOT}:edge`)).toBe("index");
      expect(r.auRegistre(`${DEPOT}:main-5a25a92`)).toBe("index");
    });

    it("lit le candidat avant de poser, et chaque tag après", () => {
      const r = lancer({}, `${DEPOT}:edge\n${DEPOT}:main-5a25a92`);

      expect(r.journal.map((l) => l.split(" ").slice(3, 6).join(" "))).toEqual([
        `inspect --raw ${CANDIDAT}`,
        `create --tag ${DEPOT}:edge`,
        `inspect --raw ${DEPOT}:edge`,
        `inspect --raw ${DEPOT}:main-5a25a92`,
      ]);
    });

    it("ne lit jamais par --format, que le buildx des exécuteurs n'exécute pas", () => {
      const r = lancer({}, `${DEPOT}:edge\n${DEPOT}:main-5a25a92`);

      expect(r.code).toBe(0);
      expect(lectures(r)).toHaveLength(3);
      for (const lecture of lectures(r)) {
        expect(lecture).toMatch(/^docker buildx imagetools inspect --raw \S+$/);
      }
      expect(r.journal.join("\n")).not.toContain("--format");
      expect(readFileSync(SCRIPT, "utf8")).not.toMatch(
        /^[^#\n]*imagetools inspect[^\n]*--format/m,
      );
    });

    it("pose les quatre tags d'une release en une seule commande", () => {
      const tags = ["1.17.0", "1.17", "1", "latest"].map(
        (t) => `${DEPOT}:${t}`,
      );
      const r = lancer({}, tags.join("\n"));

      expect(r.code).toBe(0);
      expect(poses(r)).toHaveLength(1);
      for (const tag of tags) {
        expect(r.auRegistre(tag)).toBe("index");
      }
      expect(r.sortie).toContain("TAGS POSES : 4 reference(s)");
    });

    it("reporte les mêmes tags sur le miroir, après ceux du dépôt", () => {
      const miroir = "humanix/humanix-academie";
      const r = lancer({}, `${DEPOT}:edge\n${DEPOT}:main-5a25a92`, [CANDIDAT], {
        MIROIR: miroir,
      });

      expect(r.code).toBe(0);
      expect(poses(r)).toEqual([
        `docker buildx imagetools create --tag ${DEPOT}:edge --tag ${DEPOT}:main-5a25a92 ` +
          `--tag ${miroir}:edge --tag ${miroir}:main-5a25a92 ${CANDIDAT}`,
      ]);
      expect(r.auRegistre(`${miroir}:edge`)).toBe("index");
      expect(r.sortie).toContain("TAGS POSES : 4 reference(s)");
    });

    it("accepte un registre désigné avec son port", () => {
      const depot = "127.0.0.1:5000/humanix-essai";
      const candidat = `${depot}@sha256:${EMPREINTE}`;
      const r = lancer({ registre: [[candidat, "index"]] }, `${depot}:edge`, [
        candidat,
      ]);

      expect(r.code).toBe(0);
      expect(r.auRegistre(`${depot}:edge`)).toBe("index");
    });

    it.each([
      ["une liste de manifestes au format Docker", "liste-docker"],
      ["un index compact aux clés triées", "index-compact"],
    ])("accepte %s", (_nom, manifeste) => {
      const r = lancer({ registre: [[CANDIDAT, manifeste]] }, `${DEPOT}:edge`);

      expect(r.code).toBe(0);
      expect(poses(r)).toHaveLength(1);
      expect(r.auRegistre(`${DEPOT}:edge`)).toBe(manifeste);
    });

    it("nettoie la liste : lignes vides, espaces, retours chariot, doublons", () => {
      const r = lancer(
        {},
        `\n  ${DEPOT}:edge  \r\n\n${DEPOT}:main-5a25a92\r\n${DEPOT}:edge\n\n`,
      );

      expect(r.code).toBe(0);
      expect(poses(r)).toEqual([
        `docker buildx imagetools create --tag ${DEPOT}:edge --tag ${DEPOT}:main-5a25a92 ${CANDIDAT}`,
      ]);
    });

    it.each([
      ["TAGS absente", undefined],
      ["TAGS vide", ""],
      ["TAGS faite de lignes vides", "\n  \n\r\n"],
    ])(
      "ne demande rien au registre quand il n'y a rien à poser : %s",
      (_nom, tags) => {
        const r = lancer({}, tags);

        expect(r.sortie).toContain("aucun tag a poser");
        expect(r.code).toBe(0);
        expect(r.journal).toEqual([]);
      },
    );

    // -----------------------------------------------------------------------
    // Le candidat doit être au registre, tel qu'il a été essayé.
    // -----------------------------------------------------------------------
    it("échoue sans rien poser quand le candidat est absent du registre", () => {
      const r = lancer({ registre: [] }, `${DEPOT}:edge`);

      expect(r.sortie).toContain("introuvable au registre");
      expect(r.sortie).toContain("Aucun tag n'a ete pose");
      expect(r.code).toBe(1);
      expect(poses(r)).toEqual([]);
    });

    it("échoue sans rien poser quand le registre rend un manifeste vide", () => {
      const r = lancer({ registre: [[CANDIDAT, "vide"]] }, `${DEPOT}:edge`);

      expect(r.sortie).toContain("manifeste vide pour le candidat");
      expect(r.code).toBe(1);
      expect(poses(r)).toEqual([]);
    });

    it("refuse un candidat qui n'est pas un index : sa copie changerait d'empreinte", () => {
      const r = lancer(
        { registre: [[CANDIDAT, "manifeste"]] },
        `${DEPOT}:edge`,
      );

      expect(r.sortie).toContain("n'est pas un index d'images");
      expect(r.code).toBe(1);
      expect(poses(r)).toEqual([]);
    });

    // -----------------------------------------------------------------------
    // La pose, puis la relecture.
    // -----------------------------------------------------------------------
    it("échoue quand le registre refuse la pose, sans prétendre avoir vérifié", () => {
      const r = lancer({ poseEchoue: true }, `${DEPOT}:edge`);

      expect(r.sortie).toContain("le registre a refuse");
      expect(r.sortie).not.toContain("TAGS POSES");
      expect(r.code).toBe(1);
      // Une seule lecture : celle du candidat. Aucune relecture de tag.
      expect(lectures(r)).toHaveLength(1);
    });

    it("échoue quand un tag ne rend pas le manifeste du candidat", () => {
      const r = lancer(
        { copieInfidele: true },
        `${DEPOT}:edge\n${DEPOT}:main-5a25a92`,
      );

      expect(r.sortie).toContain(
        `ECART : ${DEPOT}:edge ne rend pas le manifeste du candidat`,
      );
      expect(r.sortie).toContain(
        "2 reference(s) ne designent pas l'image essayee",
      );
      expect(r.sortie).not.toContain("TAGS POSES");
      expect(r.code).toBe(1);
    });

    it("échoue quand un tag ne peut pas être relu", () => {
      const r = lancer({ relectureEchoue: true }, `${DEPOT}:edge`);

      expect(r.sortie).toContain(
        `ECART : ${DEPOT}:edge est illisible au registre`,
      );
      expect(r.sortie).not.toContain("TAGS POSES");
      expect(r.code).toBe(1);
    });

    // -----------------------------------------------------------------------
    // Mauvais usage : code 2, et rien n'est demandé au registre.
    // -----------------------------------------------------------------------
    const usagesRefuses: [
      string,
      string[],
      string | undefined,
      Record<string, string>,
    ][] = [
      ["aucun argument", [], `${DEPOT}:edge`, {}],
      ["deux arguments", [CANDIDAT, CANDIDAT], `${DEPOT}:edge`, {}],
      [
        "un candidat désigné par un tag",
        [`${DEPOT}:edge`],
        `${DEPOT}:latest`,
        {},
      ],
      [
        "une empreinte trop courte",
        [`${DEPOT}@sha256:${"a".repeat(63)}`],
        `${DEPOT}:edge`,
        {},
      ],
      [
        "une empreinte en majuscules",
        [`${DEPOT}@sha256:${"A".repeat(64)}`],
        `${DEPOT}:edge`,
        {},
      ],
      [
        "un candidat qui porte aussi un tag",
        [`${DEPOT}:edge@sha256:${EMPREINTE}`],
        `${DEPOT}:edge`,
        {},
      ],
      [
        "un tag dans un autre dépôt",
        [CANDIDAT],
        "ghcr.io/ailleurs/image:edge",
        {},
      ],
      ["un tag sans nom", [CANDIDAT], `${DEPOT}:`, {}],
      ["un nom de tag avec une espace", [CANDIDAT], `${DEPOT}:edge bis`, {}],
      [
        "un nom de tag qui commence par un tiret",
        [CANDIDAT],
        `${DEPOT}:-edge`,
        {},
      ],
      [
        "une empreinte à la place d'un tag",
        [CANDIDAT],
        `${DEPOT}@sha256:${AUTRE_EMPREINTE}`,
        {},
      ],
      [
        "un nom de tag de 129 caractères",
        [CANDIDAT],
        `${DEPOT}:${"t".repeat(129)}`,
        {},
      ],
      [
        "un miroir qui porte un tag",
        [CANDIDAT],
        `${DEPOT}:edge`,
        { MIROIR: "humanix/humanix-academie:edge" },
      ],
      [
        "un miroir qui est le dépôt du candidat",
        [CANDIDAT],
        `${DEPOT}:edge`,
        { MIROIR: DEPOT },
      ],
    ];

    it.each(usagesRefuses)("refuse %s", (_nom, args, tags, variables) => {
      const r = lancer({}, tags, args, variables);

      expect(r.code).toBe(2);
      expect(r.journal).toEqual([]);
    });

    it("dit pourquoi un candidat sans empreinte est refusé", () => {
      const r = lancer({}, `${DEPOT}:latest`, [`${DEPOT}:edge`]);

      expect(r.sortie).toContain("Candidat sans empreinte");
      expect(r.sortie).toContain("Un tag peut avoir bouge depuis l'essai");
    });

    it("un seul tag douteux suffit à tout refuser", () => {
      const r = lancer({}, `${DEPOT}:edge\nghcr.io/ailleurs/image:latest`);

      expect(r.sortie).toContain("Tag hors du depot du candidat");
      expect(r.code).toBe(2);
      expect(r.journal).toEqual([]);
    });
  },
);

// ---------------------------------------------------------------------------
// Le workflow : aucun tag avant l'essai.
//
// Lecture du fichier, sans analyseur YAML (le dépôt n'en déclare pas) : les
// jobs sont les clés à deux espaces sous `jobs:`.
// ---------------------------------------------------------------------------
describe("docker-publish.yml : aucun tag avant l'essai", () => {
  const brut = readFileSync(
    join(RACINE, ".github/workflows/docker-publish.yml"),
    "utf8",
  );
  const apresJobs = brut.slice(brut.indexOf("\njobs:\n") + "\njobs:\n".length);

  /** Le texte d'un job, commentaires retirés. */
  function job(nom: string): string {
    const lignes = apresJobs.split("\n");
    const debut = lignes.indexOf(`  ${nom}:`);
    if (debut === -1) throw new Error(`job introuvable : ${nom}`);
    const suite = lignes.slice(debut + 1);
    const fin = suite.findIndex((l) => /^ {2}[A-Za-z0-9_-]+:\s*$/.test(l));
    return (fin === -1 ? suite : suite.slice(0, fin))
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n");
  }

  it("connaît les jobs attendus", () => {
    const noms = apresJobs
      .split("\n")
      .filter((l) => /^ {2}[A-Za-z0-9_-]+:\s*$/.test(l))
      .map((l) => l.trim().replace(":", ""));

    expect(noms).toEqual([
      "preflight",
      "publish",
      "smoke-test",
      "promote",
      "trivy-scan",
    ]);
  });

  /** L'étape d'un job qui contient ce texte : de son tiret au tiret suivant. */
  function etape(texteDuJob: string, marqueur: string): string {
    const etapes = texteDuJob.split(/\n(?= {6}- )/);
    const trouvee = etapes.find((e) => e.includes(marqueur));
    if (!trouvee) throw new Error(`étape introuvable : ${marqueur}`);
    return trouvee;
  }

  it("la construction pousse par empreinte, sans tag", () => {
    const publish = job("publish");
    const construction = etape(publish, "docker/build-push-action");

    expect(construction).toContain("push-by-digest=true");
    expect(construction).toContain("push=true");
    // Ni `push: true`, ni entrée `tags:` : ce serait publier les tags avant
    // l'essai. Ils sortent du job (`outputs.tags`) pour le job `promote`.
    expect(construction).not.toMatch(/^\s+push:/m);
    expect(construction).not.toMatch(/^\s+tags:/m);
    expect(publish).toMatch(
      /^ {6}tags: \$\{\{ steps\.meta\.outputs\.tags \}\}$/m,
    );
    expect(publish).not.toContain("imagetools");
    expect(publish).not.toContain("docker push");
  });

  it("l'essai tire l'image de ce run par son empreinte, sans condition", () => {
    const essai = job("smoke-test");

    expect(essai).toContain("needs.publish.outputs.digest");
    expect(essai).toContain("./scripts/essai-image.sh");
    expect(essai).not.toMatch(/^\s{4}if:/m);
  });

  it("les tags ne sont posés que par un job qui attend l'essai", () => {
    const promote = job("promote");

    expect(promote).toMatch(/needs:\s*\[[^\]]*\bsmoke-test\b[^\]]*\]/);
    expect(promote).toMatch(/needs:\s*\[[^\]]*\bpublish\b[^\]]*\]/);
    // Une condition au niveau du job (`if: always()`, par exemple) le ferait
    // tourner après un essai rouge.
    expect(promote).not.toMatch(/^\s{4}if:/m);
    expect(promote).toContain("./scripts/publier-tags.sh");
    expect(promote).toContain("needs.publish.outputs.digest");

    for (const autre of ["preflight", "publish", "smoke-test", "trivy-scan"]) {
      expect(job(autre)).not.toContain("publier-tags.sh");
      expect(job(autre)).not.toContain("imagetools create");
    }
  });

  it("le scan porte sur l'image de ce run, pas sur un tag mouvant", () => {
    const scan = job("trivy-scan");

    expect(scan).toContain("needs.publish.outputs.digest");
    expect(scan).not.toMatch(/:(edge|latest)\b/);
    expect(scan).not.toContain("docker push");
  });
});
