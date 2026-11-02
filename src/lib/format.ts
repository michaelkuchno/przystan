import i18n from '@/i18n';

const locale = () => (i18n.language === 'en' ? 'en-GB' : 'pl-PL');

/** Parses "YYYY-MM-DD" as local date (not UTC) and full ISO timestamps as-is. */
export function parseDate(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
}

export function fmtDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  return parseDate(iso).toLocaleDateString(locale(), opts);
}

export function fmtTime(iso: string) {
  return parseDate(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(iso: string) {
  return `${fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(iso)}`;
}

export function fmtWeekday(iso: string) {
  return fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "YYYY-MM-DDTHH:mm" for <input type=datetime-local>. */
export function toLocalInput(iso: string): string {
  const d = parseDate(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function nowLocalIso(): string {
  return toLocalInput(new Date().toISOString()) + ':00';
}
