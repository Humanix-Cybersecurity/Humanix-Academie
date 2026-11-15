#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# update-postgres.sh - Renouvelle l'image PostgreSQL d'une pile (demo ou prod).
#
# POURQUOI CE SCRIPT EXISTE
#
#   La base suit le tag mouvant `postgres:16-alpine`, et rien ne le
#   renouvelait :
#
#     - deploy.sh ne touche plus a la base depuis le 2026-08-19 (`--no-deps`,
#       expres : redemarrer Postgres a chaque livraison n'avait aucune raison
#       d'etre) ;
#     - aucune tache planifiee ne tire d'image ;
#     - un redemarrage de l'hote recree le conteneur, mais sur l'image DEJA
#       presente.
#
#   Constate le 2026-11-15 : prod et demo en 16.13, sur une image du
#   2026-04-21. Trois versions de securite manquaient (16.14, 16.15, 16.16),
#   soit 77 failles corrigees en amont et jamais arrivees ici. Rien ne le
#   signalait : Trivy ne regarde que l'image applicative, et Dependabot un
#   Dockerfile (docker/postgres) que ces piles n'utilisent pas.
#
# POURQUOI IL RECREE TOUTE LA PILE
#
#   Changer d'image, c'est recreer le conteneur. Or sous podman-compose un
#   `depends_on` devient `--requires` : l'application et vector dependent de
#   postgres, et podman refuse de retirer un conteneur dont un autre depend.
#   La base ne se remplace donc pas seule.
#
#   La pile est creee a chaque demarrage de l'hote par l'unite
#   `podman-compose@humanix-<pile>` : `podman-compose up --no-start`, puis
#   `podman pod start`. On ne reinvente pas cette creation, on la reutilise.
#
#   Mais `up` ne RECREE des conteneurs que si leur empreinte
#   (io.podman.compose.config-hash) differe de celle de la compose : lu dans
#   podman-compose 1.5.0, fonction compose_up. Une image qui change SOUS un
#   tag ne change pas cette empreinte. Apres un simple `podman pull`, ni un
#   redemarrage de l'unite ni un redemarrage de l'hote ne remplaceraient la
#   base. Elle ne le serait qu'au premier demarrage qui suit une livraison
#   (deploy.sh pose couleur, port et revision, donc une autre empreinte) :
#   un jour, sans prevenir, et sans que personne l'ait decide.
#
#   Ce script rend ce chemin deterministe : il arrete l'unite, retire le pod
#   de la pile, puis relance l'unite, qui recree tout sur les images
#   presentes. `podman pod rm` retire les conteneurs et laisse les volumes
#   nommes (lu dans podman 5.7.0, removePod : seuls les volumes anonymes
#   partent) : humanix_<pile>_pg n'est pas touche.
#
# CE QU'IL FAIT
#
#   1. garde-fous, en lecture seule : la pile est bien celle qu'on croit
#      (.env, unite active, pod, conteneurs du pod, volume de la base) ;
#   2. retire l'image du tag et lit sa version ; refuse un changement de
#      version majeure et un retour a une version plus ancienne ; s'arrete la
#      si la base tourne deja sur cette image ;
#   3. en production : instantane chiffre de la base (dump-securite.sh) ;
#   4. arrete l'application, puis PostgreSQL (SIGINT : arret rapide et
#      propre), puis l'unite ;
#   5. retire le pod, relance l'unite ;
#   6. verifie la base : image, volume, version du serveur, canari (nombre de
#      saisons et d'espaces, qui doit etre celui d'avant) ;
#   7. attend l'application sur le port que podman publie, puis remet sa
#      couleur a `ready` cote HAProxy.
#
# LA COUPURE
#
#   HAProxy repond 503 de l'arret de l'application a son retour : moins
#   d'une minute. Il n'y a pas de renouvellement de base sans coupure. A
#   lancer loin des taches planifiees (minutes 00 et 30, nuit de 01:00 a
#   05:00, cf. infra/cron/crontab.prod).
#
# LA PILE REVIENT EN COULEUR A
#
#   Comme apres un redemarrage de l'hote : l'unite ne connait ni la couleur
#   ni le port que deploy.sh pose pendant une bascule. Deux consequences,
#   toutes deux traitees :
#
#     - .humanix-deployed n'est pas reecrit ; les scripts ne s'y fient plus
#       seuls (cf. reset-demo.sh, cron-host.sh) ;
#     - si la pile servait en couleur b, deploy.sh a laisse la couleur a en
#       `drain` cote HAProxy. Un redemarrage de l'hote relance HAProxy, qui
#       l'oublie ; ce script, non. Sans le retour explicite a `ready`, la
#       pile reviendrait saine et HAProxy ne lui enverrait rien.
#
# EN CAS D'ECHEC
#
#   Avant le retrait du pod : ce qui a ete arrete est relance, sur l'image
#   d'avant. Apres : le tag est remis sur l'image d'avant et la pile est
#   recreee une seconde fois (retour arriere). Les versions mineures d'une
#   meme branche partagent le meme format de donnees : revenir de 16.16 a
#   16.13 sur le meme volume est sans risque.
#
#   L'image d'avant est gardee sous
#   `localhost/humanix-postgres-precedent:<version>`, a l'abri d'un
#   `podman image prune`.
#
# CE QU'IL NE FAIT PAS
#
#   - un changement de version majeure (16 vers 17) : c'est pg_upgrade, ou
#     un dump et une restauration, pas un changement d'image ;
#   - les REINDEX que demandent parfois les notes de version. Les lire avant
#     de lancer : https://www.postgresql.org/docs/release/
#
# USAGE
#
#   ./scripts/update-postgres.sh demo --dry-run   # etat et plan, sans rien toucher
#   ./scripts/update-postgres.sh demo             # la demo d'abord, toujours
#   ./scripts/update-postgres.sh prod             # demande confirmation
#   ./scripts/update-postgres.sh prod --yes       # sans confirmation
#
# VARIABLES D'ENV
#
#   HUMANIX_PROD_DIR       (defaut /opt/humanix-prod)
#   HUMANIX_DEMO_DIR       (defaut /opt/humanix-demo)
#   HUMANIX_HEALTH_WAIT    (defaut 180) - secondes d'attente de l'application
#   HUMANIX_PG_WAIT        (defaut 60)  - secondes d'attente de PostgreSQL
#   HUMANIX_PG_STOP_WAIT   (defaut 60)  - delai laisse a PostgreSQL pour s'arreter
#   HUMANIX_HAPROXY_SOCKET (defaut /run/haproxy/admin.sock)
#   HUMANIX_PG_LOCK        (defaut /tmp/humanix-update-postgres.lock)
#   HUMANIX_DEMO_LOCK      (defaut /tmp/humanix-demo-reset.lock) - le verrou de
#                          reset-demo.sh, pris aussi quand la pile est la demo
#   HUMANIX_DUMP_SECURITE  (defaut : dump-securite.sh, a cote de ce script)
#
# EXIT CODES
#
#   0 succes, ou rien a faire · autre : garde-fou ou echec. Les dernieres
#   lignes disent dans quel etat la pile est laissee.

