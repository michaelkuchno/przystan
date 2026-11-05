/**
 * Notification preferences (plain, part of Prefs – no personal data). Credentials and the
 * user's own addresses / signature are encrypted separately (src/lib/notify/secrets.ts).
 * Must not import prefs.ts (prefs imports this file). See docs/NOTIFICATIONS.md, D-060…D-064.
 */

export type NotifyRule = 'meetings' | 'tasks' | 'ipr' | 'keyDates' | 'attention' | 'backup';
export const NOTIFY_RULES: NotifyRule[] = ['meetings', 'tasks', 'ipr', 'keyDates', 'attention', 'backup'];

/** How much a notification / e-mail to yourself reveals (lock screen, mail provider). */
export type NotifyPrivacy = 'hidden' | 'codes';

export interface NotifyPrefs {
  /** Master switch – off by default (nothing is scheduled, nothing is sent). */
  enabled: boolean;
  rules: Record<NotifyRule, boolean>;
  /** Remind about meetings this many minutes before (0 = no). */
  meetingLeadMin: number;
  /** Also the evening before (at the digest's evening time). */
  meetingDayBefore: boolean;
  /** Daily summary time "HH:MM". */
  digestTime: string;
  channels: {
    /** System notifications (Android app: scheduled; browser/PWA: when the app is open). */
    system: boolean;
    /** Daily summary by e-mail to yourself via your own EmailJS account (sent when the app is opened). */
    email: boolean;
  };
  privacy: NotifyPrivacy;
  /** YYYY-MM-DD of the last summary (so it is sent once a day). */
  lastDigest?: string;
}

export const defaultNotifyPrefs = (): NotifyPrefs => ({
  enabled: false,
  rules: { meetings: true, tasks: true, ipr: true, keyDates: true, attention: true, backup: true },
  meetingLeadMin: 60,
  meetingDayBefore: true,
  digestTime: '07:30',
  channels: { system: true, email: false },
  privacy: 'hidden',
});
