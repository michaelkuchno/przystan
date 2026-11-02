import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/ui/page';
import { EmptyState } from '@/components/ui/core';
import { KnowledgeCardView } from './KnowledgeCardView';
import { useAllCards } from './Knowledge';

export default function KnowledgeCardPage() {
  const { t } = useTranslation('knowledge');
  const { id } = useParams();
  const card = useAllCards().find((c) => c.id === id);
  return (
    <Page>
      <PageHeader back eyebrow={card ? t(`sections.${card.section}`) : undefined} title={card?.title ?? t('notFound')} />
      {card ? <KnowledgeCardView card={card} /> : <EmptyState title={t('notFound')} />}
    </Page>
  );
}
