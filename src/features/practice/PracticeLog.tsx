import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Badge, Button, Card, EmptyState } from '@/components/ui/core';
import { Field, SelectField, TextField, TextInput } from '@/components/ui/form';
import { Sheet, useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { useStore, all, save, remove, uid } from '@/lib/store';
import { usePrefs, setPrefs } from '@/lib/prefs';
import { fmtDate } from '@/lib/format';
import { todayIso } from '@/lib/platform';
import { PRACTICE_ACTIVITIES, type PracticeEntry } from '@/domain/types';
import { practiceTotals } from './practice';
import { DictateButton } from '@/features/ai/DictateButton';
import { appendText } from '@/features/ai/text';

const empty = (place = ''): PracticeEntry => ({
  id: uid(),
  date: todayIso(),
  place,
  hours: 4,
  activity: 'observation',
  description: '',
  reflections: '',
  updatedAt: new Date().toISOString(),
});

export default function PracticeLog() {
  const { t } = useTranslation('practice');
  const toast = useToast();
  const confirm = useConfirm();
  const prefs = usePrefs();
  const entries = useStore(() => all('practice'));
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const totals = practiceTotals(entries, prefs.practiceGoalH);
  const [draft, setDraft] = useState<PracticeEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const saveDraft = async () => {
    if (!draft) return;
    await save('practice', {
      ...draft,
      hours: Math.max(0, Math.round(draft.hours * 4) / 4),
      updatedAt: new Date().toISOString(),
    });
    setDraft(null);
    toast({ text: t('saved'), tone: 'ok' });
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { practiceLogPdf } = await import('@/lib/reports');
      await practiceLogPdf(sorted, prefs.practiceGoalH);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<FileDown className="size-4" />}
              disabled={busy || !entries.length}
              onClick={() => void exportPdf()}
            >
              {t('exportPdf')}
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => setDraft(empty(sorted[0]?.place))}>
              {t('add')}
            </Button>
          </>
        }
      />

      <Card className="mb-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted">{t('progress')}</div>
            <div className="font-serif text-3xl font-semibold tabular-nums">
              {totals.hours.toLocaleString()} / {prefs.practiceGoalH} h
            </div>
          </div>
          <Field label={t('goal')} htmlFor="practice-goal" className="w-32">
            <TextInput
              id="practice-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={2000}
              value={prefs.practiceGoalH}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) void setPrefs({ practiceGoalH: Math.round(v) });
              }}
            />
          </Field>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={t('progress')}
          aria-valuemin={0}
          aria-valuemax={prefs.practiceGoalH}
          aria-valuenow={totals.hours}
        >
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${totals.percent}%` }} />
        </div>
        <p className="text-sm text-muted">
          {totals.remaining > 0 ? t('remaining', { h: totals.remaining.toLocaleString() }) : t('done')}
        </p>
        {totals.byActivity.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {totals.byActivity.map(([a, h]) => (
              <Badge key={a}>
                {t(`activity.${a}`)}: {h.toLocaleString()} h
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Notice className="mb-4">{t('privacy')}</Notice>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<NotebookPen />}
          title={t('emptyTitle')}
          text={t('emptyText')}
          action={
            <Button icon={<Plus className="size-4" />} onClick={() => setDraft(empty())}>
              {t('add')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setDraft(e)}
              className="block w-full rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left shadow-[var(--shadow-card)] hover:bg-surface-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold">{fmtDate(e.date)}</span>
                <span className="font-serif text-lg font-semibold tabular-nums">{e.hours.toLocaleString()} h</span>
              </div>
              <div className="text-sm text-muted">
                {t(`activity.${e.activity}`)} · {e.place || '—'}
              </div>
              {e.description && <p className="mt-1 line-clamp-2 text-sm">{e.description}</p>}
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        title={draft && entries.some((x) => x.id === draft.id) ? t('edit') : t('add')}
        footer={
          <>
            {draft && entries.some((x) => x.id === draft.id) && (
              <Button
                variant="ghost"
                icon={<Trash2 className="size-4" />}
                onClick={async () => {
                  if (!draft || !(await confirm({ title: t('deleteConfirm'), danger: true }))) return;
                  const undo = await remove('practice', draft.id);
                  setDraft(null);
                  toast({ text: t('deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
                }}
              >
                {t('common:delete')}
              </Button>
            )}
            <Button disabled={!draft?.date || !(draft?.hours > 0)} onClick={() => void saveDraft()}>
              {t('common:save')}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t('fields.date')}
                type="date"
                value={draft.date}
                onChange={(v) => setDraft({ ...draft, date: v })}
              />
              <TextField
                label={t('fields.hours')}
                type="number"
                inputMode="decimal"
                min={0.25}
                step={0.25}
                value={String(draft.hours)}
                onChange={(v) => setDraft({ ...draft, hours: Number(v.replace(',', '.')) || 0 })}
              />
            </div>
            <TextField
              label={t('fields.place')}
              hint={t('fields.placeHint')}
              value={draft.place}
              onChange={(v) => setDraft({ ...draft, place: v })}
            />
            <SelectField
              label={t('fields.activity')}
              value={draft.activity}
              onChange={(v) => setDraft({ ...draft, activity: v })}
              options={PRACTICE_ACTIVITIES.map((a) => ({ value: a, label: t(`activity.${a}`) }))}
            />
            <TextField
              label={t('fields.description')}
              hint={t('fields.noIdentifiers')}
              multiline
              rows={4}
              value={draft.description}
              onChange={(v) => setDraft({ ...draft, description: v })}
            />
            <DictateButton
              sensitivity="client"
              onText={(x) => setDraft((d) => d && { ...d, description: appendText(d.description, x) })}
            />
            <TextField
              label={t('fields.reflections')}
              multiline
              rows={4}
              value={draft.reflections}
              onChange={(v) => setDraft({ ...draft, reflections: v })}
            />
            <DictateButton
              sensitivity="client"
              onText={(x) => setDraft((d) => d && { ...d, reflections: appendText(d.reflections, x) })}
            />
          </div>
        )}
      </Sheet>
    </Page>
  );
}
