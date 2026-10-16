/** Stored files (Vercel Blob). One table backs firm logos, Kaben's Insights
 *  decks and exported presentation files. firm_id NULL = platform-global
 *  (Kaben) content, visible to every firm. RLS: see rls.sql (custom policies,
 *  because firm_id is nullable here, unlike the other tenant tables). */
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import { organization, user } from './auth';

export const asset = pgTable('asset', {
  ...baseColumns,
  firmId: uuid('firm_id').references(() => organization.id, { onDelete: 'cascade' }), // null = platform-global
  kind: text('kind').notNull(), // 'logo' | 'insight_deck' | 'export_deck'
  storageKey: text('storage_key').notNull(), // Blob pathname
  url: text('url').notNull(),                 // Blob url (download link)
  filename: text('filename'),
  contentType: text('content_type'),
  sizeBytes: integer('size_bytes'),
  title: text('title'),
  uploadedBy: text('uploaded_by').references(() => user.id),
});