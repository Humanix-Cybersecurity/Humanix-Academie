#!/usr/bin/env bash
# =============================================================================
# init-git-local.sh — Initialisation propre du repo Humanix Académie en local.
# =============================================================================
#
# À exécuter UNE SEULE FOIS, depuis ton terminal macOS natif (pas depuis
# l'environnement sandbox de Cowork qui ne supporte pas tous les unlink git).
#
# Usage :
#   cd "/Users/meg4r0m/Documents/Claude/Projects/Solution Gouvernance/humanix-academie"
#   chmod +x init-git-local.sh
#   ./init-git-local.sh
#
# Ce script :
#   1. Nettoie tout .git/ existant (état intermédiaire potentiellement laissé)
#   2. Initialise un repo git propre sur la branche main
#   3. Configure ton identité (Florian Durano <psykoterro@gmail.com>) en LOCAL
#      au repo (n'affecte pas tes autres projets git)
#   4. Vérifie que node_modules est bien ignoré
#   5. Stage tous les fichiers tracked
#   6. Crée le premier commit avec message structuré
#   7. Affiche un récap final
#
# Aucun push GitHub n'est effectué — c'est volontaire (cf. consigne).
# =============================================================================

set -euo pipefail

# Couleurs
G='\033[0;32m'  # green
Y='\033[1;33m'  # yellow
R='\033[0;31m'  # red
B='\033[0;34m'  # blue
N='\033[0m'     # reset

# Vérification : on est bien dans le bon dossier
if [ ! -f "package.json" ] || [ ! -f ".gitignore" ]; then
  echo -e "${R}✗ Erreur : ce script doit être lancé depuis le dossier humanix-academie/${N}"
  echo "  Tu es actuellement dans : $(pwd)"
  exit 1
fi

echo -e "${B}=== Initialisation du repo git Humanix Académie ===${N}"
echo ""

# -----------------------------------------------------------------------------
# 1. Nettoyage du .git/ existant (au cas où une init partielle ait été faite)
# -----------------------------------------------------------------------------
if [ -d ".git" ]; then
  echo -e "${Y}⚠ .git/ existant détecté → suppression pour repartir propre${N}"
  rm -rf .git
  echo -e "${G}✓ .git/ supprimé${N}"
else
  echo -e "${G}✓ Pas de .git/ existant${N}"
fi
echo ""

# -----------------------------------------------------------------------------
# 2. Init git sur la branche main
# -----------------------------------------------------------------------------
git init -b main
echo ""

# -----------------------------------------------------------------------------
# 3. Configuration LOCALE (ce repo seulement)
# -----------------------------------------------------------------------------
git config user.name "Florian Durano"
git config user.email "psykoterro@gmail.com"
echo -e "${G}✓ Identité git locale : Florian Durano <psykoterro@gmail.com>${N}"
echo "  (Pour modifier : git config user.name 'Autre Nom')"
echo ""

# -----------------------------------------------------------------------------
# 4. Vérification que node_modules sera bien ignoré
# -----------------------------------------------------------------------------
echo -e "${B}--- Vérification gitignore ---${N}"
if git check-ignore -q node_modules/; then
  echo -e "${G}✓ node_modules/ correctement ignoré${N}"
else
  echo -e "${R}✗ node_modules/ N'EST PAS ignoré ! Vérifie .gitignore${N}"
  exit 1
fi

if [ -f ".env" ]; then
  if git check-ignore -q .env; then
    echo -e "${G}✓ .env correctement ignoré${N}"
  else
    echo -e "${R}✗ .env présent et NON ignoré ! Risque secret leak. Vérifie .gitignore${N}"
    exit 1
  fi
fi
echo ""

# -----------------------------------------------------------------------------
# 5. Stage tous les fichiers (sauf ceux ignorés)
# -----------------------------------------------------------------------------
echo -e "${B}--- Staging des fichiers ---${N}"
git add .
STAGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
echo -e "${G}✓ ${STAGED_COUNT} fichiers stagés${N}"

# Vérification finale : aucun node_modules dans le staging
if git diff --cached --name-only | grep -q "node_modules"; then
  echo -e "${R}✗ ALERTE : des fichiers node_modules sont dans le staging !${N}"
  echo "  Annulation. Vérifie ton .gitignore."
  git reset
  exit 1
fi
echo -e "${G}✓ Aucun fichier node_modules staged${N}"
echo ""

# -----------------------------------------------------------------------------
# 6. Premier commit
# -----------------------------------------------------------------------------
echo -e "${B}--- Création du premier commit ---${N}"
git commit -m "chore: initial commit — Humanix Académie v1 (Sprint 1+2 livré)

Application complète prête pour le launch OSS du 26 mai 2026.

== STACK TECHNIQUE ==

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL multi-tenant
- NextAuth.js (auth + RBAC + plan-gating à 6 paliers)
- Recharts (dashboards interactifs)
- Docker + docker-compose + Caddy (reverse proxy TLS auto)

== FONCTIONNALITES PRINCIPALES ==

