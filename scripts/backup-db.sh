#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# backup-db.sh - Sauvegarde chiffree de la BDD Postgres, hors site.
#
# DEUX DESTINATIONS, AU CHOIX (BACKUP_TARGET) :
#
#   s3   Object Storage Scaleway, avec verrou WORM par objet. RECOMMANDE.
#   ftp  FTPS/FTP historique. Conserve pour le retour arriere.
#
# POURQUOI S3 PLUTOT QUE LE FTP
#
#   Le Backup Space Scaleway (dedibackup-*.online.net) REFUSE `AUTH TLS`.
#   La seule facon de s'y connecter est le FTP en clair : identifiants
#   lisibles sur le reseau a chaque nuit. Le CONTENU reste protege — il est
#   chiffre par age avant de partir — mais des identifiants qui transitent
#   en clair 365 fois par an finissent par etre captes.
#
#   Surtout, le FTP n'offre AUCUNE immuabilite. Un attaquant qui obtient ces
#   identifiants efface les sauvegardes, puis chiffre la production. C'est le
#   deroule ordinaire d'un rancongiciel, et le FTP n'y oppose rien.
#
#   En S3 avec Object Lock COMPLIANCE, la suppression est refusee par le
#   stockage lui-meme pendant toute la duree du verrou. Ni la machine
#   compromise, ni la cle de depot, ni le compte proprietaire ne peuvent
#   passer outre. C'est la seule propriete qui distingue une sauvegarde
#   d'une copie.
#
# WORKFLOW :
#   1. pg_dump (custom format, compresse) dans /tmp
#   2. Chiffrement age vers BACKUP_AGE_RECIPIENT (cle publique seulement)
#   3. Upload vers la destination choisie (S3 avec verrou WORM, ou FTPS)
#   4. Rotation : cycle de vie du bucket en S3, suppression active en FTP
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
#   BACKUP_RETENTION_DAYS   (defaut 30 - en S3, DUREE DU VERROU WORM)
#
# VARIABLES POUR BACKUP_TARGET=s3 :
#   BACKUP_S3_BUCKET        bucket avec Object Lock ACTIVE A LA CREATION
#   AWS_ACCESS_KEY_ID       cle en ecriture
#   AWS_SECRET_ACCESS_KEY
#   BACKUP_S3_PREFIX        defaut postgres/   (cf. « un seul bucket » plus bas)
#   BACKUP_S3_ENDPOINT      defaut https://s3.fr-par.scw.cloud
#   BACKUP_S3_REGION        defaut fr-par
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
#   4 = erreur upload (S3 ou FTPS), ou verification post-upload echouee
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
# `set -a` : `source` seul cree des variables de SHELL. `aws`, `lftp` et
# `pg_dump` sont des processus ENFANTS et ne lisent que l'ENVIRONNEMENT. Sans
# l'export automatique, un backup.env parfaitement valide produirait un
# « Variable manquante : AWS_ACCESS_KEY_ID » quelques lignes plus bas.
if [[ -f /etc/humanix/backup.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/humanix/backup.env
  set +a
elif [[ -f .env ]]; then
  # On ne sourcera que les vars BACKUP_*, PG*, AWS_* - pas tout .env.
  # AWS_* est indispensable depuis BACKUP_TARGET=s3 : sans lui, les
  # identifiants du bucket seraient ignores EN SILENCE.
  while IFS= read -r line; do
    [[ "$line" =~ ^(BACKUP_|PG|AWS_)[A-Z_]+= ]] || continue
    # shellcheck disable=SC2163
    export "$(echo "$line" | sed 's/^export //')"
  done < <(grep -E '^(BACKUP_|PG|AWS_)[A-Z_]+=' .env || true)
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
# Destination. Defaut `ftp` : le comportement historique reste celui d'une
# installation qui n'a rien declare, donc aucune migration surprise.
BACKUP_TARGET="${BACKUP_TARGET:-ftp}"
case "$BACKUP_TARGET" in
  s3|ftp) : ;;
  *) fail "BACKUP_TARGET invalide : '$BACKUP_TARGET' (attendu : s3 ou ftp)" 1 ;;
esac

if [[ "$LOCAL_ONLY" -eq 0 ]]; then
  if [[ "$BACKUP_TARGET" == "s3" ]]; then
    REQUIRED_VARS+=(BACKUP_S3_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY)
  else
    REQUIRED_VARS+=(BACKUP_FTP_HOST BACKUP_FTP_USER BACKUP_FTP_PASSWORD BACKUP_FTP_PATH)
  fi
fi

for var in "${REQUIRED_VARS[@]}"; do
  [[ -n "${!var:-}" ]] || fail "Variable manquante : $var" 1
done

PGPORT="${PGPORT:-5432}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/humanix}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-postgres/}"
BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-https://s3.fr-par.scw.cloud}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-fr-par}"

# Un prefixe DOIT se terminer par « / », sans quoi `postgres` et
# `postgresql-vieux` tomberaient sous la meme regle de cycle de vie.
[[ "$BACKUP_S3_PREFIX" == */ ]] || BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX}/"

