#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# install-crontab.sh - installe infra/cron/crontab.prod dans la crontab
# de l'utilisateur courant, apres sauvegarde et verifications.
#
# USAGE :
#   ./infra/cron/install-crontab.sh --dry-run   # montre le diff, n'installe rien
#   ./infra/cron/install-crontab.sh             # demande confirmation puis installe
#   ./infra/cron/install-crontab.sh --yes       # sans confirmation
#
# EXIT CODES :
#   0  succes (ou dry-run)
#   1  usage / pre-requis
#   2  un slug de la crontab n'a pas de route correspondante
#   3  Ofelia tourne : installer les deux ordonnanceurs doublerait les jobs
#   4  echec de l'installation

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$RACINE/infra/cron/crontab.prod"
DRY_RUN=false
ASSUME_YES=false

log() { printf '[crontab] %s\n' "$*"; }
die() { printf '[crontab] ERREUR : %s\n' "$1" >&2; exit "${2:-1}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --yes|-y)  ASSUME_YES=true ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)         die "option inconnue : $1" ;;
  esac
  shift
done

[ -r "$SOURCE" ] || die "source introuvable : $SOURCE"

# --- Garde-fou 1 : les deux ordonnanceurs ne doivent pas coexister ----
#
# Ofelia et cette crontab appellent les MEMES endpoints. Les faire
# tourner ensemble executerait chaque job deux fois — y compris les
# purges et les lancements de campagnes de phishing.
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'ofelia'; then
    die "un conteneur Ofelia tourne. Arrete-le d'abord (docker compose -f docker-compose.yml -f docker-compose.cron.yml down ofelia), sinon chaque job s'executera DEUX fois." 3
  fi
fi

# --- Garde-fou 2 : chaque slug doit avoir sa route --------------------
#
# Une faute de frappe dans un slug donne un 404 silencieux a 3 h du
# matin. On la detecte ici, pas dans six mois.
#
# `grep -v '^[[:space:]]*#'` d'abord : on n'analyse QUE les lignes
# actives. Sans ce filtre, un commentaire mentionnant `cron-host.sh`
# est lu comme une planification — teste, et c'est arrive des la
# premiere version de ce script, sur la phrase « cron-host.sh y lit
# CRON_SECRET » dont le « y » etait pris pour un slug. C'est le meme
# defaut que celui qui a fait tomber les crons pendant des mois : un
# commentaire capture par un motif trop large.
manquants=0
while read -r slug; do
  [ -n "$slug" ] || continue
  if [ ! -f "$RACINE/app/api/cron/$slug/route.ts" ]; then
    log "SLUG INCONNU : '$slug' n'a pas de app/api/cron/$slug/route.ts"
    manquants=$((manquants + 1))
  fi
done < <(grep -v '^[[:space:]]*#' "$SOURCE" | grep -oE 'cron-host\.sh [a-z-]+' | awk '{print $2}' | sort -u)

[ "$manquants" -eq 0 ] || die "$manquants slug(s) sans route correspondante" 2
log "slugs verifies : tous ont une route."

# --- Signaler les jobs du registre qui ne sont PAS planifies ----------
#
# L'inverse du garde-fou precedent. Non bloquant : un job peut etre
# volontairement absent. Mais il faut le voir — `phishing-drip` et
# `exposure-scan` sont restes non planifies sans que personne ne le
# remarque.
if [ -f "$RACINE/lib/cron/registry.ts" ]; then
  while read -r slug; do
    [ -n "$slug" ] || continue
    grep -v '^[[:space:]]*#' "$SOURCE" | grep -q "cron-host\.sh $slug\b" \
      || log "NON PLANIFIE : le job '$slug' existe dans le registre mais n'est pas dans cette crontab."
  done < <(grep -oE 'slug: "[a-z-]+"' "$RACINE/lib/cron/registry.ts" | sed 's/slug: "//;s/"//' | sort -u)
fi

# --- Diff avec l'existant --------------------------------------------
ACTUELLE="$(mktemp)"; trap 'rm -f "$ACTUELLE"' EXIT
crontab -l >"$ACTUELLE" 2>/dev/null || true

if diff -q "$ACTUELLE" "$SOURCE" >/dev/null 2>&1; then
  log "la crontab installee est deja identique a la source. Rien a faire."
  exit 0
fi

log "differences (- installe, + source) :"
diff -u "$ACTUELLE" "$SOURCE" | tail -n +3 | sed 's/^/    /' || true

if $DRY_RUN; then
  log "--dry-run : arret avant toute modification."
  exit 0
fi

if ! $ASSUME_YES; then
  printf '[crontab] Installer cette crontab ? [oui/N] '
  read -r reponse
  [ "$reponse" = "oui" ] || die "annule."
fi

# --- Sauvegarde puis installation -------------------------------------
SAUVEGARDE="$HOME/crontab.avant-$(date +%Y%m%d-%H%M%S).bak"
cp "$ACTUELLE" "$SAUVEGARDE"
log "sauvegarde : $SAUVEGARDE"

crontab "$SOURCE" || die "installation refusee par crontab" 4

# On relit ce qui a REELLEMENT ete installe, plutot que de supposer.
if crontab -l 2>/dev/null | diff -q - "$SOURCE" >/dev/null 2>&1; then
  log "installee et verifiee."
else
  log "ATTENTION : la crontab installee differe de la source (cron a pu normaliser des lignes)."
  log "Restaurer si besoin : crontab $SAUVEGARDE"
fi

log "verifier ce soir : select name, status, \"startedAt\" from \"CronRun\" order by \"startedAt\" desc;"
