// Generation PDF d'un poster mensuel A3 portrait imprimable.
//
// Personnalisation tenant : nom de l'organisation + service le plus à
// risque (depuis lib/business-impact). Le poster est PRET A IMPRIMER
// sur imprimante laser standard (A3, marges 1cm).
//
// Helvetica only (cf. note dans pdf-audit-flash.tsx) — pas d'emojis Unicode
// dans le PDF. On utilise des symboles Latin-1 compatibles + le nom du
// theme rendu textuellement.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { getPosterTheme, type PosterTheme } from "./themes";

export type PosterVariables = {
  month: number;
  tenantName: string;
  // Service le plus a risque (optionnel, pour personnalisation)
  weakestService?: string | null;
  weakestScore?: number | null;
  generatedAt: Date;
};

const COLORS_TO_HEX = (theme: PosterTheme) => ({
  bg: theme.bgColor,
  accent: theme.accentColor,
  white: "#FFFFFF",
  cream: "#FFF8E5",
  dark: "#1A1A1A",
});

const styles = StyleSheet.create({
  // A3 portrait : 297 x 420 mm = 842 x 1191 pt
  page: {
    padding: 0,
    fontFamily: "Helvetica",
  },
  bgBlock: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 600,
  },
  whiteBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 591,
    backgroundColor: "#FFFFFF",
  },
  // Bandeau du haut (couleur theme)
  topStrip: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  brandLine: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 4,
    marginBottom: 8,
    opacity: 0.85,
  },
  monthLabel: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    opacity: 0.95,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 56,
    fontWeight: "bold",
    lineHeight: 1.1,
    marginBottom: 24,
  },
  subtitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontStyle: "italic",
    opacity: 0.92,
    marginBottom: 40,
  },

  // Contenu principal (sur fond blanc)
  contentBlock: {
    paddingHorizontal: 60,
    paddingTop: 50,
  },
  hookBlock: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 40,
  },
  hookText: {
    fontSize: 18,
    color: "#1A1A1A",
    lineHeight: 1.5,
    fontWeight: "bold",
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: "row",
    marginBottom: 14,
    paddingLeft: 4,
  },
  actionNumber: {
    fontSize: 28,
    fontWeight: "bold",
    width: 36,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 1.4,
    color: "#1A1A1A",
    paddingTop: 4,
  },

  // Bloc personnalise tenant
  personalizedBlock: {
    marginTop: 30,
    padding: 18,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderLeft: "4pt solid",
  },
  personalizedLabel: {
    fontSize: 9,
    color: "#555555",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
    fontWeight: "bold",
  },
  personalizedText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 1.5,
  },

  // Pied de page
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
  },
  quote: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#555555",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 1.4,
  },
  brandFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
    borderTop: "1pt solid #DDDDDD",
  },
  brandFooterText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  brandFooterTagline: {
    fontSize: 9,
    color: "#555555",
  },
});

export function MonthlyPoster(props: { variables: PosterVariables }) {
  const v = props.variables;
  const theme = getPosterTheme(v.month);
  const C = COLORS_TO_HEX(theme);

  return (
    <Document>
      <Page size="A3" orientation="portrait" style={styles.page}>
        {/* Fond couleur theme en haut */}
        <View style={[styles.bgBlock, { backgroundColor: C.bg }]} />

        {/* Bandeau couleur — titre du poster */}
        <View style={styles.topStrip}>
          <Text style={styles.brandLine}>
            HUMANIX ACADÉMIE · POSTER DU MOIS
          </Text>
          <Text style={styles.monthLabel}>{theme.monthLabel}</Text>
          <Text style={styles.title}>{theme.title}</Text>
          <Text style={styles.subtitle}>{theme.subtitle}</Text>
        </View>

        {/* Contenu principal sur fond blanc */}
        <View style={styles.contentBlock}>
          {/* Hook : phrase choc */}
          <View
            style={[
              styles.hookBlock,
              { backgroundColor: C.cream, borderLeft: `4pt solid ${C.accent}` },
            ]}
          >
            <Text style={styles.hookText}>{theme.hook}</Text>
          </View>

          {/* 3 actions concretes */}
          <Text style={[styles.actionsTitle, { color: C.bg }]}>
            3 réflexes à adopter ce mois-ci
          </Text>
          {theme.actions.map((action, i) => (
            <View key={i} style={styles.actionItem} wrap={false}>
              <Text style={[styles.actionNumber, { color: C.accent }]}>
                {i + 1}.
              </Text>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}

          {/* Bloc personnalise pour le tenant */}
          {v.weakestService &&
            v.weakestScore != null &&
            v.weakestScore < 70 && (
              <View
                style={[
                  styles.personalizedBlock,
                  { borderLeftColor: C.accent },
                ]}
                wrap={false}
              >
                <Text style={styles.personalizedLabel}>
                  Spécifiquement pour {v.tenantName}
                </Text>
                <Text style={styles.personalizedText}>
                  Le service{" "}
                  <Text style={{ fontWeight: "bold" }}>{v.weakestService}</Text>{" "}
                  a un score de maîtrise cyber de{" "}
                  <Text style={{ fontWeight: "bold" }}>
                    {v.weakestScore}/100
                  </Text>
                  . C'est lui qui bénéficiera le plus des actions ci-dessus ce
                  mois-ci.
                </Text>
              </View>
            )}
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.quote}>{theme.factOrQuote}</Text>
          <View style={styles.brandFooter}>
            <View>
              <Text style={[styles.brandFooterText, { color: C.bg }]}>
                {v.tenantName} · Programme cyber Humanix Académie
              </Text>
              <Text style={styles.brandFooterTagline}>
                Imprimé le{" "}
                {v.generatedAt.toLocaleDateString("fr-FR", {
                  dateStyle: "long",
                } as any)}
              </Text>
            </View>
            <Text style={styles.brandFooterTagline}>
              humanix-cybersecurity.fr
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