- Plateforme de cybersensibilisation gamifiée (5 modules de base)
- Console dirigeant 'SOC moderne' avec actions recommandées auto
- Multi-tenant avec 6 paliers : Community / Découverte / Starter / Essentielle / Pro / Enterprise
- Marketplace de modules (officiels + contributeurs)
- Mascotte évolutive Hex
- Pack NIS2 + connecteur natif CISO Assistant (intuitem)
- API REST + webhooks signés HMAC-SHA256
- Format OSCAL v1.1.2 + CEF (Sentinel/Splunk/Sekoia/QRadar)
- Démo locale via DEMO_MODE=true
- 9 features avec plan-gating granulaire

== SPRINT 1 — PIVOT TARIFICATION VOLUME ==

- Refonte lib/pricing.ts : 6 paliers (Community gratuit + Découverte forever-free + 4 cloud)
- Refonte lib/plans.ts : ajout palier 'decouverte', 4 nouvelles features (marketplace, sso_enterprise, multi_site, white_label)
- Refonte UI /tarifs (3 colonnes responsive, badges contextuels)
- Refonte UI /comparatif (ajout ligne 'Code source ouvert' qui win face aux 4 concurrents)
- Harmonisation nommage dans toutes les pages : Solo TPE→Starter, Premium→Enterprise
- Tarifs -40 à -60% vs grille initiale (volume > rente)
- Page accueil + cgv + famille + demo + audit-flash alignés

== SPRINT 2A — GOUVERNANCE OSS RACINE ==

- LICENSE : GNU AGPLv3 officiel (téléchargé depuis gnu.org, sha256 vérifiable)
- COPYRIGHT : Humanix Cybersecurity 2026 + clause trademark
- README.md : refonte vitrine OSS publique (224 lignes)
- CONTRIBUTING.md : guide complet (setup, workflow, conventions, DCO, programme Maintainer)
- CODE_OF_CONDUCT.md : Contributor Covenant 2.1
- SECURITY.md : disclosure responsable, SLA par sévérité CVSS, Hall of Fame

== SPRINT 2B — TEMPLATES + CI + DOCS + AUDITS ==

- .github/ISSUE_TEMPLATE/ : bug_report + feature_request + config.yml (redirect Discussions/SECURITY)
- .github/PULL_REQUEST_TEMPLATE.md : checklist DCO, conventions, tests
- .github/workflows/ci.yml : 5 jobs (lint, build, npm audit, prettier, vérification DCO)
- .github/workflows/codeql.yml : SAST GitHub natif (push + PR + scan hebdo)
- docs/installation.md : Docker + bare-metal + Kubernetes + durcissement production
- docs/configuration.md : référence complète variables d'env (11 sections, 30+ vars)
- docs/upgrade.md : SemVer + backup + rollback + Watchtower
- docs/faq.md : 20 questions répondues (licence, self-host vs cloud, sécu, perfs)
- docs/LICENSES_AUDIT.md : audit 549 deps, zéro incompat AGPL
- .env.example : enrichi 11 sections, 30+ variables documentées
- package.json : ajout license AGPL-3.0-or-later, repository, bugs, author, keywords

== STRATEGIE / BUSINESS / ROADMAP ==

Documents stratégiques hors repo (workspace amont) :
00_Business_Strategie/05_Pivot_OSS_Mai_2026/
  - 00_PLAN_MAI_2026.md (4 sprints jusqu'au launch)
  - 01_STRATEGIE_PIVOT_OSS.md (modèle économique service-led)
  - 02_MANIFESTE_OSS.md (post LinkedIn + blog + 5 templates DM)
  - 03_AMBASSADEURS_TEMPLATE.md (canevas à remplir)
  - 04_DEMO_PUBLIQUE_SPEC.md (architecture Scaleway)
  - 05_PRICING_VOLUME.md (justification + projection CA)

== LAUNCH ==

Pivot OSS prévu : mardi 26 mai 2026 (J-Day).
Licence : AGPLv3 (appliquée).
Repo public cible : github.com/humanix-cybersecurity/humanix-academie."

echo ""

# -----------------------------------------------------------------------------
# 7. Récap final
# -----------------------------------------------------------------------------
echo -e "${B}=== Récap final ===${N}"
echo ""
echo -e "Branche       : ${G}$(git branch --show-current)${N}"
echo -e "Commits       : ${G}$(git rev-list --count HEAD)${N}"
echo -e "Fichiers      : ${G}$(git ls-files | wc -l | tr -d ' ')${N}"
echo -e "Auteur local  : ${G}$(git config user.name) <$(git config user.email)>${N}"
echo ""
echo -e "${G}✓ Repo initialisé avec succès${N}"
echo ""
echo -e "${Y}⚠ Aucun remote configuré — c'est voulu.${N}"
echo "  Quand tu seras prêt à pousser sur GitHub (Sprint 4) :"
echo "    git remote add origin git@github.com:humanix-cybersecurity/humanix-academie.git"
echo "    git push -u origin main"
echo ""
echo -e "${B}Prochaines actions recommandées :${N}"
echo "  1. Vérifie que tout est OK : ${B}git log --oneline${N}"
echo "  2. Vérifie l'état       : ${B}git status${N}"
echo "  3. Supprime ce script (ou le commit) si tu veux : ${B}rm init-git-local.sh${N}"
echo ""
echo -e "${B}Note : ce script lui-même est dans le commit.${N}"
echo "  Pour le retirer du tracking sans le supprimer du disque :"
echo "    git rm --cached init-git-local.sh && git commit -m 'chore: remove init script'"
echo ""
