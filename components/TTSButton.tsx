"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Bouton de narration audio. Bascule automatique entre 2 moteurs :
//  1. TTS premium serveur (POST /api/tts/synthesize → MP3 streaming) si dispo
//     ET si le tenant a le plan requis (Pro+ par defaut).
//  2. Fallback Web Speech API navigateur : gratuit, hors-ligne, RGPD-friendly.
//
// La detection du moteur disponible se fait au mount via un HEAD vers
// /api/tts/synthesize (pas de payload). Si 401/402/503 → fallback natif.
//
// Limitations navigateur traitées dans le mode natif :
//  1. getVoices() est asynchrone : on s'abonne a `voiceschanged` au mount
//  2. Chrome coupe les textes > ~250 chars : on chunke par phrase
//  3. Markdown brut lu littéralement : on nettoie avant
//  4. Vitesse/voix non persistees : localStorage
//  5. Aucun feedback de progression : on affiche "phrase X / Y"
//  6. Pas de selection manuelle de voix : menu "Voix" + "Vitesse"
//
// API publique inchangee : { text, className?, label? } pour preserver
// la compatibilite avec EpisodePlayer / Librairie / etc.

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  text: string;
  className?: string;
  label?: string;
};

const RATE_OPTIONS = [
  { v: 0.7, label: "0,7×" },
  { v: 0.85, label: "0,85×" },
  { v: 1, label: "1×" },
  { v: 1.15, label: "1,15×" },
  { v: 1.3, label: "1,3×" },
  { v: 1.5, label: "1,5×" },
];

const STORAGE_KEY = "humanix-tts-prefs";

type Prefs = {
  rate: number;
  voiceURI: string | null;
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { rate: 1, voiceURI: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rate: 1, voiceURI: null };
    const parsed = JSON.parse(raw);
    return {
      rate: typeof parsed.rate === "number" ? parsed.rate : 1,
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : null,
    };
  } catch {
    return { rate: 1, voiceURI: null };
  }
}

function savePrefs(prefs: Prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage indisponible (mode prive, quota) - silencieux
  }
}

/**
 * Nettoie le texte avant TTS :
 *  - supprime markdown courant (**, _, ##, [], (), backticks, blockquotes)
 *  - normalise les espaces
 *  - convertit les abreviations courantes pour une lecture naturelle
 *  - garde la ponctuation pour le rythme
 */
function cleanForTTS(raw: string): string {
  let t = raw;

  // Markdown headings, listes, blockquotes
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/^\s*[-*+]\s+/gm, "");
  t = t.replace(/^\s*\d+\.\s+/gm, "");
  t = t.replace(/^\s*>\s?/gm, "");

  // Markdown gras / italique / code inline
  t = t.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
  t = t.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");

  // Liens [texte](url) -> texte
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/<https?:[^>]+>/g, "");

  // HTML simple
  t = t.replace(/<[^>]+>/g, " ");

  // Abreviations courantes francaises pour une lecture plus naturelle
  const abbr: [RegExp, string][] = [
    [/\bex\.?\s*:/gi, "par exemple,"],
    [/\bcf\.?\s*:?/gi, "voir,"],
    [/\bp\.\s*ex\.?/gi, "par exemple"],
    [/\betc\.\b/gi, "et cetera"],
    [/\bRGPD\b/g, "ar-jé-pé-dé"],
    [/\bRSSI\b/g, "èr-èss-èss-i"],
    [/\bMFA\b/g, "èm-èf-a"],
    [/\bIA\b/g, "i-a"],
    [/\bPME\b/g, "pé-èm-eu"],
    [/\bTPE\b/g, "té-pé-eu"],
    [/\bVPN\b/g, "vé-pé-èn"],
    [/\bSI\b/g, "èss-i"],
    [/\bNIS2\b/g, "nis 2"],
    [/\bPDG\b/g, "pé-dé-jé"],
    [/\bKPI\b/g, "ka-pé-i"],
    [/\bROI\b/g, "èr-o-i"],
    [/\bBYOD\b/g, "bi-waïe-o-di"],
    [/\bSOC\b/g, "sok"],
  ];
  for (const [re, sub] of abbr) t = t.replace(re, sub);

  // Espaces multiples
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/**
 * Decoupe en phrases de longueur raisonnable pour Chrome (< 200 chars de
 * marge). On respecte les fins de phrase ?!.; et on coupe au mot suivant
 * si la phrase est trop longue.
 */
function splitForTTS(text: string, maxLen = 200): string[] {
  if (text.length <= maxLen) return [text];

  // Premier passage : split par ponctuation forte
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const s of sentences) {
    if (s.length <= maxLen) {
      chunks.push(s);
      continue;
    }
    // Phrase trop longue : split par virgule, sinon par mots
    let remaining = s;
    while (remaining.length > maxLen) {
      // Essaye une virgule avant la limite
      const lastComma = remaining.lastIndexOf(",", maxLen);
      const splitAt =
        lastComma > maxLen / 2
          ? lastComma + 1
          : remaining.lastIndexOf(" ", maxLen);
      const chunk = remaining.slice(0, splitAt).trim();
      if (!chunk) break;
      chunks.push(chunk);
      remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) chunks.push(remaining);
  }
  return chunks;
}

