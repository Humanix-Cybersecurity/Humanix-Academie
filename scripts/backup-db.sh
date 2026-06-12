#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# backup-db.sh - Sauvegarde chiffree de la BDD Postgres vers FTPS off-site.
#
# WORKFLOW :
#   1. pg_dump (custom format, compresse) dans /tmp
#   2. Chiffrement age vers BACKUP_AGE_RECIPIENT (cle publique seulement)
#   3. Upload FTPS vers serveur Scaleway (TLS force, certif verifie)
#   4. Rotation : conserve les 30 derniers fichiers cote FTPS
#   5. Nettoyage du /tmp local
#   6. Log dans /var/log/humanix/backup.log (ou stdout si pas root)
#
# PRE-REQUIS sur l'host :
#   - postgresql-client (pg_dump)
#   - age (chiffrement asymetrique Curve25519)
#   - lftp (client FTPS avec retention)
#   - jq (parsing des erreurs)
#
#   Debian/Ubuntu : sudo apt install postgresql-client age lftp jq
#   Arch         : sudo pacman -S postgresql age lftp jq
#
# VARIABLES D'ENV REQUISES (cf. /etc/humanix/backup.env ou .env app) :
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_AGE_RECIPIENT    (cle publique age1xxx)
#   BACKUP_FTP_HOST         (ex: backup-paris-1.dedibox.fr)
#   BACKUP_FTP_USER, BACKUP_FTP_PASSWORD
#   BACKUP_FTP_PATH         (chemin distant, ex: /humanix-academie)
#   BACKUP_RETENTION_DAYS   (defaut 30)
#
# USAGE :
#   ./scripts/backup-db.sh                          # dump + upload + rotation
#   ./scripts/backup-db.sh --dry-run                # tout sauf upload
#   ./scripts/backup-db.sh --local-only             # garde le fichier en local
#
# EXIT CODES :
#   0 = succes
#   1 = erreur de configuration (env manquant)
#   2 = erreur pg_dump
#   3 = erreur chiffrement age
#   4 = erreur upload FTPS
#   5 = erreur rotation
#
# CRON RECOMMANDE :
#   45 2 * * * /opt/humanix-prod/scripts/backup-db.sh >> /var/log/humanix/backup.log 2>&1

set -euo pipefail
IFS=$'\n\t'

# ----------------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------------
log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"
}
fail() {
  log "FATAL: $*"
  exit "${2:-1}"
}

# ----------------------------------------------------------------------------
# Args
# ----------------------------------------------------------------------------
DRY_RUN=0
LOCAL_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=1 ;;
    --local-only) LOCAL_ONLY=1 ;;
    *) fail "Argument inconnu : $arg" ;;
  esac
done

# ----------------------------------------------------------------------------
# Charger l'env (priorite : /etc/humanix/backup.env > .env)
# ----------------------------------------------------------------------------
if [[ -f /etc/humanix/backup.env ]]; then
  # shellcheck disable=SC1091
  source /etc/humanix/backup.env
elif [[ -f .env ]]; then
  # On ne sourcera que les vars BACKUP_*, PG* - pas tout .env (eviter de polluer)
  while IFS= read -r line; do
    [[ "$line" =~ ^(BACKUP_|PG)[A-Z_]+= ]] || continue
    # shellcheck disable=SC2163
    export "$(echo "$line" | sed 's/^export //')"
  done < <(grep -E '^(BACKUP_|PG)[A-Z_]+=' .env || true)
fi

# ----------------------------------------------------------------------------
# Validation config
# ----------------------------------------------------------------------------
# Mode "docker exec" : si BACKUP_PG_CONTAINER est defini, on execute pg_dump
# DANS le container Postgres. Cas typique : Postgres self-host non-expose sur
# l'host (5432/tcp interne uniquement, pas de port publish). Plus securise.
#
# Mode "host" : PGHOST = IP/hostname accessible depuis l'host. Necessite que
# le port Postgres soit publish ou que la BDD soit sur un autre serveur.
DOCKER_MODE=0
if [[ -n "${BACKUP_PG_CONTAINER:-}" ]]; then
  DOCKER_MODE=1
  REQUIRED_VARS=(BACKUP_PG_CONTAINER PGUSER PGDATABASE BACKUP_AGE_RECIPIENT)
else
  REQUIRED_VARS=(PGHOST PGUSER PGDATABASE BACKUP_AGE_RECIPIENT)
fi
if [[ "$LOCAL_ONLY" -eq 0 ]]; then
  REQUIRED_VARS+=(BACKUP_FTP_HOST BACKUP_FTP_USER BACKUP_FTP_PASSWORD BACKUP_FTP_PATH)
fi

for var in "${REQUIRED_VARS[@]}"; do
  [[ -n "${!var:-}" ]] || fail "Variable manquante : $var" 1
done

PGPORT="${PGPORT:-5432}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/humanix}"

# Pre-requis binaires : pg_dump uniquement requis en mode host
# (en mode docker, pg_dump est DANS le container Postgres deja).
if [[ "$DOCKER_MODE" -eq 0 ]]; then
  command -v pg_dump >/dev/null 2>&1 || fail "Binaire manquant : pg_dump" 1
