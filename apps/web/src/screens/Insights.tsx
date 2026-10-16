import { useEffect, useRef, useState } from 'react';
import { INSIGHTS_TABS, INSIGHTS_AS_AT, INSIGHTS_SOURCE } from '../lib/insights-charts';
import { ChartCard } from '../components/ChartCard';
import { me } from '../lib/session';
import { useSlides } from '../lib/slides';
import { listDecks, uploadDeck, deleteDeck, prettySize, listAuthorSlides, type Deck, type AuthorDeck } from '../lib/insights-decks';

const AUTHOR_TAB = '__author';

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; } };

export function Insights() {
  const [tab, setTab] = useState(INSIGHTS_TABS[0].id);
  const active = INSIGHTS_TABS.find((t) => t.id === tab) ?? INSIGHTS_TABS[0];

  const [isPlatform, setIsPlatform] = useState(false);
  const [decks, setDecks] = useState<Deck[] | null>(null);

  async function loadDecks() { try { setDecks(await listDecks()); } catch { setDecks([]); } }
  useEffect(() => {
    me().then((m) => setIsPlatform(m?.user.role === 'platform_admin')).catch(() => {});
    loadDecks();
  }, []);

  return (
    <div style={{ maxWidth: 940 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Insights</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>Market insights — {INSIGHTS_SOURCE}. As at {INSIGHTS_AS_AT}.</p>
      </header>

      <DeckLibrary decks={decks} isPlatform={isPlatform} onChanged={loadDecks} />

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 18, flexWrap: 'wrap' }}>
        {INSIGHTS_TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(on)}>{t.label}</button>
          );
        })}
        <button onClick={() => setTab(AUTHOR_TAB)} style={tabStyle(tab === AUTHOR_TAB)}>From nSights</button>
      </div>

      {tab === AUTHOR_TAB ? (
        <AuthorSlides />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {active.charts.map((spec) => <ChartCard key={spec.key} spec={spec} fundIds={[]} />)}
        </div>
      )}
    </div>
  );
}

function tabStyle(on: boolean): React.CSSProperties {
  return {
    padding: '8px 14px', marginBottom: -1, border: 'none', background: 'none',
    borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
    color: on ? 'var(--ink)' : 'var(--muted)', fontWeight: on ? 600 : 500, fontSize: 13.5, cursor: 'pointer',
  };
}

// "From nSights" — Kaben's uploaded PDF decks, page by page. Each page is an
// image slide an adviser can drop straight into their own presentation.
function AuthorSlides() {
  const { add } = useSlides();
  const [decks, setDecks] = useState<AuthorDeck[] | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => { listAuthorSlides().then(setDecks).catch(() => setDecks([])); }, []);

  if (!decks) return <div style={{ color: 'var(--muted)' }}>Loading…</div>;
  if (decks.length === 0) return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 20, color: 'var(--muted)', fontSize: 14 }}>
      No author slides yet. When nSights publishes a PDF deck, its slides appear here — ready to add to your own presentation.
    </div>
  );

  function addPage(pageId: string, title: string, url: string) {
    add({ kind: 'image', title, imageUrl: url, fundIds: [] });
    setAdded((a) => ({ ...a, [pageId]: true }));
    setTimeout(() => setAdded((a) => ({ ...a, [pageId]: false })), 1400);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {decks.map((d) => (
        <section key={d.id}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{d.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
            {d.pages.map((p, i) => (
              <div key={p.id} style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                <img src={p.url} alt={`${d.title} ${i + 1}`} style={{ width: '100%', display: 'block', background: '#fff', aspectRatio: '16 / 9', objectFit: 'contain' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderTop: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Slide {i + 1}</span>
                  <button onClick={() => addPage(p.id, `${d.title} — ${i + 1}`, p.url)} style={addBtn(added[p.id])}>{added[p.id] ? '✓ Added' : '+ Slide'}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function addBtn(done: boolean): React.CSSProperties {
  return {
    border: `1px solid ${done ? 'var(--accent)' : 'var(--accent)'}`,
    background: done ? 'var(--accent)' : 'var(--surface)',
    color: done ? '#fff' : 'var(--accent-deep, #0b544a)',
    borderRadius: 6, padding: '4px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  };
}

function DeckLibrary({ decks, isPlatform, onChanged }: { decks: Deck[] | null; isPlatform: boolean; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  async function onUpload() {
    const f = fileRef.current?.files?.[0];
    if (!f) { setErr('Choose a PDF or PowerPoint file.'); return; }
    setBusy(true); setErr(null);
    try {
      await uploadDeck(f, title.trim() || f.name);
      setTitle(''); if (fileRef.current) fileRef.current.value = '';
      onChanged();
    } catch (e) {
      const m = String(e instanceof Error ? e.message : e);
      setErr(m.includes('larger') ? 'File is larger than 25MB.' : m.includes('allowed') ? 'Only PDF or PowerPoint files.' : 'Upload failed.');
    } finally { setBusy(false); }
  }
  async function onDelete(id: string) {
    setDelId(id);
    try { await deleteDeck(id); onChanged(); } finally { setDelId(null); }
  }

  // Non-platform users with no decks: hide the section entirely (nothing to show).
  if (!isPlatform && decks && decks.length === 0) return null;

  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 18 }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
        <strong style={{ fontSize: 14 }}>Insight decks</strong>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
          {isPlatform ? 'Upload decks here — every firm can download them.' : 'Published by nSights — download and share with clients.'}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {isPlatform && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: decks && decks.length ? 12 : 0 }}>
            <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" style={{ fontSize: 13 }} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" style={inputStyle} />
            <button onClick={onUpload} disabled={busy} style={btnPrimary(busy)}>{busy ? 'Uploading…' : 'Upload'}</button>
            {err && <span style={{ color: 'var(--neg)', fontSize: 12.5 }}>{err}</span>}
          </div>
        )}

        {!decks ? <Muted>Loading…</Muted> : decks.length === 0 ? <Muted>No decks yet.</Muted> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {decks.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 2px', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {(d.contentType?.includes('pdf') ? 'PDF' : 'PPT')} · {prettySize(d.sizeBytes)} · {fmtDate(d.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a href={d.url} target="_blank" rel="noreferrer" download style={btnSm}>Download</a>
                  {isPlatform && <button onClick={() => onDelete(d.id)} disabled={delId === d.id} style={{ ...btnGhost, color: '#c0392b' }}>Delete</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 2px' }}>{children}</div>;
}

const inputStyle: React.CSSProperties = { padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13.5, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' };
const btnSm: React.CSSProperties = { border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--accent-deep, #0b544a)', borderRadius: 6, padding: '5px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' };
const btnGhost: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)', borderRadius: 6, padding: '5px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const btnPrimary = (busy: boolean): React.CSSProperties => ({ border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 });