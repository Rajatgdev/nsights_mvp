/** Firm invitations. A tokened link lets someone join a firm with a given
 *  firm_role. Used for both the first firm_admin (from Kaben's console) and
 *  adviser/assistant seats (from a firm admin). The accept flow runs through
 *  SECURITY DEFINER functions (see rls.sql) because it happens pre-session. */
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { firmRole } from './enums';
import { organization, user } from './auth';

export const firmInvite = pgTable('firm_invite', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  firmId: uuid('firm_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: firmRole('role').notNull(),
  invitedBy: text('invited_by').references(() => user.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});