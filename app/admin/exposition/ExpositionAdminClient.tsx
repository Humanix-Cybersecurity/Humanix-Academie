// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Client du dashboard RSSI /admin/exposition (Phase 2 B2B).
// Rend le panneau d'activation (DPA-gated) et le tableau des expositions
// detectees avec les actions de VALIDATION RSSI (assigner formation /
// ecarter). Toute la logique sensible vit dans les server actions.
"use client";

import { useState, useTransition } from "react";
import {
  enableExposureMonitoring,
  disableExposureMonitoring,
  validateExposureAction,
  dismissExposureAction,
  exportSiemAction,
  exportComplianceReportAction,
} from "./actions";

export type ExposureRow = {
  id: string;
  status: "NEW" | "VALIDATED" | "TRAINING_ASSIGNED" | "DISMISSED" | "REMEDIATED";
  matchedDomain: string;
  detectedAt: string;
  userName: string;
  breachTitle: string;
  breachOrg: string | null;
};

export type MonitoringState = {
  enabled: boolean;
  globallyEnabled: boolean;
  active: boolean;
  blockedReason: string | null;
  domains: string[];
  dpaSignedAt: string | null;
};

export type PostureState = {
  hasData: boolean;
  orgExposureScore: number;
  exposedCount: number;
  newCount: number;
  trainingCount: number;
  remediatedCount: number;
  dismissedCount: number;
  trend: { day: string; exposedCount: number; orgExposureScore: number }[];
};

const STATUS_META: Record<
  ExposureRow["status"],
  { label: string; cls: string }
