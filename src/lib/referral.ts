/**
 * Referral wizard ("kreator skierowania"). Rules come from helpsystem.json.
 * A rule matches when every condition it lists is satisfied; rules with more
 * conditions are more specific and are shown first.
 */
import type { HelpSystemFile, Institution, ReferralRule } from '@/content/types';

export type ReferralAnswers = Partial<Record<'age' | 'problem' | 'context' | 'urgency', string>>;

export interface ReferralPath {
  rule: ReferralRule;
  institutions: Institution[];
  specificity: number;
}

export function matchRule(rule: ReferralRule, answers: ReferralAnswers): boolean {
  return Object.entries(rule.when).every(([q, opts]) => {
    if (!opts || opts.length === 0) return true;
    const a = answers[q as keyof ReferralAnswers];
    return a !== undefined && opts.includes(a);
  });
}

export function findPaths(help: HelpSystemFile, answers: ReferralAnswers): ReferralPath[] {
  const byId = new Map(help.institutions.map((i) => [i.id, i]));
  return help.referral.rules
    .filter((r) => matchRule(r, answers))
    .map((rule) => ({
      rule,
      institutions: rule.institutionIds.map((id) => byId.get(id)).filter((i): i is Institution => !!i),
      specificity: Object.values(rule.when).filter((v) => v && v.length > 0).length,
    }))
    .sort((a, b) => {
      // crisis paths first, then more specific
      const ac = a.rule.when.urgency?.includes('crisis') ? 1 : 0;
      const bc = b.rule.when.urgency?.includes('crisis') ? 1 : 0;
      return bc - ac || b.specificity - a.specificity;
    });
}
