// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'un profil X (ex-Twitter). Look-and-feel distinct anti-
// trademark : on garde la structure (header bandeau + avatar +
// bio + posts) mais palette neutre et pas de logo.

import type { Media } from "@/lib/investigations/types";

type Props = {
  media: Extract<Media, { type: "x-profile-mockup" }>;
};

function formatStat(n: number | undefined): string {
  if (typeof n !== "number") return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function XProfileMockup({ media }: Props) {
  const m = media.data;
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
      {/* Header bandeau (decoratif) */}
      <div className="h-28 bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600" />

      {/* Avatar + actions */}
      <div className="relative px-5 pt-3 pb-4">
        <div className="absolute -top-12 left-5 w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-3xl shadow-md">
          {m.displayName
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold"
            aria-disabled="true"
          >
            S'abonner
          </button>
        </div>

        {/* Identite */}
        <div className="mt-2">
          <div className="flex items-center gap-1">
            <h2 className="font-extrabold text-xl text-gray-900 dark:text-gray-100">
              {m.displayName}
            </h2>
            {m.verified && (
              <span
                className="text-sky-500"
                aria-label="Compte vérifié"
                title="Compte vérifié"
              >
                ✔
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{m.handle}</p>
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-800 dark:text-gray-200 mt-3 whitespace-pre-wrap leading-relaxed">
          {m.bio}
        </p>

        {/* Meta : location + website + joinedDate */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400 mt-3">
          {m.location && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">📍</span>
              {m.location}
            </span>
          )}
          {m.website && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">🔗</span>
              <span className="text-sky-600 dark:text-sky-400">
                {m.website}
              </span>
            </span>
          )}
          {m.joinedDate && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">📅</span>
              Inscrit en {m.joinedDate}
            </span>
          )}
        </div>

        {/* Stats following / followers */}
        <div className="flex items-center gap-4 text-sm mt-3">
          <span className="text-gray-700 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-gray-100">
              {formatStat(m.following)}
            </strong>{" "}
            abonnements
          </span>
          <span className="text-gray-700 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-gray-100">
              {formatStat(m.followers)}
            </strong>{" "}
            abonnés
          </span>
        </div>
      </div>

      {/* Tabs decoratifs */}
      <div className="border-t border-gray-200 dark:border-slate-700 flex items-center justify-around text-sm font-medium text-gray-500 dark:text-gray-400">
        <span className="py-3 border-b-2 border-sky-500 text-gray-900 dark:text-gray-100 font-bold">
          Publications
        </span>
        <span className="py-3">Réponses</span>
        <span className="py-3">Photos</span>
        <span className="py-3">J'aime</span>
      </div>

      {/* Recent posts */}
      <div>
        {m.recentPosts.map((p, i) => (
          <article
            key={i}
            className="border-t border-gray-200 dark:border-slate-700 px-5 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50"
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
              {m.displayName
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1 flex-wrap text-xs">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {m.displayName}
                </span>
                {m.verified && (
                  <span className="text-sky-500" aria-hidden="true">
                    ✔
                  </span>
                )}
                <span className="text-gray-500 dark:text-gray-400">
                  @{m.handle}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {p.timeAgo}
                </span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap leading-relaxed">
                {p.text}
              </p>
              {p.photoEmoji && (
                <div className="mt-2 aspect-[16/10] rounded-xl bg-gradient-to-br from-sky-100 to-purple-100 dark:from-sky-950 dark:to-purple-950 flex items-center justify-center text-6xl">
                  {p.photoEmoji}
                </div>
              )}
              {p.location && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                  <span aria-hidden="true">📍</span>
                  {p.location}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
