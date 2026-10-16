// Platform console — Kaben only. Lists every firm, creates firms (returns a
// firm-admin invite link to copy), drills into a firm's members + pending
// invites, and controls seat limit + active/paused status.
import { useEffect, useState } from 'react';
import {
  listFirms, getFirm, createFirm, updateFirm,
  type FirmRow, type FirmDetail,
} from '../lib/console';

export function Console() {
  const [firms, setFirms] = useState<FirmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setFirms(await listFirms()); }
    catch { setError('Could not load firms.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 860 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Platform</h1>
          <p style={{ color: 'var(--muted)', marginTop: 2 }}>Every firm on nSights — seats, roles and status. No firm content is shown here.</p>
        </div>
        <button onClick={() => setCreating(true)} style={btnPrimary(false)}>+ New firm</button>
      </header>

      {error && <Banner text={error} />}

      <section style={card}>
        <div style={{ ...rowGrid, ...headRow }}>
          <span>Firm</span><span>Status</span><span style={num}>Seats</span><span style={num}>Members</span><span />
        </div>
        {firms.map((f) => (
          <FirmRowView key={f.id} firm={f} open={openId === f.id}
            onToggle={() => setOpenId(openId === f.id ? null : f.id)}
            onChanged={load} />
        ))}
        {firms.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 14 }}>No firms yet. Create the first one.</div>}
      </section>

      {creating && <CreateFirm onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  );
}

function FirmRowView({ firm, open, onToggle, onChanged }: {
  firm: FirmRow; open: boolean; onToggle: () => void; onChanged: () => void;
}) {
  const [detail, setDetail] = useState<FirmDetail | null>(null);
  const [seat, setSeat] = useState(firm.seatLimit);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && !detail) getFirm(firm.id).then(setDetail).catch(() => {});
  }, [open]);

  async function setStatus(status: 'active' | 'paused') {
    setBusy(true);
    try { await updateFirm(firm.id, { status }); onChanged(); } finally { setBusy(false); }
  }
  async function saveSeat() {
    if (seat === firm.seatLimit) return;
    setBusy(true);
    try { await updateFirm(firm.id, { seatLimit: seat }); onChanged(); } finally { setBusy(false); }
  }

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)' }}>
      <div style={{ ...rowGrid, cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ fontWeight: 600 }}>{firm.name} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12.5 }}>/{firm.slug}</span></span>
        <span><StatusPill status={firm.status} /></span>
        <span style={num}>{firm.seatLimit}</span>
        <span style={num}>{firm.members}</span>
        <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{open ? '▴' : '▾'}</span>
      </div>

      {open && (
        <div style={{ padding: '4px 14px 16px', background: 'var(--paper)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={miniLbl}>Seat limit</span>
              <input type="number" min={1} value={seat} onChange={(e) => setSeat(Number(e.target.value))} onBlur={saveSeat} style={{ ...inputStyle, width: 90 }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {firm.status === 'paused'
                ? <button disabled={busy} onClick={() => setStatus('active')} style={btnGhost}>Reactivate</button>
                : <button disabled={busy} onClick={() => setStatus('paused')} style={btnGhost}>Pause (block writes)</button>}
            </div>
          </div>

          {!detail ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Loading members…</span> : (
            <>
              <div style={miniLbl}>Members</div>
              <table style={tbl}>
                <tbody>
                  {detail.members.map((m) => (
                    <tr key={m.userId}>
                      <td style={td}>{m.name || m.email}</td>
                      <td style={{ ...td, color: 'var(--muted)' }}>{m.email}</td>
                      <td style={td}><RolePill role={m.role} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.invites.length > 0 && (
                <>
                  <div style={{ ...miniLbl, marginTop: 12 }}>Pending invites</div>
                  <table style={tbl}>
                    <tbody>
                      {detail.invites.map((i) => (
                        <tr key={i.id}>
                          <td style={{ ...td, color: 'var(--muted)' }}>{i.email}</td>
                          <td style={td}><RolePill role={i.role} /></td>
                          <td style={{ ...td, color: 'var(--muted)', fontSize: 12 }}>invited</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CreateFirm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [seatLimit, setSeatLimit] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function onName(v: string) {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  }

  async function submit() {
    if (!name || !slug || !adminEmail) { setErr('Name, slug and admin email are required.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await createFirm({ name, slug, adminEmail, seatLimit });
      setLink(r.inviteLink); onCreated();
    } catch (e) { setErr(String(e instanceof Error ? e.message : e).includes('409') ? 'That email or slug is already taken.' : 'Create failed.'); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose}>
      {link ? (
        <>
          <h2 style={h2}>Firm created</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 0 }}>
            Send this link to the firm admin. It expires in 7 days. {adminEmail && 'An email was also sent if email is enabled.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={link} style={{ ...inputStyle, flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
            <button style={btnGhost} onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button style={btnPrimary(false)} onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <>
          <h2 style={h2}>New firm</h2>
          <Lbl>Firm name</Lbl>
          <input style={inputStyle} value={name} onChange={(e) => onName(e.target.value)} autoFocus placeholder="Acme Financial" />
          <Lbl>Slug</Lbl>
          <input style={inputStyle} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="acme-financial" />
          <Lbl>Firm admin email</Lbl>
          <input style={inputStyle} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} type="email" placeholder="admin@acme.ie" />
          <Lbl>Seat limit</Lbl>
          <input style={{ ...inputStyle, width: 100 }} type="number" min={1} value={seatLimit} onChange={(e) => setSeatLimit(Number(e.target.value))} />
          {err && <div style={{ color: 'var(--neg)', fontSize: 13, marginTop: 10 }}>{err}</div>}
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button style={btnGhost} onClick={onClose}>Cancel</button>
            <button style={btnPrimary(busy)} disabled={busy} onClick={submit}>{busy ? 'Creating…' : 'Create firm'}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---- shared bits ----
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function StatusPill({ status }: { status: string }) {
  const paused = status === 'paused' || status === 'past_due' || status === 'cancelled';
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: paused ? '#fbe9e7' : 'var(--accent-wash)', color: paused ? '#c0392b' : 'var(--accent-deep)' }}>{status}</span>;
}
function RolePill({ role }: { role: string }) {
  return <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'var(--line-soft)', color: 'var(--ink-soft)' }}>{role.replace('_', ' ')}</span>;
}
function Banner({ text }: { text: string }) {
  return <div style={{ background: '#fbe9e7', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>{text}</div>;
}
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,30,34,0.42)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '92vw', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 24 }}>{children}</div>
    </div>
  );
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', margin: '12px 0 5px' }}>{children}</label>;
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' };
const rowGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 110px 70px 80px 30px', alignItems: 'center', gap: 10, padding: '11px 14px', fontSize: 13.5 };
const headRow: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted)' };
const num: React.CSSProperties = { textAlign: 'right' };
const miniLbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 };
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const td: React.CSSProperties = { padding: '6px 8px 6px 0', fontSize: 13.5, textAlign: 'left', borderBottom: '1px solid var(--line-soft)' };
const h2: React.CSSProperties = { fontSize: 18, letterSpacing: -0.2, marginTop: 0, marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' };
const btnGhost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 7, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const btnPrimary = (busy: boolean): React.CSSProperties => ({ border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 });