import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Save, RotateCcw, Languages } from 'lucide-react';
import { Page, PageHeader, Notice, SupportiveNote } from '@/components/ui/page';
import { Button, Card, EmptyState, Badge } from '@/components/ui/core';
import { SelectField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { INSTRUMENTS } from '@/lib/screening/instruments';
import { PL_INSTRUMENTS } from '@/lib/screening/pl';
import { scoreInstrument } from '@/lib/screening/score';
import { all, get, save, uid, useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { todayIso, haptic } from '@/lib/platform';
import { cn } from '@/components/ui/cn';
import type { InstrumentId, Sex } from '@/domain/types';

const TONES = [
  'bg-ok-soft text-ok',
  'bg-warn-soft text-warn',
  'bg-accent-soft text-accent-soft-fg',
  'bg-danger-soft text-danger',
];

export default function ScreeningForm() {
  const { t } = useTranslation('screening');
  const { instrument = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { lang } = usePrefs();
  const clients = useStore(() => all('client')).filter((c) => !c.isGroup);
  const [clientId, setClientId] = useState(params.get('client') ?? '');
  const client = get('client', clientId);
  const [sexOverride, setSexOverride] = useState<Sex>('unspecified');
  const sex = client?.sex ?? sexOverride;
  const inst = INSTRUMENTS[instrument as InstrumentId];
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);

  const result = useMemo(() => (inst ? scoreInstrument(inst.id, answers, sex) : null), [inst, answers, sex]);
  if (!inst || !result)
    return (
      <Page>
        <EmptyState title={t('notFound')} />
      </Page>
    );

  const pl = lang === 'pl' ? PL_INSTRUMENTS[inst.id] : null;
  const showTodo = lang === 'pl' && !pl;
  const answered = answers.filter((a) => a !== undefined).length;

  const submit = async () => {
    if (!clientId) return;
    await save('measurement', {
      id: uid(),
      clientId,
      date: todayIso(),
      source: { kind: 'screening', instrument: inst.id },
      score: result.score,
      band: result.band.id,
      answers: answers.map((a) => a ?? 0),
      ...(params.get('meeting') ? { meetingId: params.get('meeting')! } : {}),
    });
    void haptic('success');
    toast({ text: t('saved'), tone: 'ok' });
    nav(`/clients/${clientId}/measurements`);
  };

  return (
    <Page>
      <PageHeader back title={inst.id} subtitle={inst.name} />
      <Notice tone="warn" className="mb-4">
        {t('disclaimer')}
      </Notice>
      {showTodo && (
        <Notice tone="accent" className="mb-4" icon={<Languages aria-hidden />}>
          <strong>TODO:</strong> {t('todoPlText')}
        </Notice>
      )}
      <Card className="mb-4 grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t('client')}
          value={clientId}
          onChange={setClientId}
          options={[{ value: '', label: t('noClient') }, ...clients.map((c) => ({ value: c.id, label: c.code }))]}
        />
        {!client && (
          <SelectField
            label={t('sexForNorms')}
            value={sexOverride}
            onChange={setSexOverride}
            options={(['female', 'male', 'unspecified'] as const).map((s) => ({ value: s, label: t(`enums:sex.${s}`) }))}
          />
        )}
        {client && (sex === 'unspecified' || sex === 'other') && inst.id !== 'AUDIT' && (
          <p className="text-xs text-muted sm:col-span-2">{t('sexNote')}</p>
        )}
      </Card>

      <ol className="space-y-3">
        {inst.items.map((item, i) => {
          const text = pl?.items[i]?.text ?? item.text;
          return (
            <li key={item.id}>
              <Card>
                <fieldset>
                  <legend className="mb-3 flex gap-3 font-medium">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                      {i + 1}
                    </span>
                    <span lang={pl ? 'pl' : 'en'}>{text}</span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup">
                    {item.options.map((o, j) => (
                      <button
                        key={j}
                        type="button"
                        role="radio"
                        aria-checked={answers[i] === j}
                        onClick={() => {
                          const next = [...answers];
                          next[i] = j;
                          setAnswers(next);
                          void haptic('light');
                        }}
                        className={cn(
                          'flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                          answers[i] === j
                            ? 'border-primary bg-primary text-primary-fg'
                            : 'border-line bg-surface hover:bg-surface-2',
                        )}
                      >
                        <span lang={pl ? 'pl' : 'en'}>{pl?.items[i]?.options[j] ?? o.label}</span>
                        <span className="text-xs opacity-70">{o.points}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </Card>
            </li>
          );
        })}
      </ol>

      <motion.div layout className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-10 mt-5 lg:bottom-4">
        <Card className="flex flex-wrap items-center gap-4 shadow-xl">
          <div>
            <div className="text-xs text-muted">{t('progress', { answered, total: inst.items.length })}</div>
            <div className="font-serif text-4xl font-semibold tabular-nums">
              {result.score}
              <span className="text-lg text-muted">/{inst.maxScore}</span>
            </div>
          </div>
          <div className={cn('flex-1 rounded-2xl px-4 py-3', TONES[result.band.severity])} aria-live="polite">
            <div className="font-semibold">{t(`bands.${inst.id}.${result.band.id}`)}</div>
            <div className="text-sm">{t(`bandHints.${inst.id}.${result.band.id}`)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setAnswers([])}>
              {t('reset')}
            </Button>
            <Button disabled={!clientId || !result.complete} icon={<Save className="size-4" />} onClick={() => void submit()}>
              {t('save')}
            </Button>
          </div>
          {!result.complete && <Badge tone="warn">{t('incomplete')}</Badge>}
        </Card>
      </motion.div>

      <Card className="mt-5 space-y-2 text-sm">
        <SupportiveNote text={t('disclaimer')} />
        <p>
          <strong>{t('source')}:</strong> {inst.source}
        </p>
        <p>
          <strong>{t('licence')}:</strong> {inst.licence}
        </p>
      </Card>
    </Page>
  );
}
