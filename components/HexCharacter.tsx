// SPDX-License-Identifier: AGPL-3.0-or-later
//
// HexCharacter — SVG renard "Hex" vivant (V1, sans dependance JS animation).
//
// Pourquoi : on remplace l'emoji 🦊 generique par un personnage SVG
// stylise, qui respire, cligne des yeux, et change d'expression selon le
// mood. Bundle 0 KB — pure SVG + animations CSS deja definies dans
// globals.css (breathe, hex-blink, hex-wave-hand, hex-wiggle-tail).
//
// Design :
//   - Tête arrondie hexagonale (clin d'oeil au nom Humanix)
//   - Couleur primaire orange #ff8c42 (renard) avec ombrage doux
//   - Yeux + bouche qui changent par mood (paths SVG distincts)
//   - Petite main qui salue (animation continue ~3.5s)
//   - Queue qui fretille (animation continue ~2.5s)
//
// Accessibilite :
//   - role="img" + aria-label dynamique selon le mood
//   - prefers-reduced-motion : animations disabled (cf. globals.css)
//
// Performance : SVG inline, pas de fetch, ~5 KB de markup compresse.
// Pas d'impact LCP, pas de couche Canvas/WebGL.

import clsx from "clsx";

export type HexMood =
  | "neutral"
  | "happy"
  | "sad"
  | "curious"
  | "celebrate"
  | "thinking";

const MOOD_LABEL: Record<HexMood, string> = {
  neutral: "Hex la mascotte",
  happy: "Hex content",
  sad: "Hex un peu triste",
  curious: "Hex curieux",
  celebrate: "Hex qui fete quelque chose",
  thinking: "Hex en train de reflechir",
};

export default function HexCharacter({
  mood = "neutral",
  size = 64,
  animated = true,
  className,
}: {
  mood?: HexMood;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label={MOOD_LABEL[mood]}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={clsx(
        "select-none",
        animated && "animate-breathe",
        className,
      )}
    >
      <defs>
        {/* Degrade orange du visage */}
        <radialGradient id="hex-face-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffae6e" />
          <stop offset="100%" stopColor="#ff8c42" />
        </radialGradient>
        {/* Degrade pour le ventre/clair */}
        <linearGradient id="hex-belly-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff7ec" />
          <stop offset="100%" stopColor="#ffe5cc" />
        </linearGradient>
      </defs>

      {/* QUEUE (animee) — derriere le corps, en bas a droite */}
      <g
        className={animated ? "animate-hex-wiggle-tail" : undefined}
        style={{ transformOrigin: "75px 70px" }}
      >
        <path
          d="M 75 70 Q 90 55 92 38 Q 88 50 78 60 Z"
          fill="url(#hex-face-grad)"
          stroke="#cc6929"
          strokeWidth="0.8"
        />
        {/* Pointe blanche de la queue (signature renard) */}
        <ellipse cx="91" cy="40" rx="3.5" ry="5" fill="#fff7ec" />
      </g>

      {/* CORPS — forme arrondie hexagonale */}
      <path
        d="M 50 18
           L 78 30
           L 78 65
           L 65 80
           L 35 80
           L 22 65
           L 22 30 Z"
        fill="url(#hex-face-grad)"
        stroke="#cc6929"
        strokeWidth="1.2"
      />

      {/* OREILLES (triangulaires, avec interieur clair) */}
      {/* Gauche */}
      <path
        d="M 25 22 L 32 5 L 38 22 Z"
        fill="url(#hex-face-grad)"
        stroke="#cc6929"
        strokeWidth="0.8"
      />
      <path d="M 30 18 L 32 10 L 35 18 Z" fill="#ffd6b3" />
      {/* Droite */}
      <path
        d="M 62 22 L 68 5 L 75 22 Z"
        fill="url(#hex-face-grad)"
        stroke="#cc6929"
        strokeWidth="0.8"
      />
      <path d="M 65 18 L 68 10 L 70 18 Z" fill="#ffd6b3" />

      {/* MUSEAU CLAIR (zone blanche autour du nez/bouche) */}
      <ellipse
        cx="50"
        cy="58"
        rx="18"
        ry="14"
        fill="url(#hex-belly-grad)"
      />

      {/* JOUES roses subtiles */}
      <circle cx="32" cy="55" r="3" fill="#ffb3a0" opacity="0.5" />
      <circle cx="68" cy="55" r="3" fill="#ffb3a0" opacity="0.5" />

      {/* YEUX — group anime pour le clignement */}
      <g
        className={animated ? "animate-hex-blink" : undefined}
        style={{ transformOrigin: "50px 42px" }}
      >
        <Eye cx={37} cy={42} mood={mood} side="left" />
        <Eye cx={63} cy={42} mood={mood} side="right" />
      </g>

      {/* NEZ */}
      <ellipse cx="50" cy="55" rx="3" ry="2.2" fill="#3a2418" />
      {/* Petit reflet sur le nez */}
      <ellipse cx="49" cy="54.3" rx="0.8" ry="0.6" fill="#ffffff" opacity="0.6" />

      {/* BOUCHE selon mood */}
      <Mouth mood={mood} />

      {/* MAIN qui salue (en bas a gauche) — animee */}
      <g
        className={animated ? "animate-hex-wave-hand" : undefined}
        style={{ transformOrigin: "26px 75px" }}
      >
        <ellipse cx="26" cy="75" rx="5" ry="4" fill="url(#hex-face-grad)" stroke="#cc6929" strokeWidth="0.6" />
        <ellipse cx="26" cy="74" rx="3" ry="2.5" fill="#ffe5cc" />
      </g>
    </svg>
  );
}

