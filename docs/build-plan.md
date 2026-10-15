# nSights MVP — Build Plan

**Version:** 1.0 · **Date:** 15 Oct 2026 · **Owner:** Rajat · **Status:** Pre-build, scope locked

> The single reference for building the nSights MVP. When we get stuck, we come
> here. Phase-by-phase, what comes from where, and a realistic 5-week timeline.

---

## 1. What we are building (one paragraph)

A **quick, playful MVP** of nSights for *generalist* insurance/investment
sellers (rookies, not specialists). It looks **1:1 like the standalone
prototype** (`Nsights-standalone (5).html`) — light, friendly, approachable.
The seller browses funds, compares them with **live charts**, and builds a
branded client **PowerPoint on the go**: whatever chart they like, they click
**+ Slide** and it drops into the slide rail on the right, ready to download.
Four tabs ship — **Dashboard, Research & Comparison, Portfolio Builder,
Insights** — plus **Design** and **Settings**. All fund data comes from **one
CSV that Kaben uploads monthly**. Multi-tenant: Kaben owns the platform, invites
firms, and each firm is isolated from every other firm (and from Kaben's view of
their content).

---

## 2. Scope

### In (MVP)
- **Dashboard** — overview (portfolio snapshot), recent news (**mock**), recent
  presentations (real — the decks the user built/downloaded).
- **Research & Comparison** — fund ledger, select funds to compare, charts that
  **recompute** for the selected funds, each chart has **+ Slide**. Investment
  Research view only (no statement / fund-fact analysis view).
- **Portfolio Builder** — guided: pick a category/approach → add funds → live
  review with good/warning comments (rules engine).
- **Insights** — **static** (Option A): the exact Insights slides from the
  prototype bundle, frozen. Top tabs (Popular, Equities, Fixed Income, …) and
  their charts are fixed. Each chart is **addable to the slide rail**.
- **Design** — copied wholesale from the prototype: deck template, colour
  palette, slide furniture, front/back cover.
- **Settings** — copied wholesale: adviser/firm settings, disclaimer.
- **Slide rail + export** — build the deck on the go; download as PPTX
  (PNG-per-slide) and/or PDF.
- **CSV upload** — Kaben admin uploads the monthly fund file → validated →
  published as the new live dataset.
- **Multi-tenancy** — Kaben → firm admin → assistant hierarchy, firm isolation
  via Postgres Row-Level Security.

### Out (MVP — "coming soon")
- Stripe billing / card payments (Kaben onboards firms manually for now).
- AI / Vertex commentary — **template commentary only** (deterministic
  sentences, no AI, no cost, no setup).
- Native **editable** PPTX charts (we ship PNG-per-slide images instead).
- Financial Planning, Client Portal, statement & fund-fact analysis views.
- Insights monthly refresh pipeline (ships frozen; add later if wanted).

---

## 3. Key product decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Codebase | **Fresh repo**, replicate logic from the stable repo (`nsights_work`), which stays untouched as reference. |
| 2 | UI look | **1:1 with the prototype** (light, playful). |
| 3 | Frontend tech | **Vite + React 18** (SPA) — NOT Babel-in-browser. Same JSX/look, real build. |
| 4 | Price storage | **JSON blob** per monthly version (mirrors `dataset-default.json`), not normalized price rows. |
| 5 | Export | **PNG-per-slide** (html-to-image → PptxGenJS). Not editable in PowerPoint — acceptable; only Design/Settings change the look, never individual chart slides. |
| 6 | Commentary | **Template only.** Vertex/AI out of scope. |
| 7 | Dashboard news | **Mock** for MVP. |
| 8 | Insights | **Option A — static/frozen** from the prototype; still addable to slides. |
| 9 | Billing | **Out** of MVP. |

---

## 4. Architecture

