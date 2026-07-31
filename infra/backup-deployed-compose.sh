#!/usr/bin/env bash
# Sauvegarde les docker-compose.yml REELLEMENT deployes (prod + demo) qui ont
# diverge du depot. Contexte : docs/INFRA_STACKS_DEPLOYED.md (decision du
# 2026-07-31, "divergence assumee"). A lancer SUR le serveur (humanix-prod-01),
# idealement via cron. Lecture seule sur les sources, aucune action destructive.
set -euo pipefail

# Dossiers des stacks deployees (adapter si la topologie change).
STACKS=(/opt/humanix-prod /opt/humanix-demo)

# Ou stocker les snapshots locaux horodates.
BACKUP_DIR="${COMPOSE_BACKUP_DIR:-/var/backups/humanix-compose}"

# Cible hors-machine (rsync/scp), p.ex. "user@backup-host:/srv/humanix-compose/".
# Laisser vide desactive la copie distante MAIS le script avertira : une archive
# restee sur la machine a sauver ne protege de rien.
OFFSITE_TARGET="${COMPOSE_BACKUP_OFFSITE:-}"

ts="$(date +%Y%m%d-%H%M%S)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "== Snapshot des compose deployes ($ts) =="
found=0
for dir in "${STACKS[@]}"; do
  # On archive UNIQUEMENT les compose. Jamais les .env : ils contiennent des
  # secrets et n'ont rien a faire dans une archive versionnable.
  for f in "$dir"/docker-compose*.yml; do
    [ -e "$f" ] || continue
    name="$(basename "$dir")__$(basename "$f")"
    cp -p "$f" "$work/$name"
    sha="$(sha256sum "$f" | cut -d' ' -f1)"
    echo "  + $f  (sha256 ${sha:0:12})"
    found=$((found + 1))
  done
done

if [ "$found" -eq 0 ]; then
  echo "!! Aucun docker-compose*.yml trouve dans : ${STACKS[*]}" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
archive="$BACKUP_DIR/compose-deploye-$ts.tar.gz"
manifest="$BACKUP_DIR/compose-deploye-$ts.sha256"
tar -czf "$archive" -C "$work" .
(cd "$work" && sha256sum ./*) >"$manifest"
echo "== Archive locale : $archive ($found fichier(s)) =="

if [ -n "$OFFSITE_TARGET" ]; then
  echo "== Copie hors-machine -> $OFFSITE_TARGET =="
  rsync -a "$archive" "$manifest" "$OFFSITE_TARGET"
  echo "== Termine (archive + copie distante) =="
else
  echo "!! COMPOSE_BACKUP_OFFSITE non defini : l'archive est restee SUR la" >&2
  echo "   machine a sauver. Definir une cible hors-machine (ou committer les" >&2
  echo "   fichiers dans docs/deployed-stacks/) pour proteger reellement contre" >&2
  echo "   une perte de humanix-prod-01." >&2
  exit 2
fi
