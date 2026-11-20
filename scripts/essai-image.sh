#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# essai-image.sh - Demarre une image de l'application contre un PostgreSQL
#                  jetable, et echoue si elle ne sert pas.
#
# POURQUOI CE SCRIPT EXISTE
#
#   Le workflow de publication avait un job « Smoke test pulled image », vert
#   depuis sa creation le 2026-05-23, qui n'a jamais rien prouve :
#
#     - il lancait l'image avec une base factice et SKIP_MIGRATIONS=true, une
#       variable que rien n'a jamais lue. Le point d'entree attendait donc
#       PostgreSQL trente secondes puis sortait, sans lancer Next.js ;
#     - sa boucle d'attente n'avait pas de branche d'echec : si personne ne
#       repondait en soixante secondes, l'etape se terminait quand meme a 0.
#
#   Constate le 2026-11-19 dans le journal d'une publication verte : « Timeout
#   attente Postgres », et jamais « Container repond ».
#
#   Un essai qui ne peut pas echouer ne prouve rien. Celui-ci fait ce que fait
#   un premier `compose up` chez une personne qui s'auto-heberge : base vierge,
#   preparation au demarrage, puis de vraies requetes.
#
# CE QU'IL FAIT
#
#   1. cree un reseau INTERNE, sans route vers Internet ;
#   2. construit l'image PostgreSQL du depot (docker/postgres) et la lance,
#      vide ;
#   3. lance l'image a essayer contre cette base, sans port publie ;
#   4. attend que /api/health reponde 200, DEPUIS le conteneur. Cette route
#      interroge la base : 200 veut dire que le schema a ete pose et que
#      Next.js sert ;
#   5. cherche dans le journal du conteneur une etape de preparation en echec ;
#   6. demande la page d'accueil ;
#   7. affiche le journal du conteneur, puis retire tout ce qu'il a cree, que
#      l'essai ait reussi ou non.
#
#   Il echoue si le conteneur s'arrete, s'il ne repond pas dans le delai, si
#   une etape de preparation a echoue, ou si la page d'accueil est en erreur.
#
# POURQUOI UN RESEAU INTERNE
#
#   Au premier demarrage sur une base vierge, le point d'entree importe
#   l'observatoire des fuites depuis des sites tiers. Un essai de CI n'a pas a
#   solliciter ces sites a chaque publication, ni a dependre de leur humeur.
#   Sans route vers l'exterieur l'import ne peut pas aboutir ; le point
#   d'entree le borne a 180 s et continue, il est non bloquant par conception.
#
#   Mesure le 2026-11-19 sur l'image de `main` : aucune route par defaut dans
#   le conteneur, chaque requete de l'import echoue sur la resolution du nom
#   (EAI_AGAIN) au bout de quelques secondes, soit 80 s pour ses 26 adresses.
#   /api/health repond 200 a 91 s. C'est l'essentiel de la duree de l'essai, et
#   la raison du delai par defaut.
#
#   Consequence : aucun port n'est publie, un reseau interne ne le permet pas.
#   Les requetes partent donc de l'interieur du conteneur, avec le Node de
#   l'image : on lit le code HTTP sans suivre les redirections.
#
# POURQUOI DES NOMS SUFFIXES
#
#   Deux publications peuvent tourner en meme temps, une sur `main` et une sur
#   un tag, et rien ne garantit que les executeurs aient chacun leur moteur de
#   conteneurs. Des noms fixes se marcheraient dessus. Le suffixe vient de
#   ESSAI_SUFFIXE, sinon du numero de processus.
#
# USAGE
#
#   ./scripts/essai-image.sh <image>
#
#   CONTAINER_ENGINE   moteur de conteneurs (defaut : docker)
#   ESSAI_SUFFIXE      suffixe des noms crees (defaut : numero de processus)
#   ESSAI_ATTENTE      secondes laissees a l'application pour repondre
#                      (defaut : 300 ; 91 mesurees, et jusqu'a 180 pour le seul
#                      import de l'observatoire si la resolution trainait).
#                      Le delai compte les pauses entre deux essais : le temps
#                      de chaque requete s'y ajoute.
#
# CODES DE SORTIE
#
#   0  l'image sert
#   1  l'image ne sert pas, ou l'essai n'a pas pu etre monte
#   2  mauvais usage
#
# OUTILS SUPPOSES : bash, sleep et le moteur de conteneurs, rien d'autre. Ni
# awk, que les executeurs de la CI n'ont pas, ni grep, ni curl. Le test
# (scripts/essai-image.test.ts) tourne avec ce seul chemin : un outil de plus
# ici, et il tombe sur le poste plutot que sur un executeur.

