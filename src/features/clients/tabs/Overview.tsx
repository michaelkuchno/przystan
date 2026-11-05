import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sparkles, ClipboardList, CalendarClock } from 'lucide-react';
import { Card, SectionTitle, ButtonLink } from '@/components/ui/core';
import { SupportiveNote } from '@/components/ui/page';
import { useAttention, AttentionItem } from '@/features/dashboard/Dashboard';
import { useStore, forClient } from '@/lib/store';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { todayIso } from '@/lib/platform';
import { cn } from '@/components/ui/cn';
import type { Client } from '@/domain/types';

export function Overview({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const flags = useAttention().filter((f) => f.clientId === client.id);
  const meetings = useStore(() => forClient('meeting', client.id));
  const today = todayIso();
  const next = meetings
    .filter((m) => m.status === 'planned' && m.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const fields: [string, string | undefined][] = [
    [t('fields.strengths'), client.strengths],
    [t('fields.supportNetwork'), client.supportNetwork],
    [t('fields.family'), client.family],
    [t('fields.education'), client.education],
    [t('fields.notes'), client.notes],
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        <Card>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">{t('fields.ageGroup')}</dt>
              <dd className="font-medium">
                {t(`enums:ageGroup.${client.ageGroup}`)}
                {client.age ? ` (${client.age})` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t('fields.context')}</dt>
              <dd className="font-medium">{t(`enums:context.${client.context}`)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('fields.goal')}</dt>
              <dd className="font-medium">{t(`enums:goal.${client.goal}`)}</dd>
            </div>
            {client.fullName && (
              <div className="sm:col-span-3">
                <dt className="text-muted">{t('fields.fullName')}</dt>
                <dd className="pii font-medium">{client.fullName}</dd>
              </div>
            )}
          </dl>
        </Card>
        {fields
          .filter(([, v]) => v?.trim())
          .map(([label, v], i) => (
            <Card key={label} className={i === 0 ? 'border-primary/30 bg-primary-soft/40' : undefined}>
              <h3 className="mb-1 font-sans text-sm font-semibold text-muted">{label}</h3>
              <p className="leading-relaxed whitespace-pre-line">{v}</p>
            </Card>
          ))}
      </div>
      <div className="space-y-4">
        <Card>
          <h3 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-muted">
            <CalendarClock className="size-4" aria-hidden />
            {t('nextMeeting')}
          </h3>
          {next ? (
            <Link to={`/meetings/${next.id}`} className="font-medium text-primary">
              {fmtDateTime(next.date)}
            </Link>
          ) : (
            <p className="text-sm text-muted">{t('noNextMeeting')}</p>
          )}
        </Card>
        {client.keyDates.length > 0 && (
          <Card>
            <h3 className="mb-2 font-sans text-sm font-semibold text-muted">{t('fields.keyDates')}</h3>
            <ul className="space-y-1.5 text-sm">
              {[...client.keyDates]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((k) => (
                  <li key={k.id} className="flex flex-wrap justify-between gap-x-3">
                    <span>{k.label}</span>
                    <span className={cn('shrink-0 whitespace-nowrap', k.date >= today ? 'font-medium' : 'text-muted')}>
                      {fmtDate(k.date)}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
        <div>
          <SectionTitle>{t('dashboard:attention')}</SectionTitle>
          <Card className="p-2 sm:p-2">
            {flags.length === 0 ? (
              <p className="p-3 text-sm text-muted">{t('dashboard:noAttention')}</p>
            ) : (
              flags.map((f, i) => <AttentionItem key={i} flag={f} showClient={false} />)
            )}
            <div className="px-3 pb-2">
              <SupportiveNote text={t('dashboard:attentionNote')} />
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink to={`/tools?client=${client.id}`} variant="soft" icon={<Sparkles className="size-4" />}>
            {t('runTool')}
          </ButtonLink>
          <ButtonLink to={`/screening?client=${client.id}`} variant="soft" icon={<ClipboardList className="size-4" />}>
            {t('runScreening')}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
