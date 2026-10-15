import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSlides, type Slide } from '../lib/slides';
import { exportPptx } from '../lib/export';

export function SlideRail() {
  const { slides, remove, reorder } = useSlides();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const total = slides.length + 2; // cover + closing

  return (
    <aside style={{ width: 288, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'var(--surface)', padding: 16, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>Presentation</strong>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{total} slides</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Fixed cover */}
        <FixedCard idx={1} kind="cover" />

        {slides.length === 0 && (
          <div style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: '18px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            Click <strong style={{ color: 'var(--accent-deep)' }}>+ Slide</strong> on a chart to add it here.
          </div>
        )}

        {slides.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragEnd={() => { if (drag != null && over != null) reorder(drag, over); setDrag(null); setOver(null); }}
            onDrop={(e) => { e.preventDefault(); if (drag != null) reorder(drag, i); setDrag(null); setOver(null); }}
            style={{
              border: `1px solid ${over === i && drag !== i ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 8, overflow: 'hidden', background: 'var(--surface)',
              opacity: drag === i ? 0.5 : 1, cursor: 'grab',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>⠿</span>
              <span className="tnum" style={{ fontSize: 11, color: 'var(--muted)' }}>{i + 2}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
              <button onClick={() => remove(s.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 6 }}><Thumb slide={s} /></div>
          </div>
        ))}

        {/* Fixed closing */}
        <FixedCard idx={total} kind="closing" />
      </div>

      <button
        disabled={slides.length === 0 || busy}
        onClick={async () => { setBusy(true); try { await exportPptx(slides); } finally { setBusy(false); } }}
        style={{
          width: '100%', marginTop: 14, padding: '9px 0', borderRadius: 6, border: 'none', fontWeight: 600,
          background: slides.length ? 'var(--accent)' : 'var(--line)', color: slides.length ? '#fff' : 'var(--muted)',
          cursor: slides.length && !busy ? 'pointer' : 'default',
        }}>{busy ? 'Building…' : 'Download PPTX'}</button>
    </aside>
  );
}

function FixedCard({ idx, kind }: { idx: number; kind: 'cover' | 'closing' }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid var(--line-soft)' }}>
        <span className="tnum" style={{ fontSize: 11, color: 'var(--muted)' }}>{idx}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{kind === 'cover' ? 'Cover' : 'Disclaimer'}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: 10, padding: '1px 6px' }}>fixed</span>
      </div>
      {kind === 'cover' ? (
        <div style={{ height: 72, background: 'var(--navy)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Client Presentation</div>
          <div style={{ fontSize: 10.5, opacity: 0.7 }}>Prepared by your firm</div>
        </div>
      ) : (
        <div style={{ height: 72, background: 'var(--raised)', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 10.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
          Past performance is not a reliable indicator of future results.
        </div>
      )}
    </div>
  );
}

function Thumb({ slide }: { slide: Slide }) {
  if (slide.kind === 'table' && slide.table) {
    const { head, rows } = slide.table;
    return (
      <div style={{ fontSize: 9.5, color: 'var(--ink-soft)' }}>
        {rows.slice(0, 4).map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 2px', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[0]}</span>
            <span className="tnum" style={{ color: 'var(--muted)' }}>{r[2]}</span>
          </div>
        ))}
      </div>
    );
  }
  return <ReactECharts option={thumbOption(slide.option)} style={{ height: 88 }} opts={{ renderer: 'svg' }} notMerge />;
}

function thumbOption(o: unknown) {
  const opt = o as any;
  const axis = (a: any) => (a ? { ...a, axisLabel: { show: false }, axisTick: { show: false }, splitLine: { show: false } } : a);
  return {
    ...opt,
    legend: { show: false },
    tooltip: { show: false },
    grid: { left: 6, right: 6, top: 6, bottom: 6 },
    xAxis: Array.isArray(opt.xAxis) ? opt.xAxis.map(axis) : axis(opt.xAxis),
    yAxis: Array.isArray(opt.yAxis) ? opt.yAxis.map(axis) : axis(opt.yAxis),
  };
}