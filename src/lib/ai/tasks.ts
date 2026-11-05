/**
 * AI tasks: JSON schema (structured output) + validation of the answer. Provider-independent,
 * so the same task runs on Gemini, the local LLM or the fake provider. `schema.title` names the task.
 */
import type { JsonSchema } from './types';
import { arr, num, obj, oneOf, optStr, str, strList } from './parse';
import { MITI_CATEGORIES } from './prompts';
import type { MitiCategory } from '@/content/types';

const S = (title: string, properties: Record<string, unknown>, required = Object.keys(properties)): JsonSchema => ({
  title,
  type: 'object',
  properties,
  required,
});
const T = { type: 'string' };
const LIST = { type: 'array', items: { type: 'string' } };

/* ------------------------------------------------------------- simulator */

export const MOODS = ['calm', 'guarded', 'angry', 'sad', 'hopeful'] as const;
export const TALK = ['change', 'sustain', 'neutral'] as const;

export interface SimTurn {
  category: MitiCategory;
  alliance: number;
  feedback: string;
  better: string;
  reply: string;
  talk: (typeof TALK)[number];
  mood: (typeof MOODS)[number];
  end: boolean;
}

export const simTurnSchema = S('simTurn', {
  classification: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: [...MITI_CATEGORIES] },
      alliance: { type: 'integer', minimum: -2, maximum: 2 },
      feedback: T,
      better: T,
    },
    required: ['category', 'alliance', 'feedback', 'better'],
  },
  reply: {
    type: 'object',
    properties: { text: T, talk: { type: 'string', enum: [...TALK] }, mood: { type: 'string', enum: [...MOODS] } },
    required: ['text', 'talk', 'mood'],
  },
  end: { type: 'boolean' },
});

export function validateSimTurn(v: unknown): SimTurn {
  const o = obj(v);
  const c = obj(o.classification, 'classification');
  const r = obj(o.reply, 'reply');
  return {
    category: oneOf(c.category, MITI_CATEGORIES, 'closedQuestion'),
    alliance: Math.round(num(c.alliance, -2, 2, 0)),
    feedback: optStr(c.feedback, 600),
    better: optStr(c.better, 400),
    reply: str(r.text, 'reply.text', 800),
    talk: oneOf(r.talk, TALK, 'neutral'),
    mood: oneOf(r.mood, MOODS, 'guarded'),
    end: o.end === true || o.end === 'true',
  };
}

/* ------------------------------------------------------------ flashcards */

export interface GeneratedCards {
  cards: { front: string; back: string }[];
  questions: { question: string; answer: string }[];
}

export const flashcardsSchema = S('flashcards', {
  cards: {
    type: 'array',
    items: { type: 'object', properties: { front: T, back: T }, required: ['front', 'back'] },
    maxItems: 20,
  },
  questions: {
    type: 'array',
    items: { type: 'object', properties: { question: T, answer: T }, required: ['question', 'answer'] },
    maxItems: 8,
  },
});

export function validateFlashcards(v: unknown): GeneratedCards {
  const o = obj(v);
  const cards = arr(
    o.cards,
    (x) => {
      const c = obj(x);
      return { front: str(c.front, 'front', 200), back: str(c.back, 'back', 600) };
    },
    20,
  );
  const questions = Array.isArray(o.questions)
    ? arr(
        o.questions,
        (x) => {
          const q = obj(x);
          return { question: str(q.question, 'question', 300), answer: str(q.answer, 'answer', 1000) };
        },
        8,
      )
    : [];
  if (!cards.length && !questions.length) throw new Error('empty');
  return { cards, questions };
}

/* ----------------------------------------------------------------- grade */

export interface Grade {
  score: number;
  verdict: 'good' | 'partial' | 'insufficient';
  covered: string[];
  missing: string[];
  modelAnswer: string;
  tip: string;
}

export const gradeSchema = S('grade', {
  score: { type: 'integer', minimum: 0, maximum: 100 },
  verdict: { type: 'string', enum: ['good', 'partial', 'insufficient'] },
  covered: LIST,
  missing: LIST,
  modelAnswer: T,
  tip: T,
});

