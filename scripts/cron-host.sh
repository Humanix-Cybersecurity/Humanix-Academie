#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# cron-host.sh - lance un job /api/cron/* depuis la CRONTAB DE L'HOTE.
#
# Fine couche au-dessus de cron-runner.sh : elle ne fait que lire le
# secret dans le .env de la stack, puis delegue. Toute la logique utile
# (retries, timeout, codes de sortie, journalisation) reste dans
# cron-runner.sh, partage avec les autres ordonnanceurs.
#
# USAGE :
#   ./cron-host.sh <nom-du-job>
#
# VARIABLES D'ENV (toutes optionnelles) :
#   HUMANIX_ENV_FILE    defaut /opt/humanix-prod/.env
#   HUMANIX_STACK_DIR   defaut : le repertoire du .env (porte .humanix-deployed)
#   APP_INTERNAL_URL    surcharge explicite ; sinon la couleur active est
#                       resolue (cf. plus bas)
#
# EXIT CODES : ceux de cron-runner.sh, plus
#   1  fichier .env introuvable, ou secret absent / trop court
#
# ---------------------------------------------------------------------
# POURQUOI CE FICHIER EXISTE
# ---------------------------------------------------------------------
#
# La crontab appelait auparavant curl directement, en extrayant le
# secret ainsi, sur CHACUNE de ses lignes :
#
#   grep CRON_SECRET /opt/humanix-prod/.env | cut -d= -f2 | tr -d '"'
#
# Ce grep n'est pas ancre. Or le .env contient, quelques lignes plus
# haut, un commentaire qui EXPLIQUE comment appeler les crons :
#
#   # Exemple d'appel : curl -H "x-cron-secret: $CRON_SECRET" https://...
#
# Les deux lignes remontaient donc ensemble : le "secret" obtenu faisait
# 158 caracteres et contenait un SAUT DE LIGNE. L'en-tete HTTP etait
# malformee, et l'analyseur la rejetait en 400 Bad Request AVANT que la
# route ne verifie quoi que ce soit — d'ou un 403 impossible a observer
# et un diagnostic trompeur.
#
# Resultat : TOUS les crons ont echoue, chaque nuit, depuis la mise en
# service. La table CronRun etait vide et /var/log/humanix/cron.log
# contenait 137 Ko de "curl: (22) ... error: 400" que personne ne lisait.
#
# Autrement dit : l'exemple documentant comment appeler les crons est ce
# qui les empechait de fonctionner.
#
# L'extraction est donc faite ICI, UNE SEULE FOIS, ancree en debut de
# ligne et limitee a la premiere occurrence — au lieu d'etre recopiee
# onze fois dans un fichier que personne ne relit.

set -e

if [ -z "$1" ]; then
  echo "[cron-host] usage: $0 <nom-du-job>" >&2
  exit 1
fi

ENV_FILE="${HUMANIX_ENV_FILE:-/opt/humanix-prod/.env}"

if [ ! -r "$ENV_FILE" ]; then
  echo "[cron-host] ERREUR : $ENV_FILE introuvable ou illisible" >&2
  exit 1
fi

# `-m1` : premiere occurrence seulement.
# `^CRON_SECRET=` : ancre en debut de ligne, donc les commentaires et les
#                   variables dont le nom CONTIENT CRON_SECRET sont exclus.
# `-f2-` : conserve les '=' eventuels a l'interieur de la valeur.
CRON_SECRET=$(
  grep -m1 -E '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'"
)
export CRON_SECRET

# Les routes exigent >= 16 caracteres. On echoue ICI, avec un message
# lisible, plutot que de laisser partir une requete qui reviendra en 400
# ou 403 sans expliquer pourquoi.
if [ "${#CRON_SECRET}" -lt 16 ]; then
  echo "[cron-host] ERREUR : CRON_SECRET absent ou trop court (${#CRON_SECRET} caracteres, minimum 16) dans $ENV_FILE" >&2
  exit 1
fi

# --- La cible suit la couleur active --------------------------------------
#
# Jusqu'au 2026-10-03, la cible etait figee a http://127.0.0.1:3000. Or la
# bascule bleu/vert de scripts/deploy.sh alterne l'application entre deux
# ports (prod : 3000 pour la couleur a, 3010 pour la b ; demo : 3001/3011).
# Une livraison sur deux laissait donc la prod sur un port que ce script
# ne visait pas : 1 468 echecs « 000 » dans cron.log entre le 2026-08-19 et
# le 2026-10-03, soit la moitie des executions. Campagnes de phishing non
# lancees, purges non faites, et rien ne le signalait : le journal n'etait
# lu par personne.
#
# Resolution, dans l'ordre :
#   1. APP_INTERNAL_URL si elle est fournie (surcharge explicite) ;
#   2. le port ecrit par deploy.sh dans .humanix-deployed a la derniere
#      bascule, s'il repond sur /api/health ;
#   3. sinon les deux ports de la pile, couleur a puis b, le premier qui
#      repond. La pile est deduite du repertoire du .env : « demo » dans le
#      chemin = ports 3001/3011, sinon 3000/3010. On ne sonde JAMAIS les
#      ports de l'autre pile : un cron de prod ne doit pas frapper la demo.
#
# `cron-host.sh --resolve-only` affiche la cible retenue sans rien lancer.
STACK_DIR="${HUMANIX_STACK_DIR:-$(dirname "$ENV_FILE")}"

sonde() {
  curl -sf -o /dev/null --max-time 3 "http://127.0.0.1:$1/api/health"
}

resoudre_port() {
  p=$(grep -m1 -E '^port=[0-9]+$' "$STACK_DIR/.humanix-deployed" 2>/dev/null | cut -d= -f2)
  if [ -n "$p" ] && sonde "$p"; then
    echo "$p"
    return 0
  fi
  base=3000
  case "$STACK_DIR" in
    *demo*) base=3001 ;;
  esac
  for p in "$base" $((base + 10)); do
    if sonde "$p"; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

if [ -z "${APP_INTERNAL_URL:-}" ]; then
  port=$(resoudre_port) || {
    echo "[cron-host] ERREUR : aucune couleur de l'application ne repond sur 127.0.0.1 pour la pile $STACK_DIR" >&2
    exit 1
  }
  APP_INTERNAL_URL="http://127.0.0.1:$port"
fi
export APP_INTERNAL_URL

if [ "$1" = "--resolve-only" ]; then
  echo "$APP_INTERNAL_URL"
  exit 0
fi

exec "$(dirname "$0")/cron-runner.sh" "$1"
