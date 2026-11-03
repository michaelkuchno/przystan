import type { PracticeActivity, PracticeEntry } from '@/domain/types';

export interface PracticeTotals {
  hours: number;
  remaining: number;
  /** 0–100 */
  percent: number;
  /** Hours per activity, largest first. */
  byActivity: [PracticeActivity, number][];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Hour counter of the practice log (goal default: 90 h). */
export function practiceTotals(entries: PracticeEntry[], goal: number): PracticeTotals {
  const by = new Map<PracticeActivity, number>();
  let hours = 0;
  for (const e of entries) {
    const h = Number.isFinite(e.hours) && e.hours > 0 ? e.hours : 0;
    hours += h;
    by.set(e.activity, (by.get(e.activity) ?? 0) + h);
  }
  hours = round(hours);
  const g = goal > 0 ? goal : 90;
  return {
    hours,
    remaining: round(Math.max(0, g - hours)),
    percent: Math.min(100, Math.round((hours / g) * 100)),
    byActivity: [...by.entries()].map(([a, h]) => [a, round(h)] as [PracticeActivity, number]).sort((a, b) => b[1] - a[1]),
  };
}
