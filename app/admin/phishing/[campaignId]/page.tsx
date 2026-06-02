// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/phishing/[campaignId] — Detail d'une campagne avec funnel + timeline.
//
// CONTEXT (Phishing Engine v2, mai 2026) :
//   Avec le tracking funnel complet (sent / opened / clicked / submitted /
//   reported), la liste plate de CampaignCard ne suffit plus -- les admins
//   veulent voir QUI a fait QUOI, et QUAND. Cette page sert :
//     1. Le funnel chart visuel (barres horizontales decroissantes)
//     2. La table per-user avec les 5 timestamps + status final
//     3. Les taux conversion entre etapes (open->click, click->submit)
//     4. Un bouton CSV export reutilise /api/admin/phishing/export
//
// SECURITE :
//   - Layout /admin verifie deja role ADMIN/RSSI/MANAGER + tenant scope
//   - On verifie en plus que le campaignId appartient bien au tenant courant
//     (defense en profondeur contre une fuite cross-tenant via URL guess)

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const campaign = await db.phishingCampaign.findFirst({
    where: { id: campaignId, tenantId },
    include: {
      results: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              service: true,
            },
          },
        },
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (!campaign) notFound();

  const tpl = PHISHING_TEMPLATES.find((t) => t.id === campaign.template);
  const sent = campaign.results.length;
  const opened = campaign.results.filter((r) => r.openedAt !== null).length;
  const clicked = campaign.results.filter((r) => r.clickedAt !== null).length;
  const submitted = campaign.results.filter(
    (r) => r.submittedAt !== null,
  ).length;
  const reported = campaign.results.filter((r) => r.reportedAt !== null).length;

  // Taux de conversion entre etapes (utiles pour identifier ou ca craque).
  const openRate = sent === 0 ? 0 : Math.round((opened / sent) * 100);
  const clickFromOpenRate =
    opened === 0 ? 0 : Math.round((clicked / opened) * 100);
  const submitFromClickRate =
    clicked === 0 ? 0 : Math.round((submitted / clicked) * 100);
  const reportRate = sent === 0 ? 0 : Math.round((reported / sent) * 100);

  // Phase 7a (juin 2026) : decomposition A/B si la campagne avait un
  // variantBSlug. On compute les memes metrics par variant pour comparison.
  const isAbTest = !!campaign.variantBSlug;
  const variantStats = isAbTest
    ? computeVariantStats(campaign.results)
    : null;

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
        title={campaign.title}
        icon={tpl?.emoji ?? "🎣"}
        description={`Template ${campaign.template} · Canal ${campaign.channel} · Lancée ${campaign.sentAt?.toLocaleString("fr-FR") ?? "—"}`}
      />

      {/* FUNNEL VISUEL — barres horizontales decroissantes */}
      <AdminSection title="Funnel de campagne">
        <div className="space-y-3">
          <FunnelBar
            label="Envoyés"
            value={sent}
            total={sent}
            color="bg-gray-400"
            description="Mails déposés par le SMTP tenant"
          />
          <FunnelBar
            label="Ouverts"
            value={opened}
            total={sent}
            color="bg-cyan-500"
            description={`Pixel tracking déclenché (${openRate}% du total — attention : inclut les pre-fetch Gmail/Outlook)`}
          />
          <FunnelBar
            label="Cliqués"
            value={clicked}
            total={sent}
            color="bg-amber-500"
            description={`Lien cliqué, landing visitée (${clickFromOpenRate}% des ouverts)`}
          />
          <FunnelBar
            label="Soumis"
            value={submitted}
            total={sent}
            color="bg-rose-500"
            description={`Formulaire fake rempli (${submitFromClickRate}% des cliqués) — le pire cas`}
          />
          <FunnelBar
            label="Signalés"
            value={reported}
            total={sent}
            color="bg-emerald-500"
            description={`Reporté via Outlook add-in (${reportRate}% du total — c'est ce qu'on vise)`}
          />
        </div>
      </AdminSection>

      {/* TAUX CLES */}
      <AdminSection title="Taux clés">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <RateKpi label="Taux d'ouverture" value={openRate} hint="opened / sent" />
          <RateKpi
            label="Taux de clic"
            value={clickFromOpenRate}
            hint="clicked / opened"
            variant={clickFromOpenRate > 30 ? "warn" : "neutral"}
          />
          <RateKpi
            label="Taux de soumission"
            value={submitFromClickRate}
            hint="submitted / clicked"
            variant={submitFromClickRate > 0 ? "danger" : "good"}
          />
          <RateKpi
            label="Taux de signalement"
            value={reportRate}
            hint="reported / sent"
            variant={reportRate >= 30 ? "good" : "neutral"}
          />
        </div>
      </AdminSection>

      {/* PHASE 7a : COMPARAISON A/B (visible seulement si la campagne en
          avait un) */}
      {variantStats && campaign.variantBSlug && (
        <AdminSection title="🧪 Comparaison A/B">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Cette campagne a envoye 2 templates en parallele. Le badge{" "}
            <span className="text-rose-600 font-bold">Plus piegeant</span>{" "}
            identifie le template qui a fait plus cliquer / soumettre (le
            template qui converti le mieux est le PIRE cas pour l&apos;
            apprenant). Le badge{" "}
            <span className="text-emerald-600 font-bold">Mieux</span> identifie
            le template qui a fait plus signaler (vrai reflexe cyber).
          </p>
          <VariantComparisonSection
            stats={variantStats}
            templateASlug={campaign.template}
            variantBSlug={campaign.variantBSlug}
          />
        </AdminSection>
      )}

      {/* TABLE PER-USER avec timestamps */}
      <AdminSection title={`Résultats par destinataire (${sent})`}>
        {sent === 0 ? (
          <p className="text-sm text-gray-500">Aucun destinataire.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Destinataire</th>
                  <th className="px-3 py-2 font-semibold">Service</th>
                  {isAbTest && (
                    <th className="px-3 py-2 font-semibold">Variant</th>
                  )}
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">
                    Envoyé
                  </th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">
                    Ouvert
                  </th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">
                    Cliqué
                  </th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">
                    Soumis
                  </th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">
                    Signalé
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaign.results.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {r.user.name ?? r.user.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.user.email}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {r.user.service ?? "—"}
                    </td>
                    {isAbTest && (
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.variant === "A"
                              ? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300"
                              : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                          }`}
                        >
                          {r.variant}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatShortDate(r.sentAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatShortDate(r.openedAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatShortDate(r.clickedAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatShortDate(r.submittedAt)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatShortDate(r.reportedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <a
            href={`/api/admin/phishing/export?campaignId=${campaign.id}`}
            className="text-sm text-accent-500 underline hover:no-underline"
          >
            📥 Télécharger en CSV
          </a>
        </div>
      </AdminSection>
    </>
  );
}

function FunnelBar({
  label,
  value,
  total,
  color,
  description,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  description?: string;
}) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  const widthPct = Math.max(2, pct); // min 2% pour voir la barre meme a 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
          {label}
        </span>
        <span className="tabular-nums text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-gray-100">{value}</strong>
          {" / "}
          {total} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded-md overflow-hidden">
        <div
          className={`${color} h-full rounded-md transition-all`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      )}
    </div>
  );
}

function RateKpi({
  label,
  value,
  hint,
  variant = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  variant?: "good" | "warn" | "danger" | "neutral";
}) {
  const styles =
    variant === "good"
      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
      : variant === "warn"
        ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
        : variant === "danger"
          ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900";
  return (
    <div className={`rounded-xl border-2 p-3 ${styles}`}>
      <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
        {value}%
      </p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
        {hint}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    SENT: "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300",
    OPENED: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    CLICKED:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    SUBMITTED:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    REPORTED:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  };
  const cls = styles[status ?? "SENT"] ?? styles.SENT;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}
    >
      {status ?? "SENT"}
    </span>
  );
}

function formatShortDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// =============================================================================
// PHASE 7a (juin 2026) -- A/B variants stats
// =============================================================================

type VariantStat = {
  variant: "A" | "B";
  sent: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  openRate: number; // %
  clickRate: number; // % of sent
  submitRate: number; // % of sent
  reportRate: number; // % of sent
};

type ResultsForStats = Array<{
  variant: string;
  openedAt: Date | null;
  clickedAt: Date | null;
  submittedAt: Date | null;
  reportedAt: Date | null;
}>;

function computeVariantStats(results: ResultsForStats): {
  A: VariantStat;
  B: VariantStat;
} {
  function buildFor(variant: "A" | "B"): VariantStat {
    const subset = results.filter((r) => r.variant === variant);
    const sent = subset.length;
    const opened = subset.filter((r) => r.openedAt !== null).length;
    const clicked = subset.filter((r) => r.clickedAt !== null).length;
    const submitted = subset.filter((r) => r.submittedAt !== null).length;
    const reported = subset.filter((r) => r.reportedAt !== null).length;
    return {
      variant,
      sent,
      opened,
      clicked,
      submitted,
      reported,
      openRate: sent === 0 ? 0 : Math.round((opened / sent) * 100),
      clickRate: sent === 0 ? 0 : Math.round((clicked / sent) * 100),
      submitRate: sent === 0 ? 0 : Math.round((submitted / sent) * 100),
      reportRate: sent === 0 ? 0 : Math.round((reported / sent) * 100),
    };
  }
  return { A: buildFor("A"), B: buildFor("B") };
}

export function VariantComparisonSection({
  stats,
  variantBSlug,
  templateASlug,
}: {
  stats: { A: VariantStat; B: VariantStat };
  variantBSlug: string;
  templateASlug: string;
}) {
  // Determine le "gagnant" sur chaque metric (le pire = celui qui a fait
  // cliquer / soumettre le plus).
  function badge(value: number, comparison: number, kind: "lower-is-better" | "higher-is-better") {
    if (value === comparison) return null;
    const isWorse =
      kind === "lower-is-better" ? value > comparison : value < comparison;
    return (
      <span
        className={`ml-2 text-[10px] font-bold uppercase ${
          isWorse
            ? "text-rose-600 dark:text-rose-400"
            : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {isWorse ? "Plus piegeant" : "Mieux"}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <VariantCard
        title={`Variant A — ${templateASlug}`}
        stat={stats.A}
        compareTo={stats.B}
        badge={badge}
      />
      <VariantCard
        title={`Variant B — ${variantBSlug}`}
        stat={stats.B}
        compareTo={stats.A}
        badge={badge}
      />
    </div>
  );
}

function VariantCard({
  title,
  stat,
  compareTo,
  badge,
}: {
  title: string;
  stat: VariantStat;
  compareTo: VariantStat;
  badge: (
    v: number,
    c: number,
    kind: "lower-is-better" | "higher-is-better",
  ) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-fuchsia-200 dark:border-fuchsia-800 bg-white dark:bg-slate-900 p-4">
      <h3 className="font-bold text-fuchsia-700 dark:text-fuchsia-300 mb-3 truncate">
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-gray-500 dark:text-gray-400">Envoyes</dt>
        <dd className="tabular-nums text-right">{stat.sent}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Ouverts</dt>
        <dd className="tabular-nums text-right">
          {stat.opened} ({stat.openRate}%)
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">Cliques</dt>
        <dd className="tabular-nums text-right">
          {stat.clicked} ({stat.clickRate}%)
          {badge(stat.clickRate, compareTo.clickRate, "lower-is-better")}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">Soumis</dt>
        <dd className="tabular-nums text-right">
          {stat.submitted} ({stat.submitRate}%)
          {badge(stat.submitRate, compareTo.submitRate, "lower-is-better")}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">Signales</dt>
        <dd className="tabular-nums text-right text-emerald-700 dark:text-emerald-300">
          {stat.reported} ({stat.reportRate}%)
          {badge(stat.reportRate, compareTo.reportRate, "higher-is-better")}
        </dd>
      </dl>
    </div>
  );
}
