// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/marque-blanche - Configuration de la marque blanche (white-label).
// Gate : ADMIN/RSSI/SUPERADMIN + plan Enterprise (feature white_label).
//
// La résolution + l'application effective du branding se font dans le layout
// racine (cf. lib/branding/). Ici on ne fait que CONFIGURER.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { planHasFeature, normalizePlan } from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import MarqueBlancheForm from "./MarqueBlancheForm";

export const dynamic = "force-dynamic";

export default async function MarqueBlanchePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      brandingEnabled: true,
      brandName: true,
      brandEmailFromName: true,
      brandPrimaryColor: true,
      brandAccentColor: true,
      brandHidePoweredBy: true,
      brandSubdomain: true,
      brandLogoMime: true,
      brandFaviconMime: true,
    },
  });
  if (!tenant) redirect("/admin");

  const gated = !planHasFeature(tenant.plan, "white_label", role);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marque blanche"
        description="Déployez la plateforme sous votre propre identité : logo, couleurs, nom, sous-domaine et emails à votre marque."
        icon="🎨"
      />

      {gated ? (
        <PlanGate
          feature="white_label"
          currentPlan={normalizePlan(tenant.plan)}
          requiredPlan="enterprise"
        />
      ) : (
        <MarqueBlancheForm
          initial={{
            brandingEnabled: tenant.brandingEnabled,
            brandName: tenant.brandName ?? "",
            emailFromName: tenant.brandEmailFromName ?? "",
            primaryColor: tenant.brandPrimaryColor ?? "",
            accentColor: tenant.brandAccentColor ?? "",
            hidePoweredBy: tenant.brandHidePoweredBy,
            brandSubdomain: tenant.brandSubdomain ?? "",
            logoUrl: tenant.brandLogoMime
              ? `/api/branding/${tenantId}/logo`
              : null,
            faviconUrl: tenant.brandFaviconMime
              ? `/api/branding/${tenantId}/favicon`
              : null,
          }}
        />
      )}
    </div>
  );
}
