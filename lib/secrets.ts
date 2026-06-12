// SPDX-License-Identifier: AGPL-3.0-or-later
//
// `lib/secrets` - interface unifiee de lecture des secrets de l'application.
//
// CONTEXTE :
// Humanix Academie consomme des secrets API tiers (MISTRAL_API_KEY,
// SCALEWAY_TEM_TOKEN, WEBHOOK_SECRET, MOLLIE_API_KEY, etc.).
// Aujourd'hui ils sont tous lus via `process.env.X` dispersé dans le code.
//
// Ce module introduit une couche d'abstraction pour preparer le terrain
// a une integration Vault / Scaleway Secret Manager / HashiCorp Vault
// SANS imposer cette migration aujourd'hui :
//
//   - Par defaut : `getSecret(name)` lit `process.env[name]` - comportement
//     identique a aujourd'hui, zero changement runtime.
//   - Un operateur peut, dans `instrumentation.ts` ou un bootstrap script,
//     enregistrer un resolver custom via `setSecretResolver()` qui interroge
//     un vault distant.
//   - Les forks AGPLv3 peuvent implementer le resolver de leur choix sans
//     toucher au code metier (qui n'utilise QUE `getSecret(name)`).
//
// AVANTAGE STRATEGIQUE :
//   Le jour ou un client Enterprise demande "rotation automatique de la
//   MISTRAL_API_KEY toutes les 30 minutes via Scaleway Secret Manager",
//   c'est UNE seule fonction a brancher dans `instrumentation.ts`.
//   Pas de chasse aux `process.env.X` dans 60 fichiers.
//
// PRINCIPES :
//   - Cache memoire process : on lit chaque secret une fois et on cache.
//     Le cache est invalidable via `invalidateSecret(name)` ou
//     `resetSecretCache()` pour les rotations.
//   - Logs minimaux : on ne log JAMAIS la valeur, seulement le nom +
//     succes/echec resolution (cf. audit trail).
//   - Mode strict optionnel : `getSecret(name, { required: true })`
//     throw si absent, sinon retourne undefined.
//
// USAGE (nouveaux call sites) :
//
//   import { getSecret } from "@/lib/secrets";
//
//   const apiKey = getSecret("MISTRAL_API_KEY", { required: true });
//
// USAGE (operateur qui veut Scaleway Secret Manager dans son fork) :
//
//   // dans instrumentation.ts :
//   import { setSecretResolver } from "@/lib/secrets";
//   import { fetchFromScalewaySecretManager } from "./my-vault";
//
//   setSecretResolver(async (name) => {
//     if (name.startsWith("MISTRAL_") || name.startsWith("MOLLIE_")) {
//       return fetchFromScalewaySecretManager(name);
//     }
//     return process.env[name]; // fallback env
//   });

/**
 * Resolver de secrets : signature standard.
 *
 * Peut etre synchrone (process.env) ou asynchrone (appel vault distant).
 * On expose 2 APIs (sync `getSecret` / async `getSecretAsync`) pour ne
 * pas forcer tous les call sites a devenir async.
 *
 * Si un resolver async est enregistre mais `getSecret` (sync) est appele,
 * on retourne la derniere valeur cachee (peut etre undefined au boot).
 */
export type SecretResolver = (
  name: string,
) => string | undefined | Promise<string | undefined>;

const DEFAULT_RESOLVER: SecretResolver = (name) => process.env[name];

let currentResolver: SecretResolver = DEFAULT_RESOLVER;
const cache = new Map<string, string | undefined>();

/**
 * Enregistre un resolver custom (appele en chargement de boot, typiquement
 * depuis `instrumentation.ts`). Reset le cache pour forcer une re-lecture.
 */
export function setSecretResolver(resolver: SecretResolver): void {
  currentResolver = resolver;
  cache.clear();
}

/**
 * Reset le cache (utile pour rotation de secrets manuelle).
 */
export function resetSecretCache(): void {
  cache.clear();
}

/**
 * Invalide UN secret precis dans le cache (utile pour rotation ciblee).
 */
export function invalidateSecret(name: string): void {
  cache.delete(name);
}

/**
 * Lit un secret de maniere synchrone.
 *
 * Comportement :
 *   1. Si le cache contient la valeur (meme undefined), on la retourne.
 *   2. Sinon on appelle le resolver courant. Si async, on retourne la
 *      valeur cachee precedente (= undefined la 1ere fois) ET on declenche
 *      la resolution en background pour les appels suivants.
 *   3. Si `required: true` et la valeur est falsy, on throw.
 *
 * Pour les usages au boot, prefere `getSecretAsync` qui attend.
 */
export function getSecret(
  name: string,
  options?: { required?: boolean },
): string | undefined {
  if (cache.has(name)) {
    const cached = cache.get(name);
    if (options?.required && !cached) {
      throw new Error(`secret_missing:${name}`);
    }
    return cached;
  }
  const result = currentResolver(name);
  if (result instanceof Promise) {
    // Async resolver : on declenche, on cache au resolve, on retourne
    // undefined pour ce premier appel (le suivant aura la valeur).
    void result.then((value) => {
      cache.set(name, value);
    });
    if (options?.required) {
      throw new Error(`secret_pending_async:${name}`);
    }
    return undefined;
  }
  cache.set(name, result);
  if (options?.required && !result) {
    throw new Error(`secret_missing:${name}`);
  }
  return result;
}

/**
 * Lit un secret de maniere asynchrone (utile au boot, ou avec un resolver
 * qui appelle Vault / Scaleway Secret Manager).
 */
export async function getSecretAsync(
  name: string,
  options?: { required?: boolean },
): Promise<string | undefined> {
  if (cache.has(name)) {
    const cached = cache.get(name);
    if (options?.required && !cached) {
      throw new Error(`secret_missing:${name}`);
    }
    return cached;
  }
  const result = await Promise.resolve(currentResolver(name));
  cache.set(name, result);
  if (options?.required && !result) {
    throw new Error(`secret_missing:${name}`);
  }
  return result;
}

/**
 * Indique si un secret est disponible (resolve a une valeur non-vide).
 * Sucre syntaxique pour les guards de feature-gating.
 */
export function hasSecret(name: string): boolean {
  const v = getSecret(name);
  return typeof v === "string" && v.length > 0;
}

/**
 * Permet aux tests d'isoler leur etat. Restaure le resolver par defaut.
 */
export function __resetForTests(): void {
  currentResolver = DEFAULT_RESOLVER;
  cache.clear();
}
