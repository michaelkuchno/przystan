import { useTranslation } from 'react-i18next';
import { Plus, DoorOpen, CheckSquare2, Square, Trash2, FileDown } from 'lucide-react';
import { Card, Button, EmptyState, IconButton } from '@/components/ui/core';
import { DateField, TextInput } from '@/components/ui/form';
import { SaveStatus } from '@/components/SaveStatus';
import { useToast } from '@/components/ui/overlay';
import { useStore, forClient, save, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { useContent } from '@/content/ContentProvider';
import { readaptationPdf } from '@/lib/reports';
import { fmtDate } from '@/lib/format';
import { todayIso } from '@/lib/platform';
import { cn } from '@/components/ui/cn';
import type { Client, ReadaptationPlan } from '@/domain/types';

export function ReadaptationEditor({ plan }: { plan: ReadaptationPlan }) {
  const { t } = useTranslation('clients');
  const areas = useContent('templates').readaptationAreas;
  const toast = useToast();
  const { draft, update, status, flush } = useEditable('readaptation', plan);
  const done = draft.items.filter((i) => i.done).length;
  const today = todayIso();
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <DateField label={t('readaptation.release')} value={draft.releaseDate} onChange={(v) => update({ releaseDate: v })} />
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted">{t('readaptation.progress', { done, total: draft.items.length })}</div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${draft.items.length ? (done / draft.items.length) * 100 : 0}%` }} />
          </div>
        </div>
        <SaveStatus status={status} />
        <Button
          variant="soft"
          size="sm"
          icon={<FileDown className="size-4" />}
          onClick={async () => {
            await flush();
            await readaptationPdf(draft, areas);
            toast({ text: t('common:pdfReady'), tone: 'ok' });
          }}
        >
          PDF
        </Button>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {areas.map((a) => {
          const items = draft.items.filter((i) => i.area === a.id);
          return (
            <Card key={a.id} className="space-y-2">
              <h3 className="font-semibold">{a.title}</h3>
              {items.map((it) => {
                const setIt = (patch: Partial<typeof it>) =>
                  update((d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, ...patch } : x)) }));
                const overdue = !it.done && it.due && it.due < today;
                return (
                  <div key={it.id} className="flex items-center gap-1 rounded-xl bg-surface-2/60 pr-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={it.done}
                      aria-label={it.text}
                      className="inline-flex size-11 shrink-0 items-center justify-center"
                      onClick={() => setIt({ done: !it.done })}
                    >
                      {it.done ? <CheckSquare2 className="size-5 text-ok" /> : <Square className="size-5 text-muted" />}
                    </button>
                    <span className={cn('flex-1 py-2 text-sm', it.done && 'text-muted line-through')}>{it.text}</span>
                    <input
                      type="date"
                      aria-label={t('ipr.due')}
                      className={cn('w-[8.5rem] rounded-lg border border-line bg-surface px-2 py-1.5 text-xs', overdue && 'border-accent text-accent')}
                      value={it.due ?? ''}
                      onChange={(e) => setIt({ due: e.target.value })}
                      title={it.due ? fmtDate(it.due) : ''}
                    />
                    <IconButton label={t('common:delete')} onClick={() => update((d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                );
              })}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget.elements.namedItem('text') as HTMLInputElement);
                  if (!input.value.trim()) return;
                  update((d) => ({ ...d, items: [...d.items, { id: uid(), area: a.id, text: input.value.trim(), done: false }] }));
                  input.value = '';
                }}
              >
                <TextInput name="text" aria-label={t('readaptation.addItem')} placeholder={t('readaptation.addItem')} />
                <IconButton label={t('common:add')} variant="soft" type="submit">
                  <Plus className="size-5" />
                </IconButton>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function ReadaptationTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const areas = useContent('templates').readaptationAreas;
  const plan = useStore(() => forClient('readaptation', client.id))[0];
  if (!plan)
    return (
      <EmptyState
        icon={<DoorOpen />}
        title={t('readaptation.emptyTitle')}
        text={t('readaptation.emptyText')}
        action={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() =>
              void save('readaptation', {
                id: uid(),
                clientId: client.id,
                items: areas.flatMap((a) => a.items.map((text) => ({ id: uid(), area: a.id, text, done: false }))),
                updatedAt: new Date().toISOString(),
              })
            }
          >
            {t('readaptation.create')}
          </Button>
        }
      />
    );
  return <ReadaptationEditor key={plan.id} plan={plan} />;
}
