import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Plus,
  CalendarCheck,
  Activity,
  Flag,
  Gavel,
  DoorOpen,
  School,
  Briefcase,
  Repeat,
  Milestone,
  Circle,
  Footprints,
} from 'lucide-react';
import { Button, Badge, EmptyState, IconButton } from '@/components/ui/core';
import { Sheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { TextField, SelectField, DateField } from '@/components/ui/form';
import { useStore, forClient, save, uid, remove } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { todayIso } from '@/lib/platform';
import type { Client, TimelineEvent, TimelineEventType } from '@/domain/types';
import { Trash2 } from 'lucide-react';

const TYPES: TimelineEventType[] = [
  'court',
  'pass',
  'transfer',
  'schoolReturn',
  'work',
  'stageChange',
  'lapse',
  'milestone',
  'other',
];
const ICON: Record<TimelineEventType, typeof Flag> = {
  court: Gavel,
  pass: DoorOpen,
  transfer: Footprints,
  schoolReturn: School,
  work: Briefcase,
  stageChange: Repeat,
  lapse: Circle,
  milestone: Milestone,
  other: Flag,
};

interface Item {
  id: string;
  date: string;
  kind: 'event' | 'meeting' | 'measurement';
  title: string;
  subtitle?: string;
  to?: string;
  event?: TimelineEvent;
  tone: 'primary' | 'accent' | 'blue' | 'neutral' | 'warn';
  Icon: typeof Flag;
}

export default function TimelineTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const toast = useToast();
  const events = useStore(() => forClient('event', client.id));
  const meetings = useStore(() => forClient('meeting', client.id));
  const measurements = useStore(() => forClient('measurement', client.id));
  const [editing, setEditing] = useState<TimelineEvent | null>(null);

  const items: Item[] = [
    ...events.map<Item>((e) => ({
      id: e.id,
      date: e.date,
      kind: 'event',
      title: e.title || t(`timeline.type.${e.type}`),
      subtitle: e.note,
      event: e,
      tone: e.type === 'lapse' ? 'warn' : e.type === 'milestone' ? 'primary' : 'accent',
      Icon: ICON[e.type],
    })),
    ...meetings
      .filter((m) => m.status !== 'planned' || m.date.slice(0, 10) >= todayIso())
      .map<Item>((m) => ({
        id: m.id,
        date: m.date,
        kind: 'meeting',
        title: `${t(`meetings:type.${m.type}`)} – ${t(`meetings:status.${m.status}`)}`,
        subtitle: m.agenda.slice(0, 2).join(' · '),
        to: `/meetings/${m.id}`,
        tone: m.status === 'missed' ? 'warn' : 'blue',
        Icon: CalendarCheck,
      })),
    ...measurements.map<Item>((m) => ({
      id: m.id,
      date: m.date,
      kind: 'measurement',
      title: m.source.kind === 'screening' ? m.source.instrument : t(`tools:names.${m.source.tool}`),
      subtitle:
        m.score !== undefined ? (m.scoreBefore !== undefined ? `${m.scoreBefore} → ${m.score}` : String(m.score)) : undefined,
      tone: 'neutral',
      Icon: Activity,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const startNew = () => setEditing({ id: uid(), clientId: client.id, date: todayIso(), type: 'milestone', title: '', note: '' });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{t('timeline.intro')}</p>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={startNew}>
          {t('timeline.add')}
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t('timeline.empty')} />
      ) : (
        <ol className="relative ml-4 border-l-2 border-line">
          {items.map((it) => {
            const body = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted">{fmtDate(it.date)}</span>
                  <Badge tone={it.tone}>
                    {it.kind === 'event' && it.event ? t(`timeline.type.${it.event.type}`) : t(`timeline.kind.${it.kind}`)}
                  </Badge>
                </div>
                <div className="mt-0.5 font-medium">{it.title}</div>
                {it.subtitle && <div className="text-sm text-muted">{it.subtitle}</div>}
              </>
            );
            return (
              <li key={it.id} className="relative mb-4 ml-6">
                <span className="absolute top-1 -left-[2.1rem] flex size-8 items-center justify-center rounded-full border-2 border-bg bg-surface-2 text-primary">
                  <it.Icon className="size-4" aria-hidden />
                </span>
                {it.to ? (
                  <Link to={it.to} className="block rounded-2xl border border-line bg-surface p-3 hover:border-primary/40">
                    {body}
                  </Link>
                ) : it.event ? (
                  <button
                    type="button"
                    onClick={() => setEditing(it.event!)}
                    className="block w-full rounded-2xl border border-line bg-surface p-3 text-left hover:border-primary/40"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-line bg-surface p-3">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Sheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={t('timeline.event')}
        footer={
          editing && (
            <>
              {events.some((e) => e.id === editing.id) && (
                <IconButton
                  label={t('common:delete')}
                  onClick={async () => {
                    const undo = await remove('event', editing.id);
                    setEditing(null);
                    toast({
                      text: t('common:deleted'),
                      tone: 'info',
                      action: { label: t('common:undo'), run: () => void undo() },
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              )}
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => setEditing(null)}>
                {t('common:cancel')}
              </Button>
              <Button
                onClick={async () => {
                  await save('event', editing);
                  setEditing(null);
                  toast({ text: t('common:saved'), tone: 'ok' });
                }}
              >
                {t('common:save')}
              </Button>
            </>
          )
        }
      >
        {editing && (
          <div className="space-y-4">
            <SelectField
              label={t('timeline.typeLabel')}
              value={editing.type}
              onChange={(v) => setEditing({ ...editing, type: v })}
              options={TYPES.map((v) => ({ value: v, label: t(`timeline.type.${v}`) }))}
            />
            {editing.type === 'lapse' && <p className="rounded-xl bg-blue-soft p-3 text-sm">{t('timeline.lapseNote')}</p>}
            <DateField label={t('common:date')} value={editing.date} onChange={(v) => setEditing({ ...editing, date: v })} />
            <TextField label={t('timeline.title')} value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
            <TextField
              multiline
              label={t('timeline.note')}
              value={editing.note}
              onChange={(v) => setEditing({ ...editing, note: v })}
            />
          </div>
        )}
      </Sheet>
    </div>
  );
}
