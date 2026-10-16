/** Exported presentations — the .pptx decks an adviser downloads, moved off the
 *  browser (localStorage + IndexedDB) into Neon + Blob so "Recent presentations"
 *  and re-download work across devices. Firm + owner scoped (RLS in rls.sql). */
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import { organization, user } from './auth';

export const exportedDeck = pgTable('exported_deck', {
  ...baseColumns,
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slideCount: integer('slide_count').notNull().default(0),
  storageKey: text('storage_key').notNull(), // Blob pathname
  url: text('url').notNull(),                 // Blob url (download link)
  sizeBytes: integer('size_bytes'),
});