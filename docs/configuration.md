# Configuration — Référence complète des variables d'environnement

Ce document liste toutes les variables d'environnement supportées par
Humanix Académie Community Edition, avec leur usage, leur valeur par défaut,
et leur statut (requise ou optionnelle).

Les variables sont chargées depuis `.env` (et `.env.local` en développement)
au démarrage de l'application.

---

## Variables requises

Ces 5 variables doivent **obligatoirement** être renseignées pour que
l'application démarre correctement.

### `DATABASE_URL`

URL de connexion PostgreSQL. Format standard libpq.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

| Param            | Exemple                                         | Notes                                                  |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `USER`           | `humanix`                                       | Utilisateur PostgreSQL dédié, droits limités à la base |
| `PASSWORD`       | `un-mot-de-passe-fort`                          | URL-encoded si caractères spéciaux                     |
| `HOST`           | `postgres` (Docker) ou `localhost` (bare-metal) |                                                        |
| `PORT`           | `5432`                                          | Port standard PostgreSQL                               |
| `DATABASE`       | `humanix`                                       | Nom de la base, créée préalablement                    |
| `?schema=public` | obligatoire                                     | Prisma utilise le schema `public` par défaut           |

**Bonnes pratiques** :

- Ne JAMAIS exposer ce port sur Internet
- Utiliser un user dédié sans privilège `CREATE`/`DROP` en production
- Pour managed DB (RDS, Scaleway DB) : ajouter `?sslmode=require`

### `AUTH_SECRET`

Secret de signature des tokens de session NextAuth. Doit être aléatoire,
imprévisible, et identique entre tous les pods en mode multi-instance.

```env
AUTH_SECRET="...32+ caractères aléatoires base64..."
```

**Génération** :

```bash
openssl rand -base64 32
# Exemple : Iqx9Ot/tCBmrFqkAcLqxdj9DZpvEBALMqoqW2Bxxxxx=
```

**Important** :

- 32 caractères minimum
- Régénérer = invalider toutes les sessions existantes (déconnecte tous les utilisateurs)
- Ne JAMAIS commiter en git (gitignore couvre `.env`)
- Stocker dans un secret manager en production

### `AUTH_URL`

URL publique canonique de ton instance. Utilisée par NextAuth pour les
redirections OAuth et les liens dans les emails magic link.

```env
AUTH_URL="https://academie.tonentreprise.fr"
```

Doit correspondre exactement à `NEXT_PUBLIC_APP_URL` (sans slash final).

### `NEXT_PUBLIC_APP_URL`

URL publique côté client (utilisée pour générer les URLs absolues dans le DOM,
les emails transactionnels, les exports PDF, etc.).

```env
NEXT_PUBLIC_APP_URL="https://academie.tonentreprise.fr"
```

| Environnement       | Valeur typique                              |
| ------------------- | ------------------------------------------- |
| Développement local | `http://localhost:3000`                     |
| Staging             | `https://staging.academie.tonentreprise.fr` |
| Production          | `https://academie.tonentreprise.fr`         |

### `NEXT_PUBLIC_APP_NAME`

Nom affiché dans le titre des onglets, dans les emails et dans le footer.
Permet le rebranding interne sans modifier le code.

```env
NEXT_PUBLIC_APP_NAME="Humanix Académie"
```

---

## Variables fortement recommandées

### `SCALEWAY_TEM_TOKEN`

