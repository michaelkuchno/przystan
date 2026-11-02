import type { ContentBundle } from '@/content/types';
import type { Client, Meeting, PreventionProgram, Recipe } from '@/domain/types';

export interface SearchHit {
  id: string;
  kind: 'client' | 'meeting' | 'knowledge' | 'institution' | 'legal' | 'scenario' | 'card' | 'recipe' | 'prevention' | 'tool' | 'template';
  title: string;
  snippet: string;
  to: string;
  score: number;
}

/** Lower-case, strip diacritics so "zrodla" finds "źródła". */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');
}

function snippet(text: string, q: string): string {
  const n = norm(text);
  const i = n.indexOf(q);
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  return (start ? '…' : '') + text.slice(start, start + 140) + (start + 140 < text.length ? '…' : '');
}

interface Doc {
  id: string;
  kind: SearchHit['kind'];
  title: string;
  body: string;
  to: string;
}

export function buildDocs(
  content: ContentBundle,
  data: { clients: Client[]; meetings: Meeting[]; recipes: Recipe[]; programs: PreventionProgram[] },
  toolNames: Record<string, string>,
): Doc[] {
  const docs: Doc[] = [];
  for (const c of [...content.knowledge.cards, ...content.resocialization.cards, ...content.family.cards])
    docs.push({ id: c.id, kind: 'knowledge', title: c.title, body: [c.essence, ...c.whenToUse, ...c.techniques, ...c.phrases, ...c.pitfalls, ...c.tags].join(' '), to: `/knowledge/${c.id}` });
  for (const i of content.helpsystem.institutions)
    docs.push({ id: i.id, kind: 'institution', title: i.name, body: `${i.role} ${i.forWhom} ${i.howToAccess}`, to: '/help/map' });
  for (const l of content.helpsystem.legal) docs.push({ id: l.id, kind: 'legal', title: l.title, body: `${l.summary} ${l.keyPoints.join(' ')}`, to: '/help/law' });
  for (const s of content.scenarios.scenarios)
    docs.push({ id: s.id, kind: 'scenario', title: s.title, body: `${s.intro} ${s.persona.description}`, to: `/simulator/${s.id}` });
  for (const d of content.decks.decks)
    for (const c of d.cards) docs.push({ id: `${d.id}:${c.id}`, kind: 'card', title: c.front, body: c.back, to: `/learn/study/${d.id}` });
  for (const t of content.templates.sessionTemplates) docs.push({ id: t.id, kind: 'template', title: t.title, body: `${t.goal} ${t.audience}`, to: '/recipes' });
  for (const [id, name] of Object.entries(toolNames))
    docs.push({ id, kind: 'tool', title: name, body: content.tools.intros[id as keyof typeof content.tools.intros]?.adult ?? '', to: `/tools/${id}` });
  for (const c of data.clients)
    docs.push({ id: c.id, kind: 'client', title: c.code, body: [c.fullName, c.strengths, c.supportNetwork, c.family, c.education, c.notes].filter(Boolean).join(' '), to: `/clients/${c.id}` });
  for (const m of data.meetings)
    docs.push({ id: m.id, kind: 'meeting', title: m.title ?? m.agenda[0] ?? m.date.slice(0, 10), body: [m.quickNotes, m.homework, ...m.agenda, ...Object.values(m.note)].join(' '), to: `/meetings/${m.id}` });
  for (const r of data.recipes) docs.push({ id: r.id, kind: 'recipe', title: r.title, body: `${r.goal} ${r.items.map((i) => i.title).join(' ')}`, to: `/recipes/${r.id}` });
  for (const p of data.programs) docs.push({ id: p.id, kind: 'prevention', title: p.title, body: `${p.targetGroup} ${p.generalGoal} ${p.specificGoals.join(' ')}`, to: `/prevention/${p.id}` });
  return docs;
}

export function search(docs: Doc[], query: string, limit = 60): SearchHit[] {
  const terms = norm(query).split(/\s+/).filter((x) => x.length > 1);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const title = norm(d.title);
    const body = norm(d.body);
    let score = 0;
    let all = true;
    for (const q of terms) {
      const inTitle = title.includes(q);
      const inBody = body.includes(q);
      if (!inTitle && !inBody) {
        all = false;
        break;
      }
      score += (inTitle ? 5 : 0) + (inBody ? 1 : 0) + (title.startsWith(q) ? 2 : 0);
    }
    if (!all) continue;
    hits.push({ id: d.id, kind: d.kind, title: d.title, snippet: snippet(d.body, terms[0]!), to: d.to, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
