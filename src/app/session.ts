/**
 * Session orchestration: auto-lock on inactivity and when the app goes to the
 * background, loading the active space, demo seeding.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { isUnlocked, lock, lockEpoch, onLockChange } from '@/lib/vault';
import { clearStore, loadSpace, saveMany, clearSpace, all, purgeDeleted } from '@/lib/store';
import { getPrefs, setPrefs } from '@/lib/prefs';
import { buildDemoRecords } from '@/lib/demo';
import { loadContent } from '@/content/ContentProvider';
import type { Space } from '@/domain/types';
import { db } from '@/lib/db';

export function useLockEpoch(): number {
  return useSyncExternalStore(onLockChange, lockEpoch, lockEpoch);
}

export function useUnlocked(): boolean {
  return useSyncExternalStore(onLockChange, isUnlocked, isUnlocked);
}

/** Seeds the demo space (stable ids, current language). */
export async function seedDemo(): Promise<void> {
  const { lang } = getPrefs();
  const content = await loadContent(lang);
  await clearSpace('demo');
  await saveMany(buildDemoRecords(content.demo.cases), 'demo');
  await db.meta.put({ key: 'demoLang', value: lang });
}

/** Loads the space chosen in prefs; seeds demo on first use or after a language switch. */
export async function openSpace(space: Space = getPrefs().mode): Promise<void> {
  if (space === 'demo') {
    const seededLang = (await db.meta.get('demoLang'))?.value;
    const count = await db.records.where('space').equals('demo').count();
    if (!count || seededLang !== getPrefs().lang) await seedDemo();
  }
  await loadSpace(space);
}

export async function switchMode(space: Space) {
  await setPrefs({ mode: space });
  await openSpace(space);
}

/** Re-seed demo after a language change when in demo mode. */
export async function onLanguageChanged() {
  if (!isUnlocked()) return;
  if (getPrefs().mode === 'demo') await openSpace('demo');
}

export function lockNow() {
  lock();
  clearStore();
}

/** Inactivity timer + lock on background + privacy shield. */
export function useAutoLock(): { shielded: boolean } {
  const unlocked = useUnlocked();
  const [shielded, setShielded] = useState(false);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        setShielded(true);
        if (isUnlocked()) lockNow();
      } else {
        setShielded(false);
      }
    };
    const onBlur = () => setShielded(true);
    const onFocus = () => setShielded(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onBlur);
    window.addEventListener('pageshow', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onBlur);
      window.removeEventListener('pageshow', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      clearTimeout(timer);
      const min = getPrefs().autoLockMin;
      if (min > 0) timer = setTimeout(lockNow, min * 60_000);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    // cleanup of soft-deleted rows whose undo window has passed
    const purge = setInterval(() => void purgeDeleted(60_000), 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(purge);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked]);

  return { shielded };
}

/** Has the practice space any clients? (first-client privacy notice) */
export function practiceIsEmpty(): boolean {
  return getPrefs().mode === 'practice' && all('client').length === 0;
}
