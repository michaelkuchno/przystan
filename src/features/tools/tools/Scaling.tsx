import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { TextField } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { cn } from '@/components/ui/cn';
import type { ToolProps } from '../registry';

export default function Scaling({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const s = useContent('tools').scaling;
  const [score, setScore] = useState(4);
  const [miracle, setMiracle] = useState('');
  const [plusOne, setPlusOne] = useState('');
  const [already, setAlready] = useState('');
  useEffect(() => onResult({ score, payload: { miracle, plusOne, already } }), [score, miracle, plusOne, already, onResult]);
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-3xl bg-gradient-to-br from-blue-soft to-primary-soft p-5"
      >
        <Sparkles className="mb-2 size-6 text-blue" aria-hidden />
        <p className="font-serif text-lg leading-relaxed">{s.miracle[aud]}</p>
      </motion.div>
      <TextField multiline rows={3} label={t('scaling.miracleAnswer')} value={miracle} onChange={setMiracle} />
      <div>
        <div className="mb-2 text-sm font-medium" id="scale-l">
          {t('scaling.where')}
        </div>
        <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-labelledby="scale-l">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              onClick={() => setScore(n)}
              className={cn(
                'aspect-square min-h-11 rounded-xl text-sm font-semibold transition',
                n <= score ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted',
                n === score && 'ring-4 ring-primary/30',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{t('scaling.zero')}</span>
          <span>{t('scaling.ten')}</span>
        </div>
      </div>
      <TextField multiline rows={2} label={t('scaling.already', { n: score })} value={already} onChange={setAlready} />
      <TextField
        multiline
        rows={2}
        label={t('scaling.plusOne', { n: Math.min(10, score + 1) })}
        value={plusOne}
        onChange={setPlusOne}
      />
      <ul className="space-y-1.5 rounded-2xl bg-surface-2/60 p-4 text-sm">
        {s.followUps.map((f, i) => (
          <li key={i}>• {f[aud]}</li>
        ))}
      </ul>
    </div>
  );
}
