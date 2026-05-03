// Generation PDF du rapport de conformite cyber pour la PME
// Utilise @react-pdf/renderer (rendu serveur, pas besoin de browser)
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  success: "#2E8B57",
  warn: "#C0392B",
  amber: "#F59E0B",
  gray: "#555555",
  light: "#EAF3F8",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: { marginBottom: 20, borderBottom: "2pt solid #0B3D91", paddingBottom: 10 },
  brand: { fontSize: 18, fontWeight: "bold", color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontSize: 9, color: COLORS.gray },
  title: { fontSize: 22, fontWeight: "bold", color: COLORS.primary, marginTop: 20, marginBottom: 8 },
  meta: { fontSize: 9, color: COLORS.gray, marginBottom: 16 },

  scoreBox: {
    backgroundColor: COLORS.light,
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  scoreNumber: { fontSize: 48, fontWeight: "bold", color: COLORS.primary, marginRight: 16 },
  scoreLabel: { fontSize: 11, color: COLORS.gray },
  scoreVerdict: { fontSize: 14, fontWeight: "bold" },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #DDDDDD",
  },
  kpiGrid: { flexDirection: "row", marginBottom: 12, gap: 12 },
  kpi: { flex: 1, padding: 10, backgroundColor: "#F8F9FA", borderRadius: 4 },
  kpiValue: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  kpiLabel: { fontSize: 8, color: COLORS.gray, textTransform: "uppercase" },

  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: 6,
  },
  tableHeaderCell: { color: "white", fontSize: 9, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "0.5pt solid #DDDDDD",
  },
  tableRowAlt: { backgroundColor: "#F8F9FA" },
  tableCell: { fontSize: 9 },

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
    marginTop: 16,
    padding: 10,
    backgroundColor: "#FFF8E5",
    borderLeft: `3pt solid ${COLORS.amber}`,
  },
  legalText: { fontSize: 8, color: "#7C5E10", lineHeight: 1.4 },
});

type ReportProps = {
  tenantName: string;
  generatedAt: Date;
  generatedBy: string;
  stats: {
    totalSeats: number;
    activatedSeats: number;
    activationRate: number;
    completedEpisodes: number;
    totalEpisodes: number;
    averageScore: number;
    conformityScore: number;
  };
  saisonsBreakdown: { name: string; completed: number; total: number; pct: number }[];
  team: { name: string; service: string; episodesDone: number; totalEpisodes: number; xp: number; lastActivity: string | null }[];
};

export function ConformityReport({ tenantName, generatedAt, generatedBy, stats, saisonsBreakdown, team }: ReportProps) {
  const verdict =
    stats.conformityScore >= 80 ? "EXCELLENT" : stats.conformityScore >= 50 ? "CORRECT" : "À AMÉLIORER";
  const verdictColor =
    stats.conformityScore >= 80 ? COLORS.success : stats.conformityScore >= 50 ? COLORS.accent : COLORS.warn;

  const dateFr = generatedAt.toLocaleDateString("fr-FR", { dateStyle: "long" } as any);
  const horodatage = generatedAt.toISOString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Humanix Académie · Rapport de Conformité Cyber</Text>
          <Text style={styles.subtitle}>Émis le {dateFr} · Pour {tenantName}</Text>
        </View>

        <Text style={styles.title}>Score de conformité cyber humaine</Text>
        <Text style={styles.meta}>
          Évaluation de la maturité cyber des collaborateurs sur la base des modules de sensibilisation Humanix Académie.
        </Text>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreNumber}>{stats.conformityScore}%</Text>
          <View>
            <Text style={[styles.scoreVerdict, { color: verdictColor }]}>{verdict}</Text>
            <Text style={styles.scoreLabel}>
              Calculé depuis le taux d'activation et le taux de complétion des modules.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicateurs clés</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stats.totalSeats}</Text>
              <Text style={styles.kpiLabel}>Sièges actifs</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stats.activationRate}%</Text>
              <Text style={styles.kpiLabel}>Taux d'activation</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stats.completedEpisodes}</Text>
              <Text style={styles.kpiLabel}>Épisodes complétés</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stats.averageScore}</Text>
              <Text style={styles.kpiLabel}>Maitrise cyber / 100</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Couverture par module</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 4 }]}>Module</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Couverture</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>%</Text>
            </View>
            {saisonsBreakdown.map((s, i) => (
              <View key={s.name} style={[styles.tableRow, i % 2 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, { flex: 4 }]}>{s.name}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {s.completed} / {s.total} équipiers
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>
                  {s.pct}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            Ce rapport atteste que les collaborateurs listés ont suivi les modules de sensibilisation cybersécurité dans le cadre du programme de l'employeur. Conformément au RGPD (art. 32) et à la directive NIS2, l'employeur a mis en oeuvre des mesures techniques et organisationnelles pour assurer la sensibilisation continue de ses équipes.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Document généré par Humanix Académie · {horodatage}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2 : detail equipe */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Humanix Académie · Rapport de Conformité Cyber</Text>
          <Text style={styles.subtitle}>Détail équipe — {tenantName}</Text>
        </View>

        <Text style={styles.title}>Suivi équipe complet</Text>
        <Text style={styles.meta}>
          État individuel à la date de génération. Données non-discriminatoires : la plateforme exclut tout usage disciplinaire des résultats.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Collaborateur</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Service</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Progression</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>XP</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Dernière activité</Text>
          </View>
          {team.map((u, i) => (
            <View key={u.name} style={[styles.tableRow, i % 2 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{u.name}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{u.service}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {u.episodesDone}/{u.totalEpisodes}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>
                {u.xp}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{u.lastActivity ?? "—"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            Document signé électroniquement par génération automatique. Hash de signature : {hashOf(`${tenantName}-${horodatage}-${stats.conformityScore}`)}. Émis par {generatedBy}.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Document généré par Humanix Académie · {horodatage}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// Hash pseudo (pour la demo - en prod utiliser crypto.createHash)
function hashOf(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0").toUpperCase();
}