> = {
  NEW: {
    label: "À valider",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  VALIDATED: {
    label: "Validée",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  TRAINING_ASSIGNED: {
    label: "Formation assignée",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  DISMISSED: {
    label: "Écartée",
    cls: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
  },
  REMEDIATED: {
    label: "Remédiée",
    cls: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  },
};

const ERROR_LABELS: Record<string, string> = {
  dpa_not_confirmed: "Confirmez la signature du DPA art.28.",
  no_valid_domain: "Saisissez au moins un domaine valide (ex. acme.fr).",
  domain_not_owned:
    "Domaine non prouvé : il doit correspondre à l'email vérifié d'un salarié.",
  monitoring_inactive: "Veille inactive (vérifiez les conditions d'activation).",
  inactive: "Veille inactive : rien à exporter.",
  no_tenant: "Tenant introuvable.",
  not_found: "Exposition introuvable ou déjà traitée.",
  wrong_status: "Cette exposition a déjà été traitée.",
  no_episode: "Épisode de remédiation introuvable.",
  plan_required: "Réservé au plan Enterprise.",
  forbidden: "Action réservée au RSSI / administrateur.",
  unauthorized: "Session expirée, reconnectez-vous.",
};

function fmtDate(iso: string): string {
  // Affichage stable (pas de locale serveur/client divergente).
  return iso.slice(0, 10);
}

/** Déclenche un téléchargement client à partir d'une chaîne. */
function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function scoreColor(score: number): string {
  if (score >= 67) return "text-red-600 dark:text-red-400";
  if (score >= 34) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export default function ExpositionAdminClient({
  monitoring,
  exposures,
  posture,
}: {
  monitoring: MonitoringState;
  exposures: ExposureRow[];
  posture: PostureState;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function runDownload(
    fn: () => Promise<
      | { ok: true; filename: string; content: string; mime: string }
      | { ok: false; error: string }
    >,
  ) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        triggerDownload(r.filename, r.content, r.mime);
        setMsg({ ok: true, text: `Export généré : ${r.filename}` });
      } else {
        setMsg({
          ok: false,
          text: ERROR_LABELS[r.error] ?? r.error ?? "Erreur d'export.",
        });
      }
    });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ ok: true, text: r.message ?? "Action effectuée." });
      } else {
        setMsg({
          ok: false,
          text:
            r.message ?? ERROR_LABELS[r.error ?? ""] ?? r.error ?? "Erreur.",
        });
      }
    });
  }

  const pendingRows = exposures.filter((e) => e.status === "NEW");
  const handledRows = exposures.filter((e) => e.status !== "NEW");

  return (
    <div className="space-y-6 min-w-0">
      {/* Bandeau d'etat global */}
      <div
        className={`rounded-xl border p-4 ${
          monitoring.active
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
        }`}
      >
        <p className="text-sm font-bold mb-1">
          {monitoring.active
            ? "✅ Veille active"
            : "⏸️ Veille inactive"}
        </p>
        {monitoring.blockedReason && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {monitoring.blockedReason}
          </p>
        )}
        {!monitoring.globallyEnabled && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ℹ️ Le module est verrouillé au niveau plateforme. Votre configuration
            est enregistrée mais la veille ne démarrera qu'après déverrouillage
            par Humanix (validation juridique DPA / AIPD / notice salariés).
          </p>
        )}
      </div>

      {msg && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-2 text-sm ${
            msg.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Panneau posture agrégée + exports (Phase 3) */}
      {monitoring.active && (
        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-base font-bold">Posture d'exposition</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Vue agrégée (sans donnée individuelle) - preuve de mesure de
                sécurité NIS2 art.21 / RGPD art.32.
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${scoreColor(posture.orgExposureScore)}`}>
                {posture.orgExposureScore}
                <span className="text-base text-gray-400">/100</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                score de posture
              </p>
            </div>
          </div>

          {posture.hasData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <Stat label="Ouvertes" value={posture.exposedCount} />
                <Stat label="À valider" value={posture.newCount} />
                <Stat label="En formation" value={posture.trainingCount} />
                <Stat label="Remédiées" value={posture.remediatedCount} />
                <Stat label="Écartées" value={posture.dismissedCount} />
              </div>
              {posture.trend.length > 1 && (
                <TrendBar trend={posture.trend} />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun snapshot encore : la posture apparaîtra après le premier
              passage du scan quotidien.
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
              Exports :
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => runDownload(() => exportComplianceReportAction())}
              className="btn-secondary text-xs"
            >
              📄 Rapport de posture (.md)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runDownload(() => exportSiemAction("json"))}
              className="btn-secondary text-xs"
            >
              🧩 SIEM (JSON)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runDownload(() => exportSiemAction("cef"))}
              className="btn-secondary text-xs"
            >
              🧩 SIEM (CEF)
            </button>
          </div>
        </section>
      )}

      {/* Panneau de configuration / activation */}
      <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-base font-bold mb-3">Configuration de la veille</h2>

        {monitoring.enabled ? (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Domaines surveillés :
              </span>{" "}
              {monitoring.domains.length > 0 ? (
                <span className="font-mono">
                  {monitoring.domains.join(", ")}
                </span>
              ) : (
                <em className="text-gray-400">aucun</em>
              )}
            </div>
            {monitoring.dpaSignedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                DPA art.28 confirmé le {fmtDate(monitoring.dpaSignedAt)}.
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => disableExposureMonitoring())}
              className="btn-secondary text-sm"
            >
              Désactiver la veille
            </button>
          </div>
        ) : (
          <form
            action={(fd) => run(() => enableExposureMonitoring(fd))}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="domains"
                className="block text-sm font-medium mb-1"
              >
                Domaines de l'organisation à surveiller
              </label>
              <input
                id="domains"
                name="domains"
                type="text"
                placeholder="acme.fr, acme-group.com"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Séparez par des virgules. Chaque domaine doit correspondre à
                l'email vérifié d'un salarié (preuve de propriété) - sinon il
                est refusé. Seuls les comptes sur ces domaines sont analysés
                (anti-données de tiers).
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="dpaConfirmed"
                className="mt-0.5"
              />
              <span>
                Je confirme qu'un <strong>contrat de sous-traitance (DPA,
                art.28 RGPD)</strong> couvrant cette veille est signé, et que
                la notice de transparence salariés ainsi que l'AIPD sont en
                place.
              </span>
            </label>

            <button
              type="submit"
              disabled={pending}
              className="btn-primary text-sm"
            >
              {pending ? "Enregistrement…" : "Activer la veille"}
            </button>
          </form>
        )}
      </section>

      {/* Expositions a valider */}
      <section>
        <h2 className="text-base font-bold mb-3">
          À valider{" "}
          <span className="text-sm font-normal text-gray-500">
            ({pendingRows.length})
          </span>
        </h2>
        {pendingRows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 p-4">
            Aucune exposition en attente de validation.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingRows.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {e.breachOrg ?? e.breachTitle} · domaine{" "}
                    <span className="font-mono">{e.matchedDomain}</span> ·
                    détecté le {fmtDate(e.detectedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => validateExposureAction(e.id))}
                    className="btn-primary text-xs"
                    title="Valider et assigner la formation de remédiation"
                  >
                    Valider + assigner
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => dismissExposureAction(e.id))}
                    className="btn-secondary text-xs"
                    title="Écarter (faux positif)"
                  >
                    Écarter
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historique */}
      {handledRows.length > 0 && (
        <section>
          <h2 className="text-base font-bold mb-3">
            Historique{" "}
            <span className="text-sm font-normal text-gray-500">
              ({handledRows.length})
            </span>
          </h2>
          <ul className="space-y-2">
            {handledRows.map((e) => {
              const meta = STATUS_META[e.status];
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.userName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {e.breachOrg ?? e.breachTitle} · domaine{" "}
                      <span className="font-mono">{e.matchedDomain}</span>
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

/** Mini-barres de tendance des expositions ouvertes (sans dépendance graphique). */
function TrendBar({
  trend,
}: {
  trend: { day: string; exposedCount: number; orgExposureScore: number }[];
}) {
  const max = Math.max(1, ...trend.map((t) => t.exposedCount));
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Expositions ouvertes - {trend.length} derniers jours
      </p>
      <div className="flex items-end gap-1 h-20">
        {trend.map((t) => (
          <div
            key={t.day}
            className="flex-1 bg-indigo-200 dark:bg-indigo-900/50 rounded-t"
            style={{ height: `${Math.round((t.exposedCount / max) * 100)}%` }}
            title={`${t.day} : ${t.exposedCount} ouverte(s), score ${t.orgExposureScore}/100`}
          />
        ))}
      </div>
    </div>
  );
}
