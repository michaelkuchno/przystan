/**
 * Non-sensitive interface preferences. Stored in plain text (db.prefs) because
 * they are needed before unlocking (language, theme). Contains no client data.
 */
import { useSyncExternalStore } from 'react';
import { db } from './db';
import type { Space } from '@/domain/types';
import type { ReviewStatus } from '@/content/types';
import { syncSystemBars } from './platform';

export type Lang = 'pl' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type Term = 'podopieczny' | 'klient' | 'wychowanek' | 'uczestnik';

export interface Prefs {
  lang: Lang;
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
}

function systemLang(): Lang {
  const l = (typeof navigator !== 'undefined' && navigator.language) || 'pl';
  return l.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

export const defaultPrefs = (): Prefs => ({
  lang: systemLang(),
  theme: 'system',
  textScale: 1,
  term: 'podopieczny',
  autoLockMin: 5,
  mode: 'practice',
  onboarded: false,
  privacyNoticeSeen: false,
  presentation: false,
  review: {},
});

let prefs: Prefs = defaultPrefs();
const subs = new Set<() => void>();

export async function loadPrefs(): Promise<Prefs> {
  try {
    const row = await db.prefs.get('prefs');
    if (row) prefs = { ...defaultPrefs(), ...(row.value as Partial<Prefs>) };
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
