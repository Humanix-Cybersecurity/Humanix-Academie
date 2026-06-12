// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'un profil Instagram. Layout grid 3x3 + bio en haut.
// Look-and-feel reconnaissable mais distinct anti-trademark (palette
// neutre, pas de logo).

import type { Media } from "@/lib/investigations/types";

type Props = {
  media: Extract<Media, { type: "instagram-profile-mockup" }>;
};

function formatStat(n: number | undefined): string {
  if (typeof n !== "number") return "-";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} k`;
  return String(n);
}

export default function InstagramProfileMockup({ media }: Props) {
  const m = media.data;
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
      {/* Header bandeau */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-4 py-2 text-xs font-bold tracking-wider text-center">
        PROFIL PHOTO - PUBLIC
      </div>

      {/* Header profil */}
      <div className="px-5 py-5 flex items-start gap-5 flex-wrap">
        {/* Avatar gradient pink/orange (style stories) */}
        <div className="shrink-0">
          <div className="p-1 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-extrabold text-3xl">
              {m.displayName
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </div>

        {/* Identite + actions + stats */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-light text-gray-900 dark:text-gray-100">
              @{m.handle}
            </span>
            <button
              type="button"
              className="px-3 py-1 rounded-md bg-sky-500 text-white text-xs font-bold"
              aria-disabled="true"
            >
              Suivre
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs font-bold"
              aria-disabled="true"
            >
              Message
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 mt-3 text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-gray-100">
                {formatStat(m.posts)}
              </strong>{" "}
              publications
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-gray-100">
                {formatStat(m.followers)}
              </strong>{" "}
              abonnés
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-gray-100">
                {formatStat(m.following)}
              </strong>{" "}
              abonnements
            </span>
          </div>

          {/* Nom + bio */}
          <div className="mt-3 text-sm">
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {m.displayName}
            </p>
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mt-1">
              {m.bio}
            </p>
            {m.website && (
              <p className="text-sky-600 dark:text-sky-400 mt-1 break-all">
                🔗 {m.website}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid 3x3 */}
      <div className="border-t border-gray-200 dark:border-slate-700">
        <ul className="grid grid-cols-3 gap-0.5 bg-gray-200 dark:bg-slate-700">
          {m.grid.map((post) => (
            <li
              key={post.id}
              className="relative aspect-square bg-gradient-to-br from-amber-50 via-pink-50 to-purple-100 dark:from-amber-950 dark:via-pink-950 dark:to-purple-950 flex flex-col items-center justify-center text-5xl sm:text-6xl overflow-hidden"
              title={post.caption ?? ""}
            >
              <span aria-hidden="true">{post.photoEmoji}</span>
              {post.location && (
                <span className="absolute bottom-1 left-1 right-1 text-[9px] sm:text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded text-center font-medium truncate">
                  📍 {post.location}
                </span>
              )}
              {post.caption && !post.location && (
                <span className="absolute bottom-1 left-1 right-1 text-[9px] sm:text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded text-center font-medium truncate">
                  {post.caption}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
