#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# restore-db.sh - Restauration interactive depuis backup chiffre.
#
# Procedure :
#   1. Liste les backups disponibles (local, ou S3 / FTPS selon BACKUP_TARGET)
#   2. Selection par index ou par date
#   3. Telechargement si distant
#   4. Dechiffrement age (cle privee requise)
#   5. Confirmation EXPLICITE de l'operateur (anti-erreur destructive)
#   6. pg_restore vers la base cible (PGDATABASE, ou override --target)
#
# SECURITE : ce script est INTENTIONNELLEMENT INTERACTIF. Aucun mode "force"
# ou "yes-i-know" : restaurer une BDD ecrase des donnees critiques, ca se
# fait avec un humain dans la boucle qui valide chaque etape.
#
# PRE-REQUIS :
#   - postgresql-client (pg_restore)
#   - age (binaire de dechiffrement)
#   - lftp (si BACKUP_TARGET=ftp) ou awscli (si BACKUP_TARGET=s3)
#   - Cle privee age accessible localement (ex: ~/.config/humanix/backup.key)
#
# USAGE :
#   ./scripts/restore-db.sh                    # mode interactif
#   ./scripts/restore-db.sh --local            # ne propose que les locaux
#   ./scripts/restore-db.sh --target=mydb_test # restore vers DB autre que PGDATABASE
#   ./scripts/restore-db.sh --file=path.age    # restore un fichier specifique
#
# EXIT CODES :
#   0 = restore reussi
#   1 = config invalide / cle introuvable
#   2 = aucun backup trouve
#   3 = telechargement / dechiffrement echec
#   4 = pg_restore echec
#   10 = annule par l'operateur

set -euo pipefail
IFS=$'\n\t'

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*" >&2; }
fail() { log "FATAL: $*"; exit "${2:-1}"; }
ask() {
  local prompt="$1" reply
  read -r -p "$prompt " reply </dev/tty || fail "Pas de TTY interactif" 10
  echo "$reply"
}

# Compte les lignes non vides d'une chaine.
#
# `grep -c .` est un piege sur une entree VIDE : il imprime 0 et sort en
# code 1. Le `|| echo 0` qui accompagnait chaque appel ajoutait donc un
# SECOND zero, donnant la chaine "0\n0", que $(( )) refuse :
#
#   restore-db.sh: line 158: 0
#   0: arithmetic syntax error in expression (error token is "0")
#
# Le defaut ne se manifestait pas en production, ou /var/backups/humanix
# contient toujours des fichiers. Il apparait des qu'on restaure sur une
# machine propre -- c'est-a-dire dans un vrai test de restauration.
compter_lignes() {
  [[ -z "$1" ]] && { echo 0; return; }
  printf '%s\n' "$1" | grep -c . || true
}

# ----------------------------------------------------------------------------
# Args
# ----------------------------------------------------------------------------
LOCAL_ONLY=0
TARGET_DB=""
FILE_ARG=""
for arg in "$@"; do
  case "$arg" in
    --local)        LOCAL_ONLY=1 ;;
    --target=*)     TARGET_DB="${arg#*=}" ;;
    --file=*)       FILE_ARG="${arg#*=}" ;;
    *) fail "Argument inconnu : $arg" ;;
  esac
done

# ----------------------------------------------------------------------------
# Env loading (meme logique que backup-db.sh)
# ----------------------------------------------------------------------------
# `set -a` et AWS_* : cf. le commentaire equivalent dans backup-db.sh. Les
# deux scripts doivent lire la configuration DE LA MEME FACON, sans quoi on
# decouvrirait l'ecart le jour de la restauration — le pire moment.
if [[ -f /etc/humanix/backup.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/humanix/backup.env
  set +a
elif [[ -f .env ]]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^(BACKUP_|PG|AWS_)[A-Z_]+= ]] || continue
    export "$(echo "$line" | sed 's/^export //')"
  done < <(grep -E '^(BACKUP_|PG|AWS_)[A-Z_]+=' .env || true)
fi

PGPORT="${PGPORT:-5432}"
TARGET_DB="${TARGET_DB:-$PGDATABASE}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/humanix}"
AGE_KEY_FILE="${BACKUP_AGE_KEY_FILE:-$HOME/.config/humanix/backup.key}"

