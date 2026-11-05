import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  CalendarClock,
  ExternalLink,
  Flame,
  GraduationCap,
  MessageCircleQuestion,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, ButtonLink, Card, SectionTitle } from '@/components/ui/core';
import { Chips, Field, Select, TextInput } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/components/ui/cn';
import { getPrefs, setPrefs, usePrefs } from '@/lib/prefs';
import { save, uid } from '@/lib/store';
import { todayIso } from '@/lib/platform';
import { fmtDate } from '@/lib/format';
import { PROGRAMS, courseProgress, daysUntil, deckIdFor, inSemester, nextExam } from '@/lib/studies/program';
import { visibleStreak } from '@/lib/studies/settings';
import { yesterdayIso } from '@/lib/studies/streak';
import { useStudies } from './useStudies';

/** Small progress ring (readiness 0–100). */
export function Ring({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value}%`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size / 4}
        fontWeight={600}
        fill="currentColor"
      >
        {value}
      </text>
    </svg>
  );
}

function Setup() {
  const { t } = useTranslation('studies');
  const [semester, setSemester] = useState('1');
  return (
    <Card className="mx-auto max-w-xl space-y-4">
      <GraduationCap className="size-10 text-primary" aria-hidden />
      <h2 className="text-2xl font-semibold">{t('setup.title')}</h2>
      <p className="leading-relaxed text-muted">{t('setup.lead')}</p>
      <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
        <div className="font-semibold">{t('setup.wshe')}</div>
        <div className="text-sm text-muted">{t('setup.wsheText')}</div>
      </div>
      <Field label={t('setup.semester')} htmlFor="st-sem">
        <Select id="st-sem" value={semester} onChange={(e) => setSemester(e.target.value)}>
          {[1, 2, 3, 4].map((s) => (
            <option key={s} value={s}>
              {t('semester', { n: s })}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        size="lg"
        onClick={() => void setPrefs({ study: { ...getPrefs().study, programId: PROGRAMS[0].id, semester: Number(semester) } })}
      >
        {t('setup.start')}
      </Button>
    </Card>
  );
}

export default function StudiesHome() {
  const { t } = useTranslation('studies');
  const nav = useNavigate();
  const { program, loaded, courses, decks, states, attempts, study } = useStudies();
  const { study: sp } = usePrefs();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const today = todayIso();
  const streak = visibleStreak(sp, today, yesterdayIso());
  const doneToday = sp.lastDay === today ? sp.doneToday : 0;

  if (!study.programId)
    return (
      <Page>
        <PageHeader back title={t('title')} subtitle={t('subtitle')} />
        <Setup />
      </Page>
    );
  if (!loaded) return <Page>{null}</Page>;

  const sem = sp.semester;
  const list = courses.filter((c) => !c.hidden && inSemester(c, sem));
  const hidden = courses.filter((c) => c.hidden && inSemester(c, sem));
  const exam = nextExam(courses, today);
  const examDays = exam ? daysUntil(exam.examDate, today) : null;

  return (
    <Page wide>
      <PageHeader
        back
        eyebrow={program?.short}
        title={t('title')}
        subtitle={program ? `${program.specialization}` : undefined}
        actions={
          <>
            <ButtonLink to="/studies/search" variant="secondary" size="sm" icon={<Search className="size-4" aria-hidden />}>
              {t('search')}
            </ButtonLink>
            <ButtonLink
              to="/studies/search?ask=1"
              variant="soft"
              size="sm"
              icon={<MessageCircleQuestion className="size-4" aria-hidden />}
            >
              {t('ask')}
            </ButtonLink>
          </>
        }
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className="grid gap-4 border-primary/30 bg-gradient-to-br from-primary-soft/60 to-blue-soft/40 sm:grid-cols-3"
          data-testid="study-today"
        >
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted uppercase">{t('today.goal')}</div>
            <div className="mt-1 font-serif text-3xl font-semibold tabular-nums">
              {Math.min(doneToday, sp.dailyGoal)} / {sp.dailyGoal}
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-valuenow={doneToday}
              aria-valuemin={0}
              aria-valuemax={sp.dailyGoal}
              aria-label={t('today.goal')}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.min(100, (doneToday / sp.dailyGoal) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-muted">
              {doneToday >= sp.dailyGoal ? t('today.done') : t('today.left', { count: sp.dailyGoal - doneToday })}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted uppercase">{t('today.streak')}</div>
            <div className="mt-1 flex items-center gap-2 font-serif text-3xl font-semibold">
              <Flame className={cn('size-7', streak ? 'text-accent' : 'text-muted')} aria-hidden /> {streak}
            </div>
            <p className="mt-1 text-sm text-muted">
              {streak ? t('today.streakText', { count: streak }) : t('today.streakStart')}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted uppercase">{t('today.nextExam')}</div>
            {exam ? (
              <Link to={`/studies/course/${exam.id}`} className="mt-1 block">
                <div className="font-semibold">{exam.name}</div>
                <div className="text-sm text-muted">
                  {fmtDate(exam.examDate!)} ·{' '}
                  {examDays === 0 ? t('today.examToday') : t('today.inDays', { count: examDays ?? 0 })}
                </div>
              </Link>
            ) : (
              <p className="mt-1 text-sm text-muted">{t('today.noExam')}</p>
            )}
            <Button
              size="sm"
              className="mt-2"
              icon={<BookOpenCheck className="size-4" aria-hidden />}
              onClick={() => nav(exam ? `/studies/course/${exam.id}` : `/studies/course/${list[0]?.id ?? ''}`)}
              disabled={!list.length}
            >
              {t('today.learn')}
            </Button>
          </div>
        </Card>
      </motion.div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Chips
          label={t('semesterLabel')}
          value={String(sem)}
          onChange={(v) => v[0] && void setPrefs({ study: { ...getPrefs().study, semester: Number(v[0]) } })}
          options={[1, 2, 3, 4].map((s) => ({ value: String(s), label: t('semester', { n: s }) }))}
        />
        <Button size="sm" variant="ghost" icon={<Plus className="size-4" aria-hidden />} onClick={() => setAdding(true)}>
          {t('addCourse')}
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="study-courses">
        {list.map((c, i) => {
          const deck = decks.find((d) => d.id === deckIdFor(c.id));
          const pr = courseProgress(c, deck, states, attempts);
          const d = daysUntil(c.examDate, today);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link
                to={`/studies/course/${c.id}`}
                className="flex h-full gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <Ring value={pr.readiness} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold [overflow-wrap:anywhere]">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={c.assessment === 'E' ? 'accent' : 'neutral'}>{t(`assessment.${c.assessment}`)}</Badge>
                    {c.ects > 0 && <Badge>{c.ects} ECTS</Badge>}
                    {c.group === 'addiction' && <Badge tone="blue">{t('group.addiction')}</Badge>}
                    {c.custom && <Badge tone="primary">{t('group.custom')}</Badge>}
                  </div>
                  {d !== null && d >= 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <CalendarClock className="size-3.5" aria-hidden /> {t('today.inDays', { count: d })}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
      {hidden.length > 0 && <p className="mt-3 text-sm text-muted">{t('hiddenCount', { count: hidden.length })}</p>}

      {program && (
        <>
          <SectionTitle>{t('about')}</SectionTitle>
          <Card className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">{program.university}</div>
              <div className="text-muted">
                {program.program} · {program.address}
              </div>
            </div>
            <Notice>{program.note}</Notice>
            <ul className="space-y-1">
              {program.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex min-h-9 items-center gap-1.5 underline [overflow-wrap:anywhere]"
                  >
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden /> {s.title}
                  </a>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3.5" aria-hidden /> {t('checked', { date: program.checked })}
            </p>
          </Card>
        </>
      )}

      <Sheet
        open={adding}
        onOpenChange={setAdding}
        title={t('addCourse')}
        footer={
          <Button
            disabled={!newName.trim()}
            onClick={() => {
              const id = `own-${uid()}`;
              void save('studyCourse', {
                id,
                custom: true,
                name: newName.trim(),
                semester: sem,
                assessment: 'ZO',
                ects: 0,
                extraTopics: [],
                updatedAt: new Date().toISOString(),
              }).then(() => {
                setAdding(false);
                setNewName('');
                nav(`/studies/course/${id}`);
              });
            }}
          >
            {t('save')}
          </Button>
        }
      >
        <Field label={t('courseName')} htmlFor="new-course">
          <TextInput id="new-course" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </Field>
      </Sheet>
    </Page>
  );
}
