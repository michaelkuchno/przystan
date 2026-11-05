import type { InstrumentId } from '@/domain/types';
import type { Lang } from '@/lib/prefs';
import { PL_INSTRUMENTS, type PolishInstrumentText } from './pl';
import { DE_INSTRUMENTS } from './de';

/**
 * Official validated wording of an instrument in the UI language, if available.
 * English is the original (instruments.ts) and needs none.
 */
export function officialText(lang: Lang, id: InstrumentId): PolishInstrumentText | null {
  if (lang === 'pl') return PL_INSTRUMENTS[id];
  if (lang === 'de') return DE_INSTRUMENTS[id];
  return null;
}

/** True when the wording in the UI language is a working translation (short note in the form). */
export function needsOfficialText(lang: Lang, id: InstrumentId): boolean {
  return lang !== 'en' && !officialText(lang, id)?.validated;
}
