/**
 * Validates the bilingual content files:
 *  - both languages exist for every content kind,
 *  - PL and EN have identical structure and identical identifiers,
 *  - enumerations and cross references are valid,
 *  - simulator graphs are well-formed,
 *  - demo screening results are consistent with the scoring rules.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT_KINDS, type ContentBundle, type ContentKind } from './types';
import { scoreInstrument } from '@/lib/screening/score';
import { INSTRUMENTS } from '@/lib/screening/instruments';
import {
  DIAGNOSIS_AREAS,
  PROBLEMS,
  STAGES,
  WORK_CONTEXTS,
  type InstrumentId,
  type ToolId,
} from '@/domain/types';

const files = import.meta.glob<{ default: unknown }>('../locales/*/content/*.json', { eager: true });

function load(lang: 'pl' | 'en'): Partial<ContentBundle> {
  const out: Record<string, unknown> = {};
  for (const [path, mod] of Object.entries(files)) {
    const m = path.match(/locales\/(pl|en)\/content\/(\w+)\.json$/);
    if (m && m[1] === lang) out[m[2]!] = mod.default;
  }
  return out as Partial<ContentBundle>;
}

const pl = load('pl');
const en = load('en');

/** String values under these keys are identifiers and must be equal in both languages. */
const ID_KEYS = new Set([
  'id',
  'section',
  'category',
  'kind',
  'context',
  'audience',
  'talk',
  'mood',
  'next',
  'start',
  'skill',
  'domain',
  'evidence',
  'type',
  'status',
  'noteType',
  'country',
  'number',
  'ingredientId',
  'institutionIds',
  'toolId',
  'reviewStatus',
  'instrument',
  'tool',
  'band',
  'sex',
  'ageGroup',
  'goal',
  'stage',
  'level',
  'problems',
  'from',
  'to',
  'quality',
  'module',
  'stateAsOf',
  'templateId',
  'recipeIds',
  'toolsUsed',
  'clientId',
  'meetingId',
  'sense',
]);

function compare(a: unknown, b: unknown, path: string, key: string | undefined, errors: string[]): void {
  if (errors.length > 20) return;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return void errors.push(`${path}: array vs ${typeof b}`);
    if (a.length !== b.length) return void errors.push(`${path}: length ${a.length} vs ${b.length}`);
    a.forEach((v, i) => compare(v, b[i], `${path}[${i}]`, key, errors));
    return;
  }
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return void errors.push(`${path}: object vs ${typeof b}`);
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) {
      const onlyA = ka.filter((k) => !kb.includes(k));
      const onlyB = kb.filter((k) => !ka.includes(k));
      return void errors.push(`${path}: keys differ – only PL: [${onlyA}] only EN: [${onlyB}]`);
    }
    for (const k of ka)
      compare((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, k, errors);
    return;
  }
  if (typeof a !== typeof b) return void errors.push(`${path}: ${typeof a} vs ${typeof b}`);
  if (typeof a === 'number' || typeof a === 'boolean') {
    if (a !== b) errors.push(`${path}: ${String(a)} vs ${String(b)}`);
    return;
  }
  if (typeof a === 'string') {
    const isDate = /^@[+-]?\d+/.test(a) || /^\d{4}-\d{2}/.test(a);
    // `goal` / `audience` are enum ids on clients and scenarios but free text on session templates and recipes
    const ENUM_VALUES = ['abstinence', 'harmReduction', 'undecided', 'youth', 'adult', 'both'];
    const textual = (key === 'goal' || key === 'audience') && !ENUM_VALUES.includes(a);
    if ((key && ID_KEYS.has(key) && !textual) || isDate) {
      if (a !== b) errors.push(`${path}: "${a}" vs "${b}"`);
    } else if (a.trim() === '' && (b as string).trim() !== '' && key !== 'countryNote') {
      errors.push(`${path}: empty in PL but not in EN`);
    }
  }
}

function emptyStrings(v: unknown, path: string, out: string[], allow: Set<string>): void {
  if (Array.isArray(v)) v.forEach((x, i) => emptyStrings(x, `${path}[${i}]`, out, allow));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'string' && x.trim() === '' && !allow.has(k)) out.push(`${path}.${k}`);
      else emptyStrings(x, `${path}.${k}`, out, allow);
    }
}

const ALLOW_EMPTY = new Set([
  'countryNote',
  'notes',
  'note',
  'quickNotes',
  'homework',
  'fullName',
  'reviewNotes',
  'contact',
  'evaluation',
  'safetyNotes',
]);

