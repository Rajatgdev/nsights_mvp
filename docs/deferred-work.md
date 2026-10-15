# nSights MVP — Deferred Work

Things intentionally **not** built in the MVP, why, how the MVP stays correct
without them, and what "done later" looks like. Living doc — add as we defer.

Last updated: 15 Oct 2026.

---

## 1. Dedicated `app_user` database login role — IMPLEMENTED (not deferred)

Moved out of deferred: the Neon owner role bypasses RLS, so FORCE RLS alone did
not isolate firms (the cross-tenant test leaked). The app now connects as the
non-BYPASSRLS `app_user` role (DATABASE_URL_APP); owner is used only for
migrations/seeding. Isolation proven by packages/db/src/__tests__/rls.test.ts.

### (original note, kept for context)
## 1b. Dedicated `app_user` database login role (security hardening)

**What the full build did:** the app connected as a dedicated Postgres role
`app_user` that is **non-BYPASSRLS** and has only the minimum grants. Migrations
and admin jobs ran as the owner (or `app_platform` BYPASSRLS) role. This gives a
second, independent guarantee of tenant isolation on top of the RLS policies.

**What the MVP does instead:** the app connects as the **Neon owner role**, and
every tenant table has **FORCE ROW LEVEL SECURITY** plus `tenant_isolation`
policies keyed on the `app.firm_id` transaction GUC (set by `withTenant`). With
FORCE enabled, the policies apply to the owner role too — so firms are isolated
regardless of which role connects.

**Why this is acceptable for MVP:**
- Firm isolation is enforced by the database via FORCE RLS + GUC policies, not
  by the choice of role.
- The cross-tenant isolation test (`packages/db/src/__tests__/rls.test.ts`)
  proves it on every CI run — it connects as the app's own role and asserts
  Firm A cannot see/modify Firm B.

**Residual risk being accepted:**
- No second line of defence if a future code path forgets to open `withTenant`
  (runs without the GUC) — such a query would currently run with owner
  privileges. Mitigation: all tenant DB access must go through `withTenant`;
  enforce in review.
- **Hard precondition:** the Neon role must NOT have `BYPASSRLS`. If it does,
  FORCE RLS is ignored and isolation breaks. The isolation test is the gate —
  it must stay green.

**How to enable the hardened path later (no schema change):**
1. Set `APP_DB_PASSWORD` in env.
2. Run `pnpm --filter @nsights/db apply-rls` — it creates/updates the `app_user`
   LOGIN role with that password and the minimal grants (already in `rls.sql`).
3. Give the app a dedicated connection string for `app_user` (new env
   `DATABASE_URL_APP`), keep `DATABASE_URL_UNPOOLED` (owner) for migrations only,
   and point the runtime pool at `DATABASE_URL_APP`.
4. Re-run the isolation test as `app_user`; confirm green.
**Acceptance:** app runs as a non-BYPASSRLS role; migrations run as owner;
isolation test green under the app role.

---

## 2. Billing / Stripe
Out of MVP. Kaben onboards firms manually (creates firm + first admin, sets seat
limit). No `subscription` / `stripe_event` tables, no checkout/portal/webhooks,
no firm lifecycle states beyond what auth needs. Later: port the stable repo's
`packages/billing` + Stripe Checkout/Portal/Tax/webhooks + the full firm
lifecycle (`past_due`/`paused`/`cancelled`).

## 3. AI commentary (Vertex / Gemini)
Out of MVP. Slides get **template commentary** only (deterministic sentences
from the chart's own figures). Later: add the `@nsights/commentary` Vertex path
+ numbers/phrase validator (see `claude/vertex-commentary-setup.md`).

## 4. Native editable PPTX charts
MVP exports **PNG-per-slide** (html-to-image → PptxGenJS image per slide), not
editable in PowerPoint. Later: native `slide.addChart` + editable text boxes for
chart slides.

## 5. Normalized price tables
MVP stores the whole monthly file as a **JSON blob** in `data_version.dataset`.
No `fund` / `fund_price` / `fund_fact_version` / `fund_metric` / `provider`
tables. Later (only if SQL-level price queries are needed): normalize into the
stable repo's price schema and migrate existing blobs.

## 6. Audit log, privacy (erase/export), support-view grants
Out of MVP (`audit_log`, `privacy_request`, `support_grant`, `terms_acceptance`
tables dropped). Later: re-add append-only `audit_log` + GDPR erase/export
tooling + time-boxed platform support view.

## 7. 2FA (TOTP) for admins
Out of MVP. Better Auth `twoFactor` plugin + `two_factor` table deferred. Later:
require TOTP for `platform_admin` + `firm_admin`.

## 8. Email verification
Login works without verifying email (no verified Postmark sender yet). Later:
verify sender, flip `requireEmailVerification: true`.

## 9. PDF export / renderer service
MVP = PPTX (and optionally browser print). No Playwright PDF service. Later:
Railway `pdf-renderer` if a true server-rendered PDF is required.

## 10. Insights monthly refresh
Insights ships **frozen** (Option A — static set copied from the prototype
bundle). It does NOT read `funds.csv`. Later: a second Kaben upload to refresh
Insights content monthly.