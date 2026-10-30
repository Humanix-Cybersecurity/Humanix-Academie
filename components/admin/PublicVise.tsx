"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Selecteur du public vise d'une saison : « Tout l'espace » ou une liste de
// groupes auxquels elle est PRESCRITE (mise en avant, et obligatoire pour
// eux seulement si la saison est obligatoire). Elle reste consultable par
// tout le monde : cf. lib/catalogue/prescription.ts.
//
// Composant volontairement sans dependance : un bouton qui ouvre un panneau
// de cases a cocher, fermeture au clic exterieur et a Echap. L'appelant
// enregistre (action serveur) et garde l'etat ; ici on ne fait qu'afficher
// et proposer.

import { useEffect, useRef, useState } from "react";

export type GroupeOption = {
  id: string;
  name: string;
  emoji: string;
};

export default function PublicVise({
  groupes,
  selection,
  onChange,
  disabled,
  compact,
  libelleBouton,
}: {
  /** Groupes actifs de l'espace. */
  groupes: GroupeOption[];
  /** Ids des groupes auxquels la saison est prescrite (vide = tout l'espace). */
  selection: string[];
  onChange: (groupIds: string[]) => void;
  disabled?: boolean;
  /** Affichage resume sur une ligne (liste des modules). */
  compact?: boolean;
  /** Remplace le libelle du bouton (action en lot : la selection n'est pas affichee). */
  libelleBouton?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [brouillon, setBrouillon] = useState<Set<string>>(new Set(selection));
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  const parId = new Map(groupes.map((g) => [g.id, g]));
  const retenus = selection
    .map((id) => parId.get(id))
    .filter((g): g is GroupeOption => g !== undefined);
  const toutLEspace = retenus.length === 0;

  const basculer = (id: string) => {
    setBrouillon((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  // Le brouillon repart de la selection enregistree a chaque ouverture :
  // on l'initialise ici, au clic, et non dans un effet.
  const ouvrir = () => {
    setBrouillon(new Set(selection));
    setOuvert(true);
  };

  const valider = () => {
    onChange(Array.from(brouillon));
    setOuvert(false);
  };

  const libelle = toutLEspace
    ? "Tout l'espace"
    : compact && retenus.length > 2
      ? `${retenus[0].emoji} ${retenus[0].name} + ${retenus.length - 1}`
      : retenus.map((g) => `${g.emoji} ${g.name}`).join(", ");

  return (
    <div ref={racine} className="relative">
      <button
        type="button"
        onClick={() => !disabled && (ouvert ? setOuvert(false) : ouvrir())}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={ouvert}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
          toutLEspace
            ? "border-gray-300 text-gray-600 hover:border-accent-500 dark:border-slate-600 dark:text-gray-300"
            : "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-200"
        }`}
        title="Pour qui cette saison est prescrite"
      >
        {libelleBouton ? (
          <span>{libelleBouton}</span>
        ) : (
          <>
            <span aria-hidden="true">{toutLEspace ? "👥" : "🎯"}</span>
            <span className="truncate max-w-[14rem]">{libelle}</span>
          </>
        )}
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Public visé"
          className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="mb-2 text-[11px] uppercase tracking-widest font-bold text-accent-500">
            Pour qui
          </p>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Prescrite aux groupes cochés : mise en avant pour eux, obligatoire
            pour eux seulement. Les autres peuvent toujours la consulter. Aucun
            groupe coché = tout l'espace.
          </p>
          {groupes.length === 0 ? (
            <p className="text-xs italic text-gray-500">
              Aucun groupe actif dans l'espace.
            </p>
          ) : (
            <ul className="max-h-52 space-y-1 overflow-y-auto">
              {groupes.map((g) => (
                <li key={g.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={brouillon.has(g.id)}
                      onChange={() => basculer(g.id)}
                      className="h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                    />
                    <span aria-hidden="true">{g.emoji}</span>
                    <span className="truncate">{g.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setBrouillon(new Set())}
              className="text-xs text-gray-500 hover:underline"
            >
              Tout l'espace
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="rounded-lg px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={valider}
                className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-bold text-white hover:bg-accent-600"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
