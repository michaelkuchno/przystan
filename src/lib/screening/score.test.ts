import { describe, expect, it } from 'vitest';
import { scoreInstrument, bandFor } from './score';
import { INSTRUMENTS } from './instruments';

describe('AUDIT', () => {
  it('has 10 items and max 40', () => {
    const a = INSTRUMENTS.AUDIT;
    expect(a.items).toHaveLength(10);
    const max = a.items.reduce((s, it) => s + Math.max(...it.options.map((o) => o.points)), 0);
    expect(max).toBe(40);
  });

  it('scores items 9–10 as 0/2/4', () => {
    const r = scoreInstrument('AUDIT', [0, 0, 0, 0, 0, 0, 0, 0, 2, 1], 'male');
    expect(r.score).toBe(6);
    expect(r.complete).toBe(true);
  });

  it.each([
    [0, 'zone1'],
    [7, 'zone1'],
    [8, 'zone2'],
    [15, 'zone2'],
    [16, 'zone3'],
    [19, 'zone3'],
    [20, 'zone4'],
    [40, 'zone4'],
  ])('score %i → %s', (score, band) => {
    expect(bandFor('AUDIT', score, 'female').id).toBe(band);
  });

  it('marks incomplete answers', () => {
    const r = scoreInstrument('AUDIT', [4, 4, 4], 'male');
    expect(r.complete).toBe(false);
    expect(r.score).toBe(12);
  });

  it('rejects an invalid option index', () => {
    expect(() => scoreInstrument('AUDIT', [9], 'male')).toThrow();
  });
});

describe('AUDIT-C', () => {
  it('uses sex-specific cut-offs (≥4 men, ≥3 women)', () => {
    expect(scoreInstrument('AUDIT-C', [1, 1, 1], 'male').band.id).toBe('negative');
    expect(scoreInstrument('AUDIT-C', [1, 1, 1], 'female').band.id).toBe('positive');
    expect(scoreInstrument('AUDIT-C', [2, 1, 1], 'male').band.id).toBe('positive');
    expect(scoreInstrument('AUDIT-C', [4, 4, 0], 'male').band.id).toBe('high');
  });

  it('treats unspecified sex with the more conservative male cut-off', () => {
    expect(scoreInstrument('AUDIT-C', [1, 1, 1], 'unspecified').band.id).toBe('negative');
  });
});

describe('DUDIT', () => {
  it('has 11 items and max 44', () => {
    const d = INSTRUMENTS.DUDIT;
    expect(d.items).toHaveLength(11);
    const max = d.items.reduce((s, it) => s + Math.max(...it.options.map((o) => o.points)), 0);
    expect(max).toBe(44);
  });

  it('applies the manual cut-offs', () => {
    expect(bandFor('DUDIT', 5, 'male').id).toBe('negative');
    expect(bandFor('DUDIT', 6, 'male').id).toBe('problems');
    expect(bandFor('DUDIT', 1, 'female').id).toBe('negative');
    expect(bandFor('DUDIT', 2, 'female').id).toBe('problems');
    expect(bandFor('DUDIT', 25, 'male').id).toBe('dependence');
  });
});

describe('bands', () => {
  it('cover the full score range without gaps for every instrument and sex', () => {
    for (const inst of Object.values(INSTRUMENTS)) {
      for (const sex of ['female', 'male', 'other', 'unspecified'] as const) {
        for (let s = 0; s <= inst.maxScore; s++) {
          expect(() => bandFor(inst.id, s, sex)).not.toThrow();
        }
      }
    }
  });
});
