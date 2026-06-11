// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Vérification de mot de passe via HIBP Pwned Passwords en k-ANONYMITY.
//
// CE FICHIER EST CLIENT-SAFE : il utilise la Web Crypto API (crypto.subtle),
// PAS node:crypto. Il est conçu pour tourner DANS LE NAVIGATEUR de
// l'utilisateur. Le mot de passe n'est JAMAIS envoyé nulle part :
//
//   1. Le navigateur calcule SHA-1(password) localement.
//   2. Seuls les 5 PREMIERS caractères du hash (le "préfixe") sont envoyés
//      à l'API HIBP. Avec 5 hex chars, ~des centaines de hashes partagent le
//      même préfixe -> k-anonymat : HIBP ne peut pas savoir lequel est le tien.
//   3. HIBP renvoie tous les suffixes connus pour ce préfixe + leur compteur.
//   4. La comparaison du suffixe se fait LOCALEMENT dans le navigateur.
//
// => Le mot de passe complet, et même son hash complet, ne quittent jamais
//    l'appareil. C'est la seule dépendance "US" (HIBP/Cloudflare) du module,
//    et elle ne voit aucune donnée exploitable.
//
// Réf : https://haveibeenpwned.com/API/v3#PwnedPasswords

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

export type PwnedResult =
  | { ok: true; pwned: boolean; count: number }
  | { ok: false; error: "empty" | "crypto_unavailable" | "network" };

/**
 * Calcule SHA-1 d'une chaîne et renvoie le hash en hex MAJUSCULE.
 * Utilise crypto.subtle (dispo navigateur + Node 20+ via globalThis.crypto).
 */
async function sha1Hex(input: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const data = new TextEncoder().encode(input);
  const digest = await subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Vérifie si un mot de passe apparaît dans les fuites connues (HIBP).
 * À appeler CÔTÉ CLIENT. Renvoie le nombre d'occurrences (0 = jamais vu).
 *
 * @param password Le mot de passe en clair — ne quitte jamais le navigateur.
 */
export async function checkPasswordPwned(
  password: string,
): Promise<PwnedResult> {
  if (!password) return { ok: false, error: "empty" };

  const hash = await sha1Hex(password);
  if (!hash) return { ok: false, error: "crypto_unavailable" };

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      method: "GET",
      // "Add-Padding" renvoie des faux suffixes pour brouiller l'analyse
      // de taille de réponse (défense en profondeur sur le k-anon).
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return { ok: false, error: "network" };

    const body = await res.text();
    // Chaque ligne : "SUFFIX:COUNT". Padding => count=0 à ignorer.
    for (const line of body.split("\n")) {
      const [lineSuffix, countStr] = line.trim().split(":");
      if (lineSuffix === suffix) {
        const count = parseInt(countStr ?? "0", 10);
        return { ok: true, pwned: count > 0, count: count > 0 ? count : 0 };
      }
    }
    // Suffixe absent => mot de passe jamais vu dans les fuites HIBP.
    return { ok: true, pwned: false, count: 0 };
  } catch {
    return { ok: false, error: "network" };
  }
}
