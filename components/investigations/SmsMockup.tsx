// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'un SMS recu sur smartphone. Look minimaliste type iMessage /
// Android Messages - pas d'image, juste des bulles.

import type { Media } from "@/lib/investigations/types";

type Props = {
  media: Extract<Media, { type: "sms-mockup" }>;
};

export default function SmsMockup({ media }: Props) {
  const m = media.data;
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-3xl border-2 border-gray-300 dark:border-slate-700 bg-gradient-to-b from-gray-100 to-white dark:from-slate-800 dark:to-slate-900 shadow-xl overflow-hidden">
        {/* Header smartphone */}
        <div className="bg-gray-200 dark:bg-slate-800 border-b border-gray-300 dark:border-slate-700 px-4 py-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {m.from}
          </p>
          {m.receivedAt && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {m.receivedAt}
            </p>
          )}
        </div>

        {/* Bulle SMS */}
        <div className="p-5 bg-gray-50 dark:bg-slate-900 min-h-[180px]">
          <div className="inline-block max-w-[85%] bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {m.body}
          </div>
        </div>

        {/* Footer faux clavier */}
        <div className="bg-gray-200 dark:bg-slate-800 border-t border-gray-300 dark:border-slate-700 px-4 py-3 flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-full h-7 border border-gray-300 dark:border-slate-700 px-3 flex items-center text-xs text-gray-400">
            Message…
          </div>
          <span aria-hidden="true">🎙️</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3 italic">
        SMS reçu sur ton smartphone
      </p>
    </div>
  );
}
