// SPDX-License-Identifier: AGPL-3.0-or-later
// Detection / masking de PII (donnees personnelles) dans les chaines de texte.
//
// Usage principal :
//   - Filtrage des messages user envoyes a Hex Chat (Mistral) :
//     l'humain peut copier-coller son IBAN/numero de tel par reflexe,
//     on doit eviter de l'envoyer a l'IA tierce.
//   - Pre-stockage des conversations en DB : on masque avant insert.
//   - Pre-export RGPD : on masque les blocs free-text avant export.
//
// Philosophie :
//   - Detect best-effort, pas de promesse de detection 100% (impossible).
//   - On preserve la structure du texte (`{redacted-email}`) pour ne
//     pas casser le sens, juste masquer le secret.
//   - On retourne aussi la LISTE des PII detectes pour pouvoir afficher
//     un warning UX cote chat ("Tu as inclus un IBAN, je l'ai masque").
//
// Patterns couverts :
//   - Email (RFC 5322 simplifie)
//   - Telephone FR (06/07 + format international +33)
//   - IBAN (verification structure FR + checksum optionnel)
//   - SIREN (9 chiffres)
//   - SIRET (14 chiffres)
//   - NIR / numero de securite sociale (15 chiffres, format strict FR)
//   - Carte bancaire (16 chiffres avec Luhn)
//
// Anti-faux-positifs :
//   - Word-boundary strict pour les chiffres (evite de masquer un
//     timestamp Unix 10 chiffres).
//   - IBAN exige le prefixe FR + checksum coherent.

export type PiiType =
  | "email"
  | "phone_fr"
  | "iban"
  | "siren"
  | "siret"
  | "nir"
  | "credit_card";

export type PiiHit = {
  type: PiiType;
  /** Valeur detectee (deja masquee dans le retour). */
  match: string;
  /** Position de debut dans la chaine d'origine. */
  index: number;
};

export type PiiScanResult = {
  /** True si au moins un PII a ete detecte. */
  hasPii: boolean;
  /** Liste detaillee des PII trouves (avec leur type et position). */
  hits: PiiHit[];
  /** Le texte avec les PII remplaces par des placeholders. */
  redacted: string;
};

// Patterns ordonne par priorite (plus specifiques en premier pour
// eviter qu'un IBAN ne matche d'abord en tant que sequence de chiffres
// type SIRET).
type PiiPattern = {
  type: PiiType;
  /**
   * Regex avec capture group au besoin. DOIT etre `g` (global) car on
   * itere via matchAll.
   */
  regex: RegExp;
  /**
   * Validation supplementaire facultative (Luhn pour CB, structure
   * IBAN, etc.). Retourne true si le match est legitime.
   */
  validate?: (raw: string) => boolean;
  /** Placeholder de masking. */
  redactWith: string;
};

const PATTERNS: PiiPattern[] = [
  // Email (RFC 5322 simplifie : pas de quoted-string, pas d'IP literal)
  {
    type: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    redactWith: "{redacted-email}",
  },
  // IBAN FR : "FR" + 25 caracteres alphanum (espaces tolerees)
  // Validation : checksum mod 97 = 1
  {
    type: "iban",
    regex: /\bFR\d{2}(?:\s?[A-Z0-9]){23}\b/g,
    validate: (raw) => validateIbanMod97(raw.replace(/\s/g, "")),
    redactWith: "{redacted-iban}",
  },
  // Carte bancaire : 13 a 19 chiffres avec separateurs optionnels
  // Validation Luhn obligatoire (evite de masquer un IBAN ou autre)
  {
    type: "credit_card",
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    validate: (raw) => luhnCheck(raw.replace(/[\s-]/g, "")),
    redactWith: "{redacted-card}",
  },
  // NIR / Numero de securite sociale FR : 13 chiffres + 2 chiffres de cle
  // Format : SAA MM CC CCC XXX KK (15 chiffres total)
  {
    type: "nir",
    regex: /\b[12]\d{2}(?:0[1-9]|1[0-2])\d{2}\d{3}\d{3}\d{2}\b/g,
    redactWith: "{redacted-nir}",
  },
  // SIRET : 14 chiffres (SIREN + 5 NIC)
  {
    type: "siret",
    regex: /\b\d{14}\b/g,
    redactWith: "{redacted-siret}",
  },
  // SIREN : 9 chiffres
  {
    type: "siren",
    regex: /\b\d{9}\b/g,
    redactWith: "{redacted-siren}",
  },
  // Telephone FR : 06/07 + 8 chiffres, ou +33 + 9 chiffres, ou 01-05/08-09 fixes
  // Tolere espaces, points, tirets entre paires
  {
    type: "phone_fr",
    regex:
      /(?:\+33\s?[1-9](?:[\s.-]?\d{2}){4}|\b0[1-9](?:[\s.-]?\d{2}){4})\b/g,
    redactWith: "{redacted-phone}",
  },
];

