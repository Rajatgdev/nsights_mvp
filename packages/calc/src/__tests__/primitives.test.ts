import { describe, it, expect } from 'vitest';
import { monthlyReturns, totalReturn, annualised, volatility, maxDrawdown, rebase, stdev } from '../primitives.js';
import { ytd, calendarYears } from '../calendar.js';

function monthEndDates(startYear: number, startMonth: number, n: number): string[] {
  const out: string[] = [];
  let y = startYear, m = startMonth;
  for (let i = 0; i < n; i++) {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    out.push(`${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

describe('primitives', () => {
  it('monthly returns compound to total return', () => {
    const series = [100, 110, 99, 121];
    const rets = monthlyReturns(series).filter((r): r is number => r != null);
    const compounded = rets.reduce((a, r) => a * (1 + r), 1) - 1;
    expect(compounded).toBeCloseTo(totalReturn(series, 3)!, 10);
  });
  it('annualised equals total when m = 12', () => {
    const series = Array.from({ length: 13 }, (_, i) => 100 * 1.01 ** i);
    expect(annualised(series, 12)!).toBeCloseTo(totalReturn(series, 12)!, 10);
  });
  it('rebase sets first price to base and preserves ratios', () => {
    const rb = rebase([50, 55, 60], 10_000);
    expect(rb[0]).toBe(10_000);
    expect(rb[2]! / rb[0]!).toBeCloseTo(60 / 50, 10);
  });
  it('sample stdev > population', () => {
    const vals = [0.01, -0.02, 0.015, 0.0, 0.03, -0.01];
    expect(stdev(vals, 'sample')).toBeGreaterThan(stdev(vals, 'population'));
  });
  it('max drawdown finds the trough', () => {
    const mdd = maxDrawdown([100, 120, 90, 95, 130])!;
    expect(mdd).toBeLessThanOrEqual(0);
    expect(mdd).toBeCloseTo(90 / 120 - 1, 10);
  });
  it('volatility null with insufficient data', () => expect(volatility([100])).toBeNull());
});

describe('calendar-year alignment (prototype bug fix)', () => {
  it('keys by year; younger fund shows blanks for missing years', () => {
    const dates = monthEndDates(2022, 6, 51);
    const series = dates.map((d) => {
      const y = Number(d.slice(0, 4));
      const decValue: Record<number, number> = {
        2022: 100, 2023: 111.46, 2024: 111.46 * 1.1397,
        2025: 111.46 * 1.1397 * 1.0485, 2026: 111.46 * 1.1397 * 1.0485 * 1.082,
      };
      return decValue[y] ?? null;
    });
    const map = Object.fromEntries(calendarYears({ dates, series }, 9).map((y) => [y.year, y.value]));
    expect(map[2018]).toBeNull();
    expect(map[2019]).toBeNull();
    expect(map[2023]).toBeCloseTo(0.1146, 3);
    expect(map[2024]).toBeCloseTo(0.1397, 3);
  });
  it('ytd uses prior December as base', () => {
    const dates = ['2024-12-31', '2025-06-30', '2025-12-31', '2026-06-30'];
    expect(ytd({ dates, series: [100, 104, 108, 114] })!).toBeCloseTo(114 / 108 - 1, 10);
  });
});