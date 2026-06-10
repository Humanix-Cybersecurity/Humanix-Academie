// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/exposition - Dashboard RSSI : veille d'exposition des salariés
// (Phase 2 B2B). Plan Enterprise. VERROUILLÉE OFF par défaut.
//
// Affiche l'état de la veille (triple garde), le panneau d'activation
// DPA-gated, et la liste des EmployeeExposure détectées avec les actions de
// VALIDATION RSSI (assigner formation / écarter). La détection est faite par
// le cron ; ici on ne fait que valider humainement.
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  isB2bGloballyEnabled,
  isB2bMonitoringActive,
  monitoringBlockedReason,
} from "@/lib/exposure/b2b-flags";
import ExpositionAdminClient, {
  type ExposureRow,
  type MonitoringState,
} from "./ExpositionAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminExpositionPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth).
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);

  // Gate : veille d'exposition = Enterprise.
  if (!planHasFeature(plan, "exposure_monitoring")) {
    return (
      <>
        <AdminPageHeader
          title="Veille d'exposition"
          description="Détectez les comptes salariés apparaissant dans des fuites publiques et déclenchez la formation adaptée."
        />
        <PlanGate
          feature="exposure_monitoring"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.exposure_monitoring}
        />
      </>
    );
  }

  const [tenant, rows] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        exposureMonitoringEnabled: true,
        exposureMonitoringDpaSignedAt: true,
        exposureDomains: true,
      },
    }),
    db.employeeExposure.findMany({
      where: { tenantId },
      orderBy: { detectedAt: "desc" },
      take: 200,
      select: {
        id: true,
        status: true,
        matchedDomain: true,
        detectedAt: true,
        user: { select: { name: true, email: true } },
        breach: { select: { title: true, organization: true } },
      },
    }),
  ]);

  const flags = {
    exposureMonitoringEnabled: tenant?.exposureMonitoringEnabled ?? false,
    exposureMonitoringDpaSignedAt: tenant?.exposureMonitoringDpaSignedAt ?? null,
    exposureDomains: tenant?.exposureDomains ?? [],
  };

  const monitoring: MonitoringState = {
    enabled: flags.exposureMonitoringEnabled,
    globallyEnabled: isB2bGloballyEnabled(),
    active: isB2bMonitoringActive(flags),
    blockedReason: monitoringBlockedReason(flags),
    domains: flags.exposureDomains,
    dpaSignedAt: flags.exposureMonitoringDpaSignedAt
      ? flags.exposureMonitoringDpaSignedAt.toISOString()
      : null,
  };

  const exposures: ExposureRow[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    matchedDomain: r.matchedDomain,
    detectedAt: r.detectedAt.toISOString(),
    userName: r.user?.name ?? r.user?.email ?? "Salarié",
    breachTitle: r.breach?.title ?? "Fuite",
    breachOrg: r.breach?.organization ?? null,
  }));

  return (
    <>
      <AdminPageHeader
        title="Veille d'exposition"
        description="Comptes salariés détectés dans des fuites publiques. Aucune notification n'est envoyée sans votre validation."
      />
      <ExpositionAdminClient monitoring={monitoring} exposures={exposures} />
    </>
  );
}
