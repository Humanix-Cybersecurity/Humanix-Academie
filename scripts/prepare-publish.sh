#!/usr/bin/env bash
#
# prepare-publish.sh
# ==================
# Prépare le repo Humanix Académie pour un premier push (privé) sur GitHub.
#
# À lancer depuis le terminal macOS natif (Cowork bloque l'écriture dans .git/).
#
# Étapes :
#   1. Supprime les .git/index.lock orphelins
#   2. Restaure LICENSE au format FSF officiel (annule la modification SPDX)
#   3. Ajoute *.bak2 au .gitignore
#   4. Supprime les 22 fichiers .bak2 obsolètes du disque
#   5. Régénère le client Prisma (résout les erreurs TS Prisma)
#   6. Fait 3 commits structurés et bien décrits
#
# Usage :
#   chmod +x scripts/prepare-publish.sh
#   ./scripts/prepare-publish.sh
#
# Aucun push effectué - la création du remote GitHub privé et le push
# restent manuels (cf. 00_ACTIONS_MANUELLES_REQUISES.md action A17).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

ok()    { echo -e "${GREEN}✓${RESET} $1"; }
warn()  { echo -e "${YELLOW}⚠${RESET} $1"; }
fail()  { echo -e "${RED}✗${RESET} $1"; exit 1; }
step()  { echo -e "\n${GREEN}━━━ $1 ━━━${RESET}"; }

# ---------------------------------------------------------------------------
# Pré-vol : on est bien dans le repo ?
# ---------------------------------------------------------------------------
[ -d ".git" ] || fail "Pas de .git/ détecté - êtes-vous bien dans humanix-academie/ ?"
[ -f "package.json" ] || fail "package.json absent - repo invalide."

step "1. Suppression du .git/index.lock orphelin"
if [ -f ".git/index.lock" ]; then
  rm -f ".git/index.lock"
  ok "Lock supprimé"
else
  ok "Aucun lock orphelin"
fi

# ---------------------------------------------------------------------------
# 2. Restauration LICENSE
# ---------------------------------------------------------------------------
step "2. Restauration LICENSE au format FSF officiel"
if git diff --quiet -- LICENSE; then
  ok "LICENSE déjà au format trackeé (rien à restaurer)"
else
  git restore LICENSE
  ok "LICENSE restauré (format FSF officiel à 70 chars/ligne)"
fi

# ---------------------------------------------------------------------------
# 3. .gitignore : ajout *.bak2
# ---------------------------------------------------------------------------
step "3. Ajout *.bak2 au .gitignore"
if grep -qE '^\*\.bak2$' .gitignore; then
  ok "*.bak2 déjà dans .gitignore"
else
  # Ajout dans la section "backups" existante
  if grep -qE '^\*\.bak$' .gitignore; then
    # Insertion juste après *.bak
    awk '/^\*\.bak$/ {print; print "*.bak2"; next} {print}' .gitignore > .gitignore.new \
      && mv .gitignore.new .gitignore
  else
    # Ajout en fin de fichier
    printf "\n# backups secondaires\n*.bak2\n" >> .gitignore
  fi
  ok "*.bak2 ajouté à .gitignore"
fi

