import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardCheck, Layers, Sparkles, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/ui/core';
import { Select, TextArea } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/components/ui/cn';
import { all, get, save, uid, useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { fmtDate } from '@/lib/format';
import { deckIdFor, type CourseView } from '@/lib/studies/program';
import type { ExamQuestion } from '@/lib/studies/types';
import { STUDY_PROMPTS, type StudyContext } from '@/lib/ai/studyPrompts';
import { mockExamSchema, validateMockExam, type MockExam as Exam } from '@/lib/ai/tasks';
import { shuffle } from '@/features/learn/decks';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import { materialsText } from './CourseCards';
import { examFromPack, type StudyPack } from '@/lib/studies/packs';

/** Without AI: single-choice questions from the course flash cards (correct back + 3 others). */
export function examFromCards(cards: { front: string; back: string }[], n: number, rnd = Math.random): ExamQuestion[] {
  if (cards.length < 4) return [];
  return shuffle(cards, rnd)
    .slice(0, n)
    .map((card) => {
      const others = shuffle(
        cards.filter((x) => x.back !== card.back),
        rnd,
      )
        .slice(0, 3)
        .map((x) => x.back);
      const options = shuffle([card.back, ...others], rnd);
      return { type: 'single' as const, question: card.front, options, correct: options.indexOf(card.back), answer: card.back };
    });
}

export const scoreOf = (points: number[]) =>
  points.length ? Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 100) : 0;

