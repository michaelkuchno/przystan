import type { TFunction } from 'i18next';
import type { AuditEntry } from '@/lib/audit';
import { locale } from '@/lib/format';

export type AuditFilter = 'all' | 'changes' | 'deletions' | 'sessions' | 'exports';
export const AUDIT_FILTERS: AuditFilter[] = ['all', 'changes', 'deletions', 'sessions', 'exports'];

export function matchesFilter(e: AuditEntry, f: AuditFilter): boolean {
  if (f === 'all') return true;
  if (f === 'changes')
    return ['record.create', 'record.update', 'record.revert', 'record.import', 'record.restore'].includes(e.action);
  if (f === 'deletions') return e.action === 'record.delete' || e.action === 'record.purge';
  if (f === 'sessions')
    return (
      e.action.startsWith('session.') ||
      e.action.startsWith('biometric.') ||
      e.action === 'password.change' ||
      e.action === 'vault.setup'
    );
  return (
    e.action.endsWith('.export') || e.action === 'backup.restore' || e.action === 'ai.cloudSend' || e.action === 'message.send'
  );
}

/** Local date and time with seconds-free precision, e.g. "3 lis 2026, 14:05". */
export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Readable parts of an audit entry. */
export function describeEntry(t: TFunction, e: AuditEntry): { action: string; object: string; detail: string } {
  const [group, name] = e.action.split('.');
  const action = t(`audit:actions.${group}.${name}`, { defaultValue: e.action });
  const d = (e.details ?? {}) as Record<string, unknown>;
  const label = typeof d.label === 'string' && d.label ? ` „${d.label}”` : '';
  const object = e.kind ? `${t(`audit:kinds.${e.kind}`)}${label}` : '';
  const parts: string[] = [];
  if (e.redacted) parts.push(t('audit:log.redacted'));
  if (typeof d.method === 'string') parts.push(t(`audit:detail.method.${d.method}`, { defaultValue: d.method }));
  if (e.action === 'session.unlockFailed' && typeof d.count === 'number')
    parts.push(t('audit:detail.failed', { count: d.count, date: typeof d.last === 'number' ? fmtDateTime(d.last) : '' }));
  if (typeof d.related === 'number' && d.related > 0) parts.push(t('audit:detail.related', { count: d.related }));
  if (typeof d.versionAt === 'number') parts.push(t('audit:detail.versionFrom', { date: fmtDateTime(d.versionAt) }));
  if (typeof d.file === 'string') parts.push(t('audit:detail.file', { file: d.file }));
  if (e.action === 'backup.restore' && typeof d.createdAt === 'string')
    parts.push(t('audit:detail.backupFrom', { date: fmtDateTime(Date.parse(d.createdAt)), records: d.records }));
  if (typeof d.setting === 'string') parts.push(`${d.setting}: ${String(d.value)}`);
  if (e.action === 'message.send') parts.push(t('audit:detail.messageSend', { channel: d.channel, via: d.via }));
  if (e.action === 'ai.cloudSend')
    parts.push(t('audit:detail.cloudSend', { chars: d.chars, replaced: d.replaced, task: d.task }));
  if (typeof d.result === 'string') parts.push(t('audit:detail.integrity', { result: d.result }));
  return { action, object, detail: parts.join(' · ') };
}
