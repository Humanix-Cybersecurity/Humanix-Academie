// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/conformité-nis2 - Pack Conformité NIS2 (feature plan Pro+).
//
// REFONTE MAI 2026 : aligné design system Linear (PageHeader, Section).
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan } from "@/lib/plans";
import PackNis2Form from "@/components/PackNis2Form";
import PlanGateNis2 from "@/components/PlanGateNis2";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function AdminConformiteNis2Page() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth déjà appliquée).
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  const isAllowed = ["pro", "enterprise"].includes(plan);

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });

  if (!isAllowed) {
    return (
      <>
        <AdminPageHeader
          title="Pack Conformité NIS2"
          description="4 documents prêts à signer pour répondre aux exigences NIS2."
        />
        <PlanGateNis2 plan={plan} />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Pack Conformité NIS2"
        description="4 documents prêts à signer, pré-remplis avec vos informations, couvrant les exigences NIS2 article 21 (mesures techniques et organisationnelles) et article 23 (notification d'incident)."
      />

      <div className="space-y-6 min-w-0">
        {/* Composition du pack */}
        <AdminSection title="Ce que contient ce pack" variant="highlight">
          <ol className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300 list-none">
            {[
              {
                name: "Politique de sensibilisation à la cybersécurité",
                desc: "engagement direction signable",
              },
              {
                name: "Procédure de déclaration d'incident",
                desc: "checklist opérationnelle (24h / 72h / 1 mois)",
              },
              {
                name: "Registre des actions de sensibilisation",
                desc: "extrait consolidé des stats Humanix",
              },
              {
                name: "Engagement cyber du collaborateur",
                desc: "charte courte à joindre au contrat de travail",
              },
            ].map((doc, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-md bg-accent-500/10 text-accent-600 dark:text-accent-300 font-bold flex items-center justify-center text-sm tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {doc.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {doc.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AdminSection>

        {/* Formulaire principal */}
        <AdminSection
          title="Générer votre pack"
          description="Renseignez les informations ci-dessous : nous générons un PDF horodaté avec les 4 documents pré-remplis."
        >
          <PackNis2Form tenantName={tenant?.name ?? "Votre entreprise"} />
        </AdminSection>

        {/* Note légale */}
        <article className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/40 p-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-2">
            <span aria-hidden="true">ℹ️</span>À savoir
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 leading-relaxed">
            <p>
              Ces documents sont rédigés pour couvrir les exigences usuelles
              d'une PME française concernée par NIS2. Ils ne se substituent pas
              à un audit réglementaire formel par un cabinet certifié, mais
              constituent un socle organisationnel solide accepté par la
              majorité des assureurs cyber et auditeurs clients.
            </p>
            <p>
              Conservez le PDF émis (horodaté) : il fait office de{" "}
              <em>preuve de démarche cyber</em> en cas d'audit ou d'incident.
            </p>
          </div>
        </article>
      </div>
    </>
  );
}
