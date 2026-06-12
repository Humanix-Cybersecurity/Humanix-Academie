// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/conformite - Hub conformité multi-référentiels.
//
// Vue d'ensemble de la couverture Humanix sur les 7 référentiels (ISO 27001,
// NIS2, RGPD, ANSSI-HG, NIST-CSF, Sapin II, SOC2) : % de couverture, statut
// par contrôle, contrôles hors périmètre (affichés honnêtement), et CTA
// d'export de la preuve vers CISO Assistant.
//
// Source de vérité : lib/mapping-grc.ts (mapping + principe anti-surcote) +
// lib/conformite/coverage.ts (calcul par tenant, réutilise grc-metrics).
// =============================================================================

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTenantPlan } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { computeAllFrameworksCoverage } from "@/lib/conformite/coverage";
import ConformiteHub, { type FrameworkCoverageView } from "./ConformiteHub";

export const dynamic = "force-dynamic";

export default async function ConformitePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  // Conformité / export de preuve = fonctionnalité Pro+ (aligné sur
  // /api/v1/evidence-export et le connecteur CISO Assistant).
  if (plan === "starter") {
    return (
      <>
        <AdminPageHeader
          title="Conformité"
          description="Couverture de vos référentiels (NIS2, RGPD, ISO 27001, Sapin II…) par la formation, et preuve exportable vers votre outil GRC."
        />
        <div className="rounded-2xl border-2 border-accent-200 dark:border-accent-900/50 bg-gradient-to-br from-accent-50 to-white dark:from-accent-950/30 dark:to-slate-900 p-6">
          <p className="font-display text-xl font-extrabold text-primary-600 dark:text-accent-200 mb-2">
            🛡️ Conformité multi-référentiels
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 max-w-2xl">
            Visualisez la couverture de la formation sur 7 référentiels et
            exportez la preuve (taux de complétion, certificats, journal
            d'audit) vers CISO Assistant. Disponible à partir du plan Pro.
          </p>
          <Link href="/admin/billing" className="btn-primary text-sm">
            Passer au plan Pro →
          </Link>
        </div>
      </>
    );
  }

  const coverage = await computeAllFrameworksCoverage(tenantId);

  return (
    <>
      <AdminPageHeader
        title="Conformité"
        description="Couverture de vos référentiels par la formation, calculée en temps réel. Preuve exportable vers CISO Assistant."
      />
      <ConformiteHub
        frameworks={coverage as FrameworkCoverageView[]}
        cisoHref="/admin/integrations/ciso-assistant"
      />
    </>
  );
}
