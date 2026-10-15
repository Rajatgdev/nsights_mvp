import { useEffect, useMemo, useState } from 'react';
import {
  analyse, suggest, type Approach, type HoldingInput, type CandidateFund,
} from '@nsights/portfolio';
import { volatility, annualised } from '@nsights/calc';
import { PROVIDER_COLOURS } from '@nsights/shared';
import { fetchSeries } from '../lib/funds';
import { listPortfolios, getPortfolio, savePortfolio, deletePortfolio, type SavedPortfolio } from '../lib/portfolios';
import { ChartCard } from '../components/ChartCard';
import type { FundSeries, ChartSpec } from '../lib/charts';

type Step = 'approach' | 'provider' | 'funds' | 'analysis';

const APPROACHES: { id: Approach; name: string; desc: string; bestFor: string; funds: string }[] = [
  { id: 'core-satellite', name: 'Core / Satellite', desc: 'One dominant core fund (60–80%) anchors the portfolio with 2–3 satellite holdings adding diversification.', bestFor: 'Clients who want simplicity with a degree of tactical flexibility.', funds: '3–4 funds · Core 60–80% · Satellites 10–20% each' },
  { id: 'equal-weighted', name: 'Equal-weighted', desc: 'All funds carry the same weight — no single manager or style dominates.', bestFor: 'Clients who prefer systematic, rules-based investing without active tilts.', funds: '3–6 funds · All equally weighted' },
  { id: 'multi-manager', name: 'Multi-manager', desc: 'Multiple specialist managers each running a portion, curated to avoid overlap.', bestFor: 'Clients who want professional diversification across investment processes.', funds: '3–5 funds · Each manager contributes differently' },
  { id: 'multi-strategy', name: 'Multi-strategy', desc: 'Different investment strategies (passive, active, ESG, income) combined at the portfolio level.', bestFor: 'Clients with specific objectives across cost, sustainability and income.', funds: '3–5 funds · Each fund plays a different role' },
];
const RISK_COLORS = ['#1c8a4e', '#4a9e3e', '#9bab2e', '#caa023', '#e6800a', '#d9542b', '#c0392b'];
const pctStr = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

