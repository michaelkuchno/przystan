import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/ui/page';
import { StudyAsk } from './StudyAsk';

export default function StudySearch() {
  const { t } = useTranslation('studies');
  return (
    <Page>
      <PageHeader back="/studies" title={t('searchTitle')} subtitle={t('searchSubtitle')} />
      <StudyAsk />
    </Page>
  );
}
