/**
 * Placeholder structure for the OFFICIAL, VALIDATED German versions of the screening
 * instruments. We do not translate validated instruments ourselves.
 *
 * TODO: oficjalna wersja DE (offizielle deutsche Fassung einfügen)
 *   – AUDIT / AUDIT-C: validated German version (e.g. as distributed by Sucht Schweiz or the
 *     German WHO translation) – wording and permission to be confirmed
 *   – DUDIT: German version – text and permission from the authors (A.H. Berman, Karolinska Institutet)
 *
 * Until an entry is filled in, the UI shows the English original with a visible "TODO" marker.
 * Same format as pl.ts.
 */
import type { InstrumentId } from '@/domain/types';
import type { PolishInstrumentText } from './pl';

export const DE_INSTRUMENTS: Record<InstrumentId, PolishInstrumentText | null> = {
  AUDIT: null, // TODO: oficjalna wersja DE
  'AUDIT-C': null, // TODO: oficjalna wersja DE (Items 1–3 des AUDIT)
  DUDIT: null, // TODO: oficjalna wersja DE
};
