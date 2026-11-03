import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { HistoryButton } from '@/features/audit/HistorySheet';
import type { RecordKind } from '@/domain/types';

/**
 * Autosave indicator. With `history` it also offers the change history of the
 * record (docs/DECISIONS.md D-049).
 */
export function SaveStatus({
  status,
  history,
}: {
  status: 'idle' | 'dirty' | 'saving' | 'saved';
  history?: { kind: RecordKind; id: string };
}) {
  const { t } = useTranslation();
  const indicator =
    status === 'idle' ? null : (
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
  if (!history) return indicator;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {indicator}
      <HistoryButton kind={history.kind} id={history.id} />
    </span>
  );
}
