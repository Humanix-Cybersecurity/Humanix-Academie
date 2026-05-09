// SPDX-License-Identifier: AGPL-3.0-or-later
// Cachet rond style "tampon officiel" - signature souveraine Humanix.
//
// V4 (mai 2026) : pass de polish suite a feedback utilisateur.
//   ✗ V3 : "RGPD" tronque en "GPD", "SOUVERAIN" tronque en "SOUVERAI"
//     -> letterSpacing 3 etait trop large pour la longueur de l'arc bas
//   ✗ V3 : "EST. 2026" se chevauchait avec le mini-hexagone signature
//
// V4 :
//   ✓ letterSpacing reduit a 1.5 pour le texte bas -> "RGPD · NIS2 ·
//     SOUVERAIN" tient entierement dans l'arc avec une marge confortable
//   ✓ "EST. 2026" supprime (le mini-hexagone signature suffit)
//   ✓ Prop `certifications` pour customiser le texte du bas (cas
//     "AGPLv3 · OPEN SOURCE" pour la version GitHub, ou autre)
//   ✓ Reste : layout 4 zones, couronne 4 etoiles or, drapeau, hexagone signature
//
// A11y : role="img" + aria-label long descriptif (preserve V2).
// Usage :
//   <MadeInFranceStamp size="sm|md|lg" />
//   <MadeInFranceStamp certifications="AGPLv3 · OPEN SOURCE" />

