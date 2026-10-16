/** Per-adviser fund watchlist — moved off the browser (localStorage) into Neon
 *  so it follows the user across devices. Firm-scoped AND owner-scoped: a user
 *  only ever sees their own rows (RLS in rls.sql). */
import { pgTable, text, uuid, unique } from 'drizzle-orm/pg-core';
import { baseColumns } from './_shared';
import { organization, user } from './auth';

export const watchlist = pgTable('watchlist', {
  ...baseColumns,
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  fundId: text('fund_id').notNull(), // blob fund id (e.g. 'zurich-life-prisma-2')
}, (t) => [unique('watchlist_user_fund_uq').on(t.userId, t.fundId)]);