export function MockExam({ c, context, pack }: { c: CourseView; context: StudyContext; pack: StudyPack | null }) {
  const { t } = useTranslation(['studies', 'ai']);
  const { lang, ai } = usePrefs();
  const attempts = useStore(() => all('studyAttempt').filter((a) => a.courseId === c.id)).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const deck = useStore(() => get('deck', deckIdFor(c.id)));
  const [size, setSize] = useState('10');
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [selfScore, setSelfScore] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const task = useAiTask<Exam>();

  const start = (qs: ExamQuestion[]) => {
    setQuestions(qs);
    setAnswers(qs.map(() => null));
    setSelfScore({});
    setChecked(false);
  };

  const generate = () => {
    const n = Number(size);
    const open = Math.max(1, Math.round(n / 5));
    void task
      .run({
        sensitivity: 'study',
        texts: [materialsText(c.id, 10_000)],
        build: ([mat]) => ({
          system: STUDY_PROMPTS.mockExam(lang, context, { single: n - open, open }),
          prompt: `Course: ${c.name} (${c.assessment === 'E' ? 'exam' : 'credit'})\nSyllabus topics:\n- ${c.allTopics.join('\n- ') || '—'}\nLiterature: ${c.literature.join('; ') || '—'}${mat?.trim() ? `\n\nStudent's materials:${mat}` : ''}`,
          schema: mockExamSchema,
          validate: validateMockExam,
          maxTokens: 6000,
        }),
      })
      .then((r) => r && start(r.questions));
  };

  const points = (questions ?? []).map((q, i) =>
    q.type === 'single' ? (answers[i] === q.correct ? 1 : 0) : (selfScore[i] ?? 0),
  );
  const finish = async () => {
    if (!questions) return;
    const score = scoreOf(points);
    await save('studyAttempt', {
      id: uid(),
      courseId: c.id,
      date: new Date().toISOString(),
      questions,
      answers,
      points,
      score,
      updatedAt: new Date().toISOString(),
    });
    void import('@/lib/studies/streak').then((m) => m.countStudy(questions.length));
    setQuestions(null);
  };

  if (questions)
    return (
      <div className="space-y-3" data-testid="exam">
        {questions.map((q, i) => (
          <Card key={i} className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-serif text-lg font-semibold tabular-nums text-muted">{i + 1}.</span>
              <div className="flex-1 font-medium">{q.question}</div>
            </div>
            {q.type === 'single' ? (
              <div role="radiogroup" aria-label={q.question} className="space-y-1.5">
                {q.options!.map((o, j) => {
                  const chosen = answers[i] === j;
                  const right = checked && j === q.correct;
                  const wrong = checked && chosen && j !== q.correct;
                  return (
                    <button
                      key={j}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      disabled={checked}
                      onClick={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))}
                      className={cn(
                        'flex min-h-11 w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                        right
                          ? 'border-ok bg-ok-soft'
                          : wrong
                            ? 'border-accent bg-accent-soft'
                            : chosen
                              ? 'border-primary bg-primary-soft'
                              : 'border-line hover:border-primary/50',
                      )}
                    >
                      {right ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
                      ) : wrong ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      ) : null}
                      {o}
                    </button>
                  );
                })}
              </div>
            ) : (
              <TextArea
                aria-label={t('exam.yourAnswer')}
                rows={4}
                disabled={checked}
                value={(answers[i] as string) ?? ''}
                onChange={(e) => setAnswers(answers.map((a, k) => (k === i ? e.target.value : a)))}
              />
            )}
            {checked && (
              <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
                <p>
                  <span className="font-medium">{q.type === 'open' ? t('exam.model') : t('exam.why')}:</span> {q.answer}
                </p>
                {q.topic && <p className="text-xs text-muted">{t('exam.topic', { topic: q.topic })}</p>}
                {q.type === 'open' && (
                  <div role="radiogroup" aria-label={t('exam.selfScore')} className="flex flex-wrap gap-1.5">
                    {[1, 0.5, 0].map((p) => (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={selfScore[i] === p}
                        onClick={() => setSelfScore({ ...selfScore, [i]: p })}
                        className={cn(
                          'min-h-9 rounded-full px-3 text-xs font-medium',
                          selfScore[i] === p ? 'bg-fg text-bg' : 'bg-surface text-muted',
                        )}
                      >
                        {t(`exam.self.${p === 1 ? 'good' : p === 0.5 ? 'partial' : 'wrong'}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
        {!checked ? (
          <Button size="lg" icon={<ClipboardCheck className="size-5" aria-hidden />} onClick={() => setChecked(true)}>
            {t('exam.check')}
          </Button>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-3" data-testid="exam-result">
            <div>
              <div className="text-sm text-muted">{t('exam.result')}</div>
              <div className="font-serif text-4xl font-semibold tabular-nums">{scoreOf(points)}%</div>
              <div className="text-sm">
                {scoreOf(points) >= 75 ? t('exam.great') : scoreOf(points) >= 50 ? t('exam.ok') : t('exam.more')}
              </div>
            </div>
            <Button size="lg" onClick={() => void finish()}>
              {t('exam.save')}
            </Button>
          </Card>
        )}
      </div>
    );

  const cards = deck?.cards ?? [];
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="text-sm leading-relaxed">{t('exam.lead')}</p>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          {t('exam.size')}
          <Select className="w-auto" value={size} onChange={(e) => setSize(e.target.value)} aria-label={t('exam.size')}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap gap-2">
          {pack && pack.questions.length > 0 && (
            <Button
              icon={<ClipboardCheck className="size-4" aria-hidden />}
              onClick={() => start(examFromPack(pack, Number(size)))}
            >
              {t('exam.fromBank')}
            </Button>
          )}
          {ai.mode !== 'off' && (
            <Button
              variant={pack ? 'secondary' : 'primary'}
              icon={<Sparkles className="size-4" aria-hidden />}
              disabled={task.state.status === 'working' || (!c.allTopics.length && !materialsText(c.id, 10))}
              onClick={generate}
            >
              {t('exam.generate')}
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<Layers className="size-4" aria-hidden />}
            disabled={cards.length < 4}
            onClick={() => start(examFromCards(cards, Number(size)))}
          >
            {t('exam.fromCards')}
          </Button>
        </div>
        {pack && pack.questions.length > 0 && (
          <p className="text-xs text-muted">{t('exam.bank', { single: pack.questions.length, open: pack.open.length })}</p>
        )}
        {cards.length < 4 && <p className="text-xs text-muted">{t('exam.needCards')}</p>}
        {ai.mode === 'off' && !pack && <Notice>{t('exam.noAi')}</Notice>}
      </Card>
      <AiOutput state={task.state} onRetry={generate} />
      <div>
        <h3 className="mb-2 font-sans text-base font-semibold">{t('exam.history')}</h3>
        {attempts.length === 0 ? (
          <EmptyState title={t('exam.noHistory')} />
        ) : (
          <ul className="space-y-1.5" data-testid="exam-history">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              >
                <span>
                  {fmtDate(a.date)} · {t('exam.questions', { count: a.questions.length })}
                </span>
                <Badge tone={a.score >= 75 ? 'ok' : a.score >= 50 ? 'warn' : 'accent'}>{a.score}%</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      {task.previewEl}
    </div>
  );
}
