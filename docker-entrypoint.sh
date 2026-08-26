#!/bin/sh
set -e

# Les binaires sont appeles par leur CHEMIN, pas par `npx`.
#
# `npx` appartient a npm, et npm n'est plus dans l'image d'execution : ses
# dependances embarquees portaient a elles seules les 8 dernieres CVE de
# l'image publiee (tar, sigstore, brace-expansion, ip-address, tinyglobby).
# Aucune ne venait de nos dependances a nous, et aucune n'etait corrigeable
# autrement qu'en changeant d'image de base -- ou en retirant npm.
#
# `npx prisma` ne faisait de toute facon que resoudre ./node_modules/.bin/prisma.
# L'appeler directement supprime un intermediaire, et le demarrage y gagne.

echo ""
echo "  =============================================="
echo "  HumaniX Academy - Demarrage du conteneur"
echo "  =============================================="
echo ""

# Attendre que Postgres soit pret. Appelee dans les deux modes : meme un
# conteneur qui ne prepare rien a besoin d'une base joignable.
attendre_postgres() {
echo "[1/5] Attente Postgres..."
RETRY=0
until ./node_modules/.bin/prisma db execute --schema=./prisma/schema.prisma --stdin >/dev/null 2>&1 <<EOF
SELECT 1;
EOF
do
  RETRY=$((RETRY+1))
  if [ $RETRY -gt 30 ]; then
    echo "  -> Timeout attente Postgres (verifie DATABASE_URL)"
    exit 1
  fi
  sleep 1
done
echo "  -> Postgres pret"
}

