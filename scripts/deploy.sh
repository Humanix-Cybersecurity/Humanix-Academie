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
cd "$STACK_DIR"

# --- Moteur de conteneurs -------------------------------------------------
#
# Les deux moteurs COHABITENT sur humanix-prod-01 : la demo tourne sous
# Podman rootless depuis le 2026-08-13, la production encore sous Docker.
#
# Le moteur est declare EXPLICITEMENT dans le .env de la stack, et non
# devine. Une detection automatique se tromperait forcement : `podman ps`
# voit les conteneurs de la demo meme quand on deploie la production, et
# inversement. Un deploiement qui rebasculerait une stack d'un moteur a
# l'autre sans prevenir serait une regression silencieuse de plus.
#
#   CONTAINER_ENGINE=podman   dans /opt/humanix-demo/.env
#   (absent)                  -> docker, comportement historique
COMPOSE="docker compose"
if [ -f .env ] && grep -qE '^CONTAINER_ENGINE=podman' .env 2>/dev/null; then
  COMPOSE="podman-compose"
fi
MOTEUR="${COMPOSE%% *}"
command -v "$MOTEUR" >/dev/null || die "$MOTEUR introuvable (declare dans .env)"

# Le binaire NU, pour les commandes qui ne passent pas par compose :
# `podman inspect`, `podman rm`.
#
# CALCULE AVANT d'ajouter les `-f` a $COMPOSE, et c'est tout le sujet : le
# 2026-08-14 ce bloc les SUIVAIT, donc $COMPOSE valait
# `podman-compose -f docker-compose.humanix.yml`, la comparaison echouait, et
# MOTEUR_BIN restait a `docker`.
#
# Consequence observee sur la demo : le retrait force du conteneur n'a pas eu
# lieu, et la verification a inspecte DOCKER -- qui possede encore un
# conteneur `humanix-demo-app` arrete depuis la migration. Elle a compare deux
# fois ce fantome, conclu a l'absence de recreation, et arrete le script.
#
# La conclusion etait juste, le raisonnement faux. Un controle qui tombe juste
# par accident est un controle qui mentira un jour.
MOTEUR_BIN="docker"
[ "$COMPOSE" = "podman-compose" ] && MOTEUR_BIN="podman"

# --- Quels fichiers compose ? ------------------------------------------
#
# COMPOSE_FILE dans le .env NE SUFFIT PAS : docker compose l'honore,
# podman-compose NON. Constate le 2026-08-14 sur la demo, qui a alors lu
# `docker-compose.yml` -- la topologie SELF-HOSTER -- et cree des conteneurs
# `humanix-app` avec un HAProxy conteneurise. Sur la production, ce HAProxy
# se serait battu pour les ports 80/443 avec celui de l'hote.
#
# On lit donc la variable NOUS-MEMES et on la passe en `-f`, ce que les deux
# moteurs traitent pareil. Separateur `:`, comme docker compose.
FICHIERS_COMPOSE=""
if [ -f .env ]; then
  _cf="$(grep -E '^COMPOSE_FILE=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"'"'"'"')"
  if [ -n "$_cf" ]; then
    _ancien_ifs="$IFS"; IFS=':'
    for _f in $_cf; do
      [ -n "$_f" ] || continue
      [ -f "$_f" ] || die "COMPOSE_FILE designe $_f, introuvable dans $STACK_DIR" 2
      FICHIERS_COMPOSE="$FICHIERS_COMPOSE -f $_f"
    done
    IFS="$_ancien_ifs"
    log "Fichiers compose :$FICHIERS_COMPOSE"
  fi
fi
COMPOSE="$COMPOSE$FICHIERS_COMPOSE"

log "Moteur de conteneurs : $COMPOSE"

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

# --- Assez de place pour construire ? -----------------------------------
#
# Le 2026-08-14, un build a rempli la racine a 100 % et echoue trois minutes
# plus tard dans une avalanche d'erreurs `overlay` illisibles -- sur une
# machine qui porte PostgreSQL. Podman ne pouvait meme plus elaguer, faute de
# pouvoir ecrire son index.
#
# Mieux vaut refuser tout de suite, avec un message qui dit quoi faire.
# Chaque construction pese 2 a 3 Go ; 5 Go est le seuil sous lequel on ne
# tente meme pas.
ESPACE_LIBRE_KO="$(df -Pk . | awk 'NR==2 {print $4}')"
if [ "${ESPACE_LIBRE_KO:-0}" -lt 5242880 ]; then
  die "espace disque insuffisant : $((ESPACE_LIBRE_KO / 1024)) Mo libres, 5 Go requis pour construire.
       Liberer avec : podman image prune -f
       Cf. docs/PODMAN.md, section « Le stockage des images vit sur /srv »" 7
