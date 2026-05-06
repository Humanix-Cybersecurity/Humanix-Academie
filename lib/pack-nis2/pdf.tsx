// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation du Pack NIS2 par-tenant en PDF unique multi-pages.
// 4 documents pre-remplis, signables tels quels par le dirigeant.
//
// Style aligne sur lib/pdf-audit-flash.tsx (sobriete + Helvetica Latin-1).
// Police par defaut Helvetica : on bannit les emojis (cf. note dans pdf-audit-flash).

import React from "react";
import {
  Document as PdfDocument,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { buildAllDocuments, type Document as DocSpec } from "./data";

export type PackNis2Variables = {
  tenantName: string;
  tenantSiren?: string | null;
  headquarterCity: string;
  directeurName: string;
  directeurTitle: string;
  directeurEmail: string;
  dpoOrReferent?: string | null;
  contactCriseName?: string | null;
  contactCriseEmail?: string | null;
  contactCriseTel?: string | null;
  generatedAt: Date;
  // Stats consolidees pour le registre
  totalLearners: number;
  totalCompletedModules: number;
  averageScore: number;
  riskScore: number;
  phishingCampaigns: number;
};

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  gray: "#555555",
  lightGray: "#888888",
  border: "#DDDDDD",
  bgLight: "#F8F9FA",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
  },

  header: {
    borderBottom: "2pt solid #0B3D91",
    paddingBottom: 8,
    marginBottom: 16,
  },
  brand: { fontSize: 14, color: COLORS.primary, fontWeight: "bold" },
  subBrand: { fontSize: 9, color: COLORS.gray, marginTop: 2 },

  // Doc title
  docTitle: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 4,
  },
  docSubtitle: { fontSize: 10, color: COLORS.gray, marginBottom: 16 },

  // Sections
  sectionHeading: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: { fontSize: 10, lineHeight: 1.45, marginBottom: 5 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, fontSize: 10, lineHeight: 1.45 },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.45 },

  // Cover
  coverTitle: {
    fontSize: 32,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "bold",
  },
  coverBlock: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  coverLabel: {
    fontSize: 8,
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coverValue: { fontSize: 14, color: COLORS.primary, fontWeight: "bold" },

  // TOC
  tocItem: { fontSize: 11, marginBottom: 6, lineHeight: 1.4 },
  tocNumber: { fontWeight: "bold", color: COLORS.accent },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.lightGray,
    borderTop: "0.5pt solid #DDDDDD",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function PageHeader({
  tenantName,
  generatedAt,
}: {
  tenantName: string;
  generatedAt: Date;
}) {
  const dateFr = generatedAt.toLocaleDateString("fr-FR", { dateStyle: "long" });
  return (
    <View style={styles.header} fixed>
      <Text style={styles.brand}>Humanix Académie · Pack Conformité NIS2</Text>
      <Text style={styles.subBrand}>
        Préparé pour {tenantName} - émis le {dateFr}
      </Text>
    </View>
  );
}

function PageFooter({
  tenantName,
  generatedAt,
}: {
  tenantName: string;
  generatedAt: Date;
}) {
  const horodatage = generatedAt.toISOString();
  return (
    <View style={styles.footer} fixed>
      <Text>
        {tenantName} · Pack NIS2 · {horodatage}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

function DocSection({ section }: { section: DocSpec["sections"][number] }) {
  return (
    <View>
      {section.heading && (
        <Text style={styles.sectionHeading}>{section.heading}</Text>
      )}
      {section.paragraphs.map((p, i) => (
        <Text key={`p-${i}`} style={styles.paragraph}>
          {p}
        </Text>
      ))}
      {section.bullets?.map((b, i) => (
        <View key={`b-${i}`} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export function PackNis2Pdf(props: { variables: PackNis2Variables }) {
  const v = props.variables;
  const docs = buildAllDocuments(v);
  const dateFr = v.generatedAt.toLocaleDateString("fr-FR", {
    dateStyle: "long",
  });

  return (
    <PdfDocument>
      {/* COUV */}
      <Page size="A4" style={styles.page}>
        <PageHeader tenantName={v.tenantName} generatedAt={v.generatedAt} />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.coverTitle}>Pack Conformité NIS2</Text>
          <Text style={styles.coverSubtitle}>4 documents prêts à signer</Text>

          <View style={styles.coverBlock}>
            <Text style={styles.coverLabel}>Préparé pour</Text>
            <Text style={styles.coverValue}>{v.tenantName}</Text>
            {v.tenantSiren && (
              <Text
                style={[styles.paragraph, { marginTop: 4, color: COLORS.gray }]}
              >
                SIREN : {v.tenantSiren}
              </Text>
            )}
          </View>

          <View style={styles.coverBlock}>
            <Text style={styles.coverLabel}>Date d'émission</Text>
            <Text style={styles.coverValue}>{dateFr}</Text>
          </View>

          <View style={styles.coverBlock}>
            <Text style={styles.coverLabel}>Sommaire</Text>
            {docs.map((d, i) => (
              <Text key={i} style={styles.tocItem}>
                <Text style={styles.tocNumber}>{i + 1}.</Text> {d.title}
              </Text>
            ))}
          </View>

          <Text
            style={[styles.paragraph, { marginTop: 16, color: COLORS.gray }]}
          >
            Ce pack documentaire couvre les exigences de l'article 21 (mesures
            de gestion des risques) et de l'article 23 (notification d'incident)
            de la directive NIS2, transposée en France. Les documents sont
            rédigés pour être signables tels quels par un dirigeant non-juriste,
            à adapter marginalement à votre contexte. Ils ne se substituent pas
            à un audit réglementaire formel mais constituent un socle
            organisationnel solide.
          </Text>
        </View>
        <PageFooter tenantName={v.tenantName} generatedAt={v.generatedAt} />
      </Page>

      {/* DOCUMENTS */}
      {docs.map((doc, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <PageHeader tenantName={v.tenantName} generatedAt={v.generatedAt} />
          <Text style={styles.docTitle}>
            {idx + 1}. {doc.title}
          </Text>
          <Text style={styles.docSubtitle}>{doc.subtitle}</Text>
          {doc.sections.map((s, j) => (
            <DocSection key={j} section={s} />
          ))}
          {doc.footer && (
            <Text
              style={[styles.paragraph, { marginTop: 16, color: COLORS.gray }]}
            >
              {doc.footer}
            </Text>
          )}
          <PageFooter tenantName={v.tenantName} generatedAt={v.generatedAt} />
        </Page>
      ))}
    </PdfDocument>
  );
}
