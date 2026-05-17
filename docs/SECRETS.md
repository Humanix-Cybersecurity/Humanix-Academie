# Gestion des secrets — `lib/secrets`

> Document technique · Version 1.0 · 17 mai 2026
> Statut : interface livrée, **migration des call sites optionnelle**.

## Pourquoi ce document

Humanix Académie consomme des secrets API tiers : `MISTRAL_API_KEY`,
`SCALEWAY_TEM_TOKEN`, `WEBHOOK_SECRET`, `PAYPLUG_SECRET_KEY`, etc.

Aujourd'hui ils sont tous lus via `process.env.X` directement. Ça marche
en dev et en self-host simple, mais :

- ❌ Pas de rotation automatique
- ❌ Pas d'audit "qui lit quel secret quand"
- ❌ Difficile à plug sur Vault / Scaleway Secret Manager
- ❌ Si on veut surcharger 1 secret pour un test, il faut toucher `process.env`

Le module `lib/secrets.ts` introduit une **couche d'abstraction** sans
imposer de migration : par défaut, lit `process.env`, exactement comme avant.

## API

```ts
import {
  getSecret,
  getSecretAsync,
  hasSecret,
  setSecretResolver,
  resetSecretCache,
  invalidateSecret,
} from "@/lib/secrets";

// Lecture synchrone (cache memoire)
const apiKey = getSecret("MISTRAL_API_KEY"); // string | undefined
const apiKey = getSecret("MISTRAL_API_KEY", { required: true }); // throw si absent

// Lecture asynchrone (pour les resolvers Vault qui doivent attendre un fetch)
const apiKey = await getSecretAsync("MISTRAL_API_KEY");

// Helper de feature-gating
if (hasSecret("MISTRAL_API_KEY")) {
  // ...
}

// Rotation
invalidateSecret("MISTRAL_API_KEY"); // force la re-lecture au prochain appel
resetSecretCache(); // vide tout le cache
```

## Surcharger avec un vault distant

Si un opérateur veut brancher Scaleway Secret Manager / HashiCorp Vault /
AWS Secrets Manager, il modifie **un seul fichier** : `instrumentation.ts`
à la racine du projet.

### Exemple — Scaleway Secret Manager (souverain FR)

```ts
// instrumentation.ts
import { setSecretResolver } from "@/lib/secrets";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // En dev local : on garde process.env (fallback DEFAULT_RESOLVER)
  if (process.env.NODE_ENV !== "production") return;

  const { fetchSecretFromScaleway } = await import("./lib/vault/scaleway");

  setSecretResolver(async (name) => {
    // Seuls les secrets critiques sont en vault : les autres
    // (NEXT_PUBLIC_*, NODE_ENV, etc.) restent en env.
    const VAULTED = new Set([
      "MISTRAL_API_KEY",
      "WEBHOOK_SECRET",
      "PAYPLUG_SECRET_KEY",
      "S3_SECRET_ACCESS_KEY",
    ]);
    if (VAULTED.has(name)) {
      return await fetchSecretFromScaleway(name);
    }
    return process.env[name];
  });
}
```

### Exemple — HashiCorp Vault (self-host)

```ts
// instrumentation.ts
import { setSecretResolver } from "@/lib/secrets";
import vault from "node-vault";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const client = vault({
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  });

  setSecretResolver(async (name) => {
    try {
      const result = await client.read(`secret/data/humanix/${name}`);
      return result?.data?.data?.[name] ?? process.env[name];
    } catch {
      return process.env[name]; // fallback graceful
    }
  });
}
```

## Rotation de secrets

Pour une rotation **manuelle** :
```ts
import { invalidateSecret } from "@/lib/secrets";
invalidateSecret("MISTRAL_API_KEY"); // prochain getSecret() re-lira
```

Pour une rotation **automatique** (cron) :
```ts
// app/api/cron/rotate-secrets/route.ts
import { invalidateSecret } from "@/lib/secrets";

export async function GET() {
  // Le resolver (Vault) sera appele au prochain getSecret()
  invalidateSecret("MISTRAL_API_KEY");
  invalidateSecret("WEBHOOK_SECRET");
  return Response.json({ ok: true });
}
```

## Migration progressive des call sites

**Tu n'es PAS obligé de migrer.** Le code existant qui fait
`process.env.MISTRAL_API_KEY` continue de marcher tel quel.

Migration recommandée **seulement** quand :
- Un client demande Vault / Scaleway Secret Manager → migrer le sous-ensemble concerné.
- Un test a besoin de mocker un secret (plus propre que de toucher `process.env`).
- Un nouveau secret est ajouté → l'écrire d'emblée avec `getSecret`.

### Pattern recommandé

**Avant** :
```ts
// lib/ai/mistral.ts
const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) throw new Error("MISTRAL_API_KEY missing");
```

**Après** (équivalent) :
```ts
import { getSecret } from "@/lib/secrets";
const apiKey = getSecret("MISTRAL_API_KEY", { required: true });
```

C'est tout. Aucune autre modification de code nécessaire.

## Sécurité

- **Les valeurs ne sont JAMAIS loggées.** Seuls les noms et les statuts
  (success / missing / pending) le sont, dans l'audit trail.
- **Pas de transmission réseau** sauf si un resolver custom le fait
  explicitement. Le DEFAULT_RESOLVER est purement local (process.env).
- **Cache memoire process** : les secrets ne sont pas écrits sur disque.
  Au restart, le resolver est re-interrogé.
- **Mode strict (`required: true`)** : si un secret obligatoire est absent,
  on throw au boot plutôt que de tomber silencieusement.

## Tests

Couverts par `lib/secrets.test.ts` :
- Resolver par défaut (`process.env`)
- Cache memoire (1 lecture par secret)
- `invalidateSecret` / `resetSecretCache`
- `setSecretResolver` synchrone et asynchrone
- `hasSecret` pour feature-gating
- `__resetForTests` pour isolation

## Pourquoi pas HashiCorp Vault par défaut ?

Trois raisons :

1. **Coût ops** : Vault est un service à 100 % à opérer (HA, snapshots,
   unsealing). Inadapté pour une PME qui veut juste tourner Humanix.
2. **AGPLv3 cohérence** : forcer un Vault tiers en dépendance dur conflit
   avec "self-host en 10 minutes".
3. **Optionnel par design** : laisser l'opérateur choisir entre
   `process.env` (90 % des cas), Scaleway Secret Manager (cloud SaaS
   souverain), HashiCorp Vault (Enterprise on-premise), AWS Secrets
   Manager (multi-cloud), ou un wrapper custom.

## Roadmap interne (optionnelle)

Pas de timeline imposée. À déclencher quand un client le demande :

- [ ] Adapter Scaleway Secret Manager (`lib/vault/scaleway.ts`)
- [ ] Adapter HashiCorp Vault KV v2 (`lib/vault/hashicorp.ts`)
- [ ] Migrer les ~10 call sites de secrets API tiers vers `getSecret()`
- [ ] Audit log des lectures de secrets (qui, quand, succès/échec)
- [ ] Cron de rotation auto trimestrielle pour les secrets éligibles
