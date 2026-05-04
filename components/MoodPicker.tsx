"use client";

// Selecteur d'humeur — grille de 6 boutons, persistance via server action.

import { useTransition } from "react";
import { chooseMood } from "@/app/profil/mascotte/actions";

const MOODS = [
  { id: "neutral", label: "Neutre", emoji: "😐", desc: "Calme et concentré·e" },
  { id: "happy", label: "Heureux", emoji: "😊", desc: "La forme !" },
  { id: "celebrate", label: "Célébration", emoji: "🎉", desc: "On a réussi" },
  { id: "curious", label: "Curieux", emoji: "🤔", desc: "On apprend" },
  { id: "thinking", label: "Réfléchi", emoji: "💭", desc: "On analyse" },
  { id: "sad", label: "Pensif", emoji: "😟", desc: "Pas le top" },
];

export default function MoodPicker({ currentMood }: { currentMood: string }) {
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    startTransition(async () => {
      try {
        await chooseMood(id);
      } catch (e: any) {
        // Notification simple ; on pourrait remplacer par un toast
        alert(`Erreur : ${e?.message ?? "inconnue"}`);
      }
    });
  }

  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-6 gap-3"
      role="radiogroup"
      aria-label="Humeur de la mascotte"
    >
      {MOODS.map((m) => {
        const active = m.id === currentMood;
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={active}
            onClick={() => pick(m.id)}
            disabled={pending}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
              active
                ? "border-accent-500 bg-accent-50 dark:bg-accent-900/30 shadow-md scale-[1.02]"
                : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent-300 hover:bg-accent-50/50"
            } ${pending ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
          >
            <span className="text-3xl" aria-hidden="true">
              {m.emoji}
            </span>
            <span className="text-xs font-bold text-primary-500">
              {m.label}
            </span>
            <span className="text-[10px] text-gray-500 text-center leading-tight">
              {m.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
