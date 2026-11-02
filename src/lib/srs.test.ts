import { describe, expect, it } from 'vitest';
import { addDays, isDue, newCardState, review } from './srs';

const T = '2026-11-02';

describe('SM-2', () => {
  it('schedules 1, 6, then interval × EF days for correct answers', () => {
    let s = newCardState('d', 'c', T);
    s = review(s, 'good', T);
    expect(s.interval).toBe(1);
    expect(s.due).toBe('2026-11-03');
    s = review(s, 'good', s.due);
    expect(s.interval).toBe(6);
    s = review(s, 'good', s.due);
    expect(s.interval).toBe(15); // 6 × 2.5
    expect(s.repetitions).toBe(3);
  });

  it('resets on a failed answer and counts lapses', () => {
    let s = newCardState('d', 'c', T);
    s = review(review(review(s, 'good', T), 'good', T), 'good', T);
    s = review(s, 'again', T);
    expect(s.repetitions).toBe(0);
    expect(s.interval).toBe(1);
    expect(s.lapses).toBe(1);
  });

  it('adjusts easiness and never drops below 1.3', () => {
    let s = newCardState('d', 'c', T);
    expect(review(s, 'easy', T).easiness).toBeCloseTo(2.6);
    expect(review(s, 'good', T).easiness).toBeCloseTo(2.5);
    expect(review(s, 'hard', T).easiness).toBeCloseTo(2.36);
    for (let i = 0; i < 20; i++) s = review(s, 'again', T);
    expect(s.easiness).toBe(1.3);
  });

  it('knows when a card is due', () => {
    const s = newCardState('d', 'c', T);
    expect(isDue(undefined, T)).toBe(true);
    expect(isDue(s, T)).toBe(true);
    expect(isDue(review(s, 'good', T), T)).toBe(false);
  });

  it('adds days across month and DST boundaries', () => {
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});
