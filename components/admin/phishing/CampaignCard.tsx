// SPDX-License-Identifier: AGPL-3.0-or-later
// Carte d'une campagne phishing : titre + statut + funnel 5 metrics complete.
//
// Refonte Phishing Engine v2 (mai 2026) : ajout OPENED + SUBMITTED dans le
// funnel. Avant on n'avait que sent / clicked / reported / ignored. Maintenant
// le funnel est : sent -> opened -> clicked -> submitted (+ reported orthogonal).
// Cf. lib/phishing.ts pour le sens des status.

import Link from "next/link";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import CampaignActions from "@/components/CampaignActions";
import StatusBadge from "@/components/admin/StatusBadge";

type Result = {
  status: string | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  submittedAt: Date | null;
  reportedAt: Date | null;
};

type Campaign = {
  id: string;
  title: string;
  template: string;
  isActive: boolean;
  sentAt: Date | null;
  results: Result[];
};

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const sent = campaign.results.length;
  // Compteurs funnel : on compte par timestamp present plutot que par status,
  // pour avoir les counts EXACTS du funnel (un user qui a soumis a force
  // ouvert/clique avant -- on les compte tous).
  const opened = campaign.results.filter((r) => r.openedAt !== null).length;
  const clicked = campaign.results.filter((r) => r.clickedAt !== null).length;
  const submitted = campaign.results.filter(
    (r) => r.submittedAt !== null,
  ).length;
  const reported = campaign.results.filter((r) => r.reportedAt !== null).length;
  // "Ignored" = jamais ouvert ni signale (le user a probablement vu en preview
  // et zappe sans engagement). Approximation -- les pre-fetch proxies polluent.
  const ignored = sent - opened - reported;
  const tpl = PHISHING_TEMPLATES.find((t) => t.id === campaign.template);

  return (
    <article className="rounded-lg border border-gray-200 dark:border-slate-800 p-4 hover:shadow-sm transition">
      <header className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0" aria-hidden="true">
            {tpl?.emoji ?? "🎣"}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/admin/phishing/${campaign.id}`}
                className="font-bold text-gray-900 dark:text-gray-100 truncate hover:underline"
              >
                {campaign.title}
              </Link>
              {campaign.isActive ? (
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
              Lancée le {campaign.sentAt?.toLocaleDateString("fr-FR")} · {sent}{" "}
              cible{sent > 1 ? "s" : ""} ·{" "}
              <Link
                href={`/admin/phishing/${campaign.id}`}
                className="underline hover:text-accent-500"
              >
                Détails
              </Link>
            </p>
          </div>
        </div>
        <CampaignActions
          campaignId={campaign.id}
          isActive={campaign.isActive}
        />
      </header>

      {/* Funnel 5 metrics : sent (implicite via le titre) -> opened -> clicked
          -> submitted, + reported orthogonal + ignored (approx). */}
      <div className="grid grid-cols-5 gap-2">
        <ResultStat label="Ouvert" value={opened} total={sent} variant="info" />
        <ResultStat
          label="Cliqué"
          value={clicked}
          total={sent}
          variant="warn"
        />
        <ResultStat
          label="Soumis"
          value={submitted}
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
  variant: "info" | "warn" | "danger" | "success" | "neutral";
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const styles =
    variant === "danger"
      ? "bg-rose-50 dark:bg-rose-900/15 text-rose-700 dark:text-rose-300"
      : variant === "warn"
        ? "bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300"
        : variant === "info"
          ? "bg-cyan-50 dark:bg-cyan-900/15 text-cyan-700 dark:text-cyan-300"
          : variant === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300"
            : "bg-gray-50 dark:bg-slate-800/40 text-gray-700 dark:text-gray-300";
  return (
    <div className={`rounded-lg p-2.5 ${styles}`}>
      <p className="text-lg font-extrabold tabular-nums leading-none">
        {value}
        <span className="text-[10px] font-medium opacity-80 ml-1">
          ({pct}%)
        </span>
      </p>
      <p className="text-[9px] uppercase tracking-widest font-bold mt-1">
        {label}
      </p>
    </div>
  );
}
