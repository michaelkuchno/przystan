import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, Search } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui/core';
import { Chips, TextArea } from '@/components/ui/form';
import { usePrefs } from '@/lib/prefs';
import { activeSpace } from '@/lib/store';
import { currentRoute, getEmbedder } from '@/lib/ai';
import { STUDY_PROMPTS } from '@/lib/ai/studyPrompts';
import { askSchema, validateAnswer, type Answer } from '@/lib/ai/tasks';
import type { Embedder } from '@/lib/ai/types';
import { studyDocs, type StudyDoc } from '@/lib/studies/program';
import { keywordSearch, semanticSearch, updateIndex, docText } from '@/features/ai/semantic';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import { useStudies } from './useStudies';

interface Hit {
  doc: StudyDoc;
  score: number;
}

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

/** Search and questions limited to the university data (syllabus + own materials). */
export function StudyAsk({ courseId, initialAsk = true }: { courseId?: string; initialAsk?: boolean }) {
  const { t } = useTranslation('studies');
  const { lang, ai, study } = usePrefs();
  const { courses, materials, context } = useStudies();
  const [semester, setSemester] = useState<string>(courseId ? 'all' : String(study.semester));
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [sources, setSources] = useState<Hit[]>([]);
  const [embedder, setEmbedder] = useState<Embedder | null>(null);
  const [vectors, setVectors] = useState<Map<string, Float32Array> | null>(null);
  const task = useAiTask<Answer>();
  const allDocs = useMemo(() => studyDocs(courses, materials), [courses, materials]);
  const docs = useMemo(
    () => allDocs.filter((d) => (courseId ? d.courseId === courseId : semester === 'all' || d.semester === Number(semester))),
    [allDocs, courseId, semester],
  );
  const canAsk = initialAsk && currentRoute('study').kind !== 'none';

  useEffect(() => {
    let alive = true;
    void getEmbedder().then(async (e) => {
      if (!alive || !e) return;
      setEmbedder(e);
      try {
        const v = await updateIndex(`study:${activeSpace()}`, allDocs, e);
        if (alive) setVectors(v);
      } catch {
        /* keyword search stays */
      }
    });
    return () => {
      alive = false;
    };
  }, [allDocs, ai.mode, ai.localModels]);

  const run = async (withAi: boolean) => {
    const question = q.trim();
    if (!question) return;
    let found: Hit[];
    if (embedder && vectors) {
      const [qv] = await embedder.embed([question], 'query');
      found = semanticSearch(qv!, docs, vectors, 30) as Hit[];
    } else found = keywordSearch(question, docs, 30) as Hit[];
    // the student's own class materials are the most relevant source – ranked higher
    found = found
      .map((h) => ({ ...h, score: h.doc.kind === 'material' ? h.score * 1.5 : h.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setHits(found);
    task.reset();
    if (!withAi || !found.length) return;
    const top = found.slice(0, 6);
    setSources(top);
    const block = top
      .map((h, i) => `[${i + 1}] (${h.doc.kind === 'material' ? 'materiał z zajęć' : 'sylabus'}) ${docText(h.doc)}`)
      .join('\n\n');
    await task.run({
      sensitivity: 'study',
      texts: [question],
      build: ([qq]) => ({
        system: STUDY_PROMPTS.ask(lang, context),
        prompt: `Question: ${qq}\n\nSources:\n${block}`,
        schema: askSchema,
        validate: (v) => validateAnswer(v, top.length),
        maxTokens: 1500,
      }),
    });
  };

  const answer = task.state.result;
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? '';
  return (
    <div className="space-y-3">
      {!courseId && (
        <Chips
          label={t('semesterLabel')}
          value={semester}
          onChange={(v) => v[0] && setSemester(v[0])}
          options={[
            { value: 'all', label: t('allSemesters') },
            ...[1, 2, 3, 4].map((s) => ({ value: String(s), label: t('semester', { n: s }) })),
          ]}
        />
      )}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(canAsk);
        }}
      >
        <label htmlFor="study-q" className="sr-only">
          {t('askPlaceholder')}
        </label>
        <TextArea
          autoGrow
          rows={1}
          id="study-q"
          className="min-h-12 min-w-0 flex-1 basis-60"
          enterKeyHint="send"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={t('askPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          icon={<Search className="size-4" aria-hidden />}
          disabled={!q.trim()}
          onClick={() => void run(false)}
        >
          {t('search')}
        </Button>
        {canAsk && (
          <Button
            type="submit"
            icon={<MessageCircleQuestion className="size-4" aria-hidden />}
            disabled={!q.trim() || task.state.status === 'working'}
          >
            {t('ask')}
          </Button>
        )}
      </form>
      <p className="text-xs text-muted">{canAsk ? t('onlyUni') : t('searchOnly')}</p>
      <AiOutput state={task.state} onRetry={() => void run(true)}>
        {answer && (
          <Card>
            {!answer.known && <p className="mb-2 text-sm text-warn">{t('notCovered')}</p>}
            <p className="leading-relaxed whitespace-pre-line" data-testid="study-answer">
              {withRefs(answer.answer, sources)}
            </p>
          </Card>
        )}
      </AiOutput>
      {hits && (
        <ul className="space-y-2" data-testid="study-hits">
          {hits.length === 0 && <li className="text-sm text-muted">{t('noResults')}</li>}
          {hits.map((h) => (
            <li key={h.doc.id}>
              <Link to={h.doc.to} className="block rounded-2xl border border-line bg-surface p-3 hover:border-primary/40">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={h.doc.kind === 'material' ? 'accent' : 'blue'}>{t(`docKind.${h.doc.kind}`)}</Badge>
                  <span className="font-medium [overflow-wrap:anywhere]">{h.doc.title}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {courseName(h.doc.courseId)} · {t('semester', { n: h.doc.semester })}
                </p>
                {h.doc.kind === 'material' && <p className="mt-1 line-clamp-2 text-sm text-muted">{h.doc.body}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {task.previewEl}
    </div>
  );
}
