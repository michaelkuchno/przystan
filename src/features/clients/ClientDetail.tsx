import { lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, FileDown, CalendarPlus } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, ButtonLink, EmptyState, Avatar, Skeleton } from '@/components/ui/core';
import { Tabs, useConfirm, useToast } from '@/components/ui/overlay';
import { useStore, get, remove } from '@/lib/store';
import { Overview } from './tabs/Overview';
import { clientReportPdf } from '@/lib/reports';

const DiagnosisTab = lazy(() => import('./tabs/DiagnosisTab'));
const IprTab = lazy(() => import('./tabs/IprTab'));
const RelapseTab = lazy(() => import('./tabs/RelapseTab'));
const TimelineTab = lazy(() => import('./tabs/TimelineTab'));
const GenogramTab = lazy(() => import('./tabs/GenogramTab'));
const MeasurementsTab = lazy(() => import('./tabs/MeasurementsTab'));
const MeetingsTab = lazy(() => import('./tabs/MeetingsTab'));
const ReadaptationTab = lazy(() => import('./tabs/ReadaptationTab'));
const FamilyPlanTab = lazy(() => import('./tabs/FamilyPlanTab'));

const fallback = <Skeleton className="h-64" />;

export default function ClientDetail() {
  const { t } = useTranslation('clients');
  const { id = '', tab = 'overview' } = useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const client = useStore(() => get('client', id));

  if (!client)
    return (
      <Page>
        <PageHeader back="/clients" title={t('notFound')} />
        <EmptyState title={t('notFound')} />
      </Page>
    );

  const del = async () => {
    const ok = await confirm({ title: t('deleteConfirm'), text: t('deleteConfirmText'), confirm: t('common:delete'), danger: true });
    if (!ok) return;
    const undo = await remove('client', client.id);
    nav('/clients');
    toast({ text: t('deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
  };

  const wrap = (node: React.ReactNode) => <Suspense fallback={fallback}>{node}</Suspense>;
  const tabs = [
    { value: 'overview', label: t('tabs.overview'), content: <Overview client={client} /> },
    { value: 'diagnosis', label: t('tabs.diagnosis'), content: wrap(<DiagnosisTab client={client} />) },
    { value: 'ipr', label: t('tabs.ipr'), content: wrap(<IprTab client={client} />) },
    { value: 'relapse', label: t('tabs.relapse'), content: wrap(<RelapseTab client={client} />) },
    { value: 'meetings', label: t('tabs.meetings'), content: wrap(<MeetingsTab client={client} />) },
    { value: 'measurements', label: t('tabs.measurements'), content: wrap(<MeasurementsTab client={client} />) },
    { value: 'timeline', label: t('tabs.timeline'), content: wrap(<TimelineTab client={client} />) },
    { value: 'genogram', label: t('tabs.genogram'), content: wrap(<GenogramTab client={client} />) },
    { value: 'family', label: t('tabs.family'), content: wrap(<FamilyPlanTab client={client} />) },
    { value: 'readaptation', label: t('tabs.readaptation'), content: wrap(<ReadaptationTab client={client} />) },
  ];

  return (
    <Page wide>
      <PageHeader
        back="/clients"
        eyebrow={t(`enums:context.${client.context}`)}
        title={
          <span className="flex items-center gap-3">
            <Avatar label={client.code} tone={client.isGroup ? 'blue' : 'primary'} />
            <span className="pii">{client.code}</span>
          </span>
        }
        subtitle={
          <span className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="blue">{t(`enums:stage.${client.stage}`)}</Badge>
            <Badge tone={client.goal === 'abstinence' ? 'primary' : 'neutral'}>{t(`enums:goal.${client.goal}`)}</Badge>
            {client.problems.map((p) => (
              <Badge key={p}>{t(`enums:problem.${p}`)}</Badge>
            ))}
            {client.status !== 'active' && <Badge tone="warn">{t(`enums:status.${client.status}`)}</Badge>}
          </span>
        }
        actions={
          <>
            <ButtonLink to={`/meetings/new?client=${client.id}`} variant="soft" size="sm" icon={<CalendarPlus className="size-4" />}>
              {t('newMeeting')}
            </ButtonLink>
            <Button
              variant="secondary"
              size="sm"
              icon={<FileDown className="size-4" />}
              onClick={async () => {
                const r = await clientReportPdf(client.id);
                if (r === 'downloaded' || r === 'shared') toast({ text: t('common:pdfReady'), tone: 'ok' });
              }}
            >
              {t('report')}
            </Button>
            <ButtonLink to={`/clients/${client.id}/edit`} variant="secondary" size="sm" icon={<Pencil className="size-4" />}>
              {t('common:edit')}
            </ButtonLink>
            <Button variant="ghost" size="sm" onClick={() => void del()} aria-label={t('common:delete')}>
              <Trash2 className="size-4" />
            </Button>
          </>
        }
      />
      <Tabs tabs={tabs} value={tab} onChange={(v) => nav(`/clients/${client.id}/${v}`, { replace: true })} />
    </Page>
  );
}