set -euo pipefail

log() { echo "[essai-image] $*"; }

usage() {
  echo "Usage : $0 <image>" >&2
  echo "  ex. : $0 ghcr.io/humanix-cybersecurity/humanix-academie:edge" >&2
}

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  usage
  exit 2
fi

IMAGE="$1"
MOTEUR="${CONTAINER_ENGINE:-docker}"
SUFFIXE="${ESSAI_SUFFIXE:-$$}"
ATTENTE="${ESSAI_ATTENTE:-300}"
# Secondes entre deux essais de /api/health.
PAS=2

case "$SUFFIXE" in
  "" | *[!A-Za-z0-9_.-]*)
    echo "ESSAI_SUFFIXE invalide : lettres, chiffres, point, tiret et tiret bas seulement." >&2
    exit 2
    ;;
esac
case "$ATTENTE" in
  "" | *[!0-9]*)
    echo "ESSAI_ATTENTE invalide : un nombre de secondes est attendu." >&2
    exit 2
    ;;
esac

case "$0" in
  */*) ICI="${0%/*}" ;;
  *) ICI="." ;;
esac
RACINE="$(cd "$ICI/.." && pwd)"

RESEAU="humanix-essai-$SUFFIXE"
BASE="humanix-essai-pg-$SUFFIXE"
APP="humanix-essai-app-$SUFFIXE"
IMAGE_BASE="humanix-essai-pg:$SUFFIXE"

# Valeurs propres a cet essai, jamais ecrites dans le depot. Elles ne protegent
# rien : la base et l'application vivent une minute sur un reseau sans route.
# Chiffres et lettres seulement, le mot de passe entre dans une URL.
MDP="$(printf 'essai%05d%05d%05d%05d' "$RANDOM" "$RANDOM" "$RANDOM" "$RANDOM")"
SECRET="$(printf 'essai-image-%05d%05d%05d%05d%05d' "$RANDOM" "$RANDOM" "$RANDOM" "$RANDOM" "$RANDOM")"

# -----------------------------------------------------------------------------
# Tout ce que le script cree est retire a la sortie, quelle qu'elle soit.
# `-v` emporte le volume anonyme que l'image PostgreSQL declare : sans lui,
# chaque essai en laisserait un sur l'executeur.
# -----------------------------------------------------------------------------
nettoyer() {
  code=$?
  trap - EXIT
  "$MOTEUR" rm -f -v "$APP" "$BASE" >/dev/null 2>&1 || true
  "$MOTEUR" network rm "$RESEAU" >/dev/null 2>&1 || true
  "$MOTEUR" rmi "$IMAGE_BASE" >/dev/null 2>&1 || true
  exit "$code"
}
trap nettoyer EXIT
trap 'exit 130' INT TERM

afficher_journaux() {
  echo ""
  echo "----- journal de l'application (80 dernieres lignes) -----"
  "$MOTEUR" logs --tail 80 "$APP" 2>&1 || true
  if [ "${1:-}" = "avec-la-base" ]; then
    echo ""
    echo "----- journal de PostgreSQL (30 dernieres lignes) -----"
    "$MOTEUR" logs --tail 30 "$BASE" 2>&1 || true
  fi
  echo "-----------------------------------------------------------"
  echo ""
}

echec() {
  afficher_journaux avec-la-base
  log "ECHEC : $*"
  exit 1
}

# Code HTTP d'une requete faite DEPUIS le conteneur, redirections non suivies.
# Affiche 0 si la connexion echoue. Le Node de l'image plutot que le wget de
# BusyBox : il rend le code, et ne part pas suivre une redirection vers une
# adresse que le reseau interne ne joint pas.
code_http() {
  "$MOTEUR" exec "$APP" node -e \
    'fetch(process.argv[1], { redirect: "manual" }).then((r) => console.log(r.status), () => console.log(0))' \
    "http://127.0.0.1:3000$1" 2>/dev/null || echo 0
}

# -----------------------------------------------------------------------------
# Montage
# -----------------------------------------------------------------------------
log "image a l'essai : $IMAGE"
log "moteur : $MOTEUR, suffixe : $SUFFIXE"

log "reseau interne $RESEAU"
"$MOTEUR" network create --internal "$RESEAU" >/dev/null ||
  { log "ECHEC : le reseau n'a pas pu etre cree"; exit 1; }

log "PostgreSQL du depot (docker/postgres), base vierge"
"$MOTEUR" build -q -t "$IMAGE_BASE" "$RACINE/docker/postgres" >/dev/null ||
  { log "ECHEC : l'image PostgreSQL du depot ne se construit pas"; exit 1; }

# Les valeurs passent par l'environnement du client (`-e NOM` sans valeur) :
# elles n'apparaissent ni dans la ligne de commande ni dans le journal du job.
POSTGRES_PASSWORD="$MDP" POSTGRES_READONLY_PASSWORD="$MDP" \
  "$MOTEUR" run -d --name "$BASE" --network "$RESEAU" \
  -e POSTGRES_USER=humanix -e POSTGRES_DB=humanix \
  -e POSTGRES_PASSWORD -e POSTGRES_READONLY_PASSWORD \
  "$IMAGE_BASE" >/dev/null ||
  { log "ECHEC : PostgreSQL n'a pas pu etre lance"; exit 1; }

# Aucune variable de preparation : le conteneur prepare lui-meme la base au
# demarrage, comme chez une personne qui s'auto-heberge. Il attend PostgreSQL
# tout seul (trente essais, une seconde d'ecart).
DATABASE_URL="postgresql://humanix:$MDP@$BASE:5432/humanix?schema=public" AUTH_SECRET="$SECRET" \
  "$MOTEUR" run -d --name "$APP" --network "$RESEAU" \
  -e DATABASE_URL -e AUTH_SECRET \
  "$IMAGE" >/dev/null ||
  echec "l'image n'a pas pu etre lancee"

# -----------------------------------------------------------------------------
# Attente : /api/health doit repondre 200
# -----------------------------------------------------------------------------
tours=$((ATTENTE / PAS))
if [ "$tours" -lt 1 ]; then
  tours=1
fi
log "attente de /api/health, $ATTENTE s au plus"

tour=0
while :; do
  tour=$((tour + 1))
  sante="$(code_http /api/health)"
  if [ "$sante" = "200" ]; then
    break
  fi
  # Un conteneur arrete ne repondra plus : inutile d'attendre la fin du delai.
  en_vie="$("$MOTEUR" inspect -f '{{.State.Running}}' "$APP" 2>/dev/null || echo false)"
  if [ "$en_vie" != "true" ]; then
    echec "le conteneur s'est arrete avant de repondre"
  fi
  if [ "$tour" -ge "$tours" ]; then
    echec "/api/health ne repond pas 200 apres $ATTENTE s (dernier code : $sante)"
  fi
  sleep "$PAS"
done
log "/api/health repond 200 (essai $tour sur $tours)"

# -----------------------------------------------------------------------------
# La preparation a-t-elle abouti ?
#
# Le point d'entree ne s'arrete pas quand une de ces etapes echoue : elles sont
# « non bloquantes », pour qu'une production ne reste pas au sol a cause d'un
# seed. Un conteneur peut donc repondre 200 avec un catalogue vide. C'est
# arrive : le seed de demonstration est longtemps sorti en silence, sans rien
# charger (constate le 2026-10-20). Sur une base vierge, ou rien n'excuse un
# echec, ces messages signent une image defectueuse.
#
# Les marqueurs sont ceux de docker-entrypoint.sh, mot pour mot : le test
# verifie qu'ils y figurent toujours. L'import de l'observatoire des fuites
# n'en fait pas partie, il echoue ici par construction.
# -----------------------------------------------------------------------------
MARQUEURS_D_ECHEC=(
  "migrate-legacy-trial ignoree (non bloquante)"
  "migrate-4-tiers-pivot ignoree (non bloquante)"
  "seed-catalog a echoue (non bloquant)"
  "bootstrap-admin a echoue"
)
journal="$("$MOTEUR" logs "$APP" 2>&1 || true)"
for marqueur in "${MARQUEURS_D_ECHEC[@]}"; do
  case "$journal" in
    *"$marqueur"*) echec "une etape de preparation a echoue : $marqueur" ;;
  esac
done
log "preparation : aucune etape en echec dans le journal"

# -----------------------------------------------------------------------------
# Une vraie page : la route de sante ne rend aucun composant.
# -----------------------------------------------------------------------------
accueil="$(code_http /)"
case "$accueil" in
  2?? | 3??) log "la page d'accueil repond $accueil" ;;
  *) echec "la page d'accueil repond $accueil" ;;
esac

afficher_journaux
log "ESSAI REUSSI : l'image demarre sur une base vierge et sert."
