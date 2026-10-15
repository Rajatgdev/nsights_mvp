-- Row-Level Security (build spec §4.3). Apply AFTER migrations, as owner.
-- MVP: app runs as owner + FORCE RLS; app_user login is optional (deferred).

-- App roles (app_user stays NOLOGIN until APP_DB_PASSWORD is set) ------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END$$;

-- Context helpers ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_firm() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.firm_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app_current_user() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;
CREATE OR REPLACE FUNCTION app_current_role() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.role', true), '') $$;

-- Tenant isolation on firm_id tables -----------------------------------------
DO $$
DECLARE
  t text;
  firm_id_tables text[] := ARRAY[
    'portfolio','portfolio_holding','presentation','slide','export',
    'firm_settings','team_member','firm_profile'
  ];
BEGIN
  FOREACH t IN ARRAY firm_id_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (firm_id = app_current_firm())
        WITH CHECK (firm_id = app_current_firm())
    $f$, t);
  END LOOP;
END$$;

-- member + invitation key on organization_id (= firm id) ---------------------
DO $$
DECLARE
  t text;
  org_id_tables text[] := ARRAY['member','invitation'];
BEGIN
  FOREACH t IN ARRAY org_id_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (organization_id = app_current_firm())
        WITH CHECK (organization_id = app_current_firm())
    $f$, t);
  END LOOP;
END$$;

-- Personal-portfolio visibility (restrictive, spec §4.3) ---------------------
DROP POLICY IF EXISTS personal_owner ON portfolio;
CREATE POLICY personal_owner ON portfolio AS RESTRICTIVE
  USING (
    kind = 'house'
    OR owner_user_id = app_current_user()
    OR app_current_role() = 'firm_admin'
  );

-- Shared fund-data: readable by app_user; uploads platform-only --------------
GRANT SELECT ON data_version TO app_user;
GRANT SELECT ON platform_state TO app_user;
REVOKE ALL ON data_upload FROM app_user;

-- DML grants on tenant tables (RLS still filters rows) -----------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  portfolio, portfolio_holding, presentation, slide, export,
  firm_settings, team_member, firm_profile, member, invitation
  TO app_user;

-- Better Auth tables. organization has no RLS in MVP (app logic scopes it;
-- see docs/deferred-work.md). Needed so the app (app_user) can run sign-up /
-- sign-in / org endpoints.
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification, organization TO app_user;

-- Session bootstrap: read a user's memberships BEFORE firm context exists.
-- SECURITY DEFINER = runs as owner, bypassing RLS for this one vetted,
-- read-only, user-scoped lookup. `member` stays RLS-protected elsewhere.
CREATE OR REPLACE FUNCTION app_user_memberships(p_user_id text)
  RETURNS TABLE (
    firm_id uuid,
    role firm_role,
    can_edit_house_portfolios boolean,
    can_download boolean,
    firm_status firm_status
  )
  LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT m.organization_id, m.role, m.can_edit_house_portfolios, m.can_download, o.status
  FROM member m
  JOIN organization o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id
$$;

REVOKE ALL ON FUNCTION app_user_memberships(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_user_memberships(text) TO app_user;