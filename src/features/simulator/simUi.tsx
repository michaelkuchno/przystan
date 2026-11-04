import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import type { ScenarioNode } from '@/content/types';
import type { SimStats } from './sim';

export const MOOD_EMOJI: Record<ScenarioNode['mood'], string> = {
  calm: '🙂',
  guarded: '😐',
  angry: '😠',
  sad: '😔',
  hopeful: '😌',
};

export function Bar({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'primary' | 'blue';
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="tabular-nums">{Math.round(value)}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-surface-3"
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={cn('h-full rounded-full', tone === 'primary' ? 'bg-primary' : 'bg-blue')}
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, good }: { label: string; value: React.ReactNode; hint: string; good: boolean }) {
  return (
    <div className={cn('rounded-2xl p-3', good ? 'bg-ok-soft' : 'bg-surface-2')}>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-serif text-2xl font-semibold">{value}</div>
      <div className="text-[length:calc(0.7rem*var(--fs-body))] text-muted">{hint}</div>
    </div>
  );
}

export function StatsGrid({ stats }: { stats: SimStats }) {
  const { t } = useTranslation('simulator');
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label={t('stats.rq')} value={stats.rq ?? '–'} hint={t('stats.rqHint')} good={stats.rq !== null && stats.rq >= 1} />
      <Stat
        label={t('stats.open')}
        value={stats.pctOpen !== null ? `${stats.pctOpen}%` : '–'}
        hint={t('stats.openHint')}
        good={stats.pctOpen !== null && stats.pctOpen >= 50}
      />
      <Stat
        label={t('stats.complex')}
        value={stats.pctComplex !== null ? `${stats.pctComplex}%` : '–'}
        hint={t('stats.complexHint')}
        good={stats.pctComplex !== null && stats.pctComplex >= 40}
      />
      <Stat
        label={t('stats.inconsistent')}
        value={stats.miInconsistent}
        hint={t('stats.inconsistentHint')}
        good={stats.miInconsistent === 0}
      />
    </div>
  );
}
