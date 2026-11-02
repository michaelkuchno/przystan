import { useTranslation } from 'react-i18next';
import { ClipboardList, Sparkles, Activity, Trash2 } from 'lucide-react';
import { Card, ButtonLink, EmptyState, Badge, IconButton } from '@/components/ui/core';
import { SupportiveNote } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { TrendChart } from '@/components/LazyCharts';
import { useStore, forClient, remove } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { INSTRUMENTS } from '@/lib/screening/instruments';
import { bandFor } from '@/lib/screening/score';
import type { Client, InstrumentId, Measurement, ToolId } from '@/domain/types';

const SEV_TONE = ['ok', 'warn', 'accent', 'danger'] as const;

export function bandTone(id: InstrumentId, score: number, sex: Client['sex']) {
  return SEV_TONE[bandFor(id, score, sex).severity];
}

export default function MeasurementsTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const toast = useToast();
  const ms = useStore(() => forClient('measurement', client.id)).sort((a, b) => a.date.localeCompare(b.date));

  const screenings = new Map<InstrumentId, Measurement[]>();
  const tools = new Map<ToolId, Measurement[]>();
  for (const m of ms) {
    if (m.source.kind === 'screening') screenings.set(m.source.instrument, [...(screenings.get(m.source.instrument) ?? []), m]);
    else if (m.score !== undefined || m.scoreBefore !== undefined)
      tools.set(m.source.tool, [...(tools.get(m.source.tool) ?? []), m]);
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <ButtonLink to={`/screening?client=${client.id}`} variant="soft" size="sm" icon={<ClipboardList className="size-4" />}>
        {t('runScreening')}
      </ButtonLink>
      <ButtonLink to={`/tools?client=${client.id}`} variant="soft" size="sm" icon={<Sparkles className="size-4" />}>
        {t('runTool')}
      </ButtonLink>
    </div>
  );

  if (ms.length === 0)
    return (
      <EmptyState icon={<Activity />} title={t('measurements.emptyTitle')} text={t('measurements.emptyText')} action={actions} />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SupportiveNote text={t('screening:disclaimer')} />
        {actions}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...screenings].map(([id, list]) => {
          const inst = INSTRUMENTS[id];
          const firstPositive = inst.bands(client.sex).find((b) => b.severity > 0);
          return (
            <Card key={id}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{id}</h3>
                <Badge tone={bandTone(id, list.at(-1)!.score!, client.sex)}>
                  {t(`screening:bands.${id}.${list.at(-1)!.band}`)}
                </Badge>
              </div>
              <TrendChart
                data={list.map((m) => ({ label: fmtDate(m.date, { day: 'numeric', month: 'short' }), score: m.score }))}
                series={[{ key: 'score', name: t('measurements.score') }]}
                max={inst.maxScore}
                {...(firstPositive
                  ? { threshold: { value: firstPositive.min, label: t('measurements.cutoff', { n: firstPositive.min }) } }
                  : {})}
              />
            </Card>
          );
        })}
        {[...tools].map(([tool, list]) => (
          <Card key={tool}>
            <h3 className="font-semibold">{t(`tools:names.${tool}`)}</h3>
            <TrendChart
              data={list.map((m) => ({
                label: fmtDate(m.date, { day: 'numeric', month: 'short' }),
                ...(m.scoreBefore !== undefined ? { before: m.scoreBefore } : {}),
                score: m.score,
              }))}
              series={[
                ...(list.some((m) => m.scoreBefore !== undefined)
                  ? [{ key: 'before', name: t('measurements.before'), dashed: true }]
                  : []),
                {
                  key: 'score',
                  name: list.some((m) => m.scoreBefore !== undefined) ? t('measurements.after') : t('measurements.score'),
                },
              ]}
              max={10}
            />
          </Card>
        ))}
      </div>
      <Card className="p-0 sm:p-0">
        <h3 className="px-4 pt-4 font-semibold">{t('measurements.history')}</h3>
        <ul className="divide-y divide-line">
          {[...ms].reverse().map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-24 shrink-0 text-sm text-muted">{fmtDate(m.date)}</span>
              <span className="flex-1 font-medium">
                {m.source.kind === 'screening' ? m.source.instrument : t(`tools:names.${m.source.tool}`)}
                {m.note && <span className="block text-sm font-normal text-muted">{m.note}</span>}
              </span>
              <span className="font-serif text-lg tabular-nums">
                {m.scoreBefore !== undefined ? `${m.scoreBefore} → ` : ''}
                {m.score ?? '–'}
              </span>
              <IconButton
                label={t('common:delete')}
                onClick={async () => {
                  const undo = await remove('measurement', m.id);
                  toast({ text: t('common:deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