# -----------------------------------------------------------------------------
# PREPARATION : tout ce qui mute l'etat PARTAGE (schema + donnees communes).
#
# POURQUOI C'EST ISOLE
#
#   Une livraison sans coupure fait tourner DEUX versions de l'application en
#   meme temps, le temps de basculer le trafic. Si chaque conteneur executait
#   `prisma db push --accept-data-loss` a son demarrage, la nouvelle version
#   modifierait le schema pendant que l'ancienne sert encore : un renommage ou
#   une suppression de colonne la casserait instantanement, sans rien demander.
#
#   Ces etapes s'executent donc UNE FOIS, avant la bascule.
#
# COMMENT L'APPELER
#
#   docker-entrypoint.sh preparer      execute la preparation puis sort.
#                                      C'est ce que fait scripts/deploy.sh.
#
#   HUMANIX_PREPARER_AU_DEMARRAGE=false
#                                      le demarrage ne prepare plus rien et va
#                                      directement a Next.js.
#
#   Par DEFAUT la preparation reste faite au demarrage : une installation
#   auto-hebergee (Community Edition) doit continuer a marcher avec un simple
#   `compose up`, sans etape supplementaire a connaitre.
# -----------------------------------------------------------------------------
preparer_etat_partage() {
  # Sync du schema (db push : pas de migration formelle, parfait pour POC)
  echo "[2/5] Synchronisation du schema Prisma..."
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

  # Migrations legacy (idempotentes, no-op apres le 1er passage) :
  #   - migrate-legacy-trial.ts : retire l'ancien plan "trial" (pivot vente directe)
  #   - migrate-4-tiers-pivot.ts : passe de 5 paliers (decouverte/solo/essentielle/
  #     pro/premium) a 3 paliers (starter/pro/enterprise) - pivot mai 2026.
  echo "[2.5/5] Migrations legacy plans (idempotentes)..."
  node dist-scripts/scripts/migrate-legacy-trial.mjs || echo "  -> migrate-legacy-trial ignoree (non bloquante)"
  node dist-scripts/scripts/migrate-4-tiers-pivot.mjs || echo "  -> migrate-4-tiers-pivot ignoree (non bloquante)"

  # Seed du CATALOG partage (saisons + episodes + badges + boutique + tenant
  # Communaute) - PROD-SAFE et idempotent (upserts par slug, AUCUN fake user).
  # DOIT tourner a CHAQUE deploiement : sinon les nouvelles saisons / badges
  # ajoutes au code ne se propagent JAMAIS en BDD de prod (bug modules + badges,
  # juin 2026). Le script reevalue aussi les badges des users (retroactif).
  echo "[3/5] Seed du catalog partage (saisons, episodes, badges, boutique)..."
  node dist-scripts/scripts/seed-catalog.mjs || echo "  -> seed-catalog a echoue (non bloquant), relancable via /superadmin/catalog"

  # En mode demo UNIQUEMENT : seed des comptes de demonstration (fake users),
  # inappropries en prod. seed.ts re-appelle seedCatalog en interne (idempotent).
  if [ "$DEMO_MODE" = "true" ]; then
    echo "  -> DEMO_MODE=true, seed des comptes de demonstration"
    ./node_modules/.bin/prisma db seed
  fi

  # Bootstrap du premier administrateur si la base est vierge.
  # Idempotent : se desactive automatiquement des qu'un user existe.
  # Variables BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD (cf. .env.example).
  echo "[4/5] Bootstrap admin..."
  node dist-scripts/scripts/bootstrap-admin.mjs || echo "  -> bootstrap-admin a echoue, on continue (l'app peut demarrer)"

  # Premier import de l'observatoire des fuites - uniquement si la table est
  # vide (pour ne pas re-scraper a chaque redemarrage). Le mode --deep parcourt
  # les archives par annee pour construire un historique meaningful.
  # Les scrapes suivants sont declenches par le cron externe sur
  # /api/cron/breaches-refresh (configure independamment).
  echo "[5/5] Observatoire des fuites - premier import si necessaire..."
  HAS_BREACHES=$(node --input-type=module -e "
  import { PrismaClient } from '@prisma/client';
  const p = new PrismaClient();
  p.dataBreach.count()
    .then((n) => { console.log(n > 0 ? 'yes' : 'no'); return p.\$disconnect(); })
    .catch(() => { console.log('no'); return p.\$disconnect(); });
  " 2>/dev/null | tail -n 1)

  if [ "$HAS_BREACHES" = "yes" ]; then
    echo "  -> Table DataBreach deja peuplee, skip de l'import initial"
  else
    echo "  -> Table DataBreach vide, import deep en cours (peut prendre 1-2 min)..."
    # Timeout 180s pour ne pas bloquer le demarrage si une source est lente.
    # En cas d'echec partiel, le cron externe rattrapera au prochain run.
    timeout 180 node dist-scripts/scripts/scrape-breaches.mjs --deep \
      || echo "  -> Import partiel ou echec reseau, reessai au prochain cron"
  fi
}

# -----------------------------------------------------------------------------
# GARDE : la base correspond-elle au schema du code ?
#
# POURQUOI
#
#   Depuis que la preparation est sortie du demarrage, le conteneur SUPPOSE que
#   quelqu'un l'a faite. Si l'etape de deploiement ne s'execute pas -- script
#   pas encore a jour, erreur avalee, lancement manuel oublie -- l'application
#   demarre quand meme et repond normalement, contre une base non migree.
#
#   C'est arrive le 2026-08-19 : un deploiement complet n'a rien prepare, et
#   rien ne l'a signale. Le service etait « healthy ». Ce jour-la le schema
#   n'avait pas change, donc sans consequence. La fois suivante, non.
#
#   Un service qui repond faux est pire qu'un service qui refuse de demarrer.
#
# COMMENT
#
#   `prisma migrate diff` compare la base VIVANTE (--from-schema-datasource,
#   qui lit l'URL du datasource) au schema du CODE (--to-schema-datamodel).
#   Avec --exit-code : 0 = en phase, 2 = derive, 1 = erreur de l'outil.
#
# QUE FAIRE EN CAS DE DERIVE
#
#   Pas de contournement dedie, et c'est deliberé : la sortie de secours est
#   HUMANIX_PREPARER_AU_DEMARRAGE=true, qui fait preparer le conteneur
#   lui-meme. C'est la vraie correction, pas un interrupteur qui masque.
# -----------------------------------------------------------------------------
verifier_schema() {
  echo "[garde] Verification : la base correspond-elle au schema du code ?"
  ./node_modules/.bin/prisma migrate diff \
    --from-schema-datasource ./prisma/schema.prisma \
    --to-schema-datamodel ./prisma/schema.prisma \
    --exit-code >/dev/null 2>&1
  code=$?

  if [ "$code" -eq 0 ]; then
    echo "  -> base en phase avec le schema."
    return 0
  fi

  if [ "$code" -eq 2 ]; then
    echo ""
    echo "  =============================================="
    echo "  DEMARRAGE REFUSE : la base ne correspond pas au schema du code."
    echo "  =============================================="
    echo ""
    echo "  La preparation n'a pas ete faite pour cette version."
    echo ""
    echo "  Corriger :   ./scripts/deploy.sh <demo|prod>"
    echo "  Ou seul  :   compose run --rm --no-deps app preparer"
    echo ""
    echo "  En dernier recours, poser HUMANIX_PREPARER_AU_DEMARRAGE=true :"
    echo "  le conteneur preparera lui-meme au demarrage."
    echo ""
    exit 1
  fi

  # Code 1 : l'outil n'a pas su repondre. On NE bloque PAS.
  #
  # Un signal ambigu ne doit pas coucher un service sain -- une base
  # momentanement lente au demarrage suffirait a rendre le conteneur
  # inredemarrable, y compris apres un reboot. On demarre, en le disant fort.
  echo "  -> AVERTISSEMENT : verification impossible (code $code)."
  echo "     Le demarrage continue, mais la conformite du schema n'est PAS etablie."
  return 0
}

if [ "$1" = "preparer" ]; then
  attendre_postgres
  preparer_etat_partage
  echo ""
  echo "  Preparation terminee. Le conteneur applicatif peut demarrer."
  exit 0
fi

attendre_postgres

if [ "$HUMANIX_PREPARER_AU_DEMARRAGE" = "false" ]; then
  echo "[preparation] Ignoree : HUMANIX_PREPARER_AU_DEMARRAGE=false."
  echo "              Le schema et les donnees partagees sont supposes deja a jour"
  echo "              (cf. l'etape de preparation de scripts/deploy.sh)."
  # « Supposes » ne suffit pas : on verifie.
  verifier_schema
else
  preparer_etat_partage
fi

# L'URL annoncee suit la configuration au lieu de la supposer.
#
# Cette ligne disait « /demo » EN TOUTES CIRCONSTANCES, production comprise.
# C'est la premiere chose qu'on lit dans les journaux d'un conteneur, et un
# journal de production qui se presente comme la demo trompe celui qui le lit
# sous pression. Meme famille que le docker-compose.yml de prod derive du
# gabarit de la demo.
#
# `if` explicite et non `[ ... ] && ...` : sous `set -e`, un test faux en tete
# d'une liste && fait sortir le script.
BASE_AFFICHEE="${NEXT_PUBLIC_APP_URL:-${AUTH_URL:-http://localhost:3000}}"
BASE_AFFICHEE="${BASE_AFFICHEE%/}"
if [ "$DEMO_MODE" = "true" ]; then
  BASE_AFFICHEE="$BASE_AFFICHEE/demo"
fi

echo ""
echo "  =============================================="
echo "  Pret. Ouvre $BASE_AFFICHEE"
echo "  =============================================="
echo ""

# Demarrage Next.js
exec ./node_modules/.bin/next start -H 0.0.0.0 -p 3000
