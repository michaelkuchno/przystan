/**
 * Polish wording of the screening instruments (same item and option order as instruments.ts).
 *
 * AUDIT / AUDIT-C follow the Polish AUDIT wording distributed by PARPA / KCPU (WHO AUDIT,
 * Babor i in. 2001 – free to use). DUDIT (Berman i in. 2005 – free to use) is a working
 * translation. `validated: false` → the form shows a short note to compare with the official
 * version before clinical use (D-071). Scoring and cut-offs are unchanged (instruments.ts).
 */
import type { InstrumentId } from '@/domain/types';

export interface PolishInstrumentText {
  validated: boolean;
  /** Source of the wording. */
  source: string;
  items: { text: string; options: string[] }[];
}

const FREQ = ['Nigdy', 'Rzadziej niż raz w miesiącu', 'Raz w miesiącu', 'Raz w tygodniu', 'Codziennie lub prawie codziennie'];
const INJURY = ['Nie', 'Tak, ale nie w ostatnim roku', 'Tak, w ostatnim roku'];

const AUDIT_ITEMS = [
  {
    text: 'Jak często pije Pan/Pani napoje zawierające alkohol?',
    options: [
      'Nigdy',
      'Raz w miesiącu lub rzadziej',
      '2–4 razy w miesiącu',
      '2–3 razy w tygodniu',
      '4 lub więcej razy w tygodniu',
    ],
  },
  {
    text: 'Ile standardowych porcji alkoholu wypija Pan/Pani zwykle w dniu, w którym pije?',
    options: ['1 lub 2', '3 lub 4', '5 lub 6', '7, 8 lub 9', '10 lub więcej'],
  },
  { text: 'Jak często wypija Pan/Pani sześć lub więcej porcji alkoholu przy jednej okazji?', options: FREQ },
  {
    text: 'Jak często w ciągu ostatniego roku zdarzyło się Panu/Pani, że nie był(a) Pan/Pani w stanie przerwać picia po jego rozpoczęciu?',
    options: FREQ,
  },
  {
    text: 'Jak często w ciągu ostatniego roku z powodu picia nie zrobił(a) Pan/Pani tego, czego normalnie od Pana/Pani oczekiwano?',
    options: FREQ,
  },
  {
    text: 'Jak często w ciągu ostatniego roku musiał(a) Pan/Pani napić się alkoholu rano, aby dojść do siebie po intensywnym piciu poprzedniego dnia?',
    options: FREQ,
  },
  { text: 'Jak często w ciągu ostatniego roku miał(a) Pan/Pani poczucie winy lub wyrzuty sumienia po piciu?', options: FREQ },
  {
    text: 'Jak często w ciągu ostatniego roku nie mógł/nie mogła Pan/Pani przypomnieć sobie, co działo się poprzedniego wieczoru, ponieważ pił(a) Pan/Pani alkohol?',
    options: FREQ,
  },
  { text: 'Czy Pan/Pani lub ktoś inny doznał kiedyś urazu z powodu Pana/Pani picia?', options: INJURY },
  {
    text: 'Czy ktoś z rodziny, przyjaciel, lekarz lub inny pracownik ochrony zdrowia martwił się Pana/Pani piciem lub sugerował jego ograniczenie?',
    options: INJURY,
  },
];

const D_FREQ = [
  'Nigdy',
  'Raz w miesiącu lub rzadziej',
  '2–4 razy w miesiącu',
  '2–3 razy w tygodniu',
  '4 lub więcej razy w tygodniu',
];
const D_YEAR = ['Nigdy', 'Rzadziej niż raz w miesiącu', 'Co miesiąc', 'Co tydzień', 'Codziennie lub prawie codziennie'];
const D_HURT = ['Nie', 'Tak, ale nie w ostatnim roku', 'Tak, w ostatnim roku'];

const DUDIT_ITEMS = [
  { text: 'Jak często używa Pan/Pani narkotyków (substancji innych niż alkohol)?', options: D_FREQ },
  { text: 'Czy używa Pan/Pani więcej niż jednego rodzaju narkotyku przy tej samej okazji?', options: D_FREQ },
  {
    text: 'Ile razy zwykle bierze Pan/Pani narkotyki w dniu, w którym ich używa?',
    options: ['0', '1–2', '3–4', '5–6', '7 lub więcej'],
  },
  { text: 'Jak często jest Pan/Pani mocno pod wpływem narkotyków?', options: D_YEAR },
  {
    text: 'Czy w ciągu ostatniego roku pragnienie narkotyków było tak silne, że nie mógł/nie mogła Pan/Pani mu się oprzeć?',
    options: D_YEAR,
  },
  {
    text: 'Czy w ciągu ostatniego roku zdarzyło się, że nie był(a) Pan/Pani w stanie przestać brać narkotyków po rozpoczęciu?',
    options: D_YEAR,
  },
  {
    text: 'Jak często w ciągu ostatniego roku po wzięciu narkotyków zaniedbał(a) Pan/Pani coś, co powinien/powinna był(a) zrobić?',
    options: D_YEAR,
  },
  {
    text: 'Jak często w ciągu ostatniego roku musiał(a) Pan/Pani wziąć narkotyk rano po intensywnym używaniu poprzedniego dnia?',
    options: D_YEAR,
  },
  {
    text: 'Jak często w ciągu ostatniego roku miał(a) Pan/Pani poczucie winy lub wyrzuty sumienia z powodu używania narkotyków?',
    options: D_YEAR,
  },
  {
    text: 'Czy Pan/Pani lub ktoś inny doznał krzywdy (psychicznej lub fizycznej) z powodu Pana/Pani używania narkotyków?',
    options: D_HURT,
  },
  {
    text: 'Czy ktoś z rodziny, przyjaciel, lekarz, pielęgniarka lub ktoś inny martwił się Pana/Pani używaniem narkotyków albo mówił, że powinien/powinna Pan/Pani przestać?',
    options: D_HURT,
  },
];

const AUDIT_SOURCE = 'AUDIT (WHO, Babor i in. 2001) – polskie brzmienie wg materiałów PARPA / KCPU';

export const PL_INSTRUMENTS: Record<InstrumentId, PolishInstrumentText | null> = {
  AUDIT: { validated: false, source: AUDIT_SOURCE, items: AUDIT_ITEMS },
  'AUDIT-C': { validated: false, source: `${AUDIT_SOURCE} (pytania 1–3)`, items: AUDIT_ITEMS.slice(0, 3) },
  DUDIT: { validated: false, source: 'DUDIT (Berman i in. 2005) – tłumaczenie robocze Przystani', items: DUDIT_ITEMS },
};
