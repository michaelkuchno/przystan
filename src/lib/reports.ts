/**
 * PDF reports generated offline with pdfmake (docs/DECISIONS.md D-008).
 * pdfmake (~1 MB incl. fonts) is loaded lazily on first export.
 *
 * Reports about a person never include the code or full name ("bez danych
 * identyfikujących"); the person is described only by age group and context.
 */
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import i18n from '@/i18n';
import { get, forClient } from './store';
import { exportFile, slug, todayIso, type ExportResult } from './platform';
import { fmtDate } from './format';
import { DIAGNOSIS_AREAS, type PreventionProgram, type ReadaptationPlan, type Recipe, type RelapsePlan } from '@/domain/types';
import type { PreventionFile, TemplatesFile } from '@/content/types';

const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o ?? {});

const COLORS = { primary: '#456552', accent: '#a84f33', muted: '#615c54', soft: '#efe7dc', line: '#ddd2c2' };

async function pdfMake() {
  const [{ default: pm }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const maker = pm as unknown as {
    addVirtualFileSystem: (v: unknown) => void;
    createPdf: (d: TDocumentDefinitions) => { getBlob: () => Promise<Blob> };
  };
  maker.addVirtualFileSystem(vfs);
  return maker;
}

function base(title: string, subtitle: string, content: Content[], footerNote?: string): TDocumentDefinitions {
  return {
    info: { title, creator: 'Przystań' },
    pageSize: 'A4',
    pageMargins: [48, 60, 48, 60],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3, color: '#2a2926' },
    styles: {
      h1: { fontSize: 20, bold: true, color: COLORS.primary, margin: [0, 0, 0, 2] },
      sub: { fontSize: 10, color: COLORS.muted, margin: [0, 0, 0, 14] },
      h2: { fontSize: 13, bold: true, color: COLORS.accent, margin: [0, 14, 0, 6] },
      h3: { fontSize: 11, bold: true, margin: [0, 6, 0, 3] },
      muted: { color: COLORS.muted, fontSize: 9 },
      label: { color: COLORS.muted, fontSize: 9, bold: true },
    },
    header: () => ({
      columns: [
        { text: 'Przystań', bold: true, color: COLORS.primary, margin: [48, 24, 0, 0] },
        { text: fmtDate(todayIso()), alignment: 'right', color: COLORS.muted, margin: [0, 24, 48, 0], fontSize: 9 },
      ],
    }),
    footer: (page: number, pages: number) => ({
      columns: [
        { text: footerNote ?? t('reports:footer'), style: 'muted', margin: [48, 0, 0, 0], width: '*' },
        { text: `${page} / ${pages}`, alignment: 'right', style: 'muted', margin: [0, 0, 48, 0], width: 40 },
      ],
    }),
    content: [{ text: title, style: 'h1' }, { text: subtitle, style: 'sub' }, ...content],
  };
}

const bullets = (items: string[]): Content =>
  items.length ? { ul: items, margin: [0, 0, 0, 4] } : { text: '—', style: 'muted' };

const section = (title: string, body: Content): Content[] => [{ text: title, style: 'h2' }, body];

async function render(doc: TDocumentDefinitions, name: string): Promise<ExportResult> {
  const pm = await pdfMake();
  const blob = await pm.createPdf(doc).getBlob();
  return exportFile(`${slug(name)}-${todayIso()}.pdf`, blob, name);
}

/* --------------------------------------------------------- client report */

