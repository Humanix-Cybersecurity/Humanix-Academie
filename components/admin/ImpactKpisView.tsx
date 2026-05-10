// SPDX-License-Identifier: AGPL-3.0-or-later
//
// ImpactKpisView - presentation des KPIs de benefices observes.
//
// Public cible : DSI, RSSI, C-level qui veulent voir "ce que la
// plateforme a fait evoluer dans ma boite". Format : cards avec gros
// chiffre + delta, vocabulaire bienveillant.

import Link from "next/link";
import type { ImpactKpis } from "@/lib/impact-kpis";

export default function ImpactKpisView({ kpis }: { kpis: ImpactKpis }) {
  return (
    <div className="space-y-8">
      {/* ============================================================
          1. ADOPTION
          ============================================================ */}
      <Section
        title="Adoption"
        subtitle="Combien de tes collaborateurs utilisent vraiment la plateforme"
        emoji="👥"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Sièges activés"
            value={pct(kpis.adoption.activationRate)}
            sublabel={`${kpis.adoption.activatedSeats} sur ${kpis.adoption.totalSeats}`}
            tone={ratingForRate(kpis.adoption.activationRate, [0.5, 0.8])}
            help="Collaborateurs qui ont complété au moins 1 module"
          />
          <KpiCard
            label="Actifs cette semaine"
            value={pct(kpis.adoption.weeklyActiveRate)}
            sublabel="ont fait ≥ 1 module"
            tone={ratingForRate(kpis.adoption.weeklyActiveRate, [0.2, 0.5])}
            help="L'engagement régulier est ce qui transforme une formation ponctuelle en réflexe ancré"
          />
          <KpiCard
            label="Streak 2+ semaines"
            value={`${kpis.adoption.streakUsers}`}
            sublabel="collaborateurs réguliers"
            tone={ratingForCount(
              kpis.adoption.streakUsers,
              kpis.adoption.totalSeats,
              [0.1, 0.3],
            )}
            help="Ont fait au moins 1 module chaque semaine sur les 2 dernières semaines (régularité = réflexe ancré)"
          />
          <KpiCard
            label="Cadence moyenne"
            value={`${kpis.adoption.avgModulesPerWeek}`}
            sublabel="modules / sem · par actif"
            tone={
              kpis.adoption.avgModulesPerWeek >= 1
                ? "good"
                : kpis.adoption.avgModulesPerWeek >= 0.5
                  ? "okay"
                  : "low"
            }
            help="Promesse Humanix : 1 module de 5-10 min par semaine, soutenable dans la durée"
          />
        </div>
      </Section>

      {/* ============================================================
          2. APPRENTISSAGE
          ============================================================ */}
      <Section
        title="Apprentissage"
        subtitle="Le savoir qui s'accumule, mesurable au quotidien"
        emoji="📚"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Modules complétés"
            value={kpis.learning.totalModulesCompleted.toLocaleString("fr-FR")}
            sublabel={`depuis ${formatDays(kpis.daysSinceCreation)}`}
            tone="good"
            help="Total cumulé de tous les épisodes complétés par tous les collaborateurs"
          />
          <KpiCard
            label="Heures de formation"
            value={`${Math.round(kpis.learning.totalMinutesLearned / 60).toLocaleString("fr-FR")} h`}
            sublabel={`${kpis.learning.totalMinutesLearned.toLocaleString("fr-FR")} minutes`}
            tone="good"
            help="Cumul des durées d'épisodes complétés. Équivalent en heures-formation pour ton plan de développement compétences"
          />
          <KpiCard
            label="Quiz moyen"
            value={`${kpis.learning.avgQuizScorePct} %`}
            sublabel="bonnes réponses"
            tone={
              kpis.learning.avgQuizScorePct >= 80
                ? "good"
                : kpis.learning.avgQuizScorePct >= 60
                  ? "okay"
                  : "low"
            }
            help="Moyenne des meilleurs scores aux quiz de fin de module"
          />
          <DeltaCard
            label="Effet plateforme"
            from={kpis.learning.novicesAvgRiskScore}
            to={kpis.learning.engagedAvgRiskScore}
            delta={kpis.learning.riskScoreDelta}
            fromLabel={`Novices (${kpis.learning.novicesCount})`}
            toLabel={`Engagés (${kpis.learning.engagedCount})`}
            help="Score moyen des collaborateurs qui n'ont fait aucun ou un seul module (novices) vs ceux qui en ont fait 5 ou plus (engagés). C'est un proxy avant/après - l'écart positif montre l'effet de la plateforme."
          />
        </div>
      </Section>

      {/* ============================================================
          3. COUVERTURE CRITIQUE
          ============================================================ */}
      <Section
        title="Couverture des sujets critiques"
        subtitle="Les saisons qui couvrent les vecteurs d'attaque les plus courants côté humain"
        emoji="🛡"
      >
        <div className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Couverture moyenne des sujets critiques
            </p>
            <p className="text-3xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
              {kpis.coverage.averageCriticalCoverage} %
            </p>
          </div>
          <div className="space-y-3">
            {kpis.coverage.criticalSaisons.map((s) => (
              <div key={s.slug}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {s.title}
                  </p>
                  <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {s.coveragePct}% touchent ·{" "}
                    <strong className="text-primary-500 dark:text-accent-300">
                      {s.completionPct}% complète
                    </strong>
                  </p>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all"
                    style={{ width: `${s.coveragePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {kpis.coverage.criticalSaisons.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Les saisons critiques ne sont pas encore actives sur ce tenant.{" "}
              <Link
                href="/admin/modules"
                className="text-accent-500 underline font-medium"
              >
                Activer les saisons →
              </Link>
            </p>
          )}
        </div>
      </Section>

      {/* ============================================================
          4. RYTHME ACTUEL (30 derniers jours)
          ============================================================ */}
      <Section
        title="Rythme actuel"
        subtitle="Ce qui se passe ces 30 derniers jours"
        emoji="📊"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <KpiCard
            label="Modules complétés"
            value={kpis.reflexes.modulesCompletedLast30d.toLocaleString(
              "fr-FR",
            )}
            sublabel="sur 30 derniers jours"
            tone={
              kpis.reflexes.modulesCompletedLast30d >= 30
                ? "good"
                : kpis.reflexes.modulesCompletedLast30d >= 10
                  ? "okay"
                  : "low"
            }
          />
          <KpiCard
            label="Collaborateurs actifs"
            value={`${kpis.reflexes.activeUsersLast30d}`}
            sublabel={`sur ${kpis.adoption.totalSeats}`}
            tone={ratingForCount(
              kpis.reflexes.activeUsersLast30d,
              kpis.adoption.totalSeats,
              [0.3, 0.6],
            )}
          />
          <KpiCard
            label="Cadence par actif"
            value={`${kpis.reflexes.avgCadenceLast30d}`}
            sublabel="modules / personne"
            tone={
              kpis.reflexes.avgCadenceLast30d >= 4
                ? "good"
                : kpis.reflexes.avgCadenceLast30d >= 2
                  ? "okay"
                  : "low"
            }
          />
        </div>
      </Section>

      {/* ============================================================
          NOTE METHODOLOGIQUE
          ============================================================ */}
      <section className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-5">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-gray-600 dark:text-gray-400 mb-2">
          Comment lire ces chiffres
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Ces KPIs mesurent <strong>ce qui s'est passé chez toi</strong> grâce à
          la plateforme - pas une projection théorique. Le delta "Effet
          plateforme" est un proxy avant/après basé sur la comparaison entre
          collaborateurs novices (0-1 module) et engagés (5+ modules) - c'est
          de la causalité statistique, pas absolue. Pour le ROI financier
          (économie €/an espérée), voir{" "}
          <Link
            href="/admin/business"
            className="text-accent-500 underline font-medium"
          >
            Impact business
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

// =============================================================================
// Sous-composants
// =============================================================================

function Section({
  title,
  subtitle,
  emoji,
  children,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight flex items-center gap-2">
          <span aria-hidden="true">{emoji}</span>
          {title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

type Tone = "good" | "okay" | "low";

const TONE_CLASS: Record<Tone, { ring: string; bg: string; accent: string }> = {
  good: {
    ring: "border-emerald-200 dark:border-emerald-900/40",
    bg: "bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  okay: {
    ring: "border-amber-200 dark:border-amber-900/40",
    bg: "bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
    accent: "text-amber-700 dark:text-amber-300",
  },
  low: {
    ring: "border-rose-200 dark:border-rose-900/40",
    bg: "bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
    accent: "text-rose-700 dark:text-rose-300",
  },
};

function KpiCard({
  label,
  value,
  sublabel,
  tone,
  help,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone: Tone;
  help?: string;
}) {
  const t = TONE_CLASS[tone];
  return (
    <article
      className={`rounded-2xl border-2 ${t.ring} ${t.bg} p-5 shadow-sm`}
      title={help}
    >
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>
      <p
        className={`font-display text-4xl font-extrabold ${t.accent} tabular-nums leading-tight`}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {sublabel}
        </p>
      )}
    </article>
  );
}

function DeltaCard({
  label,
  from,
  to,
  delta,
  fromLabel,
  toLabel,
  help,
}: {
  label: string;
  from: number;
  to: number;
  delta: number;
  fromLabel: string;
  toLabel: string;
  help?: string;
}) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const tone: Tone = isPositive ? "good" : isNeutral ? "okay" : "low";
  const t = TONE_CLASS[tone];
  const arrow = isPositive ? "↗" : isNeutral ? "→" : "↘";
  const sign = delta > 0 ? "+" : "";
  return (
    <article
      className={`rounded-2xl border-2 ${t.ring} ${t.bg} p-5 shadow-sm`}
      title={help}
    >
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>
      <p
        className={`font-display text-3xl font-extrabold ${t.accent} tabular-nums leading-tight flex items-baseline gap-1.5`}
      >
        <span>
          {sign}
          {delta}
        </span>
        <span className="text-xl" aria-hidden="true">
          {arrow}
        </span>
      </p>
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
        <p>
          <span className="text-gray-500 dark:text-gray-500">{fromLabel}</span>{" "}
          : <strong className="tabular-nums">{from}</strong>
        </p>
        <p>
          <span className="text-gray-500 dark:text-gray-500">{toLabel}</span> :{" "}
          <strong className="tabular-nums">{to}</strong>
        </p>
      </div>
    </article>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function pct(rate: number): string {
  return `${Math.round(rate * 100)} %`;
}

function ratingForRate(rate: number, [low, high]: [number, number]): Tone {
  if (rate >= high) return "good";
  if (rate >= low) return "okay";
  return "low";
}

function ratingForCount(
  count: number,
  total: number,
  [low, high]: [number, number],
): Tone {
  if (total === 0) return "low";
  const ratio = count / total;
  if (ratio >= high) return "good";
  if (ratio >= low) return "okay";
  return "low";
}

function formatDays(days: number): string {
  if (days < 30) return `${days} jour${days > 1 ? "s" : ""}`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} mois`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} an${years > 1 ? "s" : ""}`;
}
