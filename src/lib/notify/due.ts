/**
 * What deserves a reminder – pure functions (unit tested). Sources: planned meetings, tasks
 * (incl. supervision tasks), IPR reviews, key dates, "needs attention" flags, the backup.
 * Texts are produced by the UI layer (i18n); here only facts.
 */
import type { Client, Ipr, Meeting, Note, Task } from '@/domain/types';
import type { AttentionFlag } from '@/lib/attention';
import type { NotifyPrefs, NotifyRule } from './settings';

export type DueKind = 'meeting' | 'task' | 'iprReview' | 'keyDate' | 'attention' | 'backup';

export interface DueItem {
  /** Stable id (used for scheduled notification ids and de-duplication). */
  id: string;
  kind: DueKind;
  rule: NotifyRule;
  /** When the event happens (ISO date or timestamp). */
  when: string;
  /** Pseudonymous label (client code, meeting title) – shown only with privacy "codes". */
  label: string;
  clientId?: string;
  /** In-app link. */
  to: string;
  /** 1 = info, 2 = important. */
  level: 1 | 2;
  /** Extra facts for the text (attention rule, minutes before…). */
  facts?: Record<string, string | number>;
}

export interface Reminder {
  /** Unique per item and moment. */
  id: string;
  item: DueItem;
  /** When the reminder fires (epoch ms). */
  at: number;
  /** 'lead' = N minutes before, 'eve' = evening before, 'morning' = on the day. */
  moment: 'lead' | 'eve' | 'morning';
}

export interface DueInput {
  clients: Client[];
  meetings: Meeting[];
  tasks: Task[];
  notes: Note[];
  iprs: Ipr[];
  flags: AttentionFlag[];
  lastBackupAt?: string;
  /** Epoch ms. */
  now: number;
  prefs: NotifyPrefs;
}

const DAY = 86_400_000;
const isoDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Local time "HH:MM" on a given day (YYYY-MM-DD) → epoch ms. */
export function atLocal(day: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y!, mo! - 1, d!, h ?? 8, m ?? 0, 0, 0).getTime();
}
const startOfDay = (ms: number) => atLocal(isoDay(ms), '00:00');

