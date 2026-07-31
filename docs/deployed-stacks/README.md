# Copies d'archive des stacks déployées

> **Ce ne sont PAS des fichiers de déploiement.** Docker ne les lit jamais. Ce
> sont des copies de référence des `docker-compose.yml` réellement déployés sur
> `humanix-prod-01`, gardées dans git comme filet de sécurité contre une perte
> machine. Contexte complet : [`../INFRA_STACKS_DEPLOYED.md`](../INFRA_STACKS_DEPLOYED.md).

## Pourquoi ce dossier existe

Décision du 2026-07-31 : les fichiers `/opt/humanix-{prod,demo}/docker-compose.yml`
font autorité et ont divergé du dépôt (« divergence assumée »). Git ne pilote
pas ce déploiement. Cette archive est le seul moyen de reconstruire la config si
la machine est perdue, et elle met cette config à l'abri hors-machine par
construction (elle vit dans git).

## Quoi déposer ici

- `humanix-prod.docker-compose.yml` : copie de `/opt/humanix-prod/docker-compose.yml`
- `humanix-demo.docker-compose.yml` : copie de `/opt/humanix-demo/docker-compose.yml`

**Jamais** de `.env` ni de secret en dur (mots de passe, clés, tokens). Si un
compose contient une valeur sensible, la remplacer par un placeholder avant de
committer.

## Comment rafraîchir

À chaque modification manuelle d'un fichier `/opt`, recopier son contenu ici et
committer. Le tarball produit par [`../../infra/backup-deployed-compose.sh`](../../infra/backup-deployed-compose.sh)
contient exactement ces fichiers si tu préfères les en extraire.
