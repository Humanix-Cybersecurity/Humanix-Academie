// SPDX-License-Identifier: AGPL-3.0-or-later
// Traductions FR des codes d'erreur Auth.js v5 + erreurs custom Humanix.
//
// Auth.js retourne des codes en anglais (CredentialsSignin, OAuthCallback,
// AccessDenied, ...). On les mappe ici en messages FR clairs pour l'UX.
//
// Usage cote UI :
//   const msg = humanizeAuthError(res.error);
//   setError(msg);

const AUTH_ERROR_FR: Record<string, string> = {
  // Erreurs natives Auth.js v5 (cf. https://authjs.dev/reference/core/errors)
  CredentialsSignin: "Identifiants invalides.",
  CallbackRouteError: "Échec de la connexion. Réessayez dans un instant.",
  AccessDenied: "Accès refusé. Votre compte n'a pas les droits requis.",
  Verification: "Le lien de vérification est invalide ou a expiré.",
  OAuthSignin: "La connexion via le fournisseur SSO a échoué.",
  OAuthCallback: "La réponse du fournisseur SSO est invalide.",
  OAuthCreateAccount: "Impossible de créer le compte via le fournisseur SSO.",
  EmailCreateAccount: "Impossible de créer le compte. Demandez à votre administrateur de vous inviter.",
  Callback: "Le callback d'authentification a échoué.",
  OAuthAccountNotLinked:
    "Cette adresse est déjà liée à une autre méthode de connexion. Utilisez la méthode initiale.",
  EmailSignin: "Impossible d'envoyer le lien magique. Vérifiez votre adresse.",
  SessionRequired: "Vous devez être connecté pour accéder à cette page.",
  Configuration:
    "Erreur de configuration côté serveur. Contactez l'administrateur.",
  // Erreurs SSO custom (cf. lib/auth.ts callback signIn)
  NoAccount:
    "Aucun compte trouvé pour cette adresse. Demandez à votre administrateur de vous inviter d'abord.",
  AccountSuspended:
    "Votre compte est suspendu. Contactez votre administrateur.",
  // Le tenant entier est desactive par l'operateur Humanix (SUPERADMIN).
  // Message volontairement neutre pour ne pas exposer l'info "tenant
  // suspendu" a un user innocent — il pense que c'est son compte.
  TenantSuspended:
    "Votre espace est temporairement indisponible. Contactez le support à contact@humanix-cybersecurity.fr.",
  // Erreurs custom Humanix (provider Credentials password)
  MfaRequired:
    "Cette adresse exige un code à 2 facteurs. Ouvrez votre application d'authentification.",
  MfaInvalid: "Code 2FA invalide.",
  AccountLocked:
    "Trop de tentatives. Compte verrouillé 15 minutes. Réessayez plus tard ou utilisez « Mot de passe oublié ».",

  // Erreurs WebAuthn
  credential_not_found:
    "Clé de sécurité non reconnue pour ce compte.",
  not_verified: "La vérification de la clé a échoué.",
  verify_failed: "La vérification a échoué. Réessayez en touchant la clé.",
  signature_invalide: "Signature invalide. Réessayez en touchant la clé.",
  challenge_expire: "Le défi de sécurité a expiré. Recommencez.",
  AbortError: "Annulé. Réessayez en touchant la clé.",
  NotAllowedError: "Annulé. Réessayez en touchant la clé.",
  "operation either timed out":
    "Délai dépassé. Réessayez en touchant la clé plus rapidement.",
};

/**
 * Convertit un code d'erreur Auth.js (en anglais) en message FR.
 * Si le code n'est pas connu, renvoie un message generique non technique.
 */
export function humanizeAuthError(code: string | null | undefined): string {
  if (!code) return "Erreur de connexion. Réessayez dans un instant.";
  // Auth.js peut chainer des erreurs : "MfaRequired", "Read more at..."
  // On cherche le premier match parmi les cles connues.
  for (const [key, msg] of Object.entries(AUTH_ERROR_FR)) {
    if (code.includes(key)) return msg;
  }
  // Fallback : ne pas exposer le code technique a l'user final
  return "Identifiants invalides ou erreur de connexion. Réessayez.";
}

/**
 * Pour les query params `?error=...` poses par Auth.js sur les redirections
 * (page /connexion?error=NoAccount par exemple). Meme logique que humanizeAuthError.
 */
export function humanizeAuthErrorParam(param: string | null): string | null {
  if (!param) return null;
  return humanizeAuthError(param);
}
