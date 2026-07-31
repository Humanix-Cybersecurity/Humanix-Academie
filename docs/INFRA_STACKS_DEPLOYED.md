# Stacks Docker déployées et divergence assumée

> Décision du 2026-07-31 (audit `humanix-prod-01`). À lire avant toute
> intervention sur les conteneurs en production.

## Le constat

Deux stacks tournent sur `humanix-prod-01` :

| Stack | Emplacement serveur | Fichier de référence en dépôt |
|---|---|---|
| Production | `/opt/humanix-prod/docker-compose.yml` | `docker-compose.yml` (base, **a divergé**) |
| Démo | `/opt/humanix-demo/docker-compose.yml` | **aucun** (c'est un `docker-compose.demo.yml` copié, jamais versionné) |

Les fichiers réellement déployés ont été édités à la main sur la machine et ne
correspondent plus aux fichiers suivis :

- `/opt/humanix-prod/docker-compose.yml` porte des modifications locales jamais
  recommittées.
- `/opt/humanix-demo/docker-compose.yml` n'est la copie d'aucun fichier suivi :
  la configuration de la stack démo n'existe QUE sur ce serveur.

## La décision : divergence assumée

Choix acté le 2026-07-31 : **les fichiers `/opt/...` font autorité**. Le dépôt
ne pilote pas ce déploiement (pas de `git pull` + `docker compose up`). Les
fichiers `docker-compose*.yml` suivis servent de **référence / base**, pas de
source de déploiement.

### La contrepartie, non négociable

Puisque git n'est PAS la source de vérité de ces fichiers, ils doivent être
**sauvegardés hors-machine**. Sans ça, une perte de `humanix-prod-01` emporte
la configuration démo sans aucun moyen de la reconstruire. Voir « Sauvegarde »
ci-dessous : c'est la condition qui rend cette option acceptable plutôt que
dangereuse.

## Convention healthchecks (à respecter dans les fichiers /opt ET suivis)

Piège vérifié le 2026-07-31 : trois conteneurs étaient `(unhealthy)` alors
qu'ils servaient du 200.

- **Toujours `127.0.0.1`, jamais `localhost`** dans un healthcheck de
  conteneur. Dans le conteneur, `localhost` résout aussi `::1` ; les apps
  n'écoutent qu'en IPv4 (`0.0.0.0`) et BusyBox `wget` tente l'IPv6 en premier
  sans repli, donc le healthcheck échoue alors que le service répond.
- **N'utiliser que des binaires présents dans l'image** : `wget` sur Alpine,
  jamais `curl` (absent). Un healthcheck TTS démo appelait `curl` : échec
  silencieux.

Le dépôt montre déjà le motif correct : `docker-compose.yml` (HAProxy et TTS)
utilise `127.0.0.1` + `wget`. Les correctifs sont déjà appliqués sur le serveur
(7 conteneurs `healthy`), originaux sauvegardés en `*.avant-20260731`.

## Sauvegarde des fichiers déployés

Deux niveaux, cumulatifs :

1. **Snapshot horodaté + copie hors-machine** (à croner) :
   ```bash
   infra/backup-deployed-compose.sh
   ```
   Archive les `docker-compose*.yml` de `/opt/humanix-prod` et
   `/opt/humanix-demo` (les compose uniquement, jamais les `.env`) dans un
   tarball daté avec manifeste de sommes de contrôle, puis pousse la copie vers
   la cible hors-machine configurée (`COMPOSE_BACKUP_OFFSITE`). Le script crie
   si aucune cible distante n'est définie : une archive restée sur la machine à
   sauver ne protège de rien.

2. **Copie de référence dans git (recommandé)** : coller le contenu courant des
   deux fichiers dans `docs/deployed-stacks/` (voir le README de ce dossier).
   C'est une **copie d'archive**, pas une source de déploiement : elle ne sert
   qu'à reconstruire en cas de perte machine, et met la config à l'abri
   hors-machine par construction (elle est dans git). À rafraîchir à chaque
   modification manuelle des fichiers `/opt`.

## Si un jour on veut re-converger

Revenir au modèle « git pilote le déploiement » (option écartée le 2026-07-31)
reste possible : versionner `docker-compose.demo.yml`, réconcilier les modifs
locales de prod dans `docker-compose.yml` (secrets vers `.env`), déployer par
checkout. Noté ici pour mémoire.