export default function MadeInFranceStamp({
  size = "md",
  className,
  certifications = "RGPD · NIS2 · SOUVERAIN",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Texte du bas du tampon. Defaut "RGPD · NIS2 · SOUVERAIN". Reste lisible
   * jusqu'a ~26 caracteres (au-dela, reduire la taille de police).
   */
  certifications?: string;
}) {
  const dim = size === "sm" ? 72 : size === "lg" ? 128 : 96;

  // Couleurs officielles drapeau FR (charte gouv.fr) + accent heraldique
  const BLEU = "#000091";
  const ROUGE = "#E1000F";
  const ENCRE = "#0B3D91"; // bleu marine "tampon", + sobre que le drapeau
  const OR = "#D4A017"; // accent heraldique pour les etoiles + l'etoile focal

  return (
    <div
      role="img"
      aria-label="Plateforme conçue, hébergée et opérée en France - conforme RGPD et NIS2"
      className={`inline-block transition-transform duration-300 hover:scale-105 hover:-rotate-2 ${className ?? ""}`}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Arc HAUT pour "MADE IN FRANCE" (rayon plus grand pour aerer) */}
          <path
            id="mif-arc-top"
            d="M 16,60 A 44,44 0 0 1 104,60"
            fill="none"
          />
          {/* Arc BAS pour "RGPD · NIS2 · SOUVERAIN" -- même rayon, lisible */}
          <path
            id="mif-arc-bot"
            d="M 16,60 A 44,44 0 0 0 104,60"
            fill="none"
          />
          {/* Filtre : grain papier/encre très subtil */}
          <filter id="mif-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="3"
            />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          {/* Gradient leger sur le fond (donne de la profondeur sans bruit) */}
          <radialGradient id="mif-bg" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#F5F4F0" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* === FOND CIRCULAIRE LEGER (papier tampon) === */}
        <circle cx="60" cy="60" r="56" fill="url(#mif-bg)" />

        {/* === DOUBLE CERCLE EXTERIEUR (style sceau notaire) === */}
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke={ENCRE}
          strokeWidth="1.5"
          opacity="0.92"
        />
        <circle
          cx="60"
          cy="60"
          r="51"
          fill="none"
          stroke={ENCRE}
          strokeWidth="0.8"
          strokeDasharray="1.5 2.8"
          opacity="0.75"
        />

        {/* === TEXTE COURBE HAUT === */}
        <text
          fontSize="9"
          fontWeight="800"
          fill={ENCRE}
          letterSpacing="3.2"
          fontFamily="Inter, system-ui, sans-serif"
        >
          <textPath href="#mif-arc-top" startOffset="50%" textAnchor="middle">
            MADE IN FRANCE
          </textPath>
        </text>

        {/* === TEXTE COURBE BAS ===
            Arc demi-cercle de rayon 44 = ~138 unites de longueur. Avec
            fontSize 6.4 et letterSpacing 1.5, on tient ~28 caracteres avec
            une marge respectable (V3 utilisait letterSpacing 3 -> debordait
            -> "RGPD" devenait "GPD", "SOUVERAIN" devenait "SOUVERAI"). */}
        <text
          fontSize="6.4"
          fontWeight="700"
          fill={ENCRE}
          letterSpacing="1.5"
          fontFamily="Inter, system-ui, sans-serif"
          opacity="0.88"
        >
          <textPath href="#mif-arc-bot" startOffset="50%" textAnchor="middle">
            {certifications}
          </textPath>
        </text>

        {/* === COURONNE DE 6 ETOILES OR (heraldique) ===
            Placees dans les ZONES LIBRES entre les arcs texte. Les 4 angles
            choisis (40/140/220/320 deg) sont eloignes a la fois de :
            - l'arc top texte (autour de 270 +/- 70 deg en repere SVG inverse)
            - l'arc bot texte (autour de 90 +/- 70 deg)
            - le drapeau central
            -> aucune collision, parfaitement equilibre 4 coins. */}
        <g fill={OR} opacity="0.82">
          {[40, 140, 220, 320].map((angle) => {
            // SVG : 0deg = est, sens horaire (y vers le bas)
            const rad = (angle * Math.PI) / 180;
            const r = 39;
            const x = 60 + r * Math.cos(rad);
            const y = 60 + r * Math.sin(rad);
            return <Star key={angle} cx={x} cy={y} r={1.6} />;
          })}
        </g>

        {/* === ETOILE OR FOCAL au-dessus du drapeau === */}
        <Star cx={60} cy={36} r={2.4} fill={OR} />

        {/* === DRAPEAU FR centre, ratio 2:3 (charte gouv) === */}
        <g transform="translate(40, 42)">
          {/* Ombre portee très legere -- effet "imprime sur papier" */}
          <rect
            x="0.6"
            y="0.6"
            width="40"
            height="24"
            rx="1.8"
            fill="black"
            opacity="0.1"
          />
          {/* Bandes du drapeau */}
          <rect x="0" y="0" width="13.33" height="24" rx="1.5" fill={BLEU} />
          <rect x="13.33" y="0" width="13.34" height="24" fill="#FFFFFF" />
          <rect
            x="26.67"
            y="0"
            width="13.33"
            height="24"
            rx="1.5"
            fill={ROUGE}
          />
          {/* Filet d'encadrement subtil pour casser l'imprimerie froide */}
          <rect
            x="0"
            y="0"
            width="40"
            height="24"
            rx="1.8"
            fill="none"
            stroke={ENCRE}
            strokeWidth="0.4"
            opacity="0.4"
          />
        </g>

        {/* === SIGNATURE HUMANIX (mini-hexagone + millesime) ===
            Sous le drapeau, dans la zone libre entre lui et le texte bas.
            Le mini-hexagone est la signature brand "Hex la mascotte" en
            tampon. Tres petit (~5px) mais reconnaissable. */}
        <g transform="translate(60, 80)">
          {/* Mini-hexagone Humanix (pointe vers le haut, ratio comme la mascotte) */}
          <polygon
            points="0,-3.6 3.12,-1.8 3.12,1.8 0,3.6 -3.12,1.8 -3.12,-1.8"
            fill="none"
            stroke={ENCRE}
            strokeWidth="0.8"
            opacity="0.7"
          />
          {/* Petit point central qui rappelle l'oeil de la mascotte */}
          <circle cx="0" cy="0" r="0.7" fill={ENCRE} opacity="0.7" />
        </g>

        {/* "EST. 2026" supprime en V4 (chevauchait le mini-hexagone
            signature, peu lisible). Le mini-hexagone seul suffit. */}

        {/* === SEPARATEURS DECORATIFS aux extremites des arcs ===
            Petits losanges or qui marquent visuellement le debut/fin des arcs
            (style sceau notaire avec fleur de lis aux extremites). Places
            EXACTEMENT aux points de jonction des deux arcs (3h et 9h en
            cadran). Pas de collision avec les textes car ils sont aux
            extremites des arcs, dans la marge. */}
        <g fill={OR} opacity="0.7">
          <Diamond cx={11.5} cy={60} r={2} />
          <Diamond cx={108.5} cy={60} r={2} />
        </g>

        {/* === GRAIN PAPIER : effet "tampon imprime" subtil === */}
        <rect
          x="0"
          y="0"
          width="120"
          height="120"
          filter="url(#mif-grain)"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

/** Etoile 5 branches -- generique, reutilisee pour la couronne et l'etoile focal. */
function Star({
  cx,
  cy,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
}) {
  // 5 branches : alternance angle / rayon ext-int
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * (Math.PI / 180);
    const radius = i % 2 === 0 ? r : r / 2.4;
    points.push(
      `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`,
    );
  }
  return <polygon points={points.join(" ")} fill={fill} />;
}

/** Petit losange (style fleur de lis simplifiee) pour les separateurs lateraux. */
function Diamond({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <polygon
      points={`${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`}
    />
  );
}
