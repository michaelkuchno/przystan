import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { buildCaseStudy, identifyingNames, type CaseData } from './build';

const t = ((k: string, o?: Record<string, unknown>) =>
  k.startsWith('reports:anon.person')
    ? '[osoba]'
    : k.startsWith('reports:anon')
      ? '[usunięto]'
      : `${k}${o?.count ?? o?.n ?? ''}`) as unknown as TFunction;

const data: CaseData = {
  client: {
    id: 'c1',
    code: 'KW-16',
    fullName: 'Kacper Wiśniewski',
    ageGroup: 'teen',
    age: 16,
    sex: 'male',
    context: 'juvenile',
    problems: ['cannabis'],
    goal: 'abstinence',
    stage: 'preparation',
    status: 'active',
    strengths: 'Kacper lubi stolarkę; babcia Ewa go wspiera.',
    supportNetwork: 'Tel. babci: 600 123 456',
    family: 'Mieszka z matką przy ul. Długa 5 w Krakowie.',
    education: 'Szkoła branżowa',
    keyDates: [],
    createdAt: '',
    updatedAt: '',
  },
  relapse: {
    id: 'r',
    clientId: 'c1',
    highRiskSituations: ['Weekend u kolegi Tomka Nowaka'],
    triggers: [],
    warningSigns: [],
    copingStrategies: ['Telefon do trenera'],
    supportPeople: [{ id: 's', name: 'Tomek Nowak', contact: '600 000 000' }],
    supportPlaces: [],
    lapsePlan: '',
    updatedAt: '',
  },
  genogram: {
    id: 'g',
    clientId: 'c1',
    nodes: [
      { id: 'a', label: 'Babcia Ewa', kind: 'female', x: 0, y: 0 },
      { id: 'b', label: 'Matka', kind: 'female', x: 0, y: 0 },
      { id: 'c', label: 'Kacper', kind: 'male', x: 0, y: 0, isClient: true },
    ],
    edges: [],
    updatedAt: '',
  },
  meetings: [
    {
      id: 'm1',
      clientId: 'c1',
      type: 'individual',
      date: '2026-03-14T10:00:00',
      durationMin: 50,
      status: 'done',
      agenda: [],
      quickNotes: '',
      noteType: 'dap',
      note: { data: 'KW-16 opowiadał o weekendzie 2026-03-12.', assessment: 'Ambiwalencja.', plan: 'Dalsza praca MI.' },
      toolsUsed: [],
      homework: '',
    },
  ],
  measurements: [
    { id: 'x1', clientId: 'c1', date: '2026-01-10', source: { kind: 'screening', instrument: 'DUDIT' }, score: 18 },
    { id: 'x2', clientId: 'c1', date: '2026-04-10', source: { kind: 'screening', instrument: 'DUDIT' }, score: 9 },
  ],
  events: [{ id: 'e', clientId: 'c1', date: '2026-02-01', type: 'court', title: 'Posiedzenie sądu', note: '' }],
};

describe('anonymous case study', () => {
  it('collects identifying names (code, full name, support people, names in genogram labels)', () => {
    expect(identifyingNames(data)).toEqual(['KW-16', 'Kacper Wiśniewski', 'Tomek Nowak', 'Ewa']);
  });

  it('removes names, contact data, addresses and exact dates from every section', () => {
    const { sections, replaced } = buildCaseStudy(data, t);
    const all = sections.map((s) => s.text).join('\n');
    for (const bad of [
      'KW-16',
      'Kacper',
      'Wiśniewski',
      'Ewa',
      'Tomek',
      'Nowak',
      '600 123 456',
      'Długa 5',
      '2026-03-14',
      '2026-03-12',
    ])
      expect(all, bad).not.toContain(bad);
    expect(replaced).toBeGreaterThanOrEqual(8);
    expect(all).toContain('DUDIT: 18 (2026-01) → 9 (2026-04)');
    expect(all).toContain('Ambiwalencja.');
  });

  it('keeps the five sections in order', () => {
    expect(buildCaseStudy(data, t).sections.map((s) => s.id)).toEqual([
      'profile',
      'diagnosis',
      'programme',
      'course',
      'evaluation',
    ]);
  });
});
