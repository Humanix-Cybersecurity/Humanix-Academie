// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/phishing - Gestion des campagnes de phishing simulé (plan Pro+).
//
// REFONTE MAI 2026 : aligné design system Linear (PageHeader, Section,
// EmptyState, StatusBadge).
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import LaunchCampaignForm from "@/components/LaunchCampaignForm";
import CampaignActions from "@/components/CampaignActions";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminPhishingPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth déjà appliquée).
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
    // SMTP du tenant : si non configure, on bloque le lancement de campagne
    // et on affiche un CTA vers /admin/smtp.
    db.tenantSmtpConfig.findUnique({
      where: { tenantId },
      select: { id: true, isVerified: true, host: true, fromEmail: true },
    }),
    // Groupes metier du tenant (mai 2026) : pour le ciblage structuré
    // au lancement de campagne. On compte les membres actifs en parallèle
    // pour afficher "RH (12)".
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
  const smtpConfigured = !!smtpCfg;
  const smtpVerified = smtpCfg?.isVerified === true;

  const distinctServices = services
    .map((s) => s.service)
    .filter(Boolean) as string[];

  // On masque les groupes vides (0 membre cible) du selecteur :
  // l'admin ne peut rien en faire et ça encombre l'UI.
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
        {/* Cadre légal - variante warning */}
        <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
          <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
            <span aria-hidden="true">⚖️</span>
            Cadre éthique et légal
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 leading-relaxed">
            Les simulations doivent être{" "}
            <strong>annoncées préalablement</strong> aux salariés (charte, CSE).
            Aucun usage disciplinaire des résultats. Pas de stigmatisation :
            seuls les chiffres agrégés sont exploités. Conformément au RGPD
            (art. 32) et au Code pénal (art. 323), ces tests sont des
            <strong> exercices pédagogiques</strong>, pas des attaques.
          </p>
        </article>

        {/* Bandeau SMTP : statut + CTA selon configuration */}
        {!smtpConfigured && (
          <article className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-2">
              <span aria-hidden="true">📭</span>
              SMTP non configuré — l&apos;envoi des phishing est bloqué
            </h3>
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 leading-relaxed">
              Humanix-Cybersecurity ne partage pas son serveur SMTP pour
              les phishing simulés. Tu dois configurer{" "}
              <strong>ton propre SMTP</strong> pour envoyer depuis ton
              domaine (réputation IP, SPF, DKIM, DMARC à ta charge).
            </p>
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 leading-relaxed">
              <strong>3 options</strong> : (1) self-host (Postfix, M365 dédié),
              (2) provider transactionnel (Brevo, Mailjet, Scaleway TEM client),
              ou (3){" "}
              <Link
                href="/demande-abonnement?type=opsec"
                className="underline font-bold"
              >
                prestation Humanix au forfait
              </Link>{" "}
              (mise en place + suivi réputation).
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/smtp"
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                <span aria-hidden="true">⚙️</span>
                Configurer mon SMTP →
              </Link>
              <Link
                href="/opsec-phishing"
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
              >
                <span aria-hidden="true">📚</span>
                Lire le cadrage OPSEC (5 min)
              </Link>
            </p>
          </article>
        )}
        {smtpConfigured && !smtpVerified && (
          <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              SMTP configuré mais jamais vérifié (ou dernier test échoué)
            </h3>
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 leading-relaxed">
              <strong>{smtpCfg?.host}</strong> — l&apos;envoi peut échouer.
              Va sur{" "}
              <Link href="/admin/smtp" className="underline font-bold">
                /admin/smtp
              </Link>{" "}
              et clique « Tester la connexion » pour valider avant de
              lancer une campagne.
            </p>
          </article>
        )}
        {smtpConfigured && smtpVerified && (
          <article className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/15 p-4">
            <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed flex items-center gap-2">
              <span aria-hidden="true">✅</span>
              <span>
                <strong>SMTP prêt</strong> — envois depuis{" "}
                <code className="font-mono bg-white/60 dark:bg-slate-900/40 px-1.5 py-0.5 rounded">
                  {smtpCfg?.fromEmail}
                </code>{" "}
                via <code className="font-mono">{smtpCfg?.host}</code>.{" "}
                <Link href="/admin/smtp" className="underline">
                  Modifier
                </Link>
              </span>
            </p>
          </article>
        )}

        {/* Cross-sell IA Mistral - 2 cartes en grille au lieu de 2 bandeaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        </div>

        {/* Lancer une campagne */}
        <AdminSection
          title="Lancer une campagne"
          description="Choisissez un template prêt-à-l'emploi et une audience cible."
        >
          <LaunchCampaignForm
            services={distinctServices}
            groups={groupOptions}
          />
        </AdminSection>

        {/* Campagnes récentes */}
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
              {campaigns.map((c) => {
                const sent = c.results.length;
                const clicked = c.results.filter(
                  (r) => r.status === "CLICKED",
                ).length;
                const reported = c.results.filter(
                  (r) => r.status === "REPORTED",
                ).length;
                const ignored = sent - clicked - reported;
                const tpl = PHISHING_TEMPLATES.find((t) => t.id === c.template);
                return (
                  <article
                    key={c.id}
                    className="rounded-lg border border-gray-200 dark:border-slate-800 p-4 hover:shadow-sm transition"
                  >
                    <header className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0" aria-hidden="true">
                          {tpl?.emoji ?? "🎣"}
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
                            Lancée le {c.sentAt?.toLocaleDateString("fr-FR")} ·{" "}
                            {sent} cible{sent > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <CampaignActions
                        campaignId={c.id}
                        isActive={c.isActive}
                      />
                    </header>

                    <div className="grid grid-cols-3 gap-2">
                      <ResultStat
                        label="Cliqué"
                        value={clicked}
                        total={sent}
                        variant="danger"
                      />
                      <ResultStat
                        label="Signalé"
                        value={reported}
                        total={sent}
                        variant="success"
                      />
                      <ResultStat
                        label="Ignoré"
                        value={ignored}
                        total={sent}
                        variant="neutral"
                      />
                    </div>
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

// =============================================================================
// Sous-composants locaux
// =============================================================================

function CrossSellCard({
  badge,
  title,
  description,
  cta,
  href,
  icon,
}: {
  badge: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-primary-500/20 dark:border-accent-500/30 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/15 p-4 transition hover:border-accent-500 hover:shadow-md"
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="shrink-0 w-10 h-10 rounded-lg bg-white/70 dark:bg-slate-900/50 flex items-center justify-center text-xl"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-600 dark:text-accent-300">
            {badge}
          </p>
          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-tight">
            {title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
            {description}
          </p>
          <p className="text-xs font-bold text-accent-600 dark:text-accent-300 mt-2 group-hover:translate-x-0.5 transition inline-flex items-center gap-1">
            {cta} <span aria-hidden="true">→</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function ResultStat({
  label,
  value,
  total,
  variant,
}: {
  label: string;
  value: number;
  total: number;
  variant: "danger" | "success" | "neutral";
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const styles =
    variant === "danger"
      ? "bg-rose-50 dark:bg-rose-900/15 text-rose-700 dark:text-rose-300"
      : variant === "success"
        ? "bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300"
        : "bg-gray-50 dark:bg-slate-800/40 text-gray-700 dark:text-gray-300";
  return (
    <div className={`rounded-lg p-3 ${styles}`}>
      <p className="text-xl font-extrabold tabular-nums">
        {value} <span className="text-xs font-medium opacity-80">({pct}%)</span>
      </p>
      <p className="text-[10px] uppercase tracking-widest font-bold mt-0.5">
        {label}
      </p>
    </div>
  );
}
