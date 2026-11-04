import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, Card } from '@/components/ui/core';
import { Field, TextArea } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { usePrefs } from '@/lib/prefs';
import { PROMPTS } from '@/lib/ai/prompts';
import { gradeSchema, validateGrade, type Grade } from '@/lib/ai/tasks';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import { DictateButton } from '@/features/ai/DictateButton';
import { useDecks, shuffle } from './decks';

interface Question {
  question: string;
  reference: string;
}

/** Open questions: deck cards (front → back) or knowledge cards (title → essence + techniques). */
export default function OpenExam() {
  const { t } = useTranslation(['ai', 'learn']);
  const { lang } = usePrefs();
  const decks = useDecks();
  const content = useContent();
  const [source, setSource] = useState<'decks' | 'knowledge'>('decks');
  const questions = useMemo<Question[]>(() => {
    if (source === 'knowledge')
      return shuffle(
        [...content.knowledge.cards, ...content.resocialization.cards, ...content.family.cards].map((c) => ({
          question: c.title,
          reference: [c.essence, ...c.whenToUse, ...c.techniques, ...c.pitfalls].join('\n'),
        })),
      );
    return shuffle(
      decks.flatMap((d) => d.cards.filter((c) => c.back.length > 40).map((c) => ({ question: c.front, reference: c.back }))),
    );
  }, [source, decks, content]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const task = useAiTask<Grade>();
  const q = questions[i % Math.max(1, questions.length)];

  const check = () =>
    q &&
    void task.run({
      sensitivity: 'study',
      texts: [answer],
      build: ([a]) => ({
        system: PROMPTS.grade(lang),
        prompt: `Question: ${q.question}\n\nReference material:\n${q.reference}\n\nStudent answer:\n${a}`,
        schema: gradeSchema,
        validate: validateGrade,
        maxTokens: 1500,
      }),
    });

  const next = () => {
    setI((x) => x + 1);
    setAnswer('');
    task.reset();
  };

  const g = task.state.result;
  return (
    <Page>
      <PageHeader back="/learn" title={t('learn.openTitle')} subtitle={t('learn.openExamText')} />
      <div role="radiogroup" aria-label={t('learn.source')} className="mb-4 flex flex-wrap gap-2">
        {(['decks', 'knowledge'] as const).map((s) => (
          <Button
            key={s}
            role="radio"
            aria-checked={source === s}
            variant={source === s ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setSource(s);
              setI(0);
              setAnswer('');
              task.reset();
            }}
          >
            {t(s === 'decks' ? 'learn.sourceDecks' : 'learn.sourceKnowledge')}
          </Button>
        ))}
      </div>
      {q && (
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold" data-testid="open-question">
            {q.question}
          </h2>
          <Field label={t('learn.yourAnswer')} htmlFor="open-answer">
            <TextArea
              id="open-answer"
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={task.state.status === 'working'}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<Sparkles className="size-4" aria-hidden />}
              disabled={answer.trim().length < 10 || task.state.status === 'working'}
              onClick={check}
            >
              {t('learn.check')}
            </Button>
            <DictateButton sensitivity="study" onText={(x) => setAnswer((v) => (v ? `${v} ${x}` : x))} />
            <Button variant="ghost" icon={<ArrowRight className="size-4" aria-hidden />} onClick={next}>
              {t('learn.next')}
            </Button>
          </div>
        </Card>
      )}
      <div className="mt-4">
        <AiOutput state={task.state} onRetry={check}>
          {g && (
            <Card className="space-y-3" data-testid="grade">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-serif text-3xl font-semibold tabular-nums">{g.score}%</span>
                <Badge tone={g.verdict === 'good' ? 'ok' : g.verdict === 'partial' ? 'warn' : 'accent'}>
                  {t(`learn.verdict.${g.verdict}`)}
                </Badge>
              </div>
              {g.covered.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">{t('learn.covered')}</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    {g.covered.map((c) => (
                      <li key={c} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {g.missing.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">{t('learn.missing')}</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    {g.missing.map((c) => (
                      <li key={c} className="flex gap-2">
                        <XCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {g.modelAnswer && (
                <div>
                  <h3 className="text-sm font-semibold">{t('learn.modelAnswer')}</h3>
                  <p className="mt-1 text-sm leading-relaxed">{g.modelAnswer}</p>
                </div>
              )}
              {g.tip && (
                <p className="text-sm text-muted">
                  <span className="font-medium">{t('learn.tip')}:</span> {g.tip}
                </p>
              )}
              <details className="text-sm">
                <summary className="min-h-11 cursor-pointer content-center font-medium">{t('learn.reference')}</summary>
                <p className="whitespace-pre-line text-muted">{q?.reference}</p>
              </details>
            </Card>
          )}
        </AiOutput>
      </div>
      {task.previewEl}
    </Page>
  );
}
