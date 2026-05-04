// Cachet rond style "tampon officiel" - signature souveraine Humanix.
// V2 : design fini.
//   - Double cercle pointille (style sceau notaire) avec rythme regulier
//   - Texte courbe parfaitement positionne sur les deux arcs (haut/bas)
//   - Drapeau FR vrai ratio 2:3 centre optiquement (pas geometriquement)
//   - Etoile centrale + couronne de petites etoiles (rappel UE/heraldique)
//   - Mention "RGPD · NIS2" en bas pour signaler le cadre legal
//   - Filtre "tampon" subtil (legere rotation + opacity) pour realisme
//   - 3 tailles propres avec font-size proportionnel
//
// Pose en bas a droite des pages publiques, ou dans le footer.
// A11y : role="img" + aria-label long descriptif.

export default function MadeInFranceStamp({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? 72 : size === "lg" ? 128 : 96;

  // Couleurs officielles drapeau FR (charte gouv.fr)
  const BLEU = "#000091";
  const ROUGE = "#E1000F";
  const ENCRE = "#0B3D91"; // bleu marine "tampon", + sobre que le drapeau

  return (
    <div
      role="img"
      aria-label="Plateforme conçue, hébergée et opérée en France — conforme RGPD et NIS2"
      className={`inline-block transition-transform duration-300 hover:scale-105 hover:-rotate-3 ${className ?? ""}`}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Arc HAUT pour le texte "MADE IN FRANCE" */}
          <path id="mif-arc-top" d="M 18,60 A 42,42 0 0 1 102,60" fill="none" />
          {/* Arc BAS pour la mention conformite */}
          <path id="mif-arc-bot" d="M 18,60 A 42,42 0 0 0 102,60" fill="none" />
          {/* Filtre : tres subtile texture papier/encre */}
          <filter id="mif-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="3"
            />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {/* === DOUBLE CERCLE (style sceau) === */}
        {/* Cercle exterieur trait plein */}
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke={ENCRE}
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Cercle interieur pointille regulier (rythme tampon notaire) */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={ENCRE}
          strokeWidth="1"
          strokeDasharray="1.5 2.5"
          opacity="0.85"
        />
        {/* Cercle central qui porte le drapeau */}
        <circle
          cx="60"
          cy="60"
          r="32"
          fill="none"
          stroke={ENCRE}
          strokeWidth="0.8"
          opacity="0.45"
        />

        {/* === TEXTE COURBE HAUT === */}
        <text
          fontSize="9.5"
          fontWeight="800"
          fill={ENCRE}
          letterSpacing="3"
          fontFamily="Inter, system-ui, sans-serif"
        >
          <textPath href="#mif-arc-top" startOffset="50%" textAnchor="middle">
            MADE IN FRANCE
          </textPath>
        </text>

        {/* === TEXTE COURBE BAS === */}
        <text
          fontSize="6.5"
          fontWeight="700"
          fill={ENCRE}
          letterSpacing="2.5"
          fontFamily="Inter, system-ui, sans-serif"
          opacity="0.85"
        >
          <textPath href="#mif-arc-bot" startOffset="50%" textAnchor="middle">
            RGPD · NIS2 · HÉBERGÉ FR
          </textPath>
        </text>

        {/* === SEPARATEURS LATERAUX (petites etoiles) === */}
        <g fill={ENCRE} opacity="0.7">
          <Star cx={14} cy={60} r={2} />
          <Star cx={106} cy={60} r={2} />
        </g>

        {/* === DRAPEAU FR centre, ratio 2:3, coins legerement arrondis === */}
        <g transform="translate(39, 47)">
          {/* Ombre portee tres legere */}
          <rect
            x="0.5"
            y="0.5"
            width="42"
            height="26"
            rx="2"
            fill="black"
            opacity="0.08"
          />
          {/* Bandes */}
          <rect x="0" y="0" width="14" height="26" rx="1.5" fill={BLEU} />
          <rect x="14" y="0" width="14" height="26" fill="#FFFFFF" />
          <rect x="28" y="0" width="14" height="26" rx="1.5" fill={ROUGE} />
          {/* Filets internes pour casser la perfection imprimerie */}
          <rect
            x="0"
            y="0"
            width="42"
            height="26"
            rx="2"
            fill="none"
            stroke={ENCRE}
            strokeWidth="0.4"
            opacity="0.35"
          />
        </g>

        {/* === MENTION "EST. 2026" sous le drapeau === */}
        <text
          x="60"
          y="86"
          fontSize="5.5"
          fontWeight="700"
          fill={ENCRE}
          textAnchor="middle"
          letterSpacing="2"
          fontFamily="Inter, system-ui, sans-serif"
          opacity="0.75"
        >
          EST. 2026
        </text>

        {/* === COURONNE DE 6 ETOILES (rappel heraldique) === */}
        <g fill="#00A3A1" opacity="0.85">
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            // Place une etoile a r=44 sur l'angle donne, sauf cote drapeau
            const rad = (angle * Math.PI) / 180;
            const x = 60 + 44 * Math.cos(rad);
            const y = 60 + 44 * Math.sin(rad);
            // On masque les 2 etoiles laterales (deja occupees par les separateurs)
            if (angle === 0 || angle === 180) return null;
            return <Star key={angle} cx={x} cy={y} r={1.6} />;
          })}
        </g>

        {/* Effet de grain leger (donne le "tampon imprime" plutot que vectoriel froid) */}
        <rect
          x="0"
          y="0"
          width="120"
          height="120"
          filter="url(#mif-grain)"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

/** Petite etoile 5 branches reutilisable. */
function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // 5 branches : 5 angles a 72°, alternance rayon ext/int
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * (Math.PI / 180);
    const radius = i % 2 === 0 ? r : r / 2.2;
    points.push(
      `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`,
    );
  }
  return <polygon points={points.join(" ")} />;
}
