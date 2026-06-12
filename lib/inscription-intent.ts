// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Cookie d'intention "inscription" - discriminateur entre /connexion (qui
// REFUSE les SSO inconnus, sécurité) et /inscription (qui ACCEPTE et crée
// un LEARNER sur le tenant Communauté).
//
// FLOW :
//   1. User arrive sur /inscription, clique "Continuer avec Google".
//   2. Server action setInscriptionIntent() pose un cookie httpOnly signé
//      HMAC, TTL 5 minutes (suffisant pour le round-trip OAuth).
//   3. NextAuth redirige vers Google → Google revient avec le profil.
//   4. signIn callback de NextAuth (lib/auth.ts) lit le cookie via
//      readInscriptionIntent() :
//        - Cookie valide ET email inconnu → autorise auto-create.
//        - Pas de cookie → comportement actuel (rejette inconnu).
//   5. PrismaAdapter override (createUser) attache au tenant Communauté
//      avec role LEARNER.
//   6. Cookie consommé une fois (clearInscriptionIntent en fin de flow).
//
// SÉCURITÉ :
//   - Cookie signé HMAC-SHA256 avec AUTH_SECRET → impossible à forger côté
//     client (un attaquant qui pose son propre cookie sans connaître le
//     secret obtient une signature invalide).
//   - TTL court (5 min) → minimise la fenêtre d'abus si jamais le secret
//     fuite.
//   - httpOnly + sameSite=lax + secure (en prod) → pas de XSS possible.
//   - Une seule "raison" reconnue : "community-learner". Pas de paramètres
//     attaqueur-contrôlés.

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "humanix-signup-intent";
// 15 min : suffit pour OAuth (≈ 1 min) ET pour magic link (réception email
// + clic). Au-delà, l'user se reconnecte sur /inscription.
const COOKIE_TTL_SECONDS = 15 * 60;
const INTENT_VERSION = "v1";

/** Le seul "intent" reconnu aujourd'hui. Si on en ajoute (ex : tenant payant
 * pré-créé), faire évoluer cette union plutôt que d'accepter du free-form. */
export type InscriptionIntent = "community-learner";

const VALID_INTENTS: ReadonlySet<string> = new Set<string>([
  "community-learner",
]);

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (min 16 chars). Cookie d'intention impossible.",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function buildCookieValue(intent: InscriptionIntent): string {
  const issuedAt = Date.now().toString();
  const payload = `${INTENT_VERSION}.${intent}.${issuedAt}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function parseCookieValue(value: string): {
  intent: string;
  issuedAtMs: number;
} | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [version, intent, issuedAtStr, providedSig] = parts;
  if (version !== INTENT_VERSION) return null;
  if (!VALID_INTENTS.has(intent)) return null;
  const issuedAtMs = Number(issuedAtStr);
  if (!Number.isFinite(issuedAtMs)) return null;
  const expectedSig = sign(`${version}.${intent}.${issuedAtStr}`);
  // Comparaison constant-time anti-timing-attack.
  const a = Buffer.from(expectedSig);
  const b = Buffer.from(providedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { intent, issuedAtMs };
}

/**
 * Pose le cookie d'intention. À appeler dans une server action / route handler
 * avant le redirect vers le provider OAuth.
 */
export async function setInscriptionIntent(
  intent: InscriptionIntent,
): Promise<void> {
  const value = buildCookieValue(intent);
  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_TTL_SECONDS,
  });
}

/**
 * Lit + valide le cookie. Renvoie l'intent si valide ET non expiré, sinon null.
 */
export async function readInscriptionIntent(): Promise<InscriptionIntent | null> {
  const jar = await cookies();
  const c = jar.get(COOKIE_NAME);
  if (!c?.value) return null;
  const parsed = parseCookieValue(c.value);
  if (!parsed) return null;
  const ageSeconds = (Date.now() - parsed.issuedAtMs) / 1000;
  if (ageSeconds > COOKIE_TTL_SECONDS) return null;
  if (ageSeconds < 0) return null; // clock skew futur = suspect
  return parsed.intent as InscriptionIntent;
}

/**
 * Supprime le cookie. À appeler après consommation réussie pour empêcher
 * la réutilisation (defense in depth, le TTL fait le reste).
 */
export async function clearInscriptionIntent(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// Export interne pour les tests.
export const __test__ = {
  buildCookieValue,
  parseCookieValue,
  COOKIE_NAME,
  COOKIE_TTL_SECONDS,
};
