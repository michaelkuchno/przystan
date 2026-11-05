import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { Client, Ipr, Meeting, Note, Task } from '@/domain/types';
import type { AttentionFlag } from '@/lib/attention';
import { atLocal, digestDue, digestItems, dueItems, reminders, isoDay } from './due';
import { defaultNotifyPrefs } from './settings';
import { buildIcs, escapeText, fold } from './ics';
import { mailtoUrl, smsUrl, smsSegments, normPhone, looksLikeEmail } from './links';
import { renderTemplate } from './templates';
import { sendEmailJs, EMAILJS_ENDPOINT } from './emailjs';
import { buildDigest, reminderText } from './text';
import { notifId } from './system';
import { validateMessage } from '@/lib/ai/tasks';
import { COMMS_GUIDE, COMMS_PROMPTS } from '@/lib/ai/commsPrompts';

const NOW = new Date(2026, 10, 5, 8, 0, 0).getTime(); // 5 Nov 2026, 08:00 local
const prefs = { ...defaultNotifyPrefs(), enabled: true };
const client = (id: string, code: string): Client =>
  ({
    id,
    code,
    ageGroup: 'adult',
    sex: 'male',
    context: 'clinic',
    problems: [],
    goal: 'abstinence',
    stage: 'contemplation',
    status: 'active',
    strengths: '',
    supportNetwork: '',
    family: '',
    education: '',
    keyDates: [],
    createdAt: '',
    updatedAt: '',
  }) as Client;
const meeting = (id: string, date: Date, status: Meeting['status'] = 'planned', clientId = 'c1'): Meeting =>
  ({
    id,
    clientId,
    type: 'individual',
    date: date.toISOString(),
    durationMin: 50,
    status,
    agenda: [],
    quickNotes: '',
    noteType: 'progress',
    note: {},
    toolsUsed: [],
    homework: '',
    title: 'Rozmowa',
  }) as Meeting;

const base = {
  clients: [client('c1', 'KW-16')],
  meetings: [] as Meeting[],
  tasks: [] as Task[],
  notes: [] as Note[],
  iprs: [] as Ipr[],
  flags: [] as AttentionFlag[],
  lastBackupAt: new Date(NOW - 86_400_000).toISOString(),
  now: NOW,
  prefs,
};

// minimal t: returns the key + JSON of the vars (enough to assert what is shown)
const t = ((key: string, vars?: Record<string, unknown>) => `${key}${vars ? JSON.stringify(vars) : ''}`) as unknown as TFunction;

describe('due items', () => {
  it('planned meetings in the next 14 days; not done / past / far ones', () => {
    const items = dueItems({
      ...base,
      meetings: [
        meeting('m1', new Date(2026, 10, 5, 14, 0)),
        meeting('m2', new Date(2026, 10, 6, 10, 0)),
        meeting('m3', new Date(2026, 10, 5, 9, 0), 'done'),
        meeting('m4', new Date(2026, 10, 30, 9, 0)),
        meeting('m5', new Date(2026, 10, 1, 9, 0)),
      ],
    });
    expect(items.filter((i) => i.kind === 'meeting').map((i) => i.id)).toEqual(['meeting:m1', 'meeting:m2']);
    expect(items[0]!.label).toBe('KW-16 · Rozmowa');
  });

  it('tasks (incl. supervision tasks): overdue are important, done are skipped', () => {
    const items = dueItems({
      ...base,
      tasks: [
        { id: 't1', title: 'Zadzwonić do kuratora', due: '2026-11-03', done: false },
        { id: 't2', title: 'Zrobione', due: '2026-11-04', done: true },
      ],
      notes: [
        {
          id: 'n1',
          type: 'supervision',
          title: 'S',
          body: '',
          tags: [],
          pinned: false,
          tasks: [{ id: 'x', title: 'Przemyśleć granice', due: '2026-11-05', done: false }],
          createdAt: '',
          updatedAt: '',
        },
      ],
    });
    const tasks = items.filter((i) => i.kind === 'task');
    expect(tasks.map((i) => [i.id, i.level])).toEqual([
      ['task:t1', 2],
      ['task:n1:x', 1],
    ]);
    expect(tasks[1]!.to).toBe('/notes/n1');
  });

  it('IPR reviews within 7 days, attention flags (important only), backup', () => {
    const items = dueItems({
      ...base,
      lastBackupAt: undefined,
      iprs: [{ id: 'i1', clientId: 'c1', startDate: '2026-01-01', reviewDate: '2026-11-09', goals: [], evaluation: '' }],
      flags: [
        { rule: 'missedMeeting', clientId: 'c1', level: 2, facts: { date: '2026-11-01' }, date: '2026-11-01' },
        { rule: 'noContact', clientId: 'c1', level: 1, facts: { days: 40 }, date: '2026-11-05' },
        {
          rule: 'keyDateSoon',
          clientId: 'c1',
          level: 1,
          facts: { label: 'Rozprawa', date: '2026-11-12', days: 7 },
          date: '2026-11-05',
        },
      ],
    });
    expect(items.map((i) => i.kind).sort()).toEqual(['attention', 'backup', 'iprReview', 'keyDate']);
    expect(items.find((i) => i.kind === 'backup')!.level).toBe(2); // never backed up
  });

  it('rules switched off are skipped', () => {
    const off = { ...prefs, rules: { ...prefs.rules, meetings: false, backup: false } };
    expect(
      dueItems({ ...base, prefs: off, lastBackupAt: undefined, meetings: [meeting('m1', new Date(2026, 10, 5, 14))] }),
    ).toEqual([]);
  });
});

