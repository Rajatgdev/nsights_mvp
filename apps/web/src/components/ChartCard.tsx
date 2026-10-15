import ReactECharts from 'echarts-for-react';
import { useSlides } from '../lib/slides';
import type { ChartSpec } from '../lib/charts';

export function ChartCard({ spec, fundIds }: { spec: ChartSpec; fundIds: string[] }) {
  const { add } = useSlides();
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid var(--line-soft)',
      }}>
        <strong style={{ fontSize: 14 }}>{spec.title}</strong>
        <button
          onClick={() => add({ title: spec.title, kind: spec.kind, option: spec.option, table: spec.table, fundIds })}
          style={{
            border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--accent-deep)',
            borderRadius: 6, padding: '5px 11px', fontSize: 12.5, fontWeight: 600,
          }}>+ Slide</button>
      </div>
      <div style={{ padding: 12 }}>
        {spec.kind === 'echarts'
          ? <ReactECharts option={spec.option as object} style={{ height: 300 }} notMerge />
          : <MetricTable table={spec.table!} />}
      </div>
    </section>
  );
}

function MetricTable({ table }: { table: { head: string[]; rows: string[][] } }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>{table.head.map((h, i) => (
          <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 8px', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {table.rows.map((r, ri) => (
          <tr key={ri}>{r.map((c, ci) => (
            <td key={ci} className={ci === 0 ? '' : 'tnum'} style={{ textAlign: ci === 0 ? 'left' : 'right', padding: '7px 8px', borderBottom: '1px solid var(--line-soft)', fontWeight: ci === 0 ? 600 : 400 }}>{c}</td>
          ))}</tr>
        ))}
      </tbody>
    </table>
  );
}