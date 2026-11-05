/**
 * Notification engine – runs in the app (there is no server): after unlocking and when data
 * changes. It (1) re-plans system reminders (Android), (2) once a day after the chosen time shows
 * the daily summary and – if configured – e-mails it to yourself via your own EmailJS account.
 */
import type { TFunction } from 'i18next';
import { all } from '@/lib/store';
import { getPrefs, setPrefs } from '@/lib/prefs';
import { computeAttention } from '@/lib/attention';
import { logEvent } from '@/lib/audit';
import { locale } from '@/lib/format';
import { digestDue, digestItems, dueItems, isoDay, reminders, type DueItem } from './due';
import { buildDigest, reminderText, type Digest } from './text';
import { cancelAll, scheduleAll, showNow } from './system';
import { emailJsReady, loadSecrets, signature } from './secrets';
import { sendEmailJs } from './emailjs';

export function currentDue(now = Date.now()): DueItem[] {
  const p = getPrefs();
  const today = isoDay(now);
  const clients = all('client');
  const meetings = all('meeting');
  const flags = computeAttention({ clients, meetings, measurements: all('measurement'), iprs: all('ipr'), today });
  return dueItems({
    clients,
    meetings,
    tasks: all('task'),
    notes: all('note'),
    iprs: all('ipr'),
    flags,
    lastBackupAt: p.lastBackupAt,
    now,
    prefs: p.notify,
  });
}

export function todaysDigest(t: TFunction, now = Date.now(), sig = ''): Digest {
  const p = getPrefs();
  return buildDigest(t, digestItems(currentDue(now), now), p.notify.privacy, locale(), now, sig);
}

/** Re-plans reminders and sends the summary when due. Never throws (notifications are best effort). */
export async function runNotifications(t: TFunction, now = Date.now()): Promise<{ scheduled: number; digest: boolean }> {
  const p = getPrefs().notify;
  if (!p.enabled) {
    await cancelAll().catch(() => undefined);
    return { scheduled: 0, digest: false };
  }
  let scheduled = 0;
  const items = currentDue(now);
  if (p.channels.system) {
    const planned = reminders(items, p, now).map((r) => ({ key: r.id, at: r.at, ...reminderText(t, r, p.privacy, locale()) }));
    scheduled = await scheduleAll(planned).catch(() => 0);
  } else await cancelAll().catch(() => undefined);

  if (!digestDue(p, now)) return { scheduled, digest: false };
  const today = isoDay(now);
  await setPrefs({ notify: { ...getPrefs().notify, lastDigest: today } });
  const secrets = await loadSecrets().catch(() => null);
  const digest = buildDigest(t, digestItems(items, now), p.privacy, locale(), now, secrets ? signature(secrets) : '');
  if (p.channels.system) await showNow(digest.subject, digest.short, 'digest').catch(() => false);
  if (p.channels.email && secrets && emailJsReady(secrets) && secrets.myEmail.trim()) {
    try {
      await sendEmailJs(secrets.emailjs!, {
        to_email: secrets.myEmail.trim(),
        to_name: secrets.myName,
        subject: digest.subject,
        message: digest.text,
        from_name: 'Przystań',
      });
      void logEvent({
        action: 'message.send',
        details: { channel: 'email', via: 'emailjs', kind: 'digest', items: digest.count },
      });
    } catch {
      // try again on the next start
      await setPrefs({ notify: { ...getPrefs().notify, lastDigest: undefined } });
    }
  }
  return { scheduled, digest: true };
}
