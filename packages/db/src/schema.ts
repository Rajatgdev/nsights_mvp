// REPLICATE from stable repo packages/db/src/schema/*.
// MVP tables:
//   auth:      user, session, account, organization(=firm), member, invitation
//   firm cfg:  firm_settings (branding, template, palette, disclaimer)
//   data:      data_version (JSON BLOB of the monthly dataset), data_upload
//   work:      portfolio, portfolio_holding, presentation, slide, export
// Every firm-owned (tenant) table has firm_id NOT NULL + RLS.
// Fund data is platform-owned (data_version blob) — shared, no firm_id.
export {};  // TODO: port drizzle schema
