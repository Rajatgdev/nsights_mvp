// Team — firm_admin only. Lists the firm's members and pending invites,
// invites adviser/assistant seats (seat-limited), toggles role + capabilities,
// and removes members or revokes invites.
import { useEffect, useState } from 'react';
import {
  getTeam, inviteSeat, revokeInvite, updateMember, removeMember,
  type TeamData,
} from '../lib/team';

export function Team({ meUserId }: { meUserId: string }) {
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try { setData(await getTeam()); }
    catch { setError('Could not load your team.'); }
  }
  useEffect(() => { load(); }, []);

  if (!data) return <div style={{ color: 'var(--muted)' }}>{error ?? 'Loading…'}</div>;

  const full = data.seatsUsed >= data.seatLimit;

  async function onToggleCap(userId: string, cap: 'canDownload' | 'canEditHousePortfolios', val: boolean) {
    setBusyId(userId);
    try { await updateMember(userId, { [cap]: val }); await load(); } finally { setBusyId(null); }
  }
  async function onRole(userId: string, role: 'firm_admin' | 'adviser' | 'assistant') {
    setBusyId(userId);
    try { await updateMember(userId, { role }); await load(); } finally { setBusyId(null); }
  }
  async function onRemove(userId: string) {
    setBusyId(userId);
    try { await removeMember(userId); await load(); } finally { setBusyId(null); }
  }
  async function onRevoke(id: string) {
    setBusyId(id);
    try { await revokeInvite(id); await load(); } finally { setBusyId(null); }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Team</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>
          Your advisers and assistants. {data.seatsUsed} of {data.seatLimit} seats used.
        </p>
      </header>

      {error && <Banner text={error} />}

      <InviteForm full={full} onInvited={load} />

      <section style={card}>
        <div style={{ ...rowGrid, ...headRow }}>
          <span>Member</span><span>Role</span><span style={{ textAlign: 'center' }}>Download</span><span style={{ textAlign: 'center' }}>Edit house</span><span />
        </div>
        {data.members.map((m) => {
          const self = m.userId === meUserId;
          const busy = busyId === m.userId;
          return (
            <div key={m.userId} style={{ ...rowGrid, borderTop: '1px solid var(--line-soft)', opacity: busy ? 0.55 : 1 }}>
              <span>
                <div style={{ fontWeight: 600 }}>{m.name || m.email}{self && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}> · you</span>}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{m.email}</div>
              </span>
              <span>
                <select value={m.role} disabled={self || busy} onChange={(e) => onRole(m.userId, e.target.value as 'firm_admin' | 'adviser' | 'assistant')} style={sel}>
                  <option value="firm_admin">firm admin</option>
                  <option value="adviser">adviser</option>
                  <option value="assistant">assistant</option>
                </select>
              </span>
              <span style={{ textAlign: 'center' }}><input type="checkbox" checked={m.canDownload} disabled={busy} onChange={(e) => onToggleCap(m.userId, 'canDownload', e.target.checked)} /></span>
              <span style={{ textAlign: 'center' }}><input type="checkbox" checked={m.canEditHousePortfolios} disabled={busy} onChange={(e) => onToggleCap(m.userId, 'canEditHousePortfolios', e.target.checked)} /></span>
              <span style={{ textAlign: 'right' }}>{!self && <button onClick={() => onRemove(m.userId)} disabled={busy} style={rmBtn}>Remove</button>}</span>
            </div>
          );
        })}
      </section>

      {data.invites.length > 0 && (
        <section style={{ ...card, marginTop: 16 }}>
          <div style={{ ...miniLbl, padding: '12px 14px 6px' }}>Pending invites</div>
          {data.invites.map((i) => (
            <div key={i.id} style={{ ...rowGrid, gridTemplateColumns: '1fr 120px 1fr 90px', borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ color: 'var(--muted)' }}>{i.email}</span>
              <span><RolePill role={i.role} /></span>
              <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>awaiting sign-up</span>
              <span style={{ textAlign: 'right' }}><button onClick={() => onRevoke(i.id)} disabled={busyId === i.id} style={rmBtn}>Revoke</button></span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function InviteForm({ full, onInvited }: { full: boolean; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'adviser' | 'assistant'>('assistant');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!email) { setErr('Enter an email.'); return; }
    setBusy(true); setErr(null); setLink(null);
    try {
      const r = await inviteSeat(email, role);
      setLink(r.link); setEmail(''); setCopied(false); onInvited();
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e).includes('409') ? 'No seats left — raise the seat limit or remove someone.' : 'Invite failed.');
    } finally { setBusy(false); }
  }

  return (
    <section style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ ...miniLbl, marginBottom: 10 }}>Invite a seat</div>
      {full && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>All seats are in use. Ask Kaben to raise your seat limit, or remove a member first.</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: 200 }} type="email" placeholder="name@firm.ie" value={email} disabled={full} onChange={(e) => setEmail(e.target.value)} />
        <select value={role} disabled={full} onChange={(e) => setRole(e.target.value as 'adviser' | 'assistant')} style={sel}>
          <option value="assistant">assistant</option>
          <option value="adviser">adviser</option>
        </select>
        <button style={btnPrimary(busy)} disabled={busy || full} onClick={submit}>{busy ? 'Inviting…' : 'Send invite'}</button>
      </div>
      {err && <div style={{ color: 'var(--neg)', fontSize: 13, marginTop: 10 }}>{err}</div>}
      {link && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 5 }}>Invite sent. Share this link (expires in 7 days):</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={link} style={{ ...inputStyle, flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
            <button style={btnGhost} onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

function RolePill({ role }: { role: string }) {
  return <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'var(--line-soft)', color: 'var(--ink-soft)' }}>{role.replace('_', ' ')}</span>;
}
function Banner({ text }: { text: string }) {
  return <div style={{ background: '#fbe9e7', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>{text}</div>;
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' };
const rowGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 150px 90px 90px 90px', alignItems: 'center', gap: 10, padding: '11px 14px', fontSize: 13.5 };
const headRow: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted)' };
const miniLbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted)' };
const inputStyle: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' };
const sel: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13.5, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' };
const rmBtn: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: '#c0392b', borderRadius: 6, padding: '5px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 7, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const btnPrimary = (busy: boolean): React.CSSProperties => ({ border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 });