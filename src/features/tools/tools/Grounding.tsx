import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Hand, Ear, Flower2, Coffee, Check } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { TextInput } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { haptic } from '@/lib/platform';
import type { ToolProps } from '../registry';

const ICONS: Record<string, typeof Eye> = { see: Eye, touch: Hand, hear: Ear, smell: Flower2, taste: Coffee };

export default function Grounding({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const steps = useContent('tools').grounding.steps;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[][]>(() => steps.map((s) => Array.from({ length: s.count }, () => '')));
  const done = i >= steps.length;
  useEffect(() => {
    if (done) onResult({ payload: { answers } });
  }, [done, answers, onResult]);

  if (done)
    return (
      <div className="py-10 text-center">
        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          className="mx-auto flex size-20 items-center justify-center rounded-full bg-ok-soft text-ok"
        >
          <Check className="size-10" aria-hidden />
        </motion.div>
        <p className="mt-4 font-serif text-xl">{t('grounding.done')}</p>
        <Button className="mt-4" variant="ghost" onClick={() => setI(0)}>
          {t('again')}
        </Button>
      </div>
    );
  const s = steps[i]!;
  const Icon = ICONS[s.sense] ?? Eye;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={i}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft font-serif text-3xl font-bold text-primary">
            {s.count}
          </span>
          <Icon className="size-8 text-primary" aria-hidden />
        </div>
        <p className="font-serif text-xl">{s.prompt[aud]}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {answers[i]!.map((a, j) => (
            <TextInput
              key={j}
              aria-label={`${j + 1}`}
              placeholder={`${j + 1}.`}
              value={a}
              onChange={(e) =>
                setAnswers(answers.map((row, r) => (r === i ? row.map((x, c) => (c === j ? e.target.value : x)) : row)))
              }
            />
          ))}
        </div>
        <Button
          size="lg"
          onClick={() => {
            setI(i + 1);
            void haptic('light');
          }}
        >
          {t('next')}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
