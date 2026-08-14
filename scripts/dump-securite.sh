#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# dump-securite.sh - instantane CHIFFRE avant une operation risquee
#
# ---------------------------------------------------------------------
# POURQUOI CE SCRIPT EXISTE
# ---------------------------------------------------------------------
#
# Prendre un dump avant de toucher a la production est une bonne pratique.
# La faire a la main l'est moins :
#
#     pg_dump ... > ~/pre-reboot-2026-08-12.dump
#
# Cette ligne, tapee au fil de l'eau, contourne d'un coup TOUT ce que la
# chaine de sauvegarde garantit : le chiffrement age, le verrou WORM, la
# rotation. Elle depose les donnees de 37 utilisateurs reels, EN CLAIR,
# dans un repertoire personnel, ou personne ne pense a revenir les chercher.
#
# Constate le 2026-08-14 : quatre fichiers de ce genre trainaient sur
# humanix-prod-01, dont un datant de deux jours. Ils ont ete effaces au
# `shred`. Ce script existe pour qu'il n'y en ait plus.
#
# Ce qu'il fait de different :
#
#   - chiffre TOUJOURS, vers la meme cle publique que backup-db.sh ;
#   - ecrit dans un repertoire dedie, pas dans un home ;
#   - purge au-dela de 7 jours, comme la rotation locale des sauvegardes ;
#   - nomme le fichier d'apres le MOTIF, pour qu'on sache six mois plus
#     tard pourquoi il existe.
#
# Ce n'est PAS une sauvegarde : pas de depot distant, pas de verrou WORM,
# pas de vérification post-upload. C'est un filet de quelques jours avant
# une operation. Pour une vraie sauvegarde, backup-db.sh.
#
# ---------------------------------------------------------------------
# USAGE
# ---------------------------------------------------------------------
#
#   ./scripts/dump-securite.sh "avant-bascule-podman"
#   ./scripts/dump-securite.sh "avant-migration-prisma" --garder 30
#
# Le motif est OBLIGATOIRE. Un instantane sans raison ecrite est un
# instantane que personne n'osera supprimer.
#
# VARIABLES (memes sources que backup-db.sh) :
#   BACKUP_AGE_RECIPIENT     cle PUBLIQUE age1xxx
#   BACKUP_PG_CONTAINER      conteneur Postgres, si mode conteneur
#   CONTAINER_ENGINE         docker (defaut) ou podman
#   PGUSER, PGDATABASE       identifiants
#   DUMP_SECURITE_DIR        defaut /var/backups/humanix/securite
#
# EXIT CODES :
#   0 succes   1 configuration   2 dump   3 chiffrement
#
# ---------------------------------------------------------------------

set -euo pipefail

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { printf '[%s] ERREUR : %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >&2; exit "${2:-1}"; }

MOTIF=""
GARDER=7
for arg in "$@"; do
  case "$arg" in
    --garder=*) GARDER="${arg#*=}" ;;
    --garder)   die "--garder attend une valeur : --garder=30" 1 ;;
    -*)         die "option inconnue : $arg" 1 ;;
    *)          [[ -z "$MOTIF" ]] && MOTIF="$arg" ;;
  esac
done

[[ -n "$MOTIF" ]] || die "motif obligatoire. Exemple : $0 \"avant-bascule-podman\"" 1

# Le motif finit dans un nom de fichier : on le nettoie plutot que de
# refuser, pour ne pas transformer un filet de securite en obstacle.
MOTIF_PROPRE="$(printf '%s' "$MOTIF" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
[[ -n "$MOTIF_PROPRE" ]] || die "le motif ne contient aucun caractere utilisable" 1

