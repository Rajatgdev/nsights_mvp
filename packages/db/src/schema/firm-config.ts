/** Firm config — tenant-scoped (firm_id = organization.id). */
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import { organization } from './auth';
import { templateIdEnumValues } from './_literals';

export const firmSettings = pgTable('firm_settings', {
  firmId: uuid('firm_id').primaryKey().references(() => organization.id, { onDelete: 'cascade' }),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  tagline: text('tagline'),
  logoStorageKey: text('logo_storage_key'),
  accentHex: text('accent_hex').default('#16a394'),
  templateId: text('template_id', { enum: templateIdEnumValues }).default('boardroom'),
  paletteId: text('palette_id').default('default'),
  disclaimerText: text('disclaimer_text'),
  showSlideNumbers: boolean('show_slide_numbers').notNull().default(true),
  priceDateMeans: text('price_date_means', { enum: ['month_end', 'month_start'] }).default('month_end'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teamMember = pgTable('team_member', {
  ...baseColumns,
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  title: text('title'),
  bio: text('bio'),
  photoStorageKey: text('photo_storage_key'),
  sort: integer('sort').notNull().default(0),
});

export const firmProfile = pgTable('firm_profile', {
  firmId: uuid('firm_id').primaryKey().references(() => organization.id, { onDelete: 'cascade' }),
  philosophy: text('philosophy'),
  strategy: text('strategy'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});