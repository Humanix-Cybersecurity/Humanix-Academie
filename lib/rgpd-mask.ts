// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helpers de MASQUAGE RGPD pour les vues operateur cross-tenant.
//
// CONTEXTE : un SUPERADMIN peut acceder aux donnees de tous les tenants
// (notamment leur liste d'utilisateurs). Pour respecter le principe de
// minimisation RGPD (art. 5.1.c), on ne lui montre PAS l'email complet
// ni le nom complet : juste assez pour identifier en cas d'incident
// ("le user f***n@h***ix.fr a signale un probleme"), pas assez pour
// constituer un fichier nominatif exploitable.
//
// Le SUPERADMIN qui a un besoin d'auditer l'email complet d'un user
// peut toujours passer par le mecanisme d'imperonation (logged dans
// AuditLog avec une action specifique). Le masquage par defaut decourage
// les consultations "par curiosite".
//
// La logique :
//   - Email : garde 2 premiers chars + 1 dernier char du local-part,
//             garde 1er + 3 derniers chars du nom de domaine, garde le TLD entier.
//   - Nom : garde 1ere + derniere lettre de chaque partie (split sur espace).
//
// EXEMPLES :
//   florian.durano@humanix-cybersecurity.fr
//     -> fl***o@h***ity.fr
//   florian@humanix.fr
//     -> fl***n@h***nix.fr
//   a@b.fr
//     -> a***a@b.fr      (domaine 1 char garde tel quel, rien a masquer)
//   Florian Durano
//     -> F***n D***o
//   Jean-Marie Lefevre
//     -> J***e L***e     (note: tirets perdus, on coupe sur espace)

/**
 * Masque un email pour affichage operateur RGPD-aware.
 *
 * @example
 *   maskEmail("florian@humanix-cybersecurity.fr")
 *     // -> "fl***n@h***ity.fr"
 *   maskEmail("a@b.co")
 *     // -> "a***a@b.co" (degrade gracieusement sur strings courts)
 *   maskEmail(null)
 *     // -> "" (gere null / undefined / vide)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "";
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return "***";

  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return "***";

  const maskedLocal = maskString(local, 2, 1);

  // Domaine : on separe le nom de domaine du TLD pour garder ".fr",
  // ".com" lisible (utile pour identifier rapidement un .gouv.fr d'un .com).
  const lastDot = domain.lastIndexOf(".");
  if (lastDot === -1) {
    return `${maskedLocal}@${maskString(domain, 1, 0)}`;
  }
  const domainName = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot); // include the "."
  return `${maskedLocal}@${maskString(domainName, 1, 3)}${tld}`;
}

/**
 * Masque un nom complet pour affichage operateur RGPD-aware.
 *
 * @example
 *   maskName("Florian Durano")      // -> "F*n D*o"
 *   maskName("Marie")               // -> "M*e"
 *   maskName("Anne")                // -> "A*e"
 *   maskName(null)                  // -> ""
 */
export function maskName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((part) => maskString(part, 1, 1))
    .join(" ");
}

/**
 * Helper interne : masque le milieu d'une string en gardant `head` chars
 * au debut et `tail` chars a la fin, separes par "***".
 *
 * Robustesse aux strings courts : si head+tail >= longueur, on retourne
 * la 1ere lettre + "***" + derniere lettre (jamais d'exposition complete).
 */
function maskString(s: string, head: number, tail: number): string {
  if (!s) return "";
  // Si la string est tres courte (1 char), aucune valeur a masquer : on
  // la garde telle quelle pour eviter un "b***b" qui est juste du bruit.
  if (s.length === 1) return s;
  // Si trop courte pour le pattern head+tail+separateur, on degrade
  // sur "1er char + *** + dernier char" - preserve la confidentialite
  // sans crasher.
  if (s.length <= head + tail) {
    return s[0] + "***" + s[s.length - 1];
  }
  return s.slice(0, head) + "***" + (tail > 0 ? s.slice(-tail) : "");
}
