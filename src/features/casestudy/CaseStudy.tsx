import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileDown, ShieldCheck } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Button, Card, EmptyState } from '@/components/ui/core';
import { Field, Switch, TextArea, TextInput } from '@/components/ui/form';
import { useStore, get, forClient } from '@/lib/store';
import { buildCaseStudy, type CaseSection } from './build';

function Editor({ initial, replaced }: { initial: CaseSection[]; replaced: number }) {
  const { t } = useTranslation('casestudy');
  const [title, setTitle] = useState(t('defaultTitle'));
  const [sections, setSections] = useState(initial);
  const [included, setIncluded] = useState<Record<string, boolean>>(() => Object.fromEntries(initial.map((s) => [s.id, true])));
  const [busy, setBusy] = useState(false);

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { caseStudyPdf } = await import('@/lib/reports');
      await caseStudyPdf(
        title,
        sections.filter((s) => included[s.id]),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Notice className="mb-4" icon={<ShieldCheck aria-hidden />}>
        {t('anonNotice', { count: replaced })}
      </Notice>
      <Card className="mb-4">
        <Field label={t('titleLabel')} htmlFor="case-title">
          <TextInput id="case-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </Card>
      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.id} className="space-y-3">
            <Switch label={s.title} checked={!!included[s.id]} onChange={(v) => setIncluded({ ...included, [s.id]: v })} />
            {included[s.id] && (
              <TextArea
                aria-label={s.title}
                rows={Math.min(18, Math.max(5, s.text.split('\n').length + 1))}
                value={s.text}
                onChange={(e) => setSections(sections.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
              />
            )}
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{t('reviewHint')}</p>
      <Button
        size="lg"
        className="mt-3"
        icon={<FileDown className="size-5" />}
        disabled={busy || !Object.values(included).some(Boolean)}
        onClick={() => void exportPdf()}
      >
        {t('export')}
      </Button>
    </>
  );
}

/** Anonymous case study: preview (editable) → PDF. */
export default function CaseStudy() {
  const { t } = useTranslation('casestudy');
  const { id = '' } = useParams();
  const client = useStore(() => get('client', id));
  const data = useStore(() => ({
    diagnosis: forClient('diagnosis', id).sort((a, b) => b.date.localeCompare(a.date))[0],
    ipr: forClient('ipr', id)[0],
    relapse: forClient('relapsePlan', id)[0],
    genogram: forClient('genogram', id)[0],
    meetings: forClient('meeting', id),
    measurements: forClient('measurement', id),
    events: forClient('event', id),
  }));
  // built once per visit; the preview is then edited locally
  const built = useMemo(() => (client ? buildCaseStudy({ client, ...data }, t) : null), [client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!client || !built)
    return (
      <Page>
        <EmptyState title={t('clients:notFound')} />
      </Page>
    );
  return (
    <Page>
      <PageHeader back={`/clients/${id}`} title={t('title')} subtitle={t('subtitle')} />
      <Editor initial={built.sections} replaced={built.replaced} />
    </Page>
  );
}
