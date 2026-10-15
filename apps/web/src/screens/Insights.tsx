import { useState } from 'react';
import { INSIGHTS_TABS, INSIGHTS_AS_AT, INSIGHTS_SOURCE } from '../lib/insights-charts';
import { ChartCard } from '../components/ChartCard';

export function Insights() {
  const [tab, setTab] = useState(INSIGHTS_TABS[0].id);
  const active = INSIGHTS_TABS.find((t) => t.id === tab) ?? INSIGHTS_TABS[0];

  return (
    <div style={{ maxWidth: 940 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, letterSpacing: -0.3 }}>Insights</h1>
        <p style={{ color: 'var(--muted)', marginTop: 2 }}>Market insights — {INSIGHTS_SOURCE}. As at {INSIGHTS_AS_AT}.</p>
      </header>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
        {INSIGHTS_TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 14px', marginBottom: -1, border: 'none', background: 'none',
              borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              color: on ? 'var(--ink)' : 'var(--muted)', fontWeight: on ? 600 : 500, fontSize: 13.5, cursor: 'pointer',
            }}>{t.label}</button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {active.charts.map((spec) => <ChartCard key={spec.key} spec={spec} fundIds={[]} />)}
      </div>
    </div>
  );
}