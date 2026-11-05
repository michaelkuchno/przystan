import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileUp, Save, Sparkles, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, IconButton, SectionTitle } from '@/components/ui/core';
import { Field, Select, TextArea } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { all, save, uid, useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { todayIso } from '@/lib/platform';
import { PROMPTS } from '@/lib/ai/prompts';
import { flashcardsSchema, validateFlashcards, type GeneratedCards } from '@/lib/ai/tasks';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import { DictateButton } from '@/features/ai/DictateButton';

interface Draft {
  id: string;
  front: string;
  back: string;
  keep: boolean;
}

export default function GenerateCards() {
  const { t } = useTranslation(['ai', 'learn']);
  const { lang } = usePrefs();
  const toast = useToast();
  const nav = useNavigate();
  const custom = useStore(() => all('deck'));
  const [text, setText] = useState('');
  const [fileInfo, setFileInfo] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [deckId, setDeckId] = useState('new');
  const task = useAiTask<GeneratedCards>();

  const loadFile = async () => {
    const { pickStudyFile, extractText } = await import('@/lib/ai/extract');
    const f = await pickStudyFile();
    if (!f) return;
    try {
      const content = await extractText(f);
      setText(content);
      setFileInfo(t('learn.fileRead', { chars: content.length.toLocaleString(), name: f.name }));
    } catch {
      toast({ text: t('learn.fileError'), tone: 'warn' });
    }
  };

  const run = async () => {
    const res = await task.run({
      sensitivity: 'study',
      texts: [text.slice(0, 30_000)],
      build: ([x]) => ({
        system: PROMPTS.flashcards(lang),
        prompt: x!,
        schema: flashcardsSchema,
        validate: validateFlashcards,
        maxTokens: 4096,
      }),
    });
    if (!res) return;
    setDrafts([
      ...res.cards.map((c) => ({ id: uid(), front: c.front, back: c.back, keep: true })),
      ...res.questions.map((q) => ({ id: uid(), front: q.question, back: q.answer, keep: true })),
    ]);
  };

  const store = async () => {
    const cards = drafts
      .filter((d) => d.keep && d.front.trim() && d.back.trim())
      .map(({ id, front, back }) => ({ id, front, back }));
    if (!cards.length) return;
    const existing = custom.find((d) => d.id === deckId);
    const id = existing?.id ?? uid();
    await save(
      'deck',
      existing
        ? { ...existing, cards: [...existing.cards, ...cards] }
        : { id, title: t('learn.deckTitle', { date: todayIso() }), module: 'custom', cards },
    );
    toast({ text: t('learn.saved', { count: cards.length }), tone: 'ok' });
    nav(`/learn/deck/${id}`);
  };

  const patch = (id: string, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)));

  return (
    <Page>
      <PageHeader back="/learn" title={t('learn.generate')} subtitle={t('learn.generateText')} />
      <Card className="space-y-3">
        <Notice tone="warn">{t('learn.noClient')}</Notice>
        <Field label={t('learn.paste')} htmlFor="gen-text" hint={fileInfo || undefined}>
          <TextArea id="gen-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<Sparkles className="size-4" aria-hidden />}
            disabled={text.trim().length < 40 || task.state.status === 'working'}
            onClick={() => void run()}
          >
            {t('learn.run')}
          </Button>
          <Button variant="secondary" icon={<FileUp className="size-4" aria-hidden />} onClick={() => void loadFile()}>
            {t('learn.file')}
          </Button>
          <DictateButton sensitivity="study" onText={(x) => setText((v) => (v ? `${v}\n${x}` : x))} />
        </div>
      </Card>

      <div className="mt-4">
        <AiOutput state={task.state} onRetry={() => void run()} />
      </div>

      {drafts.length > 0 && (
        <>
          <SectionTitle>{t('learn.cards')}</SectionTitle>
          <ul className="space-y-3" data-testid="generated-cards">
            {drafts.map((d, i) => (
              <li key={d.id}>
                <Card className={d.keep ? 'space-y-2' : 'space-y-2 opacity-60'}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="size-5 accent-[var(--color-primary)]"
                        checked={d.keep}
                        onChange={(e) => patch(d.id, { keep: e.target.checked })}
                      />
                      {t('learn.include')} #{i + 1}
                    </label>
                    <IconButton label={t('discard')} onClick={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <TextArea
                    autoGrow
                    rows={1}
                    aria-label={t('learn.front')}
                    value={d.front}
                    onChange={(e) => patch(d.id, { front: e.target.value })}
                  />
                  <TextArea
                    autoGrow
                    aria-label={t('learn.back')}
                    rows={2}
                    value={d.back}
                    onChange={(e) => patch(d.id, { back: e.target.value })}
                  />
                </Card>
              </li>
            ))}
          </ul>
          <Card className="mt-4 flex flex-wrap items-end gap-3">
            <Field label={t('learn.deck')} htmlFor="gen-deck" className="min-w-0 flex-1 basis-56">
              <Select id="gen-deck" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
                <option value="new">{t('learn.newDeck', { title: t('learn.deckTitle', { date: todayIso() }) })}</option>
                {custom.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Button icon={<Save className="size-4" aria-hidden />} onClick={() => void store()}>
              {t('learn.save')}
            </Button>
          </Card>
        </>
      )}
      {task.previewEl}
    </Page>
  );
}
