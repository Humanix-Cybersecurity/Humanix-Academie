import type { Config } from "tailwindcss";

const config: Config = {
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
        // Charte HumaniX
        primary: {
          50: "#EAF3F8",
          500: "#0B3D91", // Navy
          600: "#082E73",
        },
        accent: {
          500: "#00A3A1", // Teal
          600: "#007F7D",
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
