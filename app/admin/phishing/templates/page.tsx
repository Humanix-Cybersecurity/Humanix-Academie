// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/phishing/templates - Gestion des templates email phishing.
//
// CONTEXT (Phase 0 Phishing Engine v2, juin 2026) :
//   Listing des templates disponibles pour le tenant :
//     - Custom (cree par l'admin via cette page OU via "Save as template"
//       depuis /admin/phishing/redteam)
//     - Platform-wide (seeded depuis lib/phishing.ts : FAKE_MICROSOFT,
//       FAKE_COLISSIMO, FAKE_PRESIDENT)
//
//   Custom override platform si meme slug. Custom sont editables/deletables.
//   Platform sont read-only mais visibles pour reference.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import CreateTemplateForm from "./CreateTemplateForm";
import { deleteCustomTemplate } from "./actions";

export const dynamic = "force-dynamic";

export default async function PhishingTemplatesPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "phishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Templates phishing"
          icon="✉️"
          description="Crée tes propres lures ou utilise les templates platform-wide."
        />
        <PlanGate
          feature="phishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.phishing}
        />
      </>
    );
  }

  // Charge custom + platform-wide
  const [customTemplates, platformTemplates] = await Promise.all([
    db.phishingEmailTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.phishingEmailTemplate.findMany({
      where: { tenantId: null, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/admin/phishing"
          className="text-sm text-gray-500 hover:text-accent-500"
        >
          ← Toutes les campagnes
        </Link>
      </div>
      <AdminPageHeader
        title="Templates email phishing"
        icon="✉️"
        description="Tes templates custom + ceux fournis par la plateforme. Les custom override les platform-wide si même slug."
      />

      <AdminSection title="Créer un nouveau template">
        <CreateTemplateForm />
      </AdminSection>

      <AdminSection
        title={`${customTemplates.length} template${customTemplates.length > 1 ? "s" : ""} custom`}
      >
        {customTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun template custom pour l'instant. Crée-en un ci-dessus ou
            depuis le{" "}
            <Link
              href="/admin/phishing/redteam"
              className="underline hover:text-accent-500"
            >
              générateur red team IA
            </Link>{" "}
            (bouton "Save as template" sera ajouté prochainement).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Template</th>
                  <th className="px-3 py-2 font-semibold">Slug</th>
                  <th className="px-3 py-2 font-semibold">Difficulté</th>
                  <th className="px-3 py-2 font-semibold">Créé le</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customTemplates.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-gray-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{t.emoji}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {t.name}
                        </span>
                      </div>
                      {t.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {t.slug}
                    </td>
                    <td className="px-3 py-2">
                      <DifficultyPill d={t.difficulty} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {t.createdAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">
                      <form action={deleteCustomTemplate}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={t.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title={`${platformTemplates.length} template${platformTemplates.length > 1 ? "s" : ""} platform-wide (lecture seule)`}
        description="Fournis par Humanix. Disponibles pour tous les tenants. Tu peux les override en créant un custom avec le même slug."
        variant="muted"
      >
        {platformTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun template platform-wide en BDD. Relance le seed (
            <code>npx prisma db seed</code> ou /superadmin/catalog) pour les
            seeder.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {platformTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl" aria-hidden="true">
                    {t.emoji}
                  </span>
                  <span className="font-bold text-sm">{t.name}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {t.description ?? t.emailSubject}
                </p>
                <div className="flex items-center gap-2">
                  <DifficultyPill d={t.difficulty} />
                  <code className="text-[10px] text-gray-400 font-mono">
                    {t.slug}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSection>
    </>
  );
}

function DifficultyPill({ d }: { d: string }) {
  const cls =
    d === "easy"
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : d === "hard"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  const label = d === "easy" ? "Facile" : d === "hard" ? "Difficile" : "Moyen";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
}