describe('reminders and the daily summary', () => {
  it('meeting: N minutes before and the evening before; past moments dropped', () => {
    const items = dueItems({
      ...base,
      meetings: [meeting('m1', new Date(2026, 10, 6, 10, 0)), meeting('m0', new Date(2026, 10, 5, 8, 30))],
    });
    const r = reminders(items, prefs, NOW);
    expect(r.map((x) => [x.id, new Date(x.at).getHours(), new Date(x.at).getMinutes()])).toEqual([
      ['meeting:m1:eve', 18, 0],
      ['meeting:m1:lead', 9, 0],
    ]);
  });

  it('summary is due once a day after the chosen time', () => {
    expect(digestDue(prefs, atLocal('2026-11-05', '07:29'))).toBe(false);
    expect(digestDue(prefs, atLocal('2026-11-05', '07:31'))).toBe(true);
    expect(digestDue({ ...prefs, lastDigest: '2026-11-05' }, atLocal('2026-11-05', '12:00'))).toBe(false);
    expect(isoDay(NOW)).toBe('2026-11-05');
  });

  it('summary: today only; "hidden" privacy never contains codes or titles', () => {
    const items = dueItems({
      ...base,
      meetings: [meeting('m1', new Date(2026, 10, 5, 14)), meeting('m2', new Date(2026, 10, 7, 9))],
    });
    const today = digestItems(items, NOW);
    expect(today.map((i) => i.id)).toEqual(['meeting:m1']);
    const hidden = buildDigest(t, today, 'hidden', 'pl-PL', NOW);
    expect(hidden.text).not.toContain('KW-16');
    expect(hidden.text).not.toContain('Rozmowa');
    expect(hidden.text).toContain('notify:digest.hiddenNote');
    const codes = buildDigest(t, today, 'codes', 'pl-PL', NOW);
    expect(codes.text).toContain('KW-16 · Rozmowa');
    const rt = reminderText(t, reminders(items, prefs, NOW)[0]!, 'hidden', 'pl-PL');
    expect(rt.body).toBe('notify:remind.openApp');
  });
});

