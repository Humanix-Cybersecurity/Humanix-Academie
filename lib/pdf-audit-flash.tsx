// PDF du rapport d'audit flash cyber HumaniX.
// Genere serveur via @react-pdf/renderer.
// Style aligne sur lib/pdf-report.tsx pour coherence visuelle.
//
// IMPORTANT FONT NOTE :
// La police par defaut Helvetica de @react-pdf/renderer NE supporte PAS les
// emojis (Unicode > U+00FF). Tout emoji affichera des glyphes corrompus
// (ex. "📧" -> "=ç"). On utilise donc UNIQUEMENT du texte / des symboles
// supportes par Helvetica (Latin-1 + symboles de base : • · § « » → ° ✓).
// Les emojis riches restent dans le rendu HTML.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  AuditResult,
  CompanySize,
  Sector,
  SIZE_LABELS,
  SECTOR_LABELS,
} from "@/lib/audit-flash/scoring";

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  success: "#2E8B57",
  warn: "#C0392B",
  amber: "#F59E0B",
  orange: "#E67E22",
  gray: "#555555",
  light: "#EAF3F8",
  cream: "#FFF8E5",
};

const VERDICT_COLOR = {
  green: COLORS.success,
  amber: COLORS.amber,
  orange: COLORS.orange,
  red: COLORS.warn,
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: {
    marginBottom: 20,
    borderBottom: "2pt solid #0B3D91",
    paddingBottom: 10,
  },
  brand: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: { fontSize: 9, color: COLORS.gray },

  // Hero score
  hero: {
    backgroundColor: COLORS.light,
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  scoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 24,
    border: "4pt solid",
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  scoreLabel: { fontSize: 8, color: COLORS.gray, marginTop: -2 },
  heroRight: { flex: 1 },
  heroVerdict: { fontSize: 22, fontWeight: "bold", marginBottom: 6 },
  heroSummary: { fontSize: 10, color: "#333333", lineHeight: 1.4 },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #DDDDDD",
  },
  paragraph: { fontSize: 10, lineHeight: 1.4, marginBottom: 6 },

  // Identite client
  identityGrid: { flexDirection: "row", marginBottom: 12, gap: 12 },
  identityCard: {
    flex: 1,
    padding: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
  },
  identityLabel: {
    fontSize: 7,
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  identityValue: { fontSize: 11, fontWeight: "bold", color: "#1A1A1A", marginTop: 2 },

  // Risques
  riskCard: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeft: "3pt solid",
  },
  riskHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  riskBadge: {
    fontSize: 7,
    fontWeight: "bold",
    color: "white",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
  },
  riskTitle: { fontSize: 12, fontWeight: "bold", color: "#1A1A1A" },
  riskQuestionList: { marginTop: 4, marginBottom: 6 },
  riskQuestion: {
    fontSize: 9,
    color: "#444444",
    marginBottom: 3,
    paddingLeft: 6,
  },
  riskRecommendation: {
    fontSize: 9,
    color: COLORS.primary,
    fontStyle: "italic",
    marginTop: 6,
    paddingTop: 6,
    borderTop: "0.5pt solid #DDDDDD",
  },

  // Recommandation HumaniX
  recoBox: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  recoTitle: { fontSize: 12, color: "white", marginBottom: 4 },
  recoPlanName: {
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    marginBottom: 6,
  },
  recoPrice: { fontSize: 14, color: COLORS.light, marginBottom: 10 },
  recoRationale: { fontSize: 10, color: "white", lineHeight: 1.4 },
  recoCta: {
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: "white",
    padding: 6,
    marginTop: 12,
    fontWeight: "bold",
    textAlign: "center",
    borderRadius: 4,
  },

  // NIS2
  nis2Box: {
    backgroundColor: COLORS.cream,
    borderLeft: `3pt solid ${COLORS.amber}`,
    padding: 10,
    marginBottom: 12,
  },
  nis2Title: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#7C5E10",
    marginBottom: 4,
  },
  nis2Text: { fontSize: 9, color: "#7C5E10", lineHeight: 1.4 },

  // Footer + legal
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.gray,
    borderTop: "0.5pt solid #DDDDDD",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legalBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
  },
  legalText: { fontSize: 8, color: COLORS.gray, lineHeight: 1.4 },

  // Methodo (page 2)
  methodTitle: { fontSize: 14, color: COLORS.primary, fontWeight: "bold", marginBottom: 8 },
  methodPara: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  methodList: { marginLeft: 12, marginBottom: 8 },
  methodBullet: { fontSize: 10, marginBottom: 4, lineHeight: 1.4 },
});

