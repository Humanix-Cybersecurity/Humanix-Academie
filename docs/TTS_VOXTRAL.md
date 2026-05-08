# TTS — Synthèse vocale des modules

> Humanix supporte **deux backends TTS** au choix selon ton profil :
> Voxtral SaaS (qualité quasi-humaine, payant) ou Piper self-hosted
> (gratuit, AGPL-friendly). Plus un fallback Web Speech API navigateur
> automatique si aucun n'est configuré.

## TL;DR opérations

```bash
# 1. Choisir le provider via .env / docker-compose env
TTS_PROVIDER=voxtral             # ou "piper" ou "" (fallback navigateur)

# 2. Pour Voxtral : pré-rendre tous les modules (idempotent)
npm run tts:build                # ~10-15 min, ~$2.50, génère uniquement le manquant
npm run tts:build:dry            # liste sans appel API
npm run tts:build:force          # régénère tout (rare)
npm run tts:build -- --saison phishing  # une saison ciblée

# 3. Hygiène cache
npm run tts:prune                # liste les MP3 orphelins
npm run tts:prune:apply          # supprime
```

## Choix du backend

| Backend | Coût | Qualité | Infra | Quand l'utiliser |
|---|---|---|---|---|
| **`voxtral`** | $0.0001/mot ≈ $2.50/catalogue | ⭐⭐⭐⭐⭐ Marie 6 émotions | Aucune (SaaS) | Prod commerciale, démos prospects, demo.humanix |
| **`piper`** | Gratuit | ⭐⭐⭐ siwis-medium FR | Container Docker (`--profile piper`) | Self-hosters AGPL, conformité RGPD stricte, offline |
| `""` (vide) | Gratuit | ⭐⭐ dépendant du navigateur | Aucune | Dev local, tenants sans plan Pro+ |

Le composant `TTSButton` détecte le mode via `GET /api/tts/status` au mount
et bascule automatiquement sur Web Speech API si le serveur n'est pas
disponible (réseau coupé, plan trop bas, mode `""`).

## Mode Voxtral

```bash
# .env / docker-compose
TTS_PROVIDER="voxtral"
MISTRAL_API_KEY="sk-..."        # console.mistral.ai → API Keys
```

Le batch `npm run tts:build` :
- Lit les 54 MDX du catalogue dans `content/saisons/`
- Pour chaque épisode : extrait jusqu'à ~12 segments audio (intro, feedback de chaque choix, debrief, quiz)
- Hash content-addressed `sha256(model + marker + voice + text)` → idempotent
- Skippe ce qui est déjà en cache, génère uniquement le manquant
- Concurrency par défaut 5, retry/backoff sur 429/5xx
- Écrit dans `data/tts-cache/<2chars>/<hash>.mp3`
- Met à jour `data/tts-cache/manifest.json` (committed)

**Stratégie de mise à jour** :
- Tu ajoutes un nouveau MDX → `npm run tts:build` génère uniquement les nouveaux segments
- Tu modifies un MDX existant → le texte change → nouveau hash → régénération automatique de cet épisode (les anciens MP3 deviennent orphelins, à `tts:prune`)
- Tu changes une voix par défaut dans `lib/tts/segments.ts` → bumper `CACHE_VERSION_MARKER` dans `lib/tts/cache.ts` puis `npm run tts:build` régénère tout

## Mode Piper (self-host)

```bash
# .env / docker-compose
TTS_PROVIDER="piper"
TTS_SERVER_URL="http://tts:5500"

# Lancer le container Piper avec le profile dédié
docker compose --profile piper up -d
```

Caractéristiques :
- Voix unique : `fr_FR-siwis-medium` (femme FR, qualité acceptable)
- Container : 200-500 Mo RAM, ~1.5 CPU
- Latence : ~200-500 ms / phrase sur CPU moderne
- **Pas de batch nécessaire** : Piper synthétise au runtime, le cache se remplit au fil des clics utilisateurs (mêmes hashes/disque que Voxtral, mais avec `model="piper-fr_FR-siwis-medium"` pour disjoindre)

`npm run tts:build` refuse explicitement de tourner si `TTS_PROVIDER=piper`
— le batch n'a aucun intérêt pour Piper.

## Cache disque & volume Docker

Layout :

```
data/tts-cache/
├── manifest.json           ← COMMIT (texte ~30 Ko)
├── ab/abcd...mp3           ← gitignored (régénérables)
├── cd/cdef...mp3
└── ...
```

**Volume Docker** (`docker-compose.yml`) :

```yaml
services:
  app:
    volumes:
      - tts_cache:/app/data/tts-cache
volumes:
  tts_cache:
    driver: local
```

→ Le cache survit aux `docker compose up --build` et aux redéploiements.
Détruit uniquement par `docker compose down -v`.

**En prod (Ansible)** : le volume est déclaré dans le `docker-compose.prod.yml`
de l'infra privée. Premier déploiement : `docker compose exec app npm run tts:build`
(une fois, ~15 min). Déploiements suivants : le cache est déjà là, le batch
skippe instantanément.

## Architecture (mode Voxtral)

