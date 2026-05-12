"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Tableau admin des anecdotes avec actions : envoyer, supprimer, editer.

import Link from "next/link";
import { useState, useTransition } from "react";
import { dispatchNow, deleteAnecdote } from "@/app/admin/anecdotes/actions";

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string;
  isActive: boolean;
  publishedAt: string | null;
  scheduledFor: string | null;
  sentCount: number;
  incidentDate: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  RANSOMWARE: "🔒 Rançongiciel",
  PHISHING: "🎣 Phishing",
  FRAUDE: "💸 Fraude",
  DATA_LEAK: "📤 Fuite",
  SUPPLY_CHAIN: "🔗 Supply chain",
  HACKTIVISME: "🚩 Hacktivisme",
  IA_ABUS: "🤖 IA",
  AUTRE: "🛡 Cyber",
};

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AnecdoteAdminTable({
  anecdotes,
}: {
  anecdotes: Row[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDispatch = (id: string, title: string) => {
    if (
      !confirm(
        `Envoyer maintenant "${title}" à tous les abonnés actifs ?\n\nCette action ne peut pas être annulée.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await dispatchNow(id);
      setFeedback(
        res.ok
          ? `✅ Envoyée : ${res.sent} email(s) envoyé(s), ${res.simulated} simulé(s) (demo), ${res.errors} erreur(s).`
          : `⚠ ${res.reason}`,
      );
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement "${title}" ?`)) return;
    startTransition(async () => {
      await deleteAnecdote(id);
      setFeedback(`🗑 Supprimée : ${title}`);
    });
  };

  if (anecdotes.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        Aucune anecdote pour le moment.
      </p>
    );
  }

  return (
    <div>
      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm"
        >
          {feedback}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <caption className="sr-only">Anecdotes de la newsletter et leur statut</caption>
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
              <th scope="col" className="px-4 py-3">
                Titre
              </th>
              <th scope="col" className="px-4 py-3">
                Catégorie
              </th>
              <th scope="col" className="px-4 py-3">
                Incident
              </th>
              <th scope="col" className="px-4 py-3">
                Statut
              </th>
              <th scope="col" className="px-4 py-3">
                Envois
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {anecdotes.map((a) => {
              const isPublished = !!a.publishedAt;
              return (
                <tr
                  key={a.id}
                  className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                      {a.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <Link
                        href={`/anecdotes/${a.slug}`}
                        target="_blank"
                        className="hover:underline"
                      >
                        /anecdotes/{a.slug}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {CATEGORY_LABEL[a.category] ?? a.category}
                  </td>
                  <td className="px-4 py-3 text-xs">{fmt(a.incidentDate)}</td>
                  <td className="px-4 py-3 text-xs">
                    {!a.isActive ? (
                      <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">
                        désactivée
                      </span>
                    ) : isPublished ? (
                      <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        envoyée le {fmt(a.publishedAt)}
                      </span>
                    ) : a.scheduledFor ? (
                      <span className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                        programmée {fmt(a.scheduledFor)}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded">
                        brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{a.sentCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link
                        href={`/admin/anecdotes/${a.id}`}
                        className="text-xs px-2.5 py-1.5 rounded bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                      >
                        Éditer
                      </Link>
                      {!isPublished && a.isActive && (
                        <button
                          type="button"
                          onClick={() => handleDispatch(a.id, a.title)}
                          disabled={pending}
                          className="text-xs px-2.5 py-1.5 rounded bg-accent-500 hover:bg-accent-600 text-white disabled:opacity-50"
                        >
                          📨 Envoyer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id, a.title)}
                        disabled={pending}
                        className="text-xs px-2.5 py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 disabled:opacity-50"
                        aria-label={`Supprimer ${a.title}`}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
