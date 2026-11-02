/**
 * Demo / training space seeding (docs/DECISIONS.md D-006, D-007).
 */
import type { DemoCase } from '@/content/types';
import type { RecordKind, RecordMap } from '@/domain/types';
import { addDays, toIsoDate } from './srs';

const REL = /^@([+-]?\d+)(?:T(\d{2}):(\d{2}))?$/;

/** Converts "@-3" → "YYYY-MM-DD" and "@0T10:30" → local ISO timestamp. */
export function resolveRelativeDate(v: string, today: string): string {
  const m = v.match(REL);
  if (!m) return v;
  const date = addDays(today, Number(m[1]));
  if (m[2] === undefined) return date;
  return `${date}T${m[2]}:${m[3]}:00`;
}

/** Recursively resolves every "@…" string. */
export function resolveDates<T>(value: T, today: string): T {
  if (typeof value === 'string') return resolveRelativeDate(value, today) as T;
  if (Array.isArray(value)) return value.map((v) => resolveDates(v, today)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveDates(v, today);
    return out as T;
  }
  return value;
}

type Item = { kind: RecordKind; value: RecordMap[RecordKind] };

/** Builds the demo records with stable ids (so the language can be switched by re-seeding). */
export function buildDemoRecords(cases: DemoCase[], today = toIsoDate(new Date())): Item[] {
  const items: Item[] = [];
  const now = `${today}T08:00:00`;
  const push = <K extends RecordKind>(kind: K, value: RecordMap[K]) => items.push({ kind, value });

  for (const raw of cases) {
    const c = resolveDates(raw, today);
    const clientId = c.id;
    push('client', { ...c.client, id: clientId, createdAt: addDays(today, -120) + 'T08:00:00', updatedAt: now });
    if (c.diagnosis) push('diagnosis', { ...c.diagnosis, id: `${clientId}-dx`, clientId });
    if (c.ipr) push('ipr', { ...c.ipr, id: `${clientId}-ipr`, clientId });
    if (c.relapsePlan) push('relapsePlan', { ...c.relapsePlan, id: `${clientId}-rp`, clientId, updatedAt: now });
    if (c.genogram) push('genogram', { ...c.genogram, id: `${clientId}-geno`, clientId, updatedAt: now });
    if (c.readaptation) push('readaptation', { ...c.readaptation, id: `${clientId}-ra`, clientId, updatedAt: now });
    if (c.familyPlan) push('familyPlan', { ...c.familyPlan, id: `${clientId}-fp`, clientId, updatedAt: now });
    c.meetings.forEach((m, i) => push('meeting', { ...m, id: `${clientId}-m${i}`, clientId }));
    c.measurements.forEach((m, i) => push('measurement', { ...m, id: `${clientId}-x${i}`, clientId }));
    c.events.forEach((e, i) => push('event', { ...e, id: `${clientId}-e${i}`, clientId }));
    const recipeIds: string[] = [];
    c.recipes?.forEach((r, i) => {
      const id = `${clientId}-r${i}`;
      recipeIds.push(id);
      push('recipe', { ...r, id, updatedAt: now });
    });
    if (c.prevention)
      push('prevention', {
        ...c.prevention,
        id: `${clientId}-prev`,
        recipeIds: c.prevention.recipeIds?.length ? c.prevention.recipeIds : recipeIds,
        updatedAt: now,
      });
  }
  return items;
}
