#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# backup-db.sh — Sauvegarde chiffree de la BDD Postgres vers FTPS off-site.
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
  # On ne sourcera que les vars BACKUP_*, PG* — pas tout .env (eviter de polluer)
  while IFS= read -r line; do
    [[ "$line" =~ ^(BACKUP_|PG)[A-Z_]+= ]] || continue
    # shellcheck disable=SC2163
    export "$(echo "$line" | sed 's/^export //')"
  done < <(grep -E '^(BACKUP_|PG)[A-Z_]+=' .env || true)
fi

# ----------------------------------------------------------------------------
# Validation config
# ----------------------------------------------------------------------------
REQUIRED_VARS=(
  PGHOST PGUSER PGDATABASE
  BACKUP_AGE_RECIPIENT
)
if [[ "$LOCAL_ONLY" -eq 0 ]]; then
  REQUIRED_VARS+=(BACKUP_FTP_HOST BACKUP_FTP_USER BACKUP_FTP_PASSWORD BACKUP_FTP_PATH)
fi

for var in "${REQUIRED_VARS[@]}"; do
  [[ -n "${!var:-}" ]] || fail "Variable manquante : $var" 1
done

PGPORT="${PGPORT:-5432}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/humanix}"

# Pre-requis binaires
for bin in pg_dump age lftp; do
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
log "Etape 1/5 : pg_dump $PGDATABASE depuis $PGHOST:$PGPORT (user=$PGUSER)..."
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
  log "Etape 3/5 : upload FTPS vers $BACKUP_FTP_HOST$BACKUP_FTP_PATH..."
  REMOTE_FILE="humanix-pg-${TIMESTAMP}.dump.age"

  # lftp avec FTPS Explicit (AUTH TLS, port 21 standard)
  # ssl-force=yes : exige TLS, refuse FTP en clair
  # ssl-protect-data : chiffre aussi le canal de donnees (pas que la commande)
  # net:timeout : evite de bloquer indefiniment sur reseau lent
  lftp -e "
    set ftp:ssl-force yes;
    set ftp:ssl-protect-data yes;
    set ssl:verify-certificate yes;
    set net:timeout 60;
    set net:max-retries 3;
    set net:reconnect-interval-base 5;
    open -u \"$BACKUP_FTP_USER\",\"$BACKUP_FTP_PASSWORD\" \"$BACKUP_FTP_HOST\";
    mkdir -p \"$BACKUP_FTP_PATH\";
    cd \"$BACKUP_FTP_PATH\";
    put -O . \"$ENCRYPTED_FILE\" -o \"$REMOTE_FILE\";
    bye
  " || fail "Upload FTPS a echoue" 4

  log "Upload OK : $BACKUP_FTP_HOST$BACKUP_FTP_PATH/$REMOTE_FILE"
fi

# ----------------------------------------------------------------------------
# 4. Rotation cote FTPS : garde les BACKUP_RETENTION_DAYS plus recents
# ----------------------------------------------------------------------------
if [[ "$LOCAL_ONLY" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
  log "Etape 4/5 : rotation FTPS, conserve $BACKUP_RETENTION_DAYS jours..."
  CUTOFF_DATE=$(date -u -d "$BACKUP_RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null \
                || date -u -v-"${BACKUP_RETENTION_DAYS}"d +%Y%m%d)

  # Liste les fichiers, parse les dates, supprime ceux plus vieux que CUTOFF
  DELETED=$(lftp -e "
    set ftp:ssl-force yes;
    set ssl:verify-certificate yes;
    set net:timeout 30;
    open -u \"$BACKUP_FTP_USER\",\"$BACKUP_FTP_PASSWORD\" \"$BACKUP_FTP_HOST\";
    cd \"$BACKUP_FTP_PATH\";
    cls -1 humanix-pg-*.dump.age 2>/dev/null;
    bye
  " 2>/dev/null | while read -r f; do
    # Extraction de la date : humanix-pg-YYYYMMDD-HHMMSS.dump.age
    FILE_DATE=$(echo "$f" | sed -E 's/^humanix-pg-([0-9]{8})-.*/\1/')
    if [[ "$FILE_DATE" =~ ^[0-9]{8}$ ]] && [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
      echo "$f"
    fi
  done)

  if [[ -n "$DELETED" ]]; then
    while IFS= read -r f; do
      log "  Suppression : $f"
      lftp -e "
        set ftp:ssl-force yes;
        set ssl:verify-certificate yes;
        open -u \"$BACKUP_FTP_USER\",\"$BACKUP_FTP_PASSWORD\" \"$BACKUP_FTP_HOST\";
        cd \"$BACKUP_FTP_PATH\";
        rm -f \"$f\";
        bye
      " 2>/dev/null || log "  WARN : suppression $f a echoue (non bloquant)"
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
