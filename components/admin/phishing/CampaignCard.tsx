// SPDX-License-Identifier: AGPL-3.0-or-later
// Carte d'une campagne phishing : titre + statut + stats (cliques/signales/ignores).
// Intègre CampaignActions (bouton stop/details) + ResultStat.

import { PHISHING_TEMPLATES } from "@/lib/phishing";
import CampaignActions from "@/components/CampaignActions";
import StatusBadge from "@/components/admin/StatusBadge";

type Result = {
  status: string | null;
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
  const clicked = campaign.results.filter((r) => r.status === "CLICKED").length;
  const reported = campaign.results.filter((r) => r.status === "REPORTED")
    .length;
  const ignored = sent - clicked - reported;
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
              <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {campaign.title}
              </h4>
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
              cible{sent > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <CampaignActions
          campaignId={campaign.id}
          isActive={campaign.isActive}
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
