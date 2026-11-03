/** Dashboard banner: remind about a backup when the last one is older than 7 days. */
export const BACKUP_REMINDER_DAYS = 7;
const DAY = 86_400_000;

export interface BackupReminderInput {
  mode: 'practice' | 'demo';
  lastBackupAt?: string;
  snoozedUntil?: string;
  /** Number of records in the practice space – nothing to back up yet → no banner. */
  records: number;
  now: number;
}

export type BackupReminder = { show: false } | { show: true; days: number | null };

export function backupReminder(i: BackupReminderInput): BackupReminder {
  // demo data is fictional and re-creatable
  if (i.mode !== 'practice' || i.records === 0) return { show: false };
  if (i.snoozedUntil && Date.parse(i.snoozedUntil) > i.now) return { show: false };
  if (!i.lastBackupAt) return { show: true, days: null };
  const last = Date.parse(i.lastBackupAt);
  if (!Number.isFinite(last)) return { show: true, days: null };
  const days = Math.floor((i.now - last) / DAY);
  return days > BACKUP_REMINDER_DAYS ? { show: true, days } : { show: false };
}

/** "Remind me tomorrow". */
export function snoozeUntil(now: number): string {
  return new Date(now + DAY).toISOString();
}
