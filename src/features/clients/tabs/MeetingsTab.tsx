import { useTranslation } from 'react-i18next';
import { CalendarPlus, CalendarDays } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components/ui/core';
import { MeetingRows } from '@/features/meetings/MeetingsList';
import { useStore, forClient } from '@/lib/store';
import type { Client } from '@/domain/types';

export default function MeetingsTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const meetings = useStore(() => forClient('meeting', client.id)).sort((a, b) => b.date.localeCompare(a.date));
  const add = (
    <ButtonLink to={`/meetings/new?client=${client.id}`} icon={<CalendarPlus className="size-4" />}>
      {t('newMeeting')}
    </ButtonLink>
  );
  if (!meetings.length) return <EmptyState icon={<CalendarDays />} title={t('meetingsEmpty')} action={add} />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">{add}</div>
      <MeetingRows meetings={meetings} showClient={false} />
    </div>
  );
}
