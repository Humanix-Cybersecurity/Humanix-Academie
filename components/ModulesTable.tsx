"use client";

import { useTransition, useState } from "react";
import {
  toggleSaisonActive,
  toggleSaisonMandatory,
  moveSaison,
  resetSaisonsOrder,
} from "@/app/admin/actions";

type Saison = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverEmoji: string;
  baseOrder: number;
  episodesCount: number;
  isActive: boolean;
  isMandatory: boolean;
  customOrder: number | null;
};

export default function ModulesTable({ saisons }: { saisons: Saison[] }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const onToggleActive = (id: string, isActive: boolean) => {
    setBusy(id);
    startTransition(async () => {
      await toggleSaisonActive(id, isActive);
      setBusy(null);
    });
  };
  const onToggleMandatory = (id: string, isMandatory: boolean) => {
    setBusy(id);
    startTransition(async () => {
      await toggleSaisonMandatory(id, isMandatory);
      setBusy(null);
    });
  };
  const onMove = (id: string, dir: "up" | "down") => {
    setBusy(id);
    startTransition(async () => {
      await moveSaison(id, dir);
      setBusy(null);
    });
  };
  const onReset = () => {
    if (!confirm("Réinitialiser l'ordre par défaut ?")) return;
    startTransition(async () => {
      await resetSaisonsOrder();
    });
  };

  return (
    <>
      <div className="space-y-3">
        {saisons.map((s, idx) => (
          <div
            key={s.id}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              s.isActive
                ? "border-gray-200 bg-white"
                : "border-gray-200 bg-gray-50 opacity-70"
            } ${busy === s.id ? "animate-pulse" : ""}`}
          >
            {/* Ordre + flèches */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => onMove(s.id, "up")}
                disabled={idx === 0 || pending}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                aria-label="Monter"
              >
                ▲
              </button>
              <span className="font-bold text-primary-500 text-sm tabular-nums">
                {idx + 1}
              </span>
              <button
                onClick={() => onMove(s.id, "down")}
                disabled={idx === saisons.length - 1 || pending}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                aria-label="Descendre"
              >
                ▼
              </button>
            </div>

            {/* Contenu module */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{s.coverEmoji}</span>
                <h3 className="font-bold text-primary-500 truncate">
                  {s.title}
                </h3>
                {s.isMandatory && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    OBLIGATOIRE
                  </span>
                )}
                {!s.isActive && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    INACTIF
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{s.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {s.episodesCount} épisode{s.episodesCount > 1 ? "s" : ""} ·{" "}
                {s.episodesCount * 6} min total
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2 items-end">
              <Toggle
                checked={s.isActive}
                onChange={(v) => onToggleActive(s.id, v)}
                label="Actif"
                disabled={pending}
              />
              <Toggle
                checked={s.isMandatory}
                onChange={(v) => onToggleMandatory(s.id, v)}
                label="Obligatoire"
                disabled={pending || !s.isActive}
                color="red"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-gray-500">
          {pending
            ? "Sauvegarde en cours…"
            : "✓ Toutes les modifications sont sauvegardées automatiquement"}
        </p>
        <button
          onClick={onReset}
          disabled={pending}
          className="text-gray-500 hover:text-primary-500 disabled:opacity-50"
        >
          Réinitialiser l'ordre par défaut
        </button>
      </div>
    </>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
  color = "accent",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  color?: "accent" | "red";
}) {
  const onColor = color === "red" ? "bg-red-500" : "bg-accent-500";
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <span
        className={`w-10 h-6 rounded-full transition-all relative ${
          checked ? onColor : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
