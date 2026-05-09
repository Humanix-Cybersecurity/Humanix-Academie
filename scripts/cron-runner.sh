#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# cron-runner.sh - helper portable pour appeler les endpoints /api/cron/*
# de Humanix Académie. Pensé pour être réutilisable depuis :
#   - Ofelia (cf. infra/ofelia/config.ini)
#   - crontab système classique
#   - Kubernetes CronJob (montage simple via configMap)
#   - script ad-hoc d'admin
#
# USAGE :
#   ./cron-runner.sh <name>             # appelle /api/cron/<name>
#
# VARIABLES D'ENV :
#   CRON_SECRET           (obligatoire) — secret partagé app + scheduler
#   APP_INTERNAL_URL      (défaut http://app:3000) — base URL de l'API
#   CRON_RUNNER_TIMEOUT   (défaut 600) — timeout curl en secondes
#   CRON_RUNNER_RETRIES   (défaut 2) — nombre de retries en cas d'échec
#
# EXIT CODES :
#   0  succès
#   1  argument manquant ou config invalide
#   2  erreur HTTP (non-2xx) — déclenche restart par Ofelia/k8s

set -e

if [ -z "$1" ]; then
  echo "[cron-runner] usage: $0 <endpoint-name>" >&2
  exit 1
fi

if [ -z "$CRON_SECRET" ]; then
  echo "[cron-runner] ERREUR : CRON_SECRET non défini" >&2
  exit 1
fi

NAME="$1"
APP_URL="${APP_INTERNAL_URL:-http://app:3000}"
TIMEOUT="${CRON_RUNNER_TIMEOUT:-600}"
RETRIES="${CRON_RUNNER_RETRIES:-2}"

URL="${APP_URL}/api/cron/${NAME}"
START=$(date +%s)

echo "[cron-runner] $(date -u +"%Y-%m-%dT%H:%M:%SZ") POST $URL"

HTTP_CODE=$(
  curl --silent --output /tmp/cron-runner-body \
    --write-out "%{http_code}" \
    --max-time "$TIMEOUT" \
    --retry "$RETRIES" --retry-delay 5 --retry-connrefused \
    --request POST \
    --header "X-Cron-Secret: $CRON_SECRET" \
    --header "Content-Type: application/json" \
    "$URL" \
    || echo "000"
)

ELAPSED=$(($(date +%s) - START))

case "$HTTP_CODE" in
  2*)
    echo "[cron-runner] OK ${HTTP_CODE} en ${ELAPSED}s : $(cat /tmp/cron-runner-body | head -c 200)"
    exit 0
    ;;
  *)
    echo "[cron-runner] ECHEC ${HTTP_CODE} apres ${ELAPSED}s : $(cat /tmp/cron-runner-body | head -c 500)" >&2
    exit 2
    ;;
esac
