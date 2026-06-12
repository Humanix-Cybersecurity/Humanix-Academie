// SPDX-License-Identifier: AGPL-3.0-or-later
//
// DEV_MODE - bypass des intégrations externes (Mollie, emails) pour
// tester les flows inscription / souscription en local sans avoir à
// configurer un compte Mollie ni un provider email.
//
// Différence avec DEMO_MODE :
//   - DEMO_MODE crée des comptes fictifs via /demo (sélecteur de profils
//     pré-seedés). Vise les démos commerciales / salons.
//   - DEV_MODE garde le flow réel (POST formulaires, création de tenants)
//     mais simule les externals : pas d'appel Mollie, pas d'email envoyé,
//     auto-login direct comme si l'utilisateur avait cliqué sur le magic
//     link / payé avec succès.
//
// SÉCURITÉ - garde-fou critique :
//   isDevMode() refuse d'activer le bypass quand AUTH_URL pointe sur un
//   domaine public (anything qui ne contient ni "localhost" ni
//   "127.0.0.1"). Un attaquant qui tenterait de pousser DEV_MODE=true sur
//   la prod via une variable d'environnement injectée échouerait : le
//   AUTH_URL prod (https://app.humanix-academie.fr) ne matchant pas, la
//   fonction retourne false.
//
//   On ne se fie PAS uniquement à NODE_ENV=production parce que le
//   docker-compose local fixe lui-même NODE_ENV=production (pour builder
//   Next.js en mode optimisé), et on veut quand même pouvoir activer
//   DEV_MODE sur ce setup local.
//
// USAGE :
//   - .env local : DEV_MODE="true"
//   - Lancer via docker compose ou npm run dev sur localhost
//   - Combinable avec DEMO_MODE=false (recommandé) : on teste le vrai
//     flow inscription LEARNER sur le tenant Communauté.

function isLocalDeployment(): boolean {
  const url = process.env.AUTH_URL ?? "";
  if (!url) return true; // pas defini = on suppose dev local
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0") ||
    url.includes(".local")
  );
}

export function isDevMode(): boolean {
  if (process.env.DEV_MODE !== "true") return false;
  if (!isLocalDeployment()) {
    // Garde-fou : on logue (au lieu de fail silencieusement) pour qu'un
    // mauvais deploiement avec DEV_MODE=true sur prod soit detecte vite.
    if (typeof console !== "undefined") {
      console.warn(
        "[dev-mode] DEV_MODE=true IGNORE : AUTH_URL pointe sur un domaine non-local. Bypass des integrations externes desactive.",
      );
    }
    return false;
  }
  return true;
}
