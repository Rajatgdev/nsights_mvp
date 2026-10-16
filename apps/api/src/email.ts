// Transactional email via Brevo (https://api.brevo.com/v3/smtp/email).
// Same sendEmail() signature as before, so invite/reset callers are unchanged.
// Sends only when EMAIL_ENABLED=true AND BREVO_API_KEY is set; otherwise logs.
// Env: EMAIL_ENABLED, BREVO_API_KEY, EMAIL_FROM (a verified Brevo sender),
// optional EMAIL_FROM_NAME.
interface SendEmailArgs { to: string; subject: string; text: string; html?: string; }

const ENABLED = process.env.EMAIL_ENABLED === 'true';
const KEY = process.env.BREVO_API_KEY;
const FROM = process.env.EMAIL_FROM ?? 'noreply@example.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'nSights';

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  if (!ENABLED || !KEY) {
    console.log(`[email:dev] (not sent)\n  to: ${args.to}\n  subj: ${args.subject}\n  ${args.text}`);
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'api-key': KEY },
    body: JSON.stringify({
      sender: { email: FROM, name: FROM_NAME },
      to: [{ email: args.to }],
      subject: args.subject,
      textContent: args.text,
      htmlContent: args.html ?? `<pre style="font:14px/1.5 system-ui">${args.text}</pre>`,
    }),
  });
  if (!res.ok) throw new Error(`Brevo send failed (${res.status}): ${await res.text()}`);
}