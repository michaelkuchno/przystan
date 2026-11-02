import type { ReactNode } from 'react';
import { Info, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';
import { setPrefs, getPrefs, usePrefs } from '@/lib/prefs';
import type { ReviewStatus } from '@/content/types';

/** Subtle, clickable marker for content review status (spec 5.10). */
export function ReviewBadge({ id, status }: { id: string; status: ReviewStatus }) {
  const { t } = useTranslation();
  const { review } = usePrefs();
  const effective = review[id] ?? status;
  const verified = effective === 'zweryfikowane';
  const toggle = () => setPrefs({ review: { ...getPrefs().review, [id]: verified ? 'do_weryfikacji' : 'zweryfikowane' } });
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition',
        verified ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn',
      )}
      aria-pressed={verified}
      title={t('review.toggle')}
    >
      {verified ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldQuestion className="size-3.5" aria-hidden />}
      {verified ? t('review.verified') : t('review.toVerify')}
    </button>
  );
}

export function Notice({
  children,
  tone = 'info',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: 'info' | 'warn' | 'accent';
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-blue-soft text-fg border-blue/20',
    warn: 'bg-warn-soft text-fg border-warn/25',
    accent: 'bg-accent-soft text-fg border-accent/20',
  };
  return (
    <div className={cn('flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed', tones[tone], className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-5">{icon ?? <Info aria-hidden />}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** "Supportive, not diagnostic" disclaimer used across screening and attention UI. */
export function SupportiveNote({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <p className="flex items-start gap-2 text-xs text-muted">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {text ?? t('supportive')}
    </p>
  );
}
