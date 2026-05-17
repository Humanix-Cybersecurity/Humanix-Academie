"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form client pour telecharger le PDF d'affiche d'une campagne quishing.
//
// Particularite : l'admin peut (optionnel) joindre un logo entreprise
// qui sera affiche sur l'affiche imprimee. Le logo N'EST PAS STOCKE :
// il transite en multipart vers /api/admin/quishing/poster/[id] (POST),
// est lu en memoire pour generer le PDF, puis disparait.
//
// Si pas de logo : on POST sans fichier (l'affiche est generee sans
// logo, ce qui peut etre voulu — pas de logo Humanix par defaut).

import { useState } from "react";

export default function QuishingPosterDownloadForm({
  campaignId,
}: {
  campaignId: string;
}) {
  const [pending, setPending] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPdf = async () => {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      if (logoFile) fd.append("logo", logoFile);
      const res = await fetch(
        `/api/admin/quishing/poster/${campaignId}`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const messages: Record<string, string> = {
          logo_too_large:
            "Logo trop volumineux (max 2 MB). Compresse-le avant d'envoyer.",
          logo_invalid_mime: "Format non supporté. Utilise un PNG ou un JPEG.",
          logo_invalid_content:
            "Le fichier ne ressemble pas à une image valide.",
          campaign_not_found: "Campagne introuvable.",
          forbidden: "Tu n'as pas les droits pour cette action.",
          unauthorized: "Session expirée, reconnecte-toi.",
        };
        setError(messages[data.error] ?? "Échec du téléchargement.");
        return;
      }
      // Triggers download via blob URL
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1]
        ?? `humanix-quishing-${campaignId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // Reset apres succes (libere le logo en memoire client aussi)
      setLogoFile(null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Mode rapide : pas de logo, un seul clic */}
      {!open && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-lg border-2 border-accent-500 text-accent-700 dark:text-accent-300 hover:bg-accent-50 dark:hover:bg-accent-950/40 font-bold transition disabled:opacity-50"
          >
            {pending ? "Génération…" : "📥 Télécharger PDF"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            title="Ajouter un logo entreprise sur l'affiche"
          >
            + logo
          </button>
        </div>
      )}

      {/* Mode logo : input file + actions */}
      {open && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-3 max-w-sm">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
            Logo entreprise (optionnel)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            disabled={pending}
            className="block w-full text-xs text-gray-700 dark:text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white hover:file:bg-accent-600 file:cursor-pointer cursor-pointer"
          />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 italic">
            PNG ou JPEG, max 2 MB. Non stocké — utilisé uniquement pour ce
            PDF.
          </p>
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setLogoFile(null);
                setError(null);
              }}
              disabled={pending}
              className="text-xs px-2.5 py-1 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pending}
              className="text-xs px-3 py-1 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-bold transition disabled:opacity-50"
            >
              {pending ? "Génération…" : "Télécharger"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 italic max-w-xs text-right">
          {error}
        </p>
      )}
    </div>
  );
}
