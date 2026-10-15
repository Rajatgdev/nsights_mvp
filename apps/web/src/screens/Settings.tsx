import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, type SettingsData } from '../lib/settings';

const EMPTY: SettingsData = {
  adviser: { fullName: null, title: null },
  firm: { name: null, website: null, email: null, phone: null, address: null },
  canEditFirm: false,
};

export function Settings() {
  const nav = useNavigate();
  const [data, setData] = useState<SettingsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setData({ ...EMPTY, ...(await getSettings()) }); }
    catch { setError('Could not load settings.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const setAdviser = (k: keyof SettingsData['adviser'], v: string) => { setData((d) => ({ ...d, adviser: { ...d.adviser, [k]: v } })); setSaved(false); };
  const setFirm = (k: keyof SettingsData['firm'], v: string) => { setData((d) => ({ ...d, firm: { ...d.firm, [k]: v } })); setSaved(false); };

  async function onSave() {
    setSaving(true); setError(null);
    try { await saveSettings({ adviser: data.adviser, firm: data.firm }); setSaved(true); }
    catch { setError('Save failed — please try again.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ color: 'var(--muted)' }}>Loading…</div>;

  const roFirm = !data.canEditFirm;

  return (
    <div style={{ maxWidth: 720 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Settings</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>Your adviser profile and firm details — used on presentation covers, slide footers and client reports.</p>
      </header>

      <Section title="Adviser profile">
        <Row>
          <Field label="Full name"><Input value={data.adviser.fullName} onChange={(v) => setAdviser('fullName', v)} placeholder="Your name" /></Field>
          <Field label="Title / role"><Input value={data.adviser.title} onChange={(v) => setAdviser('title', v)} placeholder="Financial Adviser" /></Field>
        </Row>
      </Section>

      <Section title="Firm details" subtitle={roFirm ? 'Only a firm admin can change these.' : undefined}>
        <Row>
          <Field label="Firm name"><Input value={data.firm.name} onChange={(v) => setFirm('name', v)} ro={roFirm} placeholder="Your Firm" /></Field>
          <Field label="Website"><Input value={data.firm.website} onChange={(v) => setFirm('website', v)} ro={roFirm} placeholder="www.yourfirm.ie" /></Field>
        </Row>
        <Row>
          <Field label="Email"><Input value={data.firm.email} onChange={(v) => setFirm('email', v)} ro={roFirm} type="email" placeholder="advice@yourfirm.ie" /></Field>
          <Field label="Phone"><Input value={data.firm.phone} onChange={(v) => setFirm('phone', v)} ro={roFirm} placeholder="+353 1 234 5678" /></Field>
        </Row>
        <Field label="Address (optional)"><Input value={data.firm.address} onChange={(v) => setFirm('address', v)} ro={roFirm} placeholder="123 Main Street, Dublin 2" /></Field>
      </Section>

      <Section title="Branding & presentation">
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          Logo, accent colour, cover tagline, deck template and presentation defaults live in the{' '}
          <button onClick={() => nav('/design')} style={linkBtn}>Design</button> tab.
        </p>
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <button onClick={onSave} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Save settings'}</button>
        <button onClick={() => { setSaved(false); setError(null); load(); }} style={btnGhost}>Reset</button>
        {saved && <span style={{ color: 'var(--pos, #1c8a4e)', fontSize: 13.5 }}>✓ Saved</span>}
        {error && <span style={{ color: 'var(--neg, #c0392b)', fontSize: 13.5 }}>{error}</span>}
      </div>
    </div>
  );
}

// ---- primitives ----
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 11px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' };
const linkBtn: React.CSSProperties = { border: 'none', background: 'none', color: 'var(--accent-deep, #0b544a)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13.5, textDecoration: 'underline' };
const btnGhost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 7, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnPrimary = (busy: boolean): React.CSSProperties => ({ border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 });

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 12.5, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</strong>
        {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
      {children}
    </label>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>;
}
function Input({ value, onChange, ro, type, placeholder }: { value: string | null; onChange: (v: string) => void; ro?: boolean; type?: string; placeholder?: string }) {
  return <input type={type ?? 'text'} value={value ?? ''} readOnly={ro} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, background: ro ? 'var(--line-soft, #f2efe9)' : 'var(--surface)' }} />;
}