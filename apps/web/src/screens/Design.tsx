import { useEffect, useRef, useState } from 'react';
import { getDesign, saveDesign, type DesignConfig } from '../lib/design';
import { getSettings } from '../lib/settings';
import { DECK_TEMPLATES, DECK_PALETTES, templateById, paletteById, resolveTheme } from '../lib/deck-theme';

const EMPTY: DesignConfig = { templateId: 'boardroom', paletteId: 'default', accentHex: '#15a394', tagline: null, logo: null, disclaimerText: null, showSlideNumbers: true, canEdit: false };

export function Design() {
  const [cfg, setCfg] = useState<DesignConfig>(EMPTY);
  const [meta, setMeta] = useState({ firm: 'Your Firm', adviser: '' as string });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getDesign(), getSettings().catch(() => null)])
      .then(([d, s]) => {
        setCfg({ ...EMPTY, ...d });
        if (s) setMeta({ firm: s.firm.name || 'Your Firm', adviser: [s.adviser.fullName, s.adviser.title].filter(Boolean).join(' · ') });
      })
      .catch(() => setError('Could not load design settings.'))
      .finally(() => setLoading(false));
  }, []);

  const ro = !cfg.canEdit;
  const set = <K extends keyof DesignConfig>(k: K, v: DesignConfig[K]) => { setCfg((c) => ({ ...c, [k]: v })); setSaved(false); };
  const pickTemplate = (id: string) => { if (ro) return; setCfg((c) => ({ ...c, templateId: id, accentHex: templateById(id).accent })); setSaved(false); };
  const pickPalette = (id: string) => { if (ro) return; const p = paletteById(id); setCfg((c) => ({ ...c, paletteId: id, accentHex: p.accent ?? c.accentHex })); setSaved(false); };

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => set('logo', r.result as string); r.readAsDataURL(f);
    e.target.value = '';
  };

  async function onSave() {
    setSaving(true); setError(null);
    try { const { canEdit, ...body } = cfg; await saveDesign(body); setSaved(true); }
    catch { setError('Save failed — only a firm admin can change the design.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ color: 'var(--muted)' }}>Loading…</div>;

  const theme = resolveTheme(cfg.templateId, cfg.paletteId, cfg.accentHex);

  return (
    <div style={{ maxWidth: 940 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Design</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>Pick a template and set your branding once — it themes the cover, the accent and the chart palette on every deck you export.{ro && ' Read-only — only a firm admin can change the design.'}</p>
      </header>

      {/* Deck template */}
      <Section title="Deck template" subtitle="Applies to the PPTX cover, accent and chart colours">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {DECK_TEMPLATES.map((t) => {
            const on = t.id === cfg.templateId;
            return (
              <button key={t.id} onClick={() => pickTemplate(t.id)} disabled={ro} style={{ textAlign: 'left', border: `2px solid ${on ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 10, background: 'var(--surface)', padding: 0, overflow: 'hidden', cursor: ro ? 'default' : 'pointer' }}>
                <div style={{ height: 78, background: t.deep, position: 'relative', padding: 12 }}>
                  <div style={{ width: 26, height: 3, background: t.accent, marginBottom: 7 }} />
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, textTransform: t.caps ? 'uppercase' : 'none', fontFamily: t.serif ? 'Georgia, serif' : 'inherit' }}>Growth of €10,000</div>
                  <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', gap: 3, alignItems: 'flex-end', height: 22 }}>
                    {t.chart.slice(0, 5).map((c, i) => <span key={i} style={{ width: 7, background: c, height: [42, 66, 30, 78, 54][i] + '%' }} />)}
                  </div>
                </div>
                <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.note}</div></div>
                  {on && <span style={{ color: 'var(--accent-deep, #0b544a)', fontWeight: 700 }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Colour palette */}
      <Section title="Colour palette" subtitle="Sets the accent and the order chart series are coloured">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {DECK_PALETTES.map((p) => {
            const on = p.id === cfg.paletteId;
            const strip = p.chart ?? theme.chart;
            return (
              <button key={p.id} onClick={() => pickPalette(p.id)} disabled={ro} style={{ border: `2px solid ${on ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 8, background: 'var(--surface)', padding: 10, cursor: ro ? 'default' : 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', marginBottom: 7 }}>
                  {strip.slice(0, 6).map((c, i) => <span key={i} style={{ flex: 1, height: 16, background: c }} />)}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Live cover preview */}
      <Section title="Cover preview" subtitle={`${theme.templateName} · rendered like the export`}>
        <div style={{ width: '100%', maxWidth: 560, aspectRatio: '16 / 9', background: theme.deep, borderRadius: 10, padding: '28px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', border: '1px solid var(--line)' }}>
          {cfg.logo && <img src={cfg.logo} alt="logo" style={{ position: 'absolute', top: 22, left: 30, height: 30, objectFit: 'contain' }} />}
          <div style={{ color: theme.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>CLIENT PRESENTATION</div>
          <div style={{ color: '#fff', fontSize: 30, fontWeight: 800, textTransform: theme.caps ? 'uppercase' : 'none', fontFamily: theme.serif ? 'Georgia, serif' : 'inherit' }}>{meta.firm}</div>
          {cfg.tagline && <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 15, marginTop: 6 }}>{cfg.tagline}</div>}
          <div style={{ width: 70, height: 3, background: theme.accent, margin: '16px 0' }} />
          {meta.adviser && <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>{meta.adviser}</div>}
        </div>
      </Section>

      {/* Branding + defaults */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <Section title="Branding" subtitle="Logo, accent and cover wording">
          <Field label="Accent colour">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={cfg.accentHex} disabled={ro} onChange={(e) => set('accentHex', e.target.value)} style={{ width: 42, height: 34, border: '1px solid var(--line)', borderRadius: 7, cursor: ro ? 'default' : 'pointer', padding: 2 }} />
              <input value={cfg.accentHex} readOnly={ro} onChange={(e) => set('accentHex', e.target.value)} placeholder="#15a394" style={{ ...inputStyle, maxWidth: 130 }} />
            </div>
          </Field>
          <Field label="Firm logo (shown on covers)">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={() => logoRef.current?.click()} disabled={ro} style={btnGhost}>↑ Upload</button>
              {cfg.logo && <><img src={cfg.logo} alt="logo" style={{ height: 30, objectFit: 'contain' }} /><button onClick={() => set('logo', null)} disabled={ro} style={btnGhost}>✕</button></>}
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogo} />
            </div>
          </Field>
          <Field label="Cover tagline"><input value={cfg.tagline ?? ''} readOnly={ro} onChange={(e) => set('tagline', e.target.value)} placeholder="Informed Investing" style={inputStyle} /></Field>
        </Section>

        <Section title="Presentation defaults" subtitle="Applied to every deck you export">
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, cursor: ro ? 'default' : 'pointer' }}>
            <input type="checkbox" checked={cfg.showSlideNumbers} disabled={ro} onChange={(e) => set('showSlideNumbers', e.target.checked)} />
            Show slide numbers on exported decks
          </label>
          <Field label="Disclaimer text (back cover + slide footers)">
            <textarea value={cfg.disclaimerText ?? ''} readOnly={ro} rows={4} onChange={(e) => set('disclaimerText', e.target.value)} placeholder="Past performance is not a reliable indicator of future results." style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </Section>
      </div>

      {/* Chart palette */}
      <Section title="Chart palette" subtitle="Series are coloured in this order on every chart">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {theme.chart.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid var(--line)' }} />
              <span style={{ color: 'var(--muted)' }}>{i + 1} · {c}</span>
            </div>
          ))}
        </div>
      </Section>

      {!ro && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button onClick={onSave} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving…' : 'Save design settings'}</button>
          {saved && <span style={{ color: 'var(--pos, #1c8a4e)', fontSize: 13.5 }}>✓ Saved</span>}
          {error && <span style={{ color: 'var(--neg, #c0392b)', fontSize: 13.5 }}>{error}</span>}
        </div>
      )}
      {ro && error && <span style={{ color: 'var(--neg, #c0392b)', fontSize: 13.5 }}>{error}</span>}
    </div>
  );
}

// ---- primitives ----
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 11px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' };
const btnGhost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 6, padding: '6px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const btnPrimary = (busy: boolean): React.CSSProperties => ({ border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 });

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 12.5, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</strong>
        {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
      {children}
    </label>
  );
}