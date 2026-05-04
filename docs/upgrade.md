# Upgrade — Procédure de mise à jour

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

## Procédure standard (Docker Compose)

### Étape 1 — Backup obligatoire

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

### Étape 2 — Lis le CHANGELOG

```bash
git fetch --tags
git log $(git describe --tags --abbrev=0)..main --oneline
# OU consulter directement :
# https://github.com/humanix-cybersecurity/humanix-academie/releases
```

Si la version cible contient un `BREAKING CHANGE:`, ARRÊTE-TOI ICI et lis
la section **Migrations majeures** plus bas avant de continuer.

### Étape 3 — Pull la nouvelle version

```bash
# Récupère le code et les nouvelles images Docker
git fetch --tags
git checkout v1.2.0   # ou main pour la branche de dev (déconseillé en prod)

# Compare les configs
diff -u .env .env.example | grep "^[-+]"
# Si nouvelles variables, ajoute-les à .env
```

### Étape 4 — Applique l'upgrade

```bash
# Pull les images Docker mises à jour
docker compose pull

# Redémarre les services (migrations Prisma s'appliquent au démarrage)
docker compose up -d --remove-orphans

# Suis les logs en temps réel
docker compose logs -f app
# Ctrl+C quand tu vois : "▲ Next.js ready on http://0.0.0.0:3000"
```

### Étape 5 — Vérification post-upgrade

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

### Étape 6 — Cleanup (optionnel)

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
| v1.0.0  | mai 2026          | Initial OSS release   | —     |
| v1.1.0  | juin 2026 (prévu) | Helm chart Kubernetes | —     |
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
