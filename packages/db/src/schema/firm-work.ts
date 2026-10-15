/** Tenant tables — all carry firm_id NOT NULL, protected by RLS (spec §4.2/§4.3). */
import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import {
  compareMode, exportFormat, exportStatus, holdingRole, portfolioApproach,
  portfolioKind, presentationStatus, rebalancing, slideKind,
} from './enums';
import { organization, user } from './auth';
import { dataVersion } from './fund-data';
import { templateIdEnumValues } from './_literals';

export const portfolio = pgTable('portfolio', {
  ...baseColumns,
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  ownerUserId: text('owner_user_id').references(() => user.id), // null = house
  kind: portfolioKind('kind').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  approach: portfolioApproach('approach'),
  rebalancing: rebalancing('rebalancing').notNull().default('monthly'),
});

export const portfolioHolding = pgTable('portfolio_holding', {
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolio.id, { onDelete: 'cascade' }),
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }), // denormalised for RLS
  fundId: text('fund_id').notNull(),          // blob fund id (e.g. 'zurich-life-prisma-2')
  weightBp: integer('weight_bp').notNull(),   // basis points, sum = 10000
  role: holdingRole('role'),
}, (t) => [primaryKey({ columns: [t.portfolioId, t.fundId] })]);

export const presentation = pgTable('presentation', {
  ...baseColumns,
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => user.id),
  title: text('title').notNull(),
  clientName: text('client_name'),
  adviserName: text('adviser_name'),
  dataVersionId: uuid('data_version_id').notNull().references(() => dataVersion.id), // pinned
  templateId: text('template_id', { enum: templateIdEnumValues }).notNull().default('boardroom'),
  paletteId: text('palette_id').notNull().default('default'),
  compareMode: compareMode('compare_mode').notNull().default('common'),
  status: presentationStatus('status').notNull().default('draft'),
});

export const slide = pgTable('slide', {
  ...baseColumns,
  presentationId: uuid('presentation_id').notNull().references(() => presentation.id, { onDelete: 'cascade' }),
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  kind: slideKind('kind').notNull(),
  chartKey: text('chart_key'),
  fundIds: text('fund_ids').array(),          // blob fund ids
  portfolioId: uuid('portfolio_id').references(() => portfolio.id),
  options: jsonb('options'),
  commentaryText: text('commentary_text'),    // template commentary (no AI in MVP)
});

export const exportRecord = pgTable('export', {
  ...baseColumns,
  presentationId: uuid('presentation_id').notNull().references(() => presentation.id, { onDelete: 'cascade' }),
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by').notNull().references(() => user.id),
  format: exportFormat('format').notNull(),
  status: exportStatus('status').notNull().default('ready'),
  storageKey: text('storage_key'),
  dataVersionId: uuid('data_version_id').notNull().references(() => dataVersion.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});