/**
 * Non-sensitive interface preferences. Stored in plain text (db.prefs) because
 * they are needed before unlocking (language, theme). Contains no client data.
 */
import { useSyncExternalStore } from 'react';
import { db } from './db';
import type { Space } from '@/domain/types';
import type { ReviewStatus } from '@/content/types';
import { syncSystemBars } from './platform';
import { DEFAULT_MODEL, defaultAiPrefs, type AiPrefs } from './ai/settings';
import { defaultNotifyPrefs, type NotifyPrefs } from './notify/settings';
import { defaultStudyPrefs, type StudyPrefs } from './studies/settings';

export type Lang = 'pl' | 'en' | 'de';
export const LANGS: Lang[] = ['pl', 'en', 'de'];
/** Country of work – independent of the language. Drives the help system, laws, crisis numbers and demo cases. */
export type Country = 'PL' | 'CH';
export const COUNTRIES: Country[] = ['PL', 'CH'];
export type Theme = 'light' | 'dark' | 'system';
export type Term = 'podopieczny' | 'klient' | 'wychowanek' | 'uczestnik';

export interface Prefs {
  lang: Lang;
  country: Country;
  theme: Theme;
  /** 1, 1.125, 1.25, 1.375 */
  textScale: number;
  term: Term;
  /** minutes; 0 = never (still locks when the app goes to background) */
  autoLockMin: number;
  mode: Space;
  onboarded: boolean;
  privacyNoticeSeen: boolean;
  presentation: boolean;
  /** Content review overrides, by content id. */
  review: Record<string, ReviewStatus>;
  lastBackupAt?: string;
  /** Practice log: required hours (default 90). */
  practiceGoalH: number;
  /** Dismissed backup reminder until this ISO timestamp. */
  backupReminderSnoozedUntil?: string;
  /** Optional AI assistant (docs/AI.md). Off by default. */
  ai: AiPrefs;
  /** Notifications and reminders (docs/NOTIFICATIONS.md). Off by default. */
  notify: NotifyPrefs;
  /** Studies module (docs/STUDIES.md). */
  study: StudyPrefs;
}

const navLang = () => ((typeof navigator !== 'undefined' && navigator.language) || 'pl').toLowerCase();

/** Default language: the system language if supported (pl, de), otherwise English. */
export function systemLang(l = navLang()): Lang {
  if (l.startsWith('pl')) return 'pl';
  if (l.startsWith('de') || l.startsWith('gsw')) return 'de';
  return 'en';
}

/** Default country of work: Switzerland for a Swiss locale or German, otherwise Poland. */
export function systemCountry(l = navLang()): Country {
  return /-ch$/.test(l) || l.startsWith('de') || l.startsWith('gsw') ? 'CH' : 'PL';
}

export const defaultPrefs = (): Prefs => ({
  lang: systemLang(),
  country: systemCountry(),
  theme: 'system',
  textScale: 1,
  term: 'podopieczny',
  autoLockMin: 5,
  mode: 'practice',
  onboarded: false,
  privacyNoticeSeen: false,
  presentation: false,
  review: {},
  practiceGoalH: 90,
  ai: defaultAiPrefs(),
  notify: defaultNotifyPrefs(),
  study: defaultStudyPrefs(),
});

let prefs: Prefs = defaultPrefs();
const subs = new Set<() => void>();

export async function loadPrefs(): Promise<Prefs> {
  try {
    const row = await db.prefs.get('prefs');
    if (row) {
      const v = row.value as Partial<Prefs>;
      prefs = {
        ...defaultPrefs(),
        ...v,
        ai: { ...defaultAiPrefs(), ...v.ai },
        notify: {
          ...defaultNotifyPrefs(),
          ...v.notify,
          rules: { ...defaultNotifyPrefs().rules, ...v.notify?.rules },
          channels: { ...defaultNotifyPrefs().channels, ...v.notify?.channels },
        },
        study: { ...defaultStudyPrefs(), ...v.study },
      };
      // a default that was never chosen follows the current default model (1.3.1: Flash-Lite)
      if (!prefs.ai.modelChosen) prefs.ai.model = DEFAULT_MODEL;
    }
  } catch {
    /* private mode etc. – keep defaults */
  }
  // presentation mode never persists across launches
  prefs.presentation = false;
  return prefs;
}

export function getPrefs(): Prefs {
  return prefs;
}

export async function setPrefs(patch: Partial<Prefs>): Promise<void> {
  prefs = { ...prefs, ...patch };
  subs.forEach((s) => s());
  const { presentation: _p, ...persisted } = prefs;
  await db.prefs.put({ key: 'prefs', value: persisted });
}

export function subscribePrefs(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
}

export function applyTheme(p: Prefs) {
  const root = document.documentElement;
  const dark = p.theme === 'dark' || (p.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.setProperty('--text-scale', String(p.presentation ? Math.max(p.textScale, 1.25) : p.textScale));
  root.dataset.presentation = String(p.presentation);
  root.lang = p.lang;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? '#151816' : '#f6f1ea');
  syncSystemBars(dark);
}
