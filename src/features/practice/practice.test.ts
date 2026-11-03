import { describe, expect, it } from 'vitest';
import { practiceTotals } from './practice';
import type { PracticeEntry } from '@/domain/types';

const e = (hours: number, activity: PracticeEntry['activity'] = 'observation'): PracticeEntry => ({
  id: String(Math.random()),
  date: '2026-11-03',
  place: 'X',
  hours,
  activity,
  description: '',
  reflections: '',
  updatedAt: '',
});

describe('practice log hour counter', () => {
  it('sums hours against the goal', () => {
    const r = practiceTotals([e(4), e(3.5, 'group'), e(0.25, 'group')], 90);
    expect(r.hours).toBe(7.75);
    expect(r.remaining).toBe(82.25);
    expect(r.percent).toBe(9);
    expect(r.byActivity).toEqual([
      ['observation', 4],
      ['group', 3.75],
    ]);
  });

  it('caps the progress at 100 % and ignores invalid hours', () => {
    const r = practiceTotals([e(80), e(20), e(Number.NaN), e(-3)], 90);
    expect(r.hours).toBe(100);
    expect(r.remaining).toBe(0);
    expect(r.percent).toBe(100);
  });

  it('falls back to 90 h for an invalid goal', () => {
    expect(practiceTotals([e(45)], 0).percent).toBe(50);
  });
});
