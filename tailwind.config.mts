import type { Config } from "tailwindcss";

// Tailwind v4 : le type `Config` ne declare plus la propriete `safelist`
// (la voie moderne est `@source inline()` en CSS). Mais le mode compat
// charge par la directive `@config` dans globals.css continue de respecter
// la safelist du fichier JS. On etend donc le type pour permettre la
// declaration. Quand on fera la migration CSS-first complete (PR ulterieure),
// les safelist passeront en `@source inline()` et ce cast disparaitra.
type ConfigWithSafelist = Config & {
  safelist?: Array<string | { pattern: RegExp; variants?: string[] }>;
};

const config: ConfigWithSafelist = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  // SAFELIST : Tailwind tree-shake les classes non détectées dans le code
  // source. Les gradients de mascotte (lib/shop.ts BACKGROUND_GRADIENTS) et
  // de niveau (lib/levels.ts) sont assemblés dynamiquement depuis des objets
  // -> il faut les déclarer ici pour qu'ils soient générés dans le CSS final.
  // Sinon : décor acheté = aucun effet visuel.
  safelist: [
    // Backgrounds boutique (cf. BACKGROUND_GRADIENTS dans lib/shop.ts)
    "from-orange-200",
    "via-pink-200",
    "to-amber-200", // bg-aurora
    "from-purple-700",
    "via-indigo-700",
    "to-blue-900", // bg-space
    "from-cyan-200",
    "via-blue-300",
    "to-blue-500", // bg-ocean
    "from-pink-100",
    "via-rose-200",
    "to-pink-300", // bg-sakura
    "from-fuchsia-500",
    "via-violet-600",
    "to-cyan-500", // bg-cyber
    // Gradients de niveau mascotte (cf. lib/levels.ts)
    "from-gray-100",
    "to-gray-200",
    "from-cyan-100",
    "to-blue-200",
    "from-emerald-100",
    "to-teal-200",
    "from-amber-100",
    "to-orange-200",
    "from-purple-100",
    "to-pink-200",
    // Ring colors de niveau
    "ring-gray-300",
    "ring-cyan-400",
    "ring-emerald-400",
    "ring-amber-400",
    "ring-purple-400",
    // Border-* derives (utilisé dans /profil hero card via .replace("ring-", "border-"))
    "border-gray-300",
    "border-cyan-400",
    "border-emerald-400",
    "border-amber-400",
    "border-purple-400",
  ],
  theme: {
    extend: {
      colors: {
        // Charte Humanix. Échelle COMPLÈTE 50->950 (toutes utilisées dans le
        // site : sans elles, les classes type `to-accent-50` n'existent pas et
        // les gradients cassent en gris). Les nuances de MARQUE (primary 50/500/
        // 600, accent 500/600) restent pilotées par variables CSS pour la marque
        // blanche (pattern `rgb(var(--x) / <alpha-value>)` -> conserve les
        // modificateurs d'opacité ex `accent-500/30`). Défaut dans globals.css
        // :root, surchargé par tenant dans le <style> du layout. Les autres
        // nuances sont des hex statiques (non thématisées, cosmétique mineur).
        primary: {
          50: "rgb(var(--primary-50) / <alpha-value>)", // #EAF3F8 (thématisable)
          100: "#D6E4F5",
          200: "#AEC8E8",
          300: "#7FA3D6",
          400: "#3F6FB5",
          500: "rgb(var(--primary-500) / <alpha-value>)", // #0B3D91 Navy (thématisable)
          600: "rgb(var(--primary-600) / <alpha-value>)", // #082E73 (thématisable)
          700: "#07265E",
          800: "#061E4B",
          900: "#04132F",
          950: "#020B1C",
        },
        accent: {
          50: "#E6F7F7",
          100: "#C3ECEC",
          200: "#8FDCDB",
          300: "#4FC7C5",
          400: "#1AB3B1",
          500: "rgb(var(--accent-500) / <alpha-value>)", // #00A3A1 Teal (thématisable)
          600: "rgb(var(--accent-600) / <alpha-value>)", // #007F7D (thématisable)
          700: "#036463",
          800: "#074F4E",
          900: "#0A3F3E",
          950: "#042524",
        },
        success: "#2E8B57",
        warn: "#C0392B",
      },
      fontFamily: {
        // Polices accessibles, gratuites et larges, self-host via Fontsource
        // (CSS @font-face importés dans app/layout.tsx, woff2 dans node_modules).
        // Les noms de famille référencent les declarations Fontsource :
        //   - "Inter Variable" (poids 100-900 dans 1 fichier variable)
        //   - "Atkinson Hyperlegible" (poids 400 + 700 statiques)
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        display: [
          "Atkinson Hyperlegible",
          "Inter Variable",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
