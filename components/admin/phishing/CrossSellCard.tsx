// SPDX-License-Identifier: AGPL-3.0-or-later
// Carte de cross-sell vers les options IA (generation a la volee, batch).

import Link from "next/link";

export default function CrossSellCard({
  badge,
  title,
  description,
  cta,
  href,
  icon,
}: {
  badge: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-primary-500/20 dark:border-accent-500/30 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/15 p-4 transition hover:border-accent-500 hover:shadow-md"
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="shrink-0 w-10 h-10 rounded-lg bg-white/70 dark:bg-slate-900/50 flex items-center justify-center text-xl"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-600 dark:text-accent-300">
            {badge}
          </p>
          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-tight">
            {title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
            {description}
          </p>
          <p className="text-xs font-bold text-accent-600 dark:text-accent-300 mt-2 group-hover:translate-x-0.5 transition inline-flex items-center gap-1">
            {cta} <span aria-hidden="true">→</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
