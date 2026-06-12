// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'un client mail (style Outlook / Gmail). Pas de bibliotheque
// externe : on reproduit a la main avec Tailwind pour rester leger.
//
// Le but est de RESSEMBLER assez a un vrai mail pour declencher le
// reflexe d'analyse de l'apprenant, pas d'imiter parfaitement une UI
// existante (eviter le procès en trademark).

import type { Media } from "@/lib/investigations/types";

type Props = {
  // On accepte le shape parsed depuis MDX. Le discriminant a deja
  // ete valide en amont.
  media: Extract<Media, { type: "email-mockup" }>;
};

export default function EmailMockup({ media }: Props) {
  const m = media.data;
  return (
    <div className="rounded-2xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
      {/* Toolbar minimaliste, type Outlook */}
      <div className="bg-gray-100 dark:bg-slate-800 border-b border-gray-300 dark:border-slate-700 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-3 h-3 rounded-full bg-red-400" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" aria-hidden="true" />
        </div>
        <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
          📧 Boîte de réception
        </span>
      </div>

      {/* Headers */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 space-y-2">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">
          {m.subject}
        </h3>
        <div className="flex items-start gap-3 pt-1">
          {/* Avatar generique */}
          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
            {m.from.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {m.from}
              </span>
              <span className="text-gray-500 dark:text-gray-400 break-all">
                &lt;{m.fromEmail}&gt;
              </span>
            </div>
            {m.to && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                à : <span className="font-mono">{m.to}</span>
              </div>
            )}
            {m.sentAt && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {m.sentAt}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
          {m.body}
        </div>

        {/* Links - on affiche le label, mais on revele la vraie cible
            au survol. Pas de href reel (anti-clic accidentel). */}
        {m.links && m.links.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {m.links.map((link, i) => (
              <div
                key={i}
                className="group relative inline-block"
                title={`Cible réelle : ${link.realHref}`}
              >
                <span className="text-blue-600 dark:text-blue-400 underline cursor-help">
                  {link.label}
                </span>
                {/* Tooltip URL reelle, visible au survol */}
                <span className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-2 py-1 rounded font-mono whitespace-nowrap shadow-lg">
                  🔗 {link.realHref}
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              Survole le lien pour voir sa vraie destination (comme dans
              ton client mail).
            </p>
          </div>
        )}

        {m.hasAttachment && m.attachmentName && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-sm">
            <span aria-hidden="true">📎</span>
            <span className="font-mono">{m.attachmentName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
