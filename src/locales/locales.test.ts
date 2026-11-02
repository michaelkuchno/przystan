/**
 * UI translations: PL and EN must define the same keys (plural suffixes aside),
 * and every key used in the source code must exist in both languages.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DIAGNOSIS_AREAS, PROBLEMS, STAGES, WORK_CONTEXTS } from '@/domain/types';
import { INSTRUMENTS } from '@/lib/screening/instruments';
import { TOOL_META } from '@/features/tools/registry';

const mods = import.meta.glob<{ default: Record<string, unknown> }>('./*/*.json', { eager: true });
const res: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [p, m] of Object.entries(mods)) {
  const [, lng, ns] = p.match(/\.\/(\w+)\/(\w+)\.json$/)!;
  (res[lng!] ??= {})[ns!] = m.default;
}

function flat(o: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (o && typeof o === 'object' && !Array.isArray(o))
    for (const [k, v] of Object.entries(o)) flat(v, prefix ? `${prefix}.${k}` : k, out);
  else out.add(prefix);
  return out;
}
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (k: string) => k.replace(PLURAL, '');

const keys = (lng: string) => {
  const all = new Set<string>();
  for (const [ns, obj] of Object.entries(res[lng] ?? {})) for (const k of flat(obj)) all.add(`${ns}:${base(k)}`);
  return all;
};
const pl = keys('pl');
const en = keys('en');

describe('UI locales', () => {
  it('have the same namespaces', () => {
    expect(Object.keys(res.pl!).sort()).toEqual(Object.keys(res.en!).sort());
  });

  it('have the same keys in PL and EN', () => {
    expect([...pl].filter((k) => !en.has(k))).toEqual([]);
    expect([...en].filter((k) => !pl.has(k))).toEqual([]);
  });

  it('define every key used in the source code', () => {
    const files: string[] = [];
    const walk = (d: string) =>
      readdirSync(d).forEach((f) => {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(p) && !p.includes('.test.')) files.push(p);
      });
    walk('src');
    const missing: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      const def = s.match(/useTranslation\(\s*'(\w+)'/)?.[1] ?? 'common';
      const re = /\bt\(\s*(['`])((?:(?!\1).)+)\1/g;
      let x: RegExpExecArray | null;
      while ((x = re.exec(s))) {
        let key = x[2]!;
        let ns = def;
        const i = key.indexOf(':');
        if (i > 0 && /^\w+$/.test(key.slice(0, i))) {
          ns = key.slice(0, i);
          key = key.slice(i + 1);
        }
        if (key.includes('${')) {
          const rx = new RegExp(`^${ns}:${key.replace(/\./g, '\\.').replace(/\$\{[^}]+\}/g, '[^.]+')}$`);
          if (![...pl].some((k) => rx.test(k))) missing.push(`${f}: ${ns}:${key}`);
        } else if (!pl.has(`${ns}:${key}`)) missing.push(`${f}: ${ns}:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('cover all enum values and dynamic families', () => {
    const need = [
      ...WORK_CONTEXTS.map((v) => `enums:context.${v}`),
      ...PROBLEMS.map((v) => `enums:problem.${v}`),
      ...STAGES.map((v) => `enums:stage.${v}`),
      ...DIAGNOSIS_AREAS.map((v) => `clients:diagnosis.areas.${v}`),
      ...TOOL_META.map((m) => `tools:names.${m.id}`),
      ...Object.values(INSTRUMENTS).flatMap((i) =>
        (['female', 'male'] as const).flatMap((s) =>
          i.bands(s).flatMap((b) => [`screening:bands.${i.id}.${b.id}`, `screening:bandHints.${i.id}.${b.id}`]),
        ),
      ),
      ...[
        'cravingRise',
        'cravingHigh',
        'screeningWorse',
        'missedMeeting',
        'keyDateSoon',
        'noContact',
        'iprReviewOverdue',
      ].flatMap((r) => [`dashboard:rules.${r}.title`, `dashboard:rules.${r}.why`]),
    ];
    for (const lng of [pl, en]) expect(need.filter((k) => !lng.has(k))).toEqual([]);
  });
});