_s3() { aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" "$@"; }

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
# On n'exige que ce dont la destination retenue a besoin : reclamer `lftp`
# sur une machine passee en S3 serait une panne inventee de toutes pieces.
REQUIRED_BINS=(age)
if [[ "$LOCAL_ONLY" -eq 0 ]]; then
  if [[ "$BACKUP_TARGET" == "s3" ]]; then
    REQUIRED_BINS+=(aws)
  else
    REQUIRED_BINS+=(lftp)
  fi
fi
for bin in "${REQUIRED_BINS[@]}"; do
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
# 3. Upload hors site : S3 avec verrou WORM, ou FTPS historique
# ----------------------------------------------------------------------------
if [[ "$LOCAL_ONLY" -eq 1 ]]; then
  log "Etape 3/5 : SKIP upload (--local-only). Fichier garde en $ENCRYPTED_FILE"
elif [[ "$DRY_RUN" -eq 1 ]]; then
  log "Etape 3/5 : DRY-RUN, upload simule."

elif [[ "$BACKUP_TARGET" == "s3" ]]; then
  # -------------------------------------------------------------------------
  # UN SEUL BUCKET, DEUX PREFIXES, DEUX DUREES
  # -------------------------------------------------------------------------
  #
  # Les sauvegardes partagent le bucket des archives d'audit. C'est possible
  # parce que la retention Object Lock se pose OBJET PAR OBJET au depot, et
  # que le bucket n'a AUCUNE regle de retention par defaut :
  #
  #   auditlog/   verrou 366 jours   (obligation legale, mensuel)
  #   postgres/   verrou  30 jours   (fenetre de restauration, quotidien)
  #
  # Si une regle de retention par defaut etait un jour ajoutee au bucket,
  # elle s'appliquerait aux objets deposes SANS verrou explicite. Ce script
  # en pose toujours un, il n'est donc pas concerne — mais la regle
  # verrouillerait les sauvegardes de tout autre outil pour 366 jours.
  OBJET="${BACKUP_S3_PREFIX}humanix-pg-${TIMESTAMP}.dump.age"

  RETENIR_JUSQU_A=$(date -u -d "+${BACKUP_RETENTION_DAYS} days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -u -v"+${BACKUP_RETENTION_DAYS}d" +"%Y-%m-%dT%H:%M:%SZ")

  log "Etape 3/5 : upload S3 vers s3://$BACKUP_S3_BUCKET/$OBJET..."

  # COMPLIANCE et non GOVERNANCE : en GOVERNANCE, un porteur du droit
  # s3:BypassGovernanceRetention efface malgre le verrou. Comme l'interet
  # meme du verrou est de resister a un compte compromis, GOVERNANCE
  # protegerait contre l'accident mais pas contre l'attaque.
  _s3 s3api put-object \
    --bucket "$BACKUP_S3_BUCKET" \
    --key "$OBJET" \
    --body "$ENCRYPTED_FILE" \
    --object-lock-mode COMPLIANCE \
    --object-lock-retain-until-date "$RETENIR_JUSQU_A" \
    --metadata "sha256=$HASH,base=$PGDATABASE" \
    >/dev/null || fail "Upload S3 a echoue" 4

  # On RELIT le distant plutot que de croire le put sur parole. Une
  # sauvegarde jamais verifiee n'est pas une sauvegarde, c'est un espoir.
  DISTANTE=$(_s3 s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$OBJET" \
    --query 'ContentLength' --output text 2>/dev/null) \
    || fail "Objet introuvable apres upload : $OBJET" 4
  [[ "$DISTANTE" == "$ENC_SIZE" ]] \
    || fail "Taille distante ($DISTANTE) differente de la locale ($ENC_SIZE)" 4

  log "Upload OK : s3://$BACKUP_S3_BUCKET/$OBJET ($ENC_SIZE octets)"
  log "  Verrou COMPLIANCE jusqu'au ${RETENIR_JUSQU_A%T*} (irrevocable)"

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
# 4. Rotation hors site
# ----------------------------------------------------------------------------
#
# EN S3, CE SCRIPT NE SUPPRIME RIEN, ET C'EST DELIBERE.
#
# Le bucket est VERSIONNE — le versionnement est une condition d'Object Lock,
# pas une option. Sur un bucket versionne, `DeleteObject` sans identifiant de
# version ne supprime pas : il pose un MARQUEUR DE SUPPRESSION. L'appel REUSSIT,
# l'objet disparait des listings, la donnee reste stockee et facturee, et le
# verrou n'a meme pas eu a s'y opposer.
#
# Une rotation naive afficherait donc « Suppression : ... OK » chaque nuit
# pendant que le stockage grossit indefiniment. C'est pire que pas de rotation
# du tout : ca en donne l'apparence.
#
# La suppression reelle revient au CYCLE DE VIE du bucket, seul mecanisme qui
# sait purger les versions non courantes. Regles a poser sur le bucket :
#
#   prefixe postgres/   expiration  31 jours   (verrou 30 + 1)
#   prefixe auditlog/   expiration 367 jours   (verrou 366 + 1)
#
# Toujours UN JOUR DE PLUS que le verrou : une expiration qui tomberait avant
# la fin du verrou ne supprimerait rien, l'objet etant protege.
if [[ "$BACKUP_TARGET" == "s3" ]]; then
  log "Etape 4/5 : rotation deleguee au cycle de vie du bucket (verrou $BACKUP_RETENTION_DAYS j)."
elif [[ "$LOCAL_ONLY" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
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
