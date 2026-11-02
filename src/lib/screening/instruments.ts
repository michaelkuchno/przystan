/**
 * Screening instruments whose licence allows free non-commercial use
 * (see docs/DECISIONS.md, D-010). Item wording follows the official English
 * sources. Polish wording is intentionally NOT translated by us – see pl.ts.
 *
 * These are screening tools, not diagnostic instruments.
 */
import type { InstrumentId, Sex } from '@/domain/types';

export interface InstrumentOption {
  label: string;
  points: number;
}

export interface InstrumentItem {
  id: string;
  text: string;
  options: InstrumentOption[];
}

export interface Band {
  id: string;
  min: number;
  max: number;
  /** Severity 0 (lowest) – 3 (highest), used for colours and attention rules. */
  severity: 0 | 1 | 2 | 3;
}

export interface Instrument {
  id: InstrumentId;
  name: string;
  /** Who the tool is intended for. */
  population: 'adult' | 'adolescentAdult';
  items: InstrumentItem[];
  maxScore: number;
  source: string;
  licence: string;
  /** Bands may depend on sex (AUDIT-C, DUDIT). */
  bands: (sex: Sex) => Band[];
}

const freq5 = (labels: string[]): InstrumentOption[] => labels.map((label, i) => ({ label, points: i }));

const AUDIT_FREQ = ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'];
const AUDIT_INJURY: InstrumentOption[] = [
  { label: 'No', points: 0 },
  { label: 'Yes, but not in the last year', points: 2 },
  { label: 'Yes, during the last year', points: 4 },
];

const auditItems: InstrumentItem[] = [
  {
    id: 'a1',
    text: 'How often do you have a drink containing alcohol?',
    options: freq5(['Never', 'Monthly or less', '2 to 4 times a month', '2 to 3 times a week', '4 or more times a week']),
  },
  {
    id: 'a2',
    text: 'How many drinks containing alcohol do you have on a typical day when you are drinking?',
    options: freq5(['1 or 2', '3 or 4', '5 or 6', '7, 8, or 9', '10 or more']),
  },
  { id: 'a3', text: 'How often do you have six or more drinks on one occasion?', options: freq5(AUDIT_FREQ) },
  {
    id: 'a4',
    text: 'How often during the last year have you found that you were not able to stop drinking once you had started?',
    options: freq5(AUDIT_FREQ),
  },
  {
    id: 'a5',
    text: 'How often during the last year have you failed to do what was normally expected from you because of drinking?',
    options: freq5(AUDIT_FREQ),
  },
  {
    id: 'a6',
    text: 'How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?',
    options: freq5(AUDIT_FREQ),
  },
  {
    id: 'a7',
    text: 'How often during the last year have you had a feeling of guilt or remorse after drinking?',
    options: freq5(AUDIT_FREQ),
  },
  {
    id: 'a8',
    text: 'How often during the last year have you been unable to remember what happened the night before because you had been drinking?',
    options: freq5(AUDIT_FREQ),
  },
  { id: 'a9', text: 'Have you or someone else been injured as a result of your drinking?', options: AUDIT_INJURY },
  {
    id: 'a10',
    text: 'Has a relative or friend or a doctor or another health worker been concerned about your drinking or suggested you cut down?',
    options: AUDIT_INJURY,
  },
];

const DUDIT_FREQ = ['Never', 'Once a month or less', '2-4 times a month', '2-3 times a week', '4 times or more a week'];
const DUDIT_PAST_YEAR = ['Never', 'Less than once a month', 'Every month', 'Every week', 'Daily or almost daily'];
const DUDIT_HURT: InstrumentOption[] = [
  { label: 'No', points: 0 },
  { label: 'Yes, but not in the past year', points: 2 },
  { label: 'Yes, during the past year', points: 4 },
];

