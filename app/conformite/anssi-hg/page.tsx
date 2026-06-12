// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /conformite/anssi-hg - Page publique de conformite aux 42 mesures
// du Guide d'hygiene informatique de l'ANSSI v2 (2017).
//
// PHILOSOPHIE : on ne se contente pas de dire "on est conformes". On
// affiche le mapping reel, mesure par mesure, avec le statut effectif
// et les preuves. La page est generee depuis lib/mapping-grc.ts qui
// est *le meme* fichier utilise par l'API evidence-export et le
// connecteur CISO Assistant : impossible de dériver entre la doc
// publique et la conformite operationnelle.
//
// Cible : RSSI, DSI, auditeur ANSSI, journaliste cyber qui veut
// verifier nos affirmations en 30 secondes.

import Link from "next/link";
import { FRAMEWORKS } from "@/lib/mapping-grc";

export const metadata = {
  title:
    "Conformité ANSSI HG (42 mesures) - Humanix Académie",
  description:
    "Mapping public, mesure par mesure, de la conformité Humanix Académie aux 42 mesures du Guide d'hygiène informatique de l'ANSSI v2 (2017). Source de vérité unique avec l'API evidence-export.",
  alternates: { canonical: "/conformite/anssi-hg" },
};

// Statut visuel pour chaque mesure, derive de l'existence et du contenu
// des artifacts dans le mapping.
type MeasureStatus = "covered" | "partial" | "out_of_scope" | "platform_native";

function statusOf(controlRef: string): MeasureStatus {
  const anssi = FRAMEWORKS["ANSSI-HG"];
  const c = anssi.controls.find((x) => x.ref === controlRef);
  const oos = anssi.outOfScope.find((x) => x.ref === controlRef);
  if (oos) return "out_of_scope";
  if (!c) return "out_of_scope";
  if (c.artifacts.length === 0) return "out_of_scope";
  // Heuristique : si le scopeNote commence par "★", c'est natif plateforme.
  if (c.scopeNote?.startsWith("★")) return "platform_native";
  // Couverture partielle si plusieurs artifacts metric/document/policy
  // mais sans threshold (donc documentaire).
  const hasMetric = c.artifacts.some((a) => a.type === "metric");
  const hasPolicy = c.artifacts.some(
    (a) => a.type === "policy" || a.type === "document",
  );
  if (hasMetric && hasPolicy) return "covered";
  if (hasMetric || hasPolicy) return "partial";
  return "out_of_scope";
}

