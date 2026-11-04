import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Sheet } from '@/components/ui/overlay';
import { usePrefs } from '@/lib/prefs';
import { PROMPTS } from '@/lib/ai/prompts';
import { supervisionSchema, validateQuestions } from '@/lib/ai/tasks';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';
import { knownNames } from './names';

/** Reflective questions for supervision – client-linked: local by default, cloud only pseudonymised. */
export function SupervisionQuestions({ caseText, onInsert }: { caseText: string; onInsert: (text: string) => void }) {
  const { t } = useTranslation('ai');
  const { lang, ai } = usePrefs();
  const [open, setOpen] = useState(false);
  const task = useAiTask<string[]>();
  if (ai.mode === 'off') return null;
  const run = () =>
    void task.run({
      sensitivity: 'client',
      texts: [caseText],
      names: knownNames(),
      build: ([s]) => ({
        system: PROMPTS.supervision(lang),
        prompt: s!,
        schema: supervisionSchema,
        validate: validateQuestions,
        maxTokens: 1200,
      }),
    });
  const qs = task.state.result;
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon={<MessagesSquare className="size-4" aria-hidden />}
        onClick={() => setOpen(true)}
      >
        {t('supervision.button')}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={t('supervision.title')}
        description={t('supervision.lead')}
        footer={
          qs ? (
            <Button
              onClick={() => {
                onInsert(qs.map((q) => `– ${q}`).join('\n'));
                setOpen(false);
                task.reset();
              }}
            >
              {t('supervision.insert')}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {!caseText.trim() ? (
            <p className="text-sm text-muted">{t('organize.empty')}</p>
          ) : (
            <Button
              icon={<MessagesSquare className="size-4" aria-hidden />}
              disabled={task.state.status === 'working'}
              onClick={run}
            >
              {t('supervision.run')}
            </Button>
          )}
          <AiOutput state={task.state} onRetry={run}>
            {qs && (
              <ol className="list-decimal space-y-2 pl-5 leading-relaxed" data-testid="supervision-questions">
                {qs.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            )}
          </AiOutput>
        </div>
      </Sheet>
      {task.previewEl}
    </>
  );
}
