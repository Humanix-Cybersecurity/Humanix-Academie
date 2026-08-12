#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Active les hooks versionnes de ce depot.
#
#   ./infra/git-hooks/install.sh
#
# Utilise `core.hooksPath` plutot que de copier dans .git/hooks : les
# hooks restent VERSIONNES, donc relisibles, modifiables en revue, et
# identiques pour tout le monde. Une copie dans .git/hooks diverge des
# le lendemain, et personne ne s'en apercoit — c'est exactement le
# probleme qu'on vient de corriger avec la crontab.
#
# Pour desactiver : git config --unset core.hooksPath

set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
CHEMIN="infra/git-hooks"

cd "$RACINE"

git config core.hooksPath "$CHEMIN"
chmod +x "$CHEMIN"/* 2>/dev/null || true

echo "[hooks] core.hooksPath = $(git config core.hooksPath)"
echo "[hooks] actifs :"
for h in "$CHEMIN"/*; do
  case "$(basename "$h")" in
    install.sh|*.md) continue ;;
  esac
  printf '           %s\n' "$(basename "$h")"
done

echo
echo "[hooks] verification : un message contenant un tiret cadratin doit etre refuse."
TEST="$(mktemp)"
printf 'test: un sujet avec un tiret cadratin — ici\n' > "$TEST"
if "$CHEMIN/commit-msg" "$TEST" >/dev/null 2>&1; then
  echo "[hooks] ATTENTION : le hook n'a PAS refuse le message de test."
  rm -f "$TEST"
  exit 1
fi
rm -f "$TEST"
echo "[hooks] OK : le hook refuse bien ce qu'il doit refuser."
