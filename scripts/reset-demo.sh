#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# reset-demo.sh - Remise a zero de la pile de demonstration.
#
# POURQUOI CE SCRIPT EXISTE
#
#   La demo est ouverte a tout le monde, sans mot de passe (DEMO_MODE=true).
#   Chaque visiteur y laisse des traces : groupes de test, campagnes lancees
#   a moitie, utilisateurs renommes. Sans remise a zero, l'experience se
#   degrade jusqu'a ne plus ressembler au produit.
#
#   L'ancien script (mai 2026, jamais versionne) faisait `docker compose
#   down -v` sur une pile qui n'existe plus. Il a echoue chaque nuit pendant
#   des semaines en « Permission denied », et c'est une chance : executable,
#   il aurait supprime les volumes de la demo sans savoir la reconstruire.
#   Retire le 2026-10-20. Ce script le remplace, sur la pile Podman actuelle
#   et en reutilisant exactement ce que fait une livraison.
#
# CE QU'IL FAIT
#
#   1. arrete la ou les couleurs applicatives de la demo (humanix-demo-app,
#      humanix-demo-appb) ; HAProxy repond 503 pendant deux a trois minutes ;
#   2. vide le schema `public` de la base de la demo, SANS toucher au volume
#      ni au role Postgres ;
#   3. rejoue la preparation de l'image livree (`compose run app preparer`,
#      comme deploy.sh) : `prisma db push` recree le schema, puis seed du
#      catalogue, seed des comptes de demonstration (DEMO_MODE=true),
#      bootstrap admin ;
#   4. redemarre la couleur qui servait, attend qu'elle reponde, verifie que
#      les comptes de demonstration existent.
#
# CE QU'IL REFUSE
#
#   Tout repertoire dont le .env ne dit pas STACK=demo ET DEMO_MODE=true.
#   Il ne peut donc pas s'executer contre la production, meme par erreur de
#   variable : la production dit STACK=prod.
#
# JOURNAL
#
#   Le detail part dans le fichier passe par cron (demo-reset.log). Une
#   ligne de synthese est AUSSI ecrite dans cron.log, au format que Vector
#   et la regle 15 de Grafana comprennent (`[...] OK <code> en <s>s
#   job=demo-reset` ou `[...] ECHEC <code> apres <s>s job=demo-reset`), pour
#   que l'echec d'une remise a zero se voie sur le tableau d'exploitation.
#
# USAGE
#
#   ./scripts/reset-demo.sh             # remise a zero
#   ./scripts/reset-demo.sh --dry-run   # montre le plan, ne touche a rien
#
# VARIABLES D'ENV
#
#   HUMANIX_DEMO_DIR   (defaut /opt/humanix-demo)
#   HUMANIX_CRON_LOG   (defaut /var/log/humanix/cron.log) - ligne de synthese
#   HUMANIX_HEALTH_WAIT (defaut 180) - secondes d'attente du redemarrage
#
# CRON
#
#   Dimanche 03:30, heure locale, cf. infra/cron/crontab.prod. Jamais en
#   meme temps que la sauvegarde (02:45) ni l'archivage (01:00).

set -euo pipefail

DEMO_DIR="${HUMANIX_DEMO_DIR:-/opt/humanix-demo}"
CRON_LOG="${HUMANIX_CRON_LOG:-/var/log/humanix/cron.log}"
HEALTH_WAIT="${HUMANIX_HEALTH_WAIT:-180}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

DEBUT=$(date +%s)
ETAPE="demarrage"
COULEURS_A_RELANCER=""

horodate() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(horodate) [demo-reset] $*"; }

# Une seule ligne de synthese, dans cron.log, lisible par Vector (resultat,
# job, code) exactement comme celles de cron-host.sh.
synthese() {
  local etat="$1" code="$2" detail="$3"
  local duree=$(( $(date +%s) - DEBUT ))
  local mot="en"
  [ "$etat" = "ECHEC" ] && mot="apres"
  local ligne="[demo-reset] $etat $code $mot ${duree}s job=demo-reset : $detail"
  echo "$ligne"
  if [ "$DRY_RUN" = "0" ] && [ -w "$CRON_LOG" ]; then
    echo "$ligne" >> "$CRON_LOG"
  fi
}

