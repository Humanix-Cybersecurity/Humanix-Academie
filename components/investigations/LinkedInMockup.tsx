// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'un post LinkedIn. Look-and-feel inspire mais distinct
// (eviter trademark issues). Le but est qu'un apprenant Y reconnaisse
// la dynamique d'un post LinkedIn.

import type { Media } from "@/lib/investigations/types";

type Props = {
  media: Extract<Media, { type: "linkedin-mockup" }>;
};

export default function LinkedInMockup({ media }: Props) {
  const m = media.data;
  return (
    <div className="rounded-2xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden max-w-2xl mx-auto">
      {/* Header style LinkedIn */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-4 py-2 flex items-center gap-2">
        <span className="text-xs font-bold tracking-wider">RÉSEAU PRO</span>
        <span className="text-xs opacity-70 ml-auto">post public</span>
      </div>

      {/* Auteur */}
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-lg">
          {m.author.split(" ").map((s) => s[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {m.author}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {m.authorHeadline}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
            <span>{m.timeAgo}</span>
            <span aria-hidden="true">·</span>
            <span aria-hidden="true">🌐</span>
          </div>
        </div>
      </div>

      {/* Corps du post */}
      <div className="px-5 pb-4">
        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
          {m.body}
        </div>
      </div>

      {/* Footer reactions / commentaires */}
      {(m.reactions || m.comments) && (
        <div className="border-t border-gray-200 dark:border-slate-700 px-5 py-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            {m.reactions ? (
              <span>
                <span aria-hidden="true">👍❤️🎉</span> {m.reactions} réactions
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {m.comments ? <span>{m.comments} commentaires</span> : null}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-slate-700 px-5 py-2 flex items-center justify-around text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50">
        <button type="button" className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors" aria-disabled="true">
          👍 J'aime
        </button>
        <button type="button" className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors" aria-disabled="true">
          💬 Commenter
        </button>
        <button type="button" className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors" aria-disabled="true">
          🔁 Partager
        </button>
      </div>
    </div>
  );
}
