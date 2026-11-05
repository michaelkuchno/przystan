/**
 * Built-in study packs (D-072): for every course of the WSHE programme – study notes per syllabus
 * topic, flash cards, an exam question bank with explanations and open questions with model
 * answers. Written by Przystań from the syllabus topics and the course literature; loaded lazily
 * (one JSON per course, not part of the start-up bundle).
 */
import { shuffle } from '@/features/learn/decks';
import type { ExamQuestion } from './types';

export interface PackNote {
  topic: string;
  text: string;
  /** "term – definition" */
  key: string[];
}

export interface StudyPack {
  courseId: string;
  notes: PackNote[];
  cards: { front: string; back: string }[];
  questions: { q: string; options: string[]; correct: number; explain: string }[];
  open: { q: string; answer: string }[];
}

const FILES = import.meta.glob<{ default: StudyPack }>('../../content/studies/pack/*.json');
const cache = new Map<string, Promise<StudyPack | null>>();

const fileOf = (courseId: string) => `../../content/studies/pack/${courseId}.json`;

export function hasPack(courseId: string): boolean {
  return fileOf(courseId) in FILES;
}

export function loadPack(courseId: string): Promise<StudyPack | null> {
  let p = cache.get(courseId);
  if (!p) {
    const load = FILES[fileOf(courseId)];
    p = load ? load().then((m) => m.default) : Promise.resolve(null);
    cache.set(courseId, p);
  }
  return p;
}

export async function loadPacks(courseIds: string[]): Promise<Map<string, StudyPack>> {
  const out = new Map<string, StudyPack>();
  await Promise.all(
    courseIds.map(async (id) => {
      const p = await loadPack(id);
      if (p) out.set(id, p);
    }),
  );
  return out;
}

/** Id prefix of cards copied from a pack into the course deck. */
export const PACK_CARD = 'pack-';

/** Exam from the question bank: single-choice questions (options shuffled) + open questions (~1 in 5). */
export function examFromPack(pack: StudyPack, n: number, rnd = Math.random): ExamQuestion[] {
  const openN = Math.min(pack.open.length, Math.max(1, Math.round(n / 5)));
  const single = shuffle(pack.questions, rnd)
    .slice(0, Math.max(0, n - openN))
    .map((q): ExamQuestion => {
      const order = shuffle([0, 1, 2, 3].slice(0, q.options.length), rnd);
      return {
        type: 'single',
        question: q.q,
        options: order.map((i) => q.options[i]!),
        correct: order.indexOf(q.correct),
        answer: q.explain,
      };
    });
  const open = shuffle(pack.open, rnd)
    .slice(0, openN)
    .map((o): ExamQuestion => ({ type: 'open', question: o.q, answer: o.answer }));
  return [...single, ...open];
}