# En cas d'erreur, on redemarre ce qu'on a arrete : une demo a moitie
# remise a zero vaut mieux qu'une demo eteinte jusqu'a lundi.
sur_erreur() {
  local code=$?
  trap - ERR
  log "ERREUR a l'etape « $ETAPE » (code $code)"
  if [ -n "$COULEURS_A_RELANCER" ]; then
    for c in $COULEURS_A_RELANCER; do
      log "  redemarrage de secours de $c ..."
      podman start "$c" >/dev/null 2>&1 || log "  -> impossible de redemarrer $c"
    done
  fi
  synthese ECHEC "$code" "etape=$ETAPE"
  exit "$code"
}
trap sur_erreur ERR

# --- Garde-fous ------------------------------------------------------------
ETAPE="garde-fous"
[ -d "$DEMO_DIR" ] || { log "$DEMO_DIR introuvable"; false; }
cd "$DEMO_DIR"
[ -f .env ] || { log "aucun .env dans $DEMO_DIR"; false; }
grep -qE '^STACK=demo$' .env || { log "refus : $DEMO_DIR/.env ne declare pas STACK=demo"; false; }
grep -qE '^DEMO_MODE=true$' .env || { log "refus : $DEMO_DIR/.env ne declare pas DEMO_MODE=true"; false; }
grep -qE '^CONTAINER_ENGINE=podman$' .env || { log "refus : ce script ne connait que podman (CONTAINER_ENGINE)"; false; }
command -v podman >/dev/null || { log "podman introuvable"; false; }
command -v podman-compose >/dev/null || { log "podman-compose introuvable"; false; }

# podman-compose n'honore pas COMPOSE_FILE dans le .env (cf. deploy.sh) :
# on passe les fichiers en -f, comme la livraison.
FICHIERS_COMPOSE=""
_cf="$(grep -E '^COMPOSE_FILE=' .env | tail -1 | cut -d= -f2- | tr -d '"'"'")"
for _f in $(echo "${_cf:-docker-compose.yml}" | tr ':' ' '); do
  [ -f "$_f" ] || { log "COMPOSE_FILE designe $_f, introuvable"; false; }
  FICHIERS_COMPOSE="$FICHIERS_COMPOSE -f $_f"
done
COMPOSE="podman-compose$FICHIERS_COMPOSE"

STACK=demo
POSTGRES_CONTENEUR="humanix-${STACK}-postgres"
podman ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTENEUR" || { log "$POSTGRES_CONTENEUR ne tourne pas"; false; }

# Une seule remise a zero a la fois.
exec 9>"/tmp/humanix-demo-reset.lock"
flock -n 9 || { log "une remise a zero est deja en cours"; false; }

# Couleurs applicatives presentes et celles qui tournent.
COULEURS_PRESENTES="$(podman ps -a --format '{{.Names}}' | grep -E "^humanix-${STACK}-app(b)?$" || true)"
COULEURS_ACTIVES="$(podman ps --format '{{.Names}}' | grep -E "^humanix-${STACK}-app(b)?$" || true)"
PORT_ACTIF="$(grep -m1 -E '^port=[0-9]+$' .humanix-deployed 2>/dev/null | cut -d= -f2 || true)"
[ -n "$PORT_ACTIF" ] || PORT_ACTIF="$(grep -E '^APP_HOST_PORT=' .env | tail -1 | cut -d= -f2)"
[ -n "$PORT_ACTIF" ] || PORT_ACTIF=3001

log "pile : $DEMO_DIR ($COMPOSE)"
log "couleurs presentes : $(echo ${COULEURS_PRESENTES:-aucune} | tr '\n' ' ') ; en service : $(echo ${COULEURS_ACTIVES:-aucune} | tr '\n' ' ') ; port : $PORT_ACTIF"
[ -n "$COULEURS_ACTIVES" ] || { log "aucune couleur applicative ne tourne : rien a remettre a zero proprement"; false; }

