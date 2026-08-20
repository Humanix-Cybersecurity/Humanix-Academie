// SPDX-License-Identifier: AGPL-3.0-or-later
// Rendu PDF d'une facture.
//
// LE RENDU NE CALCULE RIEN. Tout vient du snapshot fige a l'emission : le
// vendeur, l'acheteur, les lignes, les montants, la mention de TVA. Si ce
// fichier se mettait a recalculer un total, une facture reimprimee dans deux
// ans pourrait differer de celle qu'a recue le client.
//
// Police : Helvetica (Type1 standard PDF, aucune fonte a embarquer). Son
// encodage WinAnsi ne connait pas U+202F -- cf. lib/facturation/montants.ts,
// qui n'emet que des U+00A0.

import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formaterEuros, formaterTaux } from "./montants";
import type { IdentiteVendeur } from "./vendeur";

// Resolution du logo, calquee sur lib/pdf-certificate.tsx.
//
// Lazy + cache : on resout a la 1ere demande (runtime) et non a l'import,
// sinon Turbopack tente de tracer le chemin au build et se plaint. Si le
// fichier est introuvable, la facture sort SANS logo plutot que d'echouer :
// une facture est un document legal, elle doit partir meme sans decor.
let cheminLogo: string | null | undefined;

function trouverLogo(): string | null {
  if (cheminLogo !== undefined) return cheminLogo;
  const candidats = [
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "public",
      "logo-humanix-academie-512.png",
    ),
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      ".next",
      "standalone",
      "public",
      "logo-humanix-academie-512.png",
    ),
  ];
  for (const c of candidats) {
    try {
      if (fs.existsSync(c)) {
        cheminLogo = c;
        return c;
      }
    } catch {
      // chemin inaccessible : on essaie le suivant
    }
  }
  cheminLogo = null;
  return null;
}

const C = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  gray: "#555555",
  light: "#EAF3F8",
  line: "#D4DDE5",
};

const s = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#222222",
    lineHeight: 1.45,
  },
  enTete: { flexDirection: "row", justifyContent: "space-between" },
  logo: { width: 52, height: 52, marginBottom: 8 },
  bloc: { width: "48%" },
  titre: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginBottom: 2,
  },
  numero: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.accent },
  label: {
    fontSize: 7,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  nom: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 1 },
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
  },
  carte: {
    width: "48%",
    backgroundColor: C.light,
    padding: 12,
    borderRadius: 4,
  },
  tableau: { marginTop: 26 },
  ligneEntete: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: C.primary,
    paddingBottom: 5,
  },
  ligne: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingVertical: 7,
  },
  cDesignation: { width: "52%" },
  cQuantite: { width: "12%", textAlign: "right" },
  cPuHt: { width: "18%", textAlign: "right" },
  cTotalHt: { width: "18%", textAlign: "right" },
  entete: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totaux: { marginTop: 16, alignItems: "flex-end" },
  ligneTotal: {
    flexDirection: "row",
    width: 230,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  ligneTtc: {
    flexDirection: "row",
    width: 230,
    justifyContent: "space-between",
    paddingVertical: 7,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: C.primary,
  },
  gras: { fontFamily: "Helvetica-Bold" },
  ttc: { fontFamily: "Helvetica-Bold", fontSize: 13, color: C.primary },
  mentions: { marginTop: 26, fontSize: 7.5, color: C.gray },
  mentionForte: { fontFamily: "Helvetica-Bold", color: "#222222" },
  pied: {
    position: "absolute",
    bottom: 26,
    left: 42,
    right: 42,
    fontSize: 6.5,
    color: C.gray,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 7,
  },
});

export type LigneRendue = {
  designation: string;
  quantite: number;
  prixUnitaireTtcCentimes: number;
  totalTtcCentimes: number;
  totalHtCentimes: number;
};

export type AcheteurRendu = {
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  siren?: string | null;
  tvaIntra?: string | null;
};

export type FacturePdf = {
  numero: string;
  emiseLe: Date;
  presteeLe: Date;
  vendeur: IdentiteVendeur;
  acheteur: AcheteurRendu;
  lignes: LigneRendue[];
  totalHtCentimes: number;
  tvaCentimes: number;
  totalTtcCentimes: number;
  tauxTvaBp: number;
  mentionTva: string;
};

/**
 * Date au format francais, EN HEURE DE PARIS.
 *
 * Ce n'est pas un detail cosmetique : un paiement horodate 2026-08-17T22:54Z
 * a eu lieu le 18 aout a 00 h 54 a Paris. C'est le 18 qui doit figurer sur la
 * facture -- la date d'une operation s'apprecie a l'heure locale du vendeur.
 * Passer en UTC « pour simplifier » decalerait d'un jour toutes les factures
 * emises entre 22 h et minuit, et ferait basculer certaines d'un mois ou d'un
 * exercice a l'autre.
 */
