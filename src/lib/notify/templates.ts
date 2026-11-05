/**
 * Built-in e-mail / SMS templates (locales/{lang}/messages.json → templates). Placeholders
 * {{name}} are filled by renderTemplate; unknown ones become "[name]" so nothing is invented.
 */
import type { i18n as I18n } from 'i18next';
import type { Meeting } from '@/domain/types';

export const TEMPLATE_IDS = [
  'meetingReminder',
  'meetingChange',
  'missedMeeting',
  'guardianInfo',
  'schoolOpinion',
  'referral',
  'courtReport',
  'supervisionRequest',
  'preventionInvite',
  'acknowledge',
  'thanks',
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateDef {
  id: TemplateId;
  title: string;
  subject: string;
  body: string;
  /** Absent = e-mail only. */
  sms?: string;
}

/** The i18n instance is passed in (useTranslation().i18n) – importing it here would split the start-up bundle. */
export function templates(i18n: I18n): TemplateDef[] {
  const res = (i18n.getResourceBundle(i18n.language, 'messages') ?? i18n.getResourceBundle('pl', 'messages')) as
    { templates?: Record<string, Omit<TemplateDef, 'id'>> } | undefined;
  return TEMPLATE_IDS.filter((id) => res?.templates?.[id]).map((id) => ({ id, ...res!.templates![id]! }));
}

export function renderTemplate(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === undefined ? `[${k}]` : v;
  });
}

export interface VarSource {
  locale: string;
  /** Localised placeholder text for a key ("date" → "data" / "Datum"). */
  placeholder: (k: string) => string;
  meeting?: Meeting;
  recipientName?: string;
  myName?: string;
  signature?: string;
  program?: string;
}

/** Localised placeholder such as "[data]" / "[Datum]" for a value the user has to fill in. */

export function templateVars(s: VarSource): Record<string, string> {
  const ph = (k: string) => `[${s.placeholder(k)}]`;
  const d = s.meeting ? new Date(s.meeting.date) : undefined;
  const name = s.recipientName?.trim() ?? '';
  return {
    date: d ? d.toLocaleDateString(s.locale, { weekday: 'long', day: 'numeric', month: 'long' }) : ph('date'),
    time: d ? d.toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' }) : ph('time'),
    placeIn: '',
    recipient: name,
    recipientComma: name ? `, ${name}` : '',
    recipientSpace: name ? ` ${name}` : '',
    me: s.myName?.trim() ?? '',
    signature: s.signature?.trim() || ph('signature'),
    program: s.program ?? ph('program'),
  };
}
