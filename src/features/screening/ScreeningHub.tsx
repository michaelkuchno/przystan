import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Info } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { CardLink, Badge, Card, SectionTitle } from '@/components/ui/core';
import { INSTRUMENTS, INSTRUMENT_IDS, EXCLUDED_INSTRUMENTS } from '@/lib/screening/instruments';
import { PL_INSTRUMENTS } from '@/lib/screening/pl';
import { usePrefs } from '@/lib/prefs';

export default function ScreeningHub() {
  const { t } = useTranslation('screening');
  const [params] = useSearchParams();
  const { lang } = usePrefs();
  const qs = params.toString() ? `?${params.toString()}` : '';
  return (
    <Page>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Notice tone="warn" className="mb-5">
        <strong>{t('disclaimerTitle')}</strong> {t('disclaimer')}
      </Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        {INSTRUMENT_IDS.map((id) => {
          const inst = INSTRUMENTS[id];
          return (
            <CardLink key={id} to={`/screening/${id}${qs}`}>
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue">
                  <ClipboardList className="size-6" aria-hidden />
                </span>
                <div>
                  <div className="font-serif text-xl font-semibold">{id}</div>
                  <div className="text-sm text-muted">{t(`about.${id}`)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{t('items', { count: inst.items.length })}</Badge>
                    <Badge>{t(`population.${inst.population}`)}</Badge>
                    {lang === 'pl' && !PL_INSTRUMENTS[id] && <Badge tone="warn">{t('todoPl')}</Badge>}
                  </div>
                </div>
              </div>
            </CardLink>
          );
        })}
      </div>
      <SectionTitle>{t('excludedTitle')}</SectionTitle>
      <Card className="flex gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <div className="text-sm">
          <p>{t('excludedText', { list: EXCLUDED_INSTRUMENTS.join(', ') })}</p>
        </div>
      </Card>
    </Page>
  );
}
