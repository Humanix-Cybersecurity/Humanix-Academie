// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Flat config ESLint (format obligatoire depuis ESLint 10).
// Equivalent de l'ancien .eslintrc.json, via le bridge `FlatCompat` qui
// transforme les `extends: ["next/..."]` (format legacy) en flat config.
//
// Note : eslint-config-next 16 expose toujours ses configs en format
// legacy (core-web-vitals.js / typescript.js), donc on passe par
// FlatCompat. C'est la voie officielle recommandee par Vercel pendant
// la transition.

import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

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

  // Configs Next.js (core-web-vitals + typescript) via le bridge legacy.
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Rules custom - strictement les memes qu'avant.
  {
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
];
