import type { InstrumentId, Sex } from '@/domain/types';
import { INSTRUMENTS, type Band } from './instruments';

export interface ScreeningResult {
  score: number;
  band: Band;
  complete: boolean;
}

/**
 * Scores an instrument. `answers[i]` is the index of the chosen option for item i
 * (or undefined / -1 when not answered). Missing answers count as 0 but mark the
 * result as incomplete.
 */
export function scoreInstrument(id: InstrumentId, answers: (number | undefined)[], sex: Sex): ScreeningResult {
  const instrument = INSTRUMENTS[id];
  let score = 0;
  let complete = true;
  instrument.items.forEach((item, i) => {
    const idx = answers[i];
    if (idx === undefined || idx < 0) {
      complete = false;
      return;
    }
    const option = item.options[idx];
    if (!option) throw new Error(`Invalid answer ${idx} for ${id} item ${item.id}`);
    score += option.points;
  });
  return { score, band: bandFor(id, score, sex), complete };
}

export function bandFor(id: InstrumentId, score: number, sex: Sex): Band {
  const bands = INSTRUMENTS[id].bands(sex);
  const band = bands.find((b) => score >= b.min && score <= b.max);
  if (!band) throw new Error(`No band for ${id} score ${score}`);
  return band;
}