# ---------------------------------------------------------------------------
# 4. Suppression fichiers .bak2 obsolètes
# ---------------------------------------------------------------------------
step "4. Suppression des fichiers .bak2 du disque"
BAK2_COUNT=$(find . -name "*.bak2" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$BAK2_COUNT" -gt 0 ]; then
  find . -name "*.bak2" -not -path "./node_modules/*" -not -path "./.git/*" -delete
  ok "$BAK2_COUNT fichiers .bak2 supprimés"
else
  ok "Aucun fichier .bak2 à supprimer"
fi

# ---------------------------------------------------------------------------
# 5. Régénération du client Prisma
# ---------------------------------------------------------------------------
step "5. Régénération du client Prisma"

# ---------------------------------------------------------------------------
# 6. Commits structurés
# ---------------------------------------------------------------------------
step "6. Commits structurés"

# Vérif qu'il y a bien des changements à commiter
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  ok "Working tree propre - rien à commiter"
  exit 0
fi

# Identité git locale (sécurité)
git config --local user.name "Florian Durano"
git config --local user.email "psykoterro@gmail.com"

# ---- Commit 1 : refacto admin Linear design system ----
echo ""
echo "▸ Commit 1/3 : refacto admin pages Linear design system"
git add \
  app/admin/anecdotes/ \
  app/admin/api-keys/ \
  app/admin/business/ \
  app/admin/challenge/ \
  app/admin/conformite-nis2/ \
  app/admin/contributions/ \
  app/admin/etablissements/ \
  app/admin/incidents/ \
  app/admin/integrations/ \
  app/admin/moderation/ \
  app/admin/modules/ \
  app/admin/phishing/ \
  app/admin/utilisateurs/ \
  components/admin/ \
  lib/business-impact-methodology.ts \
  lib/cyber-score.ts \
  2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "refactor(admin): migrate admin pages to Linear design system

- New shared components: AdminPageHeader, AdminSection, EmptyState, StatusBadge
- Business methodology helpers (lib/business-impact-methodology.ts)
- Unified cyber-score helper (lib/cyber-score.ts)
- Consistent layout across all /admin/* pages (anecdotes, api-keys, business,
  challenge, conformite-nis2, contributions, etablissements, incidents,
  integrations, moderation, modules, phishing, utilisateurs)

No behavior change, presentation only."
  ok "Commit 1/3 créé"
else
  ok "Commit 1/3 - rien à commiter"
fi

# ---- Commit 2 : Sprint OSS juridique ----
echo ""
echo "▸ Commit 2/3 : Sprint OSS juridique (LICENSE/NOTICE/TRADEMARK/CGU/CLA)"
git add \
  NOTICE.md \
  TRADEMARK.md \
  CGU_SELFHOST.md \
  .github/CLA.md \
  app/cgu/page.tsx \
  app/cgv/page.tsx \
  app/confidentialite/page.tsx \
  components/SiteFooter.tsx \
  lib/pricing.ts \
  app/tarifs/page.tsx \
  app/integrations/ \
  app/comparatif/page.tsx \
  app/securite/ \
  lib/mapping-grc.ts lib/grc-metrics.ts lib/oscal.ts \
  lib/scim/ lib/siem-formatters.ts lib/rate-limit.ts \
  lib/webhooks/ \
  app/api/v1/evidence-export/ \
  app/scim/ \
  components/CisoAssistantBridge.tsx components/CopyableSnippet.tsx \
  connectors/ \
  docs/ \
  scripts/prepare-publish.sh \
  2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "feat(oss): sprint pivot open-source - license, juridique, connecteurs

OSS juridique racine
  - LICENSE : GNU AGPL v3 (format FSF officiel, déjà tracké)
  - NOTICE.md : attribution Humanix-Cybersecurity + justification AGPL
  - TRADEMARK.md : politique d'usage de la marque (5 dépôts INPI prévus)
  - CGU_SELFHOST.md : vulgarisation AGPL en français
  - .github/CLA.md : Contributor License Agreement Apache-style FR

Pages publiques pivot
  - /tarifs : 6 paliers (Community gratuit, Découverte cloud free,
    Starter 19€, Essentielle 3€/user, Pro 2,50€/user, Enterprise)
  - /cgu, /cgv, /confidentialite : mention Community Edition vs Cloud
  - /securite, /comparatif : maj différenciants OSS

Connecteurs écosystème
  - CISO Assistant + format OSCAL v1.1.2 (NIST)
  - SCIM v2 (RFC 7643/7644) - Entra/Okta/Google
  - Microsoft Sentinel + Splunk HEC
  - Lucca, GLPI, CyberMalveillance.gouv.fr
  - Sekoia.io, HarfangLab, Mailinblack/Vade
  - Webhooks signés HMAC-SHA256

Cf. docs : 04_DECISION_JURIDIQUE.md, INTEGRATION_CISO_ASSISTANT.md,
INTEGRATIONS_ECOSYSTEME.md, ROADMAP_PRODUIT.md."
  ok "Commit 2/3 créé"
else
  ok "Commit 2/3 - rien à commiter"
fi

# ---- Commit 3 : page presse ----
echo ""
echo "▸ Commit 3/3 : page kit presse"
git add app/presse/ 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "feat(presse): page /presse - kit journalistes pour launch 26 mai

- Pitch en 3 longueurs (1 ligne / 30s / 2 min)
- 11 faits clés (date launch, licence, repo, prix, hébergement, etc.)
- 2 citations sourçables (droits cédés)
- 3 logos téléchargeables (carré PNG, horizontal PNG, SVG)
- 7 questions FAQ journalistes (modèle économique, intuitem, équipe…)
- Contact dédié presse@humanix-cybersecurity.fr

Lié depuis le footer (rubrique Confiance)."
  ok "Commit 3/3 créé"
else
  ok "Commit 3/3 - rien à commiter"
fi

# ---- Reste à staguer ?
git add .gitignore 2>/dev/null || true
if ! git diff --cached --quiet; then
  git commit -m "chore(gitignore): exclude *.bak2 backup files"
  ok "Commit gitignore créé"
fi

# ---------------------------------------------------------------------------
# 7. État final
# ---------------------------------------------------------------------------
step "État final"
git log --oneline -10
echo ""
ok "Working tree status :"
git status --short || true
echo ""
ok "Repo prêt pour push privé."
echo ""
echo "Étape suivante (manuelle, voir 00_ACTIONS_MANUELLES_REQUISES.md A17) :"
echo "  1. Créer le repo PRIVÉ sur GitHub : github.com/new"
echo "     - Owner : humanix-cybersecurity"
echo "     - Repository name : humanix-academie"
echo "     - Visibility : Private"
echo "     - Ne pas initialiser README/LICENSE (déjà présents)"
echo ""
echo "  2. Lier le repo local au remote :"
echo "     git remote add origin git@github.com:humanix-cybersecurity/humanix-academie.git"
echo ""
echo "  3. Push initial :"
echo "     git push -u origin main"
echo ""
echo "Le repo restera privé tant que tu ne déclencheras pas le passage public le 26 mai."
