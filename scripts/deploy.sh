#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# deploy.sh - Etape 2 de la livraison : deployer sur le serveur l'image que
# la CI a construite, testee et publiee sur GHCR.
#
# POURQUOI CE SCRIPT (cf. #753)
#
#   Le workflow docker-publish.yml build, teste (smoke test) et pousse une
#   image sur GHCR avec provenance SLSA + SBOM... que PERSONNE ne deployait.
#   La livraison consistait a rebuild sur place depuis git, donc l'artefact
#   valide par la CI n'arrivait jamais en production. C'est la cause racine
#   documentee de la divergence prod/main du pentest du 7 mai (CSP,
#   middleware, sanitization absents du build deploye).
#
#   Ce script deploie l'IMAGE PUBLIEE, pas un rebuild local. Ce qui tourne
#   en prod est alors exactement ce que la CI a valide, et le commit
#   deploye est verifiable (label OCI revision).
#
# CE QUE CE SCRIPT NE FAIT PAS
#
#   Il n'est JAMAIS appele par la CI : aucun acces entrant, aucune cle SSH
#   dans GitHub. La livraison reste en 2 temps, decidee et lancee a la main
#   sur la machine. C'est le choix acte pour ce projet.
#
# CORRESPONDANCE TAG <-> ENVIRONNEMENT
#
#   demo -> :edge    (suit main, republie a chaque push)
#   prod -> :latest  (publie uniquement sur un tag git v*.*.*)
#
#   Un tag explicite en 2e argument surcharge ce defaut (ex: v1.2.3, ou un
#   main-<sha7> pour rejouer un build precis).
#
# PRE-REQUIS
#
#   - Le service `app` de la stack ciblee doit utiliser `image:` et NON
#     `build:`. Le script refuse de continuer sinon, et affiche le patch.
#     Rappel : /opt/... fait autorite (cf. docs/INFRA_STACKS_DEPLOYED.md),
#     le patch est donc a appliquer la-bas, pas dans le depot.
#   - Etre logue sur GHCR si l'image est privee :
#       echo "$GITHUB_TOKEN" | docker login ghcr.io -u <user> --password-stdin
#
# USAGE
#
#   ./scripts/deploy.sh demo                  # deploie :edge sur la demo
#   ./scripts/deploy.sh prod                  # deploie :latest en prod (confirme)
#   ./scripts/deploy.sh prod v1.2.3           # deploie une version precise
#   ./scripts/deploy.sh prod --dry-run        # montre le plan, ne touche a rien
#   ./scripts/deploy.sh prod --yes            # sans confirmation interactive
#
# VARIABLES D'ENV
#
#   HUMANIX_IMAGE        (defaut ghcr.io/humanix-cybersecurity/humanix-academie)
#   HUMANIX_PROD_DIR     (defaut /opt/humanix-prod)
#   HUMANIX_DEMO_DIR     (defaut /opt/humanix-demo)
#   HUMANIX_HEALTH_URL   (defaut http://127.0.0.1/  - cf. convention 127.0.0.1
#                         et non localhost, docs/INFRA_STACKS_DEPLOYED.md)
#   HUMANIX_HEALTH_WAIT  (defaut 90) - secondes d'attente max apres restart
#
# EXIT CODES
#   0 = succes
#   1 = erreur d'usage / configuration
#   2 = stack en `build:` (patch a appliquer avant de pouvoir deployer)
#   3 = pull impossible (tag inexistant, pas logue sur GHCR)
#   4 = service non healthy apres restart (rollback affiche)

set -euo pipefail

IMAGE="${HUMANIX_IMAGE:-ghcr.io/humanix-cybersecurity/humanix-academie}"
PROD_DIR="${HUMANIX_PROD_DIR:-/opt/humanix-prod}"
DEMO_DIR="${HUMANIX_DEMO_DIR:-/opt/humanix-demo}"
HEALTH_URL="${HUMANIX_HEALTH_URL:-http://127.0.0.1/}"
HEALTH_WAIT="${HUMANIX_HEALTH_WAIT:-90}"

DRY_RUN=false
ASSUME_YES=false
ENVIRONMENT=""
TAG=""

log()  { printf '[deploy] %s\n' "$*"; }
warn() { printf '[deploy] ATTENTION : %s\n' "$*" >&2; }
die()  { printf '[deploy] ERREUR : %s\n' "$*" >&2; exit "${2:-1}"; }

# --- Parsing des arguments -------------------------------------------------

while [ $# -gt 0 ]; do
  case "$1" in
    demo|prod)   ENVIRONMENT="$1" ;;
    --dry-run)   DRY_RUN=true ;;
    --yes|-y)    ASSUME_YES=true ;;
    -h|--help)   sed -n '2,70p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)          die "option inconnue : $1" ;;
    *)           TAG="$1" ;;
  esac
  shift
done

[ -n "$ENVIRONMENT" ] || die "usage : $0 <demo|prod> [tag] [--dry-run] [--yes]"

if [ "$ENVIRONMENT" = "prod" ]; then
  STACK_DIR="$PROD_DIR"
  DEFAULT_TAG="latest"
else
  STACK_DIR="$DEMO_DIR"
  DEFAULT_TAG="edge"
fi
TAG="${TAG:-$DEFAULT_TAG}"
REF="${IMAGE}:${TAG}"