# Destination, lue a l'identique de backup-db.sh.
BACKUP_TARGET="${BACKUP_TARGET:-ftp}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-postgres/}"
[[ "$BACKUP_S3_PREFIX" == */ ]] || BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX}/"
BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-https://s3.fr-par.scw.cloud}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-fr-par}"
_s3() { aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" "$@"; }

# Mode docker exec si BACKUP_PG_CONTAINER defini (cf. backup-db.sh)
DOCKER_MODE=0
if [[ -n "${BACKUP_PG_CONTAINER:-}" ]]; then
  DOCKER_MODE=1
fi

# Verifications de base
[[ -n "${PGUSER:-}" ]] || fail "PGUSER non defini" 1
[[ -n "$TARGET_DB" ]] || fail "Base cible non specifiee" 1
[[ -f "$AGE_KEY_FILE" ]] || fail "Cle privee age introuvable : $AGE_KEY_FILE" 1
if [[ "$DOCKER_MODE" -eq 0 ]]; then
  [[ -n "${PGHOST:-}" ]] || fail "PGHOST non defini (ou definir BACKUP_PG_CONTAINER pour mode docker)" 1
  command -v pg_restore >/dev/null 2>&1 || fail "Binaire manquant : pg_restore" 1
else
  command -v docker >/dev/null 2>&1 || fail "Binaire manquant : docker" 1
  docker ps --filter "name=^${BACKUP_PG_CONTAINER}$" --format '{{.Names}}' \
    | grep -q "^${BACKUP_PG_CONTAINER}$" \
    || fail "Container Postgres introuvable ou arrete : $BACKUP_PG_CONTAINER" 1
fi
command -v age >/dev/null 2>&1 || fail "Binaire manquant : age" 1

# ----------------------------------------------------------------------------
# 1. Selection du backup
# ----------------------------------------------------------------------------
SELECTED_FILE=""

if [[ -n "$FILE_ARG" ]]; then
  [[ -f "$FILE_ARG" ]] || fail "Fichier introuvable : $FILE_ARG" 2
  SELECTED_FILE="$FILE_ARG"
  log "Mode --file : utilisation directe de $SELECTED_FILE"
else
  log "Recherche des backups disponibles..."
  echo ""
  echo "=== Backups LOCAUX ($BACKUP_LOCAL_DIR) ==="
  LOCAL_FILES=$(find "$BACKUP_LOCAL_DIR" -name "humanix-pg-*.dump.age" 2>/dev/null | sort -r || true)
  if [[ -z "$LOCAL_FILES" ]]; then
    echo "  (aucun)"
  else
    echo "$LOCAL_FILES" | nl
  fi

  REMOTE_FILES=""
  if [[ "$LOCAL_ONLY" -eq 0 && "$BACKUP_TARGET" == "s3" ]] \
     && command -v aws >/dev/null 2>&1 && [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
    echo ""
    echo "=== Backups DISTANTS (S3 s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX) ==="
    # On retire le prefixe pour n'afficher que le nom : la selection par
    # numero et le nommage local restent alors identiques aux deux modes.
    #
    # Le `grep` final n'est PAS decoratif. Sur un resultat vide, l'AWS CLI
    # n'imprime pas une ligne vide mais le mot litteral « None » : sans ce
    # filtre, le menu proposerait de restaurer un fichier nomme None.
    # Verifie contre le bucket reel le 2026-08-13, alors encore vide.
    REMOTE_FILES=$(_s3 s3api list-objects-v2 \
        --bucket "$BACKUP_S3_BUCKET" --prefix "$BACKUP_S3_PREFIX" \
        --query 'Contents[].Key' --output text 2>/dev/null \
      | tr '\t' '\n' \
      | sed "s|^${BACKUP_S3_PREFIX}||" \
      | grep -E '^humanix-pg-.*\.dump\.age$' | sort -r || true)
    if [[ -z "$REMOTE_FILES" ]]; then
      echo "  (aucun)"
    else
      LOCAL_COUNT=$(compter_lignes "$LOCAL_FILES")
      echo "$REMOTE_FILES" | nl -v $((LOCAL_COUNT + 1))
    fi
  elif [[ "$LOCAL_ONLY" -eq 0 ]] && command -v lftp >/dev/null 2>&1 \
     && [[ -n "${BACKUP_FTP_HOST:-}" ]]; then
    echo ""
    echo "=== Backups DISTANTS (FTP/FTPS $BACKUP_FTP_HOST$BACKUP_FTP_PATH) ==="
    LFTP_SCRIPT=$(mktemp)
    {
      if [[ "${BACKUP_FTP_TLS:-yes}" == "yes" ]]; then
        echo "set ftp:ssl-force yes"
        echo "set ftp:ssl-protect-data yes"
        echo "set ssl:verify-certificate ${BACKUP_FTP_SSL_VERIFY:-yes}"
      else
        echo "set ftp:ssl-force no"
        echo "set ftp:ssl-allow no"
      fi
      echo "set net:timeout 30"
      echo "open -u $BACKUP_FTP_USER,$BACKUP_FTP_PASSWORD $BACKUP_FTP_HOST"
      echo "cd $BACKUP_FTP_PATH"
      echo "cls -1 humanix-pg-*.dump.age"
      echo "bye"
    } > "$LFTP_SCRIPT"
    REMOTE_FILES=$(lftp -f "$LFTP_SCRIPT" 2>/dev/null | sort -r || true)
    rm -f "$LFTP_SCRIPT"
    if [[ -z "$REMOTE_FILES" ]]; then
      echo "  (aucun)"
    else
      # Index decale : on commence apres les locaux pour eviter collision
      LOCAL_COUNT=$(compter_lignes "$LOCAL_FILES")
      echo "$REMOTE_FILES" | nl -v $((LOCAL_COUNT + 1))
    fi
  fi

  echo ""
  CHOICE=$(ask "Numero du backup a restaurer (Enter pour annuler) :")
  [[ -z "$CHOICE" ]] && fail "Annule par l'operateur" 10

  if [[ "$CHOICE" =~ ^[0-9]+$ ]]; then
    LOCAL_COUNT=$(compter_lignes "$LOCAL_FILES")
    if [[ "$CHOICE" -le "$LOCAL_COUNT" ]]; then
      SELECTED_FILE=$(echo "$LOCAL_FILES" | sed -n "${CHOICE}p")
    else
      REMOTE_IDX=$((CHOICE - LOCAL_COUNT))
      REMOTE_NAME=$(echo "$REMOTE_FILES" | sed -n "${REMOTE_IDX}p")
      [[ -n "$REMOTE_NAME" ]] || fail "Index invalide : $CHOICE" 2

      mkdir -p "$BACKUP_LOCAL_DIR"

      if [[ "$BACKUP_TARGET" == "s3" ]]; then
        log "Telechargement de $REMOTE_NAME depuis S3..."
        _s3 s3api get-object \
          --bucket "$BACKUP_S3_BUCKET" \
          --key "${BACKUP_S3_PREFIX}${REMOTE_NAME}" \
          "$BACKUP_LOCAL_DIR/$REMOTE_NAME" >/dev/null \
          || fail "Telechargement S3 a echoue" 3
        SELECTED_FILE="$BACKUP_LOCAL_DIR/$REMOTE_NAME"
        log "Telechargement OK : $SELECTED_FILE"
      else
        log "Telechargement de $REMOTE_NAME depuis FTP/FTPS..."
        LFTP_GET=$(mktemp)
        {
          if [[ "${BACKUP_FTP_TLS:-yes}" == "yes" ]]; then
            echo "set ftp:ssl-force yes"
            echo "set ftp:ssl-protect-data yes"
            echo "set ssl:verify-certificate ${BACKUP_FTP_SSL_VERIFY:-yes}"
          else
            echo "set ftp:ssl-force no"
            echo "set ftp:ssl-allow no"
          fi
          echo "set net:timeout 60"
          echo "open -u $BACKUP_FTP_USER,$BACKUP_FTP_PASSWORD $BACKUP_FTP_HOST"
          echo "cd $BACKUP_FTP_PATH"
          echo "get $REMOTE_NAME -o $BACKUP_LOCAL_DIR/$REMOTE_NAME"
          echo "bye"
        } > "$LFTP_GET"
        lftp -f "$LFTP_GET" || { rm -f "$LFTP_GET"; fail "Telechargement FTP/FTPS a echoue" 3; }
        rm -f "$LFTP_GET"
        SELECTED_FILE="$BACKUP_LOCAL_DIR/$REMOTE_NAME"
        log "Telechargement OK : $SELECTED_FILE"
      fi
    fi
  else
    fail "Choix invalide : $CHOICE" 2
  fi
fi

[[ -f "$SELECTED_FILE" ]] || fail "Fichier introuvable apres selection : $SELECTED_FILE" 2

# ----------------------------------------------------------------------------
# 2. Dechiffrement
# ----------------------------------------------------------------------------
DECRYPTED_FILE="${SELECTED_FILE%.age}.tmp.dump"
log "Dechiffrement vers $DECRYPTED_FILE..."
age --decrypt --identity "$AGE_KEY_FILE" \
    --output "$DECRYPTED_FILE" \
    "$SELECTED_FILE" \
  || fail "Dechiffrement age echec (mauvaise cle ?)" 3

DEC_SIZE=$(stat -c %s "$DECRYPTED_FILE" 2>/dev/null || stat -f %z "$DECRYPTED_FILE")
log "Dechiffrement OK : $DEC_SIZE octets"

cleanup() {
  rm -f "$DECRYPTED_FILE"
}
trap cleanup EXIT

# ----------------------------------------------------------------------------
# 3. Confirmation explicite (anti-erreur destructive)
# ----------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "  CONFIRMATION RESTAURATION"
echo "============================================================"
echo "  Backup source  : $SELECTED_FILE"
echo "  Taille dump    : $DEC_SIZE octets"
echo "  Base cible     : $TARGET_DB"
if [[ "$DOCKER_MODE" -eq 1 ]]; then
  echo "  Mode           : docker exec dans container $BACKUP_PG_CONTAINER"
else
  echo "  Host           : $PGHOST:$PGPORT"
fi
echo "  Utilisateur    : $PGUSER"
echo ""
echo "  ⚠  Cette operation va REMPLACER le contenu de '$TARGET_DB'."
echo "     Les donnees actuelles seront PERDUES (option --clean).
"
echo "============================================================"
CONFIRM=$(ask "Tape 'OUI JE CONFIRME' (en majuscules, exactement) :")
[[ "$CONFIRM" == "OUI JE CONFIRME" ]] || fail "Annule (confirmation manquante)" 10

# ----------------------------------------------------------------------------
# 4. pg_restore
# ----------------------------------------------------------------------------
log "pg_restore en cours (cela peut prendre plusieurs minutes)..."

if [[ "$DOCKER_MODE" -eq 1 ]]; then
  # Mode docker exec : on streamline le fichier dechiffre dans stdin du container
  # qui execute pg_restore en lisant depuis stdin (- en argument).
  # --jobs=4 n'est PAS compatible avec --format=custom + stdin pour pg_restore
  # (limitation Postgres). On reste sur jobs=1 en docker mode.
  docker exec -i \
    -e PGPASSWORD="${PGPASSWORD:-}" \
    "$BACKUP_PG_CONTAINER" \
    pg_restore \
      --username="$PGUSER" \
      --dbname="$TARGET_DB" \
      --clean \
      --if-exists \
      --no-owner \
      --no-privileges \
      --verbose \
    < "$DECRYPTED_FILE" \
    || fail "pg_restore (docker exec) a echoue" 4
  log "Restauration terminee avec succes."
  log "Base : $TARGET_DB dans container $BACKUP_PG_CONTAINER"
else
  PGPASSWORD="${PGPASSWORD:-}" pg_restore \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$TARGET_DB" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --jobs=4 \
    --verbose \
    "$DECRYPTED_FILE" \
    || fail "pg_restore a echoue" 4
  log "Restauration terminee avec succes."
  log "Base : $TARGET_DB sur $PGHOST:$PGPORT"
fi
log ""
log "Etapes de validation recommandees :"
log "  1. psql -c 'SELECT COUNT(*) FROM \"Tenant\";'"
log "  2. psql -c 'SELECT COUNT(*) FROM \"User\";'"
log "  3. psql -c 'SELECT MAX(\"createdAt\") FROM \"AuditLog\";'"
log "  4. Tester un login admin de bout en bout"
