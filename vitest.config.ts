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
    // En Vitest 4, le pattern object `"@": __dirname` ne suffit plus pour
    // les imports type `@/lib/plans` cote workers - il faut un alias regex
    // explicite (matche le segment `@/` AVEC le `/` final) et un chemin
    // absolu qui inclut le `/` final aussi pour eviter les ambiguites.
    // Equivalent au mapping tsconfig `"@/*": ["./*"]`.
    alias: [{ find: /^@\//, replacement: __dirname + "/" }],
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
        "lib/license/format.ts",
        "lib/license/verify.ts",
        "lib/license/cache.ts",
        "lib/license/index.ts",
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
        // Sprint #754 : noyau critique historiquement non couvert.
        // lib/impersonation = la feature la plus dangereuse d'un SaaS
        // multi-tenant ; lib/api-auth = portier des endpoints /api/v1.
        "lib/impersonation/actions.ts",
        "lib/api-auth.ts",
        "lib/auth-rate-limit.ts",
        "lib/notifications-mandatory.ts",
        "lib/achievements/collectors.ts",
        "lib/csv.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      // Thresholds REACTIVES (#754). Ils ne portent que sur la liste
      // `include` ci-dessus — le noyau critique volontairement couvert —
      // et pas sur le dépôt entier : c'est ce qui les rend tenables.
      //
      // Rôle : cliquet anti-régression, pas objectif de perfection. Les
      // valeurs sont posées ~5 points SOUS le niveau mesuré au moment de
      // les activer (84.3 stmts / 75.9 branches / 86.5 funcs / 85.8 lignes),
      // pour qu'un refactor honnête ne casse pas la CI mais qu'une vraie
      // perte de couverture la casse.
      //
      // Les relever au fil des sprints plutôt que de les baisser : si un
      // seuil devient gênant, ajouter les tests manquants ou retirer le
      // fichier de `include` en le justifiant.
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
      //
      // ROADMAP TESTS :
      //   - Sprint 1 P0 (FAIT) : 16 fichiers critiques, 279 tests, 97-100%
      //     coverage par fichier (sécu, billing, conformité, gamification).
      //   - Sprint #754 (FAIT) : impersonation (la feature la plus
      //     dangereuse d'un SaaS multi-tenant) + api-auth + les modules
      //     ajoutés pendant l'audit d'août 2026. Thresholds réactivés.
      //   - Reste non couvert, assumé : lib/auth.ts (câblage NextAuth, peu
      //     testable unitairement), le handler webhook Mollie et les autres
      //     routes app/ (aucun harnais pour app/ dans ce dépôt),
      //     lib/webauthn.ts, lib/tenant-provisioning.ts.
      //   - Sprint 2 P1 (post-launch) : ai/mistral, anecdotes, breaches,
      //     business-impact, incident-response → cible 70% global.
      //   - Sprint 3 P2 (Q3 2026) : helpers utilitaires, atteindre 85%.
    },
  },
});
