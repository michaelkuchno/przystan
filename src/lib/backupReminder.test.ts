import { describe, expect, it } from 'vitest';
import { backupReminder, snoozeUntil } from './backupReminder';

const NOW = Date.parse('2026-11-03T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const base = { mode: 'practice' as const, records: 5, now: NOW };

describe('backup reminder', () => {
  it('shows when there has never been a backup', () => {
    expect(backupReminder(base)).toEqual({ show: true, days: null });
  });

  it('shows only when the last backup is older than 7 days', () => {
    expect(backupReminder({ ...base, lastBackupAt: daysAgo(7) })).toEqual({ show: false });
    expect(backupReminder({ ...base, lastBackupAt: daysAgo(8) })).toEqual({ show: true, days: 8 });
  });

  it('is hidden in demo mode and with no data', () => {
    expect(backupReminder({ ...base, mode: 'demo' })).toEqual({ show: false });
    expect(backupReminder({ ...base, records: 0 })).toEqual({ show: false });
  });

  it('can be snoozed until tomorrow', () => {
    const until = snoozeUntil(NOW);
    expect(backupReminder({ ...base, snoozedUntil: until, now: NOW + 3_600_000 })).toEqual({ show: false });
    expect(backupReminder({ ...base, snoozedUntil: until, now: NOW + 25 * 3_600_000 }).show).toBe(true);
  });
});
