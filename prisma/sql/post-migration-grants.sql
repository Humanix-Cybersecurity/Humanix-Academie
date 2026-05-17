-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Script a executer UNE FOIS apres le premier `prisma db push` (ou la
-- premiere migration deploy). Applique les REVOKE chirurgicaux pour la
-- defense en profondeur :
--   - User           : contient passwordHash, mfaSecret, email
--   - Account        : contient refresh_token, access_token (NextAuth)
--   - VerificationToken : magic links en attente, sensibles
--
-- L'utilisateur read-only (humanix_ro_user) ne peut pas lire ces tables.
-- En revanche, il peut lire la vue `v_user_analytics` qui expose
-- uniquement les colonnes non-secretes utiles a l'analytique.
--
-- USAGE :
--   psql "$DATABASE_URL" < prisma/sql/post-migration-grants.sql
--
-- Idempotent : peut etre rejoue sans risque apres chaque nouvelle
-- migration Prisma qui ajouterait des tables sensibles.
--
-- PREREQUIS :
--   - Avoir demarre l'image docker custom humanix-postgres (qui a cree
--     le role humanix_readonly via /docker-entrypoint-initdb.d/)
--   - Avoir applique le schema Prisma (npx prisma db push)

-- =============================================================================
-- 1. REVOKE SELECT sur les tables sensibles
-- =============================================================================
-- Idempotent : REVOKE sur un grant inexistant ne plante pas.

REVOKE SELECT ON TABLE "User" FROM humanix_readonly;
REVOKE SELECT ON TABLE "Account" FROM humanix_readonly;
REVOKE SELECT ON TABLE "VerificationToken" FROM humanix_readonly;

-- =============================================================================
-- 2. Vue v_user_analytics — colonnes non-secretes uniquement
-- =============================================================================
-- Expose ce dont les jobs analytiques ont reellement besoin :
--   - Identification : id, tenantId, role, isActive
--   - Activite : createdAt, lastSeenAt
--   - Gamification : riskScore, coins, level
--
-- Pas de PII directe (email, name), pas de secrets (passwordHash, mfaSecret).

CREATE OR REPLACE VIEW v_user_analytics AS
SELECT
  id,
  "tenantId",
  role,
  "createdAt",
  "lastSeenAt",
  "riskScore",
  coins,
  level,
  "isActive"
FROM "User";

GRANT SELECT ON v_user_analytics TO humanix_readonly;

-- =============================================================================
-- 3. Verifications
-- =============================================================================
-- Se connecter comme humanix_ro_user et tester :
--
--   psql "postgresql://humanix_ro_user:<pwd>@host/humanix"
--   > SELECT id FROM "Tenant" LIMIT 1;            -- OK
--   > SELECT id, role FROM v_user_analytics LIMIT 1; -- OK
--   > SELECT * FROM "User" LIMIT 1;               -- ERROR: permission denied
--   > SELECT * FROM "Account" LIMIT 1;            -- ERROR: permission denied
--   > INSERT INTO "Tenant" (id, slug) VALUES ('test', 'test'); -- ERROR
--   > DELETE FROM "Progress" WHERE id = 'x';      -- ERROR
--
-- Une fois valide, ajouter dans .env :
--   DATABASE_URL_READONLY="postgresql://humanix_ro_user:<pwd>@postgres/humanix?schema=public"
--
-- Au prochain redemarrage de l'app, lib/db-readonly.ts bascule
-- automatiquement sur ce client. Aucun changement de code requis.