set -euo pipefail

PROD_DIR="${HUMANIX_PROD_DIR:-/opt/humanix-prod}"
DEMO_DIR="${HUMANIX_DEMO_DIR:-/opt/humanix-demo}"
HEALTH_WAIT="${HUMANIX_HEALTH_WAIT:-180}"
PG_WAIT="${HUMANIX_PG_WAIT:-60}"
PG_STOP_WAIT="${HUMANIX_PG_STOP_WAIT:-60}"
HAPROXY_SOCKET="${HUMANIX_HAPROXY_SOCKET:-/run/haproxy/admin.sock}"
VERROU="${HUMANIX_PG_LOCK:-/tmp/humanix-update-postgres.lock}"
VERROU_DEMO="${HUMANIX_DEMO_LOCK:-/tmp/humanix-demo-reset.lock}"
DUMP_SECURITE="${HUMANIX_DUMP_SECURITE:-$(dirname "$0")/dump-securite.sh}"
# Port d'ecoute de l'application dans son conteneur, le meme pour toutes les
# couleurs (cf. `ports:` de docker-compose.humanix.yml).
PORT_INTERNE=3000
# Repertoire de donnees de l'image officielle : c'est sur lui que le volume
# de la base doit etre monte, avant comme apres.
DONNEES_PG="/var/lib/postgresql/data"

USAGE="usage : $0 <demo|prod> [--dry-run] [--yes]"
DRY_RUN=0
ASSUME_YES=0
STACK=""

while [ $# -gt 0 ]; do
  case "$1" in
    demo|prod) STACK="$1" ;;
    --dry-run) DRY_RUN=1 ;;
    --yes|-y)  ASSUME_YES=1 ;;
    -h|--help)
      # L'en-tete, jusqu'a la premiere ligne qui n'est plus un commentaire.
      sed -n '3,${/^[^#]/q;s/^# \{0,1\}//p;}' "$0"
      exit 0
      ;;
    *) echo "$USAGE" >&2; exit 1 ;;
  esac
  shift
done
[ -n "$STACK" ] || { echo "$USAGE" >&2; exit 1; }

if [ "$STACK" = "prod" ]; then
  STACK_DIR="$PROD_DIR"
else
  STACK_DIR="$DEMO_DIR"
fi
PROJET="humanix-${STACK}"
UNITE="podman-compose@${PROJET}"
POD="pod_${PROJET}"
PG="${PROJET}-postgres"
VOLUME="humanix_${STACK}_pg"
BACKEND="backend_${STACK}"

