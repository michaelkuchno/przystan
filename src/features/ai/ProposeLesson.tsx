import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { SelectField, TextField } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { usePrefs } from '@/lib/prefs';
import { PROMPTS } from '@/lib/ai/prompts';
import { lessonPlanSchema, validateLessonPlan, type LessonPlan } from '@/lib/ai/tasks';
import type { PreventionLevel } from '@/domain/types';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';
import { PracticeCheck } from './PracticeCheck';

/** "Propose a session plan" in the session builder – steps are added only after the user accepts. */
export function ProposeLesson({
  goal,
  audience,
  minutes,
  onApply,
}: {
  goal: string;
  audience: string;
  minutes: number;
  onApply: (plan: LessonPlan) => void;
}) {
  const { t } = useTranslation(['ai', 'prevention']);
  const { lang, ai } = usePrefs();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ goal, audience, minutes: String(minutes), level: 'universal' as PreventionLevel });
  const task = useAiTask<LessonPlan>();
  if (ai.mode === 'off') return null;

  const run = () =>
    void task.run({
      sensitivity: 'study',
      texts: [form.goal, form.audience],
      build: ([g, a]) => ({
        system: PROMPTS.lessonPlan(lang),
        prompt: `Goal: ${g}\nGroup / age: ${a}\nDuration: ${form.minutes} min\nPrevention level: ${form.level}`,
        schema: lessonPlanSchema,
        validate: validateLessonPlan,
        maxTokens: 2500,
      }),
    });
  const plan = task.state.result;
  const total = plan?.steps.reduce((s, x) => s + x.minutes, 0) ?? 0;

  return (
    <>
      <Button
        size="sm"
        variant="soft"
        icon={<Sparkles className="size-4" aria-hidden />}
        onClick={() => {
          setForm({ goal, audience, minutes: String(minutes), level: form.level });
          setOpen(true);
        }}
      >
        {t('recipe.propose')}
      </Button>
      <Sheet
        open={open}
        wide
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={t('recipe.title')}
        footer={
          plan ? (
            <Button
              onClick={() => {
                onApply(plan);
                setOpen(false);
                task.reset();
              }}
            >
              {t('recipe.apply')}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          <TextField label={t('recipe.goal')} value={form.goal} onChange={(v) => setForm({ ...form, goal: v })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label={t('recipe.age')} value={form.audience} onChange={(v) => setForm({ ...form, audience: v })} />
            <TextField
              label={t('recipe.duration')}
              type="number"
              inputMode="numeric"
              value={form.minutes}
              onChange={(v) => setForm({ ...form, minutes: v })}
            />
            <SelectField
              label={t('recipe.level')}
              value={form.level}
              onChange={(v) => setForm({ ...form, level: v })}
              options={(['universal', 'selective', 'indicated'] as const).map((l) => ({
                value: l,
                label: t(`recipe.levels.${l}`),
              }))}
            />
          </div>
          <Button
            icon={<Sparkles className="size-4" aria-hidden />}
            disabled={!form.goal.trim() || task.state.status === 'working'}
            onClick={run}
          >
            {t('recipe.run')}
          </Button>
          <AiOutput state={task.state} onRetry={run}>
            {plan && (
              <div className="space-y-3" data-testid="lesson-plan">
                {plan.title && <h3 className="font-semibold">{plan.title}</h3>}
                <ol className="space-y-2">
                  {plan.steps.map((s, i) => (
                    <li key={i} className="rounded-xl border border-line p-3 text-sm">
                      <div className="flex justify-between gap-2 font-medium">
                        <span>
                          {i + 1}. {s.title}
                        </span>
                        <span className="tabular-nums text-muted">{s.minutes} min</span>
                      </div>
                      <p className="mt-1 text-muted">{s.description}</p>
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-muted">{t('recipe.total', { min: total })}</p>
                <PracticeCheck text={plan.steps.map((s) => `${s.title} ${s.description}`).join('\n')} />
              </div>
            )}
          </AiOutput>
        </div>
      </Sheet>
      {task.previewEl}
    </>
  );
}