```
                         ┌───────────────────────────┐
  Seller / Firm admin ──►│  Vite + React 18 SPA       │  (Vercel, fra1)
                         │  prototype look, slide rail│
                         └──────────────┬─────────────┘
                                        │ HTTPS, session cookie, /api/*
                                        ▼
                         ┌───────────────────────────┐
                         │  Hono API (Node)           │  (Railway)
                         │  auth · funds · portfolios │
                         │  presentations · admin     │
                         └───────┬───────────┬────────┘
                                 │           │
                    RLS tx (firm_id GUC)     │ Railway Volume (uploads, assets)
                                 ▼           
                         ┌───────────────────────────┐
                         │  Neon Postgres (Frankfurt) │
                         │  + Row-Level Security      │
                         └───────────────────────────┘
```

- **Same-origin in dev** via the Vite proxy (`/api` → `:8787`). In prod the SPA
  calls the Railway API URL; set cookie domain / CORS accordingly.
- **Export runs in the browser** (html-to-image + PptxGenJS) — no render server
  needed for MVP. The API only persists slide state and records downloads.
- **PDF (optional):** browser print, or a small Playwright step later. Not on the
  critical path.

---

## 5. Tech stack & what comes from where

| Layer | Choice | Source |
|---|---|---|
| Monorepo | pnpm + Turborepo | new (scaffolded) |
| Web | Vite + React 18, React Router, ECharts | new shell; **screens ported from prototype look** |
| API | Hono on Node (`@hono/node-server`) | new shell; route logic ported from stable repo |
| DB | Neon Postgres (Frankfurt) + Drizzle ORM | **schema replicated** from stable `packages/db` (trimmed for MVP) |
| Isolation | App `firm_id` filter + Postgres **RLS** | **replicate** `packages/db/rls.sql` + request pipeline |
| Auth | Better Auth (organization + admin plugins) | **replicate** `packages/auth` |
| Calc engine | pure TS (§6 formulas) + golden tests | **replicate** `packages/calc` (verbatim — keep golden values) |
| Charts | 14-chart registry (ECharts) | **replicate** `packages/charts` |
| Portfolio rules | rules engine + blend analysis | **replicate** `packages/portfolio` |
| CSV validation | parse + validate upload → blob | **replicate** `packages/validation` |
| Deck/export | slide model + PNG-per-slide PPTX | new (thin); **design tokens/templates copied from prototype** |
| Insights data | frozen static slides | **copy from prototype bundle** (`kaben-data.js` / `insights-data.jsx`) |
| Dashboard news | mock JSON | new |
| Storage | Railway Volume (signed app routes) | new (thin) |
| Email (invites) | Postmark | optional MVP |
| Monitoring | Sentry | optional MVP |

**Two data sources (keep straight):**
1. **Monthly `funds.csv`** (Kaben) → validated → **dataset blob** → feeds
   **Research + Portfolio** (dynamic, recompute on fund selection).
2. **Insights** → its **own frozen set** copied from the prototype. Does **not**
   come from `funds.csv` and does not react to fund selection.

**Dataset blob shape** (from `dataset-default.json`):
```
{ source, updated: "YYYY-MM-DD", dates: ["2013-06-01", …, "2026-08-01"],
  funds: [ { id, name, provider, cls, risk 1–7, category, amc,
             prices: [null, null, …, 12.34] } ] }   // prices aligned to dates
```
Leading `null` = before launch (never fill with 1). ~72 funds × 159 months today.

---

## 6. Calculations & charts (port verbatim — do not re-derive)

All formulas come from the stable `packages/calc` + the prototype. **Keep the
golden test values** so the MVP numbers match the prototype exactly.

- Primitives: monthly/total/annualised return, YTD, calendar year, quarter,
  volatility (sample stdev × √12), max drawdown, Sharpe, rebase, rolling
  cumulative/vol.
- Compare window: default **common** (shared start across selected funds),
  toggle **own**.
- Charts (launch set, each with **+ Slide**): growth €10k, cumulative 5y,
  annualised bar, calendar-year bar, discrete-annual table, rolling 2y, historic
  vol, stress drawdown, monthly/quarterly histograms, risk-return scatter,
  charges table, key-metrics table, comparison summary.
- **Do NOT port the prototype bugs** (listed in the stable spec §15): index-
  aligned calendar years, carry-forward fill, mixed windows, double risk
  numbers, estimated-TER formula, Covid label mismatch, etc.

