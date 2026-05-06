#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# =============================================================================
# rewrite-history.sh
#
# Reecrit l'historique git pour retirer les mentions de partenaires non
# confirmes (Digital 113, Cyber'Occ, etc.) avant de basculer le repo en public.
#
# Operations effectuees :
#  1. Backup mirror local du repo dans ../humanix-academie-backup-YYYYMMDD-HHMM
#  2. Reecriture des messages de commit via git-filter-repo + replacements.txt
#  3. Force push vers origin (main, develop, testing) — DESTRUCTIF
#  4. Edition des titres de PR concernes via l'API GitHub (pas de force push)
#
# A LIRE AVANT D'EXECUTER :
#  - Toutes les SHA changent. Tous les checkouts existants des contributeurs
#    deviennent invalides : ils devront re-cloner OU rebaser leur travail.
#  - Les forks divergent.
#  - Les caches GitHub Actions deviennent stale (pas grave, ils se reconstruisent).
#  - L'historique sur GitHub ne peut PAS etre annule. Le backup local
#    (../humanix-academie-backup-…) est le seul filet de securite.
#
# Pre-requis :
#  - Etre a la racine d'un clone du repo (pas un worktree)
#  - git-filter-repo installe (brew install git-filter-repo)
#  - gh authentifie avec droits admin sur le repo
#  - Aucune autre PR / branche en cours non sauvegardee
#
# Usage :
#   bash scripts/rewrite-history.sh           # dry-run (analyse + diff propose)
#   bash scripts/rewrite-history.sh --apply   # execute la reecriture
#   bash scripts/rewrite-history.sh --apply --skip-pr-titles  # sans toucher aux PRs
# =============================================================================
set -euo pipefail

REPO="Humanix-Cybersecurity/Humanix-Academie"
APPLY=0
SKIP_PR_TITLES=0

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --skip-pr-titles) SKIP_PR_TITLES=1 ;;
    -h|--help)
      grep -E '^#( |!)' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Argument inconnu : $arg" >&2
      exit 2
      ;;
  esac
done

# -----------------------------------------------------------------------------
# 1. Pre-requis
# -----------------------------------------------------------------------------
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "✗ git-filter-repo n'est pas installe."
  echo "  Installation :"
  echo "    brew install git-filter-repo"
  echo "  ou :"
  echo "    pip3 install --user git-filter-repo"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "✗ gh CLI n'est pas installe."
  echo "  brew install gh && gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "✗ gh non authentifie. Lance : gh auth login"
  exit 1
fi

# Verifie qu'on est dans un clone (pas un worktree)
if [ -f .git ]; then
  echo "✗ Ce script doit etre execute dans un clone, pas un worktree."
  echo "  cd vers le repo principal."
  exit 1
fi

# Verifie qu'on est sur main (point d'entree propre)
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CUR_BRANCH" != "main" ]; then
  echo "✗ Tu n'es pas sur main (branche actuelle : $CUR_BRANCH)."
  echo "  git checkout main && git pull origin main"
  exit 1
fi

# -----------------------------------------------------------------------------
# 2. Inventaire des cibles
# -----------------------------------------------------------------------------
TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_DIR="../humanix-academie-backup-$TIMESTAMP"
REPLACEMENTS_FILE=$(mktemp -t replacements.XXXXXX)

# Patterns de remplacement pour les commit messages.
# Format git-filter-repo : "ancien==>nouveau" (litteral) ou "regex:^…$==>nouveau"
cat > "$REPLACEMENTS_FILE" <<'EOF'
Digital 113==>partenaire externe
digital 113==>partenaire externe
Digital113==>partenaire externe
digital-113==>demo-runbook
demo-digital-113==>demo-runbook
Cyber'Occ==>partenaire externe
Cyber-Occ==>partenaire externe
CyberOcc==>partenaire externe
cyber-occ==>partenaire externe
cyberocc==>partenaire externe
tenant-d113==>tenant-demo
seed-tenant-d113==>seed-tenant-demo
screencast-d113==>screencast-demo
21 mai 2026==>printemps 2026
EOF

# Liste des PRs a renommer si --skip-pr-titles n'est pas pose
declare -a PR_RENAMES
PR_RENAMES=(
  "32|feat(roadmap): roadmap technique printemps 2026 — vishing souverain, MCP server, /comparatif 2026"
  "64|docs(demo): runbook demo + assets fallback (script vishing pre-baked)"
  "74|chore: retirer mentions partenaires non confirmes"
)

