/**
 * The programme (bundled public syllabi) merged with the student's own adjustments. Pure helpers
 * (unit tested); the JSON is loaded lazily – the studies module is not part of the start-up bundle.
 */
import type { Deck, CardState } from '@/domain/types';
import type { Program, ProgramCourse, StudyAttempt, StudyCourse, StudyMaterial, TopicLevel } from './types';

export const PROGRAMS = [{ id: 'wshe-brzeg-ped2-resoc-uzal', load: () => import('@/content/studies/wshe-brzeg.json') }] as const;

export async function loadProgram(id: string): Promise<Program | null> {
  const p = PROGRAMS.find((x) => x.id === id);
  return p ? ((await p.load()).default as unknown as Program) : null;
}

/** A course as shown: programme data + overrides, or a course added by the student. */
export interface CourseView extends ProgramCourse {
  examDate?: string;
  examNote?: string;
  hidden: boolean;
  custom: boolean;
  levels: Record<string, TopicLevel>;
  /** Topics from the syllabus followed by the student's own ones. */
  allTopics: string[];
}

export function mergeCourses(program: Program | null, overrides: StudyCourse[]): CourseView[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const out: CourseView[] = (program?.courses ?? []).map((c) => {
    const o = byId.get(c.id);
    return {
      ...c,
      name: o?.name ?? c.name,
      semester: o?.semester ?? c.semester,
      ects: o?.ects ?? c.ects,
      assessment: o?.assessment ?? c.assessment,
      examDate: o?.examDate,
      examNote: o?.examNote,
      hidden: !!o?.hidden,
      custom: false,
      levels: o?.levels ?? {},
      allTopics: [...c.topics, ...(o?.extraTopics ?? [])],
    };
  });
  for (const o of overrides)
    if (o.custom)
      out.push({
        id: o.id,
        name: o.name ?? '',
        semester: o.semester ?? 1,
        ects: o.ects ?? 0,
        hours: {},
        assessment: o.assessment ?? 'ZO',
        group: 'custom',
        topics: [],
        literature: [],
        source: 'own',
        examDate: o.examDate,
        examNote: o.examNote,
        hidden: !!o.hidden,
        custom: true,
        levels: o.levels ?? {},
        allTopics: o.extraTopics ?? [],
      });
  return out;
}

export const inSemester = (c: Pick<ProgramCourse, 'semester' | 'alsoIn'>, s: number) =>
  c.semester === s || !!c.alsoIn?.includes(s);

/** Deck holding the flash cards of a course (module "study:<id>"). */
export const deckIdFor = (courseId: string) => `study-${courseId}`;

export interface CourseProgress {
  /** Share of topics marked "I know it" (0–1). */
  topics: number;
  /** Share of cards that were reviewed at least twice in a row (0–1, null = no cards). */
  cards: number | null;
  /** Best mock exam result (0–100) or null. */
  best: number | null;
  /** Combined readiness 0–100 (shown as a ring). */
  readiness: number;
}

export function courseProgress(
  c: CourseView,
  deck: Deck | undefined,
  states: CardState[],
  attempts: StudyAttempt[],
): CourseProgress {
  const n = c.allTopics.length;
  const topics = n ? c.allTopics.reduce((s, t) => s + (c.levels[t] === 2 ? 1 : c.levels[t] === 1 ? 0.5 : 0), 0) / n : 0;
  const cardIds = new Set((deck?.cards ?? []).map((x) => x.id));
  const known = states.filter((s) => s.deckId === deck?.id && cardIds.has(s.cardId) && s.repetitions >= 2).length;
  const cards = cardIds.size ? known / cardIds.size : null;
  const mine = attempts.filter((a) => a.courseId === c.id);
  const best = mine.length ? Math.max(...mine.map((a) => a.score)) : null;
  const parts = [n ? topics : null, cards, best !== null ? best / 100 : null].filter((x): x is number => x !== null);
  return {
    topics,
    cards,
    best,
    readiness: parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0,
  };
}

/** Days until an exam (negative = past, null = no date). */
export function daysUntil(date: string | undefined, today: string): number | null {
  if (!date) return null;
  return Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86_400_000);
}

/** The next exam of a semester (for the "today" card). */
export function nextExam(courses: CourseView[], today: string): CourseView | undefined {
  return courses
    .filter((c) => !c.hidden && c.examDate && c.examDate >= today)
    .sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
}

/** Weak topics first: not yet → review → known; for the study plan. */
export function weakTopics(c: CourseView, limit = 5): string[] {
  return [...c.allTopics].sort((a, b) => (c.levels[a] ?? 0) - (c.levels[b] ?? 0)).slice(0, limit);
}

/* --------------------------------------------------------------- search */

export interface StudyDoc {
  id: string;
  kind: 'course' | 'topic' | 'material';
  courseId: string;
  semester: number;
  title: string;
  body: string;
  to: string;
}

/** Splits long material into ~900-character chunks at paragraph / sentence boundaries. */
export function chunk(text: string, size = 900): string[] {
  // sentences / paragraphs; very long runs without punctuation are split by words
  const parts = text
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .filter((p) => p.trim())
    .flatMap((p) => (p.length <= size ? [p] : (p.match(new RegExp(`.{1,${size}}(?:\\s|$)`, 'gs')) ?? [p])));
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    if (cur && cur.length + p.length > size) {
      out.push(cur.trim());
      cur = '';
    }
    cur += `${p} `;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Everything searchable – only university data: syllabus (courses, topics, literature) and own materials. */
export function studyDocs(courses: CourseView[], materials: StudyMaterial[]): StudyDoc[] {
  const docs: StudyDoc[] = [];
  const sem = new Map(courses.map((c) => [c.id, c.semester]));
  for (const c of courses) {
    if (c.hidden) continue;
    docs.push({
      id: c.id,
      kind: 'course',
      courseId: c.id,
      semester: c.semester,
      title: c.name,
      body: [
        `Semestr ${c.semester}, ${c.ects} ECTS, ${c.assessment === 'E' ? 'egzamin' : 'zaliczenie'}.`,
        ...c.allTopics,
        ...c.literature,
      ].join(' '),
      to: `/studies/course/${c.id}`,
    });
    c.allTopics.forEach((t, i) =>
      docs.push({
        id: `${c.id}#${i}`,
        kind: 'topic',
        courseId: c.id,
        semester: c.semester,
        title: t,
        body: `${c.name}: ${t}`,
        to: `/studies/course/${c.id}`,
      }),
    );
  }
  for (const m of materials)
    chunk(m.text).forEach((part, i) =>
      docs.push({
        id: `${m.id}#${i}`,
        kind: 'material',
        courseId: m.courseId,
        semester: sem.get(m.courseId) ?? 0,
        title: m.title,
        body: part,
        to: `/studies/course/${m.courseId}?tab=materials`,
      }),
    );
  return docs;
}
