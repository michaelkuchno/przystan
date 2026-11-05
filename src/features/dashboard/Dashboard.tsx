import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  AlertCircle,
  CheckSquare,
  GraduationCap,
  Plus,
  Sparkles,
  Sprout,
  MessagesSquare,
  Users,
  Square,
  CheckSquare2,
  Trash2,
  BellRing,
} from 'lucide-react';
import { Page } from '@/components/ui/page';
import { Card, EmptyState, SectionTitle, Badge, Avatar, ButtonLink, IconButton } from '@/components/ui/core';
import { TextInput } from '@/components/ui/form';
import { SupportiveNote } from '@/components/ui/page';
import { useStore, all, save, uid, remove, get } from '@/lib/store';
import { computeAttention, type AttentionFlag } from '@/lib/attention';
import { todayIso } from '@/lib/platform';
import { fmtDate, fmtTime, fmtWeekday } from '@/lib/format';
import { usePrefs } from '@/lib/prefs';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/components/ui/cn';
import { useContent } from '@/content/ContentProvider';
import { isDue } from '@/lib/srs';
import { BackupBanner, SupervisionTasks } from './DashboardExtras';

const TodayCard = lazy(() => import('@/features/notify/TodayCard'));

export function useAttention(): AttentionFlag[] {
  const clients = useStore(() => all('client'));
  const meetings = useStore(() => all('meeting'));
  const measurements = useStore(() => all('measurement'));
  const iprs = useStore(() => all('ipr'));
  const today = todayIso();
  return useMemo(
    () => computeAttention({ clients, meetings, measurements, iprs, today }),
    [clients, meetings, measurements, iprs, today],
  );
}

export function AttentionItem({ flag, showClient = true }: { flag: AttentionFlag; showClient?: boolean }) {
  const { t } = useTranslation('dashboard');
  const client = get('client', flag.clientId);
  return (
    <Link to={`/clients/${flag.clientId}`} className="flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface-2">
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
          flag.level === 2 ? 'bg-accent-soft text-accent-soft-fg' : 'bg-warn-soft text-warn',
        )}
      >
        <AlertCircle className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {showClient && client && <span className="pii mr-1.5">{client.code} ·</span>}
          {t(`rules.${flag.rule}.title`)}
        </span>
        <span className="block text-sm text-muted">
          {t(`rules.${flag.rule}.why`, {
            ...flag.facts,
            date: flag.facts.date ? fmtDate(String(flag.facts.date)) : '',
          })}
        </span>
      </span>
    </Link>
  );
}

