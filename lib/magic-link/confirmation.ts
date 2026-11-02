// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page de confirmation du lien magique : le jeton n'est consommé qu'au clic.
//
// Auth.js consomme le VerificationToken dès le PREMIER GET sur
// /api/auth/callback/nodemailer (l'adaptateur Prisma le supprime). Or les
// messageries d'entreprise « ouvrent » les liens reçus pour les analyser avant
// l'utilisateur : Microsoft 365 (Defender, Safe Links), certains antispams.
// Le jeton est alors déjà parti quand la personne clique, et elle tombe sur
// « Le lien de vérification est invalide ou a expiré ». Constaté chez un
// revendeur le 2026-11-02 : le même lien passe depuis une boîte perso et
// échoue depuis une boîte M365.
//
// Le remède est celui recommandé par Auth.js : le mail pointe vers une page
// (GET sans effet) qui porte un bouton, et c'est ce bouton qui envoie le
// jeton au callback en POST. Un robot qui suit le lien ne soumet pas le
// formulaire. Auth.js accepte le callback des fournisseurs email en POST et
// lit token / email / callbackUrl dans la query ; le CSRF n'est exigé que
// pour le fournisseur credentials.
//
// Ce module ne contient que des fonctions pures, testées sans réseau.

export const CHEMIN_CALLBACK = "/api/auth/callback/nodemailer";
export const CHEMIN_PAGE_CONFIRMATION = "/connexion/lien";

export type ParametresLien = {
  token: string;
  email: string;
  callbackUrl: string | null;
};

// Jeton : hexadécimal de 64 caractères par défaut chez Auth.js et dans
// lib/invite-email, mais un generateVerificationToken sur mesure reste
// possible ; on accepte donc un alphabet d'URL sans espace, borné.
const MOTIF_TOKEN = /^[A-Za-z0-9_-]{16,512}$/;
const LONGUEUR_MAX_EMAIL = 254;
const LONGUEUR_MAX_CALLBACK = 2048;

/**
 * Transforme l'URL de callback construite par Auth.js (ou par
 * lib/invite-email) en URL de la page de confirmation : même origine, mêmes
 * paramètres, seul le chemin change. Toute URL qui n'est pas un callback
 * nodemailer est rendue telle quelle.
 */
export function versPageDeConfirmation(urlCallback: string): string {
  let url: URL;
  try {
    url = new URL(urlCallback);
  } catch {
    return urlCallback;
  }
  if (url.pathname !== CHEMIN_CALLBACK) return urlCallback;
  url.pathname = CHEMIN_PAGE_CONFIRMATION;
  return url.toString();
}

function unique(valeur: string | string[] | undefined): string | null {
  if (Array.isArray(valeur)) return valeur.length === 1 ? valeur[0] : null;
  return typeof valeur === "string" ? valeur : null;
}

/**
 * Lit et valide les paramètres reçus par la page. Renvoie null si le lien
 * est incomplet ou malformé : la page affiche alors un message au lieu d'un
 * formulaire.
 */
export function lireParametresLien(
  params: Record<string, string | string[] | undefined>,
): ParametresLien | null {
  const token = unique(params.token);
  const email = unique(params.email);
  const callbackUrl = unique(params.callbackUrl);

  if (!token || !MOTIF_TOKEN.test(token)) return null;
  if (
    !email ||
    email.length > LONGUEUR_MAX_EMAIL ||
    !email.includes("@") ||
    /\s/.test(email)
  ) {
    return null;
  }
  const cb =
    callbackUrl && callbackUrl.length <= LONGUEUR_MAX_CALLBACK
      ? callbackUrl
      : null;
  return { token, email, callbackUrl: cb };
}

/**
 * Cible du formulaire : le callback Auth.js sur le même hôte que la page,
 * avec les paramètres dans la query (c'est là qu'Auth.js les lit, même en
 * POST). Le callbackUrl est validé par Auth.js, pas ici.
 */
export function urlCallbackPourFormulaire(p: ParametresLien): string {
  const query = new URLSearchParams();
  if (p.callbackUrl) query.set("callbackUrl", p.callbackUrl);
  query.set("token", p.token);
  query.set("email", p.email);
  return `${CHEMIN_CALLBACK}?${query.toString()}`;
}