/**
 * Scanne un texte pour detecter et masquer les PII.
 *
 * NB : on applique les patterns dans l'ordre defini (specifiques en
 * premier). Les zones deja masquees ne sont pas re-scannees.
 *
 * Performance : pour des textes < 10 ko (cas Hex Chat), c'est < 1 ms.
 * Pas d'optimisation prematuree.
 */
export function scanPii(input: string): PiiScanResult {
  if (typeof input !== "string" || input.length === 0) {
    return { hasPii: false, hits: [], redacted: input ?? "" };
  }

  const hits: PiiHit[] = [];
  let redacted = input;

  for (const pattern of PATTERNS) {
    // Re-scan depuis le texte deja redacte pour eviter d'overlap les
    // matches (ex: un email contient "@" qui pourrait casser un regex
    // suivant).
    const matches = [...redacted.matchAll(pattern.regex)];
    if (matches.length === 0) continue;

    // Reconstruit la chaine en remplacant chaque match valide
    let result = "";
    let lastIndex = 0;
    for (const m of matches) {
      const start = m.index ?? -1;
      if (start < 0) continue;
      const raw = m[0];

      // Validation custom (Luhn, IBAN mod97...) — sinon on accepte
      if (pattern.validate && !pattern.validate(raw)) {
        continue;
      }

      result += redacted.slice(lastIndex, start);
      result += pattern.redactWith;
      hits.push({
        type: pattern.type,
        match: raw,
        index: start,
      });
      lastIndex = start + raw.length;
    }
    result += redacted.slice(lastIndex);
    redacted = result;
  }

  return {
    hasPii: hits.length > 0,
    hits,
    redacted,
  };
}

/**
 * Indique simplement si le texte contient au moins un PII (sans masking).
 * Plus rapide que scanPii() pour un check booleen.
 */
export function containsPii(input: string): boolean {
  if (typeof input !== "string" || input.length === 0) return false;
  for (const pattern of PATTERNS) {
    const matches = input.matchAll(pattern.regex);
    for (const m of matches) {
      if (!pattern.validate || pattern.validate(m[0])) return true;
    }
  }
  return false;
}

/**
 * Construit une description humaine des PII detectes pour l'UI.
 * Ex : "1 email, 2 numéros de téléphone".
 */
export function describePiiHits(hits: PiiHit[]): string {
  if (hits.length === 0) return "";
  const counts: Record<PiiType, number> = {
    email: 0,
    phone_fr: 0,
    iban: 0,
    siren: 0,
    siret: 0,
    nir: 0,
    credit_card: 0,
  };
  for (const h of hits) counts[h.type] += 1;

  const labels: Record<PiiType, [string, string]> = {
    email: ["email", "emails"],
    phone_fr: ["numéro de téléphone", "numéros de téléphone"],
    iban: ["IBAN", "IBAN"],
    siren: ["SIREN", "SIREN"],
    siret: ["SIRET", "SIRET"],
    nir: ["numéro de Sécurité sociale", "numéros de Sécurité sociale"],
    credit_card: ["carte bancaire", "cartes bancaires"],
  };

  const parts: string[] = [];
  for (const [type, count] of Object.entries(counts) as [PiiType, number][]) {
    if (count === 0) continue;
    const [singular, plural] = labels[type];
    parts.push(`${count} ${count === 1 ? singular : plural}`);
  }
  return parts.join(", ");
}

// ============================================================================
// Validateurs internes
// ============================================================================

/**
 * Valide une chaine IBAN par checksum mod 97.
 * Cf. ISO 13616. Algo :
 *   1. Deplacer les 4 premiers caracteres (pays + cle) a la fin
 *   2. Remplacer chaque lettre par sa position alphabetique + 9
 *      (A=10, B=11, ..., Z=35)
 *   3. Si le nombre resultant mod 97 == 1, l'IBAN est valide
 *
 * Exporte pour testabilite.
 */
export function validateIbanMod97(iban: string): boolean {
  if (typeof iban !== "string") return false;
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false;

  // Move first 4 chars to the end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // Convert letters to digits
  let numeric = "";
  for (const ch of rearranged) {
    if (ch >= "0" && ch <= "9") {
      numeric += ch;
    } else {
      // A=10 ... Z=35
      const code = ch.charCodeAt(0) - "A".charCodeAt(0) + 10;
      if (code < 10 || code > 35) return false;
      numeric += String(code);
    }
  }

  // Compute mod 97 in chunks to avoid bigint
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/**
 * Algorithme de Luhn (mod 10) pour valider les numeros de carte
 * bancaire (et autres identifiants utilisant Luhn).
 *
 * Exporte pour testabilite.
 */
export function luhnCheck(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let doubleNext = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (doubleNext) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleNext = !doubleNext;
  }
  return sum % 10 === 0;
}