# -----------------------------------------------------------------------------
# 3. Affichage du plan
# -----------------------------------------------------------------------------
echo "=================================================================="
echo "  Reecriture d'historique git — humanix-academie"
echo "=================================================================="
echo
echo "Mode      : $([ $APPLY -eq 1 ] && echo "APPLY (destructif)" || echo "DRY-RUN (lecture seule)")"
echo "Backup    : $BACKUP_DIR"
echo "Repo      : $REPO"
echo
echo "Commits qui matchent les patterns dans leur message :"
git log --all --pretty=format:"  %h %s" | grep -iE "digital ?113|cyber.?occ|d113" || echo "  (aucun)"
echo
echo
echo "Patterns de remplacement (commit messages + tree contents) :"
sed 's/^/  /' "$REPLACEMENTS_FILE"
echo
if [ $SKIP_PR_TITLES -eq 0 ]; then
  echo "PRs dont les titres seront renommes :"
  for entry in "${PR_RENAMES[@]}"; do
    pr_num="${entry%%|*}"
    pr_title="${entry#*|}"
    echo "  #$pr_num -> $pr_title"
  done
else
  echo "PRs : --skip-pr-titles, on ne touche pas aux titres GitHub."
fi
echo

if [ $APPLY -eq 0 ]; then
  echo "Dry-run termine. Pour executer reellement :"
  echo "  bash $0 --apply"
  rm -f "$REPLACEMENTS_FILE"
  exit 0
fi

# -----------------------------------------------------------------------------
# 4. Confirmation explicite
# -----------------------------------------------------------------------------
echo "ATTENTION : cette operation est destructive et irreversible."
echo "  - Tous les SHAs vont changer."
echo "  - Les contributeurs devront re-cloner ou rebaser."
echo "  - Backup mirror cree dans : $BACKUP_DIR"
echo
read -r -p "Tape EXACTEMENT 'rewrite history' pour continuer : " CONFIRM
if [ "$CONFIRM" != "rewrite history" ]; then
  echo "Annule."
  rm -f "$REPLACEMENTS_FILE"
  exit 1
fi

# -----------------------------------------------------------------------------
# 5. Backup mirror
# -----------------------------------------------------------------------------
echo
echo "[1/5] Backup mirror -> $BACKUP_DIR"
git clone --mirror "$(git remote get-url origin)" "$BACKUP_DIR"
echo "      Backup OK ($(du -sh "$BACKUP_DIR" | cut -f1))"

# -----------------------------------------------------------------------------
# 6. Filter-repo
# -----------------------------------------------------------------------------
echo
echo "[2/5] git-filter-repo : reecriture des messages + contenu"
git filter-repo \
  --replace-message "$REPLACEMENTS_FILE" \
  --replace-text "$REPLACEMENTS_FILE" \
  --force
echo "      Reecriture OK"

# -----------------------------------------------------------------------------
# 7. Re-attache l'origine (filter-repo la supprime par securite)
# -----------------------------------------------------------------------------
echo
echo "[3/5] Re-attache origin"
ORIGIN_URL=$(git -C "$BACKUP_DIR" config --get remote.origin.url)
git remote add origin "$ORIGIN_URL" || git remote set-url origin "$ORIGIN_URL"
echo "      origin -> $ORIGIN_URL"

# -----------------------------------------------------------------------------
# 8. Force push main / develop / testing
# -----------------------------------------------------------------------------
echo
echo "[4/5] Force push main / develop / testing"
for branch in main develop testing; do
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git push origin "$branch" --force-with-lease
    echo "      $branch pushed"
  else
    echo "      $branch absente localement, skip"
  fi
done

# Tags (si on en a)
if [ -n "$(git tag -l)" ]; then
  git push origin --tags --force
  echo "      tags pushed"
fi

# -----------------------------------------------------------------------------
# 9. Edition des titres de PR via API GitHub
# -----------------------------------------------------------------------------
if [ $SKIP_PR_TITLES -eq 0 ]; then
  echo
  echo "[5/5] Edition des titres PR via API GitHub"
  for entry in "${PR_RENAMES[@]}"; do
    pr_num="${entry%%|*}"
    pr_title="${entry#*|}"
    if gh pr edit "$pr_num" --repo "$REPO" --title "$pr_title" >/dev/null 2>&1; then
      echo "      #$pr_num : titre mis a jour"
    else
      echo "      #$pr_num : echec (PR fermee, supprimee, ou droits insuffisants)"
    fi
  done
else
  echo
  echo "[5/5] Skip edition titres PR (--skip-pr-titles)"
fi

# -----------------------------------------------------------------------------
# 10. Cleanup
# -----------------------------------------------------------------------------
rm -f "$REPLACEMENTS_FILE"
echo
echo "=================================================================="
echo "  Termine."
echo "=================================================================="
echo
echo "Verifications recommandees :"
echo "  git log --all --pretty=format:'%h %s' | grep -i 'digital\\|cyber.occ' | head"
echo "  gh pr list --repo $REPO --state all --search 'digital OR cyber-occ'"
echo
echo "Si quelque chose a mal tourne, restaurer depuis le backup mirror :"
echo "  cd $BACKUP_DIR && git push --mirror $ORIGIN_URL --force"
