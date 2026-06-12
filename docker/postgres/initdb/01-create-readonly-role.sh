#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Script d'init Postgres execute UNE FOIS au premier boot du container.
# Cree le role `humanix_readonly` (least privilege) + l'utilisateur de
# connection `humanix_ro_user` avec le password fourni via env var.
#
# L'image officielle postgres:16-alpine execute automatiquement TOUS
# les scripts dans /docker-entrypoint-initdb.d/ a la creation initiale
# de la base. Ordre : alphabetique. Ce script tourne avant que Prisma
# ne crée les tables (qui n'existent pas encore).
#
# POURQUOI un script .sh ET PAS un .sql :
# On a besoin de l'interpolation $POSTGRES_READONLY_PASSWORD depuis l'env.
# Un .sql brut ne peut pas faire ca, mais un .sh peut substituer puis
# pipe vers psql.

set -euo pipefail

if [[ -z "${POSTGRES_READONLY_PASSWORD:-}" ]]; then
  echo "[init-readonly-role] WARNING : POSTGRES_READONLY_PASSWORD non defini."
  echo "[init-readonly-role] Le role humanix_ro_user ne sera PAS cree (login impossible)."
  echo "[init-readonly-role] Pour activer Least Privilege : ajoute la variable et re-init la base."
  exit 0
fi

if [[ ${#POSTGRES_READONLY_PASSWORD} -lt 16 ]]; then
  echo "[init-readonly-role] ERREUR : POSTGRES_READONLY_PASSWORD doit faire au moins 16 caracteres."
  echo "[init-readonly-role] Genere : openssl rand -base64 32"
  exit 1
fi

echo "[init-readonly-role] Creation du role humanix_readonly + humanix_ro_user..."

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<-EOSQL
  -- =============================================================
  -- 1. Role groupe READ-ONLY (NOLOGIN, herite par les users)
  -- =============================================================
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'humanix_readonly') THEN
      CREATE ROLE humanix_readonly
        NOLOGIN
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION;
    END IF;
  END
  \$\$;

  -- =============================================================
  -- 2. Permissions au niveau base et schema public
  -- =============================================================
  GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO humanix_readonly;
  GRANT USAGE ON SCHEMA public TO humanix_readonly;

  -- =============================================================
  -- 3. ALTER DEFAULT PRIVILEGES - couvre TOUTES les futures tables
  --    qui seront creees par Prisma (db push / migration deploy).
  --    Critique : sans cette ligne, le ro_user ne verrait rien.
  -- =============================================================
  -- On scope au role qui CREE les tables (POSTGRES_USER = humanix).
  ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
    GRANT SELECT ON TABLES TO humanix_readonly;
  ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO humanix_readonly;
EOSQL

# Le password contient des caracteres potentiellement speciaux pour SQL
# (', ", \, ;). On echappe les apostrophes en doublant ('foo's' -> 'foo''s')
# pour empecher toute SQL injection si l'env est manipulee, puis on
# interpole dans le SQL en single-quoted.
RO_PWD_ESCAPED="${POSTGRES_READONLY_PASSWORD//\'/\'\'}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<EOSQL
  -- =============================================================
  -- 4. Utilisateur de connection humanix_ro_user
  --    LOGIN + heritage du role humanix_readonly (donc SELECT-only)
  --
  -- Note : on utilise EXECUTE pour pouvoir parametrer le password.
  -- Le password est echappe cote Bash (doublement des apostrophes)
  -- avant interpolation. C'est equivalent au quoting de psql.
  -- =============================================================
  DO \$do\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'humanix_ro_user') THEN
      EXECUTE 'CREATE ROLE humanix_ro_user LOGIN PASSWORD ''${RO_PWD_ESCAPED}'' INHERIT';
    ELSE
      EXECUTE 'ALTER ROLE humanix_ro_user PASSWORD ''${RO_PWD_ESCAPED}''';
    END IF;
  END
  \$do\$;

  GRANT humanix_readonly TO humanix_ro_user;
EOSQL

echo "[init-readonly-role] OK - humanix_ro_user cree."
echo "[init-readonly-role] URL de connection :"
echo "  postgresql://humanix_ro_user:***@$(hostname)/$POSTGRES_DB"
echo "[init-readonly-role] Apres le 1er prisma db push, applique les REVOKE chirurgicaux :"
echo "  psql \"\$DATABASE_URL\" < prisma/sql/post-migration-grants.sql"
