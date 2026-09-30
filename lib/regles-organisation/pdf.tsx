// SPDX-License-Identifier: AGPL-3.0-or-later
// Mise en page PDF de l'acte (A4, texte) et de l'affiche des regles (A4,
// grands caracteres). Helvetica seulement, pas d'emoji : react-pdf
// n'embarque pas d'autre police (cf. lib/posters/pdf.tsx).
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { TexteActe } from "./deliberation";
import type { Regle, TypeOrganisation } from "./regles";
import { VOCABULAIRE } from "./regles";

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  gray: "#555555",
  line: "#DDDDDD",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
    lineHeight: 1.42,
  },
  entete: { textAlign: "center", marginBottom: 14 },
  organisation: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  registre: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  ligne: { fontSize: 10, marginTop: 2 },
  objet: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    marginTop: 6,
    marginBottom: 8,
    color: COLORS.primary,
  },
  p: { marginBottom: 5, textAlign: "justify" },
  visa: { marginBottom: 3 },
  decide: {
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 5,
    textAlign: "center",
    fontSize: 11.5,
  },
  article: { marginBottom: 5, textAlign: "justify" },
  articleNumero: { fontFamily: "Helvetica-Bold" },
  cloture: { marginTop: 10, marginBottom: 3 },
  signature: {
    marginTop: 16,
    alignSelf: "flex-end",
    width: 220,
    textAlign: "center",
  },
  signatureFonction: { fontFamily: "Helvetica-Bold" },
  mention: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: COLORS.gray,
    textAlign: "center",
  },
  annexeTitre: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: COLORS.primary,
    marginBottom: 12,
  },
  regleTitre: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 3,
    color: COLORS.primary,
  },
  regleTexte: { textAlign: "justify" },
  // Affiche
  affichePage: { padding: 40, fontFamily: "Helvetica", color: "#1A1A1A" },
  afficheSur: {
    fontSize: 11,
    color: COLORS.accent,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  afficheTitre: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginTop: 6,
    marginBottom: 26,
    lineHeight: 1.15,
  },
  afficheRegle: { flexDirection: "row", marginBottom: 24 },
  afficheNumero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 19,
    textAlign: "center",
    paddingTop: 8,
    marginRight: 14,
  },
  afficheCorps: { flex: 1 },
  afficheRegleTitre: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
    lineHeight: 1.2,
  },
  afficheRegleResume: { fontSize: 12, color: "#333333", lineHeight: 1.45 },
  affichePied: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderColor: COLORS.line,
    paddingTop: 8,
    fontSize: 9,
    color: COLORS.gray,
    textAlign: "center",
  },
});

export function DeliberationPdf({ texte }: { texte: TexteActe }) {
  return (
    <Document title={texte.objet} author="Humanix Académie" language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.entete}>
          <Text style={s.organisation}>{texte.entete[0]}</Text>
          <Text style={s.registre}>{texte.entete[1]}</Text>
          <Text style={s.ligne}>{texte.entete[2]}</Text>
          <Text style={s.ligne}>{texte.entete[3]}</Text>
        </View>
        <Text style={s.objet}>{texte.objet}</Text>
        <Text style={s.p}>{texte.preambule}</Text>
        {texte.visas.map((v) => (
          <Text key={v} style={s.visa}>
            {v}
          </Text>
        ))}
        {texte.considerants.map((c) => (
          <Text key={c} style={s.p}>
            {c}
          </Text>
        ))}
        <Text style={s.decide}>{texte.decide}</Text>
        {texte.articles.map((a) => (
          <Text key={a.numero} style={s.article}>
            <Text style={s.articleNumero}>Article {a.numero}. </Text>
            {a.texte}
          </Text>
        ))}
        {texte.cloture.map((c) => (
          <Text key={c} style={s.cloture}>
            {c}
          </Text>
        ))}
        <View style={s.signature}>
          <Text style={s.signatureFonction}>{texte.signature.fonction}</Text>
          <Text>{texte.signature.nom}</Text>
        </View>
        <Text style={s.mention} fixed>
          {texte.mention}
        </Text>
      </Page>
      <Page size="A4" style={s.page}>
        <Text style={s.annexeTitre}>{texte.annexeTitre}</Text>
        {texte.regles.map((r, i) => (
          <View key={r.id} wrap={false}>
            <Text style={s.regleTitre}>
              {i + 1}. {r.titre}
            </Text>
            <Text style={s.regleTexte}>{r.texte}</Text>
          </View>
        ))}
        <Text style={s.mention} fixed>
          {texte.mention}
        </Text>
      </Page>
    </Document>
  );
}

export function AffichePdf({
  nomOrganisation,
  typeOrganisation,
  regles,
  adopteeStr,
}: {
  nomOrganisation: string;
  typeOrganisation: TypeOrganisation;
  regles: Regle[];
  /** « Adoptées par le conseil municipal le 12 octobre 2026 » ou null. */
  adopteeStr: string | null;
}) {
  const v = VOCABULAIRE[typeOrganisation];
  return (
    <Document
      title={`Les règles de sécurité numérique de ${nomOrganisation}`}
      author="Humanix Académie"
      language="fr"
    >
      <Page size="A4" style={s.affichePage}>
        <Text style={s.afficheSur}>{nomOrganisation.toUpperCase()}</Text>
        <Text style={s.afficheTitre}>
          Nos {regles.length === 5 ? "cinq" : String(regles.length)} règles de
          sécurité numérique
        </Text>
        {regles.map((r, i) => (
          <View key={r.id} style={s.afficheRegle}>
            <Text style={s.afficheNumero}>{i + 1}</Text>
            <View style={s.afficheCorps}>
              <Text style={s.afficheRegleTitre}>{r.titre}</Text>
              <Text style={s.afficheRegleResume}>{r.resume}</Text>
            </View>
          </View>
        ))}
        <Text style={s.affichePied}>
          {adopteeStr ?? `Règles proposées à l'adoption par ${v.organe}.`}{" "}
          Refuser et faire attendre en appliquant ces règles est couvert par{" "}
          {v.signataire}. Humanix Académie.
        </Text>
      </Page>
    </Document>
  );
}
