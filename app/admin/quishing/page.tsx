// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/quishing
//
// Quishing = QR code phishing physique. Pas d'envoi technique : l'admin
// imprime des affiches avec QR codes uniques et les colle physiquement
// (cafeteria, parking, panneau RH...). Quand un employe scanne, il
// atterrit sur la landing pedagogique /phishing/[token] avec le bandeau
// adapte au QR.
//
// Auth : ADMIN, RSSI, MANAGER (lecture), SUPERADMIN

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  FEATURE_MIN_PLAN,
  getTenantPlan,
  planHasFeature,
} from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
import LaunchQuishingForm from "@/components/LaunchQuishingForm";
import QuishingPosterDownloadForm from "@/components/QuishingPosterDownloadForm";
import { QUISHING_TEMPLATES } from "@/lib/phishing/qr-code";

export const dynamic = "force-dynamic";

export default async function AdminQuishingPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user!.role;
  if (
    role !== "ADMIN" &&
    role !== "MANAGER" &&
    role !== "RSSI" &&
    role !== "SUPERADMIN"
  ) {
    redirect("/admin");
  }
  const tenantId = session.user!.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "quishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Quishing (QR code piégé) 🇫🇷"
          description="Test physique : posters imprimables avec QR codes uniques par destinataire. Aucun envoi technique."
          icon="🔳"
        />
        <PlanGate
          feature="quishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.quishing}
        />
      </>
    );
  }

  const canAct =
    role === "ADMIN" || role === "RSSI" || role === "SUPERADMIN";

  const [groups, campaigns] = await Promise.all([
    db.group.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        emoji: true,
        _count: {
          select: {
            members: {
              where: {
                user: {
                  isActive: true,
                  role: { in: ["LEARNER", "MANAGER"] },
                },
              },
            },
          },
        },
      },
    }),
    db.phishingCampaign.findMany({
      where: { tenantId, channel: "QUISHING" },
      include: { results: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const groupOptions = groups
    .filter((g) => g._count.members > 0)
    .map((g) => ({
      slug: g.slug,
      name: g.name,
      emoji: g.emoji,
      memberCount: g._count.members,
    }));

  return (
    <>
      <AdminPageHeader
        title="Quishing (QR code piégé) 🇫🇷"
        description="Test physique : posters imprimables avec QR codes uniques. Pas d'envoi technique - tu imprimes et tu colles."
        icon="🔳"
      />

      <div className="space-y-6 min-w-0">
        {/* Bandeau pédagogique */}
        <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
          <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
            <span aria-hidden="true">⚖️</span>
            Cadre éthique
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 leading-relaxed">
            Comme pour le phishing email, ces tests doivent être{" "}
            <strong>annoncés au préalable</strong> aux collaborateurs (charte,
            CSE). Le quishing physique est particulièrement sensible : il
            implique de coller des affiches qui pourraient passer pour de la
            communication officielle (RH, parking, cantine). Soyez vigilant
            sur le retrait des posters après l&apos;exercice.
          </p>
        </article>

        {/* Comment ca marche */}
        <article className="rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/60 dark:bg-cyan-900/15 p-4">
          <h3 className="font-bold text-cyan-900 dark:text-cyan-100 text-sm flex items-center gap-2 mb-2">
            <span aria-hidden="true">ℹ️</span>
            Comment ça marche
          </h3>
          <ol className="text-xs text-cyan-900/85 dark:text-cyan-100/85 space-y-1 list-decimal pl-5 leading-relaxed">
            <li>
              Choisis un template (faux WiFi, faux menu, faux affichage
              RH...)
            </li>
            <li>Sélectionne tes destinataires (par groupe métier ou tous)</li>
            <li>
              Lance la campagne → tu reçois un PDF avec une affiche par
              destinataire (chaque QR est unique et trackable)
            </li>
            <li>
              Tu imprimes et tu colles physiquement (parking, cafétéria,
              panneau RH... selon le template)
            </li>
            <li>
              Quand un employé scanne, il atterrit sur la landing
              pédagogique avec le bandeau adapté au QR
            </li>
            <li>
              Stats temps réel disponibles sur cette page (qui a scanné quel
              QR)
            </li>
          </ol>
        </article>

        {/* Form de création */}
        <AdminSection
          title="Lancer une campagne quishing"
          description="Choisis un template + des destinataires. Le PDF est généré automatiquement et téléchargeable juste après."
        >
          {canAct ? (
            <LaunchQuishingForm groups={groupOptions} />
          ) : (
            <p className="text-sm text-gray-500 italic">
              Seul un ADMIN ou RSSI peut lancer une campagne quishing.
            </p>
          )}
        </AdminSection>

        {/* Campagnes récentes */}
        <AdminSection
          title="Campagnes quishing récentes"
          description={`${campaigns.length} dernière${campaigns.length > 1 ? "s" : ""} campagne${campaigns.length > 1 ? "s" : ""} quishing`}
        >
          {campaigns.length === 0 ? (
            <EmptyState
              icon="🔳"
              title="Aucune campagne quishing pour l'instant"
              description="Lance ta première simulation QR. Idéal pour le Cybermois ou avant une formation présentielle."
            />
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const sent = c.results.length;
                const clicked = c.results.filter(
                  (r) => r.status === "CLICKED",
                ).length;
                const tpl =
                  QUISHING_TEMPLATES[
                    c.template as keyof typeof QUISHING_TEMPLATES
                  ];
                return (
                  <article
                    key={c.id}
                    className="rounded-lg border border-gray-200 dark:border-slate-800 p-4"
                  >
                    <header className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0" aria-hidden="true">
                          {tpl?.emoji ?? "🔳"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                              {c.title}
                            </h4>
                            {c.isActive ? (
                              <StatusBadge level="success" pill>
                                En cours
                              </StatusBadge>
                            ) : (
                              <StatusBadge level="neutral" pill>
                                Terminée
                              </StatusBadge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Lancée le{" "}
                            {c.sentAt?.toLocaleDateString("fr-FR")} ·{" "}
                            {sent} affiche{sent > 1 ? "s" : ""} · {clicked}{" "}
                            scannée{clicked > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <QuishingPosterDownloadForm campaignId={c.id} />
                    </header>
                  </article>
                );
              })}
            </div>
          )}
        </AdminSection>
      </div>
    </>
  );
}
