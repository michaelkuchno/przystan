import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DatabaseBackup, Users } from 'lucide-react';
import { Button, ButtonLink, Card, SectionTitle } from '@/components/ui/core';
import { useStore, all } from '@/lib/store';
import { usePrefs, setPrefs } from '@/lib/prefs';
import { backupReminder, snoozeUntil } from '@/lib/backupReminder';
import { fmtDate } from '@/lib/format';
import { todayIso } from '@/lib/platform';
import { cn } from '@/components/ui/cn';
import { openSupervisionTasks } from '@/features/notes/notes';

/** Banner when the last backup is older than 7 days (practice mode only). */
export function BackupBanner() {
  const { t } = useTranslation('dashboard');
  const prefs = usePrefs();
  // time of opening the dashboard (render must stay pure)
  const [now] = useState(() => Date.now());
  const records = useStore(
    () => all('client').length + all('meeting').length + all('note').length + all('practice').length + all('prevention').length,
  );
  const r = backupReminder({
    mode: prefs.mode,
    lastBackupAt: prefs.lastBackupAt,
    snoozedUntil: prefs.backupReminderSnoozedUntil,
    records,
    now,
  });
  if (!r.show) return null;
  return (
    <div
      role="status"
      className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-fg"
    >
      <DatabaseBackup className="size-6 shrink-0 text-warn" aria-hidden />
      <div className="min-w-0 flex-1 basis-56">
        <div className="font-semibold">{t('backup.title')}</div>
        <div className="text-sm">{r.days === null ? t('backup.never') : t('backup.days', { count: r.days })}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => void setPrefs({ backupReminderSnoozedUntil: snoozeUntil(Date.now()) })}>
          {t('backup.later')}
        </Button>
        <ButtonLink to="/settings?section=backup" size="sm">
          {t('backup.now')}
        </ButtonLink>
      </div>
    </div>
  );
}

/** Open tasks from supervision / consultation notes (hidden in presentation mode). */
export function SupervisionTasks() {
  const { t } = useTranslation('dashboard');
  const { presentation } = usePrefs();
  const notes = useStore(() => all('note'));
  const open = openSupervisionTasks(notes);
  if (presentation || open.length === 0) return null;
  const today = todayIso();
  return (
    <>
      <SectionTitle
        action={
          <Link to="/notes" className="text-sm font-medium text-primary">
            {t('seeAll')}
          </Link>
        }
      >
        <span className="inline-flex items-center gap-2">
          <Users className="size-5 text-blue" aria-hidden />
          {t('supervisionTasks')}
        </span>
      </SectionTitle>
      <Card className="p-2 sm:p-2">
        <ul className="divide-y divide-line">
          {open.slice(0, 6).map(({ note, task }) => (
            <li key={`${note.id}-${task.id}`}>
              <Link to={`/notes/${note.id}`} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 hover:bg-surface-2">
                <span className="min-w-0 flex-1 basis-40 font-medium">{task.title}</span>
                {task.due && (
                  <span className={cn('text-sm', task.due < today ? 'font-semibold text-danger' : 'text-muted')}>{fmtDate(task.due)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
