// SPDX-License-Identifier: AGPL-3.0-or-later
// Fiche détaillée d'un type d'incident cyber.
//
// Une seule route paramétrée [slug] : sert toutes les fiches définies
// dans lib/urgence-cyber/incidents.ts (ransomware, fuite-donnees,
// fraude-president, compte-compromis, vol-perte-materiel).
//
// Genere statiquement à la build via generateStaticParams pour
// permettre le caching CDN — la page est publique, sans login.

import { notFound } from "next/navigation";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import { INCIDENTS, INCIDENTS_INDEX } from "@/lib/urgence-cyber/incidents";
import type { IncidentType } from "@/lib/urgence-cyber/incidents";

type Params = { slug: string };

export function generateStaticParams() {
  return INCIDENTS.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const incident = INCIDENTS_INDEX[slug as IncidentType];
  if (!incident) return { title: "Urgence cyber | Humanix" };
  return {
    title: `${incident.title} — Que faire | Humanix`,
    description: `${incident.subtitle}. Réflexes immédiats, erreurs à éviter, actions sous 24h, outils, accompagnement.`,
  };
}

export default async function IncidentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const incident = INCIDENTS_INDEX[slug as IncidentType];
  if (!incident) notFound();

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          HERO — gravité + emoji incident
          ============================================================ */}
      <HexBackdrop
        intensity="soft"
        className="bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900"
      >
        <section
          aria-labelledby="incident-title"
          className="max-w-4xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12"
        >
          <Link
            href="/urgence-cyber"
            className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 hover:underline underline-offset-4 mb-6"
          >
            <span aria-hidden="true">←</span> Retour au hub d'urgence
          </Link>

          <div className="flex items-start gap-5 mb-6">
            <div
              className="text-7xl sm:text-8xl shrink-0 animate-float"
              aria-hidden="true"
            >
              {incident.emoji}
            </div>
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
                Fiche d'urgence
              </p>
              <h1
                id="incident-title"
                className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-amber-200 leading-tight mb-3"
              >
                {incident.title}
              </h1>
              <p className="text-base sm:text-lg italic text-amber-700 dark:text-amber-300">
                {incident.subtitle}
              </p>
            </div>
          </div>

          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed max-w-3xl">
            {incident.shortDesc}
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* ============================================================
            1. RÉFLEXES IMMÉDIATS
            ============================================================ */}
        <Block
          tone="amber"
          eyebrow="60 premières minutes"
          emoji="⚡"
          title="Réflexes immédiats"
        >
          <ol className="space-y-4">
            {incident.immediate.map((a, i) => (
              <ActionRow key={i} n={i + 1} text={a.text} why={a.why} />
            ))}
          </ol>
        </Block>

        {/* ============================================================
            2. ERREURS À ÉVITER
            ============================================================ */}
        <Block
          tone="rose"
          eyebrow="Antipatterns"
          emoji="⛔"
          title="Erreurs à éviter"
        >
          <ol className="space-y-4">
            {incident.dontDo.map((a, i) => (
              <DontRow key={i} text={a.text} why={a.why} />
            ))}
          </ol>
        </Block>

        {/* ============================================================
            3. ACTIONS SOUS 24H
            ============================================================ */}
        <Block
          tone="cyan"
          eyebrow="24 premières heures"
          emoji="📋"
          title="Actions sous 24 h"
        >
          <ol className="space-y-4">
            {incident.within24h.map((a, i) => (
              <ActionRow key={i} n={i + 1} text={a.text} why={a.why} />
            ))}
          </ol>
        </Block>

        {/* ============================================================
            4. OUTILS UTILES
            ============================================================ */}
        <Block
          tone="emerald"
          eyebrow="Boîte à outils"
          emoji="🧰"
          title="Outils utiles"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {incident.tools.map((t) => (
              <a
                key={t.url}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <p className="font-bold text-primary-500 dark:text-emerald-300 mb-1 flex items-center gap-1.5 group-hover:underline underline-offset-4">
                  {t.name}
                  <span aria-hidden="true" className="text-xs">
                    ↗
                  </span>
                  <span className="sr-only"> (nouvel onglet)</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t.note}
                </p>
              </a>
            ))}
          </div>
        </Block>

        {/* ============================================================
            5. QUAND APPELER HUMANIX
            ============================================================ */}
        <section aria-labelledby="humanix-title">
          <div className="card-hero relative overflow-hidden animate-glow">
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 text-9xl opacity-15"
            >
              🤝
            </div>
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-90 mb-2">
                Accompagnement humain
              </p>
              <h2
                id="humanix-title"
                className="font-display text-2xl sm:text-3xl font-extrabold mb-4"
              >
                Quand appeler Humanix Cybersecurity
              </h2>
              <p className="text-base sm:text-lg opacity-95 mb-6 leading-relaxed">
                {incident.whenToCallHumanix}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href="tel:+33000000000"
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary-500 font-bold px-6 py-4 rounded-2xl shadow-md hover:scale-105 transition-transform"
                >
                  <span aria-hidden="true">📞</span> Appeler maintenant
                </a>
                <a
                  href="mailto:incident@humanix-cybersecurity.fr"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur border-2 border-white/40 text-white font-bold px-6 py-4 rounded-2xl hover:bg-white/20 transition"
                >
                  <span aria-hidden="true">✉</span> Email d'urgence
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            NAV — autres fiches
            ============================================================ */}
        <section aria-labelledby="other-title" className="pt-6">
          <h2
            id="other-title"
            className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
          >
            Autres fiches d'urgence
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {INCIDENTS.filter((i) => i.slug !== incident.slug).map((i) => (
              <Link
                key={i.slug}
                href={`/urgence-cyber/${i.slug}`}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-4 hover:border-amber-500 hover:shadow-md transition-all"
              >
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {i.emoji}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-primary-500 dark:text-accent-300">
                    {i.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {i.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================================================
            RESPIRATION
            ============================================================ */}
        <section className="text-center pt-6">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Pas de panique. Une heure de réflexion claire vaut une journée
            de sprint dans la peur. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-amber-700/70 dark:text-amber-300/70 font-bold"
          >
            — Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function Block({
  tone,
  eyebrow,
  emoji,
  title,
  children,
}: {
  tone: "amber" | "rose" | "cyan" | "emerald";
  eyebrow: string;
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  const palette = {
    amber: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-yellow-950/20",
      ring: "border-amber-300 dark:border-amber-900/50",
      eyebrow: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      bg: "from-rose-50 via-white to-pink-50 dark:from-rose-950/30 dark:via-slate-900 dark:to-pink-950/20",
      ring: "border-rose-300 dark:border-rose-900/50",
      eyebrow: "text-rose-700 dark:text-rose-300",
    },
    cyan: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/20",
      ring: "border-cyan-300 dark:border-cyan-900/50",
      eyebrow: "text-cyan-700 dark:text-cyan-300",
    },
    emerald: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20",
      ring: "border-emerald-300 dark:border-emerald-900/50",
      eyebrow: "text-emerald-700 dark:text-emerald-300",
    },
  }[tone];

  return (
    <section
      className={`rounded-3xl bg-gradient-to-br ${palette.bg} border-2 ${palette.ring} p-6 sm:p-8 shadow-sm`}
    >
      <header className="flex items-baseline gap-3 mb-5 pb-4 border-b-2 border-dashed border-current/20">
        <span className="text-3xl shrink-0" aria-hidden="true">
          {emoji}
        </span>
        <div>
          <p
            className={`text-xs uppercase tracking-[0.25em] font-bold ${palette.eyebrow}`}
          >
            {eyebrow}
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-gray-100">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </section>
  );
}

function ActionRow({
  n,
  text,
  why,
}: {
  n: number;
  text: string;
  why?: string;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="shrink-0 w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 border-current/30 flex items-center justify-center font-display font-extrabold tabular-nums"
      >
        {n}
      </span>
      <div className="flex-1">
        <p className="text-base font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {text}
        </p>
        {why && (
          <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1 leading-relaxed">
            <span className="font-bold not-italic">Pourquoi : </span>
            {why}
          </p>
        )}
      </div>
    </li>
  );
}

function DontRow({ text, why }: { text: string; why?: string }) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="shrink-0 w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-200 font-bold text-xl"
      >
        ✗
      </span>
      <div className="flex-1">
        <p className="text-base font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
          {text}
        </p>
        {why && (
          <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1 leading-relaxed">
            <span className="font-bold not-italic">Pourquoi : </span>
            {why}
          </p>
        )}
      </div>
    </li>
  );
}
