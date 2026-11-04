import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus, Upload, FileQuestion, Pencil, Sparkles } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, ButtonLink, Card, CardLink, Badge, SectionTitle, IconButton } from '@/components/ui/core';
import { usePrefs } from '@/lib/prefs';
import { useToast } from '@/components/ui/toast';
import { useStore, all, save, uid } from '@/lib/store';
import { isDue } from '@/lib/srs';
import { todayIso, pickTextFile } from '@/lib/platform';
import { useDecks, parseDeckImport } from './decks';

export default function Learn() {
  const { t } = useTranslation(['learn', 'ai']);
  const aiMode = usePrefs().ai.mode;
  const nav = useNavigate();
  const toast = useToast();
  const decks = useDecks();
  const states = useStore(() => all('cardState'));
  const today = todayIso();

  const importDecks = async () => {
    const text = await pickTextFile('application/json,.json');
    if (!text) return;
    try {
      const parsed = parseDeckImport(text);
      for (const d of parsed)
        await save('deck', {
          id: uid(),
          title: d.title,
          module: d.module ?? 'custom',
          cards: d.cards.map((c) => ({ id: uid(), ...c })),
        });
      toast({ text: t('imported', { count: parsed.length }), tone: 'ok' });
    } catch {
      toast({ text: t('importError'), tone: 'warn' });
    }
  };

  const createDeck = async () => {
    const id = uid();
    await save('deck', { id, title: t('newDeckTitle'), module: 'custom', cards: [] });
    nav(`/learn/deck/${id}`);
  };

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <ButtonLink to="/learn/exam" icon={<FileQuestion className="size-4" />}>
            {t('exam')}
          </ButtonLink>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => {
          const st = d.cards.map((c) => states.find((s) => s.id === `${d.id}:${c.id}`));
          const due = st.filter((s) => isDue(s, today)).length;
          const learned = st.filter((s) => s && s.repetitions >= 2).length;
          return (
            <Card key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <GraduationCap className="size-6 text-primary" aria-hidden />
                {!d.builtIn && (
                  <IconButton label={t('edit')} onClick={() => nav(`/learn/deck/${d.id}`)}>
                    <Pencil className="size-4" />
                  </IconButton>
                )}
              </div>
              <div className="mt-1 font-serif text-lg font-semibold">{d.title}</div>
              <div className="mt-1 text-sm text-muted">{t('cards', { count: d.cards.length })}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <div
                  className="h-full bg-primary"
                  style={{ width: `${d.cards.length ? (learned / d.cards.length) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge tone={due ? 'accent' : 'ok'}>{due ? t('due', { count: due }) : t('upToDate')}</Badge>
                <Button
                  size="sm"
                  variant={due ? 'primary' : 'soft'}
                  disabled={!d.cards.length}
                  onClick={() => nav(`/learn/study/${d.id}`)}
                >
                  {t('study')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {aiMode !== 'off' && (
        <>
          <SectionTitle>{t('ai:name')}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <CardLink to="/learn/generate">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" aria-hidden /> {t('ai:learn.generate')}
              </div>
              <p className="mt-1 text-sm text-muted">{t('ai:learn.generateText')}</p>
            </CardLink>
            <CardLink to="/learn/exam-open">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" aria-hidden /> {t('ai:learn.openExam')}
              </div>
              <p className="mt-1 text-sm text-muted">{t('ai:learn.openExamText')}</p>
            </CardLink>
          </div>
        </>
      )}
      <SectionTitle>{t('custom')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => void createDeck()}>
          {t('newDeck')}
        </Button>
        <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => void importDecks()}>
          {t('import')}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted">{t('importHint')}</p>
    </Page>
  );
}
