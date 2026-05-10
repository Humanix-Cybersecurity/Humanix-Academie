// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget : 6 compteurs RGPD (acces / exports / erasures / consents)
// sur la fenetre 90 jours.

type Tone = "info" | "success" | "warning";

const TONE_CLASS: Record<Tone, string> = {
  info: "border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20",
  success:
    "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20",
  warning:
    "border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20",
};

export type ComplianceCounts = {
  DATA_ACCESSED?: number;
  DATA_EXPORTED?: number;
  DATA_ERASURE_REQUESTED?: number;
  DATA_ERASURE_COMPLETED?: number;
  CONSENT_GIVEN?: number;
  CONSENT_WITHDRAWN?: number;
};

const ITEMS: Array<{
  key: keyof ComplianceCounts;
  emoji: string;
  label: string;
  tone: Tone;
}> = [
  { key: "DATA_ACCESSED", emoji: "👁", label: "Acces aux données", tone: "info" },
  { key: "DATA_EXPORTED", emoji: "📤", label: "Exports (article 20)", tone: "info" },
  { key: "DATA_ERASURE_REQUESTED", emoji: "🗑", label: "Effacements demandes", tone: "warning" },
  { key: "DATA_ERASURE_COMPLETED", emoji: "✅", label: "Effacements termines", tone: "success" },
  { key: "CONSENT_GIVEN", emoji: "✓", label: "Consentements donnes", tone: "success" },
  { key: "CONSENT_WITHDRAWN", emoji: "✗", label: "Consentements retires", tone: "warning" },
];

export default function ComplianceCounters({
  counts,
}: {
  counts: ComplianceCounts;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {ITEMS.map((item) => (
        <article
          key={item.key}
          className={`rounded-2xl border ${TONE_CLASS[item.tone]} p-4 text-center transition-all hover:scale-[1.02]`}
        >
          <div className="text-2xl mb-1" aria-hidden="true">
            {item.emoji}
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
            {counts[item.key] ?? 0}
          </p>
          <p className="text-[10px] uppercase tracking-widest font-medium text-gray-600 dark:text-gray-400 mt-1">
            {item.label}
          </p>
        </article>
      ))}
    </div>
  );
}
