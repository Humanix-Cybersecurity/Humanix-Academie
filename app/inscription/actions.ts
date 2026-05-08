// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";

// Server actions du flow /inscription. Posent le cookie d'intention puis
// délèguent à NextAuth signIn() qui orchestre le round-trip OAuth ou
// magic link. Cf. lib/inscription-intent.ts pour le cookie + lib/auth.ts
// pour la création contrôlée du user (PrismaAdapter override).

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { setInscriptionIntent } from "@/lib/inscription-intent";

const isDemoMode = process.env.DEMO_MODE === "true";
// /post-login redirige par rôle (LEARNER → /apprendre, ADMIN+ → /admin).
// Les inscriptions communauté finissent toujours en LEARNER, donc /apprendre,
// mais on passe par /post-login pour rester cohérent avec /connexion + webhook.
const POST_INSCRIPTION_REDIRECT = "/post-login";

function ensureInscriptionEnabled(): void {
  if (isDemoMode) {
    // En mode démo, /inscription redirige vers /demo (cf. layout). Si on
    // arrive quand même ici, on refuse poliment.
    redirect("/demo");
  }
}

/**
 * Démarre l'inscription via SSO (Google / Apple / Microsoft).
 * Pose le cookie d'intention, puis lance le flow OAuth de NextAuth.
 */
export async function startSsoInscription(provider: string): Promise<void> {
  ensureInscriptionEnabled();
  if (
    provider !== "google" &&
    provider !== "microsoft-entra-id" &&
    provider !== "apple"
  ) {
    redirect("/inscription?error=invalid_provider");
  }
  await setInscriptionIntent("community-learner");
  // signIn() throws un "redirect" qui sort vers le provider OAuth. On ne
  // revient ici qu'en cas d'erreur d'init (provider inconnu, etc.).
  await signIn(provider, { redirectTo: POST_INSCRIPTION_REDIRECT });
}

/**
 * Démarre l'inscription via magic link email. Pose le cookie d'intention,
 * envoie l'email via le provider nodemailer (Scaleway TEM en prod), puis
 * redirige vers /connexion/verification.
 */
export async function startMagicLinkInscription(
  formData: FormData,
): Promise<void> {
  ensureInscriptionEnabled();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) {
    redirect("/inscription?error=invalid_email");
  }
  await setInscriptionIntent("community-learner");
  // signIn nodemailer envoie l'email + redirige vers la page de vérification
  await signIn("nodemailer", {
    email,
    redirectTo: POST_INSCRIPTION_REDIRECT,
  });
}
