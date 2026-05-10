"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form client pour lancer une campagne quishing (QR phishing physique).
// Pas d'envoi technique : le retour de l'action est l'URL du PDF a
// telecharger (1 affiche par destinataire avec QR unique).

import { useState, useTransition } from "react";
import clsx from "clsx";
import { launchQuishing } from "@/app/admin/quishing/actions";
import { QUISHING_TEMPLATES } from "@/lib/phishing/qr-code";

export type GroupOption = {
  slug: string;
  name: string;
  emoji: string;
  memberCount: number;
};

export default function LaunchQuishingForm({
  groups,
}: {
  groups: GroupOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<keyof typeof QUISHING_TEMPLATES>(
    "QR_FAKE_RH",
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
    posterUrl?: string;
    targets?: number;
  } | null>(null);

  const toggleGroup = (slug: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const onSubmit = async (formData: FormData) => {
    setFeedback(null);
    formData.set("template", selected);
    selectedGroups.forEach((slug) => formData.append("groupSlugs", slug));
    startTransition(async () => {
      try {
        const res = await launchQuishing(formData);
        if (!res.ok) {
          const map: Record<string, string> = {
            invalid_template: "Template invalide.",
            no_targets:
              "Aucune cible trouvée. Sélectionne au moins un groupe avec des membres actifs.",
            unauthorized: "Session expirée, reconnecte-toi.",
            forbidden: "Tu n'as pas les droits pour lancer une campagne.",
            unknown: "Erreur inconnue. Réessaye dans un moment.",
          };
          setFeedback({
            type: "err",
            msg: map[res.error] ?? res.message ?? "Lancement impossible.",
          });
          return;
        }
        setFeedback({
          type: "ok",
          msg: `🎉 Campagne lancée pour ${res.targets} cible${res.targets > 1 ? "s" : ""}. Télécharge ton PDF d'affiches ci-dessous.`,
          posterUrl: res.posterUrl,
          targets: res.targets,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue.";
        setFeedback({ type: "err", msg: `Erreur: ${msg}` });
      }
    });
  };

  const tpl = QUISHING_TEMPLATES[selected];
  const totalTargets =
    selectedGroups.size === 0
      ? null
      : groups
          .filter((g) => selectedGroups.has(g.slug))
          .reduce((s, g) => s + g.memberCount, 0);

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Template de quishing
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.values(QUISHING_TEMPLATES).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={clsx(
                "text-left p-4 rounded-xl border-2 transition-all",
                selected === t.id
                  ? "border-accent-500 bg-accent-50 dark:bg-accent-950/30 scale-[1.01]"
                  : "border-gray-200 dark:border-slate-700 hover:border-gray-300",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-bold text-primary-500 dark:text-accent-300 text-sm">
                  {t.name}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 leading-snug">
                {t.context}
              </p>
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                  t.difficulty <= 2
                    ? "bg-green-100 text-green-700"
                    : t.difficulty <= 3
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700",
                )}
              >
                Crédibilité {t.difficulty}/5
              </span>
            </button>
          ))}
        </div>
      </div>

      {tpl && (
        <details className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/40 rounded-xl p-3">
          <summary className="cursor-pointer font-medium">
            Aperçu du texte d&apos;affiche
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
            {tpl.posterCallout}
          </pre>
          <p className="mt-2 text-[11px] italic">
            Le QR code (unique par destinataire) sera placé sous ce texte.
          </p>
        </details>
      )}

      {/* Ciblage par groupes */}
      {groups.length > 0 ? (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Cibler des groupes métier
            <span className="ml-2 text-xs font-normal text-gray-500">
              (laisse vide = tous les collaborateurs actifs)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const active = selectedGroups.has(g.slug);
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => toggleGroup(g.slug)}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border-2 transition-all",
                    active
                      ? "bg-accent-500 border-accent-500 text-white"
                      : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-accent-300",
                  )}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{g.emoji}</span>
                  <span>{g.name}</span>
                  <span
                    className={clsx(
                      "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
                      active ? "bg-white/25" : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {g.memberCount}
                  </span>
                </button>
              );
            })}
          </div>
          {totalTargets !== null && (
            <p className="text-xs text-accent-700 dark:text-accent-300 mt-2 font-medium">
              👉 {totalTargets} affiche{totalTargets > 1 ? "s" : ""}{" "}
              générée{totalTargets > 1 ? "s" : ""} (1 par destinataire)
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">
          Aucun groupe métier configuré. La campagne ciblera tous les
          collaborateurs actifs.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Génération du PDF…" : "🔳 Générer les affiches"}
      </button>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm ${
            feedback.type === "ok"
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
          }`}
        >
          <p className="font-medium">{feedback.msg}</p>
          {feedback.posterUrl && (
            <p className="mt-3">
              <a
                href={feedback.posterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-4 py-2 rounded-lg text-xs"
              >
                📥 Télécharger le PDF d&apos;affiches ({feedback.targets}{" "}
                page{(feedback.targets ?? 0) > 1 ? "s" : ""})
              </a>
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center">
        Aucun envoi technique : tu reçois un PDF, tu imprimes, tu colles. Le
        QR code de chaque affiche est unique et trackable.
      </p>
    </form>
  );
}
