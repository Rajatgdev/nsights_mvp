# nSights — MVP

Quick MVP of the nSights adviser tool. Playful, light UI (1:1 with the
`Nsights-standalone` prototype look). Four tabs — Dashboard, Research &
Comparison, Portfolio Builder, Insights — plus Design + Settings. Build a
client PPTX on the go by clicking **+ Slide** on any chart.

Fresh rebuild. Hard logic (calc, charts, portfolio rules, validation, RLS
hierarchy) is **replicated** from the stable engineered repo
(`Rajatgdev/nsights_work`), which stays untouched as the reference.

## Stack
- **Web**: Vite + React 18 SPA → Vercel
- **API**: Hono (Node) → Railway
- **DB**: Neon Postgres (Frankfurt) + Drizzle + Row-Level Security
- **Auth**: Better Auth (Kaben → firm admin → assistant hierarchy)
- **Monorepo**: pnpm + Turborepo
- **Export**: client-side html-to-image → PptxGenJS (PNG-per-slide)

## Scope
IN: Dashboard (mock news), Research & Comparison (dynamic charts + add-to-slide),
Portfolio Builder (rules engine), Insights (static, add-to-slide), Design,
Settings, CSV upload (Kaben admin), multi-tenant isolation.
OUT (MVP): Stripe billing, AI/Vertex commentary (template only), native editable
PPTX charts, Financial Planning, Client Portal.

## Dev
```bash
pnpm install
cp .env.example .env         # fill Neon + secret
pnpm db:generate && pnpm db:migrate   # then apply packages/db/rls.sql
pnpm dev
```

See `docs/build-plan.md` for the full phase-by-phase plan.