```
[Apprenant clique 🔊 "Écouter le scénario"]
        ▼
   <TTSButton text={scenario} />
        ▼ POST /api/tts/synthesize { text }
   /lib/tts/server-client.ts dispatch → providers/voxtral.ts
        ▼ sanitizeForTTS(text) → hash = sha256(model + marker + voice + text)
        ▼
   data/tts-cache/<2>/<hash>.mp3 ─── HIT ──► retour MP3 instantané
        │ MISS
        ▼
   POST api.mistral.ai/v1/audio/speech (avec retry/backoff)
        ▼
   Buffer reçu → écrit dans le cache → retourné au client
```

Hash batch == hash runtime → cache hit immédiat dès le premier clic
sur un épisode pré-généré.

## Voix Voxtral disponibles

6 voix françaises Marie (femme, ~30 ans), différenciées par émotion :

| Slug | Tags | Usage typique |
|---|---|---|
| `fr_marie_neutral`  | composed, steady       | **Défaut** : lecture didactique de cours, debrief |
| `fr_marie_curious`  | bright, probing        | Quiz, questions ouvertes, accroches |
| `fr_marie_happy`    | warm, radiant          | Feedback positif (bonne réponse) |
| `fr_marie_sad`      | muted, heavy           | Feedback didactique (mauvaise réponse, sans agressivité) |
| `fr_marie_excited`  | vibrant, bubbly        | Découverte, célébration |
| `fr_marie_angry`    | fierce, sharp          | Mise en situation alerte cyber, urgence |

Mapping segment → voix dans `lib/tts/segments.ts → defaultVoiceFor()`.

> Pas de voix masculine FR côté preset Voxtral. Si on en veut une, on peut
> utiliser `POST /v1/audio/voices` pour cloner une voix custom (sample
> 2-3 sec audio).

## Coûts et limites

| Paramètre | Valeur |
|---|---|
| Coût Voxtral | ~$0.0001 / mot |
| Catalogue complet | 54 modules × 12 segments = 662 segments, ~25 000 mots → **~$2.50** |
| Limite Voxtral / requête | 300 mots (chunk auto via `chunkText()`) |
| Concurrence batch | 5 par défaut (override via `--concurrency N`) |
| Rate limit Mistral | empirique : ~5 req/s, 429 occasionnels — retry/backoff exponentiel auto |
| Espace disque cache | ~80-100 Mo MP3 pour le catalogue complet |

## Idempotence et reprise

Le hash de cache inclut :
- le modèle (`voxtral-mini-tts-2603` ou `piper-fr_FR-siwis-medium`)
- le `CACHE_VERSION_MARKER` (`v1` actuellement)
- la voix
- le texte (post-sanitize)

Tout changement parmi ces 4 invalide le cache existant et force une
régénération du segment concerné. Un run interrompu (rate limit, réseau)
peut être repris : le manifest est sauvegardé toutes les 30 sec et après
chaque batch de 10 segments.

## Mise à jour quand on ajoute du contenu

```bash
# Cas 1 : nouvel épisode MDX ajouté à content/saisons/<saison>/
git add content/saisons/<saison>/<nouveau>.mdx
npm run tts:build              # génère UNIQUEMENT les segments du nouvel épisode
git add data/tts-cache/manifest.json
git commit -m "feat(content): add <nouveau> + TTS"

# Cas 2 : modification d'un épisode existant
# Le texte change → nouveau hash → régénération auto de cet épisode
npm run tts:build              # idempotent, génère uniquement le diff
npm run tts:prune              # liste les MP3 obsolètes (les anciens hashes)
npm run tts:prune:apply        # supprime
```

## Migration depuis Piper (mai 2026)

Avant : un container `humanix-tts:1.0.0` (Piper) tournait toujours, exposé
via `TTS_SERVER_URL=http://tts:5500`.

Après :
- Le container Piper est **conservé** mais derrière `--profile piper`
  (n'est plus démarré par défaut sur `docker compose up`)
- Le code `infra/tts/` est conservé en l'état
- Le mapping voice `fr_FR-siwis-medium` → `fr_marie_neutral` (Voxtral) est
  géré par `LEGACY_VOICE_MAP` dans `providers/voxtral.ts`
- Variable historique `TTS_SERVER_URL` toujours active si `TTS_PROVIDER=piper`

## Debug

```bash
# Voir le manifest courant
jq '. | {model, generatedAt, count: (.segments | length)}' data/tts-cache/manifest.json

# Lister les segments d'un épisode
jq '.segments | with_entries(select(.key | startswith("mots-de-passe/01-")))' data/tts-cache/manifest.json

# Tester un hash manuellement (dev server lancé)
HASH=$(jq -r '.segments["mots-de-passe/01-collection-postit/intro"].hash' data/tts-cache/manifest.json)
curl -s -o /tmp/test.mp3 -w "%{http_code} %{size_download}\n" http://localhost:3000/api/tts/$HASH
open /tmp/test.mp3

# Vérifier le provider actif (dev server lancé, session active)
curl -s http://localhost:3000/api/tts/status | jq

# Forcer la régénération d'une saison
npm run tts:build:force -- --saison mots-de-passe
```

## Liens utiles

- Doc API Mistral TTS : https://docs.mistral.ai/studio-api/audio/text_to_speech
- Console Mistral (clés, usage) : https://console.mistral.ai
- Doc Piper : https://github.com/rhasspy/piper
- Voix Piper FR : https://huggingface.co/rhasspy/piper-voices
