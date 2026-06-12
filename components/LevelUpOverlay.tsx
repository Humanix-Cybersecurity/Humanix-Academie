// SPDX-License-Identifier: AGPL-3.0-or-later
// Overlay plein ecran qui apparait quand un episode debloque un nouveau niveau.
// Accessible : focus trap (via AccessibleDialog), ESC pour fermer, retour focus,
// confettis désactivés si prefers-reduced-motion, annonce lecteur d'écran.
"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { LEVELS } from "@/lib/levels";
import HexMascotEvolved from "@/components/HexMascotEvolved";
import AccessibleDialog from "@/components/a11y/AccessibleDialog";
import LiveRegion from "@/components/a11y/LiveRegion";
import { usePrefersReducedMotion } from "@/lib/a11y";

export default function LevelUpOverlay({
  newLevelId,
  onClose,
  species = "fox",
}: {
  newLevelId: number;
  onClose: () => void;
  species?: string;
}) {
  const level = LEVELS.find((l) => l.id === newLevelId) ?? LEVELS[0];
  const reduced = usePrefersReducedMotion();
  const announceRef = useRef<string | null>(null);

  useEffect(() => {
    // Annonce vocale au lecteur d'ecran (independant de l'animation visuelle)
    announceRef.current = `Niveau ${level.id} débloqué : ${level.name}. ${level.description}`;

    // Confettis : seulement si l'utilisateur n'a pas demande reduced motion
    if (reduced) return;
    const colors = ["#00A3A1", "#0B3D91", "#FFD700", "#FF69B4", "#9B59B6"];
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 270,
        spread: 100,
        origin: { y: 0.1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [reduced, level]);

  return (
    <>
      <LiveRegion message={announceRef.current} politeness="polite" />
      <AccessibleDialog
        open
        onClose={onClose}
        title={`Niveau ${level.id} débloqué : ${level.name}`}
        description={level.description}
        backdropClassName="animate-fadeIn"
        // Style backdrop appliqué via inline style car classes Tailwind dynamiques limitées
      >
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: "rgba(11, 61, 145, 0.85)",
            backdropFilter: "blur(8px)",
          }}
          aria-hidden="true"
        />
        <div
          className={`relative max-w-lg w-full rounded-3xl p-10 text-center bg-gradient-to-br ${level.bgGradient} border-4 ${level.ringColor.replace("ring-", "border-")} shadow-2xl ${reduced ? "" : "animate-bounce-once"}`}
        >
          <p
            className="text-xs uppercase tracking-widest text-gray-600 font-bold mb-2"
            aria-hidden="true"
          >
            ✨ Niveau débloqué ! ✨
          </p>
          <h1 className="text-5xl font-extrabold text-primary-500 mb-1">
            Niveau {level.id}
          </h1>
          <h2 className="text-2xl font-bold text-accent-500 mb-6">
            {level.name}
          </h2>

          <div className="flex justify-center mb-6">
            <HexMascotEvolved
              level={level}
              size="hero"
              mood="celebrate"
              animated={!reduced}
              species={species}
            />
          </div>

          <p className="text-gray-700 italic mb-8 text-lg">
            "{level.description}"
          </p>

          <div className="bg-white/70 rounded-2xl p-4 mb-6">
            <p className="text-sm font-bold text-primary-500 mb-2">
              🎁 Tu débloques
            </p>
            <div className="grid grid-cols-2 gap-3 text-left text-sm">
              {/*
                Bonus par palier - etend a 10 niveaux (refonte mai 2026).
                Chaque palier debloque cosmetique + coins, plus genereux a mesure
                qu'on monte (le grind devient plus long, la recompense suit).
              */}
              {level.id < 2 && (
                <>
                  <Bonus icon="🎯" label="Mascotte de base" />
                  <Bonus icon="🪙" label="Système de coins activé" />
                </>
              )}
              {level.id === 2 && (
                <>
                  <Bonus icon="✨" label="Mascotte qui scintille" />
                  <Bonus icon="🛒" label="Premiers items boutique" />
                </>
              )}
              {level.id === 3 && (
                <>
                  <Bonus icon="🔍" label="Mascotte Initié" />
                  <Bonus icon="🪙" label="+10 coins offerts" />
                </>
              )}
              {level.id === 4 && (
                <>
                  <Bonus icon="🛡️" label="Bouclier sur ta mascotte" />
                  <Bonus icon="🪙" label="+15 coins offerts" />
                </>
              )}
              {level.id === 5 && (
                <>
                  <Bonus icon="⚡" label="Aura Gardien" />
                  <Bonus icon="🪙" label="+25 coins offerts" />
                </>
              )}
              {level.id === 6 && (
                <>
                  <Bonus icon="⚔️" label="Épée Sentinelle" />
                  <Bonus icon="🪙" label="+40 coins offerts" />
                </>
              )}
              {level.id === 7 && (
                <>
                  <Bonus icon="👁️" label="Œil du Veilleur" />
                  <Bonus icon="🪙" label="+60 coins offerts" />
                </>
              )}
              {level.id === 8 && (
                <>
                  <Bonus icon="🎓" label="Toge d'Expert" />
                  <Bonus icon="🪙" label="+100 coins offerts" />
                </>
              )}
              {level.id === 9 && (
                <>
                  <Bonus icon="👑" label="Couronne de Champion" />
                  <Bonus icon="🪙" label="+150 coins offerts" />
                </>
              )}
              {level.id === 10 && (
                <>
                  <Bonus icon="🏆" label="Statut Maître Cyber" />
                  <Bonus icon="🪙" label="+250 coins offerts" />
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-primary w-full text-lg"
            autoFocus
          >
            Continuer mon aventure →
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Astuce : appuie sur Échap pour fermer
          </p>
        </div>
      </AccessibleDialog>
    </>
  );
}

function Bonus({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-gray-700">{label}</span>
    </div>
  );
}
