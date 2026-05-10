// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/business - Dashboard Impact Business (angle financier dirigeant).
//
// Refonte juin 2026 (Sprint 2 bis) : decoupage des widgets visuels (Hero,
// ActionPlan, PosterCallout, ComexCallout) dans components/admin/business/.
// La page reste server component, charge les donnees Prisma + business-impact
// puis assemble les widgets.
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeBusinessImpact, VERDICT_LABEL } from "@/lib/business-impact";
import {
  buildAllExplanations,
  METHODOLOGY_LIMITATIONS,
} from "@/lib/business-impact-methodology";
import BusinessImpactView from "@/components/BusinessImpactView";
import CodirMode from "@/components/CodirMode";
import LiveAttackMap from "@/components/LiveAttackMap";
import { CyberMeteoCard } from "@/components/CyberMeteoBadge";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import BusinessMethodology from "@/components/admin/BusinessMethodology";
import BusinessHero from "@/components/admin/business/BusinessHero";
import ActionPlan from "@/components/admin/business/ActionPlan";
import PosterCallout from "@/components/admin/business/PosterCallout";
import ComexCallout from "@/components/admin/business/ComexCallout";

export const dynamic = "force-dynamic";

// Mapping verdict business-impact -> couleur CodirMode (4 niveaux)
const VERDICT_TO_CODIR_COLOR = {
  excellent: "green",
  bon: "amber",
  a_surveiller: "orange",
  a_risque: "red",
} as const;

export default async function AdminBusinessPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth)
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const [impact, tenant, meteo] = await Promise.all([
    computeBusinessImpact(tenantId),
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    getCyberMeteo(),
  ]);
  const verdict = VERDICT_LABEL[impact.scoreVerdict];
  const tenantName = tenant?.name ?? "Votre organisation";
  const explanations = buildAllExplanations(impact);

  return (
    <>
      <AdminPageHeader
        title="Impact business"
        description="Combien la cyber vous fait gagner - concret, en euros. Ce que votre assureur et votre COMEX veulent voir."
        actions={
          <CodirMode
            collectiveScore={impact.collectiveScore}
            scoreVerdictLabel={verdict.label}
            scoreVerdictColor={VERDICT_TO_CODIR_COLOR[impact.scoreVerdict]}
            expectedAnnualLoss={impact.expectedAnnualLoss}
            incidentProbabilityPct={Math.round(
              impact.incidentProbability12m * 100,
            )}
            estimatedAnnualSaving={impact.estimatedAnnualSaving}
            roiMultiplier={impact.roiMultiplier}
            totalSeats={impact.totalSeats}
            topActions={impact.topActions}
            tenantName={tenantName}
          />
        }
      />

      <div className="space-y-6 min-w-0">
        <BusinessHero
          collectiveScore={impact.collectiveScore}
          scoreVerdict={impact.scoreVerdict}
          totalSeats={impact.totalSeats}
          expectedAnnualLoss={impact.expectedAnnualLoss}
          incidentProbability12m={impact.incidentProbability12m}
          estimatedIncidentCost={impact.estimatedIncidentCost}
          roiMultiplier={impact.roiMultiplier}
          estimatedAnnualSaving={impact.estimatedAnnualSaving}
          humanixAnnualCost={impact.humanixAnnualCost}
        />

        {/* Methodologie & sources - placee tout de suite apres le hero pour
            que le DG / DAF puisse cliquer et comprendre d'ou viennent les
            chiffres avant d'aller plus loin. C'est ce qui transforme un
            "joli dashboard" en "outil de pilotage adopte par le COMEX". */}
        <BusinessMethodology
          explanations={explanations}
          limitations={METHODOLOGY_LIMITATIONS}
        />

        <BusinessImpactView impact={impact} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CyberMeteoCard meteo={meteo} />
          <LiveAttackMap />
        </div>

        <AdminSection
          title="Plan d'action pour gagner des points"
          description="Actions recommandées par ordre d'impact / facilité."
        >
          <ActionPlan actions={impact.topActions} />
        </AdminSection>

        <PosterCallout />

        <ComexCallout />
      </div>
    </>
  );
}
