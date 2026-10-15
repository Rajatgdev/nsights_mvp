# nSights MVP — Deferred Work

Living doc. Each item = thing cut from the MVP, why, and what unblocks it.
Order is roughly "most likely to revisit" first. Nothing here is lost — it is
parked with a reason so a later build can pick it up without re-deciding.

Last updated: 2026-10-15 (added §12 Insights prototype charts, §13 Insights
secondary tabs, §14 Research drawdown/recovery charts).

---

## 1. Dedicated `app_user` DB role — IMPLEMENTED (kept here for context)
Not deferred. RLS only bites a non-owner, non-BYPASSRLS login. Owner role
bypasses RLS even with FORCE RLS, so a separate `app_user` (NOSUPERUSER,
NOBYPASSRLS) is mandatory, not optional. `DATABASE_URL` = app_user (pooled),
`DATABASE_URL_UNPOOLED` = owner (direct, migrations/seed/apply-rls only).
6/6 isolation tests green. Recorded so nobody "simplifies" it away later.

## 2. Billing / subscriptions
Out of MVP scope by decision. No Stripe, no plan gating, no seat counting.
Firms are provisioned by the platform admin. Unblock: add a `subscription`
table keyed by firm, a Stripe customer/price mapping, and a webhook; gate
firm creation + seat invites behind plan state. No schema in the way — the
firm row can carry a `plan` column when needed.

## 3. Vertex / AI-generated commentary
Out of scope. Commentary is template-only (deterministic sentences built from
the rounded chart facts), and the portfolio rules engine is branded
**"Considerations"**, never "AI". Unblock: reintroduce the `facts()` →
prompt → numbers-validator → `fallback()` pipeline from `nsights_work`
(packages/charts). The template sentences are written to the same fact shape,
so a later AI layer slots in behind them without touching the charts.

## 4. Native editable PPTX (shapes/text, not PNG-per-slide)
Export is **PNG-per-slide**: each chart rendered by ECharts `getDataURL`,
dropped full-bleed into a PptxGenJS slide, plus a cover and a disclaimer.
Pixel-faithful to screen, zero chart-reimplementation, but the output is a
picture — not editable in PowerPoint. Unblock: port each chart to native
pptxgen shapes/tables (large effort, must track every chart) or buy a
charting→OOXML lib. Deferred because faithfulness + speed beat editability
for the MVP.

## 5. Normalised price tables
Fund data is a single monthly **JSON blob** (`data_version.dataset jsonb`),
not normalised `fund` / `price` rows. Fine at MVP volume and matches the
"upload a workbook each month" model. Unblock: introduce `fund` and
`fund_price` tables + an ETL from the blob when we need per-fund history
queries, partial updates, or point-in-time corrections. The calc engine reads
an in-memory series either way, so the swap is at the loader only.

## 6. Audit log / privacy / support-grant tooling
No audit trail, no self-service data export/delete, no time-boxed
"support can view this firm" grant. RLS enforces isolation; nothing records
*who looked at what*. Unblock: append-only `audit_event` table written in
`withTenant`, plus a `SECURITY DEFINER` support-grant function with an expiry.
Deferred as compliance surface the MVP does not need to demo.

## 7. Two-factor auth
Better Auth is email/password + organization + admin only. No TOTP/WebAuthn.
Unblock: enable the Better Auth 2FA plugin + enrolment UI. Deferred to keep
the auth surface small for the pilot.

## 8. Email verification + password reset emails
Sign-up creates a usable account without verifying the address; no transactional
email provider is wired. Unblock: add an email sender (Resend/SES) and flip on
Better Auth's verification + reset flows. Deferred — pilot users are
provisioned, not self-serve.

## 9. Server-side PDF renderer
No "download as PDF" for decks/insights. Export is PPTX only. Unblock: headless
Chromium (or the PptxGenJS→PDF path) behind an API route. Deferred — PPTX is
the format advisers asked for first.

## 10. Insights monthly refresh pipeline
Insights data is **baked** (`apps/web/src/lib/insights-data.ts`, the KABEN
workbook frozen at Sep 2026). It does NOT come from the monthly funds upload —
it is a separate house dataset. Refreshing it today = re-run the extraction and
replace the file. Unblock: an upload slot + parser for the KABEN workbook that
writes a versioned Insights blob the web app reads at runtime. Deferred —
static is Option A, agreed.

## 11. Fund facts not in the blob (manager / style / region / SFDR)
The monthly blob carries returns series + basic identity, NOT manager name,
investment style, domicile/region, or SFDR classification. Two Portfolio
Builder screens therefore run **degraded**:
- **Multi-manager** diversification check — can't group by manager.
- **Multi-strategy** / style-box view — can't group by style.
Any region or SFDR filter is likewise unavailable. Unblock: add these columns
to the upload schema (or a side reference sheet) and surface them in the
universe. Deferred — the source workbook doesn't contain them yet.

---

