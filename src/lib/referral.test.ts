import { describe, expect, it } from 'vitest';
import { findPaths, matchRule } from './referral';
import type { HelpSystemFile } from '@/content/types';

const inst = (id: string) => ({
  id,
  name: id,
  category: 'treatment' as const,
  role: '',
  forWhom: '',
  howToAccess: '',
  reviewStatus: 'do_weryfikacji' as const,
});

const help: HelpSystemFile = {
  intro: '',
  countryNote: '',
  legal: [],
  crisis: [],
  institutions: [inst('poradnia'), inst('ppp'), inst('oik'), inst('kurator')],
  referral: {
    questions: [],
    rules: [
      { id: 'general', title: '', when: {}, institutionIds: ['poradnia'], steps: [] },
      {
        id: 'minor-school',
        title: '',
        when: { age: ['minor'], problem: ['drugs', 'alcohol'], context: ['school'] },
        institutionIds: ['ppp', 'poradnia'],
        steps: [],
      },
      { id: 'crisis', title: '', when: { urgency: ['crisis'] }, institutionIds: ['oik'], steps: [] },
      { id: 'justice', title: '', when: { context: ['justice'] }, institutionIds: ['kurator', 'missing'], steps: [] },
    ],
  },
};

describe('referral wizard', () => {
  it('matches rules by all listed conditions', () => {
    const r = help.referral.rules[1]!;
    expect(matchRule(r, { age: 'minor', problem: 'drugs', context: 'school' })).toBe(true);
    expect(matchRule(r, { age: 'adult', problem: 'drugs', context: 'school' })).toBe(false);
    expect(matchRule(r, { age: 'minor', problem: 'drugs' })).toBe(false);
  });

  it('orders crisis first, then by specificity', () => {
    const p = findPaths(help, { age: 'minor', problem: 'drugs', context: 'school', urgency: 'crisis' });
    expect(p.map((x) => x.rule.id)).toEqual(['crisis', 'minor-school', 'general']);
  });

  it('resolves institutions and drops unknown ids', () => {
    const p = findPaths(help, { context: 'justice' });
    expect(p[0]!.rule.id).toBe('justice');
    expect(p[0]!.institutions.map((i) => i.id)).toEqual(['kurator']);
  });
});
