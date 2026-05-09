# Système de licence signée Humanix Cybersecurity

> Document technique · Version 1.0 · 4 mai 2026

Ce document décrit le système de licences signées Ed25519 utilisé par Humanix Académie pour activer les **features payantes en self-host**. Il complète [`OPEN_CORE.md`](./OPEN_CORE.md) qui couvre la philosophie open core.

---

## 1. À qui s'adresse ce document ?

- **Toi (Florian / Humanix Cybersecurity)** : pour générer et gérer les licences clients.
- **Tes clients self-host commerciaux** : pour installer la licence reçue.
- **Les contributeurs open source** : pour comprendre le mécanisme et savoir comment ils peuvent operer leur propre PKI dans un fork.

## 2. Pourquoi des licences signées ?

Humanix Académie est sous AGPLv3 - **le code complet est public**. Mais certaines features ont un coût opérationnel ou éditorial pour Humanix Cybersecurity (Pack NIS2 turnkey, IA Coach Mistral, marketplace modérée…). Le SaaS cloud les active selon le plan du tenant.

Pour le **self-host commercial** (Pro+ qui veulent héberger sur leur propre infra), on a besoin d'un mécanisme :

- ✅ qui **active les features** payantes après signature de contrat
- ✅ **sans exposer la base SaaS** à un client self-host
- ✅ **vérifiable hors-ligne** (le serveur self-host n'a pas à appeler Humanix à chaque request)
- ✅ avec **expiration auto** pour forcer le renouvellement
- ✅ **résistant à la falsification** (signature cryptographique)

→ La réponse : **licence Ed25519 signée par Humanix, vérifiée localement par l'app**.

## 3. Pourquoi Ed25519 ?

| Critère | Ed25519 | RSA-2048 | HMAC |
|---|---|---|---|
| Taille clé publique | 32 bytes | 256 bytes | N/A |
| Taille signature | 64 bytes | 256 bytes | 32 bytes |
| Signature = clé publique seule ? | ✅ | ✅ | ❌ |
| Vitesse vérification | ~0.05 ms | ~0.5 ms | ~0.001 ms |
| Standard moderne | ✅ | ✅ | ✅ |

Ed25519 est le standard moderne pour la signature de license. Il est natif dans `node:crypto` (pas de dep tiers), produit des signatures courtes (84 chars b64 url), et reste rapide à vérifier.

## 4. Format de licence

Une licence est une string :

```
HUMANIX-LICENSE-v1.<base64url(JSON_payload)>.<base64url(signature_Ed25519)>
```

Le payload JSON canonique :

```json
{
  "v": 1,
  "licenseId": "lic_abc123",
  "issuedTo": "Acme Corporation",
  "domain": "academie.acme.fr",
  "plan": "pro",
  "maxSeats": 100,
  "featuresOverride": [],
  "issuedAt": "2026-05-26T00:00:00Z",
  "expiresAt": "2027-05-26T00:00:00Z"
}
```

Champs :

| Champ | Description |
|---|---|
| `v` | Version du format (1 actuellement) |
| `licenseId` | Identifiant unique pour audit / révocation |
| `issuedTo` | Nom de l'organisation (texte libre, affiché dans UI) |
| `domain` | Cluster-lock : la licence n'est valide que pour ce domaine + sous-domaines. `null` pour licence globale. |
| `plan` | `starter` / `pro` / `enterprise` (anciens alias `decouverte`/`solo` → `starter`, `essentielle` → `pro`, `premium` → `enterprise`, `trial` → `starter` — normalisation gracieuse) |
| `maxSeats` | Sièges max (null = illimité) |
| `featuresOverride` | Whitelist explicite de features (vide = utilise le plan) |
| `issuedAt` / `expiresAt` | ISO 8601 UTC |

## 5. Côté Humanix Cybersecurity - émettre une licence

### 5.1 Setup initial (une fois)

```bash
# 1. Générer une paire de clés Ed25519
npm run licensing:keygen

# Cela crée humanix-license-keypair.json à la racine du repo (gitignored).
# Le fichier contient publicKeyPem + privateKeyPem au format PEM.
```

### 5.2 Stocker la clé privée en lieu sûr

**Critique** : la clé privée donne le pouvoir d'émettre n'importe quelle licence. Si elle fuite, tout le système est compromis.

- ✅ 1Password / Bitwarden / KeePass (vault chiffré)
- ✅ HSM matériel (YubiHSM 2, AWS CloudHSM)
- ❌ Email, Slack, Notion, Trello, Drive non-chiffré
- ❌ Repo git, même privé

### 5.3 Publier la clé publique

Copier le contenu de `publicKeyPem` (du JSON keypair) dans la constante `PUBLIC_KEY_PEM` de [`lib/license/public-key.ts`](../lib/license/public-key.ts), puis commit + push.

La clé publique est **publique par définition**. Un attaquant qui aurait la clé publique ne peut PAS forger de licences (il faut la clé privée).

### 5.4 Émettre une licence pour un client

```bash
# Exemple : Acme Corp, plan Pro, 100 sièges, 1 an, cluster-locked
npm run licensing:generate -- \
  --tenant="Acme Corporation" \
  --plan=pro \
  --seats=100 \
  --years=1 \
  --domain=academie.acme.fr

# Output : la string licence à transmettre à Acme.
# La transmettre par email signé / vault partagé / 1Password.
```

Pour une licence **globale** (sans cluster-lock) :

```bash
npm run licensing:generate -- --tenant="Beta SAS" --plan=enterprise --years=2
```

Pour des **features custom** (Enterprise atypique : "Pro + multi-site sans aller jusqu'à Premium") :

```bash
npm run licensing:generate -- \
  --tenant="Gamma Industries" \
  --plan=pro \
  --features=phishing,phishing_ia,marketplace,multi_site \
  --years=1
```

### 5.5 Inspecter / vérifier une licence

```bash
npm run licensing:inspect -- "HUMANIX-LICENSE-v1...."
npm run licensing:verify -- "HUMANIX-LICENSE-v1...."
```

## 6. Côté client - installer la licence

### 6.1 Self-host via Docker

Ajouter la variable d'environnement dans le `.env` :

```bash
HUMANIX_LICENSE_KEY="HUMANIX-LICENSE-v1.eyJ...."
```

Puis redémarrer :

```bash
docker compose restart app
```

### 6.2 Self-host bare-metal Node.js

```bash
export HUMANIX_LICENSE_KEY="HUMANIX-LICENSE-v1.eyJ...."
npm run start
```

### 6.3 Vérifier que la licence est active

L'app expose (à venir, PR séparée) une page `/admin/license` qui affiche :

- Plan actif
- Organisation
- Date d'expiration
- Domaine cluster-locked
- Features débloquées

Sans licence valide, l'app fonctionne en mode **Starter sub-tier free** (5 sièges, features de base seulement).

### 6.4 Renouvellement

Le système log un **warning à 14 jours** de l'expiration (cf. `verifyLicenseString` retourne `warning` dans le résultat).

À 0 jour : la licence est rejetée → fallback au plan DB du tenant. L'app continue de fonctionner mais les features Pro+ deviennent indisponibles.

Pour renouveler : nous écrire à `contact@humanix-cybersecurity.fr`.

## 7. Sécurité : limites assumées

⚠️ **Cette protection n'est PAS opposable légalement à un client AGPL motivé.**

L'AGPLv3 te garantit :
- ✅ Le client peut auditer le code et **patcher la vérification** (modifier `verifyLicenseString` pour qu'elle retourne toujours `valid: true`)
- ✅ S'il fait ça **et** opère le code en SaaS commercial, il **doit publier ses modifs** sous AGPLv3
- ✅ La marque "Humanix Académie" reste protégée par trademark

Donc le système de licence **dissuade le bypass casual** mais ne **protège pas du fork hostile déterminé**. C'est un compromis assumé du modèle open core.

**La vraie protection commerciale** vient de :

1. Le **service** (audit, formation, RSSI externalisé) - non-forkable
2. La **marque** (trademark déposé)
3. L'**infra cloud souveraine** Scaleway (le client préférerait payer ton SaaS plutôt que opérer un fork)
4. La **fraîcheur du contenu** pédagogique (modules avancés régulièrement actualisés par expert humain)

Cf. [`OPEN_CORE.md`](./OPEN_CORE.md) pour la philosophie complète.

## 8. Pour les forks AGPL : opérer ta propre PKI

Si tu fork Humanix Académie pour ton propre usage commercial (en respectant l'AGPL - tu publies tes modifs si tu opères en SaaS), tu peux **remplacer la PKI Humanix par la tienne** :

1. `npm run licensing:keygen` (ta paire de clés)
2. Remplacer `PUBLIC_KEY_PEM` dans `lib/license/public-key.ts`
3. Émettre tes propres licences avec `licensing:generate`

OU plus simple : **désactiver la vérification** (modifier `getEffectivePlan` dans `lib/license/index.ts` pour qu'il retourne directement le plan DB sans regarder la licence). C'est ce que beaucoup de community forks font. AGPL te le permet - c'est même l'esprit.

## 9. Implementation interne

| Fichier | Rôle |
|---|---|
| [`lib/license/types.ts`](../lib/license/types.ts) | Types `License`, `LicensePayload`, `LicenseError` |
| [`lib/license/format.ts`](../lib/license/format.ts) | Encode/decode du format texte |
| [`lib/license/sign.ts`](../lib/license/sign.ts) | Signature Ed25519 (CLI uniquement) |
| [`lib/license/verify.ts`](../lib/license/verify.ts) | Vérification (app runtime) |
| [`lib/license/cache.ts`](../lib/license/cache.ts) | Cache mémoire 5 min |
| [`lib/license/public-key.ts`](../lib/license/public-key.ts) | Clé publique embarquée |
| [`lib/license/index.ts`](../lib/license/index.ts) | API publique : `getActiveLicense()`, `isFeatureLicensed()` |
| [`lib/license/license.test.ts`](../lib/license/license.test.ts) | Tests Vitest (signature, falsification, expiration, domain) |
| [`scripts/license-tool.ts`](../scripts/license-tool.ts) | CLI keygen / generate / inspect / verify |
| [`lib/license/index.ts`](../lib/license/index.ts) | API publique : `getActiveLicense()`, **`getEffectivePlan(tenantId)`** (licence override > DB), `isFeatureLicensed()` |
| [`lib/plans.ts`](../lib/plans.ts) | `getTenantPlan(tenantId)` - pure DB, **client-safe** (pas de dépendance node:crypto) |

## 10. Roadmap

- **0.1** (cette PR) : core crypto + CLI + intégration plan-gating + tests
- **0.2** (PR séparée) : UI admin `/admin/license` (affichage, upload, warning expiration)
- **0.3** : page publique `/licensing` qui explique le système aux RSSI prospects
- **1.0** : intégration billing Stripe (auto-émission de licence après paiement Pro+)
- **2.0** (post-launch) : portail self-service de renouvellement / révocation

---

**Humanix Cybersecurity** · Crypto solide, AGPL transparente, monétisation par expertise.
