// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Valide le XML Factur-X genere contre le XSD ET le Schematron OFFICIELS.
//
// POURQUOI CE SCRIPT EXISTE
//
//   Un XML Factur-X « qui a l'air bon » est sans valeur : c'est la plateforme
//   agreee qui tranche, et elle applique le Schematron EN 16931. Ce script a
//   trouve deux vrais defauts a la premiere execution :
//
//     BR-O-05  une ligne « hors champ » ne doit pas porter de taux de TVA ;
//     BR-O-02  une facture hors champ ne doit contenir AUCUN identifiant de
//              TVA, ni vendeur ni acheteur ;
//     BR-27    un avoir ne porte pas de montants negatifs -- c'est le
//              TypeCode 381 qui porte le sens.
//
// PIEGE RENCONTRE, ET IL VAUT D'ETRE SU
//
//   Le Schematron officiel est en XSLT 2.0. `xsltproc` ne fait que du 1.0 :
//   il echoue a compiler et rend un fichier VIDE. Zero echec, donc, sur des
//   documents volontairement faux. Il faut Saxon.
//
// COMMENT LE LANCER
//
//   Les schemas ne sont pas versionnes dans le depot (licence FNFE-MPE).
//   Les recuperer dans un dossier de travail :
//
//     mkdir -p .verif-fx/xsd
//     base=https://raw.githubusercontent.com/akretion/factur-x/master/src/facturx/xsd_and_schematron/facturx-en16931
//     for f in Factur-X_EN16931.xsd Factur-X_1.09_EN16931.xsl \
//              Factur-X_1.09_EN16931_urn_un_unece_uncefact_data_standard_QualifiedDataType_100.xsd \
//              Factur-X_1.09_EN16931_urn_un_unece_uncefact_data_standard_ReusableAggregateBusinessInformationEntity_100.xsd \
//              Factur-X_1.09_EN16931_urn_un_unece_uncefact_data_standard_UnqualifiedDataType_100.xsd; do
//       curl -sL -o ".verif-fx/xsd/$f" "$base/$f"
//     done
//     curl -sL -o .verif-fx/saxon.jar \
//       https://repo1.maven.org/maven2/net/sf/saxon/Saxon-HE/9.9.1-8/Saxon-HE-9.9.1-8.jar
//
//     npx tsx scripts/verifier-factur-x.ts

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { genererFacturX } from "../lib/facturation/factur-x";
import { VENDEUR } from "../lib/facturation/vendeur";

const DOSSIER = ".verif-fx";
const XSD = path.join(DOSSIER, "xsd", "Factur-X_EN16931.xsd");
const XSL = path.join(DOSSIER, "xsd", "Factur-X_1.09_EN16931.xsl");
const SAXON = path.join(DOSSIER, "saxon.jar");

let echecs = 0;
const dire = (nom: string, ok: boolean, detail = "") => {
  if (!ok) echecs++;
  console.log(
    `  [${ok ? "OK  " : "ECHEC"}] ${nom}${detail ? "  -> " + detail : ""}`,
  );
};

const socle = {
  numero: "FA-2026-0001",
  emiseLe: new Date("2026-08-20T10:00:00Z"),
  presteeLe: new Date("2026-08-17T22:54:02Z"),
  vendeur: VENDEUR,
  totalHtCentimes: 4000,
  tvaCentimes: 800,
  totalTtcCentimes: 4800,
  lignes: [
    {
      designation: "Humanix Académie - abonnement Pro, 16 sièges - août 2026",
      quantite: 1,
      prixUnitaireTtcCentimes: 4800,
      totalTtcCentimes: 4800,
      totalHtCentimes: 4000,
    },
  ],
};
const sansTva = {
  ...socle,
  totalHtCentimes: 4800,
  tvaCentimes: 0,
  lignes: [{ ...socle.lignes[0], totalHtCentimes: 4800 }],
};

