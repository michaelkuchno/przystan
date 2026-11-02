/**
 * SM-2 spaced repetition (P. Woźniak, 1990). See docs/DECISIONS.md D-013.
 */
import type { CardState } from '@/domain/types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADE_QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function newCardState(deckId: string, cardId: string, today: string): CardState {
  return { id: `${deckId}:${cardId}`, deckId, cardId, easiness: 2.5, interval: 0, repetitions: 0, due: today, lapses: 0 };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Applies a review with quality q (0–5) and returns the next state. */
export function review(state: CardState, grade: Grade, today: string): CardState {
  const q = GRADE_QUALITY[grade];
  let { easiness, interval, repetitions, lapses } = state;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easiness);
  }
  easiness = Math.max(1.3, easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  easiness = Math.round(easiness * 1000) / 1000;
  return { ...state, easiness, interval, repetitions, lapses, due: addDays(today, interval) };
}

export function isDue(state: CardState | undefined, today: string): boolean {
  return !state || state.due <= today;
}