ETAPE="demarrage"
# Ce que le script a deja defait, pour savoir quoi remettre en cas d'echec :
#   0 rien n'est arrete            3 la pile est recreee et verifiee
#   1 des conteneurs sont arretes  4 ne plus rien tenter (volume absent)
#   2 le pod est retire
PHASE=0
IMAGE=""
IMAGE_AVANT=""
IMAGE_APRES=""
# Vrai tant que le tag local designe une image retiree que la pile n'a pas
# encore prise.
TAG_DEPLACE=0
VERSION_AVANT=""
VERSION_APRES=""
CANARI_AVANT=""
COULEURS_APRES=""
PORTS_APRES=""

horodate() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(horodate) [update-postgres] $*"; }
refuser() { log "refus : $*"; exit 1; }

# --- Lectures ------------------------------------------------------------------

# Une requete dans le conteneur de la base, par son socket local, comme
# reset-demo.sh : la base ne publie aucun port. La requete voyage en argument
# du shell du conteneur, pour ne pas empiler trois niveaux de guillemets.
sql() {
  podman exec "$PG" sh -c \
    'psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1"' sh "$1"
}

# La version du serveur qui REPOND, pas celle du binaire pose dans l'image :
# c'est elle qui dit si le remplacement a eu lieu.
version_en_service() {
  { sql "show server_version" 2>/dev/null || true; } | head -n 1 | cut -d' ' -f1
}

# Deux nombres qui ne bougent pas pendant l'operation : s'ils changent, ce
# n'est pas la meme base qui a redemarre.
canari() {
  { sql 'select (select count(*) from "Saison"), (select count(*) from "Tenant")' 2>/dev/null || true; } \
    | head -n 1
}

# Type et nom de ce qui est monte sur le repertoire de donnees.
volume_monte() {
  podman inspect "$PG" --format \
    '{{range .Mounts}}{{if eq .Destination "'"$DONNEES_PG"'"}}{{.Type}} {{.Name}}{{end}}{{end}}' \
    2>/dev/null || true
}

# La version de PostgreSQL qu'une image annonce, sans la demarrer.
version_image() {
  { podman image inspect "$1" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true; } \
    | sed -n 's/^PG_VERSION=//p' | head -n 1
}

# Port de l'hote sur lequel podman publie l'application d'un conteneur (repris
# de reset-demo.sh : `127.0.0.1:3001`, forme longue ou IPv6).
port_publie() {
  local ligne
  ligne="$(podman port "$1" "${PORT_INTERNE}/tcp" 2>/dev/null | head -n 1)" || true
  [[ "$ligne" =~ :([0-9]+)[[:space:]]*$ ]] || return 1
  echo "${BASH_REMATCH[1]}"
}

couleurs_en_service() {
  { podman ps --format '{{.Names}}' 2>/dev/null || true; } | { grep -E "^${PROJET}-app(b)?$" || true; }
}

# --- HAProxy (repris de deploy.sh, memes raisons) --------------------------------

haproxy_envoyer() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import socket, sys
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(5)
s.connect(sys.argv[1])
s.sendall((sys.argv[2] + "\n").encode())
buf = []
while True:
    d = s.recv(65536)
    if not d:
        break
    buf.append(d)
sys.stdout.write(b"".join(buf).decode("utf-8", "replace"))
' "$HAPROXY_SOCKET" "$1" 2>/dev/null && return 0
  fi
  if command -v socat >/dev/null 2>&1; then
    printf '%s\n' "$1" | socat stdio "$HAPROXY_SOCKET" 2>/dev/null && return 0
  fi
  if command -v nc >/dev/null 2>&1; then
    printf '%s\n' "$1" | nc -U "$HAPROXY_SOCKET" 2>/dev/null && return 0
  fi
  return 1
}

# On eprouve, on ne suppose pas : une vraie requete, et la reponse attendue.
haproxy_pilotable() {
  [ -S "$HAPROXY_SOCKET" ] || return 1
  { haproxy_envoyer "show stat" 2>/dev/null || true; } | head -n 1 | grep -q '^# pxname'
}

# `humanix-prod-app` est la couleur a, donc le serveur `prod_a` ;
# `humanix-prod-appb` la couleur b, `prod_b`.
haproxy_serveur() {
  case "$1" in
    *appb) printf '%s_b' "$STACK" ;;
    *)     printf '%s_a' "$STACK" ;;
  esac
}

