// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Validation stricte du SSID Wi-Fi pour le template quishing QR_FAKE_WIFI.
//
// CONTEXTE : Florian a demande de pouvoir personnaliser le nom du Wi-Fi
// affiche sur le poster du faux Wi-Fi (au lieu du "Humanix-Guest" hardcode).
// Cas d'usage : un admin tenant veut simuler un poster avec le SSID exact
// de leur entreprise reelle ("AcmeCorp-Guest") pour un effet pedagogique
// maximal.
//
// SURFACE DE RISQUE :
//
//   1. XSS si le SSID est affiche brut dans une page HTML (peu probable
//      car le poster est un PDF react-pdf, mais defense en profondeur)
//
//   2. INJECTION dans le format QR Wi-Fi standard
//      `WIFI:S:<ssid>;T:WPA;P:<pwd>;;` ou les caracteres `;`, `:`, `,`,
//      `\`, `"` doivent etre echappes. Bien qu'on n'emette pas ce format
//      aujourd'hui (le QR contient une URL), prudence anti-future.
//
//   3. SPOOFING via homoglyphes Unicode (cyrillique 'а' qui ressemble
//      a latin 'a'). Eviter en restreignant aux caracteres ASCII
//      imprimables d'un sous-ensemble strict.
//
//   4. SSID malicieux qui depasse 32 chars (limite IEEE 802.11). Au-dela,
//      certains drivers crashent ou tronquent.
//
//   5. CHARS DE CONTROLE (\n, \r, \t, \0) qui peuvent casser le rendu PDF
//      ou injecter dans des logs/headers.
//
// REGLE : whitelist STRICTE :
//   - 1 a 32 caracteres
//   - [a-zA-Z0-9 _.-] uniquement (alphanum + espace + underscore + tiret
//     + point)
//   - Pas en debut ni fin par un espace (trim)
//   - Pas d'espaces multiples consecutifs (collapse)
//   - Pas vide apres trim
//
// Rationnel du sous-ensemble :
//   - alphanum (a-z, A-Z, 0-9) : SSID standard
//   - espace : courant ("Acme Guest")
//   - underscore : courant ("acme_guest")
//   - tiret : tres courant ("Acme-Guest", "Free-Wifi")
//   - point : permet "Acme-Corp.io" ou "AC-2.4G"
//   - rien d'autre. Si un user veut un emoji ou un accent, il est invite
//     a utiliser une transliteration (les SSID exotiques sont rares en
//     entreprise reelle, et notre but est de simuler une affiche credible).

/**
 * Limite IEEE 802.11 du SSID (en octets ; comme on est en ASCII imprimable
 * strict, c'est equivalent au nombre de caracteres).
 */
export const SSID_MAX_LENGTH = 32;

/**
 * Whitelist regex compilee une fois.
 * Note : le test est applique APRES trim/collapse, donc pas besoin
 * d'autoriser le double-espace.
 */
const SSID_WHITELIST_RE = /^[a-zA-Z0-9 _.-]+$/;

export type SsidValidationResult =
  | { ok: true; value: string }
  | {
      ok: false;
      reason:
        | "empty"
        | "too_long"
        | "invalid_chars"
        | "wrong_type";
    };

/**
 * Valide et normalise un SSID Wi-Fi candidat.
 *
 * - Trim (debut/fin)
 * - Collapse des espaces multiples
 * - Whitelist stricte des chars
 * - Longueur 1-32
 *
 * @returns `{ ok: true, value }` avec le SSID normalise, ou `{ ok: false,
 *           reason }` avec un code d'erreur typed.
 *
 * @example
 *   validateWifiSsid("  Acme  Guest  ")  // -> { ok: true, value: "Acme Guest" }
 *   validateWifiSsid("Free-Wifi")        // -> { ok: true, value: "Free-Wifi" }
 *   validateWifiSsid("<script>")         // -> { ok: false, reason: "invalid_chars" }
 *   validateWifiSsid("")                 // -> { ok: false, reason: "empty" }
 *   validateWifiSsid("a".repeat(33))     // -> { ok: false, reason: "too_long" }
 */
export function validateWifiSsid(raw: unknown): SsidValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "wrong_type" };
  }

  // Trim + collapse espaces multiples
  const normalized = raw.trim().replace(/\s+/g, " ");

  if (normalized.length === 0) {
    return { ok: false, reason: "empty" };
  }

  if (normalized.length > SSID_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }

  if (!SSID_WHITELIST_RE.test(normalized)) {
    return { ok: false, reason: "invalid_chars" };
  }

  return { ok: true, value: normalized };
}

/**
 * Convertit une raison d'erreur en message FR pour l'UI.
 */
export function ssidValidationErrorMessageFr(
  reason: Exclude<SsidValidationResult, { ok: true }>["reason"],
): string {
  switch (reason) {
    case "empty":
      return "Le nom du Wi-Fi est obligatoire.";
    case "too_long":
      return `Le nom du Wi-Fi est trop long (max ${SSID_MAX_LENGTH} caractères).`;
    case "invalid_chars":
      return "Caractères non autorisés. Utilise uniquement lettres, chiffres, espace, point, tiret ou underscore.";
    case "wrong_type":
      return "Format invalide.";
  }
}

/**
 * SSID par defaut si l'admin n'en specifie pas un.
 */
export const DEFAULT_WIFI_SSID = "Humanix-Guest";
