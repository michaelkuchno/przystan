import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Stethoscope } from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/ui/core';
import { ListEditor, TextField, Select, DateField } from '@/components/ui/form';
import { SupportiveNote } from '@/components/ui/page';
import { DiagnosisRadar } from '@/components/LazyCharts';
import { SaveStatus } from '@/components/SaveStatus';
import { useStore, forClient, save, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { todayIso } from '@/lib/platform';
import { fmtDate } from '@/lib/format';
import { useContent } from '@/content/ContentProvider';
import { DIAGNOSIS_AREAS, type Client, type Diagnosis } from '@/domain/types';
import { cn } from '@/components/ui/cn';

function newDiagnosis(clientId: string, from?: Diagnosis): Diagnosis {
  return {
    id: uid(),
    clientId,
    date: todayIso(),
    areas: Object.fromEntries(
      DIAGNOSIS_AREAS.map((a) => [a, { score: from?.areas[a]?.score ?? 3, notes: '' }]),
    ) as Diagnosis['areas'],
    riskFactors: from?.riskFactors ?? [],
    protectiveFactors: from?.protectiveFactors ?? [],
    resources: from?.resources ?? '',
    conclusions: '',
  };
}

function Editor({ diagnosis, previous }: { diagnosis: Diagnosis; previous?: Diagnosis }) {
  const { t } = useTranslation('clients');
  const prevention = useContent('prevention');
  const { draft, update, status } = useEditable('diagnosis', diagnosis);
  const data = DIAGNOSIS_AREAS.map((a) => ({
    area: t(`diagnosis.areas.${a}`),
    value: draft.areas[a].score,
    ...(previous ? { previous: previous.areas[a]?.score } : {}),
  }));
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('diagnosis.chart')}</h3>
            <SaveStatus status={status} />
          </div>
          <DiagnosisRadar
            data={data}
            labels={{ current: fmtDate(draft.date), ...(previous ? { previous: fmtDate(previous.date) } : {}) }}
          />
          <p className="text-center text-xs text-muted">{t('diagnosis.scale')}</p>
        </Card>
        <Card className="space-y-4">
          <DateField label={t('diagnosis.date')} value={draft.date} onChange={(v) => update({ date: v })} />
          <ListEditor
            label={t('diagnosis.risk')}
            items={draft.riskFactors}
            onChange={(v) => update({ riskFactors: v })}
            suggestions={prevention.riskFactors.map((f) => f.text)}
          />
          <ListEditor
            label={t('diagnosis.protective')}
            items={draft.protectiveFactors}
            onChange={(v) => update({ protectiveFactors: v })}
            suggestions={prevention.protectiveFactors.map((f) => f.text)}
          />
          <TextField
            multiline
            label={t('diagnosis.resources')}
            value={draft.resources}
            onChange={(v) => update({ resources: v })}
          />
          <TextField
            multiline
            rows={4}
            label={t('diagnosis.conclusions')}
            value={draft.conclusions}
            onChange={(v) => update({ conclusions: v })}
          />
          <SupportiveNote text={t('diagnosis.note')} />
        </Card>
      </div>
      <Card className="space-y-1 p-2 sm:p-3">
        <h3 className="px-2 pt-2 font-semibold">{t('diagnosis.areasTitle')}</h3>
        <p className="px-2 pb-2 text-sm text-muted">{t('diagnosis.areasHint')}</p>
        {DIAGNOSIS_AREAS.map((a) => {
          const v = draft.areas[a];
          return (
            <div key={a} className="rounded-2xl p-2 hover:bg-surface-2/60">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`area-${a}`} className="font-medium">
                  {t(`diagnosis.areas.${a}`)}
                </label>
                <div className="flex gap-1" role="radiogroup" aria-label={t(`diagnosis.areas.${a}`)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={v.score === n}
                      aria-label={`${n} – ${t(`diagnosis.level.${n}`)}`}
                      title={t(`diagnosis.level.${n}`)}
                      onClick={() => update((d) => ({ ...d, areas: { ...d.areas, [a]: { ...d.areas[a], score: n } } }))}
                      className={cn(
                        'size-11 rounded-xl text-sm font-semibold transition',
                        v.score === n
                          ? n <= 2
                            ? 'bg-accent text-white dark:text-black'
                            : n === 3
                              ? 'bg-warn text-white dark:text-black'
                              : 'bg-primary text-primary-fg'
                          : 'bg-surface-2 text-muted',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id={`area-${a}`}
                rows={2}
                placeholder={t('diagnosis.areaNotes')}
                className="mt-2 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                value={v.notes}
                onChange={(e) => update((d) => ({ ...d, areas: { ...d.areas, [a]: { ...d.areas[a], notes: e.target.value } } }))}
              />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

export default function DiagnosisTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const list = useStore(() => forClient('diagnosis', client.id)).sort((a, b) => b.date.localeCompare(a.date));
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const current = list.find((d) => d.id === selected) ?? list[0];
  const previous = current ? list[list.indexOf(current) + 1] : undefined;

  const create = async () => {
    const d = newDiagnosis(client.id, list[0]);
    await save('diagnosis', d);
    setSelected(d.id);
  };

  if (!current)
    return (
      <EmptyState
        icon={<Stethoscope />}
        title={t('diagnosis.emptyTitle')}
        text={t('diagnosis.emptyText')}
        action={
          <Button icon={<Plus className="size-4" />} onClick={() => void create()}>
            {t('diagnosis.new')}
          </Button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {list.length > 1 && (
          <>
            <label htmlFor="dx-select" className="text-sm text-muted">
              {t('diagnosis.version')}
            </label>
            <Select id="dx-select" className="w-auto" value={current.id} onChange={(e) => setSelected(e.target.value)}>
              {list.map((d) => (
                <option key={d.id} value={d.id}>
                  {fmtDate(d.date)}
                </option>
              ))}
            </Select>
          </>
        )}
        <div className="flex-1" />
        <Button variant="soft" size="sm" icon={<Plus className="size-4" />} onClick={() => void create()}>
          {t('diagnosis.newFollowUp')}
        </Button>
      </div>
      <Editor key={current.id} diagnosis={current} {...(previous ? { previous } : {})} />
    </div>
  );
}
