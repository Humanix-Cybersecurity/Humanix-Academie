#!/bin/sh
set -e

echo ""
echo "  =============================================="
echo "  HumaniX Academy - Demarrage du conteneur"
echo "  =============================================="
echo ""

# Attendre que Postgres soit pret
echo "[1/3] Attente Postgres..."
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
echo "[2/3] Synchronisation du schema Prisma..."
npx prisma db push --skip-generate --accept-data-loss

# Seed (idempotent grace aux upserts)
echo "[3/3] Seed des donnees de demo..."
npx prisma db seed

echo ""
echo "  =============================================="
echo "  Pret. Ouvre http://localhost:3000/demo"
echo "  =============================================="
echo ""

# Demarrage Next.js
exec npx next start -H 0.0.0.0 -p 3000
