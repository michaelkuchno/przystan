import { useTranslation } from 'react-i18next';
import { CloudUpload } from 'lucide-react';
import { Sheet } from '@/components/ui/overlay';
import { Button } from '@/components/ui/core';
import { Notice } from '@/components/ui/notice';

/** Shows EXACTLY the text that would leave the device; "Send" issues a one-time consent. */
export function CloudPreview({ text, count, onDecide }: { text: string; count: number; onDecide: (ok: boolean) => void }) {
  const { t } = useTranslation('ai');
  return (
    <Sheet
      open
      wide
      onOpenChange={(o) => !o && onDecide(false)}
      title={t('preview.title')}
      description={t('preview.lead')}
      footer={
        <>
          <Button variant="secondary" onClick={() => onDecide(false)}>
            {t('cancel')}
          </Button>
          <Button icon={<CloudUpload className="size-4" aria-hidden />} onClick={() => onDecide(true)}>
            {t('preview.send')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm font-medium">{t('preview.replaced', { count })}</p>
        <pre
          data-testid="cloud-preview"
          className="max-h-[45dvh] overflow-auto rounded-2xl border border-line bg-surface-2 p-3 text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]"
        >
          {text}
        </pre>
        <Notice tone="warn">{t('preview.check')}</Notice>
        <p className="text-xs text-muted">{t('preview.consent')}</p>
      </div>
    </Sheet>
  );
}
