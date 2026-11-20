# Installation - Humanix Académie Community Edition

Ce guide te permet d'installer Humanix Académie en self-host sur ton
infrastructure. Trois modes sont supportés :

1. **Docker Compose** (recommandé pour la majorité des cas)
2. **Bare-metal** (Node.js + PostgreSQL natifs)
3. **Kubernetes** (production multi-nœuds)

Temps estimé : **10 à 30 minutes** selon le mode et ton expérience.

---

## Prérequis

| Composant                       | Version minimale                            | Recommandée      |
| ------------------------------- | ------------------------------------------- | ---------------- |
| **CPU**                         | 2 vCPU                                      | 4 vCPU           |
| **RAM**                         | 2 Go                                        | 4 Go             |
| **Disque SSD**                  | 5 Go                                        | 20 Go            |
| **OS hôte**                     | Linux 5.10+ / macOS 12+ / Windows 11 (WSL2) | Ubuntu 24.04 LTS |
| **Docker** (mode 1)             | 24.0+                                       | 26+              |
| **Docker Compose** (mode 1)     | v2.20+                                      | v2.27+           |
| **Node.js** (mode 2)            | 20.10+                                      | 20.x LTS         |
| **PostgreSQL** (mode 2)         | 14+                                         | 16               |
| **Redis** (optionnel, sessions) | -                                           | 7.2              |

---

## Mode 0 - Quickstart dev avec HTTPS local (3 minutes) ⚡

> Pour les développeurs qui veulent juste **lancer l'app localement** avec
> un certificat TLS valide (pas de warning "site non sécurisé" dans le
> browser, NextAuth fonctionne en HTTPS comme en prod).

```bash
git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie.git
cd humanix-academie
./scripts/start.sh
```

C'est tout. Le script :

1. **Détecte l'OS** (macOS / Linux)
2. **Vérifie Docker** (OrbStack ou Docker Desktop sur Mac, Docker Engine sur
   Linux). Propose l'installation via Homebrew / curl si manquant.
3. **Installe `mkcert`** (pour le certificat local trust-safe)
4. **Génère un cert TLS** signé par le CA local mkcert pour `humanix.local`
   - `localhost` (cf. `infra/haproxy/certs/`)
5. **Ajoute `127.0.0.1 humanix.local`** à `/etc/hosts` (avec sudo)
6. **Crée un `.env` minimal** en `DEMO_MODE=true` avec `AUTH_URL=https://humanix.local`
7. **Active la config HAProxy dev** (HTTPS sur 443 + redirect HTTP→HTTPS)
8. **Lance `docker compose up -d`** (avec override `docker-compose.dev.yml`)

À la fin, ouvre **`https://humanix.local`** dans ton browser. Aucune popup
"site non sécurisé" : le CA mkcert a été ajouté au trust store OS.

### Commandes utiles

```bash
./scripts/start.sh             # démarrage complet (idempotent)
./scripts/start.sh --restart   # rebuild + restart
./scripts/start.sh --stop      # arrête tous les containers
./scripts/start.sh --logs      # tail des logs en direct
./scripts/start.sh --reset     # ⚠️ détruit la BDD et redémarre from scratch
```

### Pourquoi HTTPS en dev ?

NextAuth v5 utilise des cookies `__Secure-*` qui ne fonctionnent **que sur
HTTPS**. Sans certificat valide, certains flows d'auth (magic link, OAuth
Google/Microsoft) cassent silencieusement. Le script `start.sh` reproduit
les conditions de prod (HTTPS + hostname dédié) avec un cert local trust-safe,
ce qui évite des heures de debug "ça marche en prod, pas en local".

### Notes par OS

**macOS** : OrbStack est recommandé (plus léger que Docker Desktop, intégration
native, ouverture instantanée). `brew install orbstack` puis lancer une fois
l'app pour init.

**Linux** : le script suppose Docker Engine + plugin Compose v2 (`docker compose`,
pas `docker-compose`). `mkcert` doit être installé manuellement (cf. instructions
affichées par le script).

