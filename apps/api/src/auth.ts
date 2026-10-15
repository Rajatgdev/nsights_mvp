import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, admin as adminPlugin } from 'better-auth/plugins';
import { db, schema } from '@nsights/db';
import { sendEmail } from './email';

const BASE_URL = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? 'http://localhost:8787';

export const auth = betterAuth({
  baseURL: BASE_URL,
  trustedOrigins: [BASE_URL, process.env.WEB_URL ?? 'http://localhost:5173'],
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // flip on once Postmark sender is verified
    async sendResetPassword({ user, url }) {
      await sendEmail({ to: user.email, subject: 'Reset your nSights password', text: `Reset: ${url}` });
    },
  },
  session: { cookieCache: { enabled: true, maxAge: 300 } },
  rateLimit: { enabled: true, window: 60, max: 20 },
  plugins: [
    organization({
      async sendInvitationEmail({ email, invitation, organization: org }) {
        await sendEmail({
          to: email,
          subject: `You've been invited to ${org.name} on nSights`,
          text: `Accept your invitation: ${BASE_URL}/accept-invite/${invitation.id}`,
        });
      },
    }),
    adminPlugin(),
  ],
});

export type Auth = typeof auth;