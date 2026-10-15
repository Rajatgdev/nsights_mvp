/** Fund data — shared, platform-owned (Kaben). MVP = JSON blob per version. No firm_id. */
import { date, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import { dataUploadStatus, dataVersionStatus } from './enums';
import { user } from './auth';

export const dataUpload = pgTable('data_upload', {
  ...baseColumns,
  uploadedBy: text('uploaded_by').notNull().references(() => user.id),
  storageKey: text('storage_key').notNull(),  // Railway volume key
  filename: text('filename').notNull(),
  status: dataUploadStatus('status').notNull().default('pending'),
  report: jsonb('report'),                    // { errors[], warnings[], summary }
  createdVersionId: uuid('created_version_id'),
});

export const dataVersion = pgTable('data_version', {
  ...baseColumns,
  dataMonth: date('data_month').notNull(),    // last price month
  status: dataVersionStatus('status').notNull().default('draft'),
  dataset: jsonb('dataset').notNull(),        // the whole monthly file (dataset-default.json shape)
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: text('published_by').references(() => user.id),
  sourceUploadId: uuid('source_upload_id'),
});

/** Singleton pointer to the live version. Flip in one tx. */
export const platformState = pgTable('platform_state', {
  id: smallint('id').primaryKey().default(1),
  liveVersionId: uuid('live_version_id').references(() => dataVersion.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});