import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Chips } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { usePrefs } from '@/lib/prefs';
import { PROMPTS } from '@/lib/ai/prompts';
import { organizeSchema, validateOrganize } from '@/lib/ai/tasks';
import { NOTE_FIELDS, type NoteType } from '@/domain/types';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';
import { knownNames } from './names';

/**
 * "Organise": raw (dictated) notes → progress note / DAP / observation card. Client-linked, so it
 * runs locally (or in the cloud only pseudonymised with preview + consent). Only a proposal.
 */
export function OrganizeButton({
  source,
  initial = 'progress',
  onApplyFields,
  onAppendText,
}: {
  source: string;
  initial?: NoteType;
  onApplyFields?: (type: NoteType, fields: Record<string, string>) => void;
  onAppendText?: (text: string) => void;
}) {
  const { t } = useTranslation(['ai', 'meetings']);
  const { lang, ai } = usePrefs();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<NoteType>(initial);
  const task = useAiTask<Record<string, string>>();
  if (ai.mode === 'off') return null;

  const label = (f: string) => t(`meetings:notes.${type}.${f}`);
  const run = () => {
    const fields = NOTE_FIELDS[type];
    void task.run({
      sensitivity: 'client',
      texts: [source],
      names: knownNames(),
      build: ([s]) => ({
        system: PROMPTS.organize(
          lang,
          fields.map((f) => `${f} (${label(f)})`),
        ),
        prompt: s!,
        schema: organizeSchema(fields),
        validate: (v) => validateOrganize(v, fields),
        maxTokens: 2000,
      }),
    });
  };
  const result = task.state.result;
  const asText = () =>
    NOTE_FIELDS[type]
      .filter((f) => result?.[f])
      .map((f) => `${label(f)}:\n${result![f]}`)
      .join('\n\n');

  return (
    <>
      <Button size="sm" variant="secondary" icon={<Wand2 className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
        {t('organize.button')}
      </Button>
      <Sheet
        open={open}
        wide
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={t('organize.title')}
        description={t('organize.lead')}
        footer={
          result ? (
            <>
              <Button variant="secondary" onClick={() => task.reset()}>
                {t('discard')}
              </Button>
              {onAppendText && (
                <Button
                  variant={onApplyFields ? 'secondary' : 'primary'}
                  onClick={() => {
                    onAppendText(asText());
                    setOpen(false);
                    task.reset();
                  }}
                >
                  {t('organize.applyText')}
                </Button>
              )}
              {onApplyFields && (
                <Button
                  onClick={() => {
                    onApplyFields(type, result);
                    setOpen(false);
                    task.reset();
                  }}
                >
                  {t('organize.applyFields')}
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <Chips
            label={t('organize.format')}
            value={type}
            onChange={(v) => v[0] && setType(v[0])}
            options={(['progress', 'dap', 'observation'] as NoteType[]).map((n) => ({
              value: n,
              label: t(`meetings:notes.${n}.name`),
            }))}
          />
          {!source.trim() ? (
            <p className="text-sm text-muted">{t('organize.empty')}</p>
          ) : (
            <Button icon={<Wand2 className="size-4" aria-hidden />} disabled={task.state.status === 'working'} onClick={run}>
              {t('organize.run')}
            </Button>
          )}
          <AiOutput state={task.state} onRetry={run}>
            {result && (
              <dl className="space-y-3" data-testid="organized">
                {NOTE_FIELDS[type]
                  .filter((f) => result[f])
                  .map((f) => (
                    <div key={f}>
                      <dt className="text-sm font-semibold">{label(f)}</dt>
                      <dd className="text-sm leading-relaxed whitespace-pre-line">{result[f]}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </AiOutput>
        </div>
      </Sheet>
      {task.previewEl}
    </>
  );
}
