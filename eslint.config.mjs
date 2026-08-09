// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Flat config ESLint (format obligatoire depuis ESLint 10).
//
// eslint-config-next 16 expose desormais un flat config NATIF (un tableau
// de config objects). On l'importe donc directement, sans passer par le
// bridge `FlatCompat`/`@eslint/eslintrc` : ce dernier tentait de valider
// la config Next via JSON.stringify et plantait sur la structure circulaire
// des plugins (`TypeError: Converting circular structure to JSON`), ce qui
// rendait `eslint .` totalement inoperant.

import next from "eslint-config-next";
import tseslint from "typescript-eslint";

export default [
  // Ignores globaux (remplace les --ignore-pattern de l'ancien script lint).
  {
    ignores: [
      "next-env.d.ts",
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "connectors/**",
      "outlook-addin/**",
      "*.d.ts.map",
      "*.js.map",
    ],
  },

  // Config Next.js native (core-web-vitals + typescript + a11y + import).
  ...next,

  // Rules custom - strictement les memes qu'avant.
  // En flat config, un objet qui reference une regle de plugin doit declarer
  // ce plugin ; on reattache donc @typescript-eslint ici.
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_|^e$",
        },
      ],
      "react/no-unescaped-entities": "off",
      "prefer-const": "error",
    },
  },

  // Regles du React Compiler (eslint-plugin-react-hooks v6+, activees par
  // le flat config de Next 16). Elles sont opt-in et tres strictes : elles
  // flaggent quantite de patterns existants parfaitement fonctionnels
  // (setState conditionnel dans un effect, etc.). On les garde en `warn`
  // pour la visibilite (dette suivie, cf issue #735) sans bloquer la CI.
  // A repasser progressivement en `error` fichier par fichier.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];
