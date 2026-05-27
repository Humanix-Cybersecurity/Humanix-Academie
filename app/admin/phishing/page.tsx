// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/phishing - Gestion des campagnes de phishing simulé (plan Pro+).
//
// Refonte juin 2026 (Sprint 2 bis) : decoupage des bandeaux, cartes et
// compteurs en widgets sous components/admin/phishing/. La page reste server
// component, charge les donnees Prisma puis assemble.
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import LaunchCampaignForm from "@/components/LaunchCampaignForm";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import EmptyState from "@/components/admin/EmptyState";
import LegalNotice from "@/components/admin/phishing/LegalNotice";
import SmtpStatusBanner from "@/components/admin/phishing/SmtpStatusBanner";
import CrossSellCard from "@/components/admin/phishing/CrossSellCard";
import CampaignCard from "@/components/admin/phishing/CampaignCard";

export const dynamic = "force-dynamic";

export default async function AdminPhishingPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth)
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);

  // Gate : Phishing simulé = Pro+
  if (!planHasFeature(plan, "phishing")) {
    return (
      <>
        <AdminPageHeader
          title="Phishing simulé"
          description="Mesurez la vigilance de vos équipes face aux tentatives d'hameçonnage réalistes."
        />
        <PlanGate
          feature="phishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.phishing}
        />
      </>
    );
  }

  const [services, campaigns, smtpCfg, groupsRaw] = await Promise.all([
    db.user.findMany({
      where: { tenantId, isActive: true },
      select: { service: true },
      distinct: ["service"],
    }),
    db.phishingCampaign.findMany({
      where: { tenantId },
      include: { results: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.tenantSmtpConfig.findUnique({
      where: { tenantId },
      select: { id: true, isVerified: true, host: true, fromEmail: true },
    }),
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
  ]);

  const distinctServices = services
    .map((s) => s.service)
    .filter(Boolean) as string[];

  // On masque les groupes vides (0 membre cible) : l'admin ne peut rien en
  // faire et ca encombre l'UI.
  const groupOptions = groupsRaw
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
        title="Phishing simulé"
        description="Mesurez la vigilance de vos équipes face aux tentatives d'hameçonnage réalistes. Tests pédagogiques, jamais disciplinaires."
      />

      <div className="space-y-6 min-w-0">
        <LegalNotice />

        <SmtpStatusBanner
          configured={!!smtpCfg}
          verified={smtpCfg?.isVerified === true}
          host={smtpCfg?.host}
          fromEmail={smtpCfg?.fromEmail}
        />

        {/* Cross-sell IA Mistral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CrossSellCard
            badge="🇫🇷 IA souveraine"
            title="Générer un mail sur-mesure en 5 secondes"
            description="Décrivez votre cible - Mistral génère un mail crédible avec les signaux faibles à débriefer."
            cta="Ouvrir le générateur"
            href="/admin/phishing/generer"
            icon="🤖"
          />
          <CrossSellCard
            badge="Ultra-personnalisé"
            title="1 phishing UNIQUE par employé en batch"
            description="Sélectionnez vos cibles → l'IA génère un mail différent pour chacune (service, contexte, ton)."
            cta="Lancer le batch"
            href="/admin/phishing/personalize"
            icon="🎯"
          />
          <CrossSellCard
            badge="🎯 Red team IA"
            title="Scénario phishing complet pour ton secteur"
            description="Décris ton contexte (secteur, attaque vue récemment, cibles). Mistral génère subject + sender + corps HTML + signaux pédagogiques."
            cta="Mode red team"
            href="/admin/phishing/redteam"
            icon="🎯"
          />
        </div>

        {/* Lien vers le scoring IA par user (cf. Phase 5c) */}
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-900 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-violet-700 dark:text-violet-300 mb-1">
              🎯 Vulnerabilites IA par apprenant
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Profil narratif Mistral pour identifier qui pousser, qui valoriser, qui faire un debrief 1:1.
            </p>
          </div>
          <a
            href="/admin/phishing/vulnerable-users"
            className="btn-secondary text-sm whitespace-nowrap"
          >
            Voir les vulnerabilites →
          </a>
        </div>

        <AdminSection
          title="Lancer une campagne"
          description="Choisissez un template prêt-à-l'emploi et une audience cible."
        >
          <LaunchCampaignForm
            services={distinctServices}
            groups={groupOptions}
          />
        </AdminSection>

        <AdminSection
          title="Campagnes récentes"
          description={`${campaigns.length} dernière${campaigns.length > 1 ? "s" : ""} campagne${campaigns.length > 1 ? "s" : ""}`}
        >
          {campaigns.length === 0 ? (
            <EmptyState
              icon="🎣"
              title="Aucune campagne pour l'instant"
              description="Lancez votre première simulation pour mesurer la vigilance de vos équipes."
            />
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </>
  );
}