# Statut d'un serveur du backend de la pile : colonne 18 du CSV de
# `show stat` (UP, DOWN, DRAIN, MAINT...).
#
# grep, cut et tr, pas awk : ce script ne demande que bash, coreutils, grep
# et sed. Les executeurs de la CI n'ont pas awk (constate le 2026-11-15), et
# un outil de moins a supposer sur l'hote ne coute rien.
haproxy_statut() {
  { haproxy_envoyer "show stat" || true; } \
    | { grep -E "^${BACKEND},$1," || true; } | head -n 1 | cut -d, -f18
}

# Tous les serveurs du backend, sous la forme `prod_a=UP prod_b=DOWN`.
haproxy_resume() {
  { haproxy_envoyer "show stat" || true; } \
    | { grep -E "^${BACKEND}," || true; } \
    | { grep -v -E "^${BACKEND},BACKEND," || true; } \
    | cut -d, -f2,18 | tr ',\n' '= '
}

# Remet a `ready` la couleur qui vient de revenir, et attend que HAProxy la
# voie monter. 0 : fait · 1 : elle ne monte pas · 2 : HAProxy non pilotable.
haproxy_remettre_pret() {
  haproxy_pilotable || return 2
  local c s statut attente
  for c in $COULEURS_APRES; do
    s="$(haproxy_serveur "$c")"
    haproxy_envoyer "set server ${BACKEND}/${s} state ready" >/dev/null || return 1
    attente=0
    while :; do
      statut="$(haproxy_statut "$s")"
      case "$statut" in
        UP*) log "HAProxy : ${s} est ${statut}"; break ;;
      esac
      if [ "$attente" -ge 15 ]; then
        log "HAProxy : ${s} est « ${statut:-inconnu} » apres 15s"
        return 1
      fi
      sleep 1
      attente=$((attente + 1))
    done
  done
  return 0
}

# --- Briques de l'operation ------------------------------------------------------
#
# Elles servent a l'aller comme au retour arriere, ou plus rien n'arrete le
# script a la premiere erreur : chacune rend donc son verdict explicitement.

attendre_postgres() {
  local attente=0
  while [ "$attente" -lt "$PG_WAIT" ]; do
    if podman exec "$PG" sh -c 'pg_isready -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
      log "PostgreSQL accepte les connexions apres ${attente}s"
      return 0
    fi
    sleep 1
    attente=$((attente + 1))
  done
  log "PostgreSQL ne repond pas apres ${PG_WAIT}s"
  return 1
}

# Chaque couleur revenue doit repondre, sur le port que podman lui connait
# MAINTENANT : il n'y a aucune raison que ce soit celui d'avant.
attendre_application() {
  local attente=0 c p muets="aucune couleur en service"
  while [ "$attente" -lt "$HEALTH_WAIT" ]; do
    COULEURS_APRES="$(couleurs_en_service)"
    if [ -n "$COULEURS_APRES" ]; then
      PORTS_APRES=""
      muets=""
      for c in $COULEURS_APRES; do
        if p="$(port_publie "$c")"; then
          PORTS_APRES="$PORTS_APRES $p"
          curl -sf --max-time 3 "http://127.0.0.1:${p}/api/health" 2>/dev/null \
            | grep -q '"status":"ok"' || muets="$muets 127.0.0.1:$p"
        else
          muets="$muets $c"
        fi
      done
      if [ -z "$muets" ]; then
        log "l'application repond sur$(printf ' 127.0.0.1:%s' $PORTS_APRES) apres ${attente}s"
        return 0
      fi
    fi
    sleep 3
    attente=$((attente + 3))
  done
  log "l'application ne repond pas apres ${HEALTH_WAIT}s (${muets# })"
  return 1
}

# L'unite arretee, plus rien ne doit tourner dans le pod.
arreter_unite() {
  systemctl --user stop "$UNITE" || return 1
  local restants
  restants="$(podman ps --filter "pod=$POD" --format '{{.Names}}' 2>/dev/null || true)"
  if [ -n "$restants" ]; then
    log "encore en service apres l'arret de l'unite : $(echo $restants) ; arret du pod ..."
    podman pod stop "$POD" >/dev/null 2>&1 || return 1
    restants="$(podman ps --filter "pod=$POD" --format '{{.Names}}' 2>/dev/null || true)"
    [ -z "$restants" ] || { log "impossible d'arreter : $(echo $restants)"; return 1; }
  fi
  return 0
}

# La base qui tourne est-elle celle qu'on attend ? Image, volume, version du
# serveur, canari.
verifier_base() {
  local image montage version can
  image="$(podman inspect "$PG" --format '{{.Image}}' 2>/dev/null || true)"
  image="${image#sha256:}"
  if [ "$image" != "$1" ]; then
    log "$PG n'est pas sur l'image attendue : ${image:0:12} au lieu de ${1:0:12}"
    return 1
  fi
  montage="$(volume_monte)"
  if [ "$montage" != "volume $VOLUME" ]; then
    log "$PG n'est pas sur le volume attendu ($VOLUME) : « $montage »"
    return 1
  fi
  version="$(version_en_service)"
  if [ "$version" != "$2" ]; then
    log "le serveur repond en version « $version », $2 attendue"
    return 1
  fi
  can="$(canari)"
  if [ "$can" != "$CANARI_AVANT" ]; then
    log "le canari a change : « $can » au lieu de « $CANARI_AVANT » (saisons|espaces)"
    return 1
  fi
  log "base verifiee : PostgreSQL $version, volume $VOLUME, canari $can (saisons|espaces)"
  return 0
}

