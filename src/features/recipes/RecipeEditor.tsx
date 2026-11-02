import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Plus, Trash2, FileDown, Clock, ChefHat, Search, Copy } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, EmptyState, IconButton, Badge } from '@/components/ui/core';
import { TextField, TextInput, Chips } from '@/components/ui/form';
import { useConfirm, useToast } from '@/components/ui/overlay';
import { SaveStatus } from '@/components/SaveStatus';
import { get, remove, save, uid, useStore } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { useContent } from '@/content/ContentProvider';
import { recipePdf } from '@/lib/reports';
import { haptic } from '@/lib/platform';
import { cn } from '@/components/ui/cn';
import type { Recipe, RecipeItem } from '@/domain/types';
import type { Ingredient, IngredientCategory } from '@/content/types';

const CAT_TONE: Record<IngredientCategory, string> = {
  opening: 'bg-blue-soft text-blue',
  mi: 'bg-primary-soft text-primary-soft-fg',
  cbt: 'bg-primary-soft text-primary-soft-fg',
  skills: 'bg-accent-soft text-accent-soft-fg',
  group: 'bg-warn-soft text-warn',
  family: 'bg-accent-soft text-accent-soft-fg',
  prevention: 'bg-ok-soft text-ok',
  relaxation: 'bg-blue-soft text-blue',
  closing: 'bg-surface-3 text-fg',
};

function Step({ item, index, start, onChange, onRemove }: { item: RecipeItem; index: number; start: number; onChange: (i: RecipeItem) => void; onRemove: () => void }) {
  const { t } = useTranslation('recipes');
  const controls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className="list-none">
      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm">
        <button
          type="button"
          className="mt-1 inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted hover:bg-surface-2 active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          aria-label={t('reorder')}
        >
          <GripVertical className="size-5" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-muted tabular-nums">
              {start}–{start + item.minutes}′
            </span>
            <TextInput aria-label={t('stepTitle', { n: index + 1 })} value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} className="font-medium" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex w-16 shrink-0 items-center gap-1 text-xs text-muted" htmlFor={`min-${item.id}`}>
              <Clock className="size-3.5" aria-hidden /> min
            </label>
            <input
              id={`min-${item.id}`}
              type="number"
              min={1}
              max={240}
              value={item.minutes}
              onChange={(e) => onChange({ ...item, minutes: Math.max(1, Number(e.target.value) || 1) })}
              className="min-h-11 w-20 rounded-xl border border-line bg-surface px-2 text-center"
            />
            <TextInput aria-label={t('note')} placeholder={t('note')} value={item.note} onChange={(e) => onChange({ ...item, note: e.target.value })} className="text-sm" />
          </div>
        </div>
        <IconButton label={t('common:delete')} onClick={onRemove}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </Reorder.Item>
  );
}

