import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { useContent } from '@/content/ContentProvider';
import { cn } from '@/components/ui/cn';
import type { ToolProps } from '../registry';

const KEYS = ['hungry', 'angry', 'lonely', 'tired'] as const;
const LETTER = { hungry: 'H', angry: 'A', lonely: 'L', tired: 'T' };

export default function Halt({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const items = useContent('tools').halt.items;
  const [v, setV] = useState<Record<(typeof KEYS)[number], number>>({ hungry: 0, angry: 0, lonely: 0, tired: 0 });
  const total = Object.values(v).reduce((a, b) => a + b, 0);
  useEffect(() => onResult({ score: Math.round((total / 12) * 10), payload: v }), [v, total, onResult]);
  return (
    <div className="space-y-3">
      {KEYS.map((k) => (
        <div key={k} className="rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft font-serif text-2xl font-bold text-accent-soft-fg"
              aria-hidden
            >
              {LETTER[k]}
            </span>
            <div className="flex-1">
              <div className="font-semibold">{t(`halt.${k}`)}</div>
              <div className="text-sm text-muted">{items[k].question[aud]}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label={t(`halt.${k}`)}>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={v[k] === n}
                onClick={() => setV({ ...v, [k]: n })}
                className={cn(
                  'min-h-11 rounded-xl text-sm font-medium transition',
                  v[k] === n ? 'bg-primary text-primary-fg' : 'bg-surface-2',
                )}
              >
                {t(`halt.level${n}`)}
              </button>
            ))}
          </div>
          {v[k] >= 2 && (
            <ul className="mt-3 space-y-1 rounded-xl bg-primary-soft/60 p-3 text-sm">
              {items[k].ideas.map((idea) => (
                <li key={idea} className="flex gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {idea}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