fi
log "Espace disponible : $((ESPACE_LIBRE_KO / 1024 / 1024)) Go"

log "Build de l'image applicative (peut prendre plusieurs minutes) ..."

CONTENEUR_APP="humanix-${ENVIRONMENT}-app"

# IDENTIFIANT DU CONTENEUR avant le build, et non celui de son image.
#
# Comparer les images serait un faux ami : un deploiement qui ne change rien
# produit la MEME image (cache de couches), et la verification crierait a
# l'echec alors que tout va bien. Ce qu'on veut savoir est : le conteneur
# a-t-il ete RECREE ? Son identifiant repond exactement a cela.
CONTENEUR_AVANT="$($MOTEUR_BIN inspect "$CONTENEUR_APP" --format '{{.Id}}' 2>/dev/null | cut -c1-12 || true)"

$COMPOSE build app || die "build echoue" 5

# --- Le remplacement du conteneur, et pourquoi il ne va pas de soi --------
#
# `up -d --no-deps app` suffisait sous Docker. Sous PODMAN, non : les
# conteneurs vivent dans un pod, et un `depends_on` declare EMPECHE le
# remplacement. Constate le 2026-08-14 en PRODUCTION :
#
#   Error: container <app> has dependent containers which must be removed
#   before it: <vector>: container already exists
#
# podman-compose a alors simplement REDEMARRE l'ancien conteneur et rendu la
# main SANS erreur. Le script rapportait un succes pendant que l'image d'avant
# continuait de servir. On ne s'en est apercu qu'en comparant a la main les
# identifiants d'image -- sinon la livraison etait perdue en silence.
#
# On retire donc le conteneur avant de le recreer. `|| true` : son absence
# n'est pas une erreur, c'est le cas d'un premier deploiement.
if [ "$MOTEUR_BIN" = "podman" ]; then
  # `-f` NE SUFFIT PAS. Il force l'arret, pas la levee de la dependance :
  #
  #   Error: container <app> has dependent containers which must be removed
  #   before it: <vector>: container already exists
  #
  # C'est ce que mon premier correctif avait manque : le `|| true` avalait
  # cette erreur, `up -d` redemarrait l'ancien conteneur, et seule la
  # verification finale a rattrape le coup -- apres un build de trois
  # minutes pour rien.
  #
  # `--depend` retire le conteneur ET ceux qui en dependent, ici vector.
  # D'ou le `up -d` complet plus bas : il faut les faire revenir.
  # --- PREPARATION AVANT COUPURE -------------------------------------------
  #
  # Schema, migrations legacy, seed du catalogue, bootstrag admin : toutes ces
  # etapes mutent l'etat PARTAGE, et elles tournaient jusqu'ici au demarrage du
  # conteneur applicatif -- donc PENDANT la coupure, allongeant d'autant le
  # temps ou le service ne repond pas.
  #
  # On les execute maintenant AVANT de retirer l'ancien conteneur, dans un
  # conteneur jetable bati sur la nouvelle image. L'ancienne version continue
  # de servir le trafic pendant ce temps.
  #
  # C'est aussi le prealable a une bascule sans coupure : deux versions ne
  # peuvent cohabiter que si aucune des deux ne modifie le schema en demarrant.
  #
  # Si cette etape echoue, on s'arrete AVANT d'avoir touche au service en
  # place : l'ancienne version reste debout, intacte.
  log "Preparation de l'etat partage (schema, seeds) sur l'ancienne version en ligne ..."
  # `preparer` SEUL, pas `./docker-entrypoint.sh preparer`.
  #
  # L'image declare un ENTRYPOINT : ce qu'on passe ici en devient les
  # ARGUMENTS. Avec le chemin, le conteneur executait
  # `/docker-entrypoint.sh ./docker-entrypoint.sh preparer`, donc $1 valait le
  # chemin et jamais `preparer`. Le test echouait, la preparation etait sautee,
  # et le conteneur demarrait Next.js -- un faux serveur sain qui emettait meme
  # des battements dans Loki, pendant que `run` attendait une fin qui ne
  # viendrait jamais. Constate sur la demo le 2026-08-19.
  if ! $COMPOSE run --rm --no-deps app preparer; then
    die "preparation echouee -- rien n'a ete touche, l'ancienne version sert toujours" 7
  fi
  log "  -> etat partage a jour, la coupure ne portera plus que le redemarrage"

  # --- BASCULE BLEU/VERT ----------------------------------------------------
  #
  # On ne coupe plus. On demarre la couleur libre, on attend qu'elle reponde,
  # HAProxy la voit monter et lui envoie du trafic, et SEULEMENT ENSUITE on
  # arrete l'ancienne.
  #
  # /etc/haproxy/haproxy.cfg declare les deux couleurs par backend
  # (prod_a:3000 / prod_b:3010, demo_a:3001 / demo_b:3011) avec
  # `check inter 1s fall 2 rise 1`. Une couleur absente est simplement DOWN :
  # la declarer ne coute rien.
  #
  # Le recouvrement -- les deux versions servent quelques secondes -- est
  # assume. Il n'est sans danger que parce que la preparation du schema a eu
  # lieu JUSTE AU-DESSUS : les deux versions parlent a une base deja migree.
  PORT_A=3000
  [ "$ENVIRONMENT" = "demo" ] && PORT_A=3001

  # On cherche la couleur QUI SERT, pas celle qui existe.
  #
  # `container exists` renvoie vrai pour un conteneur ARRETE. Comme l'ancienne
  # couleur reste en place apres la bascule, le script a cru le 2026-08-19 que
  # `b` etait en service alors qu'elle etait arretee depuis la livraison
  # precedente -- il a donc cible `a`, c'est-a-dire la couleur qui servait
  # reellement, et l'a demolie. Quatre requetes en 502/503.
  #
  # `podman ps` ne liste que ce qui tourne.
  COULEUR_ACTUELLE=""
  if [ -n "$($MOTEUR_BIN ps --filter "name=^${CONTENEUR_APP}b$" --format '{{.Names}}' 2>/dev/null)" ]; then
    COULEUR_ACTUELLE="b"
  fi

  if [ "$COULEUR_ACTUELLE" = "b" ]; then
    COULEUR_CIBLE=""
    PORT_CIBLE="$PORT_A"
  else
    COULEUR_CIBLE="b"
    PORT_CIBLE=$((PORT_A + 10))
  fi
  CONTENEUR_CIBLE="${CONTENEUR_APP}${COULEUR_CIBLE}"
  CONTENEUR_SORTANT="${CONTENEUR_APP}${COULEUR_ACTUELLE}"

  log "Bascule : ${CONTENEUR_SORTANT} -> ${CONTENEUR_CIBLE} (port ${PORT_CIBLE})"

  # Une couleur cible laissee par une livraison precedente fausserait tout.
  # `--depend` est sans danger ICI : l'autre couleur sert le trafic, et si
  # vector s'accrochait a celle-ci, le `up -d app` juste apres le ramene.
  $MOTEUR_BIN rm -f --depend "$CONTENEUR_CIBLE" >/dev/null 2>&1 || true

  # `--no-deps` : sans lui, compose relance AUSSI postgres et tts. Mesure du
  # 2026-08-19 : les deux affichaient « Up 35 seconds » apres une bascule,
  # c'est-a-dire qu'une livraison applicative redemarrait la base. Les sondes
  # externes n'ont rien vu -- l'application a tenu -- mais redemarrer Postgres
  # a chaque livraison n'a aucune raison d'etre.
  APP_COULEUR="$COULEUR_CIBLE" APP_HOST_PORT="$PORT_CIBLE" \
    $COMPOSE up -d --no-deps app || die "demarrage de la couleur cible impossible" 6

  log "Attente de la nouvelle couleur sur 127.0.0.1:${PORT_CIBLE} ..."
  cible_prete=false
  attente=0
  while [ "$attente" -lt "$HEALTH_WAIT" ]; do
    if curl -sfo /dev/null "http://127.0.0.1:${PORT_CIBLE}/api/health" 2>/dev/null; then
      cible_prete=true
      break
    fi
    attente=$((attente + 1)); sleep 1
  done

  if [ "$cible_prete" != true ]; then
    # L'ancienne couleur n'a pas ete touchee : le service tourne toujours.
    $MOTEUR_BIN rm -f "$CONTENEUR_CIBLE" >/dev/null 2>&1 || true
    die "la nouvelle couleur n'a pas repondu -- ancienne version toujours en service" 4
  fi
  log "  -> prete apres ${attente}s"

  # Laisser HAProxy la constater. `rise 1` + `inter 1s` suffiraient ; on prend
  # cinq secondes pour ne pas dependre du calage des sondes.
  log "Attente de la prise en compte par HAProxy (5s) ..."
  sleep 5

  # Arret GRACIEUX : SIGTERM, Next.js termine les requetes en cours. HAProxy
  # sort l'ancienne du pool en ~2s, et `option redispatch` (deja dans
  # `defaults`) rejoue sur la couleur restante ce qui partirait entre-temps.
  if $MOTEUR_BIN container exists "$CONTENEUR_SORTANT" 2>/dev/null; then
    log "Arret gracieux de l'ancienne couleur ..."
    # ON ARRETE, ON NE RETIRE PAS -- et c'est tout le sujet.
    #
    # Premiere version : `rm -f --depend` puis un `$COMPOSE up -d` pour ramener
    # vector, qui declare `depends_on: app`. Ce `up -d` RECREAIT aussi le
    # conteneur applicatif : mesure du 2026-08-19, les deux couleurs sont
    # tombees ensemble a 12:53:51 et le site a rendu 503 pendant six secondes.
    # La bascule fabriquait exactement la coupure qu'elle devait supprimer.
    #
    # Un conteneur simplement arrete ne declenche aucune dependance. Vector
    # continue de tourner : son `depends_on` n'ordonne que le demarrage, et sa
    # collecte passe par le socket podman, ou il decouvre les conteneurs de
    # lui-meme.
    #
    # L'ancienne couleur reste en place, arretee. La prochaine livraison qui
    # la visera la retirera avant de la recreer.
    $MOTEUR_BIN stop "$CONTENEUR_SORTANT" >/dev/null 2>&1 || true
  fi

  # La verification qui suit doit porter sur le conteneur reellement en service.
  CONTENEUR_APP="$CONTENEUR_CIBLE"
