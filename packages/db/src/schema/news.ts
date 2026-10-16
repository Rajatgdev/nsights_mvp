/** Dashboard news — PLATFORM-GLOBAL (no firm_id). Kaben publishes; every firm
 *  sees it in their dashboard "Recent news". RLS: SELECT all, write
 *  platform_admin only (see rls.sql). */
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import { user } from './auth';

export const news = pgTable('news', {
  ...baseColumns,
  title: text('title').notNull(),
  source: text('source').notNull(),            // e.g. "Zurich Life"
  body: text('body').notNull(),                // one-paragraph summary
  url: text('url'),                            // optional "read more" link
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by').references(() => user.id),
});