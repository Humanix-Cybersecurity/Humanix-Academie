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
#   APP_INTERNAL_URL    defaut http://127.0.0.1:3000
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

# Depuis l'hote, l'app est joignable sur le port publie en local. Depuis
# un conteneur du meme reseau, ce serait http://app:3000 — d'ou le defaut
# different de celui de cron-runner.sh.
APP_INTERNAL_URL="${APP_INTERNAL_URL:-http://127.0.0.1:3000}"
export APP_INTERNAL_URL

exec "$(dirname "$0")/cron-runner.sh" "$1"
