#!/bin/sh
set -e

echo ""
echo "  =============================================="
echo "  HumaniX Academy - Demarrage du conteneur"
echo "  =============================================="
echo ""

# Attendre que Postgres soit pret
echo "[1/5] Attente Postgres..."
RETRY=0
until npx prisma db execute --schema=./prisma/schema.prisma --stdin >/dev/null 2>&1 <<EOF
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

# Sync du schema (db push : pas de migration formelle, parfait pour POC)
echo "[2/5] Synchronisation du schema Prisma..."
npx prisma db push --skip-generate --accept-data-loss

# Migrations legacy (idempotentes, no-op apres le 1er passage) :
#   - migrate-legacy-trial.ts : retire l'ancien plan "trial" (pivot vente directe)
#   - migrate-4-tiers-pivot.ts : passe de 5 paliers (decouverte/solo/essentielle/
#     pro/premium) a 3 paliers (starter/pro/enterprise) - pivot mai 2026.
echo "[2.5/5] Migrations legacy plans (idempotentes)..."
npx tsx scripts/migrate-legacy-trial.ts || echo "  -> migrate-legacy-trial ignoree (non bloquante)"
npx tsx scripts/migrate-4-tiers-pivot.ts || echo "  -> migrate-4-tiers-pivot ignoree (non bloquante)"

# Seed du CATALOG partage (saisons + episodes + badges + boutique + tenant
# Communaute) - PROD-SAFE et idempotent (upserts par slug, AUCUN fake user).
# DOIT tourner a CHAQUE deploiement : sinon les nouvelles saisons / badges
# ajoutes au code ne se propagent JAMAIS en BDD de prod (bug modules + badges,
# juin 2026). Le script reevalue aussi les badges des users (retroactif).
echo "[3/5] Seed du catalog partage (saisons, episodes, badges, boutique)..."
npx tsx scripts/seed-catalog.ts || echo "  -> seed-catalog a echoue (non bloquant), relancable via /superadmin/catalog"

# En mode demo UNIQUEMENT : seed des comptes de demonstration (fake users),
# inappropries en prod. seed.ts re-appelle seedCatalog en interne (idempotent).
if [ "$DEMO_MODE" = "true" ]; then
  echo "  -> DEMO_MODE=true, seed des comptes de demonstration"
  npx prisma db seed
fi

# Bootstrap du premier administrateur si la base est vierge.
# Idempotent : se desactive automatiquement des qu'un user existe.
# Variables BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD (cf. .env.example).
echo "[4/5] Bootstrap admin..."
npx tsx scripts/bootstrap-admin.ts || echo "  -> bootstrap-admin a echoue, on continue (l'app peut demarrer)"

# Premier import de l'observatoire des fuites - uniquement si la table est
# vide (pour ne pas re-scraper a chaque redemarrage). Le mode --deep parcourt
# les archives par annee pour construire un historique meaningful.
# Les scrapes suivants sont declenches par le cron externe sur
# /api/cron/breaches-refresh (configure independamment).
echo "[5/5] Observatoire des fuites - premier import si necessaire..."
HAS_BREACHES=$(npx tsx -e "
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
  timeout 180 npx tsx scripts/scrape-breaches.ts --deep \
    || echo "  -> Import partiel ou echec reseau, reessai au prochain cron"
fi

echo ""
echo "  =============================================="
echo "  Pret. Ouvre http://localhost:3000/demo"
echo "  =============================================="
echo ""

# Demarrage Next.js
exec npx next start -H 0.0.0.0 -p 3000
