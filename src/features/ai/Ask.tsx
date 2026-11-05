import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, Search as SearchIcon } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, Card } from '@/components/ui/core';
import { TextArea } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useContent } from '@/content/ContentProvider';
import { all, activeSpace, useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { currentRoute, getEmbedder } from '@/lib/ai';
import { PROMPTS } from '@/lib/ai/prompts';
import { askSchema, validateAnswer, type Answer } from '@/lib/ai/tasks';
import { TOOL_META } from '@/features/tools/registry';
import { buildDocs } from '@/features/search/searchIndex';
import { keywordSearch, semanticSearch, updateIndex, docText, type AskDoc, type Hit } from './semantic';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';
import type { Embedder } from '@/lib/ai/types';

const KINDS = new Set(['knowledge', 'institution', 'legal', 'card', 'tool', 'note', 'scenario', 'template']);

/** "[1]" markers in the answer become links to the sources. */
function withRefs(text: string, sources: Hit[]): ReactNode[] {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = /^\[(\d+)\]$/.exec(part);
    const hit = m ? sources[Number(m[1]) - 1] : undefined;
    return hit ? (
      <Link key={i} to={hit.doc.to} className="font-semibold text-primary underline" title={hit.doc.title}>
        {part}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

export default function Ask() {
  const { t } = useTranslation(['ai', 'search']);
  const content = useContent();
  const { country, presentation, lang, ai } = usePrefs();
  const notes = useStore(() => all('note'));
  const toolNames = useMemo(() => Object.fromEntries(TOOL_META.map((m) => [m.id, t(`tools:names.${m.id}`)])), [t]);
  const docs: AskDoc[] = useMemo(
    () =>
      buildDocs(
        content,
        { clients: [], meetings: [], recipes: [], programs: [], notes: presentation ? [] : notes },
        toolNames,
        country,
      ).filter((d) => KINDS.has(d.kind)),
    [content, notes, presentation, toolNames, country],
  );
  const [embedder, setEmbedder] = useState<Embedder | null>(null);
  const [vectors, setVectors] = useState<Map<string, Float32Array> | null>(null);
  const [indexPct, setIndexPct] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [sources, setSources] = useState<Hit[]>([]);
  const task = useAiTask<Answer>();
  const route = currentRoute('content');

  useEffect(() => {
    let alive = true;
    void getEmbedder().then(async (e) => {
      if (!alive || !e) return;
      setEmbedder(e);
      setIndexPct(0);
      try {
        const v = await updateIndex(
          `${activeSpace()}:${lang}`,
          docs,
          e,
          undefined,
          (f) => alive && setIndexPct(Math.round(f * 100)),
        );
        if (alive) setVectors(v);
      } catch {
        /* model missing – keyword search stays */
      } finally {
        if (alive) setIndexPct(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [docs, lang, ai.mode, ai.localModels]);

  const ask = async () => {
    const question = q.trim();
    if (!question) return;
    let found: Hit[];
    if (embedder && vectors) {
      const [qv] = await embedder.embed([question], 'query');
      found = semanticSearch(qv!, docs, vectors);
    } else found = keywordSearch(question, docs);
    setHits(found);
    if (route.kind === 'none') return;
    // notes are searched locally but never sent to the cloud
    const usable = (route.kind === 'cloud' ? found.filter((h) => h.doc.kind !== 'note') : found).slice(0, 6);
    setSources(usable);
    if (!usable.length) return;
    const block = usable.map((h, i) => `[${i + 1}] ${docText(h.doc)}`).join('\n\n');
    await task.run({
      sensitivity: 'study',
      texts: [question],
      build: ([qq]) => ({
        system: PROMPTS.ask(lang),
        prompt: `Question: ${qq}\n\nSources:\n${block}`,
        schema: askSchema,
        validate: (v) => validateAnswer(v, usable.length),
        maxTokens: 1200,
      }),
    });
  };

  const answer = task.state.result;
  return (
    <Page>
      <PageHeader back title={t('ask.title')} subtitle={t('ask.subtitle')} />
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="ask-q" className="sr-only">
          {t('ask.placeholder')}
        </label>
        <TextArea
          autoGrow
          rows={1}
          id="ask-q"
          className="min-h-13 min-w-0 flex-1 basis-64 text-lg"
          enterKeyHint="send"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={t('ask.placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          disabled={!q.trim() || task.state.status === 'working'}
          icon={
            route.kind === 'none' ? (
              <SearchIcon className="size-5" aria-hidden />
            ) : (
              <MessageCircleQuestion className="size-5" aria-hidden />
            )
          }
        >
          {route.kind === 'none' ? t('ask.search') : t('ask.ask')}
        </Button>
      </form>
      <div className="space-y-3">
        {indexPct !== null && (
          <p className="text-sm text-muted" role="status">
            {t('ask.indexing', { pct: indexPct })}
          </p>
        )}
        {!embedder && <Notice>{t('ask.keyword')}</Notice>}
        {route.kind === 'none' && ai.mode !== 'off' && <p className="text-sm text-muted">{t('ask.noLlm')}</p>}
        {notes.length > 0 && !presentation && <p className="text-xs text-muted">{t('ask.notesLocal')}</p>}

        <AiOutput state={task.state} onRetry={() => void ask()}>
          {answer && (
            <Card>
              <h2 className="mb-2 font-sans text-base font-semibold">{t('ask.answer')}</h2>
              {!answer.known && <p className="mb-2 text-sm text-warn">{t('ask.notKnown')}</p>}
              <p className="leading-relaxed whitespace-pre-line" data-testid="ask-answer">
                {withRefs(answer.answer, sources)}
              </p>
              {answer.sources.length > 0 && (
                <>
                  <h3 className="mt-3 mb-1 text-sm font-semibold">{t('ask.sources')}</h3>
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {answer.sources.map((n) => (
                      <li key={n} value={n}>
                        <Link to={sources[n - 1]!.doc.to} className="underline">
                          {sources[n - 1]!.doc.title}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </Card>
          )}
        </AiOutput>

        {hits && (
          <section>
            <h2 className="mb-2 font-sans text-sm font-semibold tracking-wider text-muted uppercase">{t('ask.related')}</h2>
            {hits.length === 0 ? (
              <p className="text-sm text-muted">{t('search:noResults')}</p>
            ) : (
              <ul className="space-y-2" data-testid="ask-hits">
                {hits.map((h) => (
                  <li key={`${h.doc.kind}-${h.doc.id}`}>
                    <Link to={h.doc.to} className="block rounded-2xl border border-line bg-surface p-3 hover:border-primary/40">
                      <div className="flex items-center gap-2">
                        <Badge tone={h.doc.kind === 'note' ? 'accent' : 'blue'}>{t(`ask.kind.${h.doc.kind}`)}</Badge>
                        <span className="font-medium">{h.doc.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{h.doc.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Page>
  );
}
