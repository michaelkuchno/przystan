import { describe, expect, it } from 'vitest';
import { computeAttention } from './attention';
import type { Client, Measurement, Meeting } from '@/domain/types';

const today = '2026-11-02';
const base: Client = {
  id: 'c1',
  code: 'AA',
  ageGroup: 'adult',
  sex: 'male',
  context: 'clinic',
  problems: ['alcohol'],
  goal: 'abstinence',
  stage: 'action',
  status: 'active',
  strengths: '',
  supportNetwork: '',
  family: '',
  education: '',
  keyDates: [],
  createdAt: '2026-10-25T10:00:00Z',
  updatedAt: '2026-10-25T10:00:00Z',
};

const craving = (date: string, before: number): Measurement => ({
  id: date,
  clientId: 'c1',
  date,
  source: { kind: 'tool', tool: 'urgeSurfing' },
  scoreBefore: before,
  score: Math.max(0, before - 2),
});

const meeting = (date: string, status: Meeting['status']): Meeting => ({
  id: date,
  clientId: 'c1',
  type: 'individual',
  date: `${date}T10:00:00`,
  durationMin: 50,
  status,
  agenda: [],
  quickNotes: '',
  noteType: 'progress',
  note: {},
  toolsUsed: [],
  homework: '',
});

const run = (o: Partial<Parameters<typeof computeAttention>[0]>) =>
  computeAttention({ clients: [base], meetings: [], measurements: [], iprs: [], today, ...o });

describe('attention rules', () => {
  it('flags a craving rise of ≥2 points with its facts', () => {
    const f = run({ measurements: [craving('2026-10-20', 3), craving('2026-10-30', 6)] });
    expect(f[0]).toMatchObject({ rule: 'cravingRise', facts: { from: 3, to: 6 } });
  });

  it('flags high craving without a rise', () => {
    const f = run({ measurements: [craving('2026-10-20', 8), craving('2026-10-30', 8)] });
    expect(f.map((x) => x.rule)).toContain('cravingHigh');
  });

  it('ignores a stable craving', () => {
    expect(run({ measurements: [craving('2026-10-20', 3), craving('2026-10-30', 4)] })).toEqual([]);
  });

  it('flags a worsening screening score, level 2 when the band gets worse', () => {
    const m = (date: string, score: number): Measurement => ({
      id: date,
      clientId: 'c1',
      date,
      source: { kind: 'screening', instrument: 'AUDIT' },
      score,
    });
    expect(run({ measurements: [m('2026-09-01', 10), m('2026-10-01', 12)] })[0]).toMatchObject({
      rule: 'screeningWorse',
      level: 1,
    });
    expect(run({ measurements: [m('2026-09-01', 12), m('2026-10-01', 17)] })[0]).toMatchObject({ level: 2 });
    expect(run({ measurements: [m('2026-09-01', 17), m('2026-10-01', 12)] })).toEqual([]);
  });

  it('flags a missed meeting within 14 days only', () => {
    expect(run({ meetings: [meeting('2026-10-28', 'missed')] }).map((f) => f.rule)).toContain('missedMeeting');
    expect(run({ meetings: [meeting('2026-09-01', 'missed')] }).map((f) => f.rule)).not.toContain('missedMeeting');
  });

  it('flags upcoming key dates within 14 days', () => {
    const c = { ...base, keyDates: [{ id: 'k', label: 'Koniec dozoru', date: '2026-11-04' }] };
    const f = run({ clients: [c] });
    expect(f[0]).toMatchObject({ rule: 'keyDateSoon', level: 2, facts: { days: 2 } });
    const far = { ...base, keyDates: [{ id: 'k', label: 'x', date: '2026-12-30' }] };
    expect(run({ clients: [far] })).toEqual([]);
  });

  it('flags no contact for > 30 days unless a meeting is planned', () => {
    const old = { ...base, createdAt: '2026-08-01T00:00:00Z' };
    expect(run({ clients: [old] }).map((f) => f.rule)).toContain('noContact');
    expect(run({ clients: [old], meetings: [meeting('2026-11-05', 'planned')] })).toEqual([]);
  });

  it('flags an overdue IPR review', () => {
    const f = run({
      iprs: [{ id: 'i', clientId: 'c1', startDate: '2026-08-01', reviewDate: '2026-10-01', goals: [], evaluation: '' }],
    });
    expect(f[0]?.rule).toBe('iprReviewOverdue');
  });

  it('skips inactive clients', () => {
    expect(run({ clients: [{ ...base, status: 'closed' }], meetings: [meeting('2026-10-30', 'missed')] })).toEqual([]);
  });
});
