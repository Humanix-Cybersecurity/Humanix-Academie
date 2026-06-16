// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import type { Monde } from "@/lib/enfants/types";
import { COULEURS } from "@/lib/enfants/theme";
import HexDit from "./HexDit";
import KidsBD from "./KidsBD";
import KidsRepere from "./KidsRepere";
import KidsTri from "./KidsTri";
import KidsQuiz from "./KidsQuiz";
import KidsPaires from "./KidsPaires";

/** Petit arpège joyeux (do-mi-sol) via Web Audio. Aucun fichier son, aucun
 *  token. Best-effort : silencieux si le navigateur ne le permet pas. */
function playChime() {
  try {
    if (typeof window === "undefined" || !window.AudioContext) return;
    const ctx = new window.AudioContext();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* no-op */
      }
    }, 900);
  } catch {
    /* son indisponible : ce n'est pas grave */
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sauvegarde locale (jamais en base : enfants = aucune donnée serveur). */
function saveStars(slug: string, stars: number) {
  try {
    const key = `hex-ecole.${slug}`;
    const prev = JSON.parse(localStorage.getItem(key) || "{}");
    const best = Math.max(Number(prev.bestStars) || 0, stars);
    localStorage.setItem(key, JSON.stringify({ done: true, bestStars: best }));
  } catch {
    // localStorage indisponible (navigation privée…) : on ignore, c'est cosmétique.
  }
}

export default function KidsParcoursPlayer({ monde }: { monde: Monde }) {
  const theme = COULEURS[monde.couleur];
  const total = monde.activites.length;
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [fini, setFini] = useState(false);
  const [prenom, setPrenom] = useState("");

  function imprimerDiplome() {
    const nom = prenom.trim() || "Détective du Net";
    const etoiles = "⭐".repeat(stars) + "☆".repeat(Math.max(0, total - stars));
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Mon diplôme - L'école de Hex</title><style>
body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f9ff}
.d{width:760px;max-width:95vw;border:10px double #0ea5e9;border-radius:24px;padding:48px;text-align:center;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.08)}
.fox{font-size:64px}.kicker{text-transform:uppercase;letter-spacing:3px;color:#0ea5e9;font-weight:700;margin:4px 0}
h1{color:#0369a1;font-size:38px;margin:6px 0}
.nom{font-size:30px;font-weight:800;margin:18px 0;color:#0f172a;border-bottom:3px solid #f59e0b;display:inline-block;padding:0 24px 6px}
.et{font-size:34px;letter-spacing:8px;margin:14px 0}
p{font-size:18px;color:#334155}.pied{color:#64748b;font-size:13px;margin-top:24px}
@media print{body{background:#fff;min-height:auto}.d{box-shadow:none}}
</style></head><body><div class="d">
<div class="fox">🦊🎉</div>
<p class="kicker">L'école de Hex</p>
<h1>Diplôme de Détective du Net</h1>
<p>décerné à</p>
<div class="nom">${escapeHtml(nom)}</div>
<p>pour avoir terminé le monde<br><b>${escapeHtml(monde.titre)}</b></p>
<div class="et">${etoiles}</div>
<p class="pied">Bravo ! Tu connais les bons réflexes pour te protéger sur internet.</p>
</div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Autorise les fenêtres pop-up pour imprimer ton diplôme 🙂");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    // Impression pilotée par l'ouvrant (pas de script inline -> compatible CSP).
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* l'enfant peut imprimer via le menu du navigateur */
      }
    }, 300);
  }

  useEffect(() => {
    if (!fini) return;
    saveStars(monde.slug, stars);
    // Pluie de confettis + petit son pour fêter la fin 🎉
    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch {
      /* no-op */
    }
    playChime();
  }, [fini, monde.slug, stars]);

  function onDone(success: boolean) {
    const newStars = stars + (success ? 1 : 0);
    setStars(newStars);
    if (index >= total - 1) {
      setFini(true);
    } else {
      setIndex((n) => n + 1);
    }
  }

  function rejouer() {
    setIndex(0);
    setStars(0);
    setFini(false);
  }

  // --- Écran de fin ---
  if (fini) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center space-y-6">
        <div className="text-7xl" aria-hidden="true">
          🎉
        </div>
        <h1 className="font-display text-3xl font-extrabold text-gray-900 dark:text-white">
          Bravo, parcours terminé !
        </h1>
        <div
          className="text-4xl tracking-widest"
          aria-label={`Tu as gagné ${stars} étoile${stars > 1 ? "s" : ""} sur ${total}`}
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} aria-hidden="true">
              {i < stars ? "⭐" : "☆"}
            </span>
          ))}
        </div>
        <HexDit mood="celebrate" size="lg">
          {stars === total
            ? "Sans aucune faute ! Tu es un vrai détective du Net 🕵️"
            : "Super travail ! Tu connais déjà plein de réflexes malins."}
        </HexDit>

        {/* Diplôme à imprimer (prénom optionnel, jamais enregistré) */}
        <div className="rounded-3xl border-2 border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 text-left space-y-3">
          <p className="font-display text-lg font-extrabold text-amber-800 dark:text-amber-200 text-center">
            🎓 Ton diplôme de Détective du Net
          </p>
          <label
            htmlFor="prenom-diplome"
            className="block text-sm font-bold text-gray-600 dark:text-gray-300"
          >
            Ton prénom (facultatif)
          </label>
          <input
            id="prenom-diplome"
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value.slice(0, 30))}
            maxLength={30}
            autoComplete="off"
            placeholder="Ex : Léa"
            className="w-full rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-base"
          />
          <p className="text-xs text-gray-500">
            On ne garde pas ton prénom : il sert juste à écrire ton diplôme. 🔒
          </p>
          <button
            type="button"
            onClick={imprimerDiplome}
            className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold py-4 transition active:scale-95"
          >
            🖨️ Voir / imprimer mon diplôme
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={rejouer}
            className={`rounded-2xl ${theme.btn} text-white text-lg font-bold px-6 py-4 transition active:scale-95`}
          >
            🔁 Rejouer
          </button>
          <Link
            href="/famille/enfants"
            className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-bold px-6 py-4 transition active:scale-95"
          >
            🏡 Retour aux mondes
          </Link>
        </div>
      </div>
    );
  }

  const activite = monde.activites[index];

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${theme.grad} bg-fixed`}
    >
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Barre du haut : retour + progression */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/famille/enfants"
            className="text-white/90 hover:text-white text-sm font-bold bg-black/10 rounded-full px-3 py-1.5"
          >
            ✕ Quitter
          </Link>
          <div className="flex items-center gap-1.5" aria-label={`Étape ${index + 1} sur ${total}`}>
            {monde.activites.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i <= index ? "bg-white" : "bg-white/40"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Carte blanche qui contient l'activité courante */}
        <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur p-4 sm:p-6 shadow-xl">
          <h2 className="text-center text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
            {activite.titre}
          </h2>
          {activite.type === "bd" && (
            <KidsBD activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "repere" && (
            <KidsRepere activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "tri" && (
            <KidsTri activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "quiz" && (
            <KidsQuiz activite={activite} theme={theme} onDone={onDone} />
          )}
          {activite.type === "paires" && (
            <KidsPaires activite={activite} theme={theme} onDone={onDone} />
          )}
        </div>
      </div>
    </div>
  );
}
