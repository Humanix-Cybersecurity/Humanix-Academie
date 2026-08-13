#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# deploy.sh - Livraison d'une stack Humanix (demo ou prod).
#
# CE QUE CE SCRIPT CORRIGE (cf. #753)
#
#   La livraison consistait a rebuild sur place depuis un clone git dont
#   PERSONNE ne savait a quel commit il etait. C'est la cause racine
#   documentee de la divergence prod/main du pentest du 7 mai : le code
#   deploye n'etait pas celui qu'on croyait, et rien ne permettait de s'en
#   apercevoir.
#
#   Ce script ne change pas le mecanisme (on continue de builder sur
#   place), il le rend TRACABLE et SUR : on met le clone sur un commit
#   precis, on verifie que le contenu commercial est bien la, on rebuild,
#   et on ENREGISTRE ce qui a ete deploye.
#
# POURQUOI PAS L'IMAGE GHCR PUBLIEE
#
#   Erreur de conception de la premiere version de ce script, corrigee
#   ici. L'image publiee par docker-publish.yml est l'artefact de
#   DISTRIBUTION OSS, destine aux self-hosters : elle est construite
#   volontairement SANS le submodule prive content-pro (le workflow a
#   meme un garde-fou qui fait echouer le build si content-pro est
#   present).
#
#   La deployer sur demo/prod ferait tomber le catalogue de ~37 saisons a
#   2 (les seules CC BY-SA) : le site deviendrait une coquille vide. Les
#   stacks commerciales ONT besoin de content-pro, donc d'un build local.
#
# LE GARDE-FOU QUI COMPTE
#
#   Ce script REFUSE de builder si content-pro/ est vide. C'est exactement
#   le mode de defaillance decrit ci-dessus, et il est silencieux : le
#   build reussit, le site demarre, et le catalogue est simplement vide.
#
# PRE-REQUIS
#
#   - La stack est un clone git de Humanix-Academie avec le submodule
#     content-pro accessible (cle de deploiement sur la machine).
#   - ATTENTION au remote : sur les stacks existantes, `origin` pointe
#     vers humanix-content-pro et c'est `upstream` qui pointe vers
#     Humanix-Academie. Le script resout ca tout seul et refuse si aucun
#     remote ne correspond.
#
# USAGE
#
#   ./scripts/deploy.sh demo                 # dernier commit de main
#   ./scripts/deploy.sh prod v1.2.3          # un tag precis
#   ./scripts/deploy.sh prod --dry-run       # montre le plan, ne fait rien
#   ./scripts/deploy.sh demo --yes           # sans confirmation
#
# VARIABLES D'ENV
#
#   HUMANIX_PROD_DIR     (defaut /opt/humanix-prod)
#   HUMANIX_DEMO_DIR     (defaut /opt/humanix-demo)
#   HUMANIX_HEALTH_URL   (defaut http://127.0.0.1/ - cf. convention
#                         127.0.0.1 et non localhost, INFRA_STACKS_DEPLOYED.md)
#   HUMANIX_HEALTH_WAIT  (defaut 180) - secondes d'attente apres restart
#
# EXIT CODES
#   0 succes · 1 usage/config · 2 clone invalide · 3 content-pro vide
#   4 service non healthy (rollback affiche) · 5 build echoue

set -euo pipefail

PROD_DIR="${HUMANIX_PROD_DIR:-/opt/humanix-prod}"
DEMO_DIR="${HUMANIX_DEMO_DIR:-/opt/humanix-demo}"
HEALTH_URL="${HUMANIX_HEALTH_URL:-http://127.0.0.1/}"
HEALTH_WAIT="${HUMANIX_HEALTH_WAIT:-180}"

DRY_RUN=false
ASSUME_YES=false
ENVIRONMENT=""
REF=""

