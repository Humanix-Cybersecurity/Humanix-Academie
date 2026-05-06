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

# Seed (idempotent grace aux upserts) — uniquement en mode demo, pour ne pas
# polluer une vraie base prod avec les fake users de demonstration.
echo "[3/5] Seed initial..."
if [ "$DEMO_MODE" = "true" ]; then
  echo "  -> DEMO_MODE=true, seed des comptes de demonstration"
  npx prisma db seed
else
  echo "  -> DEMO_MODE=false, skip du seed (les fake users seraient inappropries en prod)"
fi

# Bootstrap du premier administrateur si la base est vierge.
# Idempotent : se desactive automatiquement des qu'un user existe.
# Variables BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD (cf. .env.example).
echo "[4/5] Bootstrap admin..."
npx tsx scripts/bootstrap-admin.ts || echo "  -> bootstrap-admin a echoue, on continue (l'app peut demarrer)"

# Premier import de l'observatoire des fuites — uniquement si la table est
# vide (pour ne pas re-scraper a chaque redemarrage). Le mode --deep parcourt
# les archives par annee pour construire un historique meaningful.
# Les scrapes suivants sont declenches par le cron externe sur
# /api/cron/breaches-refresh (configure independamment).
echo "[5/5] Observatoire des fuites — premier import si necessaire..."
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
