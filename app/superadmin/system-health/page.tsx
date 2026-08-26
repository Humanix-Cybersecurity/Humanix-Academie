// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /superadmin/system-health — santé des tâches planifiées (#749).
//
// POURQUOI ICI ET PAS /admin : la santé des crons est une donnée
// d'infrastructure GLOBALE (pas de tenantId sur CronRun). L'exposer à
// chaque ADMIN de tenant reviendrait à divulguer l'état d'exploitation de
// la plateforme à tous les clients. La console superadmin est justement
// la section cross-tenant du dépôt.
//
// Auth : SUPERADMIN, via app/superadmin/layout.tsx.

import type { Metadata } from "next";
import Link from "next/link";
import { getCronHealth, type CronHealthRow } from "@/lib/cron/health";
import { revisionDeployee } from "@/lib/version";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Santé système - Humanix Académie",
  robots: { index: false, follow: false },
};

const STATUS_UI: Record<
  CronHealthRow["status"],
  { label: string; emoji: string; badge: string }
> = {
  ok: {
    label: "OK",
    emoji: "🟢",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  late: {
    label: "En retard",
    emoji: "🟠",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  error: {
    label: "En erreur",
    emoji: "🔴",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
  never: {
    label: "Jamais exécuté",
    emoji: "⚫",
    badge: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
  },
};

function formatAge(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `il y a ${Math.round(hours * 60)} min`;
  if (hours < 48) return `il y a ${Math.round(hours)} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function formatCadence(hours: number): string {
  if (hours === 1) return "1×/heure";
  if (hours === 24) return "1×/jour";
  if (hours === 168) return "1×/semaine";
  return `1× / ${hours} h`;
}

export default async function SystemHealthPage() {
  const health = await getCronHealth();
  const version = revisionDeployee();
  const needsAttention =
    health.counts.error + health.counts.never + health.counts.late;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300">
          🩺 Santé système
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Les {health.crons.length} tâches planifiées et leur dernier passage.
          Une tâche muette ne se signale pas toute seule : c&apos;est ainsi que
          des mails de phishing drippés n&apos;étaient jamais partis.
        </p>
      </header>

      {/* Revision livree : la reponse a « qu'est-ce qui tourne ? » sans SSH */}
      <section
        aria-labelledby="revision-title"
        className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"
      >
        <h2
          id="revision-title"
          className="text-sm font-bold text-gray-700 dark:text-gray-200"
        >
          Révision déployée
        </h2>
        {version.revision ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <code
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-slate-800"
              title={version.revision}
            >
              {version.courte}
            </code>
            {version.ref && (
              <>
                {" "}
                livrée depuis{" "}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                  {version.ref}
                </code>
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <strong>Inconnue.</strong> L&apos;image a été construite sans
            estampille de révision : c&apos;est le cas d&apos;un build manuel,
            ou d&apos;une livraison antérieure à sa mise en place. Le seul
            témoin reste alors le HEAD du clone sur le serveur.
          </p>
        )}
      </section>

      {/* Bandeau de synthèse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="OK" value={health.counts.ok} tone="emerald" />
        <Stat label="En retard" value={health.counts.late} tone="amber" />
        <Stat label="En erreur" value={health.counts.error} tone="rose" />
        <Stat label="Jamais vu" value={health.counts.never} tone="gray" />
      </div>

      {needsAttention === 0 ? (
        <p className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-900 dark:text-emerald-200">
          <span aria-hidden="true">✅ </span>
          Toutes les tâches sont passées dans les temps.
        </p>
      ) : (
        <p className="rounded-xl border-2 border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200">
          <span aria-hidden="true">⚠️ </span>
          {needsAttention} tâche{needsAttention > 1 ? "s" : ""} à regarder.
          Vérifier que l&apos;ordonnanceur tourne (
          <code className="font-mono text-xs">docker compose logs ofelia</code>)
          et que le job est bien déclaré dans{" "}
          <code className="font-mono text-xs">infra/ofelia/config.ini</code>.
        </p>
      )}

      {/* Détecteur de panne drip (bonus #749) */}
      {health.stuckDripCount > 0 && (
        <div className="rounded-xl border-2 border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-4">
          <p className="font-bold text-rose-900 dark:text-rose-200 text-sm mb-1">
            🎣 {health.stuckDripCount} mail
            {health.stuckDripCount > 1 ? "s" : ""} de phishing en souffrance
          </p>
          <p className="text-xs text-rose-800 dark:text-rose-300">
            Leur envoi était dû depuis plus d&apos;une heure et n&apos;a jamais
            été dépêché. Symptôme direct d&apos;un{" "}
            <code className="font-mono">phishing-drip</code> qui ne tourne pas
            (cf. #733).
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/40 text-left">
              <Th>Tâche</Th>
              <Th>État</Th>
              <Th>Dernier passage</Th>
              <Th>Durée</Th>
              <Th>Cadence attendue</Th>
              <Th>Erreurs 7 j</Th>
            </tr>
          </thead>
          <tbody>
            {health.crons.map((c) => {
              const ui = STATUS_UI[c.status];
              return (
                <tr
                  key={c.slug}
                  className="border-t border-gray-100 dark:border-slate-800 align-top"
                >
                  <td className="p-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {c.label}
                      {c.criticality === "high" && (
                        <span
                          className="ml-1 text-amber-500"
                          title="Son silence casse une fonctionnalité visible"
                        >
                          ★
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-gray-500">
                      /api/cron/{c.slug}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                      {c.description}
                    </p>
                    {c.lastError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-mono break-all">
                        {c.lastError}
                      </p>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ui.badge}`}
                    >
                      <span aria-hidden="true">{ui.emoji}</span>
                      {ui.label}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {c.lastRunAt ? (
                      <>
                        <span title={c.lastRunAt.toISOString()}>
                          {formatAge(c.hoursSinceLastRun)}
                        </span>
                        <p className="text-[11px] text-gray-500">
                          {c.lastRunAt.toLocaleString("fr-FR")}
                        </p>
                      </>
                    ) : (
                      <span className="text-gray-500 italic">aucune trace</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap tabular-nums text-gray-700 dark:text-gray-300">
                    {c.lastDurationMs === null
                      ? "—"
                      : c.lastDurationMs < 1000
                        ? `${c.lastDurationMs} ms`
                        : `${(c.lastDurationMs / 1000).toFixed(1)} s`}
                  </td>
                  <td className="p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {formatCadence(c.expectedEveryHours)}
                  </td>
                  <td className="p-3 tabular-nums text-center">
                    {c.errorsLast7d > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {c.errorsLast7d}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-500 italic">
        « En retard » = plus de 2,5× la cadence attendue sans passage — le seuil
        est large volontairement, cette page doit signaler les tâches mortes,
        pas râler pour dix minutes de décalage. Les exécutions sont conservées
        90 jours. Référence des cadences :{" "}
        <code className="font-mono">docs/CRON.md</code>. Généré le{" "}
        {health.generatedAt.toLocaleString("fr-FR")}.
      </p>

      <Link
        href="/superadmin"
        className="inline-block text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline"
      >
        ← Vue d&apos;ensemble
      </Link>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">
      {children}
    </th>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "gray";
}) {
  const tones = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    gray: "text-gray-500 dark:text-gray-400",
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
      <p
        className={`font-display text-2xl font-extrabold tabular-nums ${tones[tone]}`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">
        {label}
      </p>
    </div>
  );
}
