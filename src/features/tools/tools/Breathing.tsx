import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Chips } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { haptic } from '@/lib/platform';
import type { ToolProps } from '../registry';

type Phase = 'inhale' | 'hold' | 'exhale' | 'holdAfter';

export default function Breathing({ onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const patterns = useContent('tools').breathing.patterns;
  const reduce = useReducedMotion();
  const [pid, setPid] = useState(patterns[0]?.id ?? '');
  const p = patterns.find((x) => x.id === pid) ?? patterns[0]!;
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [left, setLeft] = useState(p.inhale);
  const [cycles, setCycles] = useState(0);
  const phaseRef = useRef<Phase>('inhale');

  useEffect(() => onResult({ score: cycles, payload: { pattern: p.id, cycles } }), [cycles, p.id, onResult]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setLeft((l) => {
        if (l > 1) return l - 1;
        const order: Phase[] = ['inhale', 'hold', 'exhale', 'holdAfter'];
        let idx = order.indexOf(phaseRef.current);
        let next: Phase;
        let dur = 0;
        do {
          idx = (idx + 1) % 4;
          next = order[idx]!;
          dur = p[next];
          if (next === 'inhale') setCycles((c) => c + 1);
        } while (dur === 0);
        phaseRef.current = next;
        setPhase(next);
        void haptic('light');
        return dur;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, p]);

  const scale = phase === 'inhale' || phase === 'hold' ? 1 : 0.55;
  const dur = p[phase];

  return (
    <div className="space-y-6 text-center">
      <Chips
        value={pid}
        onChange={(v) => {
          if (!v[0]) return;
          setPid(v[0]);
          setRunning(false);
          setPhase('inhale');
          phaseRef.current = 'inhale';
          setLeft(patterns.find((x) => x.id === v[0])?.inhale ?? 4);
        }}
        options={patterns.map((x) => ({
          value: x.id,
          label: `${x.name} (${[x.inhale, x.hold, x.exhale, x.holdAfter].filter(Boolean).join('-')})`,
        }))}
        className="flex justify-center"
      />
      <div className="relative mx-auto flex size-64 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-blue/40"
          animate={{ scale: running ? scale : 0.7 }}
          transition={{ duration: reduce ? 0 : running ? dur : 0.4, ease: 'easeInOut' }}
          aria-hidden
        />
        <div className="relative" aria-live="polite">
          <div className="font-serif text-2xl font-semibold">{running ? t(`breath.${phase}`) : t('breath.ready')}</div>
          {running && <div className="text-4xl font-semibold tabular-nums">{left}</div>}
        </div>
      </div>
      <div className="text-sm text-muted">{t('breath.cycles', { count: cycles })}</div>
      <Button
        size="lg"
        icon={running ? <Pause className="size-5" /> : <Play className="size-5" />}
        onClick={() => setRunning(!running)}
      >
        {running ? t('pause') : t('start')}
      </Button>
    </div>
  );
}