log()  { printf '[deploy] %s\n' "$*"; }
warn() { printf '[deploy] ATTENTION : %s\n' "$*" >&2; }
die()  { printf '[deploy] ERREUR : %s\n' "$*" >&2; exit "${2:-1}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    demo|prod)  ENVIRONMENT="$1" ;;
    --dry-run)  DRY_RUN=true ;;
    --yes|-y)   ASSUME_YES=true ;;
    -h|--help)  sed -n '2,66p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)         die "option inconnue : $1" ;;
    *)          REF="$1" ;;
  esac
  shift
done

[ -n "$ENVIRONMENT" ] || die "usage : $0 <demo|prod> [ref] [--dry-run] [--yes]"

if [ "$ENVIRONMENT" = "prod" ]; then
  STACK_DIR="$PROD_DIR"
else
  STACK_DIR="$DEMO_DIR"
fi
REF="${REF:-main}"

[ -d "$STACK_DIR" ] || die "repertoire de stack introuvable : $STACK_DIR"
command -v docker >/dev/null || die "docker introuvable"
cd "$STACK_DIR"
git rev-parse --git-dir >/dev/null 2>&1 || die "$STACK_DIR n'est pas un clone git" 2

# --- Resolution du remote Humanix-Academie -------------------------------
#
# Piege reel : sur les stacks existantes `origin` pointe vers le submodule
# de contenu (humanix-content-pro) et c'est `upstream` qui pointe vers
# l'application. Un `git pull` nu tirerait le mauvais depot.

REMOTE=""
for r in $(git remote); do
  if git remote get-url "$r" 2>/dev/null | grep -qi "Humanix-Academie"; then
    REMOTE="$r"
    break
  fi
done
[ -n "$REMOTE" ] || die "aucun remote ne pointe vers Humanix-Academie (verifie \`git remote -v\`)" 2
log "Remote applicatif : $REMOTE ($(git remote get-url "$REMOTE"))"

CURRENT="$(git rev-parse HEAD)"
CURRENT_SHORT="$(git rev-parse --short HEAD)"

log "Environnement : $ENVIRONMENT  ($STACK_DIR)"
log "Commit en place : $CURRENT_SHORT  $(git log -1 --format=%s | cut -c1-60)"

# Branches d'abord : c'est ce dont on a besoin pour deployer `main`.
git fetch --quiet "$REMOTE" || die "fetch impossible depuis $REMOTE"

# Tags ensuite, SEPAREMENT et de maniere NON bloquante.
#
# Constate en production : des tags locaux (v1.0.0, v1.1.0, v1.2.0...)
# pointent sur une histoire reecrite et divergent du distant. `git fetch
# --tags` echoue alors avec "would clobber existing tag" -- ce qui, groupe
# avec le fetch des branches, faisait echouer tout le deploiement pour une
# raison sans rapport avec le code a livrer.
TAGS_SYNCED=true
if ! git fetch --quiet --tags "$REMOTE" 2>/dev/null; then
  TAGS_SYNCED=false
  warn "tags non synchronises (divergence locale). Le deploiement d'une"
  warn "BRANCHE reste sur, celui d'un TAG est refuse ci-dessous."
fi

# Resolution de la ref cible.
#
# Une branche est resolue via le remote, qui fait autorite. Un tag, lui,
# n'existe que localement (les tags ne vivent pas sous refs/remotes) : si
# la synchro des tags a echoue, le tag local peut pointer sur une histoire
# obsolete. On refuse alors plutot que de livrer silencieusement le mauvais
# commit en production.
TARGET="$(git rev-parse --verify --quiet "${REMOTE}/${REF}" || true)"
if [ -z "$TARGET" ]; then
  if [ "$TAGS_SYNCED" = false ]; then
    die "tags non synchronises : impossible de garantir que '$REF' pointe sur le bon commit. Resoudre la divergence (git tag -d $REF && git fetch --tags $REMOTE) puis relancer." 2
  fi
  TARGET="$(git rev-parse --verify --quiet "refs/tags/${REF}" || true)"
