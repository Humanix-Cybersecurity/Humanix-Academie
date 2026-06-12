// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Onboarding self-service RSSI / DSI / DAF / DPO (plan starter gratuit
// jusqu'a 5 sieges).
//
// HISTORIQUE :
//   Phase 3 launch OSS (mai 2026) - /signup etait FERME par defaut
//   pour eviter les comptes fantomes. Activable uniquement via flag
//   SIGNUP_ALLOW_SELF_SERVICE=true ou DEMO_MODE=true.
//
//   Phase 3b (post-launch, 16 mai 2026) - /signup est OUVERT par
//   defaut. Le plan starter (gratuit jusqu'a 5 sieges) est self-service
//   complet, avec anti-abus solide :
//     - Honeypot field "website" silencieux
//     - Rate-limit 5 signups / heure / IP (cf. lib/rate-limit)
//     - Email + password validation stricte (lib/password)
//     - Consentement RGPD obligatoire
//     - Email uniqueness check (multi-tenant safe)
//     - Slug collision-safe avec suffix random
//
// ENV VAR ANTI-DERAPAGE :
//   SIGNUP_BLOCK_SELF_SERVICE=true → fait redirect vers
//   /demande-abonnement. A utiliser uniquement si on observe des
//   abus massifs en prod (cutoff d'urgence sans redeploy).
//
// Cf. docs/DEPLOYMENT_RUNBOOK.md pour l'activation des env vars en prod.

import { redirect } from "next/navigation";

// force-dynamic : sinon Next prerendere ce layout au build et fige la
// decision d'autoriser/bloquer. SIGNUP_BLOCK_SELF_SERVICE doit etre
// evaluee a runtime pour permettre un cutoff d'urgence sans redeploy.
export const dynamic = "force-dynamic";

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.SIGNUP_BLOCK_SELF_SERVICE === "true") {
    redirect("/demande-abonnement");
  }
  return <>{children}</>;
}
