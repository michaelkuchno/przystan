/**
 * Anonymous case study (diagnosis, programme, course, evaluation) built from a client's records.
 * Every text passes through anonymize(); the user reviews and can edit the result before the PDF.
 */
import type { TFunction } from 'i18next';
import { anonymize } from '@/lib/anonymize';
import {
  DIAGNOSIS_AREAS,
  NOTE_FIELDS,
  type Client,
  type Diagnosis,
  type Genogram,
  type Ipr,
  type Measurement,
  type Meeting,
  type RelapsePlan,
  type TimelineEvent,
} from '@/domain/types';

export type CaseSectionId = 'profile' | 'diagnosis' | 'programme' | 'course' | 'evaluation';
export const CASE_SECTIONS: CaseSectionId[] = ['profile', 'diagnosis', 'programme', 'course', 'evaluation'];

export interface CaseSection {
  id: CaseSectionId;
  title: string;
  text: string;
}

export interface CaseData {
  client: Client;
  diagnosis?: Diagnosis;
  ipr?: Ipr;
  relapse?: RelapsePlan;
  genogram?: Genogram;
  meetings: Meeting[];
  measurements: Measurement[];
  events: TimelineEvent[];
}

/** Names that must disappear: code, full name, support persons, names in genogram labels. */
export function identifyingNames(d: CaseData): string[] {
  const names = [d.client.code, d.client.fullName ?? ''];
  for (const p of d.relapse?.supportPeople ?? []) names.push(p.name);
  for (const n of d.genogram?.nodes ?? []) {
    if (n.isClient || n.kind === 'institution' || n.kind === 'group') continue;
    // "Babcia Ewa" → "Ewa"; a single word is usually a role ("Matka", "Ojciec") and is kept
    const words = n.label.trim().split(/\s+/);
    if (words.length > 1) names.push(words.slice(1).join(' '));
  }
  return names.filter((n) => n.trim().length >= 2);
}