export default function TTSButton({
  text,
  className,
  label = "Écouter",
}: Props) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ rate: 1, voiceURI: null });
  // Mode serveur premium : detecte au mount via un POST sonde
  const [serverTtsAvailable, setServerTtsAvailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const playingRef = useRef(false); // miroir synchrone (sans re-render)

  // Mount : detecter support, charger voix, charger prefs, sonder TTS serveur
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    } else {
      setSupported(true);
      setPrefs(loadPrefs());

      const refreshVoices = () => {
        const list = window.speechSynthesis.getVoices();
        if (list.length) setVoices(list);
      };
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }

    // Sonde TTS serveur : route GET légère (pas d'audit log, pas d'appel
    // au service TTS - juste auth + plan check). Si available=true, on
    // bascule automatiquement le bouton vers le mode premium serveur.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tts/status");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { available?: boolean };
          if (data.available) setServerTtsAvailable(true);
        }
      } catch {
        // Erreur réseau → fallback natif silencieux
      }
    })();

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      playingRef.current = false;
    };
  }, []);

  // Texte nettoye (memoise pour éviter de recalculer a chaque render)
  const cleanText = useMemo(() => cleanForTTS(text), [text]);
  const chunks = useMemo(() => splitForTTS(cleanText), [cleanText]);

  // Voix FR disponibles (premium ranked en haut)
  const frVoices = useMemo(() => {
    return voices
      .filter((v) => v.lang.startsWith("fr"))
      .sort((a, b) => {
        // Voix "naturelles" / neuronales / premium en haut
        const score = (v: SpeechSynthesisVoice) =>
          /Google|Microsoft|Amelie|Thomas|Audrey|Hortense|Paul|Cellia|Premium|Enhanced|Neural/i.test(
            v.name,
          )
            ? 1
            : 0;
        return score(b) - score(a);
      });
  }, [voices]);

  // Persistence des prefs
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const pickVoice = (): SpeechSynthesisVoice | null => {
    if (prefs.voiceURI) {
      const found = voices.find((v) => v.voiceURI === prefs.voiceURI);
      if (found) return found;
    }
    return frVoices[0] ?? null;
  };

  // Joue le chunk N. Quand termine, enchaine sur N+1.
  const playChunkAt = (index: number) => {
    if (!chunksRef.current[index]) {
      // Plus rien a lire
      stop();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunksRef.current[index]);
    u.lang = "fr-FR";
    u.rate = prefs.rate;
    u.pitch = 1;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onstart = () => {
      setPlaying(true);
      setChunkIndex(index);
    };
    u.onend = () => {
      // Chrome appelle onend aussi sur cancel : on filtre
      if (!playingRef.current) return;
      playChunkAt(index + 1);
    };
    u.onerror = () => {
      stop();
    };
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  };

  /**
   * Mode premium serveur : on demande le MP3 entier au serveur, on stream
   * via <audio>. La vitesse est gerée nativement via audio.playbackRate.
   */
  const onPlayServer = async () => {
    playingRef.current = true;
    setPlaying(true);
    try {
      // On envoie le texte BRUT (pas cleanText) : le serveur applique sa
      // propre sanitisation canonique (sanitizeForTTS) avant de hasher pour
      // le cache. Ca garantit que le hash batch == hash runtime des qu'on
      // part du même texte source MDX -- sans dependre de quelles regex de
      // nettoyage cleanForTTS applique cote client (abreviations, etc.).
      const res = await fetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, format: "mp3" }),
      });
      if (!res.ok) throw new Error(`tts_${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = prefs.rate;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        playingRef.current = false;
        setPlaying(false);
        setPaused(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        stop();
      };
      audioRef.current = audio;
      await audio.play();
    } catch (e) {
      // Echec serveur (timeout, plan expire, etc.) -> fallback natif
      console.warn("[TTS] server fallback to native:", e);
      setServerTtsAvailable(false);
      onPlayNative();
    }
  };

  const onPlayNative = () => {
    if (!supported) return;
    chunksRef.current = chunks;
    playingRef.current = true;
    window.speechSynthesis.cancel();
    playChunkAt(0);
  };

  const onPlay = () => {
    if (serverTtsAvailable) {
      onPlayServer();
    } else {
      onPlayNative();
    }
  };

  const onPause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    setPaused(true);
  };
  const onResume = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => stop());
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
    setPaused(false);
  };
  const stop = () => {
    playingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setPaused(false);
    setChunkIndex(0);
  };

  // Si on change de vitesse pendant la lecture : applique en live
  const onChangeRate = (rate: number) => {
    setPrefs((p) => ({ ...p, rate }));
    if (audioRef.current) {
      // Mode serveur : on peut changer le rate sans relancer
      audioRef.current.playbackRate = rate;
      return;
    }
    if (playing) {
      const idx = chunkIndex;
      window.speechSynthesis.cancel();
      // Petit delai pour laisser cancel s'appliquer
      setTimeout(() => {
        if (playingRef.current) playChunkAt(idx);
      }, 50);
    }
  };

  const onChangeVoice = (voiceURI: string | null) => {
    setPrefs((p) => ({ ...p, voiceURI }));
    if (playing) {
      const idx = chunkIndex;
      window.speechSynthesis.cancel();
      setTimeout(() => {
        if (playingRef.current) playChunkAt(idx);
      }, 50);
    }
  };

  if (!supported) {
    return (
      <button
        disabled
        title="Lecture audio non supportée par ce navigateur"
        className={`inline-flex items-center gap-1.5 text-xs text-gray-400 px-3 py-1.5 rounded-xl bg-gray-100 ${className ?? ""}`}
      >
        🔇 TTS indisponible
      </button>
    );
  }

  // ETAT 1 : pas de lecture en cours -> bouton Écouter + reglages
  if (!playing) {
    return (
      <div
        className={`relative inline-flex items-center gap-1 ${className ?? ""}`}
      >
        <button
          onClick={onPlay}
          aria-label={
            serverTtsAvailable
              ? "Lire ce texte à voix haute (voix premium)"
              : "Lire ce texte à voix haute"
          }
          aria-pressed={false}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-500 hover:text-accent-600 px-3 py-1.5 rounded-xl bg-accent-50 hover:bg-accent-100 transition"
        >
          <span aria-hidden="true">🔊</span> {label}
          {serverTtsAvailable && (
            <span
              className="text-[9px] uppercase tracking-wide font-bold bg-amber-200 text-amber-800 px-1 py-0.5 rounded"
              title="Voix neuronale premium servie depuis votre infrastructure"
            >
              HD
            </span>
          )}
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          aria-label="Réglages de lecture audio"
          aria-expanded={showSettings}
          className="text-xs px-2 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          title="Réglages voix / vitesse"
        >
          ⚙
        </button>
        {showSettings && (
          <SettingsPanel
            prefs={prefs}
            voices={frVoices}
            onChangeRate={onChangeRate}
            onChangeVoice={onChangeVoice}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    );
  }

  // ETAT 2 : lecture en cours -> controles
  const totalChunks = chunks.length;
  return (
    <div
      className={`relative inline-flex items-center gap-1 flex-wrap ${className ?? ""}`}
      role="group"
      aria-label="Contrôles de lecture audio"
    >
      {paused ? (
        <button
          onClick={onResume}
          aria-label="Reprendre la lecture audio"
          className="text-xs px-2.5 py-1.5 rounded-xl bg-accent-500 text-white hover:bg-accent-600"
        >
          <span aria-hidden="true">▶</span> Reprendre
        </button>
      ) : (
        <button
          onClick={onPause}
          aria-label="Mettre en pause la lecture audio"
          className="text-xs px-2.5 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
        >
          <span aria-hidden="true">⏸</span> Pause
        </button>
      )}
      <button
        onClick={stop}
        aria-label="Arrêter la lecture audio"
        className="text-xs px-2.5 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        <span aria-hidden="true">⏹</span>
      </button>
      <button
        onClick={() => setShowSettings((s) => !s)}
        aria-label="Réglages de lecture audio"
        aria-expanded={showSettings}
        className="text-xs px-2 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        ⚙
      </button>
      {totalChunks > 1 && (
        <span
          className="text-[10px] text-accent-500 ml-1 tabular-nums"
          aria-live="polite"
          aria-label={`Phrase ${chunkIndex + 1} sur ${totalChunks}`}
        >
          {chunkIndex + 1}/{totalChunks}
        </span>
      )}
      {showSettings && (
        <SettingsPanel
          prefs={prefs}
          voices={frVoices}
          onChangeRate={onChangeRate}
          onChangeVoice={onChangeVoice}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsPanel({
  prefs,
  voices,
  onChangeRate,
  onChangeVoice,
  onClose,
}: {
  prefs: Prefs;
  voices: SpeechSynthesisVoice[];
  onChangeRate: (r: number) => void;
  onChangeVoice: (v: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Réglages de lecture audio"
      className="absolute top-full left-0 z-30 mt-2 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 text-xs space-y-3 min-w-[220px]"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div>
        <label
          htmlFor="tts-rate"
          className="block font-bold uppercase tracking-wide text-gray-500 mb-1"
        >
          Vitesse
        </label>
        <div className="flex flex-wrap gap-1" id="tts-rate" role="radiogroup">
          {RATE_OPTIONS.map((r) => (
            <button
              key={r.v}
              onClick={() => onChangeRate(r.v)}
              role="radio"
              aria-checked={prefs.rate === r.v}
              className={`px-2 py-1 rounded-lg ${
                prefs.rate === r.v
                  ? "bg-accent-500 text-white font-bold"
                  : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {voices.length > 1 && (
        <div>
          <label
            htmlFor="tts-voice"
            className="block font-bold uppercase tracking-wide text-gray-500 mb-1"
          >
            Voix
          </label>
          <select
            id="tts-voice"
            value={prefs.voiceURI ?? ""}
            onChange={(e) => onChangeVoice(e.target.value || null)}
            className="w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">Auto (meilleure voix française)</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-primary-500"
          aria-label="Fermer les réglages"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
