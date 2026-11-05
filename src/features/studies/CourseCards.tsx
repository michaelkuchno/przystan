import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Pencil, Plus, Sparkles } from 'lucide-react';
import { Badge, Button, ButtonLink, Card, Stat } from '@/components/ui/core';
import { TextArea } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { all, get, save, uid, useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { isDue } from '@/lib/srs';
import { todayIso } from '@/lib/platform';
import { deckIdFor, type CourseView } from '@/lib/studies/program';
import { STUDY_PROMPTS, type StudyContext } from '@/lib/ai/studyPrompts';
import { flashcardsSchema, validateFlashcards, type GeneratedCards } from '@/lib/ai/tasks';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import type { Deck, FlashCard } from '@/domain/types';

/** Adds cards to the course deck (creates it on first use). */
let queue: Promise<unknown> = Promise.resolve();
/** Serialised: quick additions one after another must not overwrite each other. */
function addCards(c: CourseView, cards: Omit<FlashCard, 'id'>[]): Promise<void> {
  const run = async () => {
    const id = deckIdFor(c.id);
    const cur = get('deck', id);
    const deck: Deck = cur ?? { id, title: c.name, module: 'study', cards: [] };
    await save('deck', { ...deck, title: c.name, cards: [...deck.cards, ...cards.map((x) => ({ ...x, id: uid() }))] });
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** Material text used as context (the newest first, limited). */
export function materialsText(courseId: string, max = 12_000): string {
  let out = '';
  for (const m of all('studyMaterial')
    .filter((x) => x.courseId === courseId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (out.length > max) break;
    out += `\n--- ${m.title}\n${m.text}`;
  }
  return out.slice(0, max);
}

export function CourseCards({ c, context }: { c: CourseView; context: StudyContext }) {
  const { t } = useTranslation(['studies', 'ai']);
  const { lang, ai } = usePrefs();
  const toast = useToast();
  const deck = useStore(() => get('deck', deckIdFor(c.id)));
  const states = useStore(() => all('cardState').filter((s) => s.deckId === deckIdFor(c.id)));
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const task = useAiTask<GeneratedCards>();
  const today = todayIso();
  const cards = deck?.cards ?? [];
  const stateById = new Map(states.map((s) => [s.cardId, s]));
  const due = cards.filter((x) => isDue(stateById.get(x.id), today)).length;
  const learned = cards.filter((x) => (stateById.get(x.id)?.repetitions ?? 0) >= 2).length;

  const generate = () => {
    setPicked({});
    void task.run({
      sensitivity: 'study',
      texts: [materialsText(c.id)],
      build: ([mat]) => ({
        system: STUDY_PROMPTS.cards(lang, context),
        prompt: `Course: ${c.name}\nSyllabus topics:\n- ${c.allTopics.join('\n- ') || '—'}\nLiterature: ${c.literature.join('; ') || '—'}${mat?.trim() ? `\n\nStudent's materials:${mat}` : ''}`,
        schema: flashcardsSchema,
        validate: validateFlashcards,
        maxTokens: 4000,
      }),
    });
  };
  const gen = task.state.result?.cards ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('cards.total')} value={cards.length} />
        <Stat label={t('cards.due')} value={due} tone={due ? 'accent' : 'ok'} />
        <Stat label={t('cards.learned')} value={learned} tone="ok" />
      </div>
      <div className="flex flex-wrap gap-2">
        {cards.length > 0 && (
          <ButtonLink to={`/learn/study/${deckIdFor(c.id)}`} icon={<GraduationCap className="size-4" aria-hidden />}>
            {due ? t('cards.study', { count: due }) : t('cards.review')}
          </ButtonLink>
        )}
        {cards.length > 0 && (
          <ButtonLink to={`/learn/deck/${deckIdFor(c.id)}`} variant="secondary" icon={<Pencil className="size-4" aria-hidden />}>
            {t('cards.edit')}
          </ButtonLink>
        )}
        {ai.mode !== 'off' && (
          <Button
            variant="soft"
            icon={<Sparkles className="size-4" aria-hidden />}
            disabled={task.state.status === 'working'}
            onClick={generate}
          >
            {t('cards.generate')}
          </Button>
        )}
      </div>
      <AiOutput state={task.state} onRetry={generate}>
        {gen.length > 0 && (
          <Card className="space-y-2" data-testid="study-generated">
            <p className="text-sm text-muted">{t('cards.pick')}</p>
            <ul className="space-y-2">
              {gen.map((g, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 accent-[var(--color-primary)]"
                      checked={picked[i] ?? true}
                      onChange={(e) => setPicked({ ...picked, [i]: e.target.checked })}
                    />
                    <span>
                      <span className="block font-medium">{g.front}</span>
                      <span className="block text-sm text-muted">{g.back}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => {
                const chosen = gen.filter((_, i) => picked[i] ?? true);
                void addCards(c, chosen).then(() => {
                  toast({ text: t('cards.added', { count: chosen.length }), tone: 'ok' });
                  task.reset();
                });
              }}
            >
              {t('cards.add')}
            </Button>
          </Card>
        )}
      </AiOutput>
      <Card className="space-y-2">
        <h3 className="font-sans text-base font-semibold">{t('cards.own')}</h3>
        <TextArea
          autoGrow
          rows={1}
          aria-label={t('cards.front')}
          placeholder={t('cards.front')}
          value={front}
          onChange={(e) => setFront(e.target.value)}
        />
        <TextArea
          autoGrow
          aria-label={t('cards.back')}
          placeholder={t('cards.back')}
          rows={2}
          value={back}
          onChange={(e) => setBack(e.target.value)}
        />
        <Button
          variant="secondary"
          icon={<Plus className="size-4" aria-hidden />}
          disabled={!front.trim() || !back.trim()}
          onClick={() => {
            const card = { front: front.trim(), back: back.trim() };
            // clear at once – the next card can be typed while this one is being saved
            setFront('');
            setBack('');
            void addCards(c, [card]).then(() => toast({ text: t('cards.added', { count: 1 }), tone: 'ok' }));
          }}
        >
          {t('cards.addOne')}
        </Button>
        {cards.length === 0 && <Badge>{t('cards.empty')}</Badge>}
      </Card>
      {task.previewEl}
    </div>
  );
}
