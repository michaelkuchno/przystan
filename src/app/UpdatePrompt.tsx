import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/core';
import { isNative } from '@/lib/platform';

/** Shows a small banner when a new version of the PWA is ready. */
function PwaUpdate() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  if (!needRefresh) return null;
  return (
    <div className="fixed inset-x-0 top-[calc(var(--inset-top)+0.5rem)] z-[70] flex justify-center px-4" role="status">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-xl">
        <span className="flex-1 text-sm">{t('update.ready')}</span>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          {t('update.later')}
        </Button>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          {t('update.reload')}
        </Button>
      </div>
    </div>
  );
}

export function UpdatePrompt() {
  // In the Android app the web assets are bundled; no service worker needed.
  if (isNative() || !('serviceWorker' in navigator)) return null;
  return <PwaUpdate />;
}
