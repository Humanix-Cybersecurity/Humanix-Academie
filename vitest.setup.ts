// Setup Vitest - mocks globaux pour les tests unitaires.
//
// On mock @/lib/db (singleton Prisma) car son simple import déclenche
// le chargement du binaire natif Prisma, qui n'est pas dispo dans
// l'environnement de test (et qu'on ne veut pas charger pour des tests
// unitaires de fonctions pures).
//
// Pour les tests qui ont VRAIMENT besoin de la DB, on fera des tests
// d'intégration séparés post-launch (Vitest + testcontainers ou Playwright).
import { vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error(
          "Prisma client is mocked in unit tests. Use vi.mock() in your test file to provide specific behavior, or write an integration test.",
        );
      },
    },
  ),
}));