---

## 7. The slide rail (core selling point)

The reason the product exists. Protect this interaction in the port.

- Right-hand rail present on **Research** and **Insights** (and Portfolio
  blended charts).
- Every chart card has a **+ Slide** button → appends the chart (as a slide) to
  the current presentation in the rail, instantly, no dialog.
- Rail shows thumbnails, reorder (drag), remove, and the cover/closing slides.
- **Download** → renders each slide to PNG in the browser → PptxGenJS assembles
  the `.pptx` → file downloads. Also records the download so it appears under
  Dashboard → Recent presentations.
- Deck look (template, palette, furniture, covers) comes entirely from the
  **Design** tab settings.

---

## 8. Multi-tenancy & roles

```
Kaben (platform_admin)
  └── invites ──► Firm admin (one per firm)
                    └── invites ──► Assistant(s)
```

- **Kaben**: uploads the monthly CSV; creates firms + the first firm admin; sets
  seat limits; sees **headcount + roles per firm only** — never a firm's
  portfolios, presentations, or client names.
- **Firm admin**: branding/design/settings, invite/remove assistants, full use.
- **Assistant**: research, portfolios, presentations, downloads.
- **Isolation**: every firm-owned table carries `firm_id NOT NULL` + **RLS**.
  Each request runs in a transaction that sets `app.firm_id` / `app.user_id` /
  `app.role`; Postgres refuses cross-firm rows. App DB role is **non-BYPASSRLS**;
  only admin/platform routes use a BYPASSRLS role. **CI test:** firm A cannot
  read/update/delete firm B's rows. (All replicated from the stable repo — the
  expensive, already-tested part.)

---

## 9. Repo layout (scaffolded)

```
nsights-mvp/
  apps/
    web/      Vite + React 18 SPA (Vercel) — screens, slide rail, charts
    api/      Hono API (Railway) — auth, funds, portfolios, presentations, admin
  packages/
    shared/       zod schemas, types (Dataset blob), constants, provider colours
    calc/         pure calc engine (§6) + golden tests        [replicate]
    charts/       14-chart registry (ECharts)                  [replicate]
    portfolio/    rules engine + blend analysis                [replicate]
    validation/   CSV/XLSX parse + validate -> blob            [replicate]
    db/           Drizzle schema + rls.sql + seed              [replicate, trimmed]
    auth/         Better Auth (org + admin)                    [replicate]
    deck/         slide model + PNG-per-slide PPTX export       [new, thin]
    ui/           shared React helpers                          [new]
  docs/
    build-plan.md  (this file)
```

---

## 10. Phase-by-phase plan (≈ 5 weeks)

> Generous on purpose. One developer. Dates assume a start of **Mon 20 Oct 2026**.
> Replication is faster than greenfield because the logic already exists and is
> tested in the stable repo.

### Phase 0 — Foundations (Week 1: 20–24 Oct)
- Create GitHub repo + local folder from this scaffold; `pnpm install` green.
- Neon project (Frankfurt) + branches (dev/preview). Vercel + Railway projects.
- Replicate `packages/db` schema (MVP subset) + `rls.sql`; migrate; **cross-
  tenant RLS test passes**.
- Replicate `packages/auth` (Better Auth org + admin). Kaben can invite a firm
  admin; firm admin can invite an assistant; login works.
- **Verify:** typecheck + build green in CI; RLS isolation test green; a firm
  admin and an assistant can log in.

### Phase 1 — Data engine (Week 1–2: 22 Oct–31 Oct)
- Replicate `packages/shared` (Dataset types) + `packages/calc` **with golden
  tests** (numbers match the prototype).
- Replicate `packages/validation`; Kaben CSV upload → validate → publish a
  **data_version blob**; seed from `dataset-default.json`.
- API: `GET /funds`, `/funds/:id`, `POST /charts/:key/data`.
- **Verify:** golden tests green; upload a known file → correct live dataset;
  chart-data endpoint returns correct series for selected funds.

