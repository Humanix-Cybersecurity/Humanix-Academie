// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Generation du RAPPORT ANNUEL NIS2 d'un tenant (Pack NIS2 v2 - C).
//
// A destination de l'autorite competente (CSIRT national / ANSSI en France)
// ou pour archivage interne lors d'un audit. Couvre l'integralite de
// l'annee ecoulee :
//
//   1. Identite de l'entite + perimetre NIS2
//   2. Etat des lieux conformite (score per-article temps reel)
//   3. Incidents declares dans l'annee (depuis IncidentResponse)
//   4. Actions de sensibilisation (modules termines, campagnes phishing)
//   5. Plan d'action a 12 mois (chantiers prioritaires)
//   6. Engagement signe de la direction
//
// Format : PDF horodate, multi-pages, Helvetica (compat universelle).
// L'admin telecharge le rapport depuis /admin/conformite-nis2/rapport-annuel
// puis le transmet a l'autorite (en cas de demande) ou l'archive en interne.

import React from "react";
import {
  Document as PdfDocument,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Nis2TenantScore } from "@/lib/nis2/score-tenant";

export type AnnualReportData = {
  // Identite
  tenantName: string;
  tenantSiren?: string | null;
  headquarterCity: string;
  directeurName: string;
  directeurTitle: string;
  directeurEmail: string;
  dpoOrReferent?: string | null;
  // Periode couverte
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  // Etat des lieux
  nis2Score: Nis2TenantScore;
  // Incidents declares dans la periode
  incidents: Array<{
    reference: string;
    type: string;
    severity: string;
    detectedAt: Date;
    status: string;
    affectedUsers: number | null;
    notifiedToAuthority: boolean;
  }>;
  // Sensibilisation
  totalLearners: number;
  totalCompletedModules: number;
  averageScore: number;
  phishingCampaignsRun: number;
  phishingClickRate: number; // 0-100
};

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  gray: "#555555",
  lightGray: "#888888",
  border: "#DDDDDD",
  bgLight: "#F8F9FA",
  good: "#10B981",
  warn: "#F59E0B",
  bad: "#DC2626",
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
  meta: { fontSize: 8, color: COLORS.lightGray, marginTop: 4 },
  h1: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 14,
  },
  h2: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
    borderBottom: "1pt solid #DDDDDD",
    paddingBottom: 4,
  },
  h3: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  p: { marginBottom: 6, lineHeight: 1.5 },
  bullet: { marginLeft: 14, marginBottom: 3 },
  kv: { flexDirection: "row", marginBottom: 3 },
  kvKey: { width: 150, color: COLORS.gray },
  kvValue: { flex: 1, color: "#000" },
  table: {
    marginTop: 6,
    border: `1pt solid ${COLORS.border}`,
  },
  trHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bgLight,
    borderBottom: `1pt solid ${COLORS.border}`,
    fontWeight: "bold",
    fontSize: 9,
  },
  tr: {
    flexDirection: "row",
    borderBottom: `1pt solid ${COLORS.border}`,
    fontSize: 9,
  },
  trLast: { flexDirection: "row", fontSize: 9 },
  td: { padding: 6 },
  tdArticle: { width: 60, padding: 6, fontWeight: "bold" },
  tdTitle: { flex: 2, padding: 6 },
  tdScore: { width: 60, padding: 6, textAlign: "right", fontWeight: "bold" },
  scoreBig: {
    fontSize: 32,
    color: COLORS.primary,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  verdict: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 10,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.lightGray,
    textAlign: "center",
    borderTop: `1pt solid ${COLORS.border}`,
    paddingTop: 6,
  },
  signature: {
    marginTop: 30,
    paddingTop: 12,
    borderTop: "1pt dashed #888",
  },
  alertBox: {
    backgroundColor: "#FEF3C7",
    border: "1pt solid #F59E0B",
    padding: 8,
    marginVertical: 6,
    fontSize: 9,
  },
});

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function periodLabel(d: AnnualReportData): string {
  return `Du ${fmtDate(d.periodStart)} au ${fmtDate(d.periodEnd)}`;
}

function scoreColor(score: number | null): string {
  if (score === null) return COLORS.lightGray;
  if (score >= 80) return COLORS.good;
  if (score >= 60) return COLORS.accent;
  if (score >= 40) return COLORS.warn;
  return COLORS.bad;
}

function verdictLabel(score: number): string {
  if (score >= 80) return "Posture conforme NIS2 (robuste)";
  if (score >= 60) return "Posture en marche (plan a 6 mois)";
  if (score >= 40) return "Posture fragile (plan urgent)";
  return "Posture insuffisante (action immediate requise)";
}

