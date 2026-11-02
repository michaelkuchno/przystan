import { useTranslation } from 'react-i18next';
import { LifeBuoy } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { CrisisList } from './CrisisList';

export { CrisisList };

export default function Crisis() {
  const { t } = useTranslation('help');
  return (
    <Page>
      <PageHeader
        back
        eyebrow={
          <span className="inline-flex items-center gap-1">
            <LifeBuoy className="size-3.5" aria-hidden /> 24/7
          </span>
        }
        title={t('crisisTitle')}
        subtitle={t('crisisSubtitle')}
      />
      <CrisisList />
    </Page>
  );
}