describe('calendar (.ics)', () => {
  it('RFC 5545: CRLF, UTC times, escaped text, alarms, stable UID, folded lines', () => {
    const ics = buildIcs(
      [
        {
          uid: 'meeting-m1',
          start: new Date(Date.UTC(2026, 10, 6, 9, 0)),
          durationMin: 50,
          title: 'Spotkanie; ważne, KW-16',
          alarmsMin: [60, 60],
          description: 'Linia 1\nLinia 2',
        },
        { uid: 'key-1', start: new Date(2026, 10, 12), durationMin: 0, allDay: true, title: 'Ważna data', alarmsMin: [1440] },
      ],
      new Date(Date.UTC(2026, 10, 5, 7, 0)),
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).toContain('DTSTART:20261106T090000Z');
    expect(ics).toContain('DTEND:20261106T095000Z');
    expect(ics).toContain('SUMMARY:Spotkanie\\; ważne\\, KW-16');
    expect(ics).toContain('DESCRIPTION:Linia 1\\nLinia 2');
    expect(ics.match(/TRIGGER:-PT60M/g)).toHaveLength(1);
    expect(ics).toContain('UID:meeting-m1@przystan');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261112');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(escapeText('a\\b')).toBe('a\\\\b');
    const long = fold(`SUMMARY:${'ż'.repeat(60)}`);
    for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe('mail and SMS hand-over', () => {
  it('mailto: encodes subject/body, CRLF line breaks, several recipients', () => {
    const u = mailtoUrl('a@b.pl, c@d.ch', 'Zażółć & co', 'Linia 1\nLinia 2');
    expect(u).toBe('mailto:a@b.pl,c@d.ch?subject=Za%C5%BC%C3%B3%C5%82%C4%87%20%26%20co&body=Linia%201%0D%0ALinia%202');
  });

  it('sms: works on iOS and Android ("?&body="), normalised numbers', () => {
    expect(smsUrl('+41 79 123 45 67', 'Hej & co')).toBe('sms:+41791234567?&body=Hej%20%26%20co');
    expect(normPhone('0048 (600) 123-456')).toBe('+48600123456');
    expect(smsSegments('a'.repeat(160))).toMatchObject({ segments: 1, unicode: false });
    expect(smsSegments('a'.repeat(161)).segments).toBe(2);
    expect(smsSegments('Zażółć')).toMatchObject({ unicode: true, segments: 1 });
    expect(looksLikeEmail('ola@szkola.pl')).toBe(true);
    expect(looksLikeEmail('ola@')).toBe(false);
  });

  it('templates: known placeholders filled, unknown ones visible as [name]', () => {
    expect(
      renderTemplate('Dzień dobry{{recipientComma}}, {{date}} – {{oops}}', { recipientComma: ', Anna', date: 'czwartek' }),
    ).toBe('Dzień dobry, Anna, czwartek – [oops]');
  });
});

describe('EmailJS', () => {
  it('posts the documented JSON body; errors are readable', async () => {
    const fetchImpl = vi.fn(async () => new Response('OK', { status: 200 }));
    await sendEmailJs(
      { serviceId: ' s ', templateId: 't', publicKey: 'p' },
      { to_email: 'me@x.pl', subject: 'S', message: 'M' },
      fetchImpl,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EMAILJS_ENDPOINT);
    expect(JSON.parse(init.body as string)).toEqual({
      service_id: 's',
      template_id: 't',
      user_id: 'p',
      template_params: { to_email: 'me@x.pl', subject: 'S', message: 'M' },
    });
    const bad = vi.fn(async () => new Response('The recipients address is corrupted', { status: 422 }));
    await expect(
      sendEmailJs(
        { serviceId: 's', templateId: 't', publicKey: 'p', privateKey: 'k' },
        { to_email: '', subject: '', message: '' },
        bad,
      ),
    ).rejects.toMatchObject({
      status: 422,
      message: 'The recipients address is corrupted',
    });
    expect(JSON.parse((bad.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).accessToken).toBe('k');
  });
});

describe('AI for messages', () => {
  it('validates drafts and keeps the professional rules in every prompt', () => {
    expect(validateMessage({ subject: 'S', body: 'B', sms: 7, cautions: ['x', 3] })).toEqual({
      subject: 'S',
      body: 'B',
      sms: '7',
      cautions: ['x'],
    });
    expect(() => validateMessage({ subject: 'S' })).toThrow();
    for (const p of [
      COMMS_PROMPTS.reply('de', { channel: 'email', recipient: 'court', tone: 'formal', country: 'CH' }),
      COMMS_PROMPTS.compose('pl', { channel: 'sms', recipient: 'client', tone: 'warm', country: 'PL' }),
    ]) {
      expect(p).toContain(COMMS_GUIDE);
      expect(p).toMatch(/never make diagnoses/i);
      expect(p).toMatch(/placeholder/i);
    }
    expect(COMMS_GUIDE).toMatch(/Freundliche Grüsse/);
    expect(COMMS_GUIDE).toMatch(/Never confirm to a third party/);
  });

  it('notification ids are positive int32', () => {
    for (const k of ['a', 'meeting:x:lead', 'z'.repeat(200)]) {
      const id = notifId(k);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThan(2 ** 31);
    }
    expect(notifId('a')).toBe(notifId('a'));
  });
});