describe.each(CONTENT_KINDS)('content: %s', (kind: ContentKind) => {
  it('exists in both languages', () => {
    expect(pl[kind], `missing src/locales/pl/content/${kind}.json`).toBeDefined();
    expect(en[kind], `missing src/locales/en/content/${kind}.json`).toBeDefined();
  });

  it('has identical structure and identifiers in PL and EN', () => {
    if (!pl[kind] || !en[kind]) return;
    const errors: string[] = [];
    compare(pl[kind], en[kind], kind, undefined, errors);
    expect(errors).toEqual([]);
  });

  it('has no empty texts', () => {
    for (const [lang, bundle] of [
      ['pl', pl],
      ['en', en],
    ] as const) {
      const out: string[] = [];
      emptyStrings(bundle[kind], `${lang}.${kind}`, out, ALLOW_EMPTY);
      expect(out.slice(0, 10)).toEqual([]);
    }
  });
});

const has = (k: ContentKind) => Boolean(pl[k] && en[k]);
const unique = (ids: string[]) => new Set(ids).size === ids.length;
const REVIEW = ['do_weryfikacji', 'zweryfikowane'];
const TOOL_IDS: ToolId[] = [
  'urgeSurfing',
  'readinessRuler',
  'decisionalBalance',
  'chainAnalysis',
  'halt',
  'thoughtRecord',
  'scaling',
  'triggerMap',
  'supportMap',
  'grounding',
  'breathing',
  'socialSkills',
];

describe.runIf(has('knowledge'))('knowledge cards', () => {
  it('are well-formed', () => {
    for (const k of ['knowledge', 'resocialization', 'family'] as const) {
      const f = pl[k];
      if (!f) continue;
      expect(unique(f.cards.map((c) => c.id))).toBe(true);
      for (const c of f.cards) {
        expect(['approaches', 'resocialization', 'family', 'criteria', 'law', 'prevention']).toContain(c.section);
        expect(REVIEW).toContain(c.reviewStatus);
        expect(c.sources.length, `${c.id} sources`).toBeGreaterThan(0);
        expect(c.techniques.length, `${c.id} techniques`).toBeGreaterThan(0);
      }
    }
  });

  it('cover the required approaches', () => {
    expect(pl.knowledge!.cards.length).toBeGreaterThanOrEqual(15);
  });
});

describe.runIf(has('helpsystem'))('help system', () => {
  it('referral rules point to existing institutions and valid answers', () => {
    const h = pl.helpsystem!;
    const inst = new Set(h.institutions.map((i) => i.id));
    expect(unique([...inst])).toBe(true);
    const answers = new Map(h.referral.questions.map((q) => [q.id, new Set(q.options.map((o) => o.id))]));
    expect([...answers.keys()].sort()).toEqual(['age', 'context', 'problem', 'urgency']);
    for (const r of h.referral.rules) {
      for (const id of r.institutionIds) expect(inst.has(id), `${r.id} → ${id}`).toBe(true);
      for (const [q, opts] of Object.entries(r.when)) {
        for (const o of opts ?? []) expect(answers.get(q as never)?.has(o), `${r.id}: ${q}=${o}`).toBe(true);
      }
    }
  });

  it('contains the crisis numbers from the specification', () => {
    const nums = pl.helpsystem!.crisis.map((c) => c.number.replace(/\s/g, ''));
    for (const n of ['143', '147', '144', '116123', '116111', '800120002', '112']) expect(nums).toContain(n);
  });

  it('every referral answer combination yields at least one path', () => {
    const h = pl.helpsystem!;
    const qs = h.referral.questions;
    const combos: Record<string, string>[] = [{}];
    for (const q of qs) {
      const next: Record<string, string>[] = [];
      for (const c of combos) for (const o of q.options) next.push({ ...c, [q.id]: o.id });
      combos.splice(0, combos.length, ...next);
    }
    for (const c of combos) {
      const matched = h.referral.rules.filter((r) =>
        Object.entries(r.when).every(([q, opts]) => !opts || opts.includes(c[q]!)),
      );
      expect(matched.length, JSON.stringify(c)).toBeGreaterThan(0);
    }
  });
});

describe.runIf(has('templates'))('templates', () => {
  it('session templates reference existing ingredients and cover required templates', () => {
    const t = pl.templates!;
    const ing = new Set(t.ingredients.map((i) => i.id));
    expect(unique([...ing])).toBe(true);
    for (const s of t.sessionTemplates) for (const it of s.items) expect(ing.has(it.ingredientId), `${s.id}`).toBe(true);
    const ids = t.sessionTemplates.map((s) => s.id);
    for (const req of [
      'firstMeeting',
      'motivationalInterview',
      'chainAnalysis',
      'sociotherapy',
      'socialSkills',
      'familySession',
      'classPrevention',
    ])
      expect(ids).toContain(req);
    for (const i of t.ingredients) if (i.toolId) expect(TOOL_IDS).toContain(i.toolId);
  });
});