# --- Ce qu'on remet en place en cas d'echec ----------------------------------------

relancer_arretes() {
  log "relance de ce qui a ete arrete, sur l'image d'avant ..."
  if systemctl --user is-active --quiet "$UNITE"; then
    podman pod start "$POD" >/dev/null 2>&1 \
      || { log "  -> impossible de relancer $POD : le faire a la main (podman pod start $POD)"; return 1; }
  else
    systemctl --user reset-failed "$UNITE" >/dev/null 2>&1 || true
    systemctl --user start "$UNITE" \
      || { log "  -> l'unite ne repart pas : le faire a la main (systemctl --user start $UNITE)"; return 1; }
  fi
  if attendre_postgres && attendre_application; then
    log "  -> la pile est revenue, PostgreSQL $(version_en_service)"
    return 0
  fi
  log "  -> la pile ne repond pas : podman ps -a, puis podman logs $PG"
  return 1
}

retour_arriere() {
  log "RETOUR ARRIERE : le tag $IMAGE est remis sur l'image d'avant (PostgreSQL $VERSION_AVANT)"
  podman tag "$IMAGE_AVANT" "$IMAGE" \
    || { log "  -> impossible de remettre le tag (podman tag $IMAGE_AVANT $IMAGE)"; return 1; }
  arreter_unite || log "  -> l'unite ne s'est pas arretee proprement, on retire le pod quand meme"
  if podman pod exists "$POD"; then
    podman pod rm -f "$POD" >/dev/null 2>&1 \
      || { log "  -> impossible de retirer $POD"; return 1; }
  fi
  systemctl --user reset-failed "$UNITE" >/dev/null 2>&1 || true
  systemctl --user start "$UNITE" \
    || { log "  -> l'unite ne repart pas (systemctl --user status $UNITE)"; return 1; }
  attendre_postgres || return 1
  verifier_base "$IMAGE_AVANT" "$VERSION_AVANT" || return 1
  attendre_application || return 1
  local code_haproxy=0
  haproxy_remettre_pret || code_haproxy=$?
  if [ "$code_haproxy" -ne 0 ]; then
    log "  -> HAProxy : couleur de retour non confirmee"
    conseil_haproxy
  fi
  return 0
}

conseil_haproxy() {
  log "HAProxy : verifier le statut des serveurs de ${BACKEND} (show stat sur ${HAPROXY_SOCKET})."
  log "  Remettre la couleur en service : set server ${BACKEND}/${STACK}_a state ready"
  log "  ou, plus simple : sudo systemctl reload haproxy (reload, pas restart)."
}

a_la_sortie() {
  local code=$?
  trap - EXIT INT TERM
  [ "$code" -ne 0 ] || return 0
  set +e
  log "ERREUR a l'etape « $ETAPE » (code $code)"
  case "$PHASE" in
    0)
      log "rien n'a ete arrete"
      if [ "$TAG_DEPLACE" = "1" ]; then
        log "L'image retiree reste sous le tag $IMAGE : elle sera prise a la prochaine recreation de la pile"
        log "(ce script, ou un demarrage de l'hote qui suit une livraison)."
      fi
      ;;
    1)
      relancer_arretes
      ;;
    2)
      if retour_arriere; then
        log "RETOUR ARRIERE reussi : la pile tourne de nouveau en PostgreSQL $VERSION_AVANT"
      else
        log "RETOUR ARRIERE INCOMPLET : la pile $STACK est a remettre d'aplomb a la main."
        log "  Le volume $VOLUME n'a pas ete touche. Etat : podman ps -a --pod ; systemctl --user status $UNITE"
        conseil_haproxy
      fi
      ;;
    3)
      log "la base est renouvelee et l'application repond en local, mais HAProxy ne la sert pas."
      conseil_haproxy
      ;;
    4)
      log "le volume $VOLUME est introuvable : NE RIEN RELANCER."
      log "  Une pile relancee creerait une base vide. Restaurer d'abord (scripts/restore-db.sh)."
      ;;
  esac
  exit "$code"
}
trap a_la_sortie EXIT
trap 'exit 130' INT TERM