export function jour(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(d);
}

/** Prix unitaire HT, deduit du snapshot -- jamais recalcule depuis le taux. */
function puHt(l: LigneRendue): number {
  return Math.round(l.totalHtCentimes / l.quantite);
}

export function DocumentFacture({ f }: { f: FacturePdf }) {
  const v = f.vendeur;
  const a = f.acheteur;
  const logo = trouverLogo();
  return (
    <Document
      title={`Facture ${f.numero}`}
      author={v.raisonSociale}
      subject={`Facture ${f.numero} - ${a.raisonSociale}`}
    >
      <Page size="A4" style={s.page}>
        <View style={s.enTete}>
          <View style={s.bloc}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- l'Image de
                @react-pdf/renderer n'accepte pas de prop alt */}
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.titre}>FACTURE</Text>
            <Text style={s.numero}>{f.numero}</Text>
          </View>
          <View style={[s.bloc, { alignItems: "flex-end" }]}>
            <Text>Date d&apos;émission : {jour(f.emiseLe)}</Text>
            <Text>Date de la prestation : {jour(f.presteeLe)}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.carte}>
            <Text style={s.label}>Émetteur</Text>
            <Text style={s.nom}>{v.raisonSociale}</Text>
            <Text>
              {v.formeJuridique} au capital de {v.capitalSocial}
            </Text>
            <Text>{v.adresse}</Text>
            <Text>
              {v.codePostal} {v.ville}, {v.pays}
            </Text>
            <Text>SIRET : {v.siret}</Text>
            <Text>{v.rcs}</Text>
            <Text>TVA : {v.tvaIntra}</Text>
            <Text>APE : {v.ape}</Text>
          </View>
          <View style={s.carte}>
            <Text style={s.label}>Client</Text>
            <Text style={s.nom}>{a.raisonSociale}</Text>
            <Text>{a.adresse}</Text>
            <Text>
              {a.codePostal} {a.ville}, {a.pays}
            </Text>
            {a.siren ? <Text>SIREN : {a.siren}</Text> : null}
            {a.tvaIntra ? <Text>TVA : {a.tvaIntra}</Text> : null}
          </View>
        </View>

        <View style={s.tableau}>
          <View style={s.ligneEntete}>
            <Text style={[s.cDesignation, s.entete]}>Désignation</Text>
            <Text style={[s.cQuantite, s.entete]}>Qté</Text>
            <Text style={[s.cPuHt, s.entete]}>P.U. HT</Text>
            <Text style={[s.cTotalHt, s.entete]}>Total HT</Text>
          </View>
          {f.lignes.map((l, i) => (
            <View style={s.ligne} key={i}>
              <Text style={s.cDesignation}>{l.designation}</Text>
              <Text style={s.cQuantite}>{l.quantite}</Text>
              <Text style={s.cPuHt}>{formaterEuros(puHt(l))}</Text>
              <Text style={s.cTotalHt}>{formaterEuros(l.totalHtCentimes)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totaux}>
          <View style={s.ligneTotal}>
            <Text>Total HT</Text>
            <Text>{formaterEuros(f.totalHtCentimes)}</Text>
          </View>
          <View style={s.ligneTotal}>
            <Text>TVA {formaterTaux(f.tauxTvaBp)}</Text>
            <Text>{formaterEuros(f.tvaCentimes)}</Text>
          </View>
          <View style={s.ligneTtc}>
            <Text style={s.ttc}>Total TTC</Text>
            <Text style={s.ttc}>{formaterEuros(f.totalTtcCentimes)}</Text>
          </View>
        </View>

        <View style={s.mentions}>
          <Text style={s.mentionForte}>{f.mentionTva}</Text>
          <Text style={{ marginTop: 6 }}>
            Facture réglée par prélèvement à la souscription. Aucun escompte
            pour paiement anticipé.
          </Text>
          <Text>
            Pénalités de retard : trois fois le taux d&apos;intérêt légal.
            Indemnité forfaitaire pour frais de recouvrement : 40,00 € (articles
            L. 441-10 et D. 441-5 du code de commerce).
          </Text>
          <Text style={{ marginTop: 6 }}>
            Nature de l&apos;opération : prestation de services - abonnement à
            la plateforme de sensibilisation Humanix Académie.
          </Text>
        </View>

        <Text style={s.pied} fixed>
          {v.raisonSociale} - {v.adresse}, {v.codePostal} {v.ville} - SIRET{" "}
          {v.siret} - TVA {v.tvaIntra} - {v.email}
        </Text>
      </Page>
    </Document>
  );
}