const CAS: Record<string, unknown> = {
  "france-20": {
    ...socle,
    tauxTvaBp: 2000,
    mentionTva: "TVA française 20 %",
    acheteur: {
      raisonSociale: "Client Test SARL",
      adresse: "1 rue de la Paix",
      codePostal: "75002",
      ville: "Paris",
      pays: "FR",
      siren: "123456789",
      tvaIntra: null,
    },
  },
  "ue-autoliquidation": {
    ...sansTva,
    tauxTvaBp: 0,
    mentionTva:
      "Autoliquidation - article 283-2 du CGI. TVA due par le preneur.",
    acheteur: {
      raisonSociale: "Client BE SPRL",
      adresse: "2 rue de Bruxelles",
      codePostal: "1000",
      ville: "Bruxelles",
      pays: "BE",
      siren: null,
      tvaIntra: "BE0123456789",
    },
  },
  // Une province (BT-54) : la placer AVANT CountryID fait echouer le XSD, pas
  // seulement le Schematron. Ce cas existe pour que l'ordre soit VERIFIE et
  // non suppose -- les autres cas n'en portent pas, leur vert ne dit rien
  // de ce champ.
  "hors-ue-avec-province": {
    ...sansTva,
    tauxTvaBp: 0,
    mentionTva:
      "TVA non applicable - prestation hors champ, article 259-1 du CGI",
    acheteur: {
      raisonSociale: "Braver inc.",
      adresse: "50-190 rue Dorchester",
      codePostal: "G1K 5Y9",
      ville: "Québec",
      province: "Québec",
      pays: "CA",
      siren: null,
      tvaIntra: null,
    },
  },
  "hors-ue": {
    ...sansTva,
    tauxTvaBp: 0,
    mentionTva:
      "TVA non applicable - prestation hors champ, article 259-1 du CGI",
    acheteur: {
      raisonSociale: "Client US Inc",
      adresse: "5 Main Street",
      codePostal: "10001",
      ville: "New York",
      pays: "US",
      siren: null,
      tvaIntra: null,
    },
  },
  avoir: {
    ...socle,
    estAvoir: true,
    tauxTvaBp: 2000,
    mentionTva: "TVA française 20 %",
    acheteur: {
      raisonSociale: "Client Test SARL",
      adresse: "1 rue de la Paix",
      codePostal: "75002",
      ville: "Paris",
      pays: "FR",
      siren: "123456789",
      tvaIntra: null,
    },
  },
  "caracteres-a-echapper": {
    ...socle,
    tauxTvaBp: 2000,
    mentionTva: "TVA française 20 %",
    acheteur: {
      raisonSociale: 'Dupont & Fils <SARL> "Test"',
      adresse: "1 rue & <test>",
      codePostal: "75002",
      ville: "Paris",
      pays: "FR",
      siren: "123456789",
      tvaIntra: null,
    },
  },
};

function echecsSchematron(fichier: string): string[] {
  const svrl = execFileSync(
    "java",
    ["-cp", SAXON, "net.sf.saxon.Transform", `-s:${fichier}`, `-xsl:${XSL}`],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  const messages: string[] = [];
  for (const m of svrl.matchAll(
    /<svrl:failed-assert[^>]*>([\s\S]*?)<\/svrl:failed-assert>/g,
  )) {
    const t = /<svrl:text>([\s\S]*?)<\/svrl:text>/.exec(m[1]);
    if (t) messages.push(t[1].replace(/\s+/g, " ").trim());
  }
  // Un SVRL sans AUCUNE regle declenchee signale un processeur casse, pas un
  // document parfait : c'est exactement ce qui arrive avec xsltproc.
  if (!svrl.includes("<svrl:fired-rule")) {
    throw new Error(
      "aucune regle declenchee : le processeur XSLT 2.0 a echoue",
    );
  }
  return messages;
}

function main() {
  for (const f of [XSD, XSL, SAXON]) {
    if (!fs.existsSync(f)) {
      console.error(
        `Manquant : ${f}\nVoir l'en-tete de ce fichier pour le recuperer.`,
      );
      process.exit(2);
    }
  }
  fs.mkdirSync(path.join(DOSSIER, "out"), { recursive: true });

  for (const [nom, facture] of Object.entries(CAS)) {
    const chemin = path.join(DOSSIER, "out", `${nom}.xml`);
    fs.writeFileSync(chemin, genererFacturX(facture as never));

    let xsdOk = false;
    try {
      execFileSync("xmllint", ["--noout", "--schema", XSD, chemin], {
        stdio: "pipe",
      });
      xsdOk = true;
    } catch {
      xsdOk = false;
    }
    dire(`${nom} : XSD`, xsdOk);

    const rates = echecsSchematron(chemin);
    dire(
      `${nom} : Schematron EN 16931`,
      rates.length === 0,
      rates.slice(0, 3).join(" | "),
    );
  }

  // TEMOIN : sans lui, un « 0 echec » ne prouve rien. On casse une regle
  // connue et on exige que le controle la voie.
  const casse = path.join(DOSSIER, "out", "temoin-casse.xml");
  fs.writeFileSync(
    casse,
    fs
      .readFileSync(path.join(DOSSIER, "out", "france-20.xml"), "utf-8")
      .replace("<ram:GrandTotalAmount>48.00", "<ram:GrandTotalAmount>99.00"),
  );
  const vus = echecsSchematron(casse);
  dire(
    "TEMOIN : un total incoherent est bien detecte",
    vus.some((m) => m.includes("BR-CO-15")),
    `${vus.length} echec(s)`,
  );

  console.log(echecs === 0 ? "\n  TOUT PASSE" : `\n  ${echecs} ECHEC(S)`);
  process.exit(echecs === 0 ? 0 : 1);
}

main();
