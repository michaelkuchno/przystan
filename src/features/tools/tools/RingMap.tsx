import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { TextInput } from '@/components/ui/form';
import { IconButton } from '@/components/ui/core';
import { useContent } from '@/content/ContentProvider';
import { haptic } from '@/lib/platform';
import type { ToolProps } from '../registry';

interface Item {
  text: string;
  ring: 0 | 1 | 2;
}

/** Concentric map: tap an item to move it closer/further from the centre. */
function RingMap({
  kind,
  suggestions,
  onResult,
}: {
  kind: 'trigger' | 'support';
  suggestions: string[];
  onResult: ToolProps['onResult'];
}) {
  const { t } = useTranslation('tools');
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');
  useEffect(() => onResult({ score: items.length, payload: { items } }), [items, onResult]);

  const add = (text: string) => {
    if (!text.trim() || items.some((i) => i.text === text)) return;
    setItems([...items, { text: text.trim(), ring: 1 }]);
    setDraft('');
    void haptic('light');
  };
  const rings =
    kind === 'trigger'
      ? [t('rings.triggerStrong'), t('rings.triggerMid'), t('rings.triggerWeak')]
      : [t('rings.supportClose'), t('rings.supportMid'), t('rings.supportFar')];
  const colors =
    kind === 'trigger' ? ['var(--accent)', 'var(--chart-4)', 'var(--muted)'] : ['var(--primary)', 'var(--blue)', 'var(--muted)'];

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-md">
        {[2, 1, 0].map((r) => (
          <div
            key={r}
            className="absolute rounded-full border-2 border-dashed"
            style={{
              inset: `${r === 2 ? 0 : r === 1 ? 17 : 34}%`,
              borderColor: colors[r],
              background: `color-mix(in oklab, ${colors[r]} ${r === 0 ? 14 : 6}%, transparent)`,
            }}
            aria-hidden
          />
        ))}
        <div className="absolute inset-[44%] flex items-center justify-center rounded-full bg-surface text-center text-xs font-semibold shadow">
          {t('rings.me')}
        </div>
        {items.map((it, i) => {
          const sameRing = items.filter((x) => x.ring === it.ring);
          const idx = sameRing.indexOf(it);
          const angle = (idx / Math.max(1, sameRing.length)) * Math.PI * 2 - Math.PI / 2 + it.ring * 0.4;
          const radius = [24, 38, 48][it.ring]!;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;
          return (
            <motion.button
              key={it.text}
              type="button"
              layout
              onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, ring: ((x.ring + 1) % 3) as Item['ring'] } : x)))}
              className="absolute max-w-[34%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full border bg-surface px-2.5 py-1.5 text-xs font-medium shadow-sm"
              style={{ left: `${x}%`, top: `${y}%`, borderColor: colors[it.ring] }}
              aria-label={`${it.text}: ${rings[it.ring]}. ${t('rings.tapToMove')}`}
            >
              {it.text}
            </motion.button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {rings.map((r, i) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full" style={{ background: colors[i] }} aria-hidden /> {r}
          </span>
        ))}
      </div>
      <p className="text-center text-xs text-muted">{t('rings.help')}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
      >
        <TextInput
          aria-label={t(kind === 'trigger' ? 'rings.addTrigger' : 'rings.addSupport')}
          placeholder={t(kind === 'trigger' ? 'rings.addTrigger' : 'rings.addSupport')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <IconButton label={t('common:add')} variant="soft" type="submit">
          <Plus className="size-5" />
        </IconButton>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {suggestions
          .filter((s) => !items.some((i) => i.text === s))
          .slice(0, 14)
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="min-h-9 rounded-full border border-dashed border-line px-3 text-xs text-muted hover:border-primary"
            >
              + {s}
            </button>
          ))}
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <li key={it.text} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-0.5 pl-3 text-xs">
              {it.text}
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center"
                aria-label={t('common:remove', { item: it.text })}
                onClick={() => setItems(items.filter((x) => x !== it))}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TriggerMap({ onResult }: ToolProps) {
  return <RingMap kind="trigger" suggestions={useContent('tools').triggerSuggestions} onResult={onResult} />;
}

export function SupportMap({ onResult }: ToolProps) {
  return <RingMap kind="support" suggestions={useContent('tools').supportSuggestions} onResult={onResult} />;
}
