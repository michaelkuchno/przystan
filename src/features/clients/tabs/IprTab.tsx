import { useTranslation } from 'react-i18next';
import { Plus, Target, Trash2, CheckSquare2, Square } from 'lucide-react';
import { Card, Button, EmptyState, IconButton, Badge } from '@/components/ui/core';
import { TextField, DateField, Slider, TextInput, TextArea } from '@/components/ui/form';
import { SaveStatus } from '@/components/SaveStatus';
import { useStore, forClient, save, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { todayIso } from '@/lib/platform';
import { addDays } from '@/lib/srs';
import type { Client, Ipr, IprGoal } from '@/domain/types';
import { cn } from '@/components/ui/cn';

const newGoal = (): IprGoal => ({
  id: uid(),
  title: '',
  specific: '',
  measurable: '',
  achievable: '',
  relevant: '',
  actions: [],
  progress: 0,
  reviewNotes: '',
});

function Editor({ ipr }: { ipr: Ipr }) {
  const { t } = useTranslation('clients');
  const { draft, update, status } = useEditable('ipr', ipr);
  const setGoal = (id: string, patch: Partial<IprGoal>) =>
    update((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  const avg = draft.goals.length ? Math.round(draft.goals.reduce((s, g) => s + g.progress, 0) / draft.goals.length) : 0;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <DateField label={t('ipr.start')} value={draft.startDate} onChange={(v) => update({ startDate: v })} />
        </div>
        <div className="w-44">
          <DateField label={t('ipr.review')} value={draft.reviewDate} onChange={(v) => update({ reviewDate: v })} />
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-xs text-muted">{t('ipr.overall')}</div>
          <div className="font-serif text-3xl font-semibold text-primary">{avg}%</div>
        </div>
        <SaveStatus status={status} history={{ kind: 'ipr', id: draft.id }} />
      </Card>

      {draft.goals.map((g, i) => (
        <Card key={g.id} className="space-y-4">
          <div className="flex items-start gap-2">
            <Badge tone="accent">{t('ipr.goalN', { n: i + 1 })}</Badge>
            <div className="flex-1" />
            <IconButton
              label={t('common:delete')}
              onClick={() => update((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== g.id) }))}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
          <TextField label={t('ipr.goalTitle')} value={g.title} onChange={(v) => setGoal(g.id, { title: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            {(['specific', 'measurable', 'achievable', 'relevant'] as const).map((k) => (
              <TextField
                key={k}
                multiline
                rows={2}
                label={t(`ipr.smart.${k}`)}
                hint={t(`ipr.smartHint.${k}`)}
                value={g[k]}
                onChange={(v) => setGoal(g.id, { [k]: v })}
              />
            ))}
          </div>
          <div className="sm:w-56">
            <DateField label={t('ipr.smart.timeBound')} value={g.timeBound} onChange={(v) => setGoal(g.id, { timeBound: v })} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold">{t('ipr.actions')}</h4>
              <Button
                size="sm"
                variant="soft"
                icon={<Plus className="size-4" />}
                onClick={() => setGoal(g.id, { actions: [...g.actions, { id: uid(), text: '', responsible: '', done: false }] })}
              >
                {t('ipr.addAction')}
              </Button>
            </div>
            <div className="space-y-2">
              {g.actions.map((a) => {
                const setA = (patch: Partial<typeof a>) =>
                  setGoal(g.id, { actions: g.actions.map((x) => (x.id === a.id ? { ...x, ...patch } : x)) });
                return (
                  <div
                    key={a.id}
                    className="grid gap-2 rounded-2xl bg-surface-2 p-2 sm:grid-cols-[auto_1fr_10rem_9.5rem_auto] sm:items-center"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={a.done}
                      aria-label={t('ipr.done')}
                      className="inline-flex size-11 items-center justify-center"
                      onClick={() => setA({ done: !a.done })}
                    >
                      {a.done ? <CheckSquare2 className="size-5 text-ok" /> : <Square className="size-5 text-muted" />}
                    </button>
                    <TextArea
                      autoGrow
                      rows={1}
                      aria-label={t('ipr.action')}
                      placeholder={t('ipr.action')}
                      className={cn(a.done && 'line-through opacity-70')}
                      value={a.text}
                      onChange={(e) => setA({ text: e.target.value })}
                    />
                    <TextInput
                      aria-label={t('ipr.responsible')}
                      placeholder={t('ipr.responsible')}
                      value={a.responsible}
                      onChange={(e) => setA({ responsible: e.target.value })}
                    />
                    <TextInput
                      aria-label={t('ipr.due')}
                      type="date"
                      value={a.due ?? ''}
                      onChange={(e) => setA({ due: e.target.value })}
                    />
                    <IconButton
                      label={t('common:delete')}
                      onClick={() => setGoal(g.id, { actions: g.actions.filter((x) => x.id !== a.id) })}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          </div>

          <Slider
            label={t('ipr.progress')}
            value={g.progress}
            max={100}
            step={5}
            onChange={(v) => setGoal(g.id, { progress: v })}
          />
          <TextField
            multiline
            label={t('ipr.reviewNotes')}
            value={g.reviewNotes}
            onChange={(v) => setGoal(g.id, { reviewNotes: v })}
          />
        </Card>
      ))}

      <Button
        variant="secondary"
        className="w-full"
        icon={<Plus className="size-4" />}
        onClick={() => update((d) => ({ ...d, goals: [...d.goals, newGoal()] }))}
      >
        {t('ipr.addGoal')}
      </Button>

      <Card>
        <TextField
          multiline
          rows={4}
          label={t('ipr.evaluation')}
          hint={t('ipr.evaluationHint')}
          value={draft.evaluation}
          onChange={(v) => update({ evaluation: v })}
        />
      </Card>
    </div>
  );
}

export default function IprTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const ipr = useStore(() => forClient('ipr', client.id))[0];
  if (!ipr)
    return (
      <EmptyState
        icon={<Target />}
        title={t('ipr.emptyTitle')}
        text={t('ipr.emptyText')}
        action={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() =>
              void save('ipr', {
                id: uid(),
                clientId: client.id,
                startDate: todayIso(),
                reviewDate: addDays(todayIso(), 90),
                goals: [newGoal()],
                evaluation: '',
              })
            }
          >
            {t('ipr.create')}
          </Button>
        }
      />
    );
  return <Editor key={ipr.id} ipr={ipr} />;
}
