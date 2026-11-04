import { useTranslation } from 'react-i18next';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { usePrefs } from '@/lib/prefs';
import { checkPractice } from '@/lib/ai/goodPractice';

/** Good-practice check of a prevention plan / session (shown with the AI assistant enabled). */
export function PracticeCheck({ text, force }: { text: string; force?: boolean }) {
  const { t } = useTranslation('ai');
  const { ai } = usePrefs();
  if (ai.mode === 'off' && !force) return null;
  const warnings = checkPractice(text);
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3 text-sm" data-testid="practice-check">
      <div className="mb-1 font-semibold">{t('practice.title')}</div>
      {warnings.length === 0 ? (
        <p className="flex items-center gap-2 text-ok">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {t('practice.ok')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <span>{t(`practice.${w}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
