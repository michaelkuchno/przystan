import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Slider } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { haptic } from '@/lib/platform';
import type { ToolProps } from '../registry';

function Wave({ intensity }: { intensity: number }) {
  const reduce = useReducedMotion();
  const amp = 14 + intensity * 5;
  const path = (phase: number) => {
    let d = `M0,${110}`;
    for (let x = 0; x <= 400; x += 10) d += ` L${x},${110 - Math.sin((x / 400) * Math.PI * 2 + phase) * amp}`;
    return `${d} L400,200 L0,200 Z`;
  };
  return (
    <svg viewBox="0 0 400 200" className="w-full" aria-hidden>
      <defs>
        <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--blue)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <motion.path
        fill="url(#sea)"
        initial={false}
        animate={reduce ? { d: path(0) } : { d: [path(0), path(Math.PI), path(Math.PI * 2)] }}
        transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      <motion.path
        fill="var(--primary)"
        fillOpacity={0.2}
        initial={false}
        animate={reduce ? { d: path(1) } : { d: [path(1), path(1 + Math.PI), path(1 + Math.PI * 2)] }}
        transition={reduce ? undefined : { duration: 9, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

export default function UrgeSurfing({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const steps = useContent('tools').urgeSurfing.steps;
  const [phase, setPhase] = useState<'before' | 'surf' | 'after'>('before');
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (phase !== 'surf') return;
    const iv = setInterval(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 12000);
    return () => clearInterval(iv);
  }, [phase, steps.length]);

  useEffect(() => {
    if (phase === 'after') onResult({ scoreBefore: before, score: after });
  }, [phase, before, after, onResult]);

  return (
    <div className="space-y-5">
      {phase === 'before' && (
        <>
          <Slider
            label={t('urge.before')}
            value={before}
            onChange={setBefore}
            minLabel={t('urge.none')}
            maxLabel={t('urge.max')}
          />
          <Button
            size="lg"
            icon={<ArrowRight className="size-5" />}
            onClick={() => {
              setPhase('surf');
              setAfter(before);
              void haptic('light');
            }}
          >
            {t('urge.start')}
          </Button>
        </>
      )}
      {phase === 'surf' && (
        <>
          <Wave intensity={Math.max(0, before - step)} />
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-20 text-center font-serif text-xl leading-relaxed"
            aria-live="polite"
          >
            {steps[step]?.[aud]}
          </motion.p>
          <div className="flex justify-center gap-1.5" aria-label={t('stepOf', { n: step + 1, total: steps.length })} role="img">
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-primary' : 'bg-line'}`} />
            ))}
          </div>
          <div className="flex justify-center gap-2">
            {step < steps.length - 1 ? (
              <Button variant="soft" onClick={() => setStep(step + 1)}>
                {t('next')}
              </Button>
            ) : null}
            <Button onClick={() => setPhase('after')}>{t('urge.finish')}</Button>
          </div>
        </>
      )}
      {phase === 'after' && (
        <>
          <Slider label={t('urge.after')} value={after} onChange={setAfter} minLabel={t('urge.none')} maxLabel={t('urge.max')} />
          <div className="rounded-2xl bg-primary-soft p-4 text-center">
            <div className="text-sm text-primary-soft-fg">{t('urge.change')}</div>
            <div className="font-serif text-4xl font-semibold text-primary">
              {before} → {after}
            </div>
            <p className="mt-1 text-sm">{after < before ? t('urge.wentDown') : t('urge.stayed')}</p>
          </div>
          <Button
            variant="ghost"
            icon={<RotateCcw className="size-4" />}
            onClick={() => {
              setPhase('before');
              setStep(0);
            }}
          >
            {t('again')}
          </Button>
        </>
      )}
    </div>
  );
}