**Windows** : utilise WSL2 + Ubuntu, puis lance `./scripts/start.sh` dedans.
Le script ne supporte pas PowerShell / cmd directement.

---

## Mode 1 - Docker Compose (recommandé)

C'est le mode le plus simple et le plus reproductible.

### Étape 1 - Clone le repo

```bash
git clone https://github.com/humanix-cybersecurity/humanix-academie.git
cd humanix-academie
```

### Étape 2 - Configure tes variables d'environnement

```bash
cp .env.example .env
```

Le compose lit ce fichier : tout ce que tu y poses arrive dans le conteneur
de l'application. Deux valeurs sont à générer, et la stack refuse de démarrer
tant qu'elles manquent :

```bash
openssl rand -base64 32   # pour AUTH_SECRET
openssl rand -hex 24      # pour POSTGRES_PASSWORD
```

Édite ensuite `.env` avec ton éditeur préféré et renseigne au minimum :

```env
# Secret de signature des sessions : la première valeur générée ci-dessus
AUTH_SECRET=

# Mot de passe de la base que crée le compose : la seconde valeur générée
POSTGRES_PASSWORD=

# Identité de ton instance (URL publique HTTPS), deux fois la même
AUTH_URL=https://academie.tonentreprise.fr
NEXT_PUBLIC_APP_URL=https://academie.tonentreprise.fr

# Premier compte d'administration, créé au premier démarrage
BOOTSTRAP_ADMIN_EMAIL=toi@tonentreprise.fr

# Email transactionnel (lien de connexion, notifications)
SCALEWAY_TEM_TOKEN=
SCALEWAY_TEM_PROJECT_ID=
EMAIL_FROM=noreply@tonentreprise.fr
```

Trois choses à savoir :

- **`AUTH_SECRET` ne se recopie pas d'un exemple.** Qui le connaît peut se
  fabriquer la session de n'importe quel compte. Le conteneur refuse de
  démarrer s'il est vide, s'il fait moins de 16 caractères, ou s'il vaut l'une
  des valeurs d'exemple que ce dépôt a publiées.
- **`DATABASE_URL` n'est pas à remplir ici.** Le compose construit lui-même
  l'URL de connexion à partir de `POSTGRES_PASSWORD`.
- **`POSTGRES_PASSWORD` n'est lu qu'à la création de la base.** Pour le changer
  ensuite, voir [upgrade.md](./upgrade.md).

Tu mets à jour une instance qui tourne déjà ? Jusqu'en novembre 2026 le
compose ne lisait pas ce fichier : lis d'abord [upgrade.md](./upgrade.md).

Pour la liste complète des variables, voir [configuration.md](./configuration.md).

### Étape 3 - Démarre la stack

```bash
docker compose up -d
```

Cela lance trois services :

- `postgres` - base de données
- `app` - application Next.js (port 3000)
- `caddy` - reverse proxy avec TLS auto Let's Encrypt (ports 80 et 443)

### Étape 4 - Initialise la base de données

Le schéma, le catalogue et le premier compte d'administration ne demandent
aucune commande : le conteneur `app` s'en charge à chaque démarrage. Suis-le
dans son journal, jusqu'à la ligne « Pret. Ouvre ... » :

```bash
docker compose logs -f app
```

Une seule étape reste manuelle, une fois ce premier démarrage terminé :

```bash
# Applique les REVOKE chirurgicaux pour le rôle Postgres read-only
# (Sprint sécurité 2 - defense en profondeur Least Privilege)
docker compose exec postgres psql -U humanix -d humanix \
  < prisma/sql/post-migration-grants.sql
```

> **🛡️ Note sécurité** - L'image Postgres custom `humanix-postgres:secured`
> provisionne automatiquement un rôle Postgres read-only au premier boot
> (mécanisme Least Privilege). Sur instance existante, applique
> `prisma/sql/setup-readonly-role.sql` manuellement.

