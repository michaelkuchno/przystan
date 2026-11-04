import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Languages, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Chips, SelectField } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { LANGS, usePrefs, type Lang } from '@/lib/prefs';
import { LANG_META } from '@/lib/langs';
import { exportFile, todayIso } from '@/lib/platform';
import { PROMPTS } from '@/lib/ai/prompts';
import type { Sensitivity } from '@/lib/ai/types';
import { useAiTask } from './useAiTask';
import { AiOutput } from './AiOutput';
import { knownNames } from './names';

type How = 'plain' | 'youth' | 'translate';

/**
 * Client material in plain language, for teenagers or translated. The source is built from a
 * template without identifying data (no support persons / contacts); the rest is pseudonymised
 * when it goes to the cloud.
 */
export function MaterialButton({
  source,
  title,
  sensitivity = 'client',
}: {
  source: string;
  title: string;
  sensitivity?: Sensitivity;
}) {
  const { t } = useTranslation('ai');
  const { lang, ai } = usePrefs();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState<How>('plain');
  const [target, setTarget] = useState<Lang>(lang === 'pl' ? 'de' : 'pl');
  const [out, setOut] = useState('');
  const task = useAiTask<string>();
  if (ai.mode === 'off') return null;

  const to = how === 'translate' ? target : lang;
  const run = () => {
    setOut('');
    void task
      .run({
        sensitivity,
        texts: [source],
        names: knownNames(),
        build: ([s]) => ({ system: PROMPTS.material(how, to), prompt: s!, maxTokens: 2500 }),
        onText: setOut,
      })
      .then((r) => r && setOut(r));
  };

  return (
    <>
      <Button size="sm" variant="soft" icon={<Languages className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
        {t('material.button')}
      </Button>
      <Sheet
        open={open}
        wide
        onOpenChange={(o) => {
          if (!o) task.cancel();
          setOpen(o);
        }}
        title={title}
        description={t('material.lead')}
        footer={
          out && task.state.status === 'done' ? (
            <>
              <Button
                variant="secondary"
                icon={<Copy className="size-4" aria-hidden />}
                onClick={() => void navigator.clipboard?.writeText(out).then(() => toast({ text: t('copied'), tone: 'ok' }))}
              >
                {t('copy')}
              </Button>
              <Button
                icon={<Share2 className="size-4" aria-hidden />}
                onClick={() =>
                  void exportFile(
                    `material-${how}-${to}-${todayIso()}.txt`,
                    new Blob([out], { type: 'text/plain;charset=utf-8' }),
                    title,
                  )
                }
              >
                {t('material.share')}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <Chips
            label={t('organize.format')}
            value={how}
            onChange={(v) => v[0] && setHow(v[0])}
            options={(['plain', 'youth', 'translate'] as How[]).map((h) => ({ value: h, label: t(`material.${h}`) }))}
          />
          {how === 'translate' && (
            <SelectField
              label={t('material.to')}
              value={target}
              onChange={setTarget}
              options={LANGS.filter((l) => l !== lang).map((l) => ({ value: l, label: LANG_META[l].name }))}
            />
          )}
          <Button disabled={task.state.status === 'working'} onClick={run}>
            {t('material.run')}
          </Button>
          <AiOutput state={task.state} onRetry={run}>
            {out && (
              <div className="rounded-2xl border border-line p-3 leading-relaxed whitespace-pre-line" data-testid="material-out">
                {out}
              </div>
            )}
          </AiOutput>
        </div>
      </Sheet>
      {task.previewEl}
    </>
  );
}
