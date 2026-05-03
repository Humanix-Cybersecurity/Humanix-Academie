"use client";

// Saisie d'un emoji libre pour personnaliser sa mascotte au-dela des
// 16 especes pre-definies. UX : preview en direct + bouton "effacer".

import { useState, useTransition } from "react";
import { setCustomMascotEmoji } from "@/app/profil/mascotte/actions";
import { getMascotById } from "@/lib/mascots";

const SUGGESTED_EMOJIS = [
  "🚀", "🌈", "☕", "🌵", "🍕", "🎸", "🎮", "🎨",
  "📚", "🌻", "🪐", "🎯", "🔥", "💡", "✨", "🌊",
  "🎪", "🚲", "🌮", "👻", "🤖", "🦋", "🍀", "🌟",
];

export default function CustomEmojiPicker({
  currentEmoji,
  fallbackSpecies,
}: {
  currentEmoji: string | null;
  fallbackSpecies: string;
}) {
  const [value, setValue] = useState<string>(currentEmoji ?? "");
  const [pending, startTransition] = useTransition();
  const fallback = getMascotById(fallbackSpecies).emoji;
  const preview = value.trim().length > 0 ? value.trim() : fallback;

  function persist(next: string | null) {
    startTransition(async () => {
      try {
        await setCustomMascotEmoji(next);
      } catch (e: any) {
        alert(`Erreur : ${e?.message ?? "inconnue"}`);
      }
    });
  }

  return (
    <div className="card flex flex-col sm:flex-row items-center gap-6">
      {/* Preview */}
      <div className="text-center shrink-0">
        <div
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-50 to-accent-50 ring-4 ring-accent-200 flex items-center justify-center text-5xl"
          aria-live="polite"
          aria-label={`Aperçu actuel : ${preview}`}
        >
          {preview}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-2">
          {value.trim().length > 0 ? "Custom" : "Espèce"}
        </p>
      </div>

      {/* Saisie + suggestions */}
      <div className="flex-1 w-full">
        <label
          htmlFor="custom-emoji-input"
          className="block text-xs font-bold uppercase text-gray-500 mb-1"
        >
          Votre emoji
        </label>
        <div className="flex gap-2 mb-3">
          <input
            id="custom-emoji-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 8))}
            placeholder="Ex : 🚀, 🌈, ☕…"
            maxLength={8}
            className="input flex-1 text-2xl text-center font-mono"
            aria-describedby="custom-emoji-help"
          />
          <button
            onClick={() => persist(value || null)}
            disabled={pending}
            className="btn-primary text-sm whitespace-nowrap"
          >
            {pending ? "…" : "Enregistrer"}
          </button>
          {currentEmoji && (
            <button
              onClick={() => {
                setValue("");
                persist(null);
              }}
              disabled={pending}
              className="btn-secondary text-sm whitespace-nowrap"
              aria-label="Effacer l'emoji custom et revenir à l'espèce"
            >
              ✕ Effacer
            </button>
          )}
        </div>
        <p id="custom-emoji-help" className="text-xs text-gray-500 mb-3">
          Tapez ou collez n'importe quel emoji (max 8 caractères pour les
          emojis composites). Laisser vide pour revenir à l'animal totem.
        </p>

        <div>
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">
            Inspiration
          </p>
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setValue(e)}
                className="text-2xl p-1.5 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-900/30 transition"
                aria-label={`Choisir ${e}`}
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
