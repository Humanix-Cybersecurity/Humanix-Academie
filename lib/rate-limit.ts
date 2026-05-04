// Rate limiter in-memory simple (sliding window).
// Suffisant pour les endpoints API peu sollicites.
// Pour du multi-instance, remplacer par Redis ou la table Event.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Verifie + decremente un bucket.
 * Retourne `{ ok: true }` si la requete est dans la limite, `{ ok: false, retryAfter }` sinon.
 *
 * @param key cle unique (ex: `evidence-export:tenant_xxx`)
 * @param limit nombre de requetes autorisees dans la fenetre
 * @param windowMs duree de la fenetre en ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true };
}

/**
 * Nettoyage periodique pour eviter une fuite memoire en environnement long.
 * A appeler depuis un cron interne ou apres chaque check si on veut.
 */
export function pruneRateLimitBuckets(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
      pruned += 1;
    }
  }
  return pruned;
}
