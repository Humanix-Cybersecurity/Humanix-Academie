// SPDX-License-Identifier: AGPL-3.0-or-later
//
// PostCSS config - Tailwind v4.
//
// Changements vs v3 :
//   - Le plugin n'est plus `tailwindcss` mais `@tailwindcss/postcss`.
//   - `autoprefixer` n'est plus necessaire : Tailwind v4 integre nativement
//     les prefixes vendor pour les navigateurs modernes (drop IE11).
//
// Le fichier `tailwind.config.mts` (legacy v3 style avec safelist + theme
// custom) est reutilise via la directive `@config "../tailwind.config.mts"`
// dans app/globals.css. La migration CSS-first (theme dans @theme blocks)
// est differee a une PR ulterieure.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
