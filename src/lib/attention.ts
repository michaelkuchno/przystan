/**
 * "Do zwrócenia uwagi" – transparent attention rules (docs/DECISIONS.md D-014).
 * Each flag carries the rule id and the facts it is based on, so the UI can
 * explain exactly why it appeared. Flags are supportive hints, not assessments.
 */
import type { Client, Ipr, Measurement, Meeting } from '@/domain/types';
import { bandFor } from './screening/score';
import { addDays } from './srs';

export type AttentionRule =
  | 'cravingRise'
  | 'cravingHigh'
  | 'screeningWorse'
  | 'missedMeeting'
  | 'keyDateSoon'
  | 'noContact'
  | 'iprReviewOverdue';

export interface AttentionFlag {
  rule: AttentionRule;
  clientId: string;
  /** 1 = info, 2 = important */
  level: 1 | 2;
  /** Facts for the explanation string (interpolated by i18n). */
  facts: Record<string, string | number>;
  date: string;
}

export const ATTENTION_THRESHOLDS = {
  cravingRise: 2,
  cravingHigh: 7,
  missedWithinDays: 14,
  keyDateWithinDays: 14,
  noContactDays: 30,
};

interface Input {
  clients: Client[];
  meetings: Meeting[];
  measurements: Measurement[];
  iprs: Ipr[];
  today: string;
}

const day = (iso: string) => iso.slice(0, 10);

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${day(b)}T12:00:00`) - Date.parse(`${day(a)}T12:00:00`)) / 86_400_000);
}

export function computeAttention({ clients, meetings, measurements, iprs, today }: Input): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  const T = ATTENTION_THRESHOLDS;

  for (const c of clients) {
    if (c.status !== 'active') continue;
    const ms = measurements.filter((m) => m.clientId === c.id).sort((a, b) => a.date.localeCompare(b.date));

    // craving (urge surfing / HALT etc. – tools reporting craving 0–10 as score)
    const craving = ms.filter((m) => m.source.kind === 'tool' && m.source.tool === 'urgeSurfing');
    const lastC = craving.at(-1);
    const prevC = craving.at(-2);
    const val = (m: Measurement) => m.scoreBefore ?? m.score ?? 0;
    if (lastC && prevC && val(lastC) - val(prevC) >= T.cravingRise) {
      flags.push({
        rule: 'cravingRise',
        clientId: c.id,
        level: 2,
        facts: { from: val(prevC), to: val(lastC), date: day(lastC.date) },
        date: day(lastC.date),
      });
    } else if (lastC && val(lastC) >= T.cravingHigh) {
      flags.push({ rule: 'cravingHigh', clientId: c.id, level: 2, facts: { value: val(lastC) }, date: day(lastC.date) });
    }

    // screening worsening (same instrument, last two results)
    const byInstrument = new Map<string, Measurement[]>();
    for (const m of ms)
      if (m.source.kind === 'screening' && m.score !== undefined) {
        const k = m.source.instrument;
        byInstrument.set(k, [...(byInstrument.get(k) ?? []), m]);
      }
    for (const [instrument, list] of byInstrument) {
      const last = list.at(-1);
      const prev = list.at(-2);
      if (!last || !prev || last.score === undefined || prev.score === undefined) continue;
      if (last.score <= prev.score) continue;
      const id = instrument as 'AUDIT';
      const worseBand = bandFor(id, last.score, c.sex).severity > bandFor(id, prev.score, c.sex).severity;
      flags.push({
        rule: 'screeningWorse',
        clientId: c.id,
        level: worseBand ? 2 : 1,
        facts: { instrument, from: prev.score, to: last.score },
        date: day(last.date),
      });
    }

    // meetings
    const cm = meetings.filter((m) => m.clientId === c.id);
    const missed = cm
      .filter((m) => m.status === 'missed')
      .filter((m) => {
        const d = daysBetween(m.date, today);
        return d >= 0 && d <= T.missedWithinDays;
      })
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (missed)
      flags.push({ rule: 'missedMeeting', clientId: c.id, level: 2, facts: { date: day(missed.date) }, date: day(missed.date) });

    const lastContact = cm
      .filter((m) => m.status === 'done' && day(m.date) <= today)
      .map((m) => day(m.date))
      .sort()
      .at(-1);
    const hasPlanned = cm.some((m) => m.status === 'planned' && day(m.date) >= today);
    const since = lastContact ?? day(c.createdAt);
    const gap = daysBetween(since, today);
    if (gap > T.noContactDays && !hasPlanned)
      flags.push({ rule: 'noContact', clientId: c.id, level: 1, facts: { days: gap }, date: today });

    // key dates (end of probation, leaving facility, court…)
    const limit = addDays(today, T.keyDateWithinDays);
    for (const k of c.keyDates) {
      if (k.date >= today && k.date <= limit)
        flags.push({
          rule: 'keyDateSoon',
          clientId: c.id,
          level: daysBetween(today, k.date) <= 3 ? 2 : 1,
          facts: { label: k.label, date: k.date, days: daysBetween(today, k.date) },
          date: k.date,
        });
    }

    const ipr = iprs.find((i) => i.clientId === c.id);
    if (ipr?.reviewDate && ipr.reviewDate < today)
      flags.push({
        rule: 'iprReviewOverdue',
        clientId: c.id,
        level: 1,
        facts: { date: ipr.reviewDate },
        date: ipr.reviewDate,
      });
  }

  return flags.sort((a, b) => b.level - a.level || a.date.localeCompare(b.date));
}