export function AnnualReportPdf({ data }: { data: AnnualReportData }) {
  return (
    <PdfDocument
      title={`Rapport annuel NIS2 - ${data.tenantName}`}
      author={data.tenantName}
      creator="Humanix Académie"
      producer="Humanix Académie"
    >
      {/* ============ PAGE 1 - COUVERTURE + ETAT DES LIEUX ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>RAPPORT ANNUEL NIS2</Text>
          <Text style={styles.meta}>
            {data.tenantName}
            {data.tenantSiren ? ` · SIREN ${data.tenantSiren}` : ""} ·{" "}
            {periodLabel(data)}
          </Text>
        </View>

        <Text style={styles.h1}>État des lieux conformité NIS2</Text>

        <View style={styles.kv}>
          <Text style={styles.kvKey}>Entité concernée</Text>
          <Text style={styles.kvValue}>{data.tenantName}</Text>
        </View>
        {data.tenantSiren && (
          <View style={styles.kv}>
            <Text style={styles.kvKey}>SIREN</Text>
            <Text style={styles.kvValue}>{data.tenantSiren}</Text>
          </View>
        )}
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Siège</Text>
          <Text style={styles.kvValue}>{data.headquarterCity}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Responsable</Text>
          <Text style={styles.kvValue}>
            {data.directeurName}, {data.directeurTitle}
          </Text>
        </View>
        {data.dpoOrReferent && (
          <View style={styles.kv}>
            <Text style={styles.kvKey}>Référent cyber/DPO</Text>
            <Text style={styles.kvValue}>{data.dpoOrReferent}</Text>
          </View>
        )}
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Période couverte</Text>
          <Text style={styles.kvValue}>{periodLabel(data)}</Text>
        </View>

        <Text style={styles.h2}>1. Score global de conformité</Text>
        <Text
          style={{ ...styles.scoreBig, color: scoreColor(data.nis2Score.globalScore) }}
        >
          {data.nis2Score.globalScore} / 100
        </Text>
        <Text
          style={{ ...styles.verdict, color: scoreColor(data.nis2Score.globalScore) }}
        >
          {verdictLabel(data.nis2Score.globalScore)}
        </Text>
        <Text style={styles.p}>
          Score basé sur la complétion réelle des modules de sensibilisation
          mappés aux articles de la directive NIS2 par les{" "}
          {data.nis2Score.activeUsersCount} utilisateur(s) actif(s) du
          périmètre. Méthodologie : pour chaque article, moyenne des ratios
          de complétion des saisons Humanix qui le couvrent. Articles non
          couverts (N/A) exclus du calcul global.
        </Text>

        <Text style={styles.h2}>2. Score par article NIS2</Text>
        <View style={styles.table}>
          <View style={styles.trHeader}>
            <Text style={styles.tdArticle}>Article</Text>
            <Text style={styles.tdTitle}>Domaine</Text>
            <Text style={styles.tdScore}>Score</Text>
          </View>
          {data.nis2Score.articles.map((a, i) => {
            const isLast = i === data.nis2Score.articles.length - 1;
            return (
              <View key={a.article} style={isLast ? styles.trLast : styles.tr}>
                <Text style={styles.tdArticle}>{a.article}</Text>
                <Text style={styles.tdTitle}>{a.title}</Text>
                <Text
                  style={{
                    ...styles.tdScore,
                    color: scoreColor(a.score),
                  }}
                >
                  {a.score === null ? "N/A" : `${a.score}%`}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Humanix Académie · Rapport annuel NIS2 · Page 1/3 · Généré le{" "}
          {fmtDate(data.generatedAt)}
        </Text>
      </Page>

      {/* ============ PAGE 2 - INCIDENTS + SENSIBILISATION ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>RAPPORT ANNUEL NIS2 · suite</Text>
          <Text style={styles.meta}>
            {data.tenantName} · {periodLabel(data)}
          </Text>
        </View>

        <Text style={styles.h2}>3. Incidents déclarés dans la période</Text>
        {data.incidents.length === 0 ? (
          <Text style={styles.p}>
            Aucun incident de sécurité formel n&apos;a été enregistré dans
            la période couverte par ce rapport. (Cela ne signifie pas
            absence totale d&apos;événements ; cela signifie qu&apos;aucun
            n&apos;a été qualifié comme incident NIS2 par l&apos;équipe.)
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHeader}>
              <Text style={{ ...styles.td, width: 80 }}>Référence</Text>
              <Text style={{ ...styles.td, flex: 1 }}>Type</Text>
              <Text style={{ ...styles.td, width: 70 }}>Sévérité</Text>
              <Text style={{ ...styles.td, width: 70 }}>Détecté</Text>
              <Text style={{ ...styles.td, width: 60 }}>Statut</Text>
              <Text style={{ ...styles.td, width: 70 }}>
                Autorité notifiée
              </Text>
            </View>
            {data.incidents.map((inc, i) => {
              const isLast = i === data.incidents.length - 1;
              return (
                <View
                  key={inc.reference}
                  style={isLast ? styles.trLast : styles.tr}
                >
                  <Text style={{ ...styles.td, width: 80 }}>
                    {inc.reference}
                  </Text>
                  <Text style={{ ...styles.td, flex: 1 }}>{inc.type}</Text>
                  <Text style={{ ...styles.td, width: 70 }}>
                    {inc.severity}
                  </Text>
                  <Text style={{ ...styles.td, width: 70 }}>
                    {fmtDate(inc.detectedAt)}
                  </Text>
                  <Text style={{ ...styles.td, width: 60 }}>{inc.status}</Text>
                  <Text style={{ ...styles.td, width: 70 }}>
                    {inc.notifiedToAuthority ? "OUI" : "-"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.h2}>
          4. Actions de sensibilisation cyber (art. 21.2.g + art. 20)
        </Text>
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Apprenants actifs</Text>
          <Text style={styles.kvValue}>{data.totalLearners}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Modules complétés (total)</Text>
          <Text style={styles.kvValue}>{data.totalCompletedModules}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Score moyen aux quiz</Text>
          <Text style={styles.kvValue}>
            {Math.round(data.averageScore)} / 100
          </Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Campagnes phishing simulé</Text>
          <Text style={styles.kvValue}>{data.phishingCampaignsRun}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.kvKey}>Taux de clic phishing</Text>
          <Text style={styles.kvValue}>
            {Math.round(data.phishingClickRate)} %
          </Text>
        </View>

        <Text style={styles.p}>
          Méthode : programme continu Humanix Académie, modules de 5-10 min
          adaptés aux postes, simulations phishing intégrées, suivi
          individuel + agrégé. Tous les cadres dirigeants (CODIR, COMEX)
          sont inclus, conformément à l&apos;article 20 NIS2.
        </Text>

        <Text style={styles.footer}>
          Humanix Académie · Rapport annuel NIS2 · Page 2/3 · Généré le{" "}
          {fmtDate(data.generatedAt)}
        </Text>
      </Page>

      {/* ============ PAGE 3 - PLAN + ENGAGEMENT ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>RAPPORT ANNUEL NIS2 · plan</Text>
          <Text style={styles.meta}>
            {data.tenantName} · {periodLabel(data)}
          </Text>
        </View>

        <Text style={styles.h2}>5. Chantiers prioritaires (12 mois)</Text>
        <Text style={styles.p}>
          Articles avec le score le plus faible, à traiter en priorité dans
          la période suivante.
        </Text>
        {data.nis2Score.articles
          .filter((a) => a.score !== null && a.score < 80)
          .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
          .slice(0, 5)
          .map((a) => (
            <View key={a.article} style={{ marginBottom: 8 }}>
              <Text style={styles.h3}>
                Art. {a.article} - {a.title} ({a.score} / 100)
              </Text>
              <Text style={styles.p}>{a.description}</Text>
            </View>
          ))}

        <Text style={styles.h2}>6. Engagement de la direction</Text>
        <Text style={styles.p}>
          Je soussigné {data.directeurName}, en qualité de{" "}
          {data.directeurTitle} de {data.tenantName}, atteste de
          l&apos;exactitude des informations communiquées dans le présent
          rapport et m&apos;engage à mettre en œuvre le plan d&apos;action
          de la section 5 dans les 12 prochains mois.
        </Text>
        <Text style={styles.p}>
          Je confirme également :
        </Text>
        <Text style={styles.bullet}>
          - Avoir suivi la formation cybersécurité obligatoire des
          dirigeants (art. 20 NIS2) dans les 24 derniers mois ;
        </Text>
        <Text style={styles.bullet}>
          - Que le rapport sera transmis au CSIRT compétent (ANSSI en
          France) sur demande de l&apos;autorité ;
        </Text>
        <Text style={styles.bullet}>
          - Que les indicateurs présentés sont auditables sur la plateforme
          Humanix Académie et reproductibles à tout moment.
        </Text>

        <View style={styles.signature}>
          <Text>
            Fait à {data.headquarterCity}, le {fmtDate(data.generatedAt)}.
          </Text>
          <Text style={{ marginTop: 18 }}>
            {data.directeurName}, {data.directeurTitle}
          </Text>
          <Text style={{ marginTop: 2, color: COLORS.gray }}>
            {data.directeurEmail}
          </Text>
          <Text style={{ marginTop: 30 }}>Signature :</Text>
        </View>

        <View style={styles.alertBox}>
          <Text style={{ fontWeight: "bold" }}>
            Note méthodologique
          </Text>
          <Text>
            Ce rapport est un outil d&apos;auto-évaluation et de
            communication interne. Il ne se substitue pas à un audit formel
            réalisé par un PASSI (Prestataire d&apos;Audit de la Sécurité
            des Systèmes d&apos;Information) qui resterait nécessaire en
            cas de contrôle inopiné de l&apos;autorité compétente.
          </Text>
        </View>

        <Text style={styles.footer}>
          Humanix Académie · Rapport annuel NIS2 · Page 3/3 · Généré le{" "}
          {fmtDate(data.generatedAt)}
        </Text>
      </Page>
    </PdfDocument>
  );
}
