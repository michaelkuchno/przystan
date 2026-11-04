import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { useToast } from '@/components/ui/toast';
import { usePrefs } from '@/lib/prefs';
import { getTranscriber } from '@/lib/ai';
import type { Sensitivity } from '@/lib/ai/types';
import type { Recording } from '@/lib/ai/audio';

/**
 * Dictation into a text field. Hidden when AI is off. Client-linked text: local Whisper only.
 * Audio is kept in memory and discarded after recognition.
 */
export function DictateButton({
  sensitivity,
  onText,
  label,
}: {
  sensitivity: Sensitivity;
  onText: (text: string) => void;
  label?: string;
}) {
  const { t } = useTranslation('ai');
  const { ai, lang } = usePrefs();
  const toast = useToast();
  const [phase, setPhase] = useState<'idle' | 'rec' | 'busy'>('idle');
  const rec = useRef<Recording | null>(null);

  useEffect(() => () => rec.current?.cancel(), []);
  if (ai.mode === 'off') return null;

  const stop = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setPhase('busy');
    try {
      const pcm = await r.stop();
      const tr = await getTranscriber(sensitivity);
      if (!tr) throw new Error('unavailable');
      const text = await tr.transcribe(pcm, lang);
      if (text) onText(text);
    } catch (e) {
      toast({ text: String(e).includes('unavailable') ? t('dictate.unavailable') : t('errors.server'), tone: 'warn' });
    } finally {
      setPhase('idle');
    }
  };

  const start = async () => {
    if (!(await getTranscriber(sensitivity).catch(() => null))) {
      toast({ text: t('dictate.unavailable'), tone: 'warn' });
      return;
    }
    try {
      const { startRecording } = await import('@/lib/ai/audio');
      rec.current = await startRecording(() => void stop());
      setPhase('rec');
    } catch {
      toast({ text: t('dictate.denied'), tone: 'warn' });
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={phase === 'rec' ? 'accent' : 'secondary'}
        icon={
          phase === 'busy' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : phase === 'rec' ? (
            <Square className="size-4" aria-hidden />
          ) : (
            <Mic className="size-4" aria-hidden />
          )
        }
        disabled={phase === 'busy'}
        aria-pressed={phase === 'rec'}
        onClick={() => void (phase === 'rec' ? stop() : start())}
      >
        {phase === 'rec' ? t('dictate.stop') : phase === 'busy' ? t('dictate.working') : (label ?? t('dictate.start'))}
      </Button>
      {phase === 'rec' && (
        <span className="text-xs text-muted" role="status">
          {t('dictate.recording')}
        </span>
      )}
    </span>
  );
}