# --- Environnement : memes sources que backup-db.sh ---------------------
#
# `set -a` : sans l'export automatique, `age` et `pg_dump` -- des processus
# ENFANTS -- ne verraient rien. Meme piege que dans backup-db.sh, ou il
# avait deja coute une soiree.
if [[ -f /etc/humanix/backup.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/humanix/backup.env
  set +a
fi

: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT non defini (cle PUBLIQUE age1xxx)}"
: "${PGUSER:?PGUSER non defini}"
: "${PGDATABASE:?PGDATABASE non defini}"

DUMP_SECURITE_DIR="${DUMP_SECURITE_DIR:-/var/backups/humanix/securite}"
MOTEUR="${CONTAINER_ENGINE:-docker}"

command -v age >/dev/null 2>&1 || die "binaire manquant : age" 1

# --- Ou tourne Postgres ? ----------------------------------------------
#
# Le Postgres de production ne publie AUCUN port : il n'est joignable que
# par un exec dans son conteneur. Cf. docs/PODMAN.md.
if [[ -n "${BACKUP_PG_CONTAINER:-}" ]]; then
  command -v "$MOTEUR" >/dev/null 2>&1 || die "binaire manquant : $MOTEUR" 1
  MODE="conteneur ($MOTEUR exec dans $BACKUP_PG_CONTAINER)"
else
  command -v pg_dump >/dev/null 2>&1 || die "binaire manquant : pg_dump" 1
  : "${PGHOST:?PGHOST non defini, et BACKUP_PG_CONTAINER non plus}"
  MODE="reseau ($PGHOST:${PGPORT:-5432})"
fi

HORODATAGE="$(date -u +%Y%m%d-%H%M%S)"
CIBLE="$DUMP_SECURITE_DIR/${MOTIF_PROPRE}-${HORODATAGE}.dump.age"

mkdir -p "$DUMP_SECURITE_DIR"
chmod 700 "$DUMP_SECURITE_DIR"

log "Instantane de securite : $MOTIF"
log "  mode        : $MODE"
log "  destination : $CIBLE"
log "  conservation: $GARDER jours"

# --- Dump et chiffrement, SANS fichier intermediaire en clair -----------
#
# Le dump ne touche jamais le disque en clair : il est chiffre au vol par
# un tube. C'est toute la difference avec un `pg_dump > fichier` suivi d'un
# chiffrement, qui laisse une fenetre -- et un fichier oublie si la seconde
# etape echoue.
if [[ -n "${BACKUP_PG_CONTAINER:-}" ]]; then
  "$MOTEUR" exec -i -e PGPASSWORD="${PGPASSWORD:-}" "$BACKUP_PG_CONTAINER" \
    pg_dump --username="$PGUSER" --dbname="$PGDATABASE" \
            --format=custom --compress=9 --no-owner --no-privileges \
    | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$CIBLE" \
    || die "dump ou chiffrement a echoue" 2
else
  PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    --host="$PGHOST" --port="${PGPORT:-5432}" \
    --username="$PGUSER" --dbname="$PGDATABASE" \
    --format=custom --compress=9 --no-owner --no-privileges \
    | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$CIBLE" \
    || die "dump ou chiffrement a echoue" 2
fi

chmod 600 "$CIBLE"

TAILLE="$(stat -c%s "$CIBLE" 2>/dev/null || echo 0)"
[[ "$TAILLE" -gt 1024 ]] || die "fichier chiffre suspect ($TAILLE octets) : le dump a probablement echoue" 3

log "OK : $CIBLE ($TAILLE octets, chiffre)"
log "SHA-256 : $(sha256sum "$CIBLE" | cut -d' ' -f1)"

# --- Purge ---------------------------------------------------------------
SUPPRIMES="$(find "$DUMP_SECURITE_DIR" -name '*.dump.age' -mtime +"$GARDER" -print -delete 2>/dev/null | wc -l | tr -d ' ')"
[[ "$SUPPRIMES" -gt 0 ]] && log "Purge : $SUPPRIMES instantane(s) de plus de $GARDER jours supprime(s)."

log ""
log "Pour restaurer, la cle PRIVEE est requise -- elle n'est pas sur cette machine :"
log "  age -d -i <cle-privee> $CIBLE | pg_restore --clean --if-exists --no-owner -d <base>"
log ""
log "Ceci n'est PAS une sauvegarde : ni depot distant, ni verrou WORM."
log "Pour cela : scripts/backup-db.sh"
