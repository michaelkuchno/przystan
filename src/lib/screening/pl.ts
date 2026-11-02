/**
 * Placeholder structure for the OFFICIAL, VALIDATED Polish versions of the
 * screening instruments. We do not translate validated instruments ourselves.
 *
 * TODO: wstaw oficjalną polską wersję walidowaną
 *   – AUDIT: wersja polska udostępniana przez Krajowe Centrum Przeciwdziałania Uzależnieniom (KCPU)
 *   – DUDIT: wersja polska – zgoda/tekst od autorów (A.H. Berman, Karolinska Institutet)
 *
 * Until an entry is filled in, the UI shows the English original with a visible
 * "TODO" marker. Fill `items[i].text` and `items[i].options[j]` in the same order
 * as in instruments.ts and set `validated: true`.
 */
import type { InstrumentId } from '@/domain/types';

export interface PolishInstrumentText {
  validated: boolean;
  /** Source of the official Polish wording. */
  source: string;
  items: { text: string; options: string[] }[];
}

export const PL_INSTRUMENTS: Record<InstrumentId, PolishInstrumentText | null> = {
  AUDIT: null, // TODO: wstaw oficjalną polską wersję walidowaną
  'AUDIT-C': null, // TODO: wstaw oficjalną polską wersję walidowaną (pozycje 1–3 AUDIT)
  DUDIT: null, // TODO: wstaw oficjalną polską wersję walidowaną
};
