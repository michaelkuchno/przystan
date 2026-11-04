import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, RotateCw } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, ButtonLink, EmptyState } from '@/components/ui/core';
import { all, save } from '@/lib/store';
import { isDue, newCardState, review, type Grade } from '@/lib/srs';
import { todayIso, haptic } from '@/lib/platform';
import { useDecks, shuffle } from './decks';
import { ExplainButtons } from '@/features/ai/ExplainButtons';
import { cn } from '@/components/ui/cn';

export default function Study() {
  const { t } = useTranslation('learn');
  const { deck: deckId } = useParams();
  const deck = useDecks().find((d) => d.id === deckId);
  const today = todayIso();
  const [extra, setExtra] = useState(false);
  const queue = useMemo(() => {
    if (!deck) return [];
    const states = all('cardState');
    const due = deck.cards.filter((c) =>
      isDue(
        states.find((s) => s.id === `${deck.id}:${c.id}`),
        today,
      ),
    );
    return shuffle(extra || !due.length ? deck.cards : due).slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id, extra]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  if (!deck)
    return (
      <Page>
        <EmptyState title={t('notFound')} />
      </Page>
    );
  const card = queue[i];

  const grade = async (g: Grade) => {
    if (!card) return;
    const id = `${deck.id}:${card.id}`;
    const prev = all('cardState').find((s) => s.id === id) ?? newCardState(deck.id, card.id, today);
    await save('cardState', review(prev, g, today));
    void haptic(g === 'again' ? 'warning' : 'light');
    setCounts({ ...counts, [g]: counts[g] + 1 });
    setFlipped(false);
    setI(i + 1);
  };

  return (
    <Page>
      <PageHeader
        back="/learn"
        title={deck.title}
        subtitle={card ? t('progress', { n: i + 1, total: queue.length }) : undefined}
      />
      {!card ? (
        <EmptyState
          icon={<PartyPopper />}
          title={t('sessionDone')}
          text={t('sessionStats', counts)}
          action={
            <div className="flex gap-2">
              <ButtonLink to="/learn" variant="secondary">
                {t('back')}
              </ButtonLink>
              <Button
                icon={<RotateCw className="size-4" />}
                onClick={() => {
                  setExtra(true);
                  setI(0);
                }}
              >
                {t('studyMore')}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="mx-auto max-w-xl">
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div className="h-full bg-primary transition-all" style={{ width: `${(i / queue.length) * 100}%` }} />
          </div>
          <button
            type="button"
            onClick={() => setFlipped(!flipped)}
            className="block w-full [perspective:1200px]"
            aria-label={flipped ? t('showFront') : t('showBack')}
          >
            <motion.div
              className="relative min-h-72 [transform-style:preserve-3d]"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-line bg-surface p-6 text-center shadow-xl [backface-visibility:hidden]">
                <div className="text-xs font-semibold tracking-wider text-accent uppercase">{t('question')}</div>
                <div className="mt-3 font-serif text-2xl leading-snug font-semibold">{card.front}</div>
                <div className="mt-6 text-sm text-muted">{t('tapToFlip')}</div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-primary/30 bg-primary-soft p-6 text-center shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="text-xs font-semibold tracking-wider text-primary-soft-fg uppercase">{t('answer')}</div>
                <div className="mt-3 text-lg leading-relaxed">{card.back}</div>
              </div>
            </motion.div>
          </button>
          <AnimatePresence>
            {flipped && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 grid grid-cols-4 gap-2"
              >
                {(['again', 'hard', 'good', 'easy'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => void grade(g)}
                    className={cn(
                      'min-h-14 rounded-2xl text-sm font-semibold transition active:scale-95',
                      g === 'again'
                        ? 'bg-accent-soft text-accent-soft-fg'
                        : g === 'hard'
                          ? 'bg-warn-soft text-warn'
                          : g === 'good'
                            ? 'bg-primary-soft text-primary-soft-fg'
                            : 'bg-blue-soft text-blue',
                    )}
                  >
                    {t(`grade.${g}`)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {flipped && (
            <div className="mt-4 flex justify-center">
              <ExplainButtons title={card.front} text={card.back} />
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
