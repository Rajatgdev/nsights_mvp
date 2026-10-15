interface SendEmailArgs { to: string; subject: string; text: string; html?: string; }

const ENABLED = process.env.EMAIL_ENABLED === 'true';
const TOKEN = process.env.POSTMARK_TOKEN;
const FROM = process.env.EMAIL_FROM ?? 'noreply@example.com';

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  if (!ENABLED || !TOKEN) {
    console.log(`[email:dev] (not sent)\n  to: ${args.to}\n  subj: ${args.subject}\n  ${args.text}`);
    return;
  }
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Postmark-Server-Token': TOKEN },
    body: JSON.stringify({ From: FROM, To: args.to, Subject: args.subject, TextBody: args.text, HtmlBody: args.html, MessageStream: 'outbound' }),
  });
  if (!res.ok) throw new Error(`Postmark send failed (${res.status}): ${await res.text()}`);
}