# --- 1. Garde-fous, en lecture seule ---------------------------------------------
ETAPE="garde-fous"
[ -d "$STACK_DIR" ] || refuser "$STACK_DIR introuvable"
cd "$STACK_DIR"
[ -f .env ] || refuser "aucun .env dans $STACK_DIR"
# Le .env doit dire la meme pile que l'argument : un repertoire mal designe
# ne doit pas faire arreter l'autre base.
grep -qE "^STACK=${STACK}$" .env || refuser "$STACK_DIR/.env ne declare pas STACK=$STACK"
grep -qE '^CONTAINER_ENGINE=podman$' .env || refuser "ce script ne connait que podman (CONTAINER_ENGINE)"
for outil in podman systemctl curl flock; do
  command -v "$outil" >/dev/null || refuser "$outil introuvable"
done

# Un seul renouvellement a la fois, les deux piles partagent le meme tag ; et
# jamais pendant la remise a zero de la demo, qui arrete la meme application.
exec 9>"$VERROU"
flock -n 9 || refuser "un renouvellement est deja en cours ($VERROU)"
if [ "$STACK" = "demo" ]; then
  exec 8>"$VERROU_DEMO"
  flock -n 8 || refuser "une remise a zero de la demo est en cours ($VERROU_DEMO)"
fi

systemctl --user is-active --quiet "$UNITE" \
  || refuser "l'unite $UNITE n'est pas active (ou systemctl --user est injoignable : session sans XDG_RUNTIME_DIR ?)"
podman pod exists "$POD" || refuser "le pod $POD n'existe pas"

# Retirer le pod retire TOUT ce qu'il contient : on s'assure qu'il ne contient
# que la pile visee.
DANS_LE_POD="$(podman ps -a --filter "pod=$POD" --format '{{.Names}} {{index .Labels "io.podman.compose.project"}}')"
ETRANGERS=""
while read -r nom projet _; do
  [ -n "$nom" ] || continue
  [ "$projet" = "$PROJET" ] || ETRANGERS="$ETRANGERS $nom"
done <<<"$DANS_LE_POD"
[ -z "$ETRANGERS" ] || refuser "le pod $POD contient des conteneurs etrangers a $PROJET : $(echo $ETRANGERS)"
grep -q "^${PG} " <<<"$DANS_LE_POD" || refuser "$PG n'est pas dans le pod $POD"
# Et l'inverse : un conteneur de la pile reste hors du pod survivrait au
# retrait, et l'unite ne le recreerait pas (meme empreinte, donc « a jour »).
HORS_DU_POD=""
for c in $(podman ps -a --filter "label=io.podman.compose.project=$PROJET" --format '{{.Names}}'); do
  grep -q "^${c} " <<<"$DANS_LE_POD" || HORS_DU_POD="$HORS_DU_POD $c"
done
[ -z "$HORS_DU_POD" ] || refuser "des conteneurs de $PROJET sont hors du pod $POD :$HORS_DU_POD"

EN_SERVICE="$(podman ps --format '{{.Names}}')"
grep -qx "$PG" <<<"$EN_SERVICE" || refuser "$PG ne tourne pas"

MONTAGE="$(volume_monte)"
[ "$MONTAGE" = "volume $VOLUME" ] \
  || refuser "la base n'est pas sur le volume attendu ($VOLUME) : « $MONTAGE »"

IMAGE="$(podman inspect "$PG" --format '{{.ImageName}}' 2>/dev/null || true)"
IMAGE_AVANT="$(podman inspect "$PG" --format '{{.Image}}' 2>/dev/null || true)"
# Un identifiant d'image se lit avec ou sans `sha256:` selon la commande et la
# version du moteur. On compare des identifiants nus : une difference de
# prefixe ferait conclure a tort que la base n'est pas sur la bonne image,
# donc defaire un renouvellement reussi.
IMAGE_AVANT="${IMAGE_AVANT#sha256:}"
[ -n "$IMAGE" ] && [ -n "$IMAGE_AVANT" ] || refuser "image de $PG illisible"
case "$IMAGE" in
  *@sha256:*)
    refuser "l'image de la base est epinglee par digest ($IMAGE) : elle se renouvelle en changeant la compose, pas en retirant un tag"
    ;;
esac

VERSION_AVANT="$(version_en_service)"
[[ "$VERSION_AVANT" =~ ^[0-9]+\.[0-9]+$ ]] || refuser "version du serveur illisible : « $VERSION_AVANT »"
CANARI_AVANT="$(canari)"
[[ "$CANARI_AVANT" =~ ^[0-9]+\|[0-9]+$ ]] || refuser "canari illisible : « $CANARI_AVANT »"

COULEURS_ACTIVES="$(grep -E "^${PROJET}-app(b)?$" <<<"$EN_SERVICE" || true)"
[ -n "$COULEURS_ACTIVES" ] || refuser "aucune couleur applicative ne tourne : remettre la pile d'aplomb d'abord"