export async function clientReportPdf(clientId: string): Promise<ExportResult> {
  const c = get('client', clientId);
  if (!c) throw new Error('no client');
  const dx = forClient('diagnosis', clientId).sort((a, b) => b.date.localeCompare(a.date))[0];
  const ipr = forClient('ipr', clientId)[0];
  const ms = forClient('measurement', clientId).sort((a, b) => a.date.localeCompare(b.date));
  const meetings = forClient('meeting', clientId).filter((m) => m.status === 'done');

  const who = `${t(`enums:ageGroup.${c.ageGroup}`)} · ${t(`enums:context.${c.context}`)}`;
  const content: Content[] = [
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            {
              stack: [
                { text: t('clients:fields.problems'), style: 'label' },
                c.problems.map((p) => t(`enums:problem.${p}`)).join(', ') || '—',
              ],
            },
            { stack: [{ text: t('clients:fields.stage'), style: 'label' }, t(`enums:stage.${c.stage}`)] },
            { stack: [{ text: t('clients:fields.goal'), style: 'label' }, t(`enums:goal.${c.goal}`)] },
          ],
        ],
      },
      layout: 'noBorders',
      fillColor: COLORS.soft,
      margin: [0, 0, 0, 6],
    },
    ...section(t('clients:fields.strengths'), { text: c.strengths || '—' }),
  ];

  if (dx) {
    content.push(
      ...section(`${t('clients:tabs.diagnosis')} (${fmtDate(dx.date)})`, {
        table: {
          headerRows: 1,
          widths: ['*', 40, '*'],
          body: [
            [
              { text: t('reports:area'), style: 'label' },
              { text: '1–5', style: 'label' },
              { text: t('reports:notes'), style: 'label' },
            ],
            ...DIAGNOSIS_AREAS.map((a) => [
              t(`clients:diagnosis.areas.${a}`),
              String(dx.areas[a].score),
              dx.areas[a].notes || '',
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
      }),
      {
        columns: [
          { stack: [{ text: t('clients:diagnosis.risk'), style: 'h3' }, bullets(dx.riskFactors)] },
          { stack: [{ text: t('clients:diagnosis.protective'), style: 'h3' }, bullets(dx.protectiveFactors)] },
        ],
        columnGap: 16,
      },
      { text: t('clients:diagnosis.conclusions'), style: 'h3' },
      { text: dx.conclusions || '—' },
    );
  }

  if (ipr) {
    content.push(
      ...section(t('clients:tabs.ipr'), {
        stack: ipr.goals.map((g, i) => ({
          stack: [
            { text: `${i + 1}. ${g.title}  (${g.progress}%)`, style: 'h3' },
            { text: [{ text: 'S: ', bold: true }, g.specific, '   ', { text: 'M: ', bold: true }, g.measurable] },
            ...(g.actions.length
              ? [
                  {
                    ul: g.actions.map(
                      (a) =>
                        `${a.done ? '✓ ' : ''}${a.text}${a.responsible ? ` – ${a.responsible}` : ''}${a.due ? ` (${fmtDate(a.due)})` : ''}`,
                    ),
                  },
                ]
              : []),
          ],
          margin: [0, 0, 0, 6],
        })),
      }),
    );
  }

  if (ms.length) {
    content.push(
      ...section(t('clients:tabs.measurements'), {
        table: {
          headerRows: 1,
          widths: [80, '*', 60],
          body: [
            [
              { text: t('common:date'), style: 'label' },
              { text: t('reports:tool'), style: 'label' },
              { text: t('reports:result'), style: 'label' },
            ],
            ...ms.map((m) => [
              fmtDate(m.date),
              m.source.kind === 'screening'
                ? `${m.source.instrument}${m.band ? ` – ${t(`screening:bands.${m.source.instrument}.${m.band}`)}` : ''}`
                : t(`tools:names.${m.source.tool}`),
              m.scoreBefore !== undefined ? `${m.scoreBefore} → ${m.score ?? ''}` : String(m.score ?? '—'),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
      }),
      { text: t('screening:disclaimer'), style: 'muted', margin: [0, 4, 0, 0] },
    );
  }

  content.push({ text: t('reports:meetingsDone', { count: meetings.length }), style: 'muted', margin: [0, 14, 0, 0] });
  return render(base(t('reports:clientTitle'), who, content, t('reports:footerAnon')), t('reports:clientTitle'));
}

/* ----------------------------------------------------------- relapse card */

export async function relapseCardPdf(p: RelapsePlan): Promise<ExportResult> {
  const content: Content[] = [
    {
      columns: [
        { stack: [{ text: t('clients:relapse.highRisk'), style: 'h2' }, bullets(p.highRiskSituations)] },
        { stack: [{ text: t('clients:relapse.triggers'), style: 'h2' }, bullets(p.triggers)] },
      ],
      columnGap: 18,
    },
    {
      columns: [
        { stack: [{ text: t('clients:relapse.warning'), style: 'h2' }, bullets(p.warningSigns)] },
        { stack: [{ text: t('clients:relapse.coping'), style: 'h2' }, bullets(p.copingStrategies)] },
      ],
      columnGap: 18,
    },
    ...section(
      t('clients:relapse.people'),
      bullets(p.supportPeople.map((x) => `${x.name}${x.contact ? ` – ${x.contact}` : ''}`)),
    ),
    ...section(t('clients:relapse.places'), bullets(p.supportPlaces)),
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [{ text: t('clients:relapse.lapsePlan'), style: 'h2', margin: [0, 0, 0, 4] }, p.lapsePlan || '—'],
              margin: [8, 8, 8, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      fillColor: '#f5e0d6',
      margin: [0, 16, 0, 0],
    },
    { text: t('reports:crisisLine'), style: 'muted', margin: [0, 14, 0, 0] },
  ];
  return render(base(t('reports:relapseTitle'), t('reports:relapseSubtitle'), content), t('reports:relapseTitle'));
}

/* ----------------------------------------------------------- readaptation */

export async function readaptationPdf(p: ReadaptationPlan, areas: TemplatesFile['readaptationAreas']): Promise<ExportResult> {
  const content: Content[] = areas.flatMap((a) => {
    const items = p.items.filter((i) => i.area === a.id);
    return section(a.title, {
      ul: items.map((i) => `${i.done ? '☑' : '☐'}  ${i.text}${i.due ? `  (${fmtDate(i.due)})` : ''}`),
    });
  });
  const sub = p.releaseDate ? `${t('clients:readaptation.release')}: ${fmtDate(p.releaseDate)}` : '';
  return render(base(t('reports:readaptationTitle'), sub, content), t('reports:readaptationTitle'));
}

/* ----------------------------------------------------------------- recipe */

function recipeContent(r: Recipe): Content[] {
  let minute = 0;
  return [
    {
      columns: [
        { stack: [{ text: t('recipes:goal'), style: 'label' }, r.goal || '—'] },
        { stack: [{ text: t('recipes:audience'), style: 'label' }, r.audience || '—'] },
        {
          stack: [
            { text: t('recipes:duration'), style: 'label' },
            `${r.items.reduce((s, i) => s + i.minutes, 0)} / ${r.durationMin} min`,
          ],
          width: 110,
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8],
    },
    {
      table: {
        headerRows: 1,
        widths: [52, '*', 44],
        body: [
          [
            { text: t('recipes:time'), style: 'label' },
            { text: t('recipes:step'), style: 'label' },
            { text: 'min', style: 'label' },
          ],
          ...r.items.map((it) => {
            const from = minute;
            minute += it.minutes;
            return [
              `${from}–${minute}′`,
              { stack: [{ text: it.title, bold: true }, ...(it.note ? [{ text: it.note, style: 'muted' }] : [])] },
              String(it.minutes),
            ];
          }),
        ],
      },
      layout: {
        hLineColor: () => COLORS.line,
        vLineColor: () => COLORS.line,
        fillColor: (row: number) => (row === 0 ? COLORS.soft : null),
      },
    },
  ];
}

export async function recipePdf(r: Recipe): Promise<ExportResult> {
  return render(base(r.title || t('recipes:untitled'), t('recipes:pdfSubtitle'), recipeContent(r)), r.title || 'recipe');
}

/* ------------------------------------------------------------- prevention */

export async function preventionPdf(p: PreventionProgram, content: PreventionFile): Promise<ExportResult> {
  const level = content.levels.find((l) => l.id === p.level);
  const recipes = p.recipeIds.map((id) => get('recipe', id)).filter((r): r is Recipe => !!r);
  const body: Content[] = [
    ...section(t('prevention:steps.needs'), {
      stack: [
        { text: p.setting, bold: true },
        p.needs || '—',
        { text: t('prevention:resources'), style: 'h3' },
        p.resources || '—',
      ],
    }),
    ...section(t('prevention:steps.target'), {
      stack: [
        p.targetGroup || '—',
        { text: `${t('prevention:level')}: ${level?.title ?? p.level}`, bold: true, margin: [0, 4, 0, 0] },
        { text: level?.description ?? '', style: 'muted' },
      ],
    }),
    ...section(t('prevention:steps.factors'), {
      columns: [
        { stack: [{ text: t('prevention:risk'), style: 'h3' }, bullets(p.riskFactors)] },
        { stack: [{ text: t('prevention:protective'), style: 'h3' }, bullets(p.protectiveFactors)] },
      ],
      columnGap: 16,
    }),
    ...section(t('prevention:steps.goals'), { stack: [{ text: p.generalGoal || '—', bold: true }, bullets(p.specificGoals)] }),
    ...section(
      t('prevention:steps.strategies'),
      bullets(p.strategies.map((s) => content.strategies.find((x) => x.id === s)?.title ?? s)),
    ),
    ...section(t('prevention:steps.schedule'), {
      table: {
        widths: [80, '*'],
        body: p.schedule.length ? p.schedule.map((s) => [fmtDate(s.date), s.activity]) : [['—', '']],
      },
      layout: 'lightHorizontalLines',
    }),
    { text: t('prevention:budget'), style: 'h3' },
    { text: p.budgetResources || '—' },
    ...section(t('prevention:steps.evaluation'), {
      table: {
        headerRows: 1,
        widths: ['*', 50, 50, 50],
        body: [
          [
            { text: t('prevention:indicator'), style: 'label' },
            { text: t('prevention:pre'), style: 'label' },
            { text: t('prevention:post'), style: 'label' },
            { text: 'Δ', style: 'label' },
          ],
          ...p.indicators.map((i) => [
            i.label,
            i.pre?.toFixed(1) ?? '—',
            i.post?.toFixed(1) ?? '—',
            i.pre !== undefined && i.post !== undefined ? `${i.post - i.pre >= 0 ? '+' : ''}${(i.post - i.pre).toFixed(1)}` : '—',
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    }),
  ];
  const checked = content.goodPractice.filter((g) => p.checklist[g.id]);
  if (checked.length)
    body.push(...section(t('prevention:checklistTitle'), bullets(checked.map((g) => (g.kind === 'do' ? '✓ ' : '✗ ') + g.text))));
  for (const r of recipes) body.push({ text: r.title, style: 'h2', pageBreak: 'before' }, ...recipeContent(r));
  return render(
    base(p.title || t('prevention:untitled'), `${t('prevention:pdfSubtitle')} · ${p.targetGroup}`, body),
    p.title || 'program',
  );
}
