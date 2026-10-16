// PUBLIC accept-invite page (/accept-invite/:token) — rendered before any
// session exists. Shows the firm + role, takes a password, creates the account
// (server-side), then signs in and drops the user into the app.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInvite, acceptInvite, type InviteInfo } from '../lib/invite';
import { signIn } from '../lib/session';
import { Logo } from './Login';

export function AcceptInvite({ onAuthed }: { onAuthed: () => void }) {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<InviteInfo | null | 'loading'>('loading');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { getInvite(token).then(setInfo).catch(() => setInfo(null)); }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (!info || info === 'loading') return;
    setBusy(true); setErr(null);
    const r = await acceptInvite(token, password, name || undefined);
    if (!r.ok) {
      setErr(r.message ?? (r.error === 'account_exists' ? 'An account already exists for this email — sign in instead.' : 'Could not accept the invite.'));
      setBusy(false); return;
    }
    // Account created server-side; establish the browser session cookie.
    try { await signIn(info.email, password); onAuthed(); }
    catch { setErr('Account created — please sign in.'); setBusy(false); }
  }

  if (info === 'loading') return <Centered><span style={{ color: 'var(--muted)' }}>Loading invite…</span></Centered>;

  if (!info || !info.valid) return (
    <Centered>
      <Card>
        <Head />
        <h2 style={{ fontSize: 18, margin: '4px 0 6px' }}>Invite not valid</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 0 }}>This invite link is invalid, already used, or expired. Ask whoever invited you for a fresh link.</p>
      </Card>
    </Centered>
  );

  return (
    <Centered>
      <Card>
        <Head />
        <h2 style={{ fontSize: 18, margin: '4px 0 2px' }}>Join {info.firmName}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 0 }}>
          Invited as <strong style={{ color: 'var(--ink)' }}>{info.role.replace('_', ' ')}</strong> · {info.email}
        </p>
        <form onSubmit={submit}>
          <Lbl>Your name</Lbl>
          <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoFocus />
          <Lbl>Choose a password</Lbl>
          <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          {err && <div style={{ color: 'var(--neg)', fontSize: 13, margin: '10px 0' }}>{err}</div>}
          <button disabled={busy} style={{ width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Setting up…' : 'Accept & create account'}
          </button>
        </form>
      </Card>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', background: 'var(--paper)' }}>{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 360, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 28 }}>{children}</div>;
}
function Head() {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}><Logo /><strong style={{ fontSize: 18, letterSpacing: -0.2 }}>nSights</strong></div>;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', margin: '12px 0 4px' }}>{children}</label>;
}
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--paper)', color: 'var(--ink)', outline: 'none' };