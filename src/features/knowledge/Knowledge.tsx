import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { ButtonLink, EmptyState } from '@/components/ui/core';
import { MessageCircleQuestion } from 'lucide-react';
import { TextInput, Chips } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { KnowledgeTile } from './KnowledgeCardView';
import { usePrefs } from '@/lib/prefs';
import type { KnowledgeCard } from '@/content/types';

export function useAllCards(): KnowledgeCard[] {
  const c = useContent();
  return [...c.knowledge.cards, ...c.resocialization.cards, ...c.family.cards];
}

export default function Knowledge() {
  const { t } = useTranslation(['knowledge', 'ai']);
  const cards = useAllCards();
  const { review, ai } = usePrefs();
  const aiOn = ai.mode !== 'off';
  const [q, setQ] = useState('');
  const [section, setSection] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'do_weryfikacji' | 'zweryfikowane'>('all');
  const sections = Array.from(new Set(cards.map((c) => c.section)));
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return cards.filter(
      (c) =>
        (section === 'all' || c.section === section) &&
        (status === 'all' || (review[c.id] ?? c.reviewStatus) === status) &&
        (!n || [c.title, c.essence, ...c.tags, ...c.techniques, ...c.whenToUse].join(' ').toLowerCase().includes(n)),
    );
  }, [cards, q, section, status, review]);

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: cards.length })}
        actions={
          aiOn ? (
            <ButtonLink to="/ask" variant="soft" icon={<MessageCircleQuestion className="size-4" aria-hidden />}>
              {t('ai:ask.title')}
            </ButtonLink>
          ) : undefined
        }
      />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="k-search" className="sr-only">
          {t('search')}
        </label>
        <TextInput id="k-search" className="pl-9" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-5 flex flex-wrap gap-4">
        <Chips
          value={section}
          onChange={(v) => v[0] && setSection(v[0])}
          options={[{ value: 'all', label: t('all') }, ...sections.map((s) => ({ value: s, label: t(`sections.${s}`) }))]}
        />
        <Chips
          value={status}
          onChange={(v) => v[0] && setStatus(v[0])}
          options={[
            { value: 'all', label: t('statusAll') },
            { value: 'do_weryfikacji', label: t('common:review.toVerify') },
            { value: 'zweryfikowane', label: t('common:review.verified') },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState title={t('noResults')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <KnowledgeTile key={c.id} card={c} to={`/knowledge/${c.id}`} />
          ))}
        </div>
      )}
    </Page>
  );
}
