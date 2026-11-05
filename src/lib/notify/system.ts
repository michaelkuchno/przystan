/**
 * System notifications.
 *  - Android app: @capacitor/local-notifications – reminders are SCHEDULED in the OS and appear
 *    even when the app is closed (re-planned after every unlock / change).
 *  - Browser / iPhone PWA: no scheduling without a push server (Notification Triggers were
 *    abandoned) – a notification is shown when the app is opened; for reminders while the app is
 *    closed the calendar export (.ics with alarms) is offered instead. See D-061.
 */
import { isNative } from '@/lib/platform';

export type Permission = 'granted' | 'denied' | 'prompt' | 'unsupported';

/** 31-bit positive id from a string (Android notification ids are int32). */
export function notifId(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  return (h & 0x3fffffff) + 1000;
}

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

export async function permission(): Promise<Permission> {
  if (isNative()) {
    const p = await (await plugin()).checkPermissions();
    return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

export async function requestPermission(): Promise<Permission> {
  if (isNative()) {
    const p = await (await plugin()).requestPermissions();
    return p.display === 'granted' ? 'granted' : 'denied';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  const r = await Notification.requestPermission();
  return r === 'default' ? 'prompt' : r;
}

export interface Planned {
  key: string;
  at: number;
  title: string;
  body: string;
}

/** Replaces all reminders planned by Przystań (Android). Returns how many are scheduled. */
export async function scheduleAll(items: Planned[], max = 60): Promise<number> {
  if (!isNative()) return 0;
  const ln = await plugin();
  const pending = await ln.getPending();
  if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  const next = items.slice(0, max);
  if (!next.length) return 0;
  await ln.schedule({
    notifications: next.map((p) => ({
      id: notifId(p.key),
      title: p.title,
      body: p.body,
      schedule: { at: new Date(p.at), allowWhileIdle: true },
      extra: { to: '/' },
    })),
  });
  return next.length;
}

export async function cancelAll(): Promise<void> {
  if (!isNative()) return;
  const ln = await plugin();
  const pending = await ln.getPending();
  if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
}

/** Shows a notification now (summary, test). */
export async function showNow(title: string, body: string, tag = 'przystan'): Promise<boolean> {
  if (isNative()) {
    await (await plugin()).schedule({ notifications: [{ id: notifId(`now:${tag}:${Date.now()}`), title, body }] });
    return true;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => undefined);
  if (reg) await reg.showNotification(title, { body, tag, icon: 'pwa-192x192.png', badge: 'pwa-64x64.png' });
  else new Notification(title, { body, tag, icon: 'pwa-192x192.png' });
  return true;
}

/** Android 12+: are exact alarms allowed? (null = not applicable). */
export async function exactAlarms(): Promise<boolean | null> {
  if (!isNative()) return null;
  try {
    return (await (await plugin()).checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return null;
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  if (isNative()) await (await plugin()).changeExactNotificationSetting();
}
