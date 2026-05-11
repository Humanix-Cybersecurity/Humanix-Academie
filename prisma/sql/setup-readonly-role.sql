-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Setup d'un role PostgreSQL en lecture seule pour les usages
-- analytiques (forecast, risk-score, heatmap, exports CSV admin) et
-- les cron de telemetrie. Objectif Least Privilege :
--
--   * L'application principale conserve son DATABASE_URL (read+write)
--     pour servir le trafic utilisateur normal.
--   * Les jobs analytiques (computeTenantForecast, computeTopMovers,
--     getBreachStats) utilisent DATABASE_URL_READONLY -> aucun risque
--     de mutation accidentelle, ni d'echappement vers une table de
--     management (e.g. AuditLog).
--   * Si une routine read est compromise (memory dump, log leak), le
--     blast radius est limite a la lecture publique.
--
-- USAGE :
--   psql "$DATABASE_URL_SUPERUSER" < prisma/sql/setup-readonly-role.sql
--
-- Idempotent : peut etre rejoue sans risque. Les CREATE sont guardes
-- par des DO blocks. Les GRANT sont reapplicables.
--
-- Remplace les valeurs entre <> avant execution si necessaire.

-- =============================================================================
-- 1. Creer le role read-only (sans LOGIN par defaut, on l'attribue plus bas)
-- =============================================================================

DO $$
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
$$;

-- =============================================================================
-- 2. Donner CONNECT sur la base (remplacer 'humanix' par votre DB name)
-- =============================================================================

GRANT CONNECT ON DATABASE humanix TO humanix_readonly;
GRANT USAGE ON SCHEMA public TO humanix_readonly;

-- =============================================================================
-- 3. SELECT sur toutes les tables existantes + futures
-- =============================================================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO humanix_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO humanix_readonly;

-- Couvre les tables qui seront creees ulterieurement (Prisma db push)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO humanix_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO humanix_readonly;

-- =============================================================================
-- 4. EXCLURE explicitement les tables sensibles (defense en profondeur)
-- =============================================================================
--
-- Meme si le role est read-only, on revoque l'acces a quelques tables
-- qui ne devraient JAMAIS etre lues par les jobs analytiques :
--   - User.passwordHash, mfaSecret, mfaBackupCodesHash
--   - Account.refresh_token, access_token (NextAuth)
--   - VerificationToken (magic links pending)
--
-- Note : on ne peut pas faire de "column-level revoke" sur un SELECT *.
-- L'approche correcte est de creer une vue qui filtre les colonnes
-- sensibles et de donner SELECT uniquement sur la vue. Cf. § 5.

REVOKE SELECT ON TABLE "User" FROM humanix_readonly;
REVOKE SELECT ON TABLE "Account" FROM humanix_readonly;
REVOKE SELECT ON TABLE "VerificationToken" FROM humanix_readonly;

-- =============================================================================
-- 5. Vues filtrees pour les tables sensibles
-- =============================================================================
--
-- Vue "User" expose uniquement les colonnes non-secretes utiles a
-- l'analytique : id, tenantId, role, createdAt, lastSeenAt, riskScore,
-- coins, level. Pas de passwordHash, mfaSecret, email, name (PII).

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
-- 6. Creer l'utilisateur de connection (avec LOGIN + password)
-- =============================================================================
--
-- IMPORTANT : changer le mot de passe ci-dessous avant execution en
-- production. Pour generer : openssl rand -base64 32

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'humanix_ro_user') THEN
    CREATE ROLE humanix_ro_user
      LOGIN
      PASSWORD 'CHANGE_ME_BEFORE_PROD'
      INHERIT;
  END IF;
END
$$;

GRANT humanix_readonly TO humanix_ro_user;

-- =============================================================================
-- 7. Verifications post-execution
-- =============================================================================
--
-- Connectez-vous avec humanix_ro_user et verifiez :
--
--   psql "postgresql://humanix_ro_user:<pw>@host/humanix"
--   > SELECT * FROM "Tenant" LIMIT 1;        -- OK
--   > SELECT * FROM "User" LIMIT 1;          -- ERREUR permission denied
--   > SELECT * FROM v_user_analytics LIMIT 1;-- OK (vue safe)
--   > INSERT INTO "Tenant" (...);            -- ERREUR permission denied
--   > DELETE FROM "Progress";                -- ERREUR permission denied
--
-- Une fois valide, ajouter dans .env :
--   DATABASE_URL_READONLY="postgresql://humanix_ro_user:<pw>@host/humanix?schema=public"
--
-- Cf. lib/db-readonly.ts pour l'utilisation cote app.
