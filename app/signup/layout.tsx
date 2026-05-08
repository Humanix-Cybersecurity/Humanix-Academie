// SPDX-License-Identifier: AGPL-3.0-or-later
//
// VERROU PHASE 3 — modèle d'accès 3-layer (cf. plan launch OSS mai 2026).
//
// Le flow self-service de /signup créait jusqu'ici un Tenant + un User
// ADMIN sans contrepartie financière. Ça contredit la règle
// "tenant = abonnement payant" édictée pour le launch OSS.
//
// Désormais :
//   - DEMO_MODE=true                       → /signup reste accessible
//     (utilisé par les démos live pour créer un compte fictif).
//   - SIGNUP_ALLOW_SELF_SERVICE=true       → /signup reste accessible
//     (échappatoire pour les tests de dev / staging, NE JAMAIS poser
//     en prod commerciale).
//   - Sinon (cas prod normal)              → redirect vers
//     /demande-abonnement (manuel pour les premières semaines, sera
//     remplacé par Payplug Checkout en Phase 3b).
//
// Cf. docs/DEPLOYMENT_RUNBOOK.md pour l'activation des env vars en prod.

import { redirect } from "next/navigation";

// force-dynamic : sinon Next prerendere ce layout au build, ou
// DEMO_MODE / SIGNUP_ALLOW_SELF_SERVICE sont undefined (pas set par le
// Dockerfile), ce qui fige le redirect vers /demande-abonnement dans le
// HTML statique. Resultat : meme avec DEMO_MODE=true ou SIGNUP_ALLOW_SELF_SERVICE=true
// a runtime, /signup serait inaccessible.
export const dynamic = "force-dynamic";

const isDemoMode = process.env.DEMO_MODE === "true";
const allowSelfService = process.env.SIGNUP_ALLOW_SELF_SERVICE === "true";

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDemoMode && !allowSelfService) {
    redirect("/demande-abonnement");
  }
  return <>{children}</>;
}
