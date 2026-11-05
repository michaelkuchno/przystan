#!/usr/bin/env node
/**
 * Moves "topics" / "literature" defined in study packs (for courses whose syllabus published by
 * WSHE has none) into the programme file, so the programme stays the single source of topics.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const file = 'src/content/studies/wshe-brzeg.json';
const program = JSON.parse(readFileSync(file, 'utf8'));
for (const c of program.courses) {
  const f = `src/content/studies/pack/${c.id}.json`;
  if (!existsSync(f)) continue;
  const p = JSON.parse(readFileSync(f, 'utf8'));
  let changed = false;
  if (Array.isArray(p.topics)) {
    if (!c.topics.length) {
      c.topics = p.topics;
      c.topicsBy = 'przystan';
    }
    delete p.topics;
    changed = true;
  }
  if (Array.isArray(p.literature)) {
    if (!c.literature.length) c.literature = p.literature;
    delete p.literature;
    changed = true;
  }
  if (changed) {
    writeFileSync(f, JSON.stringify(p, null, 2) + '\n');
    console.log(`${c.id}: topics ${c.topics.length}, literature ${c.literature.length}`);
  }
}
writeFileSync(file, JSON.stringify(program, null, 2) + '\n');
