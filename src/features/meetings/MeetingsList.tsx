import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CalendarDays, ChefHat } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { ButtonLink, EmptyState, List, ListRow, Badge } from '@/components/ui/core';
import { Chips } from '@/components/ui/form';
import { useStore, all, get } from '@/lib/store';
import { fmtDate, fmtTime } from '@/lib/format';
import { todayIso } from '@/lib/platform';
import type { Meeting } from '@/domain/types';

const STATUS_TONE = { planned: 'primary', done: 'ok', missed: 'warn', cancelled: 'neutral' } as const;

export function MeetingRows({ meetings, showClient = true }: { meetings: Meeting[]; showClient?: boolean }) {
  const { t } = useTranslation('meetings');
  return (
    <List>
      {meetings.map((m) => {
        const c = get('client', m.clientId);
        return (
          <ListRow
            key={m.id}
            to={m.status === 'planned' && m.date.slice(0, 10) === todayIso() ? `/meetings/${m.id}/live` : `/meetings/${m.id}`}
            leading={
              <div className="w-14 text-center">
                <div className="text-xs text-muted">{fmtDate(m.date, { day: 'numeric', month: 'short' })}</div>
                <div className="font-serif font-semibold">{fmtTime(m.date)}</div>
              </div>
            }
            title={
              showClient ? <span className="pii">{c?.code ?? m.title ?? t('untitled')}</span> : (m.title ?? t(`type.${m.type}`))
            }
            subtitle={`${t(`type.${m.type}`)} · ${m.durationMin} min${m.agenda[0] ? ` · ${m.agenda[0]}` : ''}`}
            trailing={<Badge tone={STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>}
          />
        );
      })}
    </List>
  );
}

export default function MeetingsList() {
  const { t } = useTranslation('meetings');
  const meetings = useStore(() => all('meeting'));
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const today = todayIso();
  const upcoming = meetings.filter((m) => m.date.slice(0, 10) >= today && m.status === 'planned').sort((a, b) => a.date.localeCompare(b.date));
  const past = meetings.filter((m) => !(m.date.slice(0, 10) >= today && m.status === 'planned')).sort((a, b) => b.date.localeCompare(a.date));
  const list = view === 'upcoming' ? upcoming : past;

  // group by day
  const groups = new Map<string, Meeting[]>();
  for (const m of list) groups.set(m.date.slice(0, 10), [...(groups.get(m.date.slice(0, 10)) ?? []), m]);

  return (
    <Page>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <>
            <ButtonLink to="/recipes" variant="secondary" icon={<ChefHat className="size-4" />}>
              {t('recipes')}
            </ButtonLink>
            <ButtonLink to="/meetings/new" icon={<Plus className="size-4" />}>
              {t('new')}
            </ButtonLink>
          </>
        }
      />
      <Chips
        className="mb-4"
        value={view}
        onChange={(v) => v[0] && setView(v[0])}
        options={[
          { value: 'upcoming', label: `${t('upcoming')} (${upcoming.length})` },
          { value: 'past', label: `${t('past')} (${past.length})` },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={view === 'upcoming' ? t('emptyUpcoming') : t('emptyPast')}
          text={t('emptyText')}
          action={
            <ButtonLink to="/meetings/new" icon={<Plus className="size-4" />}>
              {t('new')}
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-5">
          {[...groups].map(([day, ms]) => (
            <section key={day}>
              <h2 className="mb-2 font-sans text-sm font-semibold text-muted first-letter:uppercase">
                {day === today ? t('today') : fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <MeetingRows meetings={ms} />
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
