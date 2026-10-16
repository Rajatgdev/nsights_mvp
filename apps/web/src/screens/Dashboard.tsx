import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeFundMetrics } from '@nsights/calc';
import { fetchFunds, fetchSeries, type FundMeta } from '../lib/funds';
import { listPortfolios, type SavedPortfolio } from '../lib/portfolios';
import { listRecentPresentations, getDeckBlob, downloadBlob, deleteDeck, type RecentPresentation } from '../lib/presentations';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/watchlist';
import { listNews, sourceInitial, sourceColor, type NewsItem } from '../lib/news';

// ESMA / risk-rating badge colours (1 low → 7 high)
const ESMA: Record<number, string> = { 1: '#2fa35f', 2: '#5cb338', 3: '#c9b21f', 4: '#e08a1e', 5: '#df5e2e', 6: '#d33f3f', 7: '#b62d2d' };

const fmtPct = (v: number | null) => (v == null ? '—' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%');
const posNeg = (v: number | null) => (v == null ? 'var(--muted)' : v >= 0 ? 'var(--pos, #1c8a4e)' : 'var(--neg, #c0392b)');
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; } };

interface WatchRow { fund: FundMeta; vol: number | null; ytd: number | null; r3: number | null; r5: number | null; r10: number | null; }

export function Dashboard() {
  const nav = useNavigate();
  const [allFunds, setAllFunds] = useState<FundMeta[]>([]);
  const [watchIds, setWatchIds] = useState<string[]>([]);
  const [rows, setRows] = useState<WatchRow[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<SavedPortfolio[] | null>(null);
  const [recent, setRecent] = useState<RecentPresentation[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetchFunds().then((r) => setAllFunds(r.funds)).catch(() => setAllFunds([]));
    listPortfolios().then(setSaved).catch(() => setSaved([]));
    setRecent(listRecentPresentations());
    listNews().then(setNews).catch(() => setNews([]));
    getWatchlist().then(setWatchIds).catch(() => setWatchIds([]));
  }, []);

  // recompute metrics whenever the watchlist changes
  useEffect(() => {
    if (watchIds.length === 0) { setRows([]); return; }
    let live = true;
    setRows(null);
    fetchSeries(watchIds)
      .then((r) => {
        if (!live) return;
        const out = r.funds.map((f) => {
          const m = computeFundMetrics({ dates: r.dates, series: f.prices });
          return { fund: f, vol: m.volFull, ytd: m.ytd, r3: m.r3, r5: m.r5, r10: m.r10 };
        });
        setRows(out);
      })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [watchIds]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allFunds
      .filter((f) => !watchIds.includes(f.id))
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.provider.toLowerCase().includes(q))
      .slice(0, 25);
  }, [allFunds, watchIds, query]);

  return (
    <div style={{ maxWidth: 940 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Dashboard</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>Model portfolios and performance insights for financial advisers.</p>
      </header>

      {/* Watchlist */}
      <Panel title="My Watchlist" subtitle="Funds you're keeping an eye on — live metrics from the latest data"
        action={<button onClick={() => setPicking((v) => !v)} style={btnSm}>{picking ? 'Done' : '+ Add funds'}</button>}>

        {picking && (
          <div style={{ marginBottom: 12, border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search funds by name or provider…"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, background: 'var(--surface)', color: 'var(--ink)', marginBottom: candidates.length ? 8 : 0 }} />
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {candidates.map((f) => (
                <button key={f.id} onClick={() => { addToWatchlist(f.id).then(setWatchIds).catch(() => {}); }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, textAlign: 'left', border: 'none', background: 'none', borderBottom: '1px solid var(--line-soft)', padding: '7px 2px', cursor: 'pointer', color: 'var(--ink)' }}>
                  <span><span style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</span> <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {f.provider}</span></span>
                  <span style={{ color: 'var(--accent-deep, #0b544a)', fontWeight: 700 }}>+</span>
                </button>
              ))}
              {query && candidates.length === 0 && <Muted>No matching funds.</Muted>}
            </div>
          </div>
        )}

        {watchIds.length === 0 ? <Muted>Your watchlist is empty — tap <b>+ Add funds</b> to start tracking funds.</Muted>
          : rows == null ? <Muted>Loading metrics…</Muted>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Fund', 'Volatility', 'Risk', 'YTD', '3Y p.a.', '5Y p.a.', '10Y p.a.', ''].map((h, i) => (
                      <th key={h || 'x'} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 10px', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ fund: f, vol, ytd, r3, r5, r10 }) => (
                    <tr key={f.id}>
                      <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--line-soft)' }}>
                        <div style={{ fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.provider}{f.category ? ` · ${f.category}` : ''}</div>
                      </td>
                      <td style={cellNum}>{vol == null ? '—' : (vol * 100).toFixed(1) + '%'}</td>
                      <td style={{ ...cellNum }}><span style={{ display: 'inline-block', minWidth: 20, padding: '2px 6px', borderRadius: 5, background: ESMA[f.risk] ?? 'var(--muted)', color: '#fff', fontWeight: 700, fontSize: 12 }}>{f.risk || '—'}</span></td>
                      <td style={{ ...cellNum, fontWeight: 700, color: posNeg(ytd) }}>{fmtPct(ytd)}</td>
                      <td style={{ ...cellNum, fontWeight: 700, color: posNeg(r3) }}>{fmtPct(r3)}</td>
                      <td style={{ ...cellNum, fontWeight: 700, color: posNeg(r5) }}>{fmtPct(r5)}</td>
                      <td style={{ ...cellNum, fontWeight: 700, color: posNeg(r10) }}>{fmtPct(r10)}</td>
                      <td style={{ ...cellNum, width: 1 }}>
                        <button style={btnGhost} title="Remove from watchlist" onClick={() => { removeFromWatchlist(f.id).then(setWatchIds).catch(() => {}); }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Panel>

      {/* Your saved portfolios (real) */}
      <Panel title="Your saved portfolios" subtitle="Model portfolios your firm has built in the Portfolio Builder"
        action={<button onClick={() => nav('/portfolio')} style={btnSm}>Open Portfolio Builder →</button>}>
        {saved == null ? <Muted>Loading…</Muted>
          : saved.length === 0 ? <Muted>No saved portfolios yet — build one in the Portfolio Builder.</Muted>
          : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {saved.map((p) => (
                <div key={p.id} style={rowItem}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.approach ?? 'Model portfolio'}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: p.kind === 'house' ? '#15a39422' : '#8453d622', color: p.kind === 'house' ? 'var(--accent-deep, #0b544a)' : '#5b3aa8', border: `1px solid ${p.kind === 'house' ? '#15a39444' : '#8453d644'}` }}>{p.kind === 'house' ? 'House' : 'Personal'}</span>
                </div>
              ))}
            </div>
          )}
      </Panel>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <Panel title="Recent presentations" subtitle="Decks you've exported">
          {recent.length === 0 ? <Muted>No presentations yet — add charts to the slide rail and export a deck.</Muted>
            : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recent.map((p) => (
                  <div key={p.id} style={rowItem}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>📅 {fmtDate(p.date)} · {p.slideCount} slide{p.slideCount === 1 ? '' : 's'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button style={btnSm} onClick={async () => {
                        const b = await getDeckBlob(p.id);
                        if (b) downloadBlob(b, `${p.name}.pptx`);
                        else alert('This deck was exported before downloads were saved, so the file isn’t stored. Re-export it to keep a copy.');
                      }}>Download</button>
                      <button style={btnGhost} title="Remove" onClick={async () => { await deleteDeck(p.id); setRecent(listRecentPresentations()); }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Panel>

        <Panel title="Recent news" subtitle="Industry updates and provider announcements">
          {news.length === 0 ? <Muted>No news yet.</Muted> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {news.map((n) => {
                const row = (
                  <>
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 7, background: sourceColor(n.source), color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{sourceInitial(n.source)}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{n.source} · {fmtDate(n.publishedAt)}</div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, margin: '1px 0' }}>{n.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{n.body}</div>
                    </div>
                  </>
                );
                return n.url
                  ? <a key={n.id} href={n.url} target="_blank" rel="noreferrer" style={{ ...rowItem, alignItems: 'flex-start', gap: 10, textDecoration: 'none', color: 'inherit' }}>{row}</a>
                  : <div key={n.id} style={{ ...rowItem, alignItems: 'flex-start', gap: 10 }}>{row}</div>;
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---- small presentational helpers ----
const cellNum: React.CSSProperties = { textAlign: 'right', padding: '9px 10px', borderBottom: '1px solid var(--line-soft)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const rowItem: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 2px', borderBottom: '1px solid var(--line-soft)' };
const btnSm: React.CSSProperties = { border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--accent-deep, #0b544a)', borderRadius: 6, padding: '5px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)', borderRadius: 6, padding: '5px 9px', fontSize: 12.5, cursor: 'pointer' };

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
        <div>
          <strong style={{ fontSize: 14 }}>{title}</strong>
          {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 2px' }}>{children}</div>;
}