// =============================================================
// Sous-composants : yeux et bouche
// =============================================================

function Eye({
  cx,
  cy,
  mood,
  side,
}: {
  cx: number;
  cy: number;
  mood: HexMood;
  side: "left" | "right";
}) {
  // Selon le mood, l'oeil change de forme :
  //   - neutral / curious / sad : ovale ouvert avec pupille
  //   - happy / celebrate : arc "^" (yeux qui sourient)
  //   - thinking : oeil leger oblique vers le haut

  if (mood === "happy" || mood === "celebrate") {
    // Yeux qui sourient ^_^
    return (
      <path
        d={`M ${cx - 4} ${cy + 1} Q ${cx} ${cy - 4} ${cx + 4} ${cy + 1}`}
        stroke="#3a2418"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (mood === "sad") {
    // Pupille basse + paupiere superieure inclinee
    return (
      <>
        <ellipse cx={cx} cy={cy} rx="3.5" ry="3.5" fill="#ffffff" stroke="#3a2418" strokeWidth="0.5" />
        <ellipse cx={cx} cy={cy + 1.5} rx="2" ry="2" fill="#3a2418" />
        <path
          d={
            side === "left"
              ? `M ${cx - 4} ${cy - 2} L ${cx + 4} ${cy - 1}`
              : `M ${cx - 4} ${cy - 1} L ${cx + 4} ${cy - 2}`
          }
          stroke="#3a2418"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (mood === "thinking") {
    // Oeil leger oblique haut (regard en l'air)
    return (
      <>
        <ellipse cx={cx} cy={cy} rx="3.5" ry="3.5" fill="#ffffff" stroke="#3a2418" strokeWidth="0.5" />
        <ellipse cx={cx} cy={cy - 1.2} rx="1.8" ry="1.8" fill="#3a2418" />
      </>
    );
  }

  // Default neutral / curious : oeil ouvert avec pupille centree
  const pupilOffset = mood === "curious" ? 0.8 : 0;
  return (
    <>
      <ellipse cx={cx} cy={cy} rx="3.5" ry="3.5" fill="#ffffff" stroke="#3a2418" strokeWidth="0.5" />
      <ellipse cx={cx + pupilOffset} cy={cy} rx="2" ry="2" fill="#3a2418" />
      {/* petit reflet blanc dans la pupille */}
      <circle cx={cx + pupilOffset - 0.5} cy={cy - 0.5} r="0.5" fill="#ffffff" />
    </>
  );
}

function Mouth({ mood }: { mood: HexMood }) {
  const stroke = "#3a2418";

  if (mood === "happy") {
    // Sourire arrondi ouvert
    return (
      <path
        d="M 43 64 Q 50 70 57 64"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (mood === "celebrate") {
    // Bouche grande ouverte avec petite langue
    return (
      <>
        <path
          d="M 42 62 Q 50 72 58 62 Q 50 67 42 62 Z"
          fill="#3a2418"
          stroke={stroke}
          strokeWidth="1"
        />
        <path d="M 47 67 Q 50 70 53 67" fill="#ff6b8a" />
      </>
    );
  }

  if (mood === "sad") {
    return (
      <path
        d="M 43 67 Q 50 62 57 67"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (mood === "curious") {
    // Petite "o"
    return (
      <ellipse
        cx="50"
        cy="64"
        rx="2"
        ry="2.5"
        fill="#3a2418"
      />
    );
  }

  if (mood === "thinking") {
    // Bouche en biais (sceptique amical)
    return (
      <path
        d="M 45 64 L 55 65"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  // neutral : petit sourire discret
  return (
    <path
      d="M 45 64 Q 50 67 55 64"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  );
}