const STATUS_BADGE: Record<MeasureStatus, { label: string; cls: string; emoji: string }> = {
  platform_native: {
    label: "Natif plateforme",
    emoji: "★",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  covered: {
    label: "Couvert",
    emoji: "✓",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  partial: {
    label: "Partiel",
    emoji: "~",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  out_of_scope: {
    label: "Hors scope SaaS",
    emoji: "-",
    cls: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300",
  },
};

const CHAPTERS: { roman: string; label: string; range: [number, number] }[] = [
  { roman: "I", label: "Sensibiliser et former", range: [1, 2] },
  { roman: "II", label: "Connaître le système d'information", range: [3, 10] },
  { roman: "III", label: "Authentifier et contrôler les accès", range: [11, 16] },
  { roman: "IV", label: "Sécuriser les postes", range: [17, 21] },
  { roman: "V", label: "Sécuriser le réseau", range: [22, 26] },
  { roman: "VI", label: "Sécuriser l'administration", range: [27, 29] },
  { roman: "VII", label: "Gérer le nomadisme", range: [30, 33] },
  { roman: "VIII", label: "Maintenir le SI à jour", range: [34, 35] },
  { roman: "IX", label: "Superviser, auditer, réagir", range: [36, 40] },
  { roman: "X", label: "Pour aller plus loin", range: [41, 42] },
];

export default function ConformiteAnssiHgPage() {
  const anssi = FRAMEWORKS["ANSSI-HG"];

  // Calcul des stats globales
  const stats = {
    total: 42,
    platform_native: 0,
    covered: 0,
    partial: 0,
    out_of_scope: 0,
  };
  for (let i = 1; i <= 42; i++) {
    const s = statusOf(`M${i}`);
    stats[s]++;
  }
  const inScope = stats.platform_native + stats.covered + stats.partial;
  const coveragePercent =
    inScope === 0
      ? 0
      : Math.round(
          ((stats.platform_native + stats.covered) / inScope) * 100,
        );

  return (
    <main id="main-content" className="overflow-x-hidden">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500">
            Trust Center · Conformité publique
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300">
            Conformité ANSSI HG - 42 mesures
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Mapping public, mesure par mesure, du Guide d'hygiène informatique
            v2 de l'ANSSI (2017). Cette page est générée à partir du fichier{" "}
            <Link
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/lib/mapping-grc.ts"
              className="font-mono text-accent-500 underline-offset-4 hover:underline"
            >
              lib/mapping-grc.ts
            </Link>
            {" "}- le même fichier qui alimente l'API{" "}
            <code className="font-mono text-sm">/api/v1/evidence-export</code>{" "}
            et le connecteur CISO Assistant. Aucune dérive possible entre
            l'affichage commercial et la réalité opérationnelle.
          </p>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi
            label="Natif plateforme"
            value={stats.platform_native}
            sub="★ Couverture native"
            color="emerald"
          />
          <Kpi
            label="Couvert"
            value={stats.covered}
            sub="✓ Pédagogique + plateforme"
            color="blue"
          />
          <Kpi
            label="Partiel"
            value={stats.partial}
            sub="~ Sensibilisation seule"
            color="amber"
          />
          <Kpi
            label="Hors scope SaaS"
            value={stats.out_of_scope}
            sub="- Côté client uniquement"
            color="gray"
          />
        </section>

        {/* Score global */}
        <section className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/15 p-6 sm:p-8 text-center">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300">
            Score périmètre applicable
          </p>
          <p className="text-5xl sm:text-7xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-3 tabular-nums">
            {coveragePercent}%
          </p>
          <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-3 max-w-xl mx-auto">
            <strong>{stats.platform_native + stats.covered}</strong>{" "}
            mesures couvertes nativement ou par sensibilisation sur{" "}
            <strong>{inScope}</strong> mesures applicables à un SaaS de
            sensibilisation (4 mesures sont assumées hors scope car elles
            concernent l'architecture réseau du client).
          </p>
        </section>

        {/* Légende */}
        <section className="grid sm:grid-cols-4 gap-2 text-xs">
          {(["platform_native", "covered", "partial", "out_of_scope"] as const).map(
            (s) => {
              const b = STATUS_BADGE[s];
              return (
                <div
                  key={s}
                  className={`px-3 py-2 rounded-lg ${b.cls} font-semibold`}
                >
                  <span className="font-mono">{b.emoji}</span> {b.label}
                </div>
              );
            },
          )}
        </section>

        {/* Mesures par chapitre */}
        {CHAPTERS.map((ch) => {
          const measures = [];
          for (let i = ch.range[0]; i <= ch.range[1]; i++) {
            const ref = `M${i}`;
            const status = statusOf(ref);
            const control = anssi.controls.find((c) => c.ref === ref);
            const oos = anssi.outOfScope.find((c) => c.ref === ref);
            measures.push({
              ref,
              name: control?.name ?? "Mesure ANSSI HG",
              scopeNote: control?.scopeNote,
              oosReason: oos?.reason,
              artifacts: control?.artifacts ?? [],
              status,
            });
          }
          return (
            <section key={ch.roman}>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-2xl font-bold text-accent-500 font-display">
                  {ch.roman}
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300">
                  {ch.label}
                </h2>
                <span className="text-xs text-gray-500">
                  ({ch.range[0]}–{ch.range[1]})
                </span>
              </div>
              <ul className="space-y-3">
                {measures.map((m) => {
                  const badge = STATUS_BADGE[m.status];
                  return (
                    <li
                      key={m.ref}
                      className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md tabular-nums">
                          {m.ref}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${badge.cls}`}
                        >
                          {badge.emoji} {badge.label}
                        </span>
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 flex-1 min-w-[200px]">
                          {m.name}
                        </h3>
                      </div>
                      {m.scopeNote && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                          {m.scopeNote}
                        </p>
                      )}
                      {m.oosReason && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 italic">
                          ⓘ {m.oosReason}
                        </p>
                      )}
                      {m.artifacts.length > 0 && (
                        <details className="mt-3 group">
                          <summary className="text-xs uppercase tracking-wider font-bold text-accent-500 cursor-pointer hover:text-accent-700">
                            {m.artifacts.length} artefact
                            {m.artifacts.length > 1 ? "s" : ""} de preuve
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs">
                            {m.artifacts.map((a, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-gray-600 dark:text-gray-300"
                              >
                                <span
                                  className="font-mono text-[10px] uppercase bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                                  title={`Type d'artifact : ${a.type}`}
                                >
                                  {a.type}
                                </span>
                                <span>{a.label}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {/* Mesures hors scope assumées */}
        <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 p-5 sm:p-6">
          <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-3">
            🎯 Mesures assumées hors scope SaaS
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
            Certaines mesures ANSSI HG concernent l'architecture réseau ou
            l'outillage de gestion du parc du client lui-même. Elles ne
            peuvent pas être couvertes par un SaaS de sensibilisation, et
            nous l'assumons explicitement plutôt que de prétendre les
            couvrir :
          </p>
          <ul className="space-y-2 text-sm">
            {anssi.outOfScope.map((o) => (
              <li
                key={o.ref}
                className="flex items-start gap-2 text-gray-700 dark:text-gray-200"
              >
                <span className="font-mono font-bold text-gray-500 dark:text-gray-400">
                  {o.ref}
                </span>
                <span>{o.reason}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 italic mt-4">
            Cette transparence est ce qui distingue un éditeur honnête d'un
            vendeur de fumée : nous préférons documenter clairement ce que
            nous ne faisons pas plutôt que sur-promettre.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-3xl border-2 border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 p-6 sm:p-8 text-center">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            Audit indépendant ou demande de dossier
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-5">
            RSSI, DSI, auditeur ANSSI : vérifiez nos affirmations directement
            dans le code source AGPLv3, ou demandez un dossier complet pour
            vos due diligence.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/lib/mapping-grc.ts"
              className="btn-primary inline-flex items-center gap-2"
            >
              Voir le code source du mapping
            </Link>
            <a
              href="mailto:rgpd@humanix-cybersecurity.fr"
              className="btn-secondary inline-flex items-center gap-2"
            >
              Demander un dossier complet
            </a>
          </div>
        </section>

        {/* Liens connexes */}
        <section className="grid sm:grid-cols-3 gap-3">
          <RelatedCard
            href="/securite"
            title="Trust Center"
            desc="Hébergement, RGPD, sécurité technique, sous-traitants"
          />
          <RelatedCard
            href="/architecture"
            title="Architecture technique"
            desc="Cartographie de la plateforme, choix souverains"
          />
          <RelatedCard
            href="/integrations/ciso-assistant"
            title="Connecteur GRC"
            desc="API evidence-export pour CISO Assistant et autres outils GRC"
          />
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
          Page générée dynamiquement à partir du mapping public.
          Toute modification du fichier{" "}
          <code>lib/mapping-grc.ts</code> se reflète automatiquement ici.
        </p>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: "emerald" | "blue" | "amber" | "gray";
}) {
  const colorCls =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/15"
      : color === "blue"
        ? "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/15"
        : color === "amber"
          ? "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/15"
          : "text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900";
  return (
    <div className={`rounded-2xl border p-4 ${colorCls}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">
        {label}
      </p>
      <p className="text-3xl sm:text-4xl font-extrabold mt-1 tabular-nums">
        {value}
      </p>
      <p className="text-[11px] mt-1 opacity-70">{sub}</p>
    </div>
  );
}

function RelatedCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-accent-300 dark:hover:border-accent-700 transition-colors"
    >
      <p className="font-display font-bold text-primary-500 dark:text-accent-300">
        {title}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{desc}</p>
    </Link>
  );
}