## 12. Insights — prototype charts NOT ported (data missing)

Context: the standalone prototype drives Insights from **two** datasets —
`window.KABEN` (the house workbook we baked) **and** `window.MARKET_DATA`, a
mock "live market" dataset (index levels, VIX, sector 1M/1W moves, news feeds,
yield curve, GDP, policy rates, modelled planning series). We baked **KABEN**
only. Every chart below needs a field that lives only in `MARKET_DATA`, is a
mock news/events list, or is a modelled/teaching series we chose not to invent.
Everything that *is* buildable from KABEN is being added to the registry (see
note at the end of this section) and is **not** listed here.

| Prototype id | Chart | Why deferred | Unblock |
|---|---|---|---|
| `ins-heatmap` | Asset Class Performance **Heatmap** (YTD / 1M / 1W) | KABEN has YTD + 3 full calendar years only — **no 1-month / 1-week** columns. The *concept* is shipped instead as an asset-class **returns quilt** (calendar-year heatmap, §"added"). | Add 1W/1M return columns to the Insights dataset. |
| `ins-alpha` | Monthly Alpha vs Benchmark | Needs a monthly excess-return series + Sharpe for "Equities vs benchmark". Not in KABEN. | Add an alpha/benchmark monthly series to the dataset. |
| `ins-milestones` | Market Milestones | Hand-curated **news feed** (same class as the mocked Dashboard news). | Real news source, or a curated monthly list. |
| `ins-laffer` | The Laffer Curve | Illustrative economics teaching curve — no underlying data, purely conceptual. Out of the "house data" remit. | Decide if teaching visuals belong in Insights; if so, hard-code the curve. |
| `ins-lafferuk` | Laffer Curve — UK Non-Dom | Forecast-vs-outturn policy table (Henley/OBR/HMRC). No data baked; also a political topic. | Source + bake the specific figures. |
| `ins-yieldcurve` | US Treasury Yield Curve | Needs yields **across maturities** (3M→30Y). KABEN holds only the **10-year** series for four countries. | Add a full tenor curve to the dataset. |
| `ins-cbevents` | Central Bank Rate Decisions | Mock events list (Fed/ECB/BoE). | Real policy calendar feed or curated list. |
| `ins-gdp` | Global GDP Growth 2025 vs 2026f | Needs per-economy GDP actual + forecast. Not in KABEN. | Bake an IMF/OECD growth table. |
| `ins-econevents` | Key Economic Events | Mock macro events list. | Same as `ins-cbevents`. |
| `ins-riskcomp` | Risk Category 15-Yr Growth of €100k | Modelled Cautious/Moderate/Growth paths + vol — a **planning projection**, not house returns. | Define the model assumptions and compute the series. |

Notes:
- `ins-bondheat` and `ins-altheat` (the Fixed-Income and Alternatives
  heatmaps) are shown in the prototype at YTD/1M/1W. We **do** ship their YTD +
  calendar-year content as heatmaps from KABEN; only the 1M/1W granularity is
  deferred (same root cause as `ins-heatmap`).
- Everything buildable from KABEN — GICS YTD / 3-year **heatmap** / contribution
  / 4 contribution waterfalls / contribution table, sector-weights-over-time,
  10-year-yields table, fixed-income & asset-class heatmaps, the asset-class
  **returns quilt (periodic table)**, bonds-vs-equities by calendar year, and
  the formula-only teaching charts (Rule of 72, % gain to recover, power of
  compounding, early-start) — is being added to
  `apps/web/src/lib/insights-charts.ts` and wired to the slide rail + PPTX
  export. Those are NOT deferred.

## 13. Insights — secondary tabs (Economics / Planning / Behavioral / Education)
The prototype has 8 Insight tabs; the MVP ships the data-backed ones
(Popular, Equities, Fixed Income, Bonds vs Equities, Alternatives — plus the
feasible teaching charts). The four "soft" tabs are **thin or empty** because
most of their charts are the mock/modelled items in §12. The charts in them
that *are* formula-only (Rule of 72, recovery, compounding, early-start,
holding-period probability) are being added; the rest wait on §12 data.
Unblock: bake the Economics/GDP/policy data and agree the planning model, then
re-enable the tabs. Deferred — Option A (static, data-backed) was agreed.

## 14. Research — drawdown / recovery charts (4)
The `nsights_work` chart registry has ~19 charts; the MVP Research screen ships
16. The four not ported are the **drawdown depth, drawdown duration, recovery
time, and underwater** charts. They need the calc engine's running-peak /
recovery series, which is more plumbing than the pilot needs. Unblock: port the
`maxDrawdown`/underwater helpers from `@nsights/calc` and add the four
`ChartDef`s. Deferred — the 16 shipped cover the adviser demo.

---

### How to read this doc
If an item is unblocked, move it up to the "IMPLEMENTED" style (like §1) with a
one-line note, don't delete it — the reasoning is the point.