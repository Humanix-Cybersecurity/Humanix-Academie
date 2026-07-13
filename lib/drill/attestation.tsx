// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Attestation d'exercice de crise (PDF, rendu serveur via @react-pdf/renderer).
//
// POSTURE (importante) : attestation DECLARATIVE a fins de tracabilite
// interne. Elle ne constitue NI une certification NI une preuve opposable.
// ReCyF est un document de travail de l'ANSSI. On ne dit jamais "conforme".
//
// NOTE FONT : la police Helvetica de @react-pdf/renderer ne supporte PAS les
// emojis, mais gere bien le Latin-1 accentue (é è à ...). Donc : accents oui,
// emojis non.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type AttestationData = {
  orgName: string;
  hostName: string;
  scenarioTitle: string;
  participantCount: number;
  avgScore: number;
  maxScore: number;
  modeLabel: string;
  dateStr: string;
  generatedStr: string;
};

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  gray: "#555555",
  light: "#EAF3F8",
  cream: "#FFF8E5",
};

const styles = StyleSheet.create({
  page: {
    padding: 44,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
    lineHeight: 1.5,
  },
  brand: { fontSize: 10, color: COLORS.accent, fontWeight: "bold" },
  eyebrow: {
    fontSize: 9,
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 4,
  },
  rule: {
    borderBottom: "2pt solid #0B3D91",
    marginBottom: 20,
    marginTop: 6,
    width: 70,
  },
  para: { marginBottom: 12 },
  detailBox: {
    backgroundColor: COLORS.light,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  row: { flexDirection: "row", marginBottom: 6 },
  key: { width: 130, color: COLORS.gray, fontSize: 10 },
  val: { flex: 1, fontWeight: "bold" },
  recyf: {
    backgroundColor: COLORS.cream,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    fontSize: 10.5,
  },
  caveat: {
    fontSize: 8.5,
    color: COLORS.gray,
    fontStyle: "italic",
    marginBottom: 24,
    lineHeight: 1.4,
  },
  signRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  signBlock: { width: "45%" },
  signLabel: { fontSize: 9, color: COLORS.gray, marginBottom: 18 },
  signValue: {
    fontSize: 11,
    fontWeight: "bold",
    borderTop: "1pt solid #999999",
    paddingTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 44,
    right: 44,
    fontSize: 8,
    color: COLORS.gray,
    textAlign: "center",
    borderTop: "0.5pt solid #CCCCCC",
    paddingTop: 8,
  },
});

export function AttestationPdf({ data }: { data: AttestationData }) {
  return (
    <Document
      title={`Attestation exercice de crise - ${data.orgName}`}
      author="Humanix Academie"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Humanix Academie</Text>
        <Text style={styles.eyebrow}>Registre des exercices</Text>
        <Text style={styles.title}>
          Attestation d&apos;exercice de crise cyber
        </Text>
        <View style={styles.rule} />

        <Text style={styles.para}>
          L&apos;organisation{" "}
          <Text style={{ fontWeight: "bold" }}>{data.orgName}</Text> atteste
          avoir realise, le {data.dateStr}, un exercice de gestion de crise
          d&apos;origine cyber, anime via la plateforme Humanix Academie.
        </Text>

        <View style={styles.detailBox}>
          <View style={styles.row}>
            <Text style={styles.key}>Scenario</Text>
            <Text style={styles.val}>{data.scenarioTitle}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Date</Text>
            <Text style={styles.val}>{data.dateStr}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Participants</Text>
            <Text style={styles.val}>{data.participantCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Format</Text>
            <Text style={styles.val}>{data.modeLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Score collectif</Text>
            <Text style={styles.val}>
              {data.avgScore} / {data.maxScore} (indicatif)
            </Text>
          </View>
        </View>

        <Text style={styles.recyf}>
          Cet exercice contribue a l&apos;objectif de securite n°15 du
          Referentiel Cyber France (ReCyF, ANSSI) : « Exercices, tests et
          entrainements », et aux bonnes pratiques de preparation a la gestion
          de crise attendues au titre de la directive NIS2. A verser au registre
          des exercices de l&apos;organisation.
        </Text>

        <Text style={styles.caveat}>
          Attestation declarative etablie a des fins internes de tracabilite.
          Elle ne constitue ni une certification ni une preuve opposable a un
          tiers ; le ReCyF est un document de travail de l&apos;ANSSI,
          susceptible d&apos;evoluer. Ce document ne remplace pas un exercice
          conduit ou audite par un prestataire qualifie.
        </Text>

        <View style={styles.signRow}>
          <View style={styles.signBlock}>
            <Text style={styles.signLabel}>
              Organisateur de l&apos;exercice
            </Text>
            <Text style={styles.signValue}>{data.hostName}</Text>
          </View>
          <View style={styles.signBlock}>
            <Text style={styles.signLabel}>Date d&apos;emission</Text>
            <Text style={styles.signValue}>{data.generatedStr}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Genere par Humanix Academie le {data.generatedStr} · La cyber humaine
          pour tous
        </Text>
      </Page>
    </Document>
  );
}
