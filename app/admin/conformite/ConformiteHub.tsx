// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Hub conformité multi-référentiels (client). Vue d'ensemble des 7 référentiels
// + accordéon pour déplier les contrôles d'un référentiel. UNE section ouverte
// à la fois.
//
// HONNÊTETÉ : les contrôles hors périmètre Humanix (`outOfScope`) sont affichés
// explicitement — on ne laisse jamais croire qu'on couvre ce qu'on ne couvre
// pas. La preuve s'exporte vers CISO Assistant via le bouton dédié.
//
// Accessibilité : motif accordion (button aria-expanded/aria-controls, panneau
// role=region + hidden), navigation clavier ↑/↓/Home/End entre en-têtes.
// =============================================================================

"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

type Status = "compliant" | "partial" | "non_compliant" | "not_assessed";

export type FrameworkCoverageView = {
  ref: string;
  title: string;
  publisher: string;
  url: string;
  controls: {
    ref: string;
    name: string;
    category?: string;
    status: Status;
    score: number | null;
    scopeNote?: string;
  }[];
  outOfScope: { ref: string; reason: string }[];
  summary: {
    total: number;
    assessed: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
    coveragePct: number;
  };
};

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  compliant: {
    label: "Couvert",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  partial: {
    label: "Partiel",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  non_compliant: {
    label: "Insuffisant",
    cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  not_assessed: {
    label: "Non évalué",
    cls: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
  },
};

function barColor(pct: number): string {
  if (pct >= 67) return "bg-emerald-500";
  if (pct >= 34) return "bg-amber-500";
  return "bg-red-400";
}

export default function ConformiteHub({
  frameworks,
  cisoHref,
}: {
  frameworks: FrameworkCoverageView[];
  cisoHref: string;
}) {
  const [openRef, setOpenRef] = useState<string | null>(
    frameworks[0]?.ref ?? null,
  );
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    const last = frameworks.length - 1;
    let t = -1;
    if (e.key === "ArrowDown") t = idx === last ? 0 : idx + 1;
    else if (e.key === "ArrowUp") t = idx === 0 ? last : idx - 1;
    else if (e.key === "Home") t = 0;
    else if (e.key === "End") t = last;
    else return;
    e.preventDefault();
    headerRefs.current[t]?.focus();
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Bandeau honnêteté + export */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 p-4 flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">
          Couverture calculée depuis la complétion réelle des modules. Humanix
          couvre le <strong>volet humain / formation</strong> de chaque
          référentiel ; les contrôles hors périmètre sont listés tels quels
          (jamais surcotés). La preuve s'exporte vers votre outil GRC.
        </p>
        <Link href={cisoHref} className="btn-primary text-sm whitespace-nowrap">
          Exporter la preuve → CISO Assistant
        </Link>
      </div>

      {/* Vue d'ensemble : une carte par référentiel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {frameworks.map((f) => (
          <button
            key={`tile-${f.ref}`}
            type="button"
            onClick={() => {
              setOpenRef(f.ref);
              document
                .getElementById(`cf-h-${f.ref}`)
                ?.scrollIntoView({ block: "center" });
            }}
            className="text-left rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-accent-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
              {f.ref}
            </p>
            <p className="text-2xl font-extrabold tabular-nums mt-1">
              {f.summary.coveragePct}
              <span className="text-sm text-gray-400">%</span>
            </p>
            <span
              className="block mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden"
              aria-hidden="true"
            >
              <span
                className={`block h-full rounded-full ${barColor(f.summary.coveragePct)}`}
                style={{ width: `${f.summary.coveragePct}%` }}
              />
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
              {f.summary.compliant}/{f.summary.total} couverts
            </p>
          </button>
        ))}
      </div>

      {/* Accordéon détaillé */}
      <div className="space-y-3">
        {frameworks.map((f, idx) => {
          const expanded = openRef === f.ref;
          const hId = `cf-h-${f.ref}`;
          const pId = `cf-p-${f.ref}`;
          return (
            <div
              key={f.ref}
              className={`rounded-2xl border-2 overflow-hidden ${
                expanded
                  ? "border-accent-300 dark:border-accent-800 bg-white dark:bg-slate-900"
                  : "border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40"
              }`}
            >
              <h3 className="m-0">
                <button
                  ref={(el) => {
                    headerRefs.current[idx] = el;
                  }}
                  id={hId}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={pId}
                  onClick={() => setOpenRef(expanded ? null : f.ref)}
                  onKeyDown={(e) => onKeyDown(e, idx)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset rounded-2xl"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-extrabold text-base text-primary-600 dark:text-accent-200">
                      {f.title}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {f.publisher} · {f.summary.compliant} couverts ·{" "}
                      {f.summary.partial} partiels · {f.outOfScope.length} hors
                      périmètre
                    </span>
                  </span>
                  <span className="font-extrabold tabular-nums text-lg shrink-0">
                    {f.summary.coveragePct}%
                  </span>
                  <svg
                    className={`shrink-0 w-5 h-5 text-gray-400 transition-transform duration-300 ${
                      expanded ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </h3>

              <div
                id={pId}
                role="region"
                aria-labelledby={hId}
                hidden={!expanded}
                className="px-4 sm:px-5 pb-5 pt-1 space-y-2"
              >
                <Link
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-accent-600 dark:text-accent-300 hover:underline mb-2"
                >
                  Texte de référence ↗
                </Link>

                {f.controls.map((c) => {
                  const meta = STATUS_META[c.status];
                  return (
                    <div
                      key={c.ref}
                      className="rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">
                              {c.ref}
                            </span>
                            {c.name}
                          </p>
                          {c.scopeNote && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                              {c.scopeNote}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.score !== null && (
                            <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                              {Math.round(c.score * 100)}%
                            </span>
                          )}
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {f.outOfScope.length > 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 p-3 mt-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Hors périmètre Humanix ({f.outOfScope.length})
                    </p>
                    <ul className="space-y-1">
                      {f.outOfScope.map((o) => (
                        <li
                          key={o.ref}
                          className="text-xs text-gray-500 dark:text-gray-400"
                        >
                          <span className="font-mono mr-2">{o.ref}</span>
                          {o.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