else
  # Moteur docker : pas de bascule. La topologie bleu/vert s'appuie sur
  # `podman container exists` et sur les couleurs declarees cote HAProxy ;
  # les piles internes tournent toutes sous podman depuis le 2026-08-14.
  log "Redemarrage du service app (docker, sans bascule) ..."
  $COMPOSE up -d --no-deps app
fi


# --- Verifier ce qu'on a livre, plutot que de le supposer ----------------
#
# LE controle qui manquait. Un deploiement qui se croit reussi est pire qu'un
# deploiement qui echoue : personne ne va verifier.
sleep 5
CONTENEUR_APRES="$($MOTEUR_BIN inspect "$CONTENEUR_APP" --format '{{.Id}}' 2>/dev/null | cut -c1-12 || true)"
IMAGE_APRES="$($MOTEUR_BIN inspect "$CONTENEUR_APP" --format '{{.Image}}' 2>/dev/null | cut -c1-12 || true)"

if [ -z "$CONTENEUR_APRES" ]; then
  die "le conteneur $CONTENEUR_APP n'existe pas apres le demarrage" 6
elif [ -n "$CONTENEUR_AVANT" ] && [ "$CONTENEUR_APRES" = "$CONTENEUR_AVANT" ]; then
  die "le conteneur $CONTENEUR_AVANT n'a PAS ete recree -- il sert encore le code d'avant" 6
else
  log "Conteneur recree : ${CONTENEUR_AVANT:-aucun} -> $CONTENEUR_APRES (image $IMAGE_APRES)"
fi

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
  $COMPOSE logs --tail=60 app || true
  cat >&2 <<EOF

[deploy] ROLLBACK : revenir au commit precedent avec

    cd $STACK_DIR
    git merge --abort 2>/dev/null || git reset --hard $CURRENT
    git submodule update --init --recursive content-pro
    $COMPOSE up -d --build app

  Commit precedent : $CURRENT_SHORT
EOF
  exit 4
fi

log "OK : service healthy."
log "Commit deploye : $(git rev-parse --short HEAD)"
log ""
log "Verifier le catalogue :"
log "    $COMPOSE exec -T postgres psql -U humanix -d humanix -tAc 'select count(*) from \"Saison\";'"