[ -d "$STACK_DIR" ] || die "repertoire de stack introuvable : $STACK_DIR"
command -v docker >/dev/null || die "docker introuvable sur cette machine"

cd "$STACK_DIR"

# --- Garde-fou : la stack doit consommer l'image, pas la rebuild -----------
#
# Si le service `app` porte un `build:`, `docker compose up` reconstruit
# depuis les sources locales et l'image publiee est ignoree — c'est
# exactement le mode de defaillance qu'on veut supprimer.

COMPOSE_CONFIG="$(docker compose config 2>/dev/null || true)"
[ -n "$COMPOSE_CONFIG" ] || die "\`docker compose config\` a echoue dans $STACK_DIR"

APP_BLOCK="$(printf '%s\n' "$COMPOSE_CONFIG" | awk '/^  app:/{f=1;next} /^  [a-z]/{f=0} f')"

if printf '%s\n' "$APP_BLOCK" | grep -qE '^\s+build:' ; then
  cat >&2 <<EOF
[deploy] ERREUR : le service \`app\` de $STACK_DIR utilise \`build:\`.

  La stack reconstruit donc l'image en local et n'utilisera JAMAIS celle que
  la CI a publiee et testee. C'est la cause racine de la divergence prod/main.

  Patch a appliquer dans $STACK_DIR/docker-compose.yml (ce fichier fait
  autorite, cf. docs/INFRA_STACKS_DEPLOYED.md — ne pas le remplacer par
  celui du depot) : retirer le bloc \`build:\` du service \`app\` et le
  remplacer par :

      app:
        image: ${IMAGE}:\${HUMANIX_IMAGE_TAG:-${DEFAULT_TAG}}

  Sauvegarder l'original avant edition :
      cp docker-compose.yml docker-compose.yml.avant-$(date +%Y%m%d)

  Puis relancer ce script.
EOF
  exit 2
fi

# --- Etat courant ----------------------------------------------------------

running_revision() {
  local cid
  cid="$(docker compose ps -q app 2>/dev/null || true)"
  [ -n "$cid" ] || { echo ""; return; }
  docker inspect --format \
    '{{index .Config.Labels "org.opencontainers.image.revision"}}' \
    "$cid" 2>/dev/null || echo ""
}

BEFORE_REV="$(running_revision)"
BEFORE_IMG="$(docker compose ps --format '{{.Image}}' app 2>/dev/null | head -1 || true)"

log "Environnement  : $ENVIRONMENT  ($STACK_DIR)"
log "Image cible    : $REF"
log "Image en place : ${BEFORE_IMG:-<aucune>}"
log "Commit en place: ${BEFORE_REV:-<inconnu>}"

# --- Pull ------------------------------------------------------------------

if $DRY_RUN; then
  log "--dry-run : arret avant le pull. Rien n'a ete modifie."
  exit 0
fi

log "Pull de $REF ..."
docker pull "$REF" >/dev/null 2>&1 || die "pull impossible ($REF). Tag inexistant, ou pas logue sur GHCR ?" 3

TARGET_REV="$(docker inspect --format \
  '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$REF" 2>/dev/null || echo "")"
TARGET_DIGEST="$(docker inspect --format '{{index .RepoDigests 0}}' "$REF" 2>/dev/null || echo "")"

log "Commit cible   : ${TARGET_REV:-<non etiquete>}"
log "Digest         : ${TARGET_DIGEST:-<inconnu>}"

if [ -n "$TARGET_REV" ] && [ "$TARGET_REV" = "$BEFORE_REV" ]; then
  log "Le commit deploye est deja celui de l'image cible : rien a faire."
  exit 0
fi

# --- Confirmation (prod uniquement) ----------------------------------------

if [ "$ENVIRONMENT" = "prod" ] && ! $ASSUME_YES; then
  printf '[deploy] Redemarrer la PRODUCTION sur %s ? [oui/N] ' "$REF"
  read -r answer
  case "$answer" in
    oui|OUI|o|O|y|Y|yes) ;;
    *) log "Abandon a la demande de l'operateur. Rien n'a ete modifie."; exit 0 ;;
  esac
fi

# --- Bascule ---------------------------------------------------------------

log "Redemarrage du service app ..."
HUMANIX_IMAGE_TAG="$TAG" docker compose up -d --no-deps app

# --- Verification ----------------------------------------------------------

log "Attente de la reponse du service (max ${HEALTH_WAIT}s) ..."
healthy=false
for _ in $(seq 1 "$HEALTH_WAIT"); do
  if curl -sfo /dev/null "$HEALTH_URL" 2>/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done

if ! $healthy; then
  warn "le service ne repond pas sur $HEALTH_URL apres ${HEALTH_WAIT}s."
  docker compose logs --tail=50 app || true
  cat >&2 <<EOF

[deploy] ROLLBACK : revenir a l'image precedente avec

    cd $STACK_DIR
    HUMANIX_IMAGE_TAG=<tag-precedent> docker compose up -d --no-deps app

  Image precedente : ${BEFORE_IMG:-<inconnue>}
  Commit precedent : ${BEFORE_REV:-<inconnu>}
EOF
  exit 4
fi

AFTER_REV="$(running_revision)"
log "OK : service healthy."
log "Commit deploye : ${AFTER_REV:-<inconnu>}"
log ""
log "Verifier la correspondance avec main :"
log "    git -C <depot> log --oneline -1 ${AFTER_REV:-HEAD}"
