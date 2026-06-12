// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'un post Facebook. Look-and-feel inspire mais distinct
// pour eviter trademark.

import type { Media } from "@/lib/investigations/types";

type Props = {
  media: Extract<Media, { type: "facebook-mockup" }>;
};

export default function FacebookMockup({ media }: Props) {
  const m = media.data;
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-2 text-xs font-bold tracking-wider">
        RÉSEAU SOCIAL - POST PUBLIC
      </div>

      {/* Auteur */}
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg">
          {m.author.split(" ").map((s) => s[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {m.author}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span>{m.timeAgo}</span>
            <span aria-hidden="true">·</span>
            <span aria-hidden="true">🌐 Public</span>
            {m.location && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  <span aria-hidden="true">📍</span> {m.location}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="px-5 pb-3">
        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
          {m.body}
        </div>
      </div>

      {/* Photo (placeholder si pas d'URL reelle) */}
      {m.photo && (
        <div className="aspect-[16/10] bg-gradient-to-br from-sky-200 to-orange-200 dark:from-sky-900 dark:to-orange-900 flex items-center justify-center text-6xl">
          {m.photo === "vacation-beach" && "🏖️"}
          {m.photo === "kids-school" && "🎒"}
          {m.photo === "house-keys" && "🔑"}
          {m.photo === "new-car" && "🚗"}
          {!["vacation-beach", "kids-school", "house-keys", "new-car"].includes(
            m.photo,
          ) && "📷"}
        </div>
      )}

      {/* Reactions footer */}
      <div className="px-5 py-2 border-t border-gray-200 dark:border-slate-700 flex items-center justify-around text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50">
        <span aria-disabled="true">👍 J'aime</span>
        <span aria-disabled="true">💬 Commenter</span>
        <span aria-disabled="true">🔁 Partager</span>
      </div>
    </div>
  );
}