log "pile : $STACK ($STACK_DIR), unite $UNITE, pod $POD"
log "base : $PG, PostgreSQL $VERSION_AVANT, image ${IMAGE_AVANT:0:12} ($IMAGE)"
log "       volume $VOLUME, canari $CANARI_AVANT (saisons|espaces)"
log "application en service : $(echo $COULEURS_ACTIVES)"
if haproxy_pilotable; then
  log "HAProxy pilotable : $(haproxy_resume)"
else
  log "ATTENTION : HAProxy non pilotable ($HAPROXY_SOCKET), la couleur de retour ne pourra pas etre remise a ready"
fi

if [ "$DRY_RUN" = "1" ]; then
  log "--dry-run : plan"
  log "  1. podman pull $IMAGE  (la version cible se lit apres le retrait)"
  if [ "$STACK" = "prod" ]; then
    log "  2. $DUMP_SECURITE avant-postgres-<version>"
  else
    log "  2. pas d'instantane : la base de la demo est remise a zero chaque dimanche"
  fi
  log "  3. podman stop -t 30 $(echo $COULEURS_ACTIVES) ; podman stop -t $PG_STOP_WAIT $PG ; systemctl --user stop $UNITE"
  log "  4. podman pod rm $POD  (conteneurs seulement, $VOLUME reste)"
  log "  5. systemctl --user start $UNITE"
  log "  6. verifications : image, volume, version, canari, /api/health, HAProxy"
  log "--dry-run : rien n'a ete touche"
  exit 0
fi

# --- 2. Retrait de l'image ---------------------------------------------------------
ETAPE="retrait de l'image"
log "retrait de $IMAGE ..."
podman pull "$IMAGE"
IMAGE_APRES="$(podman image inspect "$IMAGE" --format '{{.Id}}')"
IMAGE_APRES="${IMAGE_APRES#sha256:}"

# Le tag est commun aux deux piles : la demo renouvelee, le retrait ne change
# plus rien pour la production, dont le conteneur tourne pourtant encore sur
# l'image d'avant. On compare donc au conteneur, pas au retrait.
if [ "$IMAGE_APRES" = "$IMAGE_AVANT" ]; then
  log "la base tourne deja sur l'image du tag (PostgreSQL $VERSION_AVANT, ${IMAGE_AVANT:0:12}) : rien a faire"
  exit 0
fi
TAG_DEPLACE=1

VERSION_APRES="$(version_image "$IMAGE")"
remettre_tag() {
  podman tag "$IMAGE_AVANT" "$IMAGE"
  TAG_DEPLACE=0
  log "le tag $IMAGE designe de nouveau l'image d'avant"
}
if ! [[ "$VERSION_APRES" =~ ^[0-9]+\.[0-9]+$ ]]; then
  remettre_tag
  refuser "version de l'image retiree illisible : « $VERSION_APRES »"
fi
if [ "${VERSION_APRES%%.*}" != "${VERSION_AVANT%%.*}" ]; then
  remettre_tag
  refuser "changement de version majeure ($VERSION_AVANT vers $VERSION_APRES) : c'est pg_upgrade, pas un changement d'image"
fi
PLUS_ANCIENNE="$(printf '%s\n%s\n' "$VERSION_AVANT" "$VERSION_APRES" | sort -V | head -n 1)"
if [ "$VERSION_APRES" != "$VERSION_AVANT" ] && [ "$PLUS_ANCIENNE" = "$VERSION_APRES" ]; then
  remettre_tag
  refuser "l'image retiree est plus ancienne que la base en service ($VERSION_APRES contre $VERSION_AVANT)"
fi

log "en service : PostgreSQL $VERSION_AVANT (image ${IMAGE_AVANT:0:12})"
log "retiree    : PostgreSQL $VERSION_APRES (image ${IMAGE_APRES:0:12})"

# L'image d'avant, sous un nom : une image sans nom part au premier
# `podman image prune`, et le retour arriere avec elle.
TAG_RETOUR="localhost/humanix-postgres-precedent:${VERSION_AVANT}"
podman tag "$IMAGE_AVANT" "$TAG_RETOUR"
log "image d'avant gardee sous $TAG_RETOUR"

if [ "$STACK" = "prod" ] && [ "$ASSUME_YES" = "0" ]; then
  printf '%s [update-postgres] Renouveler PostgreSQL de la PRODUCTION, de %s a %s ? Le site repondra 503 pendant la recreation de la pile. [oui/N] ' \
    "$(horodate)" "$VERSION_AVANT" "$VERSION_APRES"
  read -r reponse || reponse=""
  case "$reponse" in
    oui|OUI|o|O|y|Y|yes) ;;
    *)
      log "abandon : rien n'a ete arrete."
      log "L'image retiree reste sous le tag : elle sera prise a la prochaine recreation de la pile"
      log "(ce script, ou un demarrage de l'hote qui suit une livraison)."
      exit 0
      ;;
  esac
