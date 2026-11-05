/**
 * Notification / summary texts. With privacy "hidden" (default) nothing identifying is shown –
 * lock screens and mail providers see only counts and times. "codes" adds pseudonymous codes
 * and titles (never full names – the store keeps names out of DueItem.label).
 */
import type { TFunction } from 'i18next';
import type { DueItem, Reminder } from './due';
import type { NotifyPrivacy } from './settings';

const time = (iso: string, locale: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
const date = (iso: string, locale: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

/** One line describing an item (summary lists). */
export function itemLine(t: TFunction, it: DueItem, privacy: NotifyPrivacy, locale: string): string {
  const show = privacy === 'codes' && it.label;
  // the label (code / title) is never passed to translations – only appended below with privacy "codes"
  const { label: _l, ...facts } = { ...it.facts, label: undefined };
  const vars = { time: time(it.when, locale), date: date(it.when, locale), ...facts };
  const key = it.kind === 'attention' ? `notify:line.attention.${String(it.facts?.rule ?? 'other')}` : `notify:line.${it.kind}`;
  const base = t(key, { ...vars, defaultValue: t('notify:line.attention.other') });
  return show && it.kind !== 'backup' ? `${base} – ${it.label}` : base;
}

export function reminderText(t: TFunction, r: Reminder, privacy: NotifyPrivacy, locale: string): { title: string; body: string } {
  const it = r.item;
  const vars = { time: time(it.when, locale), date: date(it.when, locale) };
  const title =
    it.kind === 'meeting'
      ? r.moment === 'eve'
        ? t('notify:remind.meetingTomorrow', vars)
        : t('notify:remind.meetingSoon', { ...vars, min: Math.round((Date.parse(it.when) - r.at) / 60_000) })
      : t(`notify:remind.${it.kind}`, vars);
  const body = privacy === 'codes' && it.label ? it.label : t('notify:remind.openApp');
  return { title, body };
}

export interface Digest {
  subject: string;
  /** Plain text (e-mail / notification body). */
  text: string;
  /** Short line for a system notification. */
  short: string;
  count: number;
}

export function buildDigest(
  t: TFunction,
  items: DueItem[],
  privacy: NotifyPrivacy,
  locale: string,
  now: number,
  sig = '',
): Digest {
  const by = (k: DueItem['kind']) => items.filter((i) => i.kind === k);
  const counts = {
    meetings: by('meeting').length,
    tasks: by('task').length,
    attention: by('attention').length + by('keyDate').length + by('iprReview').length,
  };
  const day = new Date(now).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const short = items.length ? t('notify:digest.short', counts) : t('notify:digest.nothing');
  const lines = items.map((i) => `• ${itemLine(t, i, privacy, locale)}`);
  const text = [
    t('notify:digest.hello', { day }),
    '',
    items.length ? t('notify:digest.short', counts) : t('notify:digest.nothing'),
    ...(lines.length ? ['', ...lines] : []),
    '',
    privacy === 'hidden' ? t('notify:digest.hiddenNote') : t('notify:digest.codesNote'),
    sig ? `\n${sig}` : '',
  ]
    .join('\n')
    .trim();
  return { subject: t('notify:digest.subject', { day }), text, short, count: items.length };
}
