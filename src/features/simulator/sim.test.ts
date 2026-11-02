import { describe, expect, it } from 'vitest';
import { computeStats } from './sim';
import type { Scenario } from '@/content/types';

const sc: Scenario = {
  id: 's',
  title: '',
  context: 'clinic',
  audience: 'adult',
  persona: { name: 'A', age: 30, description: '' },
  intro: '',
  start: 'n1',
  reviewStatus: 'do_weryfikacji',
  nodes: [
    { id: 'n1', client: '', talk: 'neutral', mood: 'calm', options: [] },
    { id: 'c', client: '', talk: 'change', mood: 'hopeful', options: [] },
    { id: 's', client: '', talk: 'sustain', mood: 'guarded', options: [] },
  ],
};
const opt = (category: Parameters<typeof computeStats>[1][number]['option']['category'], alliance: number, next: string) => ({
  nodeId: 'n1',
  option: { id: 'x', text: '', category, feedback: '', alliance, next },
});

describe('simulator stats', () => {
  it('computes alliance, talk and MITI-style ratios', () => {
    const st = computeStats(sc, [
      opt('complexReflection', 2, 'c'),
      opt('openQuestion', 1, 'c'),
      opt('closedQuestion', 0, 's'),
      opt('simpleReflection', 1, 'c'),
      opt('confront', -2, 's'),
    ]);
    expect(st.alliance).toBe(70);
    expect(st.changeTalk).toBe(3);
    expect(st.sustainTalk).toBe(2);
    expect(st.rq).toBe(1);
    expect(st.pctOpen).toBe(50);
    expect(st.pctComplex).toBe(50);
    expect(st.miInconsistent).toBe(1);
  });

  it('clamps alliance to 0–100', () => {
    const st = computeStats(
      sc,
      Array.from({ length: 8 }, () => opt('moralize', -2, 's')),
    );
    expect(st.alliance).toBe(0);
    expect(st.rq).toBeNull();
  });
});