export function validateGrade(v: unknown): Grade {
  const o = obj(v);
  const score = Math.round(num(o.score, 0, 100, 0));
  return {
    score,
    // the verdict always matches the score (models sometimes disagree with themselves)
    verdict: score >= 75 ? 'good' : score >= 40 ? 'partial' : 'insufficient',
    covered: strList(o.covered),
    missing: strList(o.missing),
    modelAnswer: optStr(o.modelAnswer, 1500),
    tip: optStr(o.tip, 400),
  };
}

/* ------------------------------------------------------------------- ask */

export interface Answer {
  answer: string;
  sources: number[];
  known: boolean;
}

export const askSchema = S('ask', {
  answer: T,
  sources: { type: 'array', items: { type: 'integer' } },
  known: { type: 'boolean' },
});

export function validateAnswer(v: unknown, sourceCount: number): Answer {
  const o = obj(v);
  const sources = Array.isArray(o.sources)
    ? [...new Set(o.sources.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 1 && n <= sourceCount))]
    : [];
  return { answer: str(o.answer, 'answer', 3000), sources, known: o.known !== false && o.known !== 'false' };
}

/* -------------------------------------------------------------- organize */

export const organizeSchema = (fields: string[]) =>
  S('organize', {
    fields: { type: 'object', properties: Object.fromEntries(fields.map((f) => [f, T])), required: [] },
  });

export function validateOrganize(v: unknown, fields: string[]): Record<string, string> {
  const o = obj(v);
  const f = obj(o.fields ?? o, 'fields');
  const out: Record<string, string> = {};
  for (const k of fields) {
    const val = optStr(f[k], 4000);
    if (val) out[k] = val;
  }
  if (!Object.keys(out).length) throw new Error('empty');
  return out;
}

/* ----------------------------------------------------------- lesson plan */

export interface LessonPlan {
  title: string;
  steps: { title: string; minutes: number; description: string }[];
}

export const lessonPlanSchema = S('lessonPlan', {
  title: T,
  steps: {
    type: 'array',
    items: {
      type: 'object',
      properties: { title: T, minutes: { type: 'integer', minimum: 1, maximum: 180 }, description: T },
      required: ['title', 'minutes', 'description'],
    },
    maxItems: 12,
  },
});

export function validateLessonPlan(v: unknown): LessonPlan {
  const o = obj(v);
  const steps = arr(
    o.steps,
    (x) => {
      const s = obj(x);
      return {
        title: str(s.title, 'title', 120),
        minutes: Math.round(num(s.minutes, 1, 180, 10)),
        description: optStr(s.description, 600),
      };
    },
    12,
  );
  if (!steps.length) throw new Error('empty');
  return { title: optStr(o.title, 160), steps };
}

/* ------------------------------------------------------------ prevention */

export interface PreventionProposal {
  generalGoal: string;
  specificGoals: string[];
  strategies: string[];
  riskFactors: string[];
  protectiveFactors: string[];
}

export const preventionSchema = S('prevention', {
  generalGoal: T,
  specificGoals: LIST,
  strategies: LIST,
  riskFactors: LIST,
  protectiveFactors: LIST,
});

export function validatePrevention(v: unknown): PreventionProposal {
  const o = obj(v);
  return {
    generalGoal: str(o.generalGoal, 'generalGoal', 400),
    specificGoals: strList(o.specificGoals, 8),
    strategies: strList(o.strategies, 10),
    riskFactors: strList(o.riskFactors, 10),
    protectiveFactors: strList(o.protectiveFactors, 10),
  };
}

/* ----------------------------------------------------------- supervision */

export const supervisionSchema = S('supervision', { questions: LIST });

export function validateQuestions(v: unknown): string[] {
  const q = strList(obj(v).questions, 10);
  if (!q.length) throw new Error('empty');
  return q;
}

/* --------------------------------------------------------- e-mail / SMS */

export interface DraftMessage {
  subject: string;
  body: string;
  sms: string;
  cautions: string[];
}

export const messageSchema = S('message', {
  subject: T,
  body: T,
  sms: T,
  cautions: LIST,
});

export function validateMessage(v: unknown): DraftMessage {
  const o = obj(v);
  return {
    subject: optStr(o.subject, 200),
    body: str(o.body, 'body', 8000),
    sms: optStr(o.sms, 480),
    cautions: strList(o.cautions, 6),
  };
}
