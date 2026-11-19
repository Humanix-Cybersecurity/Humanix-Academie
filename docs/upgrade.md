# Upgrade - Procédure de mise à jour

Ce guide t'accompagne dans la mise à jour de ton instance Humanix Académie
self-hostée vers une nouvelle version.

**Règle d'or** : ne saute jamais plus de **2 versions majeures** sans
upgrade intermédiaire. Pour passer de v1.0 à v3.0, fais d'abord v1.0 → v2.0
puis v2.0 → v3.0.

---

## Versionnement (SemVer)

Humanix Académie suit [Semantic Versioning 2.0](https://semver.org) :

```
v MAJOR . MINOR . PATCH
  │       │       │
  │       │       └── Bugfix uniquement, 100 % rétro-compatible
  │       │           Exemple : v1.2.3 → v1.2.4
  │       │
  │       └────────── Nouvelle feature, 100 % rétro-compatible
  │                   Exemple : v1.2.3 → v1.3.0
  │
  └────────────────── Breaking change (migration nécessaire)
                      Exemple : v1.5.0 → v2.0.0
```

**Conséquences pratiques** :

- Patches (`v1.2.x → v1.2.x+1`) : upgrade en 1 commande, zéro risque
- Mineures (`v1.x → v1.x+1`) : upgrade simple, lis le changelog
- Majeures (`v1 → v2`) : lis CAREFULLY le guide de migration

---

## Novembre 2026 : le compose lit ton `.env` et refuse les secrets d'exemple

> À lire avant de mettre à jour une instance lancée avec le
> `docker-compose.yml` du dépôt, ou avec un compose qui en dérive.

### Ce qui change

Jusqu'ici, le `docker-compose.yml` du dépôt écrivait en dur `AUTH_SECRET`,
`CRON_SECRET` et le mot de passe de la base, avec des valeurs de
démonstration publiques. Le service `app` ne lisait pas ton `.env` : ce que
le guide d'installation te faisait y poser n'arrivait pas dans le conteneur.
Une instance pouvait donc tourner avec le secret de démonstration alors que
son `.env` en contenait un bon.

Désormais :

- le compose lit `.env`, et tout ce qu'il contient arrive dans le conteneur ;
- `docker-compose.yml` ne contient plus aucun secret, et `docker compose`
  refuse de lancer la stack tant que `AUTH_SECRET` et `POSTGRES_PASSWORD`
  manquent dans `.env` ;
- le conteneur refuse de démarrer avec une valeur d'exemple publiée dans ce
  dépôt, quelle que soit la façon de le lancer : compose du dépôt, compose
  modifié, Kubernetes, `docker run`.

### Ton instance était-elle concernée ?

Avant de mettre à jour, demande au conteneur en service ce qu'il reçoit. La
commande n'affiche pas le secret :

```bash
docker compose exec app sh -c 'case "$AUTH_SECRET" in demo-secret-change-me*) echo "secret de demonstration" ;; *) echo "secret propre a cette instance" ;; esac'
```

- **« secret propre à cette instance »** : tu avais écrit ta valeur dans le
  compose. Reporte-la telle quelle dans `.env`, rien ne change pour les
  comptes.
- **« secret de démonstration »** : ton instance signait ses sessions avec une
  valeur que tout le monde peut lire dans ce dépôt. Mets à jour sans attendre,
  puis lis « Si ton instance a tourné avec le secret de démonstration ». Sur
  une instance d'essai qui n'a jamais contenu que les comptes fictifs du mode
  démo, générer un secret suffit.

### Mettre à jour

1. **Sauvegarde** la base et le `.env` (étape 1 de la procédure standard).

2. **Si tu avais modifié `docker-compose.yml` à la main**, garde une trace de
   tes modifications puis reviens au fichier du dépôt. Tes valeurs iront dans
   `.env` :

   ```bash
   git diff docker-compose.yml > mon-compose.diff
   git checkout -- docker-compose.yml
   ```

3. **Récupère la nouvelle version** (étape 3 de la procédure standard).

4. **Complète `.env`.** S'il n'existe pas, pars de `cp .env.example .env`.
   - `AUTH_SECRET` : la valeur que ton conteneur recevait déjà si elle était
     propre à ton instance, sinon une valeur neuve (`openssl rand -base64 32`).
   - `POSTGRES_PASSWORD` : **le mot de passe actuel de ta base**, pas un
     nouveau. Il n'est lu qu'à la création de la base : en poser un autre
     empêcherait l'application de s'y connecter. Si tu n'avais rien changé,
     c'est `humanix_demo`. Pour en changer, voir plus bas.
   - `CRON_SECRET` : si tu utilises `docker-compose.cron.yml`, il est déjà
     dans ton `.env`. L'application lit maintenant le même que le
     planificateur.
   - Relis le reste. Tout ce que contient `.env` prend effet, y compris ce
     qui restait sans effet jusqu'ici : `AUTH_URL` et `NEXT_PUBLIC_APP_URL`
     (l'adresse publique de ton instance), `DEMO_MODE`, `EMAIL_FROM`,
     `SCALEWAY_TEM_TOKEN`, `TTS_MIN_PLAN`, `BOOTSTRAP_ADMIN_*`.

5. **Relance** et lis le journal :

   ```bash
   docker compose up -d --build
   docker compose logs app | grep -e "garde" -e "REFUSE"
   # Attendu : [garde] Secrets : aucune valeur d'exemple.
   ```

### Ce que change un nouvel `AUTH_SECRET`

`AUTH_SECRET` ne signe pas que les sessions. En changer :

- déconnecte tout le monde ;
- rend illisibles les mots de passe SMTP (`/admin/smtp`) et CISO Assistant
  (`/admin/integrations/ciso-assistant`) enregistrés : ils sont chiffrés avec
  une clé qui en dérive, il faut les ressaisir ;
- invalide les invitations et les liens de connexion déjà envoyés, à
  renvoyer ;
- invalide les liens de désinscription des mails déjà envoyés, et les liens
  des PDF d'Audit Flash si `AUDIT_FLASH_URL_SECRET` est vide.

Les mots de passe des comptes, les codes TOTP et les clés de sécurité ne sont
pas touchés.

### Si ton instance a tourné avec le secret de démonstration

Toute personne connaissant cette valeur pouvait se fabriquer une session sur
ton instance, y compris d'administration, sans mot de passe. Changer
`AUTH_SECRET` ferme la porte : toutes les sessions tombent, fabriquées ou non.
Ensuite :

- passe en revue le journal d'audit (`/admin/audit`) : connexions et actions
  d'administration que personne ne reconnaît ;
- vérifie ce qu'une session d'administration permettait de créer ou de
  modifier : comptes et rôles, clés d'API, webhooks, configuration SMTP et
  SSO ;
- si des données personnelles ont pu être consultées, c'est une violation de
  données à évaluer : [PROCEDURE-VIOLATION-DONNEES.md](./PROCEDURE-VIOLATION-DONNEES.md).

Le `CRON_SECRET` de démonstration permettait, lui, de déclencher de
l'extérieur les tâches planifiées (`/api/cron/*`) : purges prévues par la
politique de conservation, envois de rappels, lancement des campagnes
programmées.

### Changer le mot de passe de la base

`POSTGRES_PASSWORD` ne sert qu'à la création de la base. Sur une base qui
existe, change d'abord le mot de passe dans PostgreSQL, puis dans `.env`, en
enchaînant les trois étapes :

```bash
# 1. Génère le nouveau mot de passe (en hexadécimal : il entre dans une URL)
openssl rand -hex 24

# 2. Change-le dans la base : psql demande deux fois la nouvelle valeur
docker compose exec postgres psql -U humanix -d humanix -c '\password humanix'

# 3. Pose la même valeur dans .env (POSTGRES_PASSWORD), puis relance
docker compose up -d
```

---

## Procédure standard (Docker Compose)

### Étape 1 - Backup obligatoire

**Ne JAMAIS** faire un upgrade sans backup. Procédure :

```bash
cd /opt/humanix-academie

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U humanix humanix \
  | gzip > "/var/backups/humanix/db-$(date -u +%Y-%m-%d-%H%M).sql.gz"

# Backup .env (au cas où tu as fait des modifs depuis l'install initiale)
cp .env "/var/backups/humanix/env-$(date -u +%Y-%m-%d-%H%M).bak"

# Backup volumes Docker (si tu utilises uploads ou autres)
docker compose exec -T app tar czf - /app/storage \
  > "/var/backups/humanix/storage-$(date -u +%Y-%m-%d-%H%M).tar.gz" 2>/dev/null || true

# Vérifie que le backup est valide
ls -lh /var/backups/humanix/ | tail -3
```

### Étape 2 - Lis le CHANGELOG

```bash
git fetch --tags
git log $(git describe --tags --abbrev=0)..main --oneline
# OU consulter directement :
# https://github.com/humanix-cybersecurity/humanix-academie/releases
```

Si la version cible contient un `BREAKING CHANGE:`, ARRÊTE-TOI ICI et lis
la section **Migrations majeures** plus bas avant de continuer.

### Étape 3 - Pull la nouvelle version

```bash
# Récupère le code et les nouvelles images Docker
git fetch --tags
git checkout v1.2.0   # ou main pour la branche de dev (déconseillé en prod)

# Compare les configs
diff -u .env .env.example | grep "^[-+]"
# Si nouvelles variables, ajoute-les à .env
```

### Étape 4 - Applique l'upgrade

```bash
# Pull les images Docker mises à jour
docker compose pull

# Redémarre les services (migrations Prisma s'appliquent au démarrage)
docker compose up -d --remove-orphans

# Suis les logs en temps réel
docker compose logs -f app
# Ctrl+C quand tu vois : "▲ Next.js ready on http://0.0.0.0:3000"
```

### Étape 5 - Vérification post-upgrade

```bash
# Healthcheck
curl https://academie.tonentreprise.fr/api/health
# Attendu : {"status":"ok","version":"1.2.0","db":"connected"}

# Connexion admin
# → http://localhost:3000 → login → vérifie que le dashboard s'affiche

# Vérification des migrations
docker compose exec app npx prisma migrate status
# Attendu : "Database schema is up to date!"
```

### Étape 6 - Cleanup (optionnel)

```bash
# Supprime les anciennes images Docker pour libérer du disque
docker image prune -f

# Vérifie l'espace disque récupéré
df -h
```

---

## Procédure standard (bare-metal)

```bash
cd /opt/humanix-academie

# 1. Backup (cf. plus haut, mais sans Docker)
sudo -u postgres pg_dump humanix \
  | gzip > "/var/backups/humanix/db-$(date -u +%Y-%m-%d-%H%M).sql.gz"

# 2. Stoppe le service
sudo systemctl stop humanix

# 3. Pull la nouvelle version
git fetch --tags
git checkout v1.2.0

# 4. Re-installe les dépendances (uniquement si package.json a changé)
npm ci --omit=dev

# 5. Applique les migrations
npx prisma migrate deploy
npx prisma generate

# 6. Re-build
npm run build

# 7. Redémarre
sudo systemctl start humanix
sudo systemctl status humanix

# 8. Vérification
curl http://localhost:3000/api/health
```

---

## Schéma Prisma & catalogue de contenu (spécificités Humanix)

> Cette section fait autorité pour ce dépôt. Les commandes `prisma migrate`
> mentionnées plus haut sont génériques : en pratique, Humanix applique le
> schéma avec **`prisma db push`** (voir ci-dessous).

### Schéma : `prisma db push` (pas de dossier `migrations/`)

Ce dépôt n'utilise pas de migrations Prisma versionnées : le schéma est
appliqué avec `prisma db push`. Les évolutions sont conçues **additives**
(colonnes `nullable` / valeurs par défaut, valeurs d'enum ajoutées) pour
rester rétro-compatibles et sûres en production (aucune perte, aucun downtime).

Après un pull qui modifie `prisma/schema.prisma` :

```bash
# Docker Compose
docker compose exec app npx prisma db push

# bare-metal
npx prisma db push && npx prisma generate
```

Exemples d'ajouts additifs récents : champs marque blanche / revendeur
(`Tenant.brand*`, `Tenant.brandSubdomain`, `Tenant.isReseller`) et valeur
d'enum `AuditAction.PHISHING_REMEDIATION_ASSIGNED` (protection récidivistes).

### Catalogue commercial : submodule `content-pro` + reseed

Le contenu pédagogique commercial vit dans le submodule privé `content-pro`
(monté sur `content/saisons` + `prisma/catalog-saisons.ts`). Après l'ajout
ou la mise à jour de saisons :

```bash
git submodule update --init --remote content-pro
# Recharge le catalogue (idempotent, upsert par slug) :
docker compose exec app npm run db:seed
# ou, depuis l'app : bouton « Re-importer le catalog » dans /superadmin
```

Le reseed n'altère ni les utilisateurs ni leur progression.

### Add-ins clients mail (Outlook / Gmail)

Ils se déploient **hors de l'app** (côté Microsoft 365 / Google Workspace) :
aucun impact sur la procédure d'upgrade serveur.

- Outlook : manifest servi par `/api/integrations/outlook/manifest.xml`.
- Gmail : code Apps Script dans `gmail-addon/` (cf. `gmail-addon/README.md`).

---

## Migrations majeures (breaking changes)

### Comment savoir si c'est une migration majeure ?

- Le numéro **MAJOR** change (`v1.x.x → v2.x.x`)
- Le CHANGELOG contient le mot-clé `BREAKING CHANGE`
- Une release note dédiée est publiée sur
  https://github.com/humanix-cybersecurity/humanix-academie/releases

### Procédure recommandée

1. **Lis le guide de migration** publié avec la release majeure
   (ex: `docs/migrations/v1-to-v2.md`)
2. **Prépare un environnement de staging** identique à ta prod
3. **Restaure ta backup** sur le staging
4. **Applique la migration** sur le staging
5. **Teste manuellement** les parcours critiques :
   - Login / SSO
   - Création utilisateur
   - Lancement d'un module
   - Export rapport conformité PDF
   - Tes intégrations custom (webhooks, API, connecteur CISO Assistant)
6. Si tout est vert, applique en prod **avec backup fraîche**
7. Garde le code v1.x sous le coude pendant 7 jours minimum (rollback)

### Versions avec migrations annoncées

| Version | Date              | Type                  | Guide |
| ------- | ----------------- | --------------------- | ----- |
| v1.0.0  | mai 2026          | Initial OSS release   | -     |
| v1.1.0  | juin 2026 (prévu) | Helm chart Kubernetes | -     |
| v2.0.0  | (à planifier)     | TBD                   | TBD   |

---

## Rollback en cas de problème

### Si l'upgrade échoue au démarrage

```bash
# Revenir à la version précédente
cd /opt/humanix-academie
git checkout v1.1.0   # version d'avant
docker compose down
docker compose up -d
docker compose logs -f app
```

### Si la migration DB est corrompue

```bash
# Restaurer la backup pré-upgrade
cd /opt/humanix-academie
docker compose down
docker volume rm humanix-academie_postgres_data
docker compose up -d postgres
sleep 5
gunzip -c /var/backups/humanix/db-2026-05-26-1030.sql.gz \
  | docker compose exec -T postgres psql -U humanix humanix
docker compose up -d
```

### Si le rollback ne suffit pas

Ouvre une issue GitHub avec :

- La version d'origine et la version cible
- Les logs `docker compose logs app`
- Les migrations Prisma listées (`npx prisma migrate status`)
- Ton OS et ta config

Et passe sur Discord pour de l'aide en direct si urgent.

---

## Politique de support des versions

| Version                        | Statut        | Support patches sécurité  |
| ------------------------------ | ------------- | ------------------------- |
| `main` (dev)                   | Active        | Immédiat                  |
| Dernière minor stable (`v1.x`) | Active        | Oui, 7j max pour critique |
| Avant-dernière minor           | Maintenance   | 12 mois                   |
| Avant-avant-dernière           | Non supportée | Migration recommandée     |

Une release majeure (v2, v3) signe la fin de support de la majeure
précédente après **12 mois de cohabitation**. Exemple :

- v2.0.0 sortie en juin 2027 → v1.x supportée jusqu'à juin 2028.

---

## Mises à jour automatisées (avancé)

Pour les self-hostés qui veulent automatiser :

### Watchtower (Docker Compose)

```yaml
# docker-compose.override.yml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_SCHEDULE: "0 0 4 * * *" # Tous les jours à 4h
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_INCLUDE_RESTARTING: "true"
      WATCHTOWER_NOTIFICATIONS: "email"
      WATCHTOWER_NOTIFICATION_EMAIL_FROM: "watchtower@tonentreprise.fr"
      WATCHTOWER_NOTIFICATION_EMAIL_TO: "rssi@tonentreprise.fr"
```

**Attention** : déconseillé en prod sans staging. Préfère :

- Staging : auto-update toutes les nuits
- Prod : update manuelle après validation staging

### Renovate (PR auto sur le repo)

Si tu maintiens un fork interne, Renovate ouvre des PR auto pour les mises
à jour. Configuration de référence dans `renovate.json` du repo officiel.

---

## Aide

- Question upgrade : [GitHub Discussions Q&A](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/q-a)
- Bug d'upgrade : [GitHub Issues](https://github.com/humanix-cybersecurity/humanix-academie/issues)
- Urgence (prod cassée) : Discord live + commercial@humanix-cybersecurity.fr (support cloud uniquement)