/** Everything that is due now or in the next `horizonDays` days. */
export function dueItems(i: DueInput, horizonDays = 14): DueItem[] {
  const { prefs, now } = i;
  const until = now + horizonDays * DAY;
  const today = isoDay(now);
  const code = new Map(i.clients.map((c) => [c.id, c.code]));
  const out: DueItem[] = [];
  const on = (r: NotifyRule) => prefs.rules[r];

  if (on('meetings'))
    for (const m of i.meetings) {
      const t = Date.parse(m.date);
      if (m.status !== 'planned' || !Number.isFinite(t) || t < startOfDay(now) || t > until) continue;
      out.push({
        id: `meeting:${m.id}`,
        kind: 'meeting',
        rule: 'meetings',
        when: m.date,
        label: [m.clientId ? code.get(m.clientId) : '', m.title].filter(Boolean).join(' · '),
        clientId: m.clientId,
        to: `/meetings/${m.id}`,
        level: 1,
      });
    }

  if (on('tasks')) {
    const tasks: { id: string; title: string; due?: string; done: boolean; clientId?: string; to: string }[] = [
      ...i.tasks.map((t) => ({ ...t, to: '/' })),
      ...i.notes.flatMap((n) =>
        (n.tasks ?? []).map((t) => ({ ...t, id: `${n.id}:${t.id}`, clientId: n.clientId, to: `/notes/${n.id}` })),
      ),
    ];
    for (const t of tasks) {
      if (t.done || !t.due) continue;
      const d = Date.parse(`${t.due.slice(0, 10)}T12:00:00`);
      if (d > until) continue;
      out.push({
        id: `task:${t.id}`,
        kind: 'task',
        rule: 'tasks',
        when: t.due.slice(0, 10),
        label: t.title,
        clientId: t.clientId,
        to: t.to,
        level: t.due.slice(0, 10) < today ? 2 : 1,
      });
    }
  }

  if (on('ipr'))
    for (const p of i.iprs) {
      if (!p.reviewDate) continue;
      const d = Date.parse(`${p.reviewDate}T12:00:00`);
      if (d > now + 7 * DAY) continue;
      out.push({
        id: `ipr:${p.id}`,
        kind: 'iprReview',
        rule: 'ipr',
        when: p.reviewDate,
        label: code.get(p.clientId) ?? '',
        clientId: p.clientId,
        to: `/clients/${p.clientId}/ipr`,
        level: p.reviewDate < today ? 2 : 1,
      });
    }

  for (const f of i.flags) {
    if (f.rule === 'iprReviewOverdue') continue; // covered above
    if (f.rule === 'keyDateSoon') {
      if (!on('keyDates')) continue;
      out.push({
        id: `key:${f.clientId}:${f.facts.date}:${f.facts.label}`,
        kind: 'keyDate',
        rule: 'keyDates',
        when: String(f.facts.date),
        label: [code.get(f.clientId), f.facts.label].filter(Boolean).join(' · '),
        clientId: f.clientId,
        to: `/clients/${f.clientId}`,
        level: f.level,
        facts: f.facts,
      });
      continue;
    }
    if (!on('attention') || f.level < 2) continue;
    out.push({
      id: `att:${f.rule}:${f.clientId}:${f.date}`,
      kind: 'attention',
      rule: 'attention',
      when: f.date,
      label: code.get(f.clientId) ?? '',
      clientId: f.clientId,
      to: `/clients/${f.clientId}`,
      level: 2,
      facts: { rule: f.rule, ...f.facts },
    });
  }

  if (on('backup')) {
    const last = i.lastBackupAt ? Date.parse(i.lastBackupAt) : 0;
    if (now - last > 7 * DAY)
      out.push({
        id: 'backup',
        kind: 'backup',
        rule: 'backup',
        when: today,
        label: '',
        to: '/settings#backup',
        level: last ? 1 : 2,
        facts: { days: last ? Math.floor((now - last) / DAY) : -1 },
      });
  }
  return out.sort((a, b) => a.when.localeCompare(b.when));
}

/** Items for today's summary: today's meetings, tasks due / overdue, reviews, key dates, attention, backup. */
export function digestItems(items: DueItem[], now: number): DueItem[] {
  const today = isoDay(now);
  const inDays = (when: string, n: number) => when.slice(0, 10) <= isoDay(now + n * DAY);
  return items.filter((it) =>
    it.kind === 'meeting'
      ? it.when.slice(0, 10) === today
      : it.kind === 'task'
        ? it.when <= today
        : it.kind === 'iprReview'
          ? inDays(it.when, 7)
          : it.kind === 'keyDate'
            ? inDays(it.when, 14)
            : true,
  );
}

/** Concrete reminder moments for scheduled (system) notifications in the future. */
export function reminders(items: DueItem[], prefs: NotifyPrefs, now: number): Reminder[] {
  const out: Reminder[] = [];
  const evening = '18:00';
  for (const it of items) {
    if (it.kind === 'meeting') {
      const t = Date.parse(it.when);
      if (prefs.meetingLeadMin > 0)
        out.push({ id: `${it.id}:lead`, item: it, at: t - prefs.meetingLeadMin * 60_000, moment: 'lead' });
      if (prefs.meetingDayBefore)
        out.push({ id: `${it.id}:eve`, item: it, at: atLocal(isoDay(t - DAY), evening), moment: 'eve' });
    } else if (it.kind === 'task' || it.kind === 'iprReview' || it.kind === 'keyDate') {
      out.push({ id: `${it.id}:morning`, item: it, at: atLocal(it.when.slice(0, 10), prefs.digestTime), moment: 'morning' });
    }
  }
  return out.filter((r) => r.at > now).sort((a, b) => a.at - b.at);
}

/** Is the daily summary due (time passed, not yet sent today)? */
export function digestDue(prefs: NotifyPrefs, now: number): boolean {
  const today = isoDay(now);
  return prefs.lastDigest !== today && now >= atLocal(today, prefs.digestTime);
}

export { isoDay };