const SEVERITY_COLORS = {
  critique: COLORS.warn,
  important: COLORS.orange,
  moyen: COLORS.amber,
};

const SEVERITY_BG_TINT = {
  critique: "#FCEDEB",
  important: "#FCF1E5",
  moyen: "#FFF8E5",
};

type AuditPdfProps = {
  companyName: string;
  contactName?: string | null;
  email: string;
  size: CompanySize;
  sector: Sector;
  generatedAt: Date;
  result: AuditResult;
};

export function AuditFlashReport({
  companyName,
  contactName: _contactName,
  email,
  size,
  sector,
  generatedAt,
  result,
}: AuditPdfProps) {
  const dateFr = generatedAt.toLocaleDateString("fr-FR", { dateStyle: "long" } as any);
  const horodatage = generatedAt.toISOString();
  const verdictColor = VERDICT_COLOR[result.verdict.color];

  return (
    <Document>
      {/* PAGE 1 - SCORE & RECOMMANDATION */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Humanix Académie · Audit Cyber Flash</Text>
          <Text style={styles.subtitle}>
            Rapport personnalisé pour {companyName} — émis le {dateFr}
          </Text>
        </View>

        {/* Identite */}
        <View style={styles.identityGrid}>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Entreprise</Text>
            <Text style={styles.identityValue}>{companyName}</Text>
          </View>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Effectif</Text>
            <Text style={styles.identityValue}>{SIZE_LABELS[size]}</Text>
          </View>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Secteur</Text>
            <Text style={styles.identityValue}>{SECTOR_LABELS[sector]}</Text>
          </View>
        </View>

        {/* Hero score */}
        <View style={styles.hero}>
          <View style={[styles.scoreCircle, { borderColor: verdictColor }]}>
            <Text style={styles.scoreValue}>{result.score}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={[styles.heroVerdict, { color: verdictColor }]}>
              {result.verdict.label}
            </Text>
            <Text style={styles.heroSummary}>{result.verdict.summary}</Text>
          </View>
        </View>

        {/* NIS2 alerte */}
        {result.nis2Concerned && (
          <View style={styles.nis2Box}>
            <Text style={styles.nis2Title}>
              ATTENTION NIS2 — Votre entreprise est probablement concernée
            </Text>
            <Text style={styles.nis2Text}>
              La directive NIS2, transposée en France, impose des obligations de
              sécurité et de notification d'incident sous 24h. Compte tenu de votre
              taille et / ou de votre secteur, vous êtes a priori dans le périmètre.
              Sanctions potentielles : jusqu'à 10 M€ ou 2 % du CA mondial. Nous
              recommandons une vérification rapide de votre statut.
            </Text>
          </View>
        )}

        {/* Top 3 risques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos 3 risques prioritaires</Text>
          {result.topRisks.length === 0 && (
            <Text style={styles.paragraph}>
              Excellent : aucun risque majeur détecté à ce stade. Continuez à
              maintenir votre niveau de vigilance.
            </Text>
          )}
          {result.topRisks.map((risk) => (
            <View
              key={risk.category}
              style={[
                styles.riskCard,
                {
                  borderLeftColor: SEVERITY_COLORS[risk.severity],
                  backgroundColor: SEVERITY_BG_TINT[risk.severity],
                },
              ]}
            >
              <View style={styles.riskHeader}>
                <Text
                  style={[
                    styles.riskBadge,
                    { backgroundColor: SEVERITY_COLORS[risk.severity] },
                  ]}
                >
                  {risk.severity.toUpperCase()}
                </Text>
                <Text style={styles.riskTitle}>
                  {risk.categoryLabel}
                </Text>
              </View>
              <View style={styles.riskQuestionList}>
                {risk.failedQuestions.slice(0, 3).map((q) => (
                  <Text key={q.id} style={styles.riskQuestion}>
                    • {q.text}
                  </Text>
                ))}
              </View>
              <Text style={styles.riskRecommendation}>
                Action recommandée : {risk.recommendation}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Audit Flash · Humanix-Cybersecurity · {horodatage}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 2 - PLAN D'ACTION HUMANIX */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Humanix Académie · Plan d'action</Text>
          <Text style={styles.subtitle}>Recommandation personnalisée pour {companyName}</Text>
        </View>

        {/* Reco HumaniX */}
        <View style={styles.recoBox}>
          <Text style={styles.recoTitle}>Notre recommandation pour vous</Text>
          <Text style={styles.recoPlanName}>HumaniX {result.recommendedPlan.name}</Text>
          <Text style={styles.recoPrice}>
            {result.recommendedPlan.monthlyPrice} · {result.recommendedPlan.annualEstimate}
          </Text>
          <Text style={styles.recoRationale}>{result.recommendedPlan.rationale}</Text>
          <Text style={styles.recoCta}>
            {"→"} Démarrez gratuitement sur humanix-cybersecurity.fr
          </Text>
        </View>

        {/* Methodologie */}
        <View style={styles.section}>
          <Text style={styles.methodTitle}>Comment lire ce score ?</Text>
          <Text style={styles.methodPara}>
            Le score d'audit flash est calculé sur 15 questions clés couvrant 5
            domaines : identités (MFA, mots de passe), protection des données
            (sauvegardes, RGPD), facteur humain (formation, phishing),
            infrastructure (mises à jour, antivirus) et conformité (NIS2,
            assurance, plan de réponse).
          </Text>
          <Text style={styles.methodPara}>
            Chaque question est pondérée selon sa criticité (1 à 3 points). Une
            réponse "OUI" rapporte les points, "NON" et "Je ne sais pas" sont
            traitées de la même façon : en cybersécurité, ne pas savoir équivaut
            à ne pas faire.
          </Text>

          <Text style={[styles.methodTitle, { marginTop: 14 }]}>
            Prochaines étapes recommandées
          </Text>
          <View style={styles.methodList}>
            <Text style={styles.methodBullet}>
              1. Corriger les 3 risques prioritaires identifiés en page 1 (objectif
              30 jours).
            </Text>
            <Text style={styles.methodBullet}>
              2. Lancer un programme de sensibilisation continu pour vos équipes
              (5 min / semaine suffisent — c'est la promesse HumaniX Académie).
            </Text>
            <Text style={styles.methodBullet}>
              3. Documenter votre démarche : registre RGPD, plan de réponse à
              incident, registre des formations (utile pour assurance, audit
              client, NIS2).
            </Text>
            <Text style={styles.methodBullet}>
              4. Mesurer trimestriellement votre progression (refaire l'audit dans
              3 mois pour comparer).
            </Text>
          </View>
        </View>

        {/* Coordonnees */}
        <View style={styles.section}>
          <Text style={styles.methodTitle}>Pour aller plus loin</Text>
          <Text style={styles.methodPara}>
            Une question sur ce rapport ? Un besoin d'accompagnement spécifique ?
            Notre équipe est à votre disposition.
          </Text>
          <Text style={styles.methodPara}>
            Email : contact@humanix-cybersecurity.fr
          </Text>
          <Text style={styles.methodPara}>
            Web : https://humanix-cybersecurity.fr
          </Text>
        </View>

        {/* Mentions */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            Ce rapport a une vocation pédagogique et constitue un diagnostic
            indicatif basé sur les déclarations effectuées. Il ne se substitue pas
            à un audit cyber complet (PASSI, ISO 27001, etc.). Humanix-Cybersecurity
            SASU décline toute responsabilité quant aux décisions prises sur la base
            de ce seul document. Données traitées conformément au RGPD : vous
            pouvez demander l'effacement de vos données à rgpd@humanix-cybersecurity.fr.
            Émis le {horodatage} pour {email}.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Audit Flash · Humanix-Cybersecurity · {horodatage}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
