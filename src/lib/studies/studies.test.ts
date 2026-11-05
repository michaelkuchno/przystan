import { describe, expect, it, vi } from 'vitest';
import program from '@/content/studies/wshe-brzeg.json';
import type { Program, StudyAttempt } from './types';
import { chunk, courseProgress, daysUntil, deckIdFor, inSemester, mergeCourses, nextExam, studyDocs, weakTopics } from './program';
import { defaultStudyPrefs, recordStudy, visibleStreak } from './settings';
import { examFromCards, scoreOf } from '@/features/studies/MockExam';
import { validateMockExam } from '@/lib/ai/tasks';
import { STUDY_PROMPTS } from '@/lib/ai/studyPrompts';
import { buildRawMessage, encodeHeader, base64url, sendGmail, GMAIL_SEND_URL } from '@/lib/notify/gmail';
import { smsGateBody } from '@/lib/notify/smsGateway';

const P = program as unknown as Program;

describe('WSHE Brzeg programme (bundled data)', () => {
  it('is complete and consistent', () => {
    expect(P.semesters).toBe(4);
    const ids = P.courses.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of P.courses) {
      expect(c.semester).toBeGreaterThanOrEqual(1);
      expect(c.semester).toBeLessThanOrEqual(4);
      expect(['E', 'ZO', 'Z']).toContain(c.assessment);
      expect(c.name.length).toBeGreaterThan(3);
    }
    // the addiction courses of the specialisation are there (as marked equivalents)
    const addiction = P.courses.filter((c) => c.group === 'addiction');
    expect(addiction.map((c) => c.id)).toEqual(expect.arrayContaining(['psychologia-uzaleznien', 'profilaktyka-uzaleznien']));
    expect(addiction.every((c) => c.proxy && c.topics.length > 0)).toBe(true);
    for (const s of P.sources) expect(s.url).toMatch(/^https:\/\/(www\.)?wshe\.edu\.pl\//);
  });
});

describe('programme merged with the student’s changes', () => {
  const merged = mergeCourses(P, [
    { id: 'psychologia-uzaleznien', examDate: '2027-01-30', extraTopics: ['Model Prochaski w terapii'], levels: { 'Model Prochaski w terapii': 2 }, updatedAt: '' },
    { id: 'andragogika', hidden: true, updatedAt: '' },
    { id: 'own-1', custom: true, name: 'Warsztat interwencji kryzysowej', semester: 3, assessment: 'E', extraTopics: ['Model ABC'], updatedAt: '' },
  ]);

  it('overrides, hides and adds own courses', () => {
    const psy = merged.find((c) => c.id === 'psychologia-uzaleznien')!;
    expect(psy.examDate).toBe('2027-01-30');
    expect(psy.allTopics.at(-1)).toBe('Model Prochaski w terapii');
    expect(merged.find((c) => c.id === 'andragogika')!.hidden).toBe(true);
    const own = merged.find((c) => c.id === 'own-1')!;
    expect(own).toMatchObject({ custom: true, semester: 3, allTopics: ['Model ABC'], group: 'custom' });
    expect(inSemester(merged.find((c) => c.id === 'seminarium')!, 4)).toBe(true);
    expect(nextExam(merged, '2026-11-05')!.id).toBe('psychologia-uzaleznien');
    expect(daysUntil('2026-11-08', '2026-11-05')).toBe(3);
  });

  it('progress combines topics, cards and mock exams', () => {
    const own = merged.find((c) => c.id === 'own-1')!;
    expect(courseProgress(own, undefined, [], []).readiness).toBe(0);
    const psy = merged.find((c) => c.id === 'psychologia-uzaleznien')!;
    const deck = { id: deckIdFor(psy.id), title: '', module: 'study', cards: [{ id: 'a', front: 'f', back: 'b' }, { id: 'b', front: 'f', back: 'b' }] };
    const states = [{ id: 'x', deckId: deck.id, cardId: 'a', easiness: 2.5, interval: 6, repetitions: 2, due: '2026-12-01', lapses: 0 }];
    const attempts = [{ courseId: psy.id, score: 80 } as StudyAttempt, { courseId: psy.id, score: 60 } as StudyAttempt];
    const pr = courseProgress(psy, deck, states, attempts);
    expect(pr.cards).toBe(0.5);
    expect(pr.best).toBe(80);
    expect(pr.readiness).toBeGreaterThan(0);
    expect(weakTopics(psy, 2)).not.toContain('Model Prochaski w terapii');
  });

  it('search documents: only university data (syllabus + own materials, chunked)', () => {
    const docs = studyDocs(merged, [
      { id: 'm1', courseId: 'psychologia-uzaleznien', title: 'Wykład 2', text: 'Współuzależnienie to… '.repeat(80), kind: 'notes', createdAt: '', updatedAt: '' },
    ]);
    expect(docs.some((d) => d.courseId === 'andragogika')).toBe(false); // hidden
    expect(docs.filter((d) => d.kind === 'material').length).toBeGreaterThan(1);
    expect(docs.find((d) => d.kind === 'topic' && d.title === 'Model ABC')!.semester).toBe(3);
    expect(chunk('a. '.repeat(10), 5).length).toBeGreaterThan(1);
  });
});

