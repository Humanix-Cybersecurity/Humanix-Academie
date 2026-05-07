// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers de manipulation d'erreurs typees.
//
// Pourquoi : `catch (e: any)` casse le type narrowing de TypeScript et
// laisse passer des bugs (ex: `e.message` sur une primitive). Le pattern
// recommande est `catch (e: unknown)` + type guards. Ces helpers
// reduisent la verbosite cote callers.

/**
 * Retourne un message d'erreur exploitable (pour logs / UI / response).
 * Tronque a 500 chars par defaut pour ne pas exploser les payloads.
 */
export function getErrorMessage(e: unknown, maxLength = 500): string {
  if (e instanceof Error) return e.message.slice(0, maxLength);
  if (typeof e === "string") return e.slice(0, maxLength);
  try {
    return String(e).slice(0, maxLength);
  } catch {
    return "[unknown error]";
  }
}

/**
 * Retourne le `name` d'une Error (utilise pour distinguer AbortError,
 * TypeError, etc. sans avoir a faire `e?.name`).
 */
export function getErrorName(e: unknown): string | null {
  if (e instanceof Error) return e.name;
  return null;
}

/**
 * Retourne le `code` (string ou number) d'une erreur Node-like
 * (ex: ENOENT, ECONNREFUSED). Renvoie null si non present.
 */
export function getErrorCode(e: unknown): string | null {
  if (
    e !== null &&
    typeof e === "object" &&
    "code" in e &&
    (typeof (e as { code: unknown }).code === "string" ||
      typeof (e as { code: unknown }).code === "number")
  ) {
    return String((e as { code: string | number }).code);
  }
  return null;
}

/**
 * True si l'erreur est un AbortError (fetch annule via AbortSignal).
 */
export function isAbortError(e: unknown): boolean {
  return getErrorName(e) === "AbortError";
}
