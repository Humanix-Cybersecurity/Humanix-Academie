"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Mini-bouton "Apercu audio" pour les cartes d'articles, modules, etc.
// -----------------------------------------------------------------------------
// Quand a t'en servir vs <TTSButton> :
//
//   <TTSButton text=... />          UI riche : play/pause/seek, vitesse,
//                                   selecteur de voix, fallback Web Speech.
//                                   Pour les pages de detail.
//
//   <AudioPreviewButton text=... /> Bouton compact qui joue un teaser et
//                                   se met en pause au prochain click ailleurs.
//                                   Pour les CARTES dans une grille de listing.
//
// Le mini-bouton stoppe automatiquement les autres lectures de la même page
// (useAudioPreviewContext optionnel a venir si on veut une orchestration
// globale ; pour l'instant chaque bouton gere son propre Audio element).

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Texte court a synthetiser (titre + description en general). */
  text: string;
  /** Voix Voxtral (defaut : fr_marie_neutral). */
  voice?: string;
  /** Label accessible — n'est pas affiche, sert uniquement aux lecteurs d'ecran. */
  ariaLabel?: string;
  /** Tag a propager (ex: "Apercu", "Ecouter") au survol. */
  hoverLabel?: string;
  /** Override de la classe pour s'integrer au design des cartes. */
  className?: string;
  /** Empeche le click de propager (utile dans une carte qui est aussi un Link). */
  stopPropagation?: boolean;
};

export default function AudioPreviewButton({
  text,
  voice,
  ariaLabel = "Apercu audio",
  hoverLabel = "Apercu",
  className = "",
  stopPropagation = true,
}: Props) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup audio + blob URL au demontage
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function onClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Toggle : si ca joue, pause + reset
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setState("idle");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voice, format: "mp3" }),
      });

      if (!res.ok) {
        // Plan trop bas, service off, etc. -- on fail silencieusement (pas de
        // teaser audio sur cette carte, le user peut toujours cliquer pour
        // ouvrir l'article et utiliser le TTSButton complet de la page detail).
        setState("error");
        setTimeout(() => setState("idle"), 1500);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
        objectUrlRef.current = null;
        audioRef.current = null;
      };
      audio.onerror = () => {
        setState("error");
        URL.revokeObjectURL(url);
        objectUrlRef.current = null;
        audioRef.current = null;
        setTimeout(() => setState("idle"), 1500);
      };

      await audio.play();
      setState("playing");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  }

  const baseClasses =
    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-400";
  const stateClasses =
    state === "playing"
      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 hover:bg-rose-200"
      : state === "loading"
        ? "bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-wait"
        : state === "error"
          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200"
          : "bg-white/80 dark:bg-slate-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/40 border border-rose-200/50 dark:border-rose-900/40";

  const icon =
    state === "playing"
      ? "⏸"
      : state === "loading"
        ? "⌛"
        : state === "error"
          ? "✕"
          : "🔊";

  const label =
    state === "playing"
      ? "Pause"
      : state === "loading"
        ? "..."
        : state === "error"
          ? "Indispo"
          : hoverLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={state === "playing"}
      className={`${baseClasses} ${stateClasses} ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
