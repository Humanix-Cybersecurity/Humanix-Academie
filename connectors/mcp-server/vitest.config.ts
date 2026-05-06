// SPDX-License-Identifier: MIT
// Vitest config local au sous-projet mcp-server.
// Sans ce fichier, vitest remonte chercher la config racine du repo qui
// importe "vitest/config" — non resolvable depuis ce node_modules autonome.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts"],
  },
});
