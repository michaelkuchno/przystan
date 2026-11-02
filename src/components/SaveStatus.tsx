import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';

export function SaveStatus({ status }: { status: 'idle' | 'dirty' | 'saving' | 'saved' }) {
  const { t } = useTranslation();
  if (status === 'idle') return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" role="status" aria-live="polite">
      {status === 'saved' ? (
        <>
          <Check className="size-3.5 text-ok" aria-hidden /> {t('autosaved')}
        </>
      ) : (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> {t('saving')}
        </>
      )}
    </span>
  );
}
