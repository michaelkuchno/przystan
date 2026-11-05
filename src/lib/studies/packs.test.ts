import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import program from '@/content/studies/wshe-brzeg.json';
import { examFromPack, hasPack, type StudyPack } from './packs';
import { mergeCourses, studyDocs } from './program';
import type { Program } from './types';
import { INSTRUMENTS } from '@/lib/screening/instruments';
import { PL_INSTRUMENTS } from '@/lib/screening/pl';
import { DE_INSTRUMENTS } from '@/lib/screening/de';

const pack: StudyPack = {
  courseId: 'x',
  notes: [{ topic: 'Temat A', text: 'Współuzależnienie to wzorzec funkcjonowania bliskich.', key: ['a – b', 'c – d', 'e – f'] }],
  cards: [{ front: 'F', back: 'B' }],
  questions: Array.from({ length: 12 }, (_, i) => ({
    q: `Pytanie ${i}`,
    options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
    correct: i % 4,
    explain: `bo ${i}`,
  })),
  open: [
    { q: 'Otwarte 1', answer: 'Wzorcowa 1' },
    { q: 'Otwarte 2', answer: 'Wzorcowa 2' },
  ],
};

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('study packs', () => {
  it('exam from the bank keeps the right answer after shuffling the options', () => {
    const exam = examFromPack(pack, 10, rnd);
    expect(exam).toHaveLength(10);
    const open = exam.filter((q) => q.type === 'open');
    expect(open).toHaveLength(2);
    for (const q of exam.filter((x) => x.type === 'single')) {
      const src = pack.questions.find((s) => s.q === q.question)!;
      expect(q.options![q.correct!]).toBe(src.options[src.correct]);
      expect(q.answer).toBe(src.explain);
    }
  });

  it('notes are searchable as course data', () => {
    const courses = mergeCourses(program as unknown as Program, []);
    const docs = studyDocs(courses, [], new Map([[courses[0]!.id, { ...pack, courseId: courses[0]!.id }]]));
    const note = docs.find((d) => d.kind === 'note');
    expect(note?.title).toBe('Temat A');
    expect(note?.to).toContain('tab=materials');
  });

  it('every programme course has a valid built-in pack (notes for all topics, cards, exam bank)', () => {
    for (const c of (program as unknown as Program).courses) expect(hasPack(c.id), c.id).toBe(true);
    const out = execFileSync(process.execPath, ['scripts/check-study-packs.mjs'], { encoding: 'utf8' });
    expect(out).toContain('valid');
  });
});

describe('screening wording PL / DE', () => {
  it('has the same items and options as the original', () => {
    for (const texts of [PL_INSTRUMENTS, DE_INSTRUMENTS])
      for (const [id, inst] of Object.entries(INSTRUMENTS)) {
        const tr = texts[id as keyof typeof texts];
        expect(tr, id).toBeTruthy();
        expect(tr!.items).toHaveLength(inst.items.length);
        tr!.items.forEach((it, i) => expect(it.options, `${id} ${i}`).toHaveLength(inst.items[i]!.options.length));
      }
  });
});
