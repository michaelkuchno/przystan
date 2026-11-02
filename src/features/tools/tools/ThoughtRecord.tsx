import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, Slider } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { cn } from '@/components/ui/cn';
import type { ToolProps } from '../registry';

export default function ThoughtRecord({ onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const distortions = useContent('tools').distortions;
  const [v, setV] = useState({ situation: '', thought: '', emotion: '', before: 7, distortions: [] as string[], evidenceFor: '', evidenceAgainst: '', alternative: '', after: 7 });
  useEffect(() => onResult({ scoreBefore: v.before, score: v.after, payload: v }), [v, onResult]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <TextField multiline rows={2} label={t('thought.situation')} value={v.situation} onChange={(x) => setV({ ...v, situation: x })} />
      <TextField multiline rows={2} label={t('thought.thought')} value={v.thought} onChange={(x) => setV({ ...v, thought: x })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('thought.emotion')} value={v.emotion} onChange={(x) => setV({ ...v, emotion: x })} />
        <Slider label={t('thought.intensityBefore')} value={v.before} onChange={(x) => setV({ ...v, before: x })} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('thought.distortions')}</legend>
        <div className="flex flex-wrap gap-2">
          {distortions.map((d) => {
            const on = v.distortions.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => setV({ ...v, distortions: on ? v.distortions.filter((x) => x !== d.id) : [...v.distortions, d.id] })}
                onFocus={() => setOpen(d.id)}
                onMouseEnter={() => setOpen(d.id)}
                className={cn('min-h-11 rounded-full border px-3.5 text-sm transition', on ? 'border-accent bg-accent text-white dark:text-black' : 'border-line bg-surface')}
              >
                {d.name}
              </button>
            );
          })}
        </div>
        {open && (
          <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm" aria-live="polite">
            <strong>{distortions.find((d) => d.id === open)?.name}:</strong> {distortions.find((d) => d.id === open)?.description}
            <div className="mt-1 text-muted italic">„{distortions.find((d) => d.id === open)?.example}”</div>
          </div>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField multiline rows={2} label={t('thought.evidenceFor')} value={v.evidenceFor} onChange={(x) => setV({ ...v, evidenceFor: x })} />
        <TextField multiline rows={2} label={t('thought.evidenceAgainst')} value={v.evidenceAgainst} onChange={(x) => setV({ ...v, evidenceAgainst: x })} />
      </div>
      <TextField multiline rows={2} label={t('thought.alternative')} value={v.alternative} onChange={(x) => setV({ ...v, alternative: x })} />
      <Slider label={t('thought.intensityAfter')} value={v.after} onChange={(x) => setV({ ...v, after: x })} />
    </div>
  );
}