function Editor({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation('recipes');
  const { ingredients } = useContent('templates');
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const { draft, update, status, flush } = useEditable('recipe', recipe);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<IngredientCategory | 'all'>('all');
  const [dragOver, setDragOver] = useState(false);
  const used = draft.items.reduce((s, i) => s + i.minutes, 0);
  const over = used > draft.durationMin;
  const cats = useMemo(() => Array.from(new Set(ingredients.map((i) => i.category))), [ingredients]);
  const shown = ingredients.filter(
    (i) => (cat === 'all' || i.category === cat) && (!q || `${i.title} ${i.description}`.toLowerCase().includes(q.toLowerCase())),
  );

  const add = (ing: Ingredient) => {
    update((d) => ({ ...d, items: [...d.items, { id: uid(), ingredientId: ing.id, title: ing.title, minutes: ing.minutes, note: '' }] }));
    void haptic('light');
  };

  const starts = draft.items.reduce<number[]>((acc, _it, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + draft.items[i - 1]!.minutes], []);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-4">
        <Card className="recipe-card space-y-3">
          <div className="flex items-center gap-2">
            <ChefHat className="size-6 text-accent" aria-hidden />
            <div className="flex-1" />
            <SaveStatus status={status} />
          </div>
          <TextField label={t('name')} value={draft.title} onChange={(v) => update({ title: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField multiline rows={2} label={t('goal')} value={draft.goal} onChange={(v) => update({ goal: v })} />
            <TextField multiline rows={2} label={t('audience')} value={draft.audience} onChange={(v) => update({ audience: v })} />
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="flex-1 text-lg font-semibold">{t('timeline')}</h2>
            <label className="flex items-center gap-2 text-sm" htmlFor="budget">
              {t('budget')}
              <input
                id="budget"
                type="number"
                min={10}
                max={480}
                step={5}
                value={draft.durationMin}
                onChange={(e) => update({ durationMin: Number(e.target.value) || 45 })}
                className="min-h-11 w-20 rounded-xl border border-line bg-surface px-2 text-center"
              />
              min
            </label>
          </div>
          <div className="mb-1 flex justify-between text-sm">
            <span className={cn('font-medium', over ? 'text-accent' : 'text-muted')}>
              {t('used', { used, total: draft.durationMin })}
            </span>
            {over && <Badge tone="accent">{t('overBudget', { min: used - draft.durationMin })}</Badge>}
          </div>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            {draft.items.map((it) => {
              const ing = ingredients.find((i) => i.id === it.ingredientId);
              return (
                <div
                  key={it.id}
                  title={it.title}
                  className={cn('h-full border-r border-surface', ing ? CAT_TONE[ing.category].split(' ')[0] : 'bg-surface-2')}
                  style={{ width: `${(it.minutes / Math.max(used, draft.durationMin)) * 100}%` }}
                />
              );
            })}
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const ing = ingredients.find((i) => i.id === e.dataTransfer.getData('text/ingredient'));
              if (ing) add(ing);
            }}
            className={cn('min-h-32 rounded-2xl border-2 border-dashed p-2 transition', dragOver ? 'border-primary bg-primary-soft/40' : 'border-transparent')}
          >
            {draft.items.length === 0 ? (
              <EmptyState title={t('emptySteps')} text={t('emptyStepsText')} />
            ) : (
              <Reorder.Group axis="y" values={draft.items} onReorder={(items) => update({ items })} className="space-y-2">
                {draft.items.map((it, i) => {
                  const start = starts[i] ?? 0;
                  return (
                    <Step
                      key={it.id}
                      item={it}
                      index={i}
                      start={start}
                      onChange={(n) => update((d) => ({ ...d, items: d.items.map((x) => (x.id === n.id ? n : x)) }))}
                      onRemove={() => update((d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))}
                    />
                  );
                })}
              </Reorder.Group>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            icon={<Plus className="size-4" />}
            onClick={() => update((d) => ({ ...d, items: [...d.items, { id: uid(), ingredientId: 'custom', title: t('customStep'), minutes: 10, note: '' }] }))}
          >
            {t('addCustom')}
          </Button>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<FileDown className="size-4" />}
            onClick={async () => {
              await flush();
              await recipePdf(draft);
              toast({ text: t('common:pdfReady'), tone: 'ok' });
            }}
          >
            {t('exportPdf')}
          </Button>
          <Button
            variant="secondary"
            icon={<Copy className="size-4" />}
            onClick={async () => {
              const copy = { ...draft, id: uid(), title: `${draft.title} (${t('copy')})`, items: draft.items.map((i) => ({ ...i, id: uid() })) };
              await save('recipe', copy);
              nav(`/recipes/${copy.id}`);
            }}
          >
            {t('duplicate')}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            className="text-danger"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              if (!(await confirm({ title: t('deleteConfirm'), danger: true, confirm: t('common:delete') }))) return;
              const undo = await remove('recipe', draft.id);
              nav('/recipes');
              toast({ text: t('common:deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
            }}
          >
            {t('common:delete')}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="p-3 sm:p-4">
          <h2 className="text-lg font-semibold">{t('ingredients')}</h2>
          <p className="mb-3 text-sm text-muted">{t('ingredientsHint')}</p>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <TextInput aria-label={t('searchIngredients')} placeholder={t('searchIngredients')} className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Chips
            className="mb-3"
            value={cat}
            onChange={(v) => v[0] && setCat(v[0])}
            options={[{ value: 'all' as const, label: t('all') }, ...cats.map((c) => ({ value: c, label: t(`cat.${c}`) }))]}
          />
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {shown.map((ing) => (
              <li key={ing.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/ingredient', ing.id)}
                  onClick={() => add(ing)}
                  className="group w-full rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/50 hover:shadow-sm"
                  aria-label={t('addIngredient', { name: ing.title })}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.7rem] font-semibold', CAT_TONE[ing.category])}>{t(`cat.${ing.category}`)}</span>
                    <span className="text-xs text-muted">{ing.minutes} min</span>
                    <Plus className="ml-auto size-4 text-primary opacity-60 group-hover:opacity-100" aria-hidden />
                  </div>
                  <div className="mt-1 font-medium">{ing.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted">{ing.description}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function RecipeEditor() {
  const { t } = useTranslation('recipes');
  const { id = '' } = useParams();
  const recipe = useStore(() => get('recipe', id));
  return (
    <Page wide>
      <PageHeader back="/recipes" eyebrow={t('eyebrow')} title={recipe?.title || t('untitled')} />
      {recipe ? <Editor key={recipe.id} recipe={recipe} /> : <EmptyState title={t('notFound')} />}
    </Page>
  );
}
