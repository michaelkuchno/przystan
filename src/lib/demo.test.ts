import { describe, expect, it } from 'vitest';
import { buildDemoRecords, resolveDates, resolveRelativeDate } from './demo';
import type { DemoCase } from '@/content/types';

describe('demo dates', () => {
  it('resolves relative dates and timestamps', () => {
    expect(resolveRelativeDate('@0', '2026-11-02')).toBe('2026-11-02');
    expect(resolveRelativeDate('@-30', '2026-11-02')).toBe('2026-10-03');
    expect(resolveRelativeDate('@+5T13:30', '2026-11-02')).toBe('2026-11-07T13:30:00');
    expect(resolveRelativeDate('Ala @-3', '2026-11-02')).toBe('Ala @-3');
  });

  it('resolves nested values', () => {
    expect(resolveDates({ a: ['@1', { b: '@-1' }], n: 3 }, '2026-01-01')).toEqual({
      a: ['2026-01-02', { b: '2025-12-31' }],
      n: 3,
    });
  });
});

describe('buildDemoRecords', () => {
  it('creates records with stable ids linked to the client', () => {
    const c: DemoCase = {
      id: 'demo-01',
      client: {
        code: 'MK-16',
        ageGroup: 'teen',
        age: 16,
        sex: 'male',
        context: 'juvenile',
        problems: ['cannabis'],
        goal: 'abstinence',
        stage: 'contemplation',
        status: 'active',
        strengths: 's',
        supportNetwork: 's',
        family: 'f',
        education: 'e',
        keyDates: [{ id: 'k1', label: 'Przepustka', date: '@7' }],
      },
      meetings: [
        {
          type: 'individual',
          date: '@0T10:00',
          durationMin: 45,
          status: 'planned',
          agenda: [],
          quickNotes: '',
          noteType: 'progress',
          note: {},
          toolsUsed: [],
          homework: '',
        },
      ],
      measurements: [],
      events: [{ date: '@-10', type: 'transfer', title: 'Przyjęcie do MOW', note: '' }],
    };
    const items = buildDemoRecords([c], '2026-11-02');
    expect(items.map((i) => i.value.id)).toEqual(['demo-01', 'demo-01-m0', 'demo-01-e0']);
    const client = items[0]!.value as { keyDates: { date: string }[] };
    expect(client.keyDates[0]!.date).toBe('2026-11-09');
    expect((items[1]!.value as { date: string }).date).toBe('2026-11-02T10:00:00');
    expect((items[2]!.value as { clientId: string }).clientId).toBe('demo-01');
  });
});
