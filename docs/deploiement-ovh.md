# Déploiement Humanix Académie sur serveur OVH dédié

> Runbook étape par étape pour passer **de zéro à prod** sur un serveur dédié
> OVH (testé sur Start-9-M Ryzen 5 PRO 3600, 32 Go RAM, 2×1 TB NVMe).
> Adaptable à tout serveur Ubuntu 24.04 LTS bare-metal.

**Temps estimé total** : ~45 minutes (en suivant linéairement).

## Sommaire

1. [Pré-requis](#1-pré-requis)
2. [Provisioning OVH](#2-provisioning-ovh)
3. [Hardening initial](#3-hardening-initial-via-server-initsh)
4. [DNS + cert TLS](#4-dns--certificat-tls)
5. [Déploiement Humanix](#5-déploiement-humanix)
6. [Premier compte admin](#6-premier-compte-admin)
7. [Backups + monitoring](#7-backups--monitoring)
8. [Checklist post-launch](#8-checklist-post-launch)

---

## 1. Pré-requis

### Local (sur ta machine)

- Ta clé SSH publique (`~/.ssh/id_ed25519.pub` ou `~/.ssh/id_rsa.pub`)
- Un nom de domaine (ex: `humanix-cybersecurity.fr`) avec accès aux DNS
- Compte GitHub avec accès au repo

### Côté OVH

- Compte OVH avec moyen de paiement validé
- IBAN si tu prends sans engagement (prélèvement mensuel)

### Côté providers tiers (optionnels mais recommandés)

| Service | Pourquoi | Coût |
|---|---|---|
| **Scaleway TEM** | Magic link + transactionnels souverains FR | ~0,25 € / 1000 mails |
| **Mistral AI** | Phishing IA / Vishing / Smishing | pay-per-token |
| **Payplug** | Paiement cloud SaaS | 1,2 % + 0,18 € / transaction |
| **Object Storage** Scaleway/OVH | Backups Postgres chiffrés hors-site | ~0,01 € / GB / mois |

---

## 2. Provisioning OVH

### 2.1 Commander le serveur

1. Aller sur [www.kimsufi.com](https://www.kimsufi.com) ou OVH Dédiés
2. Choisir **Start-9-M** (Ryzen 5 PRO 3600 / 32 GB / 2×1 TB NVMe / 500 Mbit/s)
3. Localisation : **Gravelines (GRA)** ou **Roubaix (RBX)** - France
4. Sans engagement = ~40 € HT / mois
5. Valider la commande

### 2.2 Installation OS

Une fois le serveur livré (10-30 min après commande) :

1. Console OVH Manager → ton serveur → **Installer**
2. Choisir **Ubuntu 24.04 LTS Server** (sans GUI)
3. Partitionnement :
   - **RAID 1 logiciel** (les 2 NVMe en mirror) - recommandé pour résilience
   - `/boot` 1 GB ext4
   - `/` 50 GB ext4
   - `swap` 8 GB (le script le créera de toute façon, on peut skipper ici)
   - `/var/lib` 200 GB ext4 (Postgres + Docker)
   - `/home` reste (~700 GB ext4 - pour backups locaux, médias TTS)
4. Ajouter ta clé SSH publique dans le formulaire OVH
5. Lancer l'installation (~15 min)

### 2.3 Première connexion

```bash
# Tu reçois l'IP par email OVH (ou dans le manager)
ssh root@VOTRE_IP

# Vérifie que tu es bien sur le bon serveur
hostname
uname -a
df -h
```

---

## 3. Hardening initial via server-init.sh

Le script `scripts/server-init.sh` automatise tout le durcissement.

### 3.1 Récupérer et exécuter

```bash
# En tant que root (depuis ta première connexion)
cd /tmp
wget https://raw.githubusercontent.com/Humanix-Cybersecurity/Humanix-Academie/main/scripts/server-init.sh
chmod +x server-init.sh

# Optionnel : changer le port SSH (recommandé pour réduire les scans bots)
SSH_PORT=2222 ./server-init.sh
```

Le script demande confirmation puis enchaîne :

1. ✅ `apt update && upgrade`
2. ✅ Timezone Europe/Paris + locale fr_FR.UTF-8
3. ✅ Création user `humanix` avec sudo + ta clé SSH copiée depuis root
4. ✅ Durcissement SSH (port custom, root login refusé, password refusé)
5. ✅ UFW : seuls SSH + 80 + 443 ouverts
6. ✅ fail2ban (3 échecs SSH = ban 1h)
7. ✅ Swap file 8 GB + swappiness 10
8. ✅ Docker + Compose plugin
9. ✅ unattended-upgrades (patches sécurité auto)
10. ✅ Récap final avec les prochaines étapes

### 3.2 Tester la nouvelle connexion

**Avant de couper la session root**, ouvre un nouveau terminal et teste :

```bash
ssh -p 2222 humanix@VOTRE_IP
# ou ssh humanix@VOTRE_IP si tu as gardé le port 22
```

Si ça marche → tu peux déconnecter root.
Si ça marche **pas** → reste connecté en root, fix avant de raccrocher.

### 3.3 Vérifications

```bash
# Sur la nouvelle session humanix@
sudo ufw status verbose
# → Doit montrer 22/tcp (ou 2222), 80/tcp, 443/tcp en ALLOW. Reste DENY.

sudo fail2ban-client status sshd
# → "Status for the jail: sshd" + 0 banned IP

docker --version
# → Docker version 26.x ou 27.x
```

---

## 4. DNS + certificat TLS

### 4.1 Pointer le DNS

Chez ton registrar (Gandi, OVH Domains, Namecheap…) :

```
Type   Nom                                Valeur               TTL
A      academie.humanix-cybersecurity.fr  VOTRE_IP_OVH         300
A      humanix-cybersecurity.fr           VOTRE_IP_OVH         300  (optionnel, racine)
```

Vérifier la propagation (~5-15 min) :

```bash
dig +short academie.humanix-cybersecurity.fr
# → Doit retourner VOTRE_IP_OVH
```

### 4.2 Cert Let's Encrypt via Caddy sidecar

Le repo contient un `docker-compose.yml` qui peut accueillir Caddy comme reverse
proxy avec ACME automatique. **Méthode recommandée** :

1. Ajouter un service Caddy dans `docker-compose.yml` qui écoute sur 80 et 443,
   demande le cert Let's Encrypt, et proxy vers HAProxy interne.
2. OU utiliser certbot en mode standalone, copier le cert dans
   `infra/haproxy/certs/fullchain.pem`, et activer le frontend HTTPS de
   `haproxy.cfg`.

**Méthode minimale (certbot standalone)** :

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d academie.humanix-cybersecurity.fr \
  --email contact@humanix-cybersecurity.fr --agree-tos --no-eff-email

# Le cert + key se retrouvent dans :
#   /etc/letsencrypt/live/academie.humanix-cybersecurity.fr/fullchain.pem
#   /etc/letsencrypt/live/academie.humanix-cybersecurity.fr/privkey.pem

# HAProxy attend cert+key concatenés dans un seul .pem :
sudo mkdir -p /opt/humanix/infra/haproxy/certs
sudo bash -c 'cat /etc/letsencrypt/live/academie.humanix-cybersecurity.fr/fullchain.pem /etc/letsencrypt/live/academie.humanix-cybersecurity.fr/privkey.pem > /opt/humanix/infra/haproxy/certs/humanix.pem'
sudo chmod 644 /opt/humanix/infra/haproxy/certs/humanix.pem

# Renouvellement auto (cron tous les jours à 4h, certbot ne renew que si <30j)
echo '0 4 * * * root certbot renew --quiet --post-hook "cd /opt/humanix && docker compose restart haproxy"' | sudo tee /etc/cron.d/certbot-renew
```

---

## 5. Déploiement Humanix

### 5.1 Cloner le repo

```bash
sudo mkdir -p /opt/humanix
sudo chown humanix:humanix /opt/humanix
cd /opt/humanix
git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie.git .
```

### 5.2 Configurer `.env`

```bash
cp .env.example .env
nano .env  # ou vim
```

**Variables minimales obligatoires** (cf. `docs/configuration.md`) :

```env
# Base de donnees - generee par docker-compose
DATABASE_URL="postgresql://humanix:UN_MOT_DE_PASSE_FORT@postgres:5432/humanix?schema=public"

# Secret de signature des sessions - GENERE-LE :
#   openssl rand -base64 32
AUTH_SECRET="REMPLACE_PAR_LA_SORTIE_DE_OPENSSL"

# URL publique - DOIT correspondre au DNS
AUTH_URL="https://academie.humanix-cybersecurity.fr"
NEXT_PUBLIC_APP_URL="https://academie.humanix-cybersecurity.fr"
NEXT_PUBLIC_APP_NAME="Humanix Academie"

# Postgres (synchroniser avec DATABASE_URL)
POSTGRES_USER=humanix
POSTGRES_PASSWORD=UN_MOT_DE_PASSE_FORT  # IDENTIQUE a celui de DATABASE_URL
POSTGRES_DB=humanix

# Email transactionnel Scaleway TEM (magic link)
SCALEWAY_TEM_TOKEN="..."
SCALEWAY_TEM_PROJECT_ID="..."
EMAIL_FROM="hex@humanix-cybersecurity.fr"

# IA Mistral (optionnel - features Pro+ : phishing/vishing/smishing IA)
MISTRAL_API_KEY="..."

# Payplug (optionnel - facturation cloud)
PAYPLUG_SECRET_KEY="sk_live_..."
PAYPLUG_WEBHOOK_SECRET="whsec_..."
PAYPLUG_PLAN_SOLO="plan_..."
PAYPLUG_PLAN_ESSENTIELLE="plan_..."
PAYPLUG_PLAN_PRO="plan_..."

# Demo mode : false en prod
DEMO_MODE="false"
```

```bash
# Securiser le fichier
chmod 600 .env
```

### 5.3 Activer le frontend HTTPS dans HAProxy

Éditer `infra/haproxy/haproxy.cfg`, décommenter la section :

```haproxy
frontend humanix_https
    bind *:443 ssl crt /etc/haproxy/certs/humanix.pem alpn h2,http/1.1
    http-request set-header X-Forwarded-Proto https
    # ... mêmes ACL et headers que frontend HTTP ...
    default_backend humanix_app
```

Et activer le redirect HTTP → HTTPS (ligne 106) :

```haproxy
http-request redirect scheme https code 301 unless { ssl_fc }
```

Décommenter aussi le mount de certs dans `docker-compose.yml` :

```yaml
ports:
  - "80:80"
  - "443:443"        # ← décommenter
volumes:
  - ./infra/haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
  - ./infra/haproxy/errors:/etc/haproxy/errors:ro
  - ./infra/haproxy/certs:/etc/haproxy/certs:ro    # ← décommenter
```

### 5.4 Lancer la stack

```bash
docker compose up -d --build
```

Ça prend 5-10 min la première fois (pull des images, build de l'app, migrations).

```bash
# Suivre les logs
docker compose logs -f --tail=100

# Vérifier que tout est UP
docker compose ps
```

Attendu :

```
NAME                STATUS
humanix-haproxy     Up (healthy)
humanix-app         Up
humanix-postgres    Up (healthy)
humanix-tts         Up (healthy)
```

### 5.5 Migrations + seed

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

---

## 6. Premier compte admin

### 6.1 Créer le SUPERADMIN

Le seed pose un compte demo. Pour ton SUPERADMIN réel :

```bash
docker compose exec app npx tsx scripts/bootstrap-admin.ts \
  --email "florian@humanix-cybersecurity.fr" \
  --name "Florian Durano" \
  --tenant "humanix-cybersecurity"
```

Tu reçois un magic link par mail (Scaleway TEM doit être configuré).

### 6.2 Première connexion + WebAuthn

1. Cliquer le magic link → connexion en SUPERADMIN
2. Aller dans `/profil/securite` → **Activer WebAuthn FIDO2**
3. Insérer ta clé Thales et-Fusion (ou autre clé FIDO2)
4. Vérifier `/admin/audit` → l'évènement `WEBAUTHN_REGISTERED` apparait

À partir de là, ton compte SUPERADMIN exige WebAuthn pour se connecter.

---

## 7. Backups + monitoring

### 7.1 Backup Postgres quotidien chiffré → Scaleway Object Storage

```bash
# Installer rclone (transfert S3-compatible)
sudo apt install -y rclone gpg

# Configurer rclone pour Scaleway Object Storage
rclone config
# Choix : New remote → name "scw" → type "s3" → provider "Scaleway"
# → access_key_id, secret_access_key, region "fr-par"

# Créer le bucket si pas déjà fait (via console Scaleway)
# Bucket : humanix-backups (versioning + Object Lock recommandés)

# Script backup
sudo bash -c 'cat > /opt/humanix/scripts/backup-postgres.sh' <<'EOF'
#!/bin/bash
set -euo pipefail
TS=$(date -Iseconds)
BACKUP_FILE=/tmp/humanix-pgdump-$TS.sql.gz.gpg
GPG_RECIPIENT="florian@humanix-cybersecurity.fr"  # ta cle GPG publique

cd /opt/humanix
docker compose exec -T postgres pg_dump -U humanix humanix \
  | gzip \
  | gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$BACKUP_FILE"

rclone copy "$BACKUP_FILE" "scw:humanix-backups/postgres/$(date +%Y/%m)/" --quiet
rm -f "$BACKUP_FILE"
echo "Backup OK : $TS"
EOF
sudo chmod +x /opt/humanix/scripts/backup-postgres.sh

# Cron quotidien à 2h
echo '0 2 * * * humanix /opt/humanix/scripts/backup-postgres.sh >> /var/log/humanix-backup.log 2>&1' | sudo tee /etc/cron.d/humanix-backup

# Test manuel
sudo -u humanix /opt/humanix/scripts/backup-postgres.sh
```

### 7.2 Monitoring uptime

**Option simple (gratuit)** : [Uptime Kuma](https://github.com/louislam/uptime-kuma) self-host, ou
service externe gratuit type [Better Uptime](https://betteruptime.com) /
[Hetrix Tools](https://hetrixtools.com).

Configurer un check HTTP toutes les 60s sur :

```
https://academie.humanix-cybersecurity.fr/health
```

Le endpoint répond `{"status":"ok"}` en 200, ou 503 si Postgres down.

### 7.3 Logs centralisés (optionnel)

`docker compose logs -f` suffit pour démarrer. Pour aller plus loin :

- **Loki + Grafana** self-host (5 GB RAM dispo, peut tourner sur la même machine)
- **Sekoia** ou **Sentinel** pour SIEM (cf. `connectors/sekoia/`, `connectors/sentinel/`)

---

## 8. Checklist post-launch

À faire dans les 7 jours suivant le go-live :

- [ ] DNS propagé (vérifier depuis 3 résolveurs différents)
- [ ] HTTPS Let's Encrypt valide ([SSLLabs A+](https://www.ssllabs.com/ssltest/))
- [ ] CSP header présent (`curl -sI https://... | grep -i content-security`)
- [ ] `/health` retourne 200
- [ ] `/.well-known/security.txt` accessible
- [ ] WebAuthn activé sur SUPERADMIN
- [ ] Backup Postgres testé : `pg_restore` d'un dump dans une DB de test
- [ ] Monitoring uptime actif (alerte SMS/email en cas de down)
- [ ] DNS reverse OVH configuré (pour les emails sortants : `mail.tonentreprise.fr → IP`)
- [ ] SPF + DKIM + DMARC configurés sur le domaine d'envoi
- [ ] DPA signé avec chaque sous-traitant actif (Scaleway, Mistral, Payplug)
- [ ] Page `/confidentialite` à jour avec la liste des sous-traitants
- [ ] Test pentest interne via Exegol (cf. `docs/SECURITY_AUDIT.md` §2.5)
- [ ] Compte demo public désactivé en prod (`DEMO_MODE=false` dans `.env`)
- [ ] `LOG_LEVEL=info` (pas debug en prod)
- [ ] HAProxy stats interface protégée par auth (cf. finding pentest §9.4)

---

## Dépannage

| Symptôme | Cause probable | Fix |
|---|---|---|
| `502 Bad Gateway` sur le domaine | App pas encore prête | `docker compose logs app` |
| Magic link non reçu | Scaleway TEM mal configuré | Vérifier `SCALEWAY_TEM_TOKEN` + `EMAIL_FROM` valide DNS |
| `redirect_uri_mismatch` SSO | `AUTH_URL` ≠ DNS réel | Re-générer `.env` + restart app |
| Cert Let's Encrypt échoue | Port 80 fermé OU DNS pas propagé | UFW + `dig` + retry `certbot` |
| Postgres restart loop | Disk full ou perm volume | `df -h` + `docker volume ls` |
| `npm audit` HIGH/CRITICAL en CI | Dépendance vulnérable | `npm audit fix` ou Dependabot PR |

## Contacts

- **Repo** : https://github.com/Humanix-Cybersecurity/Humanix-Academie
- **Issues / questions** : GitHub Discussions
- **Sécurité** : `security@humanix-cybersecurity.fr` (cf. `/.well-known/security.txt`)
- **DPO** : `dpo@humanix-cybersecurity.fr`