### Étape 5 - Premier accès

Ouvre `https://academie.tonentreprise.fr` (ou `http://localhost:3000` en local).

Le premier compte d'administration est celui de `BOOTSTRAP_ADMIN_EMAIL`
(étape 2). Il n'y a pas d'identifiants par défaut : sur la page `/connexion`,
demande un lien de connexion pour cette adresse. Sans envoi de mail configuré,
pose aussi `BOOTSTRAP_ADMIN_PASSWORD` avant le premier démarrage, pour une
première connexion par mot de passe. Le journal du démarrage dit ce qui a été
créé :

```bash
docker compose logs app | grep "bootstrap-admin"
```

Crée ensuite les comptes de ton équipe via `/admin/utilisateurs`.

---

## Mode 2 - Bare-metal (Node + PostgreSQL natifs)

Pour les environnements où Docker n'est pas autorisé ou pour la performance
maximale.

### Étape 1 - Installe Node.js 20

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérification
node --version  # v20.x.x
npm --version   # 10.x.x
```

### Étape 2 - Installe PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16 postgresql-contrib-16

# Crée la base et l'utilisateur
sudo -u postgres psql <<'EOF'
CREATE USER humanix WITH PASSWORD 'CHANGEME';
CREATE DATABASE humanix OWNER humanix;
GRANT ALL PRIVILEGES ON DATABASE humanix TO humanix;
EOF
```

### Étape 3 - Clone et configure

```bash
git clone https://github.com/humanix-cybersecurity/humanix-academie.git
cd humanix-academie
cp .env.example .env
# Édite .env (cf. Mode 1 étape 2)
```

### Étape 4 - Installe les dépendances et build

```bash
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
npm run build
```

### Étape 5 - Démarre l'application

En production, utilise un superviseur de processus (`systemd`, `pm2`, etc.) :

```bash
# Test rapide en foreground
npm start
# → http://localhost:3000
```

Exemple de service `systemd` (`/etc/systemd/system/humanix.service`) :

```ini
[Unit]
Description=Humanix Académie
After=network.target postgresql.service

[Service]
Type=simple
User=humanix
WorkingDirectory=/opt/humanix-academie
EnvironmentFile=/opt/humanix-academie/.env
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now humanix
sudo systemctl status humanix
```

### Étape 6 - Reverse proxy (nginx ou Caddy)

Pour exposer l'app sur le port 443 avec TLS :

**Caddy** (recommandé, TLS auto) :

```caddyfile
academie.tonentreprise.fr {
    reverse_proxy localhost:3000
}
```

**Nginx** :