fi
[ -n "$TARGET" ] || die "ref introuvable : $REF"
TARGET_SHORT="$(git rev-parse --short "$TARGET")"
log "Commit cible    : $TARGET_SHORT  $(git log -1 --format=%s "$TARGET" | cut -c1-60)"

if [ "$CURRENT" = "$TARGET" ]; then
  log "Deja sur ce commit."
  # On continue quand meme si l'operateur force : le submodule ou le
  # build peuvent avoir besoin d'un rattrapage.
fi

# --- Ce qui va changer ----------------------------------------------------

CHANGED="$(git diff --name-only "$CURRENT" "$TARGET" | wc -l | tr -d ' ')"
log "Fichiers modifies par cette livraison : $CHANGED"
if git diff --name-only "$CURRENT" "$TARGET" | grep -q "^prisma/schema.prisma$"; then
  warn "le schema Prisma change : db push s'appliquera au demarrage."
fi

# Modifications locales : sur ces stacks, docker-compose.yml a
# volontairement diverge (cf. docs/INFRA_STACKS_DEPLOYED.md). On les
# signale sans les ecraser - le merge les preserve tant que le depot ne
# touche pas les memes lignes.
LOCAL_MODS="$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
if [ "$LOCAL_MODS" -gt 0 ]; then
  log "Modifications locales preservees ($LOCAL_MODS fichier(s)) :"
  git status --porcelain --untracked-files=no | sed 's/^/    /'
fi

if $DRY_RUN; then
  log "--dry-run : arret avant toute modification."
  exit 0
fi

if [ "$ENVIRONMENT" = "prod" ] && ! $ASSUME_YES; then
  printf '[deploy] Livrer %s en PRODUCTION ? [oui/N] ' "$TARGET_SHORT"
  read -r answer
  case "$answer" in
    oui|OUI|o|O|y|Y|yes) ;;
    *) log "Abandon. Rien n'a ete modifie."; exit 0 ;;
  esac
fi

# --- Mise a jour du code --------------------------------------------------

log "Mise a jour du clone vers $TARGET_SHORT ..."

# CAS NORMAL : la cible descend de HEAD, avance rapide.
if git merge --ff-only "$TARGET" 2>/dev/null; then
  :

# HISTORIQUE REECRIT : aucun ancetre commun entre le clone et la cible.
#
# Rencontre le 2026-08-13, apres la reecriture qui a retire 402 trailers
# d'attribution d'outil et 714 tirets cadratin des messages de commit.
# `git merge` refuse alors, a juste titre : "refusing to merge unrelated
# histories". Le script s'arretait, et il fallait intervenir a la main.
#
# Un merge n'a de toute facon aucun sens ici. Une reecriture ne change
# QUE les messages : l'arborescence est identique, ce qui se verifie
# ci-dessous avant d'agir. On repositionne donc le clone par un reset,
# en preservant explicitement les fichiers modifies localement (sur ces
# stacks, docker-compose.yml a volontairement diverge du depot).
elif ! git merge-base HEAD "$TARGET" >/dev/null 2>&1; then
  warn "historique reecrit : aucun ancetre commun entre le clone et la cible."

  # GARDE-FOU. On ne repositionne de force QUE si le contenu est
  # rigoureusement identique. Si les arborescences different, ce n'est pas
  # une reecriture de messages mais un autre historique : on refuse.
  if [ "$(git rev-parse HEAD^{tree})" != "$(git rev-parse "$TARGET^{tree}")" ]; then
    warn "les arborescences DIFFERENT : ce n'est pas une simple reecriture."
    die "repositionnement de force refuse. Verifier a la main dans $STACK_DIR" 2
  fi
  log "  arborescences identiques : seuls les messages ont change."

  # Sauvegarde horodatee des fichiers suivis modifies localement, avant
  # le reset qui les ecraserait.
  SAUVE="$STACK_DIR/.deploy-local-$(date +%Y%m%d-%H%M%S)"
  MODIFIES="$(git diff --name-only HEAD || true)"
  if [ -n "$MODIFIES" ]; then
    mkdir -p "$SAUVE"
    printf '%s\n' "$MODIFIES" | while IFS= read -r f; do
      [ -f "$f" ] || continue
      mkdir -p "$SAUVE/$(dirname "$f")"
      cp -p "$f" "$SAUVE/$f"
    done
    log "  modifications locales sauvegardees dans $SAUVE"
  fi

  git reset --hard "$TARGET" >/dev/null || die "repositionnement impossible" 2

  # Restauration a l'identique. Les fichiers reapparaissent donc comme
  # modifies, ce qui est l'etat attendu de ces stacks.
  if [ -n "$MODIFIES" ]; then
    printf '%s\n' "$MODIFIES" | while IFS= read -r f; do
      [ -f "$SAUVE/$f" ] && cp -p "$SAUVE/$f" "$f"
    done
    log "  modifications locales restaurees."
  fi

