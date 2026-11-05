/** Calendar export of upcoming meetings, IPR reviews and key dates (.ics with alarms). */
import type { TFunction } from 'i18next';
import type { Meeting } from '@/domain/types';
import { all } from '@/lib/store';
import { getPrefs } from '@/lib/prefs';
import { exportFile, todayIso } from '@/lib/platform';
import { buildIcs, type IcsEvent } from './ics';

function meetingEvent(t: TFunction, m: Meeting, codes: boolean, code?: string): IcsEvent {
  const lead = getPrefs().notify.meetingLeadMin;
  return {
    uid: `meeting-${m.id}`,
    start: new Date(m.date),
    durationMin: m.durationMin || 60,
    title: codes ? [t('notify:ics.meeting'), code, m.title].filter(Boolean).join(' · ') : t('notify:ics.meeting'),
    description: t('notify:ics.description'),
    alarmsMin: lead > 0 ? [lead] : [30],
  };
}

export function calendarEvents(t: TFunction, now = Date.now(), onlyMeetingId?: string): IcsEvent[] {
  const codes = getPrefs().notify.privacy === 'codes';
  const code = new Map(all('client').map((c) => [c.id, c.code]));
  const today = todayIso();
  const out: IcsEvent[] = [];
  for (const m of all('meeting')) {
    if (onlyMeetingId ? m.id !== onlyMeetingId : m.status !== 'planned' || Date.parse(m.date) < now) continue;
    out.push(meetingEvent(t, m, codes, m.clientId ? code.get(m.clientId) : undefined));
  }
  if (onlyMeetingId) return out;
  for (const p of all('ipr'))
    if (p.reviewDate && p.reviewDate >= today)
      out.push({
        uid: `ipr-${p.id}`,
        start: new Date(`${p.reviewDate}T09:00:00`),
        durationMin: 0,
        allDay: true,
        title: codes ? `${t('notify:ics.ipr')} · ${code.get(p.clientId) ?? ''}` : t('notify:ics.ipr'),
        description: t('notify:ics.description'),
        alarmsMin: [24 * 60 * 3],
      });
  for (const c of all('client'))
    for (const k of c.keyDates ?? [])
      if (k.date >= today)
        out.push({
          uid: `key-${c.id}-${k.id}`,
          start: new Date(`${k.date}T09:00:00`),
          durationMin: 0,
          allDay: true,
          title: codes ? `${t('notify:ics.keyDate')} · ${c.code} · ${k.label}` : t('notify:ics.keyDate'),
          description: t('notify:ics.description'),
          alarmsMin: [24 * 60 * 7, 24 * 60],
        });
  return out;
}

/** Shares / downloads the .ics file; returns the number of events (0 = nothing exported). */
export async function exportCalendar(t: TFunction, onlyMeetingId?: string): Promise<number> {
  const events = calendarEvents(t, Date.now(), onlyMeetingId);
  if (!events.length) return 0;
  const name = onlyMeetingId ? `przystan-spotkanie-${todayIso()}.ics` : `przystan-terminy-${todayIso()}.ics`;
  await exportFile(name, new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' }), t('notify:calendar'));
  return events.length;
}
