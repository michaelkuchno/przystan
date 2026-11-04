import { all } from '@/lib/store';

/** Every name the app knows (clients' codes and full names, genogram people, support persons) – for pseudonymisation. */
export function knownNames(): string[] {
  const out = new Set<string>();
  for (const c of all('client')) {
    if (c.code) out.add(c.code);
    if (c.fullName) out.add(c.fullName);
  }
  for (const g of all('genogram')) for (const n of g.nodes) if (n.label) out.add(n.label);
  for (const r of all('relapsePlan')) for (const p of r.supportPeople) if (p.name) out.add(p.name);
  return [...out].filter((n) => n.trim().length >= 2);
}
