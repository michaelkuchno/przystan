import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, EyeOff, Eye, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, Card, EmptyState, IconButton } from '@/components/ui/core';
import { Field, TextInput } from '@/components/ui/form';
import { Sheet, Tabs, useConfirm } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/components/ui/cn';
import { get, remove, save } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { daysUntil, type CourseView } from '@/lib/studies/program';
import type { StudyCourse, TopicLevel } from '@/lib/studies/types';
import { todayIso } from '@/lib/platform';
import { STUDY_PROMPTS, type StudyContext } from '@/lib/ai/studyPrompts';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import { useStudies } from './useStudies';
import { Materials } from './Materials';
import { CourseCards } from './CourseCards';
import { MockExam } from './MockExam';
import { StudyAsk } from './StudyAsk';
import { Ring } from './StudiesHome';
import { courseProgress, deckIdFor } from '@/lib/studies/program';

/** Saves an override of a course (creates the record on first change). */
export function patchCourse(c: CourseView, patch: Partial<StudyCourse>) {
  const cur = get('studyCourse', c.id);
  return save('studyCourse', { ...(cur ?? { id: c.id }), ...patch, updatedAt: new Date().toISOString() });
}

const LEVELS: TopicLevel[] = [0, 1, 2];

function TopicRow({ c, topic, context, own }: { c: CourseView; topic: string; context: StudyContext; own: boolean }) {
  const { t } = useTranslation(['studies', 'ai']);
  const { lang, ai } = usePrefs();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const task = useAiTask<string>();
  const level = c.levels[topic] ?? 0;
  const explain = () => {
    setOpen(true);
    setText('');
    void task
      .run({
        sensitivity: 'study',
        texts: [],
        build: () => ({
          system: STUDY_PROMPTS.explainTopic(lang, context),
          prompt: `Course: ${c.name}\nTopic: ${topic}\nLiterature (syllabus): ${c.literature.join('; ') || '—'}`,
          maxTokens: 1500,
        }),
        onText: setText,
      })
      .then((r) => r && setText(r));
  };
  return (
    <li className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-start gap-2">
        <span className="min-w-0 flex-1 basis-48 leading-snug">{topic}</span>
        <div role="radiogroup" aria-label={t('levelLabel', { topic })} className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => void patchCourse(c, { levels: { ...c.levels, [topic]: l } })}
              className={cn(
                'min-h-9 rounded-full px-2.5 text-xs font-medium transition',
                level === l
                  ? l === 2
                    ? 'bg-ok text-white dark:text-black'
                    : l === 1
                      ? 'bg-warn text-white dark:text-black'
                      : 'bg-fg text-bg'
                  : 'bg-surface-2 text-muted hover:text-fg',
              )}
            >
              {t(`level.${l}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {ai.mode !== 'off' && (
          <Button size="sm" variant="ghost" icon={<Lightbulb className="size-4" aria-hidden />} onClick={explain}>
            {t('explain')}
          </Button>
        )}
        {own && (
          <IconButton
            label={t('removeTopic')}
            onClick={() => {
              const cur = get('studyCourse', c.id);
              void patchCourse(c, { extraTopics: (cur?.extraTopics ?? []).filter((x) => x !== topic) });
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
      <Sheet
        open={open}
        wide
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={topic}
        description={c.name}
      >
        <AiOutput state={task.state} onRetry={explain}>
          {text && (
            <div className="leading-relaxed whitespace-pre-line" data-testid="topic-explain">
              {text}
            </div>
          )}
        </AiOutput>
      </Sheet>
      {task.previewEl}
    </li>
  );
}

function ProgramTab({ c, context }: { c: CourseView; context: StudyContext }) {
  const { t } = useTranslation('studies');
  const [newTopic, setNewTopic] = useState('');
  const confirm = useConfirm();
  const nav = useNavigate();
  const own = new Set(get('studyCourse', c.id)?.extraTopics ?? []);
  return (
    <div className="space-y-4">
      {c.proxy && <Notice tone="warn">{t('proxy')}</Notice>}
      <Card className="grid gap-3 sm:grid-cols-2">
        <Field label={t('examDate')} htmlFor="exam-date">
          <TextInput
            id="exam-date"
            type="date"
            value={c.examDate ?? ''}
            onChange={(e) => void patchCourse(c, { examDate: e.target.value || undefined })}
          />
        </Field>
        <Field label={t('examNote')} htmlFor="exam-note">
          <TextInput
            id="exam-note"
            value={c.examNote ?? ''}
            onChange={(e) => void patchCourse(c, { examNote: e.target.value })}
            placeholder={t('examNoteHint')}
          />
        </Field>
      </Card>
      <div>
        <h2 className="mb-2 font-sans text-base font-semibold">{t('topics')}</h2>
        {c.allTopics.length === 0 ? (
          <p className="text-sm text-muted">{c.custom ? t('noTopicsOwn') : t('noTopics')}</p>
        ) : (
          <ul className="space-y-2" data-testid="topics">
            {c.allTopics.map((tp) => (
              <TopicRow key={tp} c={c} topic={tp} context={context} own={own.has(tp)} />
            ))}
          </ul>
        )}
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newTopic.trim();
            if (!v) return;
            const cur = get('studyCourse', c.id);
            void patchCourse(c, { extraTopics: [...(cur?.extraTopics ?? []), v] }).then(() => setNewTopic(''));
          }}
        >
          <label htmlFor="new-topic" className="sr-only">
            {t('addTopic')}
          </label>
          <TextInput
            id="new-topic"
            className="min-w-0 flex-1 basis-56"
            placeholder={t('addTopicHint')}
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <Button type="submit" variant="secondary" icon={<Plus className="size-4" aria-hidden />} disabled={!newTopic.trim()}>
            {t('addTopic')}
          </Button>
        </form>
      </div>
      {c.literature.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold">
            <BookOpen className="size-4" aria-hidden /> {t('literature')}
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {c.literature.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        {!c.custom && (
          <Button
            variant="ghost"
            size="sm"
            icon={c.hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
            onClick={() => void patchCourse(c, { hidden: !c.hidden })}
          >
            {c.hidden ? t('show') : t('hide')}
          </Button>
        )}
        {c.custom && (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={async () => {
              if (!(await confirm({ title: t('deleteCourse'), danger: true }))) return;
              await remove('studyCourse', c.id);
              nav('/studies');
            }}
          >
            {t('deleteCourse')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { t } = useTranslation('studies');
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { courses, loaded, context, decks, states, attempts } = useStudies();
  const c = courses.find((x) => x.id === id);
  if (!loaded) return <Page>{null}</Page>;
  if (!c)
    return (
      <Page>
        <PageHeader back="/studies" title={t('notFound')} />
        <EmptyState title={t('notFound')} />
      </Page>
    );
  const pr = courseProgress(
    c,
    decks.find((d) => d.id === deckIdFor(c.id)),
    states,
    attempts,
  );
  const d = daysUntil(c.examDate, todayIso());
  const tab = params.get('tab') ?? 'program';
  return (
    <Page wide>
      <PageHeader
        back="/studies"
        eyebrow={t('semester', { n: c.semester })}
        title={c.name}
        subtitle={[
          t(`assessment.${c.assessment}`),
          c.ects ? `${c.ects} ECTS` : '',
          Object.entries(c.hours)
            .map(([k, v]) => `${t(`hours.${k}`)} ${v} h`)
            .join(', '),
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <div className="flex items-center gap-3">
            {d !== null && d >= 0 && (
              <Badge tone="accent">{d === 0 ? t('today.examToday') : t('today.inDays', { count: d })}</Badge>
            )}
            <Ring value={pr.readiness} size={52} />
          </div>
        }
      />
      <Tabs
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        tabs={[
          { value: 'program', label: t('tabs.program'), content: <ProgramTab c={c} context={context} /> },
          { value: 'materials', label: t('tabs.materials'), content: <Materials c={c} /> },
          { value: 'cards', label: t('tabs.cards'), content: <CourseCards c={c} context={context} /> },
          { value: 'exam', label: t('tabs.exam'), content: <MockExam c={c} context={context} /> },
          { value: 'ask', label: t('tabs.ask'), content: <StudyAsk courseId={c.id} /> },
        ]}
      />
    </Page>
  );
}
