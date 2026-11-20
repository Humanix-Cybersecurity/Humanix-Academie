# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Image Postgres custom Humanix - preconfiguree Least Privilege.
#
# Basee sur postgres:16-alpine officiel + scripts d'init dans
# /docker-entrypoint-initdb.d/ qui sont executes UNE FOIS au premier
# boot (creation de la base).
#
# Ce que l'image fait au premier boot :
#   1. Cree le role `humanix_readonly` (NOLOGIN, NOSUPERUSER, NOCREATE*)
#   2. Cree l'utilisateur `humanix_ro_user` qui herite de ce role
#      (LOGIN, password fourni via $POSTGRES_READONLY_PASSWORD)
#   3. Donne CONNECT + USAGE sur la base + schema public
#   4. Configure ALTER DEFAULT PRIVILEGES pour que les futures tables
#      (creees plus tard par Prisma) soient automatiquement SELECT-only
#      pour humanix_readonly
#
# Ce que l'image NE FAIT PAS :
#   - Les REVOKE chirurgicaux sur User/Account/VerificationToken
#     (ces tables n'existent pas encore au boot Postgres). A appliquer
#     manuellement APRES `prisma db push` via :
#       psql "$DATABASE_URL_SUPERUSER" < prisma/sql/post-migration-grants.sql
#     Ou ajouter ce script en hook du seed.
#
# CONFIGURATION REQUISE (cf. .env.example) :
#   POSTGRES_USER                  = humanix
#   POSTGRES_PASSWORD              = <password app>
#   POSTGRES_DB                    = humanix
#   POSTGRES_READONLY_PASSWORD     = <password ro user> (NOUVEAU)
#
# L'app utilise alors :
#   DATABASE_URL          = postgresql://humanix:...@postgres/humanix
#   DATABASE_URL_READONLY = postgresql://humanix_ro_user:...@postgres/humanix
#
# Tag conseille : ghcr.io/humanix-cybersecurity/postgres:16-secured
#
# Build local :
#   docker build -t humanix-postgres:secured ./docker/postgres
#
# Le docker-compose.yml de ce repo l'utilise via `build:` au lieu de
# `image:`. Pour pousser l'image sur un registry :
#   docker tag humanix-postgres:secured ghcr.io/.../postgres:16-secured
#   docker push ghcr.io/.../postgres:16-secured

FROM postgres:16-alpine@sha256:f377d590e5474681d4d7838635031a2b50647923b7abfa803ce9b5ff35d5c663

LABEL org.opencontainers.image.title="Humanix Postgres"
LABEL org.opencontainers.image.description="Postgres 16-alpine preconfigure avec role read-only Least Privilege"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.source="https://github.com/Humanix-Cybersecurity/Humanix-Academie"
LABEL org.opencontainers.image.vendor="Humanix-Cybersecurity SASU"

# Les scripts SQL dans /docker-entrypoint-initdb.d/ sont executes
# automatiquement par l'entrypoint officiel postgres au PREMIER boot
# (creation de la base initiale).
#
# --chmod=755 : les droits ne doivent pas dependre de la machine qui
# construit. Sans lui, COPY reprend ceux du contexte, donc l'umask du
# checkout, et les fichiers arrivent a root alors que l'entrypoint lance
# les scripts en tant que `postgres`. Sur nos executeurs de CI le script
# arrivait executable mais illisible pour cet utilisateur :
#   /bin/bash: /docker-entrypoint-initdb.d/01-create-readonly-role.sh:
#   Permission denied
# et PostgreSQL s'arretait avant la fin de l'initialisation. Constate le
# 2026-11-20, au premier vrai passage de l'essai de l'image publiee.
# Un umask 077 donne le meme arret, avec un autre message.
COPY --chmod=755 initdb/ /docker-entrypoint-initdb.d/

# Healthcheck enrichi : verifie que la base ET le role readonly sont
# disponibles. Si le role n'a pas ete cree (echec init), on remonte
# unhealthy plutot que de continuer en mode degrade silencieux.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      && psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
         "SELECT 1 FROM pg_roles WHERE rolname='humanix_readonly';" \
      | grep -q 1