else
  command -v docker >/dev/null 2>&1 || fail "Binaire manquant : docker" 1
  docker ps --filter "name=^${BACKUP_PG_CONTAINER}$" --format '{{.Names}}' \
    | grep -q "^${BACKUP_PG_CONTAINER}$" \
    || fail "Container Postgres introuvable ou arrete : $BACKUP_PG_CONTAINER" 1
fi
for bin in age lftp; do
  command -v "$bin" >/dev/null 2>&1 || fail "Binaire manquant : $bin" 1
done

# ----------------------------------------------------------------------------
# Repertoire de travail local
# ----------------------------------------------------------------------------
mkdir -p "$BACKUP_LOCAL_DIR"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
DUMP_FILE="$BACKUP_LOCAL_DIR/humanix-pg-${TIMESTAMP}.dump"
ENCRYPTED_FILE="${DUMP_FILE}.age"

cleanup() {
  # Toujours retirer le dump non chiffre (le chiffre reste pour preuve locale)
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

# ----------------------------------------------------------------------------
# 1. pg_dump (format custom, compresse natif, restorable selectif)
# ----------------------------------------------------------------------------
if [[ "$DOCKER_MODE" -eq 1 ]]; then
  log "Etape 1/5 : pg_dump (mode docker exec) $PGDATABASE dans container $BACKUP_PG_CONTAINER (user=$PGUSER)..."
  # On execute pg_dump DANS le container (qui a deja le binaire + accees BDD
  # via Unix socket ou 127.0.0.1 local au container). Le stream sort sur
  # stdout et on le redirige vers $DUMP_FILE cote host.
  # PGPASSWORD passe via -e (jamais ecrit dans le filesystem du container).
  docker exec -i \
    -e PGPASSWORD="${PGPASSWORD:-}" \
    "$BACKUP_PG_CONTAINER" \
    pg_dump \
      --username="$PGUSER" \
      --dbname="$PGDATABASE" \
      --format=custom \
      --compress=9 \
      --no-owner \
      --no-privileges \
    > "$DUMP_FILE" \
    || fail "pg_dump (docker exec) a echoue" 2
else
  log "Etape 1/5 : pg_dump (mode host) $PGDATABASE depuis $PGHOST:$PGPORT (user=$PGUSER)..."
  PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$DUMP_FILE" \
    || fail "pg_dump a echoue" 2
fi

DUMP_SIZE=$(stat -c %s "$DUMP_FILE" 2>/dev/null || stat -f %z "$DUMP_FILE")
log "Dump OK : $DUMP_FILE ($DUMP_SIZE octets)"

# ----------------------------------------------------------------------------
# 2. Chiffrement age (asymetrique : seule la cle privee peut dechiffrer)
# ----------------------------------------------------------------------------
log "Etape 2/5 : chiffrement age vers $BACKUP_AGE_RECIPIENT..."
age --recipient "$BACKUP_AGE_RECIPIENT" \
    --output "$ENCRYPTED_FILE" \
    "$DUMP_FILE" \
  || fail "Chiffrement age a echoue" 3

ENC_SIZE=$(stat -c %s "$ENCRYPTED_FILE" 2>/dev/null || stat -f %z "$ENCRYPTED_FILE")
log "Chiffrement OK : $ENCRYPTED_FILE ($ENC_SIZE octets)"

# SHA-256 pour traçabilite / verification post-restore
HASH=$(sha256sum "$ENCRYPTED_FILE" 2>/dev/null | awk '{print $1}' \
       || shasum -a 256 "$ENCRYPTED_FILE" | awk '{print $1}')
log "SHA-256 : $HASH"

# ----------------------------------------------------------------------------
# 3. Upload FTPS (lftp, TLS force, verification certif)
# ----------------------------------------------------------------------------
if [[ "$LOCAL_ONLY" -eq 1 ]]; then
  log "Etape 3/5 : SKIP upload (--local-only). Fichier garde en $ENCRYPTED_FILE"
elif [[ "$DRY_RUN" -eq 1 ]]; then
  log "Etape 3/5 : DRY-RUN, upload simule."
else
  REMOTE_FILE="humanix-pg-${TIMESTAMP}.dump.age"

  # Mode TLS : par defaut "yes" (Explicit AUTH TLS sur port 21). Les serveurs
  # comme Scaleway Backup Space (dedibackup-*.online.net) sont parfois en
  # FTP en clair uniquement. Dans ce cas mettre BACKUP_FTP_TLS=no dans backup.env.
  # SECURITE : meme en FTP clair, le contenu UPLOADED est deja chiffre age,
  # seules les credentials FTP sont en clair (a tourner regulierement).
  BACKUP_FTP_TLS="${BACKUP_FTP_TLS:-yes}"

  if [[ "$BACKUP_FTP_TLS" == "yes" ]]; then
    log "Etape 3/5 : upload FTPS (TLS) vers $BACKUP_FTP_HOST$BACKUP_FTP_PATH..."
  else
    log "Etape 3/5 : upload FTP (clair, TLS desactive) vers $BACKUP_FTP_HOST$BACKUP_FTP_PATH..."
    log "  ⚠ Credentials envoyees en clair sur le reseau. Contenu deja chiffre age, donc safe."
  fi

  # Construction d'un script lftp dans un fichier temp pour eviter les
  # problemes d'escape avec -e quand les variables contiennent des "
  # ou des caracteres speciaux.
  LFTP_SCRIPT=$(mktemp)
  trap 'rm -f "$LFTP_SCRIPT"; cleanup' EXIT  # garde le trap precedent
  {
    if [[ "$BACKUP_FTP_TLS" == "yes" ]]; then
      echo "set ftp:ssl-force yes"
      echo "set ftp:ssl-protect-data yes"
      echo "set ssl:verify-certificate ${BACKUP_FTP_SSL_VERIFY:-yes}"
    else
      echo "set ftp:ssl-force no"
      echo "set ftp:ssl-allow no"
    fi
    echo "set net:timeout 60"
    echo "set net:max-retries 3"
    echo "set net:reconnect-interval-base 5"
    echo "open -u $BACKUP_FTP_USER,$BACKUP_FTP_PASSWORD $BACKUP_FTP_HOST"
    echo "mkdir -p $BACKUP_FTP_PATH"
    echo "cd $BACKUP_FTP_PATH"
    echo "put $ENCRYPTED_FILE -o $REMOTE_FILE"
    echo "bye"
  } > "$LFTP_SCRIPT"

  lftp -f "$LFTP_SCRIPT" || fail "Upload FTP a echoue" 4
  rm -f "$LFTP_SCRIPT"

  log "Upload OK : $BACKUP_FTP_HOST$BACKUP_FTP_PATH/$REMOTE_FILE"
fi

# ----------------------------------------------------------------------------
# 4. Rotation cote FTPS : garde les BACKUP_RETENTION_DAYS plus recents
# ----------------------------------------------------------------------------
if [[ "$LOCAL_ONLY" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
  log "Etape 4/5 : rotation FTPS, conserve $BACKUP_RETENTION_DAYS jours..."
  CUTOFF_DATE=$(date -u -d "$BACKUP_RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null \
                || date -u -v-"${BACKUP_RETENTION_DAYS}"d +%Y%m%d)

  # Helper : genere un script lftp avec la bonne config TLS
  _lftp_header() {
    if [[ "${BACKUP_FTP_TLS:-yes}" == "yes" ]]; then
      echo "set ftp:ssl-force yes"
      echo "set ftp:ssl-protect-data yes"
      echo "set ssl:verify-certificate ${BACKUP_FTP_SSL_VERIFY:-yes}"
    else
      echo "set ftp:ssl-force no"
      echo "set ftp:ssl-allow no"
    fi
    echo "set net:timeout 30"
  }

  # Liste les fichiers, parse les dates, supprime ceux plus vieux que CUTOFF
  LFTP_LS=$(mktemp)
  {
    _lftp_header
    echo "open -u $BACKUP_FTP_USER,$BACKUP_FTP_PASSWORD $BACKUP_FTP_HOST"
    echo "cd $BACKUP_FTP_PATH"
    echo "cls -1 humanix-pg-*.dump.age"
    echo "bye"
  } > "$LFTP_LS"

  DELETED=$(lftp -f "$LFTP_LS" 2>/dev/null | while read -r f; do
    # Extraction de la date : humanix-pg-YYYYMMDD-HHMMSS.dump.age
    FILE_DATE=$(echo "$f" | sed -E 's/^humanix-pg-([0-9]{8})-.*/\1/')
    if [[ "$FILE_DATE" =~ ^[0-9]{8}$ ]] && [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
      echo "$f"
    fi
  done)
  rm -f "$LFTP_LS"

  if [[ -n "$DELETED" ]]; then
    while IFS= read -r f; do
      log "  Suppression : $f"
      LFTP_RM=$(mktemp)
      {
        _lftp_header
        echo "open -u $BACKUP_FTP_USER,$BACKUP_FTP_PASSWORD $BACKUP_FTP_HOST"
        echo "cd $BACKUP_FTP_PATH"
        echo "rm -f $f"
        echo "bye"
      } > "$LFTP_RM"
      lftp -f "$LFTP_RM" 2>/dev/null || log "  WARN : suppression $f a echoue (non bloquant)"
      rm -f "$LFTP_RM"
    done <<< "$DELETED"
  else
    log "Rotation : aucun fichier a supprimer."
  fi
fi

# ----------------------------------------------------------------------------
# 5. Rotation locale : on garde 7 jours en local (failover rapide)
# ----------------------------------------------------------------------------
log "Etape 5/5 : rotation locale, conserve 7 jours dans $BACKUP_LOCAL_DIR..."
find "$BACKUP_LOCAL_DIR" -name "humanix-pg-*.dump.age" -mtime +7 -delete 2>/dev/null || true

log "Sauvegarde terminee avec succes."
log "Fichier chiffre local : $ENCRYPTED_FILE"
log "Taille : dump=$DUMP_SIZE octets, chiffre=$ENC_SIZE octets"
log "SHA-256 : $HASH"