function Tasks() {
  const { t } = useTranslation('dashboard');
  const tasks = useStore(() => all('task')).sort(
    (a, b) => Number(a.done) - Number(b.done) || (a.due ?? '').localeCompare(b.due ?? ''),
  );
  const [draft, setDraft] = useState('');
  const toast = useToast();
  const add = async () => {
    if (!draft.trim()) return;
    await save('task', { id: uid(), title: draft.trim(), done: false });
    setDraft('');
  };
  return (
    <Card>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <label htmlFor="task-new" className="sr-only">
          {t('tasks.new')}
        </label>
        <TextInput id="task-new" placeholder={t('tasks.new')} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <IconButton label={t('tasks.add')} variant="soft" type="submit">
          <Plus className="size-5" />
        </IconButton>
      </form>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('tasks.empty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {tasks.slice(0, 8).map((task) => (
            <li key={task.id} className="flex items-center gap-2 py-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={task.done}
                className="flex min-h-11 flex-1 items-center gap-3 text-left"
                onClick={() => void save('task', { ...task, done: !task.done })}
              >
                {task.done ? (
                  <CheckSquare2 className="size-5 shrink-0 text-ok" aria-hidden />
                ) : (
                  <Square className="size-5 shrink-0 text-muted" aria-hidden />
                )}
                <span className={cn(task.done && 'text-muted line-through')}>{task.title}</span>
              </button>
              <IconButton
                label={t('common:delete')}
                onClick={async () => {
                  const undo = await remove('task', task.id);
                  toast({ text: t('tasks.deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Dashboard() {
  const { t } = useTranslation('dashboard');
  const prefs = usePrefs();
  const today = todayIso();
  const meetings = useStore(() => all('meeting'));
  const clients = useStore(() => all('client'));
  const cardStates = useStore(() => all('cardState'));
  const decks = useContent('decks').decks;
  const flags = useAttention();

  const todays = meetings
    .filter((m) => m.date.slice(0, 10) === today && m.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = meetings
    .filter((m) => m.date.slice(0, 10) > today && m.status === 'planned')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const active = clients.filter((c) => c.status === 'active').length;
  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const learned = cardStates.filter((c) => c.repetitions >= 2).length;
  const due = decks.reduce(
    (s, d) =>
      s +
      d.cards.filter((c) =>
        isDue(
          cardStates.find((x) => x.id === `${d.id}:${c.id}`),
          today,
        ),
      ).length,
    0,
  );
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('greeting.morning') : hour < 18 ? t('greeting.day') : t('greeting.evening');

  return (
    <Page wide>
      <div className="mb-6">
        <p className="text-sm font-medium text-accent first-letter:uppercase">{fmtWeekday(today)}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{greeting}</h1>
        <p className="mt-1 text-muted">{prefs.mode === 'demo' ? t('demoIntro') : t('intro', { count: active })}</p>
      </div>

      <BackupBanner />
      {prefs.notify.enabled && (
        <Suspense fallback={null}>
          <TodayCard />
        </Suspense>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { to: '/clients/new', icon: Users, label: t('quick.client') },
          { to: '/meetings/new', icon: CalendarClock, label: t('quick.meeting') },
          { to: '/tools', icon: Sparkles, label: t('quick.tools') },
          { to: '/prevention', icon: Sprout, label: t('quick.prevention') },
        ].map((q, i) => (
          <motion.div key={q.to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link
              to={q.to}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
                <q.icon className="size-5" aria-hidden />
              </span>
              <span className="font-medium">{q.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-2 grid gap-x-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle
            action={
              <Link to="/meetings" className="text-sm font-medium text-primary">
                {t('seeAll')}
              </Link>
            }
          >
            {t('today')}
          </SectionTitle>
          {todays.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title={t('noMeetingsToday')}
              text={t('noMeetingsTodayText')}
              action={
                <ButtonLink to="/meetings/new" variant="soft" icon={<Plus className="size-4" />}>
                  {t('quick.meeting')}
                </ButtonLink>
              }
            />
          ) : (
            <div className="space-y-2">
              {todays.map((m) => {
                const c = get('client', m.clientId);
                return (
                  <Link
                    key={m.id}
                    to={m.status === 'planned' ? `/meetings/${m.id}/live` : `/meetings/${m.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary/40"
                  >
                    <div className="w-14 text-center">
                      <div className="font-serif text-xl font-semibold">{fmtTime(m.date)}</div>
                      <div className="text-xs text-muted">{m.durationMin} min</div>
                    </div>
                    {c && <Avatar label={c.code} tone={c.isGroup ? 'blue' : 'primary'} />}
                    <div className="min-w-0 flex-1 basis-32">
                      <div className="truncate font-medium">
                        <span className="pii">{c?.code ?? m.title ?? t('meetings:untitled')}</span>
                      </div>
                      <div className="text-sm text-muted">
                        {t(`meetings:type.${m.type}`)}
                        {m.agenda[0] ? ` · ${m.agenda[0]}` : ''}
                      </div>
                    </div>
                    <Badge tone={m.status === 'done' ? 'ok' : m.status === 'missed' ? 'warn' : 'primary'}>
                      {m.status === 'planned' ? t('start') : t(`meetings:status.${m.status}`)}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="mt-3 space-y-1 text-sm text-muted">
              {upcoming.map((m) => (
                <Link
                  key={m.id}
                  to={`/meetings/${m.id}`}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-surface-2"
                >
                  <CalendarClock className="size-4" aria-hidden />
                  <span>
                    {fmtDate(m.date, { weekday: 'short', day: 'numeric', month: 'short' })}, {fmtTime(m.date)}
                  </span>
                  <span className="pii font-medium text-fg">{get('client', m.clientId)?.code ?? m.title}</span>
                </Link>
              ))}
            </div>
          )}

          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <BellRing className="size-5 text-accent" aria-hidden />
              {t('attention')}
            </span>
          </SectionTitle>
          <Card className="p-2 sm:p-2">
            {flags.length === 0 ? (
              <p className="p-3 text-sm text-muted">{t('noAttention')}</p>
            ) : (
              <div className="divide-y divide-line">
                {flags.slice(0, 8).map((f, i) => (
                  <AttentionItem key={`${f.rule}-${f.clientId}-${i}`} flag={f} />
                ))}
              </div>
            )}
            <div className="px-3 pt-1 pb-2">
              <SupportiveNote text={t('attentionNote')} />
            </div>
          </Card>
        </div>

        <div>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <CheckSquare className="size-5 text-primary" aria-hidden />
              {t('tasks.title')}
            </span>
          </SectionTitle>
          <Tasks />
          <SupervisionTasks />

          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" aria-hidden />
              {t('learning')}
            </span>
          </SectionTitle>
          <Card>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-serif text-3xl font-semibold text-primary">
                  {learned}
                  <span className="text-lg text-muted">/{totalCards}</span>
                </div>
                <div className="text-sm text-muted">{t('learned')}</div>
              </div>
              <ButtonLink to="/learn" variant="soft" size="sm">
                {t('dueCards', { count: due })}
              </ButtonLink>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-valuenow={learned}
              aria-valuemax={totalCards}
              aria-valuemin={0}
              aria-label={t('learned')}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${totalCards ? (learned / totalCards) * 100 : 0}%` }}
              />
            </div>
          </Card>

          <Link
            to="/simulator"
            className="mt-4 flex items-center gap-4 rounded-[var(--radius-card)] bg-gradient-to-br from-primary to-blue p-5 text-primary-fg shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 dark:text-primary-fg"
          >
            <MessagesSquare className="size-9 shrink-0" aria-hidden />
            <div>
              <div className="font-serif text-lg font-semibold">{t('simulatorTeaser.title')}</div>
              <div className="text-sm opacity-90">{t('simulatorTeaser.text')}</div>
            </div>
          </Link>
        </div>
      </div>
    </Page>
  );
}
