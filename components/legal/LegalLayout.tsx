// Layout commun aux pages légales : breadcrumb, hero, sidebar TOC sticky,
// section principale, CTA contact en pied. Design aligné sur le ton du site.
import Link from "next/link";
import type { ReactNode } from "react";
import PrintButton from "@/components/legal/PrintButton";

export type TocItem = { id: string; label: string };

export default function LegalLayout({
  badge,
  title,
  subtitle,
  version,
  lastUpdate,
  toc,
  children,
}: {
  badge: string; // ex: "RGPD" ou "LCEN"
  title: string;
  subtitle?: string;
  version?: string; // ex: "v1.0"
  lastUpdate: string; // ex: "29/04/2026"
  toc: TocItem[];
  children: ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-primary-50/50 to-white dark:from-slate-900 dark:to-slate-950 min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-6 text-xs text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-primary-500">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium">Documents légaux</span>
        <span className="mx-2">/</span>
        <span className="text-primary-500 font-bold">{title}</span>
      </div>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-4 pt-8 pb-10">
        <div className="card bg-gradient-to-br from-primary-500 to-accent-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          <div className="relative">
            <span className="inline-block bg-white/20 backdrop-blur text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
              📜 {badge}
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg sm:text-xl opacity-90 max-w-3xl mb-4">
                {subtitle}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm opacity-90 mt-6">
              {version && (
                <span className="bg-white/20 backdrop-blur rounded-full px-3 py-1 font-medium">
                  Version {version}
                </span>
              )}
              <span className="bg-white/20 backdrop-blur rounded-full px-3 py-1">
                ⏱ Mise à jour : <strong>{lastUpdate}</strong>
              </span>
              <Link
                href="/securite"
                className="bg-white/20 backdrop-blur hover:bg-white/30 rounded-full px-3 py-1 transition"
              >
                🛡️ Trust Center
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Body : sidebar + contenu */}
      <div className="max-w-6xl mx-auto px-4 pb-16 grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Sommaire latéral sticky */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 card p-4 text-sm">
            <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
              📑 Sommaire
            </p>
            <ul className="space-y-1.5">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block text-gray-600 dark:text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1.5 transition"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <PrintButton />
            </div>
          </nav>
        </aside>

        {/* Contenu principal */}
        <article className="legal-content min-w-0">{children}</article>
      </div>

      {/* CTA contact en pied */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="card bg-gradient-to-br from-cyan-50 to-primary-50 dark:from-slate-800 dark:to-slate-700 border-2 border-accent-500/30 text-center">
          <p className="text-3xl mb-3">💬</p>
          <h2 className="text-xl font-extrabold text-primary-500 mb-2">
            Une question sur ce document ?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-5 text-sm">
            Notre équipe répond sous 5 jours ouvrés. Pour toute demande relative
            à vos données personnelles, écrivez directement à notre adresse
            RGPD.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:contact@humanix-cybersecurity.fr"
              className="btn-primary text-sm py-2 px-5"
            >
              ✉️ contact@humanix-cybersecurity.fr
            </a>
            <a
              href="mailto:rgpd@humanix-cybersecurity.fr"
              className="btn-secondary text-sm py-2 px-5"
            >
              🔐 rgpd@humanix-cybersecurity.fr
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LegalSection : section avec id ancrable + style cohérent
// =============================================================================
export function LegalSection({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num?: string; // "1", "2.1", etc.
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card mb-6 scroll-mt-24">
      <div className="flex items-baseline gap-3 mb-4 pb-3 border-b-2 border-primary-100 dark:border-slate-700">
        {num && (
          <span className="text-xs font-mono bg-primary-500 text-white rounded-full px-2.5 py-1 font-bold">
            {num}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-extrabold text-primary-500">
          {title}
        </h2>
      </div>
      <div className="legal-prose">{children}</div>
    </section>
  );
}

// =============================================================================
// LegalSubsection : sous-section h3
// =============================================================================
export function LegalSubsection({
  num,
  title,
  children,
}: {
  num?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 mb-4">
      <h3 className="text-base sm:text-lg font-bold text-accent-500 mb-2 flex items-baseline gap-2">
        {num && <span className="text-xs font-mono text-gray-400">{num}</span>}
        {title}
      </h3>
      <div className="legal-prose">{children}</div>
    </div>
  );
}

// =============================================================================
// LegalTable : tableau stylé pour données structurées
// =============================================================================
export function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0 my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-primary-500 text-white">
            {headers.map((h, i) => (
              <th
                key={i}
                className="border border-primary-600 px-3 py-2.5 text-left font-bold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={
                ri % 2 === 0
                  ? "bg-white dark:bg-slate-800"
                  : "bg-primary-50/30 dark:bg-slate-700/30"
              }
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border border-gray-200 dark:border-slate-600 px-3 py-2.5 align-top text-gray-700 dark:text-gray-200"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Highlight : encadré coloré pour points importants
// =============================================================================
export function LegalHighlight({
  variant = "info",
  emoji,
  children,
}: {
  variant?: "info" | "warning" | "success";
  emoji?: string;
  children: ReactNode;
}) {
  const styles = {
    info: "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-400 text-cyan-900 dark:text-cyan-100",
    warning:
      "bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-900 dark:text-amber-100",
    success:
      "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-900 dark:text-emerald-100",
  };
  const defaultEmoji = { info: "ℹ️", warning: "⚠️", success: "✅" }[variant];
  return (
    <div className={`border-l-4 rounded-r-lg p-4 my-4 ${styles[variant]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{emoji ?? defaultEmoji}</span>
        <div className="flex-1 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
