// SPDX-License-Identifier: MIT
// Vitest config local au sous-projet mcp-server.
// Sans ce fichier, vitest remonte chercher la config racine du repo qui
// importe "vitest/config" — non resolvable depuis ce node_modules autonome.
//
// css.postcss = null : empeche vite de remonter chercher postcss.config.mjs
// a la racine, qui charge tailwindcss absent du node_modules autonome.
import { defineConfig } from "vitest/config";

export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts"],
  },
});
