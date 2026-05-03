// Dashboard Business — angle financier pour le dirigeant
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import { computeBusinessImpact, VERDICT_LABEL } from "@/lib/business-impact";
import BusinessImpactView from "@/components/BusinessImpactView";
import CodirMode from "@/components/CodirMode";
import LiveAttackMap from "@/components/LiveAttackMap";
import { CyberMeteoCard } from "@/components/CyberMeteoBadge";
import { getCyberMeteo } from "@/lib/cyber-meteo";

export const dynamic = "force-dynamic";

// Map verdict business-impact -> couleur CodirMode (4 niveaux)
const VERDICT_TO_CODIR_COLOR = {
  excellent: "green",
  bon: "amber",
  a_surveiller: "orange",
  a_risque: "red",
} as const;

export default async function AdminBusinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;

  const [impact, tenant, meteo] = await Promise.all([
    computeBusinessImpact(tenantId),
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    getCyberMeteo(),
  ]);
  const verdict = VERDICT_LABEL[impact.scoreVerdict];
  const tenantName = tenant?.name ?? "Votre organisation";

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <AdminNav />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
            💼 Impact Business
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Combien la cyber vous fait gagner — concret, en euros. Ce que votre assureur et votre COMEX veulent voir.
          </p>
        </div>
        <CodirMode
          collectiveScore={impact.collectiveScore}
          scoreVerdictLabel={verdict.label}
          scoreVerdictColor={VERDICT_TO_CODIR_COLOR[impact.scoreVerdict]}
          expectedAnnualLoss={impact.expectedAnnualLoss}
          incidentProbabilityPct={Math.round(impact.incidentProbability12m * 100)}
          estimatedAnnualSaving={impact.estimatedAnnualSaving}
          roiMultiplier={impact.roiMultiplier}
          totalSeats={impact.totalSeats}
          topActions={impact.topActions}
          tenantName={tenantName}
        />
      </div>

      {/* HERO : Impact financier en gros */}
      <div className={`card mb-8 bg-gradient-to-br ${verdict.bg} border-2 border-current`}>
        <div className="grid sm:grid-cols-3 gap-6 items-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600 font-bold">Score collectif</p>
            <p className="text-6xl sm:text-7xl font-extrabold text-primary-500 leading-none mt-1">
              {impact.collectiveScore}
              <span className="text-2xl text-gray-400">/100</span>
            </p>
            <p className={`text-lg font-bold ${verdict.color} mt-1`}>{verdict.label}</p>
            <p className="text-xs text-gray-500 mt-2">Moyenne pondérée des {impact.totalSeats} collaborateurs</p>
          </div>
          <div className="border-l border-r border-white/40 px-6">
            <p className="text-xs uppercase tracking-wide text-gray-600 font-bold">Coût attendu sur 12 mois</p>
            <p className="text-3xl sm:text-4xl font-extrabold text-warn mt-1">
              {impact.expectedAnnualLoss.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Probabilité incident : <strong>{Math.round(impact.incidentProbability12m * 100)}%</strong>
              <br />
              Coût moyen incident PME : <strong>{impact.estimatedIncidentCost.toLocaleString("fr-FR")} €</strong>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600 font-bold">ROI Humanix</p>
            <p className="text-4xl sm:text-5xl font-extrabold text-success mt-1">
              x{impact.roiMultiplier}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              Économie estimée : <strong>{impact.estimatedAnnualSaving.toLocaleString("fr-FR")} €/an</strong>
              <br />
              Coût Humanix : {impact.humanixAnnualCost.toLocaleString("fr-FR")} €/an
            </p>
          </div>
        </div>
      </div>

      <BusinessImpactView impact={impact} />

      {/* Cyber-météo France — niveau d'alerte cyber national en temps reel */}
      <div className="mt-8 mb-8">
        <CyberMeteoCard meteo={meteo} />
      </div>

      {/* Live Attack Map — effet "wouahh" en démo : prospect voit l'activité
          temps réel de son équipe arriver en live (clics phishing, modules,
          level-ups). SSE-driven, scoping tenant strict. */}
      <div className="mb-8">
        <LiveAttackMap />
      </div>

      {/* Plan d'action chiffre */}
      <div className="card mb-6">
        <h3 className="text-xl font-bold text-primary-500 mb-3">🎯 Plan d'action pour gagner des points</h3>
        <p className="text-sm text-gray-600 mb-4">Actions recommandées par ordre d'impact / facilité.</p>
        <div className="space-y-2">
          {impact.topActions.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xl">{i + 1}.</span>
              <div className="flex-1">
                <p className="font-medium text-primary-500">{a.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Difficulté :{" "}
                  <span className={a.difficulty === "easy" ? "text-success" : a.difficulty === "medium" ? "text-amber-600" : "text-warn"}>
                    {a.difficulty === "easy" ? "facile" : a.difficulty === "medium" ? "moyenne" : "élevée"}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-success">+{a.potentialPoints}</p>
                <p className="text-[10px] uppercase text-gray-500">pts/score</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Poster mensuel — différenciant unique pas chez les concurrents */}
      <div className="card mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl" aria-hidden="true">🖼️</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-amber-700 dark:text-amber-300">
              Poster du mois pour votre open-space
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              PDF A3 imprimable, personnalisé à votre nom et à votre service le plus à risque.
              Affichez-le dans la salle de pause — votre équipe l'attendra chaque mois.
            </p>
          </div>
          <a
            href={`/api/admin/poster-mensuel/${new Date().getMonth() + 1}/download`}
            download
            className="bg-amber-500 text-white font-bold text-sm py-2 px-4 rounded-xl hover:bg-amber-600 transition whitespace-nowrap"
          >
            📥 Télécharger ({new Date().toLocaleDateString("fr-FR", { month: "long" })})
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="card bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h3 className="text-xl font-bold mb-2">📤 Convaincre ton COMEX</h3>
        <p className="text-sm opacity-90 mb-4">
          Partage ce dashboard avec ton dirigeant ou ta direction financière.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/conformity-report"
            download
            className="bg-white text-primary-500 font-bold text-sm py-2 px-4 rounded-xl hover:scale-105 transition"
          >
            📄 Exporter rapport COMEX (PDF)
          </a>
          <Link
            href="/admin/utilisateurs"
            className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold text-sm py-2 px-4 rounded-xl hover:bg-white/20 transition"
          >
            ✉️ Envoyer un rappel aux inactifs
          </Link>
        </div>
      </div>
    </div>
  );
}
