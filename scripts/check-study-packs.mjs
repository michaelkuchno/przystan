#!/usr/bin/env node
/**
 * Validates the built-in study packs (src/content/studies/pack/<courseId>.json) against the WSHE
 * programme: every course has a pack, every topic has a note, enough cards / exam questions,
 * answer keys in range, no placeholders. Usage: node scripts/check-study-packs.mjs [courseId…]
 */
import { readFileSync, existsSync } from 'node:fs';

const program = JSON.parse(readFileSync('src/content/studies/wshe-brzeg.json', 'utf8'));
const only = process.argv.slice(2);
const errors = [];
const PLACEHOLDER = /\b(TODO|TBD|lorem|ipsum|xxx)\b|\[(?:data|uzupełnij|brak)[^\]]*\]|\.\.\.$/i;
const words = (s) => s.trim().split(/\s+/).length;

for (const c of program.courses) {
  if (only.length && !only.includes(c.id)) continue;
  const f = `src/content/studies/pack/${c.id}.json`;
  if (!existsSync(f)) {
    errors.push(`${c.id}: missing ${f}`);
    continue;
  }
  let p;
  try {
    p = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    errors.push(`${c.id}: invalid JSON – ${e.message}`);
    continue;
  }
  const err = (m) => errors.push(`${c.id}: ${m}`);
  if (p.courseId !== c.id) err(`courseId must be "${c.id}"`);
  const topics = c.topics.length ? c.topics : (p.topics ?? []);
  if (!c.topics.length && (!Array.isArray(p.topics) || p.topics.length < 5)) err('course has no syllabus topics – pack must define "topics" (5–9)');
  if (!c.literature.length && (!Array.isArray(p.literature) || p.literature.length < 3)) err('course has no literature – pack must define "literature" (3–6)');
  if (!Array.isArray(p.notes)) err('notes missing');
  else {
    for (const tp of topics) if (!p.notes.some((n) => n.topic === tp)) err(`no note for topic "${tp}"`);
    for (const n of p.notes) {
      if (!topics.includes(n.topic)) err(`note topic not in syllabus: "${n.topic}"`);
      if (typeof n.text !== 'string' || words(n.text) < 170) err(`note too short (${words(n.text ?? '')} words, min 170): "${n.topic}"`);
      if (!Array.isArray(n.key) || n.key.length < 3) err(`note needs ≥3 key terms: "${n.topic}"`);
    }
  }
  if (!Array.isArray(p.cards) || p.cards.length < 20) err(`cards: ${p.cards?.length ?? 0} (min 20)`);
  for (const k of p.cards ?? []) if (!k.front?.trim() || !k.back?.trim()) err('card without front/back');
  if (!Array.isArray(p.questions) || p.questions.length < 20) err(`questions: ${p.questions?.length ?? 0} (min 20)`);
  for (const q of p.questions ?? []) {
    if (!q.q?.trim() || !Array.isArray(q.options) || q.options.length !== 4) err(`question needs text and exactly 4 options: "${q.q}"`);
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) err(`bad correct index: "${q.q}"`);
    if (new Set(q.options ?? []).size !== (q.options ?? []).length) err(`duplicate options: "${q.q}"`);
    if (!q.explain?.trim()) err(`question without explanation: "${q.q}"`);
  }
  const dist = [0, 0, 0, 0];
  for (const q of p.questions ?? []) if (q.correct >= 0 && q.correct <= 3) dist[q.correct]++;
  if ((p.questions?.length ?? 0) >= 20 && Math.max(...dist) > p.questions.length * 0.45) err(`answer key not balanced: ${dist.join('/')}`);
  if (!Array.isArray(p.open) || p.open.length < 6) err(`open questions: ${p.open?.length ?? 0} (min 6)`);
  for (const o of p.open ?? []) if (!o.q?.trim() || !o.answer?.trim() || words(o.answer) < 40) err(`open question needs a model answer ≥40 words: "${o.q}"`);
  const all = JSON.stringify(p);
  if (PLACEHOLDER.test(all.replace(/\\n/g, ' '))) err('contains a placeholder (TODO, [data], lorem…)');
}
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`OK – ${only.length || program.courses.length} course pack(s) valid`);
