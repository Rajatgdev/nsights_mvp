-- Row-Level Security (build spec §4.3). Apply AFTER migrations, as owner.
-- MVP: app runs as owner + FORCE RLS; app_user login is optional (deferred).

-- App roles (app_user stays NOLOGIN until APP_DB_PASSWORD is set) ------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END$$;

-- Schema tweaks not covered by migrations (idempotent) -----------------------
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS title text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'member_org_user_uq') THEN
    ALTER TABLE member ADD CONSTRAINT member_org_user_uq UNIQUE (organization_id, user_id);
  END IF;
END$$;

-- asset table (stored files: logos, Insights decks, exported decks) ----------
CREATE TABLE IF NOT EXISTS asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES organization(id) ON DELETE CASCADE,   -- NULL = platform-global
  kind text NOT NULL,
  storage_key text NOT NULL,
  url text NOT NULL,
  filename text,
  content_type text,
  size_bytes int,
  title text,
  uploaded_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_firm_kind_idx ON asset (firm_id, kind, created_at);

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

-- asset: firm-scoped rows + platform-global rows (firm_id NULL, Kaben's) -----
-- Nullable firm_id, so it can't use the standard tenant_isolation loop:
--   read  = your firm's rows + every platform-global row
--   write = your firm's rows, or anything when acting as platform_admin
ALTER TABLE asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_read ON asset;
CREATE POLICY asset_read ON asset FOR SELECT
  USING (firm_id IS NULL OR firm_id = app_current_firm());
DROP POLICY IF EXISTS asset_write ON asset;
CREATE POLICY asset_write ON asset FOR ALL
  USING (firm_id = app_current_firm() OR app_current_role() = 'platform_admin')
  WITH CHECK (firm_id = app_current_firm() OR app_current_role() = 'platform_admin');
GRANT SELECT, INSERT, UPDATE, DELETE ON asset TO app_user;

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

-- Platform-admin firm summary: headcount + roles per firm, NEVER firm content.
-- SECURITY DEFINER (runs as owner) so Kaben can see counts across firms he is
-- not a member of. Only selects organization + member — no portfolios etc.
CREATE OR REPLACE FUNCTION platform_firm_summary()
  RETURNS TABLE (
    firm_id uuid, name text, slug text, status firm_status,
    seat_limit int, members bigint, admins bigint
  )
  LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT o.id, o.name, o.slug, o.status, o.seat_limit,
         count(m.*) AS members,
         count(m.*) FILTER (WHERE m.role = 'firm_admin') AS admins
  FROM organization o
  LEFT JOIN member m ON m.organization_id = o.id
  GROUP BY o.id
$$;
REVOKE ALL ON FUNCTION platform_firm_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_firm_summary() TO app_user;

-- ── Firm invites (Phase 1) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firm_invite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  firm_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  email text NOT NULL,
  role firm_role NOT NULL,
  invited_by text REFERENCES "user"(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS firm_invite_firm_idx ON firm_invite (firm_id, accepted_at);

ALTER TABLE firm_invite ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_invite FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS firm_invite_rw ON firm_invite;
CREATE POLICY firm_invite_rw ON firm_invite FOR ALL
  USING (firm_id = app_current_firm() OR app_current_role() = 'platform_admin')
  WITH CHECK (firm_id = app_current_firm() OR app_current_role() = 'platform_admin');
GRANT SELECT, INSERT, UPDATE, DELETE ON firm_invite TO app_user;

-- Pre-session invite lookup (accept page).
CREATE OR REPLACE FUNCTION invite_by_token(p_token text)
RETURNS TABLE(firm_id uuid, firm_name text, email text, role firm_role, valid boolean)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT i.firm_id, o.name, i.email, i.role,
         (i.accepted_at IS NULL AND i.expires_at > now()) AS valid
  FROM firm_invite i JOIN organization o ON o.id = i.firm_id
  WHERE i.token = p_token;
$$;
GRANT EXECUTE ON FUNCTION invite_by_token(text) TO app_user;

-- Accept: validate invite, add member, mark accepted (seat-limit enforced).
CREATE OR REPLACE FUNCTION accept_invite(p_token text, p_user_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE inv firm_invite; cnt int; lim int;
BEGIN
  SELECT * INTO inv FROM firm_invite WHERE token = p_token FOR UPDATE;
  IF inv.id IS NULL OR inv.accepted_at IS NOT NULL OR inv.expires_at <= now() THEN RETURN NULL; END IF;
  SELECT seat_limit INTO lim FROM organization WHERE id = inv.firm_id;
  SELECT count(*) INTO cnt FROM member WHERE organization_id = inv.firm_id;
  IF cnt >= lim THEN RETURN NULL; END IF;
  INSERT INTO member (organization_id, user_id, role, can_edit_house_portfolios, can_download)
    VALUES (inv.firm_id, p_user_id, inv.role, (inv.role = 'firm_admin'), true)
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  UPDATE firm_invite SET accepted_at = now() WHERE id = inv.id;
  RETURN inv.firm_id;
END;
$$;
GRANT EXECUTE ON FUNCTION accept_invite(text, text) TO app_user;

-- Members + pending invites for one firm (platform console + firm-admin team).
CREATE OR REPLACE FUNCTION platform_firm_detail(p_firm uuid)
RETURNS TABLE(kind text, user_id text, email text, name text, role text,
              can_download boolean, can_edit boolean,
              invite_id uuid, invited_email text, expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT 'member'::text, m.user_id, u.email, u.name, m.role::text,
         m.can_download, m.can_edit_house_portfolios,
         NULL::uuid, NULL::text, NULL::timestamptz
  FROM member m JOIN "user" u ON u.id = m.user_id
  WHERE m.organization_id = p_firm
  UNION ALL
  SELECT 'invite'::text, NULL, NULL, NULL, i.role::text,
         NULL, NULL, i.id, i.email, i.expires_at
  FROM firm_invite i
  WHERE i.firm_id = p_firm AND i.accepted_at IS NULL AND i.expires_at > now();
$$;
GRANT EXECUTE ON FUNCTION platform_firm_detail(uuid) TO app_user;
-- news: PLATFORM-GLOBAL dashboard news (no firm_id). Read by everyone, written
-- only by platform_admin (Kaben). ------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL,
  body text NOT NULL,
  url text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_published_idx ON news (published_at DESC);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS news_read ON news;
CREATE POLICY news_read ON news FOR SELECT USING (true);
DROP POLICY IF EXISTS news_write ON news;
CREATE POLICY news_write ON news FOR ALL
  USING (app_current_role() = 'platform_admin')
  WITH CHECK (app_current_role() = 'platform_admin');
GRANT SELECT, INSERT, UPDATE, DELETE ON news TO app_user;

-- asset: columns for Insights slide pages (insight_slide rows link to their
-- parent insight_deck + keep page order). Idempotent. ----------------------
ALTER TABLE asset ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS sort_index int;
CREATE INDEX IF NOT EXISTS asset_parent_idx ON asset (parent_id, sort_index);
-- watchlist: per-adviser fund list. Firm-scoped AND owner-scoped — a user only
-- ever sees/edits their own rows. ------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  fund_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_user_fund_uq UNIQUE (user_id, fund_id)
);
CREATE INDEX IF NOT EXISTS watchlist_user_idx ON watchlist (user_id);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS watchlist_owner ON watchlist;
CREATE POLICY watchlist_owner ON watchlist FOR ALL
  USING (firm_id = app_current_firm() AND user_id = app_current_user())
  WITH CHECK (firm_id = app_current_firm() AND user_id = app_current_user());
GRANT SELECT, INSERT, UPDATE, DELETE ON watchlist TO app_user;