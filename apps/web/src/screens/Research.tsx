import { useEffect, useMemo, useState } from 'react';
import { PROVIDER_COLOURS, ASSET_CLASSES } from '@nsights/shared';
import { fetchSeries } from '../lib/funds';
import { buildCharts, type FundSeries } from '../lib/charts';
import { ChartCard } from '../components/ChartCard';

const RISK_COLORS = ['#1c8a4e', '#4a9e3e', '#9bab2e', '#caa023', '#e6800a', '#d9542b', '#c0392b'];

export function Research() {
  const [funds, setFunds] = useState<FundSeries[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [dataMonth, setDataMonth] = useState('');
  const [prov, setProv] = useState<string | null>(null);
  const [acls, setAcls] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSeries([])
      .then((r) => {
        setFunds(r.funds as FundSeries[]);
        setDates(r.dates);
        setDataMonth(r.dataMonth);
        setProv((p) => p ?? r.funds[0]?.provider ?? null);
      })
      .catch(() => setErr('Could not load funds.'));
  }, []);

  const providers = useMemo(() => [...new Set(funds.map((f) => f.provider))], [funds]);
  const list = useMemo(
    () => funds.filter((f) => f.provider === prov && (acls.length === 0 || acls.includes((f as any).cls))),
    [funds, prov, acls],
  );
  const selectedFunds = useMemo(() => funds.filter((f) => selected.has(f.id)), [funds, selected]);
  const charts = useMemo(() => buildCharts(selectedFunds, dates), [selectedFunds, dates]);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAcl = (c: string) =>
    setAcls((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));

  if (err) return <div style={{ color: 'var(--neg)' }}>{err}</div>;

  return (
    <div style={{ maxWidth: 940 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Research &amp; Comparisons</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>
          Research investment options and compare performance. Data as at {fmtMonth(dataMonth)}.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
        <div style={{ padding: '8px 2px', marginBottom: -1, borderBottom: '2px solid var(--accent)', color: 'var(--ink)', fontWeight: 600, fontSize: 14 }}>
          Investment Research
        </div>
      </div>

      <section style={panel}>
        <div style={panelHd}>
          <strong style={{ fontSize: 14 }}>Fund Selection</strong>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Select a provider to view available funds</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 14px 0' }}>
          {providers.map((p) => <button key={p} onClick={() => setProv(p)} style={provTab(p === prov)}>{p}</button>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '12px 14px' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 2 }}>Asset class</span>
          {ASSET_CLASSES.map((c) => <button key={c} onClick={() => toggleAcl(c)} style={chip(acls.includes(c))}>{c}</button>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 14px 14px' }}>
          {list.map((f) => {
            const on = selected.has(f.id);
            const color = PROVIDER_COLOURS[f.provider] ?? '#7b8a92';
            const meta = f as any;
            return (
              <div key={f.id} style={fundCard(on)}>
                <div style={{ ...badge, background: color }}>{f.provider[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta.cls} · {meta.category} · AMC {f.amc}%</div>
                </div>
                <span style={riskPill(f.risk)}>Risk {f.risk}</span>
                <button onClick={() => toggle(f.id)} style={addBtn(on)}>{on ? '✓ Added' : '+ Compare'}</button>
              </div>
            );
          })}
          {list.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 2px' }}>No funds match this filter.</div>}
        </div>
      </section>

      <section style={{ ...panel, marginTop: 16 }}>
        <div style={panelHd}>
          <strong style={{ fontSize: 14 }}>Comparing {selectedFunds.length} fund{selectedFunds.length === 1 ? '' : 's'}</strong>
          {selectedFunds.length > 0 && <button onClick={() => setSelected(new Set())} style={{ border: 'none', background: 'none', color: 'var(--accent-deep)', fontSize: 12.5, fontWeight: 600 }}>Clear</button>}
        </div>
        <div style={{ padding: 14 }}>
          {selectedFunds.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Pick funds above to compare them — charts appear below.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedFunds.map((f) => (
                <span key={f.id} style={selChip}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: PROVIDER_COLOURS[f.provider] ?? '#7b8a92' }} />
                  {f.name}
                  <button onClick={() => toggle(f.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Charts — recompute from selection; each has + Slide */}
      {charts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {charts.map((spec) => (
            <ChartCard key={spec.key} spec={spec} fundIds={[...selected]} />
          ))}
        </div>
      )}
    </div>
  );
}

function fmtMonth(iso: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
const panel: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 };
const panelHd: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' };
const badge: React.CSSProperties = { width: 30, height: 30, borderRadius: 7, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 };
const selChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 9px', border: '1px solid var(--line)', borderRadius: 20, fontSize: 12.5, background: 'var(--paper)' };
function provTab(on: boolean): React.CSSProperties { return { padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink-soft)' }; }
function chip(on: boolean): React.CSSProperties { return { padding: '4px 10px', borderRadius: 14, fontSize: 12, border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent-wash)' : 'var(--surface)', color: on ? 'var(--accent-deep)' : 'var(--muted)' }; }
function fundCard(on: boolean): React.CSSProperties { return { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent-wash)' : 'var(--surface)' }; }
function riskPill(risk: number): React.CSSProperties { const c = RISK_COLORS[Math.min(Math.max(risk, 1), 7) - 1]; return { fontSize: 11.5, fontWeight: 600, color: c, border: `1px solid ${c}33`, background: `${c}14`, borderRadius: 12, padding: '3px 9px', flexShrink: 0 }; }
function addBtn(on: boolean): React.CSSProperties { return { padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, flexShrink: 0, border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent)' : 'var(--surface)', color: on ? '#fff' : 'var(--accent-deep)' }; }