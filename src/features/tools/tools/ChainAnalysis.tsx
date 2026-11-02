import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowDown, Zap, Brain, Heart, Footprints, Flag } from 'lucide-react';
import { TextArea } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import type { ToolProps } from '../registry';

const LINKS = [
  { k: 'trigger', icon: Zap },
  { k: 'thoughts', icon: Brain },
  { k: 'emotions', icon: Heart },
  { k: 'behaviour', icon: Footprints },
  { k: 'consequences', icon: Flag },
] as const;
type K = (typeof LINKS)[number]['k'];

export default function ChainAnalysis({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const prompts = useContent('tools').chainAnalysis.prompts;
  const [v, setV] = useState<Record<K | 'breakPoint', string>>({ trigger: '', thoughts: '', emotions: '', behaviour: '', consequences: '', breakPoint: '' });
  useEffect(() => onResult({ payload: v }), [v, onResult]);
  return (
    <div className="space-y-1">
      {LINKS.map(({ k, icon: Icon }, i) => (
        <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <label htmlFor={`ch-${k}`} className="font-semibold">
                {t(`chain.${k}`)}
              </label>
              <p className="mb-1.5 text-sm text-muted">{prompts[k][aud]}</p>
              <TextArea id={`ch-${k}`} rows={2} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            </div>
          </div>
          {i < LINKS.length - 1 && (
            <div className="flex justify-center py-1 text-muted" aria-hidden>
              <ArrowDown className="size-5" />
            </div>
          )}
        </motion.div>
      ))}
      <div className="mt-4 rounded-2xl bg-accent-soft/60 p-4">
        <label htmlFor="ch-break" className="font-semibold">
          {t('chain.breakPoint')}
        </label>
        <p className="mb-1.5 text-sm text-muted">{t('chain.breakPointHint')}</p>
        <TextArea id="ch-break" rows={2} value={v.breakPoint} onChange={(e) => setV({ ...v, breakPoint: e.target.value })} />
      </div>
    </div>
  );
}