# Historiques lies mais divergents : merge classique.
elif git merge --no-edit "$TARGET"; then
  :

else
  warn "le merge a echoue (conflit avec les modifications locales)."
  die "resoudre a la main dans $STACK_DIR puis relancer" 2
fi

log "Mise a jour du submodule content-pro ..."
git submodule update --init --recursive content-pro || {
  warn "impossible de mettre a jour content-pro (cle de deploiement absente ?)"
}

# --- GARDE-FOU : contenu commercial present ------------------------------
#
# Sans content-pro, le build REUSSIT et le site demarre... avec 2 saisons
# au lieu de ~37. Panne silencieuse : rien dans les logs, juste un
# catalogue vide. On refuse plutot que de livrer une coquille.

if [ ! -f content-pro/prisma/catalog-saisons.ts ]; then
  cat >&2 <<EOF
[deploy] ERREUR : content-pro/ est vide ou incomplet.

  Le build reussirait quand meme, mais le catalogue tomberait aux seules
  saisons CC BY-SA : le site deviendrait une coquille vide, sans que rien
  ne le signale.

  Verifier l'acces au submodule prive :
      cd $STACK_DIR && git submodule update --init --recursive content-pro
EOF
  exit 3
fi
log "content-pro present : $(ls content-pro/content 2>/dev/null | wc -l | tr -d ' ') entree(s) de contenu"

# --- Build + restart ------------------------------------------------------

log "Build de l'image applicative (peut prendre plusieurs minutes) ..."
docker compose build app || die "build echoue" 5

log "Redemarrage du service app ..."
docker compose up -d --no-deps app

# --- Trace de ce qui est deploye -----------------------------------------
#
# LE point qui manquait : apres coup, plus personne ne savait quel commit
# tournait. On l'ecrit a cote de la stack, lisible sans docker.

DEPLOYED_FILE="$STACK_DIR/.humanix-deployed"
{
  echo "commit=$(git rev-parse HEAD)"
  echo "ref=$REF"
  echo "content_pro=$(git -C content-pro rev-parse HEAD 2>/dev/null || echo inconnu)"
  echo "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "deployed_by=${USER:-inconnu}"
} > "$DEPLOYED_FILE"
log "Trace ecrite dans $DEPLOYED_FILE"

# --- Verification ---------------------------------------------------------

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
  docker compose logs --tail=60 app || true
  cat >&2 <<EOF

[deploy] ROLLBACK : revenir au commit precedent avec

    cd $STACK_DIR
    git merge --abort 2>/dev/null || git reset --hard $CURRENT
    git submodule update --init --recursive content-pro
    docker compose up -d --build app

  Commit precedent : $CURRENT_SHORT
EOF
  exit 4
fi

log "OK : service healthy."
log "Commit deploye : $(git rev-parse --short HEAD)"
log ""
log "Verifier le catalogue :"
log "    docker compose exec -T postgres psql -U humanix -d humanix -tAc 'select count(*) from \"Saison\";'"