describe('daily goal and streak', () => {
  it('counts items, grows the streak once a day, resets after a missed day', () => {
    let p = { ...defaultStudyPrefs(), dailyGoal: 3 };
    p = recordStudy(p, 2, '2026-11-05', '2026-11-04');
    expect(p).toMatchObject({ doneToday: 2, streak: 0 });
    p = recordStudy(p, 2, '2026-11-05', '2026-11-04');
    expect(p).toMatchObject({ doneToday: 4, streak: 1 });
    p = recordStudy(p, 5, '2026-11-05', '2026-11-04');
    expect(p.streak).toBe(1); // only once per day
    p = recordStudy(p, 3, '2026-11-06', '2026-11-05');
    expect(p.streak).toBe(2);
    expect(visibleStreak(p, '2026-11-08', '2026-11-07')).toBe(0);
    p = recordStudy(p, 3, '2026-11-09', '2026-11-08');
    expect(p.streak).toBe(1);
  });
});

describe('mock exams', () => {
  it('without AI: single-choice questions from flash cards', () => {
    const cards = ['A', 'B', 'C', 'D', 'E'].map((x) => ({ front: `Q${x}`, back: `A${x}` }));
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const qs = examFromCards(cards, 3, rnd);
    expect(qs).toHaveLength(3);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(q.options![q.correct!]).toBe(cards.find((c) => c.front === q.question)!.back);
    }
    expect(examFromCards(cards.slice(0, 3), 3)).toEqual([]);
    expect(scoreOf([1, 0.5, 0, 1])).toBe(63);
  });

  it('validates AI exams and drops broken questions', () => {
    const e = validateMockExam({
      questions: [
        { type: 'single', question: 'Q1', options: ['a', 'b', 'c', 'd'], correct: 2, answer: 'why' },
        { type: 'single', question: 'Q2', options: ['a'], correct: 0, answer: '' },
        { type: 'open', question: 'Q3', answer: 'model' },
        { question: 'Q4', options: ['x', 'y'], correct: 5, answer: '' },
      ],
    });
    expect(e.questions.map((q) => q.question)).toEqual(['Q1', 'Q3']);
    expect(() => validateMockExam({ questions: [] })).toThrow();
  });

  it('study prompts keep answers inside university sources', () => {
    const ctx = { university: P.university, program: P.program, specialization: P.specialization };
    expect(STUDY_PROMPTS.ask('pl', ctx)).toMatch(/ONLY the numbered sources/);
    expect(STUDY_PROMPTS.mockExam('pl', ctx, { single: 8, open: 2 })).toMatch(/nothing outside the syllabus/);
    expect(STUDY_PROMPTS.ask('pl', ctx)).toContain('WSHE');
  });
});

describe('Gmail and SMS gateway', () => {
  const decode = (raw: string) => {
    const b = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
  };

  it('RFC 2822 message with UTF-8 subject and body, base64url', () => {
    const raw = buildRawMessage({
      from: 'ewelina@gmail.com',
      fromName: 'Ewelina Cholewa',
      to: 'sekretariat@szkola.pl',
      toName: 'Pani Żaneta',
      subject: 'Zaproszenie na rozmowę – ważne',
      body: 'Dzień dobry,\nzapraszam.\nZ poważaniem',
    });
    expect(raw).not.toMatch(/[+/=]/);
    const msg = decode(raw);
    expect(msg).toContain('From: Ewelina Cholewa <ewelina@gmail.com>');
    expect(msg).toMatch(/To: =\?UTF-8\?B\?.+\?= <sekretariat@szkola\.pl>/);
    expect(msg).toContain('Subject: =?UTF-8?B?');
    expect(msg).toContain('Content-Type: text/plain; charset=UTF-8');
    const body = msg.split('\r\n\r\n')[1]!.replace(/\r\n/g, '');
    expect(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)))).toBe('Dzień dobry,\r\nzapraszam.\r\nZ poważaniem');
    expect(encodeHeader('Plain ASCII')).toBe('Plain ASCII');
    for (const w of encodeHeader('Ż'.repeat(60)).split('\r\n ')) expect(w.length).toBeLessThanOrEqual(75);
    expect(base64url(new Uint8Array([251, 255]))).toBe('-_8');
  });

  it('sends with the bearer token; 401 → reconnect', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: 'abc' }), { status: 200 }));
    const r = await sendGmail({ access: 'TOKEN', expires: Date.now() + 1e6, email: 'me@gmail.com' }, { to: 'a@b.pl', subject: 'S', body: 'B' }, fetchImpl);
    expect(r.id).toBe('abc');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GMAIL_SEND_URL);
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer TOKEN');
    const bad = vi.fn(async () => new Response('{}', { status: 401 }));
    await expect(sendGmail({ access: 'x', expires: 0 }, { to: 'a@b.pl', subject: 'S', body: 'B' }, bad)).rejects.toMatchObject({ code: 'auth' });
  });

  it('SMS gateway request body', () => {
    expect(smsGateBody('+48 600 123 456, 0048 601 222 333', 'Hej')).toEqual({ textMessage: { text: 'Hej' }, phoneNumbers: ['+48600123456', '+48601222333'] });
  });
});
