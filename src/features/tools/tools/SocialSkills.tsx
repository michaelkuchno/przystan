import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Theater, Users, ListOrdered, Lightbulb, ArrowLeft } from 'lucide-react';
import { Button, Badge } from '@/components/ui/core';
import { Chips, Slider } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import type { ToolProps } from '../registry';

export default function SocialSkills({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const cards = useContent('tools').socialSkills;
  const [skill, setSkill] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const card = cards.find((c) => c.id === open);
  useEffect(() => {
    if (card) onResult({ score: rating, payload: { card: card.id, skill: card.skill } });
  }, [card, rating, onResult]);

  const skills = Array.from(new Set(cards.map((c) => c.skill)));
  const shown = cards.filter((c) => (skill === 'all' || c.skill === skill) && (c.audience === 'both' || c.audience === aud));

  if (card)
    return (
      <motion.div initial={{ opacity: 0, rotateY: -8 }} animate={{ opacity: 1, rotateY: 0 }} className="space-y-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => setOpen(null)}>
          {t('skills.back')}
        </Button>
        <div className="rounded-3xl border-2 border-accent/30 bg-accent-soft/40 p-5">
          <Badge tone="accent">{t(`skills.type.${card.skill}`)}</Badge>
          <h3 className="mt-2 text-2xl font-semibold">{card.title}</h3>
          <p className="mt-2 leading-relaxed">{card.situation}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-2/60 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold">
              <Users className="size-4" aria-hidden />
              {t('skills.roles')}
            </h4>
            <ul className="space-y-1 text-sm">
              {card.roles.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-surface-2/60 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold">
              <ListOrdered className="size-4" aria-hidden />
              {t('skills.steps')}
            </h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {card.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="rounded-2xl bg-primary-soft/60 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4" aria-hidden />
            {t('skills.tips')}
          </h4>
          <ul className="space-y-1 text-sm">
            {card.tips.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <Slider
          label={t('skills.rating')}
          value={rating}
          onChange={setRating}
          minLabel={t('skills.hard')}
          maxLabel={t('skills.easy')}
        />
      </motion.div>
    );

  return (
    <div className="space-y-4">
      <Chips
        value={skill}
        onChange={(v) => v[0] && setSkill(v[0])}
        options={[{ value: 'all', label: t('all') }, ...skills.map((s) => ({ value: s, label: t(`skills.type.${s}`) }))]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setOpen(c.id)}
            className="rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/50"
          >
            <Theater className="size-5 text-accent" aria-hidden />
            <div className="mt-1 font-semibold">{c.title}</div>
            <div className="mt-1 line-clamp-2 text-sm text-muted">{c.situation}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
