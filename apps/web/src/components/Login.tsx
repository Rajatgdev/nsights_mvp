import { useState } from 'react';
import { signIn } from '../lib/session';

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await signIn(email, password); onAuthed(); }
    catch { setErr('Wrong email or password.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', background: 'var(--paper)' }}>
      <form onSubmit={submit} style={{
        width: 340, background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 10, padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Logo />
          <strong style={{ fontSize: 18, letterSpacing: -0.2 }}>nSights</strong>
        </div>
        <label style={lbl}>Email</label>
        <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <label style={lbl}>Password</label>
        <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ color: 'var(--neg)', fontSize: 13, margin: '8px 0' }}>{err}</div>}
        <button disabled={busy} style={{
          width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 6, border: 'none',
          background: 'var(--accent)', color: '#fff', fontWeight: 600,
          opacity: busy ? 0.6 : 1,
        }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 4px' };
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 6,
  background: 'var(--paper)', color: 'var(--ink)', outline: 'none',
};

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" rx="22" fill="#103743" />
      <g stroke="#15a394" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M34 80l16-20 12 10 24-30" />
      </g>
      <circle cx="86" cy="42" r="6" fill="#15a394" />
    </svg>
  );
}