import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Sheet } from '@/components/ui/overlay';
import { usePrefs } from '@/lib/prefs';
import { PROMPTS } from '@/lib/ai/prompts';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';

/** "Explain more simply" / "Give an example" for app content (knowledge cards, flashcards). */
export function ExplainButtons({ title, text }: { title: string; text: string }) {
  const { t } = useTranslation('ai');
  const { lang, ai } = usePrefs();
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState<'simpler' | 'example'>('simpler');
  const [out, setOut] = useState('');
  const task = useAiTask<string>();
  if (ai.mode === 'off') return null;

  const go = (h: 'simpler' | 'example') => {
    setHow(h);
    setOut('');
    setOpen(true);
    void task
      .run({
        sensitivity: 'content',
        texts: [],
        build: () => ({ system: PROMPTS.explain(lang, h), prompt: `${title}\n\n${text}`.slice(0, 6000), maxTokens: 900 }),
        onText: setOut,
      })
      .then((r) => r && setOut(r));
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="soft" icon={<Sparkles className="size-4" aria-hidden />} onClick={() => go('simpler')}>
          {t('explain.simpler')}
        </Button>
        <Button size="sm" variant="soft" icon={<Lightbulb className="size-4" aria-hidden />} onClick={() => go('example')}>
          {t('explain.example')}
        </Button>
      </div>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={t(`explain.${how}`)}
        description={title}
      >
        <AiOutput state={task.state} onRetry={() => go(how)}>
          {out && (
            <p className="leading-relaxed whitespace-pre-line" data-testid="ai-explain">
              {out}
            </p>
          )}
        </AiOutput>
      </Sheet>
    </>
  );
}
