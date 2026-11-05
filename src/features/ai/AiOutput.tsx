import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Phone, Sparkles } from 'lucide-react';
import { Badge, Button } from '@/components/ui/core';
import { Notice } from '@/components/ui/notice';
import { crisisFor, useContent } from '@/content/ContentProvider';
import { usePrefs } from '@/lib/prefs';
import type { AiError } from '@/lib/ai/types';
import type { AiState } from './useAiTask';

/** "Auxiliary – verify" marker shown on every AI answer. */
export function AiBadge({ where }: { where?: AiState<unknown>['where'] }) {
  const { t } = useTranslation('ai');
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <Badge tone="warn">
        <Sparkles className="mr-1 inline size-3" aria-hidden />
        {t('badge')}
      </Badge>
      {where && <span>{t('generated', { where: t(`where.${where}`) })}</span>}
    </div>
  );
}

/** Crisis numbers of the country of work (shown when a text mentions danger to life or violence). */
export function CrisisBox() {
  const { t } = useTranslation('ai');
  const content = useContent();
  const { country } = usePrefs();
  return (
    <Notice tone="accent" icon={<AlertTriangle aria-hidden />}>
      <div role="alert">
        <strong>{t('crisis.title')}</strong> {t('crisis.text')}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {crisisFor(content, country)
          .slice(0, 3)
          .map((c) => (
            <a
              key={c.id}
              href={`tel:${c.number.replace(/\s/g, '')}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-3 font-semibold text-white dark:text-black"
            >
              <Phone className="size-4" aria-hidden /> {c.number} · {c.name}
            </a>
          ))}
        <Link to="/crisis" className="inline-flex min-h-11 items-center px-2 text-sm font-medium underline">
          {t('crisis.all')}
        </Link>
      </div>
    </Notice>
  );
}

export function AiErrorView({ error, onRetry }: { error: AiError; onRetry?: () => void }) {
  const { t } = useTranslation('ai');
  const msg =
    error.code === 'unavailable' && ['off', 'presentation', 'clientLocalOnly', 'noLocalLlm'].includes(error.message)
      ? t(`route.${error.message}`)
      : error.code === 'rateLimit' && error.retryAfterS && error.retryAfterS > 60
        ? error.retryAfterS > 2 * 3600
          ? t('errors.rateLimitDaily', { h: Math.ceil(error.retryAfterS / 3600) })
          : t('errors.rateLimitWait', { min: Math.ceil(error.retryAfterS / 60) })
        : t(`errors.${error.code}`);
  const toSettings = ['noKey', 'badKey'].includes(error.code) || error.code === 'unavailable';
  return (
    <Notice tone="warn">
      <p role="alert">{msg}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {onRetry && ['rateLimit', 'network', 'timeout', 'format', 'busy', 'server'].includes(error.code) && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {t('retry')}
          </Button>
        )}
        {toSettings && (
          <Link to="/settings/ai" className="inline-flex min-h-11 items-center text-sm font-medium underline">
            {t('enable')}
          </Link>
        )}
      </div>
    </Notice>
  );
}

/** Wrapper for a finished / failed AI answer. */
export function AiOutput<T>({ state, onRetry, children }: { state: AiState<T>; onRetry?: () => void; children?: ReactNode }) {
  const { t } = useTranslation('ai');
  if (state.status === 'idle') return state.crisis ? <CrisisBox /> : null;
  return (
    <div className="space-y-3" aria-live="polite">
      {state.crisis && <CrisisBox />}
      {state.status === 'working' && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <Sparkles className="size-4 animate-pulse" aria-hidden /> {t('working')}
        </p>
      )}
      {state.status === 'error' && state.error && <AiErrorView error={state.error} onRetry={onRetry} />}
      {(state.status === 'done' || (state.status === 'working' && children)) && (
        <>
          {state.status === 'done' && <AiBadge where={state.where} />}
          {children}
        </>
      )}
    </div>
  );
}
