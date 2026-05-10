// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/license - affichage de la licence Ed25519 active.
//
// Refonte juin 2026 (Sprint 2 bis) : decoupage des panels visuels dans
// components/admin/license/. La page reste minimale : auth + lecture
// licence + composition des widgets.
//
// Ce qui est expose :
//   - Statut (valide / invalide / expiree / pas configuree)
//   - Detail de la licence active (organisation, plan, sieges, dates...)
//   - Avertissement de fin de validite (warning < 14 jours)
//   - Section pedagogique "comment ca marche"
//   - Procedure de mise a jour
//
// Lecture licence : HUMANIX_LICENSE_KEY (env, pas DB).
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getActiveLicense } from "@/lib/license";
import ActiveLicensePanel from "@/components/admin/license/ActiveLicensePanel";
import InactiveLicensePanel from "@/components/admin/license/InactiveLicensePanel";
import LicenseExplainer from "@/components/admin/license/LicenseExplainer";
import UpdateProcedure from "@/components/admin/license/UpdateProcedure";

export const dynamic = "force-dynamic";

export default async function AdminLicensePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    redirect("/admin");
  }

  const result = getActiveLicense();

  return (
    <>
      <AdminPageHeader
        title="Licence Ed25519"
        description="Statut de la licence signée qui active les features Pro+ en self-host commercial. Voir docs/LICENSE_KEY.md pour la procédure d'obtention et de renouvellement."
        icon="🔐"
      />

      <div className="space-y-8 min-w-0">
        {result.valid ? (
          <ActiveLicensePanel
            license={result.license}
            warning={result.warning}
          />
        ) : (
          <InactiveLicensePanel error={result.error} />
        )}

        <LicenseExplainer />
        <UpdateProcedure />

        <section className="text-center pt-2">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La transparence n'est pas une vulnérabilité. C'est ce qui
            distingue la maîtrise du marketing. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </>
  );
}
