/** Small entry points to messages and the calendar used across the app (meetings, client, help, prevention). */
import { useTranslation } from 'react-i18next';
import { BellRing, CalendarPlus, Mail } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/core';
import { useToast } from '@/components/ui/toast';
import type { Meeting } from '@/domain/types';

export function WriteButton({ to, label, state }: { to: string; label?: string; state?: unknown }) {
  const { t } = useTranslation('messages');
  return (
    <ButtonLink to={to} state={state} variant="secondary" size="sm" icon={<Mail className="size-4" aria-hidden />}>
      {label ?? t('entry.message')}
    </ButtonLink>
  );
}

export function CalendarExportButton({ meetingId, label }: { meetingId?: string; label?: string }) {
  const { t } = useTranslation(['messages', 'notify']);
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<CalendarPlus className="size-4" aria-hidden />}
      onClick={() =>
        void import('@/lib/notify/calendar')
          .then((m) => m.exportCalendar(t, meetingId))
          .then((n) =>
            toast({ text: n ? t('notify:calendarDone', { count: n }) : t('notify:calendarEmpty'), tone: n ? 'ok' : 'info' }),
          )
      }
    >
      {label ?? (meetingId ? t('entry.calendar') : t('entry.calendarAll'))}
    </Button>
  );
}

/** Meeting editor: reminder SMS / e-mail to the person + add to calendar. */
export function MeetingComms({ meeting }: { meeting: Meeting }) {
  const { t } = useTranslation('messages');
  if (meeting.status !== 'planned') return null;
  const q = new URLSearchParams({
    meeting: meeting.id,
    template: 'meetingReminder',
    channel: 'sms',
    ...(meeting.clientId ? { client: meeting.clientId } : {}),
  });
  return (
    <>
      <ButtonLink
        to={`/messages/new?${q}`}
        variant="secondary"
        size="sm"
        icon={<BellRing className="size-4" aria-hidden />}
        title={t('entry.reminderHint')}
      >
        {t('entry.reminder')}
      </ButtonLink>
      <CalendarExportButton meetingId={meeting.id} />
    </>
  );
}
