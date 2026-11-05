import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellRing, Settings2 } from 'lucide-react';
import { Card } from '@/components/ui/core';
import { storeVersion, useStore } from '@/lib/store';
import { locale } from '@/lib/format';
import { currentDue } from '@/lib/notify/engine';
import { digestItems } from '@/lib/notify/due';
import { itemLine } from '@/lib/notify/text';
import { cn } from '@/components/ui/cn';

/** Dashboard: today's reminders (shown when notifications are on). In the app codes are shown – it is unlocked. */
export default function TodayCard() {
  const { t } = useTranslation('notify');
  useStore(storeVersion);
  const [now] = useState(() => Date.now());
  const items = digestItems(currentDue(now), now);
  return (
    <Card className="mt-4 space-y-2" data-testid="today-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-sans text-base font-semibold">
          <BellRing className="size-4 text-primary" aria-hidden /> {t('today')}
        </h2>
        <Link
          to="/settings/notify"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg"
          aria-label={t('settingsLink')}
        >
          <Settings2 className="size-4" aria-hidden />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t('todayEmpty')}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                to={it.to}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm hover:bg-surface-2',
                  it.level === 2 && 'font-medium text-accent',
                )}
              >
                <span aria-hidden>•</span> {itemLine(t, it, 'codes', locale())}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
