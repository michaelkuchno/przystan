import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, Play, RotateCcw, Trophy } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, Badge } from '@/components/ui/core';
import { Chips } from '@/components/ui/form';
import { haptic } from '@/lib/platform';
import { useDecks, shuffle } from './decks';
import { cn } from '@/components/ui/cn';
import type { FlashCard } from '@/domain/types';

interface Q {
  card: FlashCard;
  deck: string;
  options: string[];
  answer: number;
}

export default function Exam() {
  const { t } = useTranslation('learn');
  const decks = useDecks().filter((d) => d.cards.length >= 4);
  const [chosen, setChosen] = useState<string[]>(decks.map((d) => d.id));
  const [count, setCount] = useState('10');
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<Q[]>([]);

  const start = () => {
    const pool = decks.filter((d) => chosen.includes(d.id)).flatMap((d) => d.cards.map((c) => ({ c, d })));
    const sel = shuffle(pool).slice(0, Number(count));
    setQs(
      sel.map(({ c, d }) => {
        const distract = shuffle(d.cards.filter((x) => x.id !== c.id))
          .slice(0, 3)
          .map((x) => x.back);
        const options = shuffle([c.back, ...distract]);
        return { card: c, deck: d.title, options, answer: options.indexOf(c.back) };
      }),
    );
    setI(0);
    setPicked(null);
    setWrong([]);
  };

  if (!qs)
    return (
      <Page>
        <PageHeader back="/learn" title={t('exam')} subtitle={t('examSubtitle')} />
        <Card className="space-y-5">
          <Chips
            label={t('chooseDecks')}
            multiple
            value={chosen}
            onChange={setChosen}
            options={decks.map((d) => ({ value: d.id, label: d.title }))}
          />
          <Chips
            label={t('questions')}
            value={count}
            onChange={(v) => v[0] && setCount(v[0])}
            options={['10', '20', '30'].map((n) => ({ value: n, label: n }))}
          />
          <Button size="lg" disabled={!chosen.length} icon={<Play className="size-5" />} onClick={start}>
            {t('startExam')}
          </Button>
        </Card>
      </Page>
    );

  const q = qs[i];
  if (!q) {
    const score = qs.length - wrong.length;
    const pct = Math.round((score / qs.length) * 100);
    return (
      <Page>
        <PageHeader back="/learn" title={t('examResult')} />
        <Card className="text-center">
          <Trophy className="mx-auto size-10 text-accent" aria-hidden />
          <div className="mt-2 font-serif text-5xl font-semibold">{pct}%</div>
          <div className="text-muted">{t('score', { score, total: qs.length })}</div>
          <Badge tone={pct >= 80 ? 'ok' : pct >= 60 ? 'warn' : 'accent'} className="mt-2">
            {pct >= 80 ? t('verdictGood') : pct >= 60 ? t('verdictOk') : t('verdictWork')}
          </Badge>
        </Card>
        {wrong.length > 0 && (
          <Card className="mt-4">
            <h2 className="mb-3 text-lg font-semibold">{t('toReview')}</h2>
            <ul className="space-y-3">
              {wrong.map((w) => (
                <li key={w.card.id} className="text-sm">
                  <div className="font-medium">{w.card.front}</div>
                  <div className="text-muted">{w.card.back}</div>
                  <div className="text-xs text-muted">{w.deck}</div>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Button className="mt-4" icon={<RotateCcw className="size-4" />} onClick={() => setQs(null)}>
          {t('newExam')}
        </Button>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader back="/learn" title={t('exam')} subtitle={t('progress', { n: i + 1, total: qs.length })} />
      <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
        <Card>
          <div className="text-xs text-muted">{q.deck}</div>
          <h2 className="mt-1 text-xl font-semibold">{q.card.front}</h2>
          <div className="mt-4 space-y-2" role="radiogroup">
            {q.options.map((o, j) => {
              const state = picked === null ? 'idle' : j === q.answer ? 'right' : j === picked ? 'wrong' : 'idle';
              return (
                <button
                  key={j}
                  type="button"
                  role="radio"
                  aria-checked={picked === j}
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(j);
                    if (j !== q.answer) setWrong([...wrong, q]);
                    void haptic(j === q.answer ? 'success' : 'warning');
                  }}
                  className={cn(
                    'flex min-h-14 w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition',
                    state === 'right'
                      ? 'border-ok bg-ok-soft'
                      : state === 'wrong'
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:border-primary',
                  )}
                >
                  <span className="flex-1">{o}</span>
                  {state === 'right' && <Check className="size-5 shrink-0 text-ok" aria-hidden />}
                  {state === 'wrong' && <X className="size-5 shrink-0 text-accent" aria-hidden />}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <Button
              className="mt-4"
              onClick={() => {
                setPicked(null);
                setI(i + 1);
              }}
            >
              {t('next')}
            </Button>
          )}
        </Card>
      </motion.div>
    </Page>
  );
}