const duditItems: InstrumentItem[] = [
  { id: 'd1', text: 'How often do you use drugs other than alcohol?', options: freq5(DUDIT_FREQ) },
  { id: 'd2', text: 'Do you use more than one type of drug on the same occasion?', options: freq5(DUDIT_FREQ) },
  {
    id: 'd3',
    text: 'How many times do you take drugs on a typical day when you use drugs?',
    options: freq5(['0', '1-2', '3-4', '5-6', '7 or more']),
  },
  { id: 'd4', text: 'How often are you influenced heavily by drugs?', options: freq5(DUDIT_PAST_YEAR) },
  {
    id: 'd5',
    text: 'Over the past year, have you felt that your longing for drugs was so strong that you could not resist it?',
    options: freq5(DUDIT_PAST_YEAR),
  },
  {
    id: 'd6',
    text: 'Has it happened, over the past year, that you have not been able to stop taking drugs once you started?',
    options: freq5(DUDIT_PAST_YEAR),
  },
  {
    id: 'd7',
    text: 'How often over the past year have you taken drugs and then neglected to do something you should have done?',
    options: freq5(DUDIT_PAST_YEAR),
  },
  {
    id: 'd8',
    text: 'How often over the past year have you needed to take a drug the morning after heavy drug use the day before?',
    options: freq5(DUDIT_PAST_YEAR),
  },
  {
    id: 'd9',
    text: 'How often over the past year have you had guilty feelings or a bad conscience because you used drugs?',
    options: freq5(DUDIT_PAST_YEAR),
  },
  {
    id: 'd10',
    text: 'Have you or anyone else been hurt (mentally or physically) because you used drugs?',
    options: DUDIT_HURT,
  },
  {
    id: 'd11',
    text: 'Has a relative or a friend, a doctor or a nurse, or anyone else, been worried about your drug use or said to you that you should stop using drugs?',
    options: DUDIT_HURT,
  },
];

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  AUDIT: {
    id: 'AUDIT',
    name: 'AUDIT – Alcohol Use Disorders Identification Test',
    population: 'adolescentAdult',
    items: auditItems,
    maxScore: 40,
    source:
      'Babor T.F., Higgins-Biddle J.C., Saunders J.B., Monteiro M.G. (2001). AUDIT: The Alcohol Use Disorders Identification Test. Guidelines for Use in Primary Care (2nd ed.). WHO/MSD/MSB/01.6a. World Health Organization.',
    licence:
      'WHO: may be freely reviewed, abstracted, reproduced and translated, but not for sale or for use in conjunction with commercial purposes.',
    // WHO risk-level zones (Babor et al., 2001, Table 6).
    bands: () => [
      { id: 'zone1', min: 0, max: 7, severity: 0 },
      { id: 'zone2', min: 8, max: 15, severity: 1 },
      { id: 'zone3', min: 16, max: 19, severity: 2 },
      { id: 'zone4', min: 20, max: 40, severity: 3 },
    ],
  },
  'AUDIT-C': {
    id: 'AUDIT-C',
    name: 'AUDIT-C – AUDIT Consumption (items 1–3)',
    population: 'adult',
    items: auditItems.slice(0, 3),
    maxScore: 12,
    source:
      'Bush K., Kivlahan D.R., McDonell M.B., Fihn S.D., Bradley K.A. (1998). The AUDIT alcohol consumption questions (AUDIT-C). Archives of Internal Medicine, 158, 1789–1795; Bradley K.A. et al. (2007). Alcoholism: Clinical and Experimental Research, 31(7), 1208–1217.',
    licence: 'Items 1–3 of the WHO AUDIT (same WHO terms); AUDIT-C is described by SAMHSA as available in the public domain.',
    // Positive screen: ≥4 men, ≥3 women (Bradley et al., 2007).
    bands: (sex) => {
      const cut = sex === 'female' ? 3 : 4;
      return [
        { id: 'negative', min: 0, max: cut - 1, severity: 0 },
        { id: 'positive', min: cut, max: 7, severity: 1 },
        { id: 'high', min: 8, max: 12, severity: 2 },
      ];
    },
  },
  DUDIT: {
    id: 'DUDIT',
    name: 'DUDIT – Drug Use Disorders Identification Test',
    population: 'adolescentAdult',
    items: duditItems,
    maxScore: 44,
    source:
      'Berman A.H., Bergman H., Palmstierna T., Schlyter F. (2003/2005). DUDIT – The Drug Use Disorders Identification Test: Manual. Karolinska Institutet, Stockholm.',
    licence:
      'Items in the public domain; the layout is copyrighted and users are asked to keep it (item order and answer scale are kept unchanged here).',
    // Manual: drug-related problems ≥6 (men) / ≥2 (women); ≥25 probable dependence.
    bands: (sex) => {
      const cut = sex === 'female' ? 2 : 6;
      return [
        { id: 'negative', min: 0, max: cut - 1, severity: 0 },
        { id: 'problems', min: cut, max: 24, severity: 2 },
        { id: 'dependence', min: 25, max: 44, severity: 3 },
      ];
    },
  },
};

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as InstrumentId[];

/** Instruments considered and deliberately left out (licence unclear or restricted). */
export const EXCLUDED_INSTRUMENTS = ['CRAFFT', 'CAST', 'FTND', 'PGSI'] as const;
