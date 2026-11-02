import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListEditor } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { cn } from '@/components/ui/cn';
import type { ToolProps } from '../registry';

const CELLS = ['prosStatus', 'consStatus', 'prosChange', 'consChange'] as const;
type Cell = (typeof CELLS)[number];

export default function DecisionalBalance({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const prompts = useContent('tools').decisionalBalance.prompts;
  const [v, setV] = useState<Record<Cell, string[]>>({ prosStatus: [], consStatus: [], prosChange: [], consChange: [] });
  useEffect(() => onResult({ payload: v }), [v, onResult]);
  const forChange = v.prosChange.length + v.consStatus.length;
  const forStatus = v.prosStatus.length + v.consChange.length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CELLS.map((c) => (
          <div
            key={c}
            className={cn('rounded-2xl p-4', c === 'prosChange' || c === 'consStatus' ? 'bg-primary-soft/60' : 'bg-accent-soft/50')}
          >
            <ListEditor label={t(`balance.${c}`)} hint={prompts[c][aud]} items={v[c]} onChange={(items) => setV({ ...v, [c]: items })} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line p-4" aria-live="polite">
        <div className="mb-2 text-sm font-medium">{t('balance.scale')}</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-24 text-right text-accent">{t('balance.status')} ({forStatus})</span>
          <div className="relative h-3 flex-1 rounded-full bg-surface-3">
            <div
              className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-primary shadow transition-all"
              style={{ left: `${forChange + forStatus ? (forChange / (forChange + forStatus)) * 100 : 50}%` }}
            />
          </div>
          <span className="w-24 text-primary">{t('balance.change')} ({forChange})</span>
        </div>
        <p className="mt-2 text-xs text-muted">{t('balance.note')}</p>
      </div>
    </div>
  );
}