fi

# --- 3. Filet de securite ----------------------------------------------------------
if [ "$STACK" = "prod" ]; then
  ETAPE="instantane de securite"
  [ -x "$DUMP_SECURITE" ] || refuser "$DUMP_SECURITE introuvable ou non executable"
  "$DUMP_SECURITE" "avant-postgres-${VERSION_APRES}"
else
  log "demo : pas d'instantane, sa base est remise a zero chaque dimanche"
fi

# --- 4. Arrets -----------------------------------------------------------------------
ETAPE="arret de l'application"
DEBUT_COUPURE=$(date +%s)
PHASE=1
for c in $COULEURS_ACTIVES; do
  log "arret de $c ..."
  podman stop -t 30 "$c" >/dev/null
done

ETAPE="arret de PostgreSQL"
# Le signal d'arret de l'image officielle est SIGINT : arret « rapide », qui
# coupe les sessions restantes et ecrit un point de controle. L'unite, elle,
# ne lui laisserait que les 10 secondes par defaut de podman.
log "arret de $PG (${PG_STOP_WAIT}s au plus) ..."
podman stop -t "$PG_STOP_WAIT" "$PG" >/dev/null
CODE_PG="$(podman inspect "$PG" --format '{{.State.ExitCode}}' 2>/dev/null || echo "?")"
if [ "$CODE_PG" != "0" ] \
  && ! { podman logs --tail 20 "$PG" 2>&1 || true; } | grep -q "database system is shut down"; then
  log "PostgreSQL ne s'est pas arrete proprement (code $CODE_PG) : on ne remplace pas une base dans cet etat"
  exit 1
fi
log "PostgreSQL arrete proprement"

ETAPE="arret de l'unite"
arreter_unite

# --- 5. Retrait du pod, recreation ---------------------------------------------------
ETAPE="retrait du pod"
log "retrait de $POD (conteneurs seulement, les volumes restent) ..."
# La phase change AVANT la commande : un retrait interrompu a mi-chemin se
# rattrape comme un retrait fait, par le retour arriere.
PHASE=2
podman pod rm "$POD" >/dev/null
RESTES="$(podman ps -a --filter "label=io.podman.compose.project=$PROJET" --format '{{.Names}}')"
if [ -n "$RESTES" ]; then
  log "des conteneurs de la pile subsistent hors du pod : $(echo $RESTES)"
  exit 1
fi
if ! podman volume exists "$VOLUME"; then
  PHASE=4
  exit 1
fi

ETAPE="recreation de la pile"
log "relance de $UNITE, qui recree la pile sur les images presentes ..."
systemctl --user start "$UNITE"

# --- 6. La base ----------------------------------------------------------------------
ETAPE="attente de PostgreSQL"
attendre_postgres
ETAPE="verification de la base"
verifier_base "$IMAGE_APRES" "$VERSION_APRES"

# --- 7. L'application, puis HAProxy --------------------------------------------------
ETAPE="attente de l'application"
attendre_application
PHASE=3
DUREE_COUPURE=$(( $(date +%s) - DEBUT_COUPURE ))

ETAPE="HAProxy"
code_haproxy=0
haproxy_remettre_pret || code_haproxy=$?
case "$code_haproxy" in
  0) ;;
  2) log "ATTENTION : HAProxy non pilotable, couleur de retour non remise a ready. Verifier que le site repond." ;;
  *) exit 1 ;;
esac

# Controle de bout en bout, par le nom public : il traverse HAProxy. Une
# alerte seulement, l'hote peut ne pas savoir se joindre par son adresse
# publique.
URL_PUBLIQUE="$( { grep -E '^NEXT_PUBLIC_APP_URL=' .env || true; } | tail -n 1 | cut -d= -f2- | tr -d '"'"'")"
case "$URL_PUBLIQUE" in
  https://*)
    if curl -sf --max-time 10 "${URL_PUBLIQUE%/}/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
      log "controle public : ${URL_PUBLIQUE%/}/api/health repond"
    else
      log "ATTENTION : ${URL_PUBLIQUE%/}/api/health ne repond pas depuis l'hote, a verifier de l'exterieur"
    fi
    ;;
esac

trap - EXIT INT TERM
log "OK : PostgreSQL $VERSION_AVANT -> $VERSION_APRES sur la pile $STACK, coupure de ${DUREE_COUPURE}s"
log "La pile est revenue en$(printf ' %s' $COULEURS_APRES), comme apres un redemarrage de l'hote ; .humanix-deployed n'est pas reecrit."
log "Quand la nouvelle version aura fait ses preuves : podman rmi $TAG_RETOUR"
