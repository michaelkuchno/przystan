import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, FileDown, Lightbulb, Plus, Trash2, Check, ChefHat, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Button, Card, EmptyState, IconButton, Badge } from '@/components/ui/core';
import { ListEditor, TextField, TextInput } from '@/components/ui/form';
import { useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { SaveStatus } from '@/components/SaveStatus';
import { PrePostChart } from '@/components/LazyCharts';
import { all, get, remove, save, uid, useStore } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { useContent } from '@/content/ContentProvider';
import { preventionPdf } from '@/lib/reports';
import { recipeFromTemplate } from '@/features/recipes/RecipesList';
import { cn } from '@/components/ui/cn';
import type { PreventionProgram } from '@/domain/types';

const STEPS = ['needs', 'target', 'factors', 'goals', 'strategies', 'schedule', 'evaluation'] as const;
type StepId = (typeof STEPS)[number];
const EVIDENCE_TONE = { strong: 'ok', moderate: 'primary', limited: 'warn', harmful: 'danger' } as const;

function Wizard({ program }: { program: PreventionProgram }) {
  const { t } = useTranslation('prevention');
  const c = useContent('prevention');
  const templates = useContent('templates');
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const recipes = useStore(() => all('recipe'));
  const { draft, update, status, flush } = useEditable('prevention', program);
  const [step, setStep] = useState<StepId>('needs');
  const idx = STEPS.indexOf(step);

  const body: Record<StepId, React.ReactNode> = {
    needs: (
      <div className="space-y-4">
        <TextField label={t('name')} value={draft.title} onChange={(v) => update({ title: v })} />
        <TextField label={t('setting')} hint={t('settingHint')} value={draft.setting} onChange={(v) => update({ setting: v })} />
        <TextField multiline rows={4} label={t('needs')} value={draft.needs} onChange={(v) => update({ needs: v })} />
        <TextField multiline rows={3} label={t('resources')} value={draft.resources} onChange={(v) => update({ resources: v })} />
      </div>
    ),
    target: (
      <div className="space-y-4">
        <TextField
          multiline
          rows={2}
          label={t('targetGroup')}
          value={draft.targetGroup}
          onChange={(v) => update({ targetGroup: v })}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('level')}</legend>
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup">
            {c.levels.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={draft.level === l.id}
                onClick={() => update({ level: l.id })}
                className={cn(
                  'rounded-2xl border-2 p-4 text-left transition',
                  draft.level === l.id ? 'border-primary bg-primary-soft/50' : 'border-line bg-surface',
                )}
              >
                <div className="flex items-center justify-between font-semibold">
                  {l.title}
                  {draft.level === l.id && <Check className="size-5 text-primary" aria-hidden />}
                </div>
                <p className="mt-1 text-sm text-muted">{l.description}</p>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    ),
    factors: (
      <div className="grid gap-4 md:grid-cols-2">
        <ListEditor
          label={t('risk')}
          items={draft.riskFactors}
          onChange={(v) => update({ riskFactors: v })}
          suggestions={c.riskFactors.map((f) => f.text)}
        />
        <ListEditor
          label={t('protective')}
          items={draft.protectiveFactors}
          onChange={(v) => update({ protectiveFactors: v })}
          suggestions={c.protectiveFactors.map((f) => f.text)}
        />
      </div>
    ),
    goals: (
      <div className="space-y-4">
        <TextField
          multiline
          rows={2}
          label={t('generalGoal')}
          value={draft.generalGoal}
          onChange={(v) => update({ generalGoal: v })}
        />
        <ListEditor
          label={t('specificGoals')}
          hint={t('specificGoalsHint')}
          items={draft.specificGoals}
          onChange={(v) => update({ specificGoals: v })}
        />
      </div>
    ),
    strategies: (
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {c.strategies.map((s) => {
            const on = draft.strategies.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  update({ strategies: on ? draft.strategies.filter((x) => x !== s.id) : [...draft.strategies, s.id] })
                }
                className={cn(
                  'rounded-2xl border-2 p-3 text-left transition',
                  on ? 'border-primary bg-primary-soft/50' : 'border-line bg-surface',
                  s.evidence === 'harmful' && 'opacity-80',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{s.title}</span>
                  <Badge tone={EVIDENCE_TONE[s.evidence]}>{t(`evidence.${s.evidence}`)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{s.description}</p>
              </button>
            );
          })}
        </div>
        {draft.strategies.some((s) => c.strategies.find((x) => x.id === s)?.evidence === 'harmful') && (
          <Notice tone="accent">{t('harmfulWarning')}</Notice>
        )}
        <div>
          <h3 className="mb-2 font-semibold">{t('scenarios')}</h3>
          <p className="mb-2 text-sm text-muted">{t('scenariosHint')}</p>
          <div className="flex flex-wrap gap-2">
            {recipes.map((r) => {
              const on = draft.recipeIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update({ recipeIds: on ? draft.recipeIds.filter((x) => x !== r.id) : [...draft.recipeIds, r.id] })
                  }
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm',
                    on ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface',
                  )}
                >
                  <ChefHat className="size-4" aria-hidden /> {r.title || t('untitled')}
                </button>
              );
            })}
            <Button
              variant="soft"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={async () => {
                await flush();
                const r = recipeFromTemplate(
                  templates.sessionTemplates.find((x) => x.id === 'classPrevention'),
                  templates.ingredients,
                );
                await save('recipe', r);
                await save('prevention', { ...draft, recipeIds: [...draft.recipeIds, r.id] });
                nav(`/recipes/${r.id}`);
              }}
            >
              {t('newScenario')}
            </Button>
          </div>
        </div>
      </div>
    ),
    schedule: (
      <div className="space-y-4">
        {draft.schedule.map((s) => (
          <div key={s.id} className="flex items-end gap-2">
            <div className="w-40">
              <label className="mb-1 block text-xs text-muted" htmlFor={`sd-${s.id}`}>
                {t('common:date')}
              </label>
              <TextInput
                id={`sd-${s.id}`}
                type="date"
                value={s.date}
                onChange={(e) =>
                  update({ schedule: draft.schedule.map((x) => (x.id === s.id ? { ...x, date: e.target.value } : x)) })
                }
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted" htmlFor={`sa-${s.id}`}>
                {t('activity')}
              </label>
              <TextInput
                id={`sa-${s.id}`}
                value={s.activity}
                onChange={(e) =>
                  update({ schedule: draft.schedule.map((x) => (x.id === s.id ? { ...x, activity: e.target.value } : x)) })
                }
              />
            </div>
            <IconButton
              label={t('common:delete')}
              onClick={() => update({ schedule: draft.schedule.filter((x) => x.id !== s.id) })}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ))}
        <Button
          variant="soft"
          icon={<Plus className="size-4" />}
          onClick={() => update({ schedule: [...draft.schedule, { id: uid(), date: '', activity: '' }] })}
        >
          {t('addActivity')}
        </Button>
        <TextField
          multiline
          rows={3}
          label={t('budget')}
          value={draft.budgetResources}
          onChange={(v) => update({ budgetResources: v })}
        />
      </div>
    ),
    evaluation: (
      <div className="space-y-5">
        <p className="text-sm text-muted">{t('evaluationIntro')}</p>
        {draft.indicators.map((i) => (
          <div key={i.id} className="grid items-end gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor={`il-${i.id}`}>
                {t('indicator')}
              </label>
              <TextInput
                id={`il-${i.id}`}
                value={i.label}
                onChange={(e) =>
                  update({ indicators: draft.indicators.map((x) => (x.id === i.id ? { ...x, label: e.target.value } : x)) })
                }
              />
            </div>
            {(['pre', 'post'] as const).map((k) => (
              <div key={k}>
                <label className="mb-1 block text-xs text-muted" htmlFor={`i${k}-${i.id}`}>
                  {t(k)} (1–5)
                </label>
                <TextInput
                  id={`i${k}-${i.id}`}
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={i[k] ?? ''}
                  onChange={(e) =>
                    update({
                      indicators: draft.indicators.map((x) =>
                        x.id === i.id ? { ...x, [k]: e.target.value === '' ? undefined : Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <IconButton
              label={t('common:delete')}
              onClick={() => update({ indicators: draft.indicators.filter((x) => x.id !== i.id) })}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="soft"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => update({ indicators: [...draft.indicators, { id: uid(), label: '' }] })}
          >
            {t('addIndicator')}
          </Button>
          {c.indicatorExamples
            .filter((e) => !draft.indicators.some((i) => i.label === e))
            .slice(0, 4)
            .map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => update({ indicators: [...draft.indicators, { id: uid(), label: e }] })}
                className="min-h-9 rounded-full border border-dashed border-line px-3 text-xs text-muted hover:border-primary"
              >
                + {e}
              </button>
            ))}
        </div>
        {draft.indicators.some((i) => i.pre !== undefined || i.post !== undefined) && (
          <Card>
            <PrePostChart
              data={draft.indicators.map((i) => ({ label: i.label, pre: i.pre, post: i.post }))}
              labels={{ pre: t('pre'), post: t('post') }}
            />
          </Card>
        )}
        <div>
          <h3 className="mb-2 font-semibold">{t('checklistTitle')}</h3>
          <p className="mb-3 text-sm text-muted">{t('checklistHint')}</p>
          <ul className="space-y-2">
            {c.goodPractice.map((g) => (
              <li key={g.id}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 accent-[var(--primary)]"
                    checked={!!draft.checklist[g.id]}
                    onChange={(e) => update({ checklist: { ...draft.checklist, [g.id]: e.target.checked } })}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {g.kind === 'do' ? (
                        <ThumbsUp className="size-4 text-ok" aria-hidden />
                      ) : (
                        <ThumbsDown className="size-4 text-accent" aria-hidden />
                      )}
                      {g.kind === 'do' ? g.text : t('avoided', { text: g.text })}
                    </span>
                    <span className="block text-sm text-muted">{g.rationale}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t('stepsNav')} className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => setStep(s)}
                aria-current={step === s ? 'step' : undefined}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm whitespace-nowrap transition',
                  step === s ? 'bg-fg text-bg' : 'hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    step === s ? 'bg-bg text-fg' : i < idx ? 'bg-primary text-primary-fg' : 'bg-surface-3',
                  )}
                >
                  {i < idx ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                {t(`steps.${s}`)}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 hidden space-y-2 lg:block">
          <Button
            className="w-full"
            icon={<FileDown className="size-4" />}
            onClick={async () => {
              await flush();
              await preventionPdf(get('prevention', draft.id) ?? draft, c);
              toast({ text: t('common:pdfReady'), tone: 'ok' });
            }}
          >
            {t('exportPdf')}
          </Button>
          <SaveStatus status={status} />
        </div>
      </nav>
      <div className="min-w-0">
        <Card className="min-h-96">
          <div className="mb-1 text-xs font-semibold tracking-wider text-accent uppercase">
            {t('stepN', { n: idx + 1, total: STEPS.length })}
          </div>
          <h2 className="text-2xl font-semibold">{t(`steps.${step}`)}</h2>
          <div className="mt-3 mb-5 flex gap-2 rounded-2xl bg-blue-soft p-3 text-sm">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
            <span>{c.wizardHints[step]}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {body[step]}
            </motion.div>
          </AnimatePresence>
        </Card>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={idx === 0}
            icon={<ArrowLeft className="size-4" />}
            onClick={() => setStep(STEPS[idx - 1]!)}
          >
            {t('common:back')}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            className="text-danger"
            aria-label={t('common:delete')}
            onClick={async () => {
              if (!(await confirm({ title: t('deleteConfirm'), danger: true, confirm: t('common:delete') }))) return;
              const undo = await remove('prevention', draft.id);
              nav('/prevention');
              toast({ text: t('common:deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
            }}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="secondary"
            className="lg:hidden"
            icon={<FileDown className="size-4" />}
            onClick={async () => {
              await flush();
              await preventionPdf(draft, c);
              toast({ text: t('common:pdfReady'), tone: 'ok' });
            }}
          >
            PDF
          </Button>
          {idx < STEPS.length - 1 ? (
            <Button icon={<ArrowRight className="size-4" />} onClick={() => setStep(STEPS[idx + 1]!)}>
              {t('common:next')}
            </Button>
          ) : (
            <Button
              icon={<FileDown className="size-4" />}
              onClick={async () => {
                await flush();
                await preventionPdf(draft, c);
                toast({ text: t('common:pdfReady'), tone: 'ok' });
              }}
            >
              {t('finishPdf')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PreventionWizard() {
  const { t } = useTranslation('prevention');
  const { id = '' } = useParams();
  const program = useStore(() => get('prevention', id));
  return (
    <Page wide>
      <PageHeader back="/prevention" eyebrow={t('wizard')} title={program?.title || t('untitled')} />
      {program ? <Wizard key={program.id} program={program} /> : <EmptyState title={t('notFound')} />}
    </Page>
  );
}