### Phase 2 — Research & Comparison + slide rail (Week 2–3: 29 Oct–7 Nov)
- Replicate `packages/charts` (14 charts). Build the Research screen (prototype
  look): fund ledger, select-to-compare, charts recompute, compare-window
  toggle.
- Build the **slide rail** + **+ Slide** on every chart.
- `packages/deck`: slide model + **PNG-per-slide PPTX** download.
- **Verify:** select funds → charts update; + Slide adds; download opens a valid
  `.pptx` that looks like the screen.

### Phase 3 — Portfolio Builder + Insights (Week 3–4: 5–14 Nov)
- Replicate `packages/portfolio`; build the guided builder (approach → funds →
  live review with good/warning comments); blended charts + indicative risk
  class; house/personal portfolios (RLS-scoped).
- Build **Insights** (static): copy the frozen slides/tabs from the prototype;
  wire **+ Slide** on each chart.
- **Verify:** portfolio warnings/suggestions match the rules; Insights renders +
  charts add to the rail.

### Phase 4 — Dashboard, Design, Settings (Week 4: 12–18 Nov)
- Dashboard: portfolio snapshot + **mock** news + recent presentations (real).
- **Copy** Design tab (templates, palettes, furniture, covers) and Settings tab
  (adviser/firm, disclaimer) from the prototype; wire them to the deck theme.
- **Verify:** changing Design updates the deck look + export; Settings persists
  per firm.

### Phase 5 — Harden, deploy, UAT (Week 5: 19–26 Nov)
- Deploy: SPA → Vercel, API → Railway, DB → Neon; env wiring; invite emails
  (Postmark) if in.
- End-to-end pass: Kaben uploads CSV → invites firm → firm admin invites
  assistant → research → build deck → download. Re-run RLS isolation. Sentry on.
- Accessibility/responsive sanity; buffer for bugs.
- **Verify:** full e2e works on staging; two firms cannot see each other's data;
  UAT sign-off.

### Milestones
| Date | Milestone |
|---|---|
| Fri 24 Oct | Foundations green (auth + RLS) |
| Fri 31 Oct | Data engine green (upload → charts data) |
| Fri 7 Nov | Research + slide rail + export working |
| Fri 14 Nov | Portfolio + Insights working |
| Tue 18 Nov | Dashboard/Design/Settings done |
| Wed 26 Nov | Deployed + UAT sign-off |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Porting re-introduces prototype bugs | Port `calc` **with its golden tests**; keep the stable spec §15 bug-list handy. |
| PNG-per-slide decks look low-res / heavy | Render at 2× device pixel ratio; cap slide count; compress PNGs. |
| RLS mistake leaks firm data | Replicate the tested `rls.sql`; keep the cross-tenant CI test as a merge gate. |
| Vercel/Railway cross-origin cookies | Decide early: subdomain cookie or token; test login in prod-like setup in Phase 0. |
| Scope creep (billing, AI, editable PPT) | Explicitly OUT; park in "coming soon". |
| Insights content drift | Frozen in MVP; monthly refresh is a later, separate feature. |

---

## 12. Open questions (confirm before/at Phase 0)

1. Repo/folder name `nsights-mvp` OK?
2. Vercel (web) + Railway (api) split confirmed vs a single Next.js app? (plan
   assumes split — matches "Vercel frontend, Railway backend").
3. Invite emails via Postmark in MVP, or manual links to start?
4. PDF export needed at launch, or PPTX only?
5. Keep 2FA (Better Auth TOTP) for admins in MVP, or defer?

---

## 13. Glossary

- **Dataset blob** — the monthly fund file stored as one JSON document per
  version (not split into price rows).
- **PNG-per-slide export** — each slide is a flat image inside the `.pptx`; looks
  identical to the screen, not editable in PowerPoint.
- **RLS** — Postgres Row-Level Security; the database itself refuses to return
  another firm's rows.
- **Template commentary** — fixed, auto-filled sentences describing a chart's
  numbers; no AI.
- **Slide rail** — the right-hand panel where charts accumulate into a deck.
- **Stable repo** — `Rajatgdev/nsights_work`, the engineered build we copy from
  and leave untouched.