Clé API du service [Scaleway TEM](https://resend.com) pour envoyer les emails
transactionnels (magic links, notifications, rapports).

```env
SCALEWAY_TEM_TOKEN="re_xxxxxxxxxxxxxxxxxxxxx"
```

**Sans cette clé** :

- Les magic links ne sont pas envoyés (utilisateurs ne peuvent pas se
  connecter sauf via SSO ou en mode `DEMO_MODE=true`)
- Les rappels automatiques ne fonctionnent pas

**Alternative** : adapte `lib/email.ts` pour utiliser un autre provider
(SendGrid, Mailgun, SMTP standard via Nodemailer, etc.).

### `EMAIL_FROM`

Adresse expéditeur des emails transactionnels.

```env
EMAIL_FROM="noreply@academie.tonentreprise.fr"
```

**Pré-requis** :

- Domaine vérifié dans Scaleway TEM (SPF + DKIM configurés)
- Pour les domaines custom : configurer DMARC à `quarantine` minimum

---

## Variables optionnelles

### `DEMO_MODE`

Active le mode démo : connexion 1-clic via `/demo`, pas de magic link envoyé.

```env
DEMO_MODE="false"   # Production
DEMO_MODE="true"    # Démo / dev local
```

**À NE JAMAIS activer en production** avec de vraies données utilisateurs.

### `DEMO_PUBLIC` (Q3 2026)

Active le mode démo publique sans login pour l'instance de démonstration
dédiée. À **n'activer que sur l'instance de démo**, jamais en prod
avec de vrais utilisateurs.

```env
DEMO_PUBLIC="false"  # Défaut (production)
DEMO_PUBLIC="true"   # Instance de démonstration uniquement
```

Voir `00_Business_Strategie/05_Pivot_OSS_Mai_2026/04_DEMO_PUBLIQUE_SPEC.md`
pour les détails (hors repo public).

### `MISTRAL_API_KEY`

Clé API [Mistral AI](https://mistral.ai) pour les features IA souveraines :

- Phishing personnalisé par employé (palier Pro+)
- IA Coach Hex (palier Pro+)
- Génération d'anecdotes cyber (admin)

```env
MISTRAL_API_KEY="..."
MISTRAL_MODEL="mistral-large-latest"  # par défaut
```

**Sans cette clé** : ces features sont désactivées silencieusement (UI grisée
avec message d'upsell).

### Connecteurs SSO (optionnels, palier Essentielle+)

```env
# Microsoft 365 / Entra ID
AUTH_MICROSOFT_ENTRA_ID="<client-id>"
AUTH_MICROSOFT_ENTRA_SECRET="<client-secret>"
AUTH_MICROSOFT_ENTRA_TENANT_ID="<tenant-id>"

# Google Workspace
AUTH_GOOGLE_ID="<client-id>"
AUTH_GOOGLE_SECRET="<client-secret>"
```

Configuration SSO : voir [docs/sso.md] (à venir Sprint 5).

### Observabilité

```env
# Sentry (error tracking)
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ENVIRONMENT="production"  # ou staging, development

# Plausible Analytics (RGPD-friendly, self-hosted recommandé)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="academie.tonentreprise.fr"
NEXT_PUBLIC_PLAUSIBLE_API_HOST="https://plausible.tonentreprise.fr"

# OpenTelemetry (traces)
OTEL_EXPORTER_OTLP_ENDPOINT="http://collector:4318"
OTEL_SERVICE_NAME="humanix-academie"
```

### Storage (uploads modules contributeurs)

Si tu actives la marketplace de modules contribués (palier Pro+) avec médias,
configure un stockage compatible S3.

```env
S3_ENDPOINT="https://s3.fr-par.scw.cloud"
S3_REGION="fr-par"
S3_ACCESS_KEY_ID="SCW..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET="humanix-uploads"
S3_PUBLIC_URL="https://humanix-uploads.s3.fr-par.scw.cloud"
```

Providers supportés et testés :

- **Scaleway Object Storage** (recommandé, FR/EU souverain)
- **OVHcloud Object Storage**
- **AWS S3**
- **MinIO** self-hosted
- **Cloudflare R2**

### TTS (Text-to-Speech, palier Pro+)

```env
TTS_PROVIDER="azure"     # azure | google | elevenlabs | local
TTS_API_KEY="..."
TTS_REGION="francecentral"
TTS_MIN_PLAN="pro"       # paliers requis pour activer le TTS
```

### Webhooks (palier Essentielle+)

```env
# Secret de signature des webhooks sortants (HMAC-SHA256)
WEBHOOK_SECRET="<32+ caractères>"

# Timeout requête webhook (ms)
WEBHOOK_TIMEOUT_MS="5000"

# Nombre de retry en cas d'échec
WEBHOOK_MAX_RETRIES="3"
```

### Rate limiting

```env
# Limite globale de requêtes par IP par minute
RATE_LIMIT_PER_MINUTE="120"

# Limite spécifique aux endpoints d'auth
RATE_LIMIT_AUTH_PER_MINUTE="10"
```

---

## Variables de développement

### `NODE_ENV`

```env
NODE_ENV="production"   # Défaut en build
NODE_ENV="development"  # Développement local (watch mode, sourcemaps verbeux)
NODE_ENV="test"         # Tests (CI)
```

### `PRISMA_LOG_LEVEL`

```env
PRISMA_LOG_LEVEL="info"   # Défaut
PRISMA_LOG_LEVEL="query"  # Affiche toutes les requêtes SQL (DEBUG ONLY)
```

**Ne JAMAIS** activer `query` en production : performance + risque de fuite
de données dans les logs.

### `LOG_LEVEL`

```env
LOG_LEVEL="info"   # Défaut production
LOG_LEVEL="debug"  # Verbose pour debug
LOG_LEVEL="warn"   # Production sobre
```

---

## Migrations entre versions

Si tu mets à jour Humanix d'une version à une autre, certaines variables
peuvent changer (renommage, déprécation). Voir [upgrade.md](./upgrade.md)
section **Breaking changes** pour chaque release.

Le fichier `.env.example` du repo est toujours à jour avec la dernière
version — diff-le contre ton `.env` après chaque pull pour repérer les
nouvelles variables.

```bash
diff -u .env .env.example | grep "^[-+]"
```

---

## Stockage sécurisé des secrets

En production, **ne stocke pas** les secrets dans un fichier `.env` en clair
sur disque. Utilise un secret manager :

| Manager                 | Notes                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| **HashiCorp Vault**     | Standard de l'industrie, self-hosted ou Cloud                        |
| **AWS Secrets Manager** | Si déjà sur AWS                                                      |
| **Scaleway Secrets**    | Souverain FR, intégration native Scaleway                            |
| **Doppler**             | Cloud, simple, free tier généreux                                    |
| **Kubernetes Secrets**  | Si déploiement K8s, avec sealed-secrets ou external-secrets-operator |

Exemple avec Vault (extrait `entrypoint.sh`) :

```bash
export AUTH_SECRET="$(vault kv get -field=auth_secret humanix/prod)"
export DATABASE_URL="$(vault kv get -field=database_url humanix/prod)"
exec node node_modules/.bin/next start
```

---

## Validation des variables au démarrage

Humanix valide toutes les variables critiques au démarrage via Zod
(cf. `lib/env.ts`). Si une variable requise manque ou est mal formée,
l'application **refuse de démarrer** avec un message d'erreur clair :

```
✗ Configuration invalide :
  - DATABASE_URL : doit commencer par postgresql://
  - AUTH_SECRET : doit faire au moins 32 caractères

Voir docs/configuration.md pour la documentation complète.
```

C'est une protection **anti-déploiement-cassé** : préférable de planter au
démarrage que de tourner en mode dégradé silencieux.

---

## Aide

- Question sur une variable : [GitHub Discussions Q&A](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/q-a)
- Erreur au démarrage : [docs/faq.md](./faq.md) section troubleshooting
- Vulnérabilité de configuration : security@humanix-cybersecurity.fr
