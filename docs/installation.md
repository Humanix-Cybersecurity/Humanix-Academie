# Installation — Humanix Académie Community Edition

Ce guide te permet d'installer Humanix Académie en self-host sur ton
infrastructure. Trois modes sont supportés :

1. **Docker Compose** (recommandé pour la majorité des cas)
2. **Bare-metal** (Node.js + PostgreSQL natifs)
3. **Kubernetes** (production multi-nœuds)

Temps estimé : **10 à 30 minutes** selon le mode et ton expérience.

---

## Prérequis

| Composant | Version minimale | Recommandée |
|---|---|---|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 2 Go | 4 Go |
| **Disque SSD** | 5 Go | 20 Go |
| **OS hôte** | Linux 5.10+ / macOS 12+ / Windows 11 (WSL2) | Ubuntu 24.04 LTS |
| **Docker** (mode 1) | 24.0+ | 26+ |
| **Docker Compose** (mode 1) | v2.20+ | v2.27+ |
| **Node.js** (mode 2) | 20.10+ | 20.x LTS |
| **PostgreSQL** (mode 2) | 14+ | 16 |
| **Redis** (optionnel, sessions) | — | 7.2 |

---

## Mode 1 — Docker Compose (recommandé)

C'est le mode le plus simple et le plus reproductible.

### Étape 1 — Clone le repo

```bash
git clone https://github.com/humanix-cybersecurity/humanix-academie.git
cd humanix-academie
```

### Étape 2 — Configure tes variables d'environnement

```bash
cp .env.example .env
```

Édite `.env` avec ton éditeur préféré et renseigne au minimum :

```env
# Identité de ton instance (URL publique HTTPS recommandée en prod)
NEXT_PUBLIC_APP_URL=https://academie.tonentreprise.fr

# Base de données (Docker Compose la fournit en interne)
DATABASE_URL=postgresql://humanix:CHANGEME@postgres:5432/humanix?schema=public

# Secret de signature des sessions (32+ caractères aléatoires)
# Génère-le avec : openssl rand -base64 32
AUTH_SECRET=remplace-moi-par-un-secret-genere

# Email transactionnel (magic link, notifications)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@tonentreprise.fr
```

Pour la liste complète des variables, voir [configuration.md](./configuration.md).

### Étape 3 — Démarre la stack

```bash
docker compose up -d
```

Cela lance trois services :
- `postgres` — base de données
- `app` — application Next.js (port 3000)
- `caddy` — reverse proxy avec TLS auto Let's Encrypt (ports 80 et 443)

### Étape 4 — Initialise la base de données

```bash
# Applique les migrations
docker compose exec app npx prisma migrate deploy

# Seed initial (1 tenant demo + 1 admin)
docker compose exec app npx prisma db seed
```

### Étape 5 — Premier accès

Ouvre `https://academie.tonentreprise.fr` (ou `http://localhost:3000` en local).

Identifiants admin par défaut :

```bash
docker compose logs app | grep "Initial admin"
# Tu verras : Initial admin: admin@example.com / mot-de-passe-temporaire
```

**Connecte-toi, change immédiatement le mot de passe**, puis crée tes
utilisateurs réels via `/admin/utilisateurs`.

---

## Mode 2 — Bare-metal (Node + PostgreSQL natifs)

Pour les environnements où Docker n'est pas autorisé ou pour la performance
maximale.

### Étape 1 — Installe Node.js 20

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérification
node --version  # v20.x.x
npm --version   # 10.x.x
```

### Étape 2 — Installe PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16 postgresql-contrib-16

# Crée la base et l'utilisateur
sudo -u postgres psql <<'EOF'
CREATE USER humanix WITH PASSWORD 'CHANGEME';
CREATE DATABASE humanix OWNER humanix;
GRANT ALL PRIVILEGES ON DATABASE humanix TO humanix;
EOF
```

### Étape 3 — Clone et configure

```bash
git clone https://github.com/humanix-cybersecurity/humanix-academie.git
cd humanix-academie
cp .env.example .env
# Édite .env (cf. Mode 1 étape 2)
```

### Étape 4 — Installe les dépendances et build

```bash
npm ci --omit=dev
npx prisma migrate deploy
npx prisma generate
npm run build
```

### Étape 5 — Démarre l'application

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

### Étape 6 — Reverse proxy (nginx ou Caddy)

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

## Mode 3 — Kubernetes (production multi-nœuds)

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
- Discord live : https://discord.gg/humanix
- Cloud managé (sans installation) : https://humanix-cybersecurity.fr/tarifs
