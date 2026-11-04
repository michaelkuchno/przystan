import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Sheet } from '@/components/ui/overlay';
import { usePrefs } from '@/lib/prefs';
import { PROMPTS } from '@/lib/ai/prompts';
import { preventionSchema, validatePrevention, type PreventionProposal } from '@/lib/ai/tasks';
import type { PreventionProgram } from '@/domain/types';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';
import { PracticeCheck } from './PracticeCheck';

/** Proposal of goals and factors for a prevention programme – added to the plan only on "Apply". */
export function ProposePrevention({
  program,
  onApply,
}: {
  program: PreventionProgram;
  onApply: (patch: Partial<PreventionProgram>) => void;
}) {
  const { t } = useTranslation('ai');
  const { lang, ai } = usePrefs();
  const [open, setOpen] = useState(false);
  const task = useAiTask<PreventionProposal>();
  if (ai.mode === 'off') return null;

  const run = () =>
    void task.run({
      sensitivity: 'study',
      texts: [program.setting, program.needs, program.targetGroup],
      build: ([setting, needs, group]) => ({
        system: PROMPTS.prevention(lang),
        prompt: `Setting: ${setting}\nNeeds / diagnosis: ${needs}\nTarget group: ${group}\nPrevention level: ${program.level}`,
        schema: preventionSchema,
        validate: validatePrevention,
        maxTokens: 2500,
      }),
    });
  const p = task.state.result;
  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    );

  return (
    <>
      <Button size="sm" variant="soft" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
        {t('prevention.propose')}
      </Button>
      <Sheet
        open={open}
        wide
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={t('prevention.title')}
        description={t('prevention.lead')}
        footer={
          p ? (
            <Button
              onClick={() => {
                const add = (cur: string[], more: string[]) => [...cur, ...more.filter((m) => !cur.includes(m))];
                onApply({
                  generalGoal: program.generalGoal.trim() ? program.generalGoal : p.generalGoal,
                  specificGoals: add(program.specificGoals, p.specificGoals),
                  riskFactors: add(program.riskFactors, p.riskFactors),
                  protectiveFactors: add(program.protectiveFactors, p.protectiveFactors),
                });
                setOpen(false);
                task.reset();
              }}
            >
              {t('prevention.apply')}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <Button icon={<Sparkles className="size-4" aria-hidden />} disabled={task.state.status === 'working'} onClick={run}>
            {t('recipe.run')}
          </Button>
          <AiOutput state={task.state} onRetry={run}>
            {p && (
              <div className="space-y-3" data-testid="prevention-proposal">
                <div>
                  <h3 className="text-sm font-semibold">{t('prevention.goal')}</h3>
                  <p className="text-sm">{p.generalGoal}</p>
                </div>
                {list(t('prevention.specificGoals'), p.specificGoals)}
                {list(t('prevention.strategies'), p.strategies)}
                {list(t('prevention.riskFactors'), p.riskFactors)}
                {list(t('prevention.protectiveFactors'), p.protectiveFactors)}
                <PracticeCheck text={[p.generalGoal, ...p.specificGoals, ...p.strategies].join('\n')} />
              </div>
            )}
          </AiOutput>
        </div>
      </Sheet>
      {task.previewEl}
    </>
  );
}
