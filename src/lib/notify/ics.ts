/**
 * iCalendar (.ics, RFC 5545) with alarms – the free way to get reminders on an iPhone even when
 * the app is closed: the phone's own calendar shows them. Times in UTC ("Z"), CRLF line ends,
 * lines folded at 75 octets, stable UIDs (re-importing updates instead of duplicating).
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  /** Minutes. */
  durationMin: number;
  title: string;
  description?: string;
  location?: string;
  /** Alarms, minutes before the start. */
  alarmsMin: number[];
  /** All-day event (start date only). */
  allDay?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dateOnly = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** TEXT escaping: backslash, semicolon, comma, newline. */
export const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Folds a content line at 75 octets (UTF-8 aware), continuation lines start with a space. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Przystan//Przystan//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.durationMin * 60_000);
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@przystan`, `DTSTAMP:${utc(now)}`);
    if (e.allDay) {
      const next = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.start)}`, `DTEND;VALUE=DATE:${dateOnly(next)}`);
    } else lines.push(`DTSTART:${utc(e.start)}`, `DTEND:${utc(end)}`);
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    for (const m of [...new Set(e.alarmsMin)].filter((x) => x >= 0))
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:-PT${m}M`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