describe.runIf(has('scenarios'))('simulator scenarios', () => {
  it('has at least 10 scenarios', () => {
    expect(pl.scenarios!.scenarios.length).toBeGreaterThanOrEqual(10);
  });

  it.each(pl.scenarios?.scenarios.map((s) => [s.id, s] as const) ?? [])('%s is a valid graph', (_id, s) => {
    const nodes = new Map(s.nodes.map((n) => [n.id, n]));
    expect(nodes.size).toBe(s.nodes.length);
    expect(nodes.has(s.start)).toBe(true);
    expect(WORK_CONTEXTS).toContain(s.context);
    let endings = 0;
    for (const n of s.nodes) {
      if (n.ending) {
        endings++;
        expect(n.options).toHaveLength(0);
        continue;
      }
      expect(n.options.length, `${s.id}/${n.id}`).toBeGreaterThanOrEqual(3);
      expect(n.options.length, `${s.id}/${n.id}`).toBeLessThanOrEqual(4);
      for (const o of n.options) {
        expect(nodes.has(o.next), `${s.id}/${n.id}/${o.id} → ${o.next}`).toBe(true);
        expect(o.alliance).toBeGreaterThanOrEqual(-2);
        expect(o.alliance).toBeLessThanOrEqual(2);
      }
    }
    expect(endings).toBeGreaterThanOrEqual(2);
    // every node reachable, every path terminates (no cycles)
    const seen = new Set<string>();
    const visit = (id: string, stack: Set<string>) => {
      expect(stack.has(id), `${s.id}: cycle at ${id}`).toBe(false);
      seen.add(id);
      const n = nodes.get(id)!;
      for (const o of n.options) visit(o.next, new Set([...stack, id]));
    };
    visit(s.start, new Set());
    expect([...nodes.keys()].filter((k) => !seen.has(k))).toEqual([]);
  });
});

describe.runIf(has('decks'))('decks', () => {
  it('have unique ids and enough cards', () => {
    const d = pl.decks!.decks;
    expect(d.length).toBeGreaterThanOrEqual(5);
    expect(unique(d.map((x) => x.id))).toBe(true);
    for (const deck of d) {
      expect(unique(deck.cards.map((c) => c.id))).toBe(true);
      expect(deck.cards.length, deck.id).toBeGreaterThanOrEqual(15);
    }
  });
});

describe.runIf(has('demo'))('demo cases', () => {
  it('has at least 8 cases incl. one group', () => {
    const c = pl.demo!.cases;
    expect(c.length).toBeGreaterThanOrEqual(8);
    expect(c.some((x) => x.client.isGroup)).toBe(true);
    expect(unique(c.map((x) => x.id))).toBe(true);
  });

  it('uses valid enumerations', () => {
    for (const c of pl.demo!.cases) {
      expect(WORK_CONTEXTS).toContain(c.client.context);
      expect(STAGES).toContain(c.client.stage);
      for (const p of c.client.problems) expect(PROBLEMS).toContain(p);
      if (c.diagnosis) for (const a of DIAGNOSIS_AREAS) expect(c.diagnosis.areas[a], `${c.id} area ${a}`).toBeDefined();
    }
  });

  it('screening measurements are consistent with scoring', () => {
    for (const c of pl.demo!.cases) {
      for (const m of c.measurements) {
        if (m.source.kind !== 'screening') {
          expect(TOOL_IDS).toContain(m.source.tool);
          continue;
        }
        const id = m.source.instrument as InstrumentId;
        expect(INSTRUMENTS[id], `${c.id}: ${id}`).toBeDefined();
        expect(m.answers, `${c.id}: answers`).toBeDefined();
        expect(m.answers!.length).toBe(INSTRUMENTS[id].items.length);
        const r = scoreInstrument(id, m.answers!, c.client.sex);
        expect(m.score, `${c.id} ${id} ${m.date}`).toBe(r.score);
        expect(m.band, `${c.id} ${id} ${m.date}`).toBe(r.band.id);
      }
    }
  });

  it('dates use the relative "@" notation', () => {
    for (const c of pl.demo!.cases) {
      for (const m of c.meetings) expect(m.date).toMatch(/^@[+-]?\d+(T\d{2}:\d{2})?$/);
      for (const m of c.measurements) expect(m.date).toMatch(/^@[+-]?\d+$/);
    }
  });
});
