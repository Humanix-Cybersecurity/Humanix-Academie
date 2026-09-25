// SPDX-License-Identifier: AGPL-3.0-or-later
// Devis revendeur au format PDF, a partir d'une simulation de la grille.
// Meme charte que les attestations (lib/drill/attestation.tsx).
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CalculRevendeur } from "./tarification";
import { GRILLE_REVENDEUR } from "./tarification";
import { formaterEuros } from "@/lib/facturation/montants";
import { VENDEUR } from "@/lib/facturation/vendeur";

export type DevisData = {
  reference: string;
  prospect: string;
  dateStr: string;
  validiteStr: string;
  hypothese: { nbEspaces: number; utilisateursParEspace: number };
  calcul: CalculRevendeur;
  /** Taux affiche a titre indicatif ; le regime reel se determine a la facture. */
  tauxTvaBp: number;
};

const COLORS = { primary: "#0B3D91", accent: "#00A3A1", gray: "#555555" };

const s = StyleSheet.create({
  page: {
    padding: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
    lineHeight: 1.45,
  },
  brand: { fontSize: 10, color: COLORS.accent, fontWeight: "bold" },
  h1: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 4,
  },
  meta: { color: COLORS.gray, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bloc: { width: "47%" },
  h2: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
  },
  table: { borderTopWidth: 1, borderColor: "#DDDDDD" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#DDDDDD",
    paddingVertical: 4,
  },
  th: { fontWeight: "bold", color: COLORS.gray },
  cDes: { width: "58%" },
  cQte: { width: "12%", textAlign: "right" },
  cPu: { width: "15%", textAlign: "right" },
  cTot: { width: "15%", textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  totalLabel: { width: "30%", textAlign: "right", color: COLORS.gray },
  totalVal: { width: "20%", textAlign: "right", fontWeight: "bold" },
  small: { fontSize: 8.5, color: COLORS.gray, marginTop: 4 },
  signature: {
    marginTop: 26,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    minHeight: 70,
  },
});

export function DevisRevendeurPdf({ data }: { data: DevisData }) {
  const { calcul } = data;
  const tva = Math.round((calcul.totalHtCentimes * data.tauxTvaBp) / 10000);
  const ttc = calcul.totalHtCentimes + tva;
  return (
    <Document title={`Devis ${data.reference}`} author={VENDEUR.raisonSociale}>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>HUMANIX ACADÉMIE</Text>
        <Text style={s.h1}>Devis {data.reference}</Text>
        <Text style={s.meta}>
          Émis le {data.dateStr} · valable jusqu&apos;au {data.validiteStr}
        </Text>

        <View style={s.row}>
          <View style={s.bloc}>
            <Text style={s.th}>Émetteur</Text>
            <Text>
              {VENDEUR.raisonSociale} ({VENDEUR.formeJuridique})
            </Text>
            <Text>{VENDEUR.adresse}</Text>
            <Text>
              {VENDEUR.codePostal} {VENDEUR.ville}
            </Text>
            <Text>SIREN {VENDEUR.siren}</Text>
            <Text>TVA {VENDEUR.tvaIntra}</Text>
            <Text>{VENDEUR.email}</Text>
          </View>
          <View style={s.bloc}>
            <Text style={s.th}>Destinataire</Text>
            <Text>{data.prospect}</Text>
            <Text style={s.small}>
              Programme revendeur : plateforme en marque blanche, un espace par
              client final, portail de gestion multi-clients.
            </Text>
          </View>
        </View>

        <Text style={s.h2}>Hypothèse retenue</Text>
        <Text>
          {data.hypothese.nbEspaces} espace(s) client de{" "}
          {data.hypothese.utilisateursParEspace} utilisateurs actifs, soit{" "}
          {calcul.utilisateursFacturables} utilisateurs facturables par mois
          (plancher de {GRILLE_REVENDEUR.minimumUtilisateursParEspace} par
          espace).
        </Text>

        <Text style={s.h2}>Mensualité, hors taxes</Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.cDes, s.th]}>Désignation</Text>
            <Text style={[s.cQte, s.th]}>Qté</Text>
            <Text style={[s.cPu, s.th]}>P.U. HT</Text>
            <Text style={[s.cTot, s.th]}>Total HT</Text>
          </View>
          {calcul.lignes.map((l) => (
            <View style={s.tr} key={l.designation}>
              <Text style={s.cDes}>{l.designation}</Text>
              <Text style={s.cQte}>{l.quantite}</Text>
              <Text style={s.cPu}>
                {formaterEuros(l.prixUnitaireHtCentimes)}
              </Text>
              <Text style={s.cTot}>{formaterEuros(l.totalHtCentimes)}</Text>
            </View>
          ))}
        </View>
        <View style={s.total}>
          <Text style={s.totalLabel}>Total HT par mois</Text>
          <Text style={s.totalVal}>
            {formaterEuros(calcul.totalHtCentimes)}
          </Text>
        </View>
        <View style={s.total}>
          <Text style={s.totalLabel}>
            TVA {(data.tauxTvaBp / 100).toFixed(0)} %
          </Text>
          <Text style={s.totalVal}>{formaterEuros(tva)}</Text>
        </View>
        <View style={s.total}>
          <Text style={s.totalLabel}>Total TTC par mois</Text>
          <Text style={s.totalVal}>{formaterEuros(ttc)}</Text>
        </View>
        <View style={s.total}>
          <Text style={s.totalLabel}>Soit par an, HT</Text>
          <Text style={s.totalVal}>
            {formaterEuros(calcul.totalHtCentimes * 12)}
          </Text>
        </View>
        {calcul.prixMoyenParUtilisateurCentimes !== null && (
          <Text style={s.small}>
            Prix moyen par utilisateur actif et par mois :{" "}
            {formaterEuros(calcul.prixMoyenParUtilisateurCentimes)} HT.
          </Text>
        )}

        <Text style={s.h2}>Grille appliquée</Text>
        <Text>
          Licence revendeur :{" "}
          {formaterEuros(GRILLE_REVENDEUR.licenceMensuelleHtCentimes)} HT par
          mois, collaborateurs du revendeur inclus sans limite.
        </Text>
        <Text>
          Utilisateurs actifs cumulés des espaces clients, par tranches
          progressives, HT par utilisateur et par mois :{" "}
          {GRILLE_REVENDEUR.tranches
            .map((t, i) => {
              const depuis =
                i === 0 ? 0 : GRILLE_REVENDEUR.tranches[i - 1].jusqua;
              const borne =
                t.jusqua === Infinity
                  ? `au-delà de ${depuis}`
                  : `${depuis + 1} à ${t.jusqua}`;
              return `${borne} : ${formaterEuros(t.prixHtCentimes)}`;
            })
            .join(" · ")}
          .
        </Text>

        <Text style={s.h2}>Conditions</Text>
        <Text>
          Facturation mensuelle sur relevé des utilisateurs actifs au dernier
          jour du mois, par espace client. Licence sur engagement annuel.
          Paiement à trente jours par virement. La TVA applicable est déterminée
          à la facture selon le régime de l&apos;acheteur ; le taux ci-dessus
          est indicatif. Ce devis ne vaut pas contrat de revente.
        </Text>

        <View style={s.signature}>
          <Text style={s.th}>Bon pour accord</Text>
          <Text style={s.small}>
            Date, nom, qualité et signature du destinataire.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
