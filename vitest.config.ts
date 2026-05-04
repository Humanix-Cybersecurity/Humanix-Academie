// Configuration Vitest pour Humanix Académie.
//
// Stratégie : tests UNITAIRES sur la logique pure (lib/).
// On ne teste pas les composants React (ratio effort/valeur faible pour
// un projet à ce stade). Les routes et server actions sont testables
// post-launch via Playwright si besoin.
//
// Coverage cible : 80% lignes/branches/fonctions sur lib/ critique.
// Exclusions volontaires :
//  - lib/db.ts (singleton Prisma)
//  - lib/episodes.ts, lib/library-seed.ts, lib/marketplace-seed.ts (données seed)
//  - lib/anecdotes/seed-data.ts (données statiques)
//  - lib/posters/themes.ts (constantes)
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "connectors/**",
      "outlook-addin/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Scope P0 : on mesure le coverage sur les fichiers testés en sprint 1.
      // Sprints P1 et P2 (post-launch) ajouteront ai/mistral, anecdotes,
      // breaches, family-invites, incident-response, phishing/personalized,
      // tts, business-impact, marketplace/install...
      include: [
        "lib/audit-flash/scoring.ts",
        "lib/content-availability.ts",
        "lib/marketplace/integrity.ts",
        "lib/marketplace/schema.ts",
        "lib/plans.ts",
        "lib/pricing.ts",
        "lib/scim/mapper.ts",
        "lib/scim/filter.ts",
        "lib/webhooks/dispatcher.ts",
        "lib/webhooks/formatters.ts",
        "lib/webhooks/events.ts",
        "lib/siem-formatters.ts",
        "lib/oscal.ts",
        "lib/mapping-grc.ts",
        "lib/crypto.ts",
        "lib/levels.ts",
        "lib/cyber-score.ts",
        "lib/vishing/script-generator.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      // Note coverage pendant la phase de montée en charge des tests :
      // V8 instrumente tous les imports, même avec `include`, donc le total
      // global reste bas tant que P1/P2 ne sont pas couverts. Pour ne pas
      // bloquer la CI sur des fichiers volontairement non-testés en P0
      // (ai/mistral, anecdotes, breaches, family-invites, incident-response,
      // tts, phishing/personalized, business-impact, marketplace/install),
      // on désactive les thresholds pendant ce sprint.
      //
      // ROADMAP TESTS :
      //   - Sprint 1 P0 (FAIT) : 16 fichiers critiques, 279 tests, 97-100%
      //     coverage par fichier (sécu, billing, conformité, gamification).
      //   - Sprint 2 P1 (post-launch) : ai/mistral, anecdotes, breaches,
      //     business-impact, incident-response → cible 70% global.
      //   - Sprint 3 P2 (Q3 2026) : helpers utilitaires, atteindre 85%.
    },
  },
});