if [ "$DRY_RUN" = "1" ]; then
  log "--dry-run : plan"
  log "  1. podman stop $COULEURS_ACTIVES"
  log "  2. DROP SCHEMA public CASCADE ; CREATE SCHEMA public  (dans $POSTGRES_CONTENEUR)"
  log "  3. $COMPOSE run --rm --no-deps app preparer"
  log "  4. podman start $COULEURS_ACTIVES, puis attente de http://127.0.0.1:$PORT_ACTIF/api/health"
  synthese OK 0 "dry-run, rien touche"
  exit 0
fi

# --- 1. Arret des couleurs applicatives ------------------------------------
ETAPE="arret de l'application"
for c in $COULEURS_ACTIVES; do
  log "arret de $c ..."
  podman stop -t 30 "$c" >/dev/null
  COULEURS_A_RELANCER="$COULEURS_A_RELANCER $c"
done

# --- 2. Schema vide ----------------------------------------------------------
ETAPE="remise a zero du schema"
log "deconnexion des sessions restantes et suppression du schema public ..."
podman exec "$POSTGRES_CONTENEUR" sh -c '
  psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" \
    -c "DROP SCHEMA public CASCADE;" \
    -c "CREATE SCHEMA public;" \
    -c "GRANT ALL ON SCHEMA public TO public;" >/dev/null
'
log "schema public recree, volume et role intacts"

# --- 3. Preparation : schema, catalogue, comptes de demonstration -----------
ETAPE="preparation (schema, seeds)"
log "rejeu de la preparation de l'image livree ..."
# `preparer` SEUL, pas `./docker-entrypoint.sh preparer` : l'image declare
# un ENTRYPOINT, l'argument doit etre le mot-cle (piege documente dans
# deploy.sh, constate sur la demo le 2026-08-19).
$COMPOSE run --rm --no-deps app preparer

# --- 4. Redemarrage et verification -----------------------------------------
ETAPE="redemarrage de l'application"
for c in $COULEURS_ACTIVES; do
  log "redemarrage de $c ..."
  podman start "$c" >/dev/null
done
COULEURS_A_RELANCER=""

ETAPE="attente de la reponse"
attente=0
while [ "$attente" -lt "$HEALTH_WAIT" ]; do
  if curl -sf --max-time 3 "http://127.0.0.1:${PORT_ACTIF}/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  sleep 3
  attente=$((attente + 3))
done
[ "$attente" -lt "$HEALTH_WAIT" ] || { log "la demo ne repond pas sur 127.0.0.1:$PORT_ACTIF apres ${HEALTH_WAIT}s"; false; }
log "la demo repond sur 127.0.0.1:$PORT_ACTIF apres ${attente}s"

ETAPE="verification des comptes de demonstration"
COMPTES="$(podman exec "$POSTGRES_CONTENEUR" sh -c '
  psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "SELECT count(*) FROM \"User\";" \
    -c "SELECT count(*) FROM \"Tenant\";" \
    -c "SELECT count(*) FROM \"Group\";" \
    -c "SELECT count(*) FROM \"User\" WHERE email LIKE '"'"'%@demo-pme.fr'"'"';" \
    -c "SELECT count(*) FROM \"Saison\";"
' | tr '\n' ' ')"
set -- $COMPTES
UTILISATEURS="${1:-0}"; TENANTS="${2:-0}"; GROUPES="${3:-0}"; PERSONAS="${4:-0}"; SAISONS="${5:-0}"
log "base : $UTILISATEURS utilisateurs, $TENANTS espaces, $GROUPES groupes, $PERSONAS comptes de demonstration, $SAISONS saisons"
[ "$SAISONS" -gt 0 ] || { log "aucune saison : le seed du catalogue n'a pas tourne"; false; }
[ "$PERSONAS" -gt 0 ] || { log "aucun compte @demo-pme.fr : le seed de demonstration n'a pas tourne"; false; }

trap - ERR
synthese OK 200 "utilisateurs=$UTILISATEURS espaces=$TENANTS groupes=$GROUPES personas=$PERSONAS saisons=$SAISONS couleurs=$(echo $COULEURS_ACTIVES | tr ' ' ',')"
