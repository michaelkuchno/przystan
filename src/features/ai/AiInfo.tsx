import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { ButtonLink, Card } from '@/components/ui/core';
import { Notice } from '@/components/ui/notice';

export default function AiInfo() {
  const { t } = useTranslation('ai');
  const sections = t('info.sections', { returnObjects: true }) as { q: string; a: string }[];
  return (
    <Page>
      <PageHeader back="/settings/ai" title={t('info.title')} subtitle={t('info.checked')} />
      <div className="space-y-3">
        <Notice>{t('info.lead')}</Notice>
        {sections.map((s) => (
          <Card key={s.q}>
            <h2 className="font-sans text-base font-semibold">{s.q}</h2>
            <p className="mt-1 leading-relaxed">{s.a}</p>
          </Card>
        ))}
        <a
          href="https://aistudio.google.com/docs/terms"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline"
        >
          <ExternalLink className="size-4" aria-hidden /> {t('info.terms')}
        </a>
        <div>
          <ButtonLink to="/settings/ai" variant="secondary">
            {t('settings.title')}
          </ButtonLink>
        </div>
      </div>
    </Page>
  );
}
