import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2, Save } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, Skeleton, EmptyState } from '@/components/ui/core';
import { Chips, SelectField, TextField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { all, get, save, uid, useStore } from '@/lib/store';
import { todayIso, haptic } from '@/lib/platform';
import { useContent } from '@/content/ContentProvider';
import { TOOL_META, type Audience, type ToolProps, type ToolResult } from './registry';
import type { ToolId } from '@/domain/types';
import { IconButton } from '@/components/ui/core';
import { MaterialButton } from '@/features/ai/MaterialSheet';

const COMPONENTS: Record<ToolId, React.LazyExoticComponent<(p: ToolProps) => React.ReactNode>> = {
  urgeSurfing: lazy(() => import('./tools/UrgeSurfing')),
  readinessRuler: lazy(() => import('./tools/ReadinessRuler')),
  decisionalBalance: lazy(() => import('./tools/DecisionalBalance')),
  chainAnalysis: lazy(() => import('./tools/ChainAnalysis')),
  halt: lazy(() => import('./tools/Halt')),
  thoughtRecord: lazy(() => import('./tools/ThoughtRecord')),
  scaling: lazy(() => import('./tools/Scaling')),
  triggerMap: lazy(() => import('./tools/RingMap').then((m) => ({ default: m.TriggerMap }))),
  supportMap: lazy(() => import('./tools/RingMap').then((m) => ({ default: m.SupportMap }))),
  grounding: lazy(() => import('./tools/Grounding')),
  breathing: lazy(() => import('./tools/Breathing')),
  socialSkills: lazy(() => import('./tools/SocialSkills')),
};

export default function ToolRunner() {
  const { t } = useTranslation('tools');
  const { tool = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const intros = useContent('tools').intros;
  const clients = useStore(() => all('client')).filter((c) => c.status === 'active');
  const [clientId, setClientId] = useState(params.get('client') ?? '');
  const meetingId = params.get('meeting') ?? undefined;
  const client = get('client', clientId);
  const [aud, setAud] = useState<Audience>(
    client && (client.ageGroup === 'teen' || client.ageGroup === 'child') ? 'youth' : 'adult',
  );
  const [show, setShow] = useState(false);
  const [note, setNote] = useState('');
  const result = useRef<ToolResult>({});
  const [hasResult, setHasResult] = useState(false);
  const onResult = useCallback((r: ToolResult) => {
    result.current = r;
    setHasResult(true);
  }, []);

  const meta = TOOL_META.find((m) => m.id === tool);
  if (!meta)
    return (
      <Page>
        <EmptyState title={t('notFound')} />
      </Page>
    );
  const Comp = COMPONENTS[meta.id];

  const saveResult = async () => {
    if (!clientId) return;
    await save('measurement', {
      id: uid(),
      clientId,
      date: todayIso(),
      source: { kind: 'tool', tool: meta.id },
      ...result.current,
      ...(note ? { note } : {}),
      ...(meetingId ? { meetingId } : {}),
    });
    const m = get('meeting', meetingId);
    if (m && !m.toolsUsed.includes(meta.id)) await save('meeting', { ...m, toolsUsed: [...m.toolsUsed, meta.id] });
    void haptic('success');
    toast({ text: t('saved'), tone: 'ok' });
    nav(-1);
  };

  const body = (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Comp aud={aud} onResult={onResult} />
    </Suspense>
  );

  return (
    <Page wide>
      <PageHeader
        back
        title={t(`names.${meta.id}`)}
        subtitle={intros[meta.id]?.[aud]}
        actions={
          <>
            <MaterialButton sensitivity="content" title={t(`names.${meta.id}`)} source={`${t(`names.${meta.id}`)}: ${intros[meta.id]?.[aud] ?? ''}`} />
            <Button variant="soft" icon={<Maximize2 className="size-4" />} onClick={() => setShow(true)}>
              {t('showClient')}
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="min-h-80">
          <div
            className={
              show ? 'safe-top safe-bottom safe-x fixed inset-0 z-[90] overflow-y-auto bg-bg px-5 py-6 text-[length:calc(1.1rem*var(--fs-body))]' : undefined
            }
            {...(show ? { role: 'dialog', 'aria-modal': true, 'aria-label': t(`names.${meta.id}`) } : {})}
          >
            <div className={show ? 'mx-auto max-w-3xl' : undefined}>
              {show && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-serif text-2xl font-semibold">{t(`names.${meta.id}`)}</h2>
                    <IconButton label={t('exitShow')} variant="secondary" onClick={() => setShow(false)}>
                      <Minimize2 className="size-5" />
                    </IconButton>
                  </div>
                  <p className="mb-6 text-muted">{intros[meta.id]?.[aud]}</p>
                </>
              )}
              {body}
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="space-y-4">
            <Chips
              label={t('version')}
              value={aud}
              onChange={(v) => v[0] && setAud(v[0])}
              options={[
                { value: 'youth', label: t('youth') },
                { value: 'adult', label: t('adult') },
              ]}
            />
            <SelectField
              label={t('saveFor')}
              value={clientId}
              onChange={setClientId}
              options={[{ value: '', label: t('noSave') }, ...clients.map((c) => ({ value: c.id, label: c.code }))]}
            />
            {clientId && <TextField multiline rows={2} label={t('note')} value={note} onChange={setNote} />}
            <Button className="w-full" disabled={!clientId} icon={<Save className="size-4" />} onClick={() => void saveResult()}>
              {hasResult ? t('saveResult') : t('saveUse')}
            </Button>
            {!clientId && <p className="text-xs text-muted">{t('chooseClientHint')}</p>}
          </Card>
        </div>
      </div>
    </Page>
  );
}