```nginx
server {
    listen 443 ssl http2;
    server_name academie.tonentreprise.fr;

    ssl_certificate /etc/letsencrypt/live/academie.tonentreprise.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/academie.tonentreprise.fr/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Mode 3 - Kubernetes (production multi-nœuds)

Pour les déploiements production exigeants (haute dispo, scaling horizontal,
multi-AZ).

### Helm chart (recommandé)

Un Helm chart officiel sera publié pour la version 1.1 (Q3 2026). En attendant,
des manifestes Kubernetes de référence sont fournis dans
`infra/kubernetes/` :

```bash
kubectl create namespace humanix
kubectl apply -n humanix -k infra/kubernetes/overlays/production
```

Couvre :

- Deployment Next.js (3 réplicas par défaut)
- StatefulSet PostgreSQL (1 réplica + PVC)
- Service ClusterIP + Ingress (cert-manager)
- Secret + ConfigMap pour les variables d'env
- HPA (scale 2-10 selon CPU)

### Recommandations production K8s

- **PostgreSQL** : utilise un service managé (AWS RDS, Scaleway DB, OVHcloud
  Managed Database, CrunchyData) plutôt que le StatefulSet
- **Sessions** : ajoute Redis pour partager les sessions entre pods (sinon
  sticky sessions obligatoires sur l'Ingress)
- **Stockage** : si tu actives les uploads (modules contributeurs avec
  médias), utilise un S3-compatible (Scaleway Object Storage, OVHcloud Cold
  Storage)
- **Monitoring** : Prometheus + Grafana, dashboard fourni dans
  `infra/grafana/humanix-overview.json`

---

## Durcissement production

### 1. Variables d'environnement sensibles

- `AUTH_SECRET` : 32+ caractères aléatoires, **jamais** committé en git
- `DATABASE_URL` : utilise un user PostgreSQL dédié avec privilèges minimaux
  (`SELECT, INSERT, UPDATE, DELETE` uniquement, pas de `CREATE` ni `DROP`)
- Stockage : variables dans un secret manager (Vault, AWS Secrets Manager,
  Scaleway Secrets), jamais dans le `.env` du serveur en clair

### 2. TLS et HSTS

- TLS 1.2 minimum (1.3 recommandé)
- HSTS activé avec `max-age=31536000`
- CSP strict : `frame-ancestors 'none'`, `default-src 'self'`
- Configuration de référence dans `infra/caddy/Caddyfile.production`

### 3. Réseau

- PostgreSQL **JAMAIS** exposé sur Internet (port 5432 fermé au public)
- Réseau Docker segmenté : `frontend` (web + caddy) et `backend` (web + db)
- Firewall hôte (ufw, firewalld) qui ne laisse passer que 80, 443, 22

### 4. Sauvegardes

- Sauvegarde quotidienne PostgreSQL chiffrée (`pg_dump` + `gpg`)
- Rétention 7 jours minimum, 30 jours recommandé
- Test de restauration mensuel (procédure dans `infra/scripts/backup-test.sh`)
- Stockage off-site (S3 différent du serveur ou région différente)

### 5. Logs et monitoring

- Logs centralisés (Loki, ELK, Graylog) avec rotation 30 jours
- Alerting sur :
  - Tentatives d'authentification en échec > 10/min
  - Erreurs 5xx > 1 % des requêtes
  - Latence p95 > 2s
  - Espace disque < 20 %
- Healthcheck endpoint : `/api/health` (retourne `200 OK` si tout va bien)

### 6. Mises à jour

- Abonne-toi aux notifications GitHub du repo (Watch → Releases only)
- Applique les patches sécurité sous 7 jours pour Critique/Élevé (cf. SECURITY.md)
- Procédure : voir [upgrade.md](./upgrade.md)

---

## Vérification post-installation

Une fois installée, valide ton instance avec ces 5 tests :

1. **Accès web** : `curl -I https://academie.tonentreprise.fr` → `200 OK`
2. **TLS valide** : `curl -vI https://...` → certificat OK
3. **Healthcheck** : `curl https://academie.tonentreprise.fr/api/health` → `{"status":"ok"}`
4. **Connexion admin** : login avec le compte initial
5. **Création utilisateur** : crée un utilisateur de test, vérifie l'envoi
   du magic link par email

Si l'un de ces tests échoue, voir [faq.md](./faq.md) section troubleshooting.

---

## Désinstallation

```bash
# Mode Docker Compose
docker compose down -v   # Le -v supprime AUSSI les volumes (donc la DB)

# Mode bare-metal
sudo systemctl stop humanix
sudo systemctl disable humanix
sudo rm /etc/systemd/system/humanix.service
sudo -u postgres dropdb humanix
sudo -u postgres dropuser humanix
sudo rm -rf /opt/humanix-academie
```

**Avant désinstallation** : pense à exporter ton rapport de conformité PDF et
à sauvegarder ta base si tu veux garder les données (RGPD).

---

## Aide

- Questions self-host : [GitHub Discussions Q&A](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/q-a)
- Bugs : [GitHub Issues](https://github.com/humanix-cybersecurity/humanix-academie/issues)
- Discord communautaire : ouverture après le launch OSS du 26 mai 2026
- Cloud managé (sans installation) : https://humanix-cybersecurity.fr/tarifs