const monthYear = (iso: string) => iso.slice(0, 7);
const lines = (xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join('\n');
const list = (xs: string[]) => xs.filter((x) => x.trim()).map((x) => `• ${x}`);

export function buildCaseStudy(d: CaseData, t: TFunction): { sections: CaseSection[]; replaced: number } {
  const opts = { names: identifyingNames(d), person: t('reports:anon.person'), removed: t('reports:anon.removed') };
  let replaced = 0;
  const clean = (s: string | undefined) => {
    const r = anonymize(s ?? '', opts);
    replaced += r.count;
    return r.text;
  };
  const c = d.client;

  const profile = lines([
    `${t('casestudy:person')}: ${t(`enums:ageGroup.${c.ageGroup}`)}${c.isGroup ? '' : `, ${t(`enums:sex.${c.sex}`)}`}`,
    `${t('clients:fields.context')}: ${t(`enums:context.${c.context}`)}`,
    `${t('clients:fields.problems')}: ${c.problems.map((p) => t(`enums:problem.${p}`)).join(', ') || '—'}`,
    `${t('clients:fields.stage')}: ${t(`enums:stage.${c.stage}`)} · ${t('clients:fields.goal')}: ${t(`enums:goal.${c.goal}`)}`,
    c.family && `\n${t('clients:fields.family')}: ${clean(c.family)}`,
    c.education && `${t('clients:fields.education')}: ${clean(c.education)}`,
    c.strengths && `${t('clients:fields.strengths')}: ${clean(c.strengths)}`,
    c.supportNetwork && `${t('clients:fields.supportNetwork')}: ${clean(c.supportNetwork)}`,
  ]);

  const dx = d.diagnosis;
  const diagnosis = dx
    ? lines([
        `${t('casestudy:date')}: ${monthYear(dx.date)}`,
        ...DIAGNOSIS_AREAS.map((a) => {
          const area = dx.areas[a];
          return area && `${t(`clients:diagnosis.areas.${a}`)}: ${area.score}/5${area.notes ? ` – ${clean(area.notes)}` : ''}`;
        }),
        dx.riskFactors.length > 0 && `\n${t('clients:diagnosis.risk')}:\n${list(dx.riskFactors.map(clean)).join('\n')}`,
        dx.protectiveFactors.length > 0 && `${t('clients:diagnosis.protective')}:\n${list(dx.protectiveFactors.map(clean)).join('\n')}`,
        dx.resources && `${t('clients:diagnosis.resources')}: ${clean(dx.resources)}`,
        dx.conclusions && `\n${t('clients:diagnosis.conclusions')}: ${clean(dx.conclusions)}`,
      ])
    : t('casestudy:none');

  const programme = lines([
    ...(d.ipr?.goals ?? []).map((g, i) =>
      lines([
        `${i + 1}. ${clean(g.title)}`,
        g.specific && `   ${clean(g.specific)}`,
        g.measurable && `   ${t('casestudy:measure')}: ${clean(g.measurable)}`,
        ...g.actions.map((a) => `   – ${clean(a.text)}`),
      ]),
    ),
    d.relapse &&
      lines([
        `\n${t('casestudy:relapse')}:`,
        ...list(d.relapse.highRiskSituations.map(clean)),
        ...list(d.relapse.copingStrategies.map(clean)),
      ]),
  ]) || t('casestudy:none');

  const done = d.meetings.filter((m) => m.status === 'done').sort((a, b) => a.date.localeCompare(b.date));
  const course = lines([
    t('casestudy:meetingsCount', { count: done.length }),
    ...done.map((m, i) => {
      const fields = NOTE_FIELDS[m.noteType]
        .map((f) => m.note[f])
        .filter((x): x is string => !!x?.trim())
        .map(clean);
      const body = fields.length ? fields.join(' ') : clean(m.quickNotes);
      return `\n${t('casestudy:meeting', { n: i + 1 })} (${monthYear(m.date)}, ${t(`meetings:type.${m.type}`)})${body ? `: ${body}` : ''}`;
    }),
    ...(d.events.length
      ? [
          `\n${t('casestudy:events')}:`,
          ...[...d.events]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => `• ${monthYear(e.date)} – ${t(`clients:timeline.type.${e.type}`)}: ${clean(e.title)}`),
        ]
      : []),
  ]);

  const screenings = new Map<string, Measurement[]>();
  for (const m of [...d.measurements].sort((a, b) => a.date.localeCompare(b.date)))
    if (m.source.kind === 'screening' && m.score !== undefined)
      screenings.set(m.source.instrument, [...(screenings.get(m.source.instrument) ?? []), m]);
  const evaluation = lines([
    ...[...screenings.entries()].map(([inst, ms]) =>
      ms.length > 1
        ? `${inst}: ${ms[0]!.score} (${monthYear(ms[0]!.date)}) → ${ms.at(-1)!.score} (${monthYear(ms.at(-1)!.date)})`
        : `${inst}: ${ms[0]!.score} (${monthYear(ms[0]!.date)})`,
    ),
    ...(d.ipr?.goals ?? []).map((g) => `${clean(g.title)}: ${g.progress}%${g.reviewNotes ? ` – ${clean(g.reviewNotes)}` : ''}`),
    d.ipr?.evaluation && `\n${clean(d.ipr.evaluation)}`,
  ]) || t('casestudy:none');

  const sections: CaseSection[] = [
    { id: 'profile', title: t('casestudy:sections.profile'), text: profile },
    { id: 'diagnosis', title: t('casestudy:sections.diagnosis'), text: diagnosis },
    { id: 'programme', title: t('casestudy:sections.programme'), text: programme },
    { id: 'course', title: t('casestudy:sections.course'), text: course },
    { id: 'evaluation', title: t('casestudy:sections.evaluation'), text: evaluation },
  ];
  return { sections, replaced };
}
