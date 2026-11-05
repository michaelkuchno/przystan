/**
 * German wording of the screening instruments (same item and option order as instruments.ts).
 * AUDIT / AUDIT-C (WHO, Babor et al. 2001) and DUDIT (Berman et al. 2005) are free to use; the
 * texts below are working translations of the originals. `validated: false` → the form shows a
 * short note to compare with the official German version before clinical use (D-071).
 */
import type { InstrumentId } from '@/domain/types';
import type { PolishInstrumentText } from './pl';

const FREQ = ['Nie', 'Seltener als einmal im Monat', 'Einmal im Monat', 'Einmal pro Woche', 'Täglich oder fast täglich'];
const INJURY = ['Nein', 'Ja, aber nicht im letzten Jahr', 'Ja, im letzten Jahr'];

const AUDIT_ITEMS = [
  {
    text: 'Wie oft trinken Sie alkoholhaltige Getränke?',
    options: [
      'Nie',
      'Einmal im Monat oder seltener',
      '2- bis 4-mal im Monat',
      '2- bis 3-mal pro Woche',
      '4-mal oder öfter pro Woche',
    ],
  },
  {
    text: 'Wie viele alkoholhaltige Standardgetränke trinken Sie an einem typischen Tag, an dem Sie Alkohol trinken?',
    options: ['1 oder 2', '3 oder 4', '5 oder 6', '7, 8 oder 9', '10 oder mehr'],
  },
  { text: 'Wie oft trinken Sie sechs oder mehr Standardgetränke bei einer Gelegenheit?', options: FREQ },
  {
    text: 'Wie oft haben Sie im letzten Jahr erlebt, dass Sie nicht mehr aufhören konnten zu trinken, nachdem Sie einmal angefangen hatten?',
    options: FREQ,
  },
  {
    text: 'Wie oft konnten Sie im letzten Jahr nicht das tun, was von Ihnen erwartet wurde, weil Sie Alkohol getrunken hatten?',
    options: FREQ,
  },
  {
    text: 'Wie oft brauchten Sie im letzten Jahr am Morgen ein alkoholisches Getränk, um nach starkem Trinken am Vortag in Gang zu kommen?',
    options: FREQ,
  },
  { text: 'Wie oft hatten Sie im letzten Jahr nach dem Trinken Schuldgefühle oder Gewissensbisse?', options: FREQ },
  {
    text: 'Wie oft konnten Sie sich im letzten Jahr nicht mehr an den vorangegangenen Abend erinnern, weil Sie getrunken hatten?',
    options: FREQ,
  },
  { text: 'Haben Sie sich oder jemand anderen verletzt, weil Sie Alkohol getrunken hatten?', options: INJURY },
  {
    text: 'Hat sich ein Verwandter, Freund, Arzt oder eine andere Fachperson über Ihr Trinken Sorgen gemacht oder vorgeschlagen, dass Sie es einschränken?',
    options: INJURY,
  },
];

const D_FREQ = [
  'Nie',
  'Einmal im Monat oder seltener',
  '2- bis 4-mal im Monat',
  '2- bis 3-mal pro Woche',
  '4-mal oder öfter pro Woche',
];
const D_YEAR = ['Nie', 'Seltener als einmal im Monat', 'Jeden Monat', 'Jede Woche', 'Täglich oder fast täglich'];
const D_HURT = ['Nein', 'Ja, aber nicht im letzten Jahr', 'Ja, im letzten Jahr'];

const DUDIT_ITEMS = [
  { text: 'Wie oft nehmen Sie andere Drogen als Alkohol?', options: D_FREQ },
  { text: 'Nehmen Sie bei derselben Gelegenheit mehr als eine Art von Droge?', options: D_FREQ },
  {
    text: 'Wie oft nehmen Sie an einem typischen Tag Drogen, wenn Sie Drogen konsumieren?',
    options: ['0', '1–2', '3–4', '5–6', '7 oder mehr'],
  },
  { text: 'Wie oft stehen Sie stark unter dem Einfluss von Drogen?', options: D_YEAR },
  { text: 'War Ihr Verlangen nach Drogen im letzten Jahr so stark, dass Sie ihm nicht widerstehen konnten?', options: D_YEAR },
  {
    text: 'Ist es im letzten Jahr vorgekommen, dass Sie nicht aufhören konnten, Drogen zu nehmen, nachdem Sie angefangen hatten?',
    options: D_YEAR,
  },
  {
    text: 'Wie oft haben Sie im letzten Jahr Drogen genommen und dann etwas vernachlässigt, das Sie hätten tun sollen?',
    options: D_YEAR,
  },
  { text: 'Wie oft brauchten Sie im letzten Jahr am Morgen nach starkem Drogenkonsum am Vortag eine Droge?', options: D_YEAR },
  {
    text: 'Wie oft hatten Sie im letzten Jahr Schuldgefühle oder ein schlechtes Gewissen, weil Sie Drogen genommen hatten?',
    options: D_YEAR,
  },
  {
    text: 'Wurden Sie oder jemand anderes (psychisch oder körperlich) verletzt, weil Sie Drogen genommen hatten?',
    options: D_HURT,
  },
  {
    text: 'Hat sich ein Verwandter, Freund, Arzt, eine Pflegefachperson oder jemand anderes über Ihren Drogenkonsum Sorgen gemacht oder Ihnen gesagt, dass Sie aufhören sollten?',
    options: D_HURT,
  },
];

const AUDIT_SOURCE = 'AUDIT (WHO, Babor et al. 2001) – Arbeitsübersetzung';

export const DE_INSTRUMENTS: Record<InstrumentId, PolishInstrumentText | null> = {
  AUDIT: { validated: false, source: AUDIT_SOURCE, items: AUDIT_ITEMS },
  'AUDIT-C': { validated: false, source: `${AUDIT_SOURCE} (Fragen 1–3)`, items: AUDIT_ITEMS.slice(0, 3) },
  DUDIT: { validated: false, source: 'DUDIT (Berman et al. 2005) – Arbeitsübersetzung', items: DUDIT_ITEMS },
};