export function Portfolio() {
  const [funds, setFunds] = useState<FundSeries[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('approach');
  const [approach, setApproach] = useState<Approach>('core-satellite');
  const [provider, setProvider] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [weightBp, setWeightBp] = useState<Record<string, number>>({});

  const [saved, setSaved] = useState<SavedPortfolio[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => { fetchSeries([]).then((r) => { setFunds(r.funds as FundSeries[]); setDates(r.dates); }).catch(() => {}); }, []);
  useEffect(() => { refreshSaved(); }, []);
  function refreshSaved() { listPortfolios().then(setSaved).catch(() => {}); }

  async function doSave(kind: 'personal' | 'house') {
    if (!saveName.trim() || selected.length === 0) return;
    setSaveMsg(null);
    try {
      await savePortfolio({ name: saveName.trim(), kind, approach, holdings: inputs.map((h) => ({ fundId: h.fundId, weightBp: h.weightBp })) });
      setSaveMsg('Saved.'); setSaveName(''); refreshSaved();
    } catch { setSaveMsg('Could not save (house portfolios need firm-admin rights).'); }
  }
  async function loadPortfolio(id: string) {
    const p = await getPortfolio(id);
    const ids = p.holdings.map((h) => h.fundId);
    const w: Record<string, number> = {}; p.holdings.forEach((h) => { w[h.fundId] = h.weightBp; });
    setApproach((p.approach as Approach) ?? 'core-satellite');
    setSelected(ids); setWeightBp(w); setProvider(byId[ids[0]]?.provider ?? null); setStep('analysis');
  }
  async function removeSaved(id: string) { await deletePortfolio(id).catch(() => {}); refreshSaved(); }

  const byId = useMemo(() => Object.fromEntries(funds.map((f) => [f.id, f])) as Record<string, FundSeries>, [funds]);
  const providers = useMemo(() => [...new Set(funds.map((f) => f.provider))], [funds]);
  const quick = useMemo(() => {
    const m: Record<string, { vol: number | null; r5: number | null }> = {};
    for (const f of funds) m[f.id] = { vol: volatility(f.prices), r5: annualised(f.prices, 60) };
    return m;
  }, [funds]);

  const providerFunds = useMemo(() => funds.filter((f) => f.provider === provider), [funds, provider]);
  const inputs = useMemo(() => buildInputs(selected, weightBp, byId), [selected, weightBp, byId]);
  const analysis = useMemo(() => (inputs.length ? analyse({ holdings: inputs, dates }) : null), [inputs, dates]);
  const universe: CandidateFund[] = useMemo(
    () => funds.map((f) => ({ fundId: f.id, name: f.name, provider: f.provider, assetClass: (f as any).cls, riskRating: f.risk })),
    [funds],
  );
  const suggestions = useMemo(() => suggest(approach, inputs, universe), [approach, inputs, universe]);

  function addFund(id: string) {
    setSelected((s) => (s.includes(id) ? s : [...s, id]));
    setWeightBp((w) => equaliseMap([...selected.filter((x) => x !== id), id]));
  }
  function removeFund(id: string) {
    const next = selected.filter((x) => x !== id);
    setSelected(next); setWeightBp(equaliseMap(next));
  }
  function equaliseMap(ids: string[]): Record<string, number> {
    const n = ids.length; if (!n) return {};
    const each = Math.round(10000 / n);
    const m: Record<string, number> = {};
    ids.forEach((id, i) => { m[id] = i === 0 ? 10000 - each * (n - 1) : each; });
    return m;
  }

  // ----- STEP 1 : APPROACH -----
  if (step === 'approach') {
    return (
      <Wrap>
        <Head sub="Choose a construction approach — it decides how many funds you need, each one's role and how they're weighted." />
        {saved.length > 0 && (
          <section style={{ ...panel, marginBottom: 16 }}>
            <div style={panelHd}><strong style={{ fontSize: 14 }}>Saved portfolios</strong></div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 7 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.kind === 'house' ? 'House' : 'Personal'}{p.approach ? ` · ${label(p.approach as Approach)}` : ''}</div>
                  </div>
                  <button onClick={() => loadPortfolio(p.id)} style={ghost}>Open</button>
                  <button onClick={() => removeSaved(p.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15 }}>×</button>
                </div>
              ))}
            </div>
          </section>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {APPROACHES.map((a) => (
            <div key={a.id} style={{ ...panel, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '8px 0', lineHeight: 1.5 }}>{a.desc}</p>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}><b style={{ color: 'var(--ink-soft)' }}>Best for</b> {a.bestFor}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}><b style={{ color: 'var(--ink-soft)' }}>Funds needed</b> {a.funds}</div>
              <button onClick={() => { setApproach(a.id); setStep('provider'); }} style={{ ...primary, width: '100%', marginTop: 12 }}>Build {a.name} portfolio →</button>
            </div>
          ))}
        </div>
      </Wrap>
    );
  }

  // ----- STEP 2 : PROVIDER -----
  if (step === 'provider') {
    return (
      <Wrap>
        <Steps step={2} onBack={() => setStep('approach')} />
        <Head title="Select a provider" sub={`Building ${label(approach)}. All funds come from one provider's range.`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {providers.map((p) => {
            const pf = funds.filter((f) => f.provider === p);
            const byCls: Record<string, number> = {};
            pf.forEach((f) => { byCls[(f as any).cls] = (byCls[(f as any).cls] ?? 0) + 1; });
            const risks = pf.map((f) => f.risk);
            return (
              <div key={p} style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: PROVIDER_COLOURS[p] ?? '#7b8a92', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{p[0]}</div>
                  <strong style={{ fontSize: 14 }}>{p}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{pf.length} funds · Risk {Math.min(...risks)}–{Math.max(...risks)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                  {Object.entries(byCls).map(([c, n]) => (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--ink-soft)' }}>{c}</span><span className="tnum" style={{ color: 'var(--muted)' }}>{n}</span></div>
                  ))}
                </div>
                <button onClick={() => { setProvider(p); setStep('funds'); }} style={{ ...primary, width: '100%', marginTop: 12 }}>Select →</button>
              </div>
            );
          })}
        </div>
      </Wrap>
    );
  }

  // ----- STEP 3 : FUNDS -----
  if (step === 'funds') {
    return (
      <Wrap>
        <Steps step={3} onBack={() => setStep('provider')} />
        <Head title={`Select funds · ${provider}`} sub={`${label(approach)} — click Add to build your mix. Funds stay selected across providers.`} right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep('provider')} style={ghost}>+ Another provider</button>
            <button disabled={selected.length === 0} onClick={() => setStep('analysis')} style={{ ...primary, opacity: selected.length ? 1 : 0.5 }}>Continue to analysis →</button>
          </div>
        } />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
          <section style={panel}>
            <div style={panelHd}><strong style={{ fontSize: 14 }}>Available funds</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 520, overflow: 'auto' }}>
              {providerFunds.map((f) => {
                const on = selected.includes(f.id); const q = quick[f.id];
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', background: on ? 'var(--accent-wash)' : 'transparent' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        <span style={{ color: RISK_COLORS[f.risk - 1] }}>Risk {f.risk}</span> · {(f as any).cls} · {pctStr(q?.vol)} vol · {pctStr(q?.r5)} 5yr
                      </div>
                    </div>
                    <button onClick={() => (on ? removeFund(f.id) : addFund(f.id))} style={on ? { ...primary } : { ...ghost }}>{on ? '✓ Added' : '+ Add'}</button>
                  </div>
                );
              })}
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={panel}>
              <div style={panelHd}><strong style={{ fontSize: 14 }}>Selected ({selected.length})</strong></div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Add funds from the left.</div> :
                  selected.map((id) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 7 }}>
                      <span style={{ flex: 1, fontSize: 12.5 }}>{byId[id]?.name}</span>
                      <button onClick={() => removeFund(id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
              </div>
            </section>

            {analysis && analysis.warnings.length > 0 && (
              <section style={{ ...panel, borderColor: '#8a641244' }}>
                <div style={{ ...panelHd, color: 'var(--amber,#8a6412)' }}><strong style={{ fontSize: 14 }}>Considerations</strong></div>
                <div style={{ padding: 12 }}>
                  {analysis.warnings.map((w) => <div key={w.code} style={{ fontSize: 12.5, color: 'var(--amber,#8a6412)', marginBottom: 6 }}>⚠ {w.message}</div>)}
                </div>
              </section>
            )}

            {suggestions.length > 0 && (
              <section style={panel}>
                <div style={panelHd}><strong style={{ fontSize: 14 }}>Suggested additions</strong></div>
                <div style={{ padding: 12 }}>
                  {suggestions.map((s) => (
                    <div key={s.fundId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Risk {s.riskRating} · {s.reason}</div>
                      </div>
                      <button onClick={() => addFund(s.fundId)} style={ghost}>+ Add</button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </Wrap>
    );
  }

  // ----- STEP 4 : ANALYSIS -----
  const totalPct = selected.reduce((a, id) => a + (weightBp[id] ?? 0), 0) / 100;
  const blendChart = analysis ? blendPerf(analysis.blendSeries, inputs, dates) : null;
  return (
    <Wrap>
      <Steps step={4} onBack={() => setStep('funds')} />
      <Head title={`Portfolio analysis${provider ? ' · ' + provider : ''}`} sub={`${label(approach)} · ${selected.length} funds`} right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Portfolio name…" style={{ padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, width: 170 }} />
          <button disabled={!saveName.trim() || selected.length === 0} onClick={() => doSave('personal')} style={{ ...primary, opacity: saveName.trim() && selected.length ? 1 : 0.5 }}>Save</button>
          <button disabled={!saveName.trim()} onClick={() => doSave('house')} style={{ ...ghost, opacity: saveName.trim() ? 1 : 0.5 }}>Save as house</button>
          {saveMsg && <span style={{ fontSize: 12, color: saveMsg === 'Saved.' ? 'var(--pos)' : 'var(--neg)' }}>{saveMsg}</span>}
        </div>
      } />

      {analysis && (
        <>
          {/* Weights */}
          <section style={{ ...panel, marginBottom: 16 }}>
            <div style={panelHd}>
              <div><strong style={{ fontSize: 14 }}>Fund weights</strong> <span style={{ fontSize: 12, color: Math.abs(totalPct - 100) < 0.5 ? 'var(--muted)' : 'var(--amber,#8a6412)' }}>Total {totalPct.toFixed(0)}%{Math.abs(totalPct - 100) >= 0.5 && ' — normalised for analysis'}</span></div>
              <button onClick={() => setWeightBp(equaliseMap(selected))} style={ghost}>Equalise</button>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selected.map((id) => {
                const pct = Math.round((weightBp[id] ?? 0) / 100);
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{byId[id]?.name}</span>
                    <input type="range" min={0} max={100} value={pct} onChange={(e) => setWeightBp((w) => ({ ...w, [id]: Number(e.target.value) * 100 }))} style={{ flex: 1.3, accentColor: 'var(--accent)' }} />
                    <span className="tnum" style={{ width: 44, textAlign: 'right', fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Volatility band */}
          <section style={{ ...panel, marginBottom: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Indicative risk — class {analysis.indicativeRiskClass ?? '—'} · {analysis.riskLabel}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>From the blend's historical volatility ({blendVolPct(analysis)}). Not a PRIIPs SRI.</div>
            <VolBand volPct={blendVolNum(analysis)} />
          </section>

          {/* Profile + fund notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <section style={{ ...panel, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Portfolio profile</div>
              <Row k="Structure" v={analysis.structure} />
              <Row k="Risk profile" v={analysis.riskLabel} />
              <Row k="Average fund risk" v={analysis.averageFundRisk.toFixed(1)} />
              <Row k="Indicative class" v={analysis.indicativeRiskClass ?? '—'} />
              {analysis.historyLimitedBy && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>History from {fmt(analysis.historyLimitedBy.startDate)} (limited by {analysis.historyLimitedBy.name}).</div>}
            </section>
            <section style={{ ...panel, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Fund notes</div>
              {inputs.map((h) => (
                <div key={h.fundId} style={{ padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><b>{h.name}</b><span className="tnum" style={{ color: 'var(--accent-deep)' }}>{Math.round(h.weightBp / 100)}%</span></div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{h.assetClass} · Risk {h.riskRating} · AMC {byId[h.fundId]?.amc}%</div>
                </div>
              ))}
            </section>
          </div>

          {/* Blended performance */}
          {blendChart && <ChartCard spec={blendChart} fundIds={selected} />}
        </>
      )}
    </Wrap>
  );
}

// ---------- helpers ----------
function buildInputs(selected: string[], weightBp: Record<string, number>, byId: Record<string, FundSeries>): HoldingInput[] {
  if (!selected.length) return [];
  const raw = selected.map((id) => ({ id, w: weightBp[id] ?? Math.round(10000 / selected.length) }));
  const t = raw.reduce((a, r) => a + r.w, 0) || 1;
  const list = raw.map((r) => { const f = byId[r.id]!; return { fundId: r.id, name: f.name, provider: f.provider, assetClass: (f as any).cls, riskRating: f.risk, weightBp: Math.round((r.w / t) * 10000), series: f.prices } as HoldingInput; });
  const s = list.reduce((a, h) => a + h.weightBp, 0); if (list.length) list[0].weightBp += 10000 - s;
  return list;
}
function label(a: Approach) { return APPROACHES.find((x) => x.id === a)?.name ?? a; }
function blendVolNum(a: { metrics: Record<string, unknown> }): number { const v = (a.metrics as any).volFull as number | null; return v == null ? 0 : v * 100; }
function blendVolPct(a: { metrics: Record<string, unknown> }) { const v = (a.metrics as any).volFull as number | null; return v == null ? '—' : `${(v * 100).toFixed(1)}%`; }
function fmt(iso: string | null) { return iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IE', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—'; }

function blendPerf(blendSeries: (number | null)[], inputs: HoldingInput[], dates: string[]): ChartSpec | null {
  const start = blendSeries.findIndex((v) => v != null); if (start < 0) return null;
  const x = dates.slice(start);
  const toPct = (arr: (number | null)[]) => { const base = arr[start]; return arr.slice(start).map((v) => (v == null || base == null ? null : +((v / base - 1) * 100).toFixed(1))); };
  const series: any[] = [{ name: 'Blended', type: 'line', showSymbol: false, lineStyle: { width: 3, color: '#15a394' }, itemStyle: { color: '#15a394' }, data: toPct(blendSeries) }];
  inputs.forEach((h) => { const c = PROVIDER_COLOURS[h.provider] ?? '#9aa3b8'; series.push({ name: h.name, type: 'line', showSymbol: false, lineStyle: { width: 1.3, type: 'dashed', color: c }, itemStyle: { color: c }, data: toPct(h.series ?? []) }); });
  return {
    key: 'portfolioBlend', title: 'Blended performance vs individual funds', kind: 'echarts',
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : v + '%') },
      legend: { bottom: 0, type: 'scroll', data: series.map((s) => s.name) },
      grid: { left: 52, right: 16, top: 12, bottom: 44 },
      xAxis: { type: 'category', boundaryGap: false, data: x, axisLabel: { formatter: (v: string) => v.slice(0, 4) } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series,
    },
  };
}

// ---------- small components ----------
function Wrap({ children }: { children: React.ReactNode }) { return <div style={{ maxWidth: 1000 }}>{children}</div>; }
function Head({ title = 'Portfolio Builder', sub, right }: { title?: string; sub: string; right?: React.ReactNode }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
      <div><h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>{title}</h1><p style={{ color: 'var(--muted)', marginTop: 2, maxWidth: 640 }}>{sub}</p></div>
      {right}
    </header>
  );
}
function Steps({ step, onBack }: { step: number; onBack: () => void }) {
  const names = ['Approach', 'Provider', 'Fund Selection', 'Analysis'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      {names.map((n, i) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: i + 1 <= step ? 1 : 0.4 }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: i + 1 <= step ? 'var(--accent)' : 'var(--line)', color: '#fff', fontSize: 11, display: 'grid', placeItems: 'center' }}>{i + 1 < step ? '✓' : i + 1}</span>
          <span style={{ fontSize: 12.5, fontWeight: i + 1 === step ? 600 : 400 }}>{n}</span>
          {i < 3 && <span style={{ width: 20, height: 1, background: 'var(--line)' }} />}
        </div>
      ))}
      <button onClick={onBack} style={{ ...ghost, marginLeft: 'auto' }}>← Back</button>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--line-soft)', fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>{k}</span><b>{v}</b></div>;
}
function VolBand({ volPct }: { volPct: number }) {
  const segs = [{ l: 'Cautious', c: '#eaf5ee' }, { l: 'Balanced', c: '#fdf6e3' }, { l: 'Growth', c: '#fbeee3' }, { l: 'High', c: '#fae3e3' }];
  const pos = Math.min(Math.max(volPct, 0), 20) / 20 * 100;
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden' }}>
        {segs.map((s) => <div key={s.l} style={{ flex: 1, background: s.c, display: 'grid', placeItems: 'center', fontSize: 10.5, color: 'var(--ink-soft)' }}>{s.l}</div>)}
        <div style={{ position: 'absolute', left: `${pos}%`, top: -4, bottom: -4, width: 2, background: 'var(--ink)' }} />
        <div style={{ position: 'absolute', left: `${pos}%`, top: -18, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, background: 'var(--ink)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>{volPct.toFixed(1)}%</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}><span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%+</span></div>
    </div>
  );
}

const panel: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 };
const panelHd: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' };
const primary: React.CSSProperties = { border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--accent-deep)', borderRadius: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };