import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Network, HeartHandshake, ShieldAlert, Phone } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Card, List, ListRow, Avatar, EmptyState } from '@/components/ui/core';
import { Tabs } from '@/components/ui/overlay';
import { crisisFor, useContent } from '@/content/ContentProvider';
import { usePrefs } from '@/lib/prefs';
import { useStore, all, get } from '@/lib/store';
import { KnowledgeTile, KnowledgeCardView } from '@/features/knowledge/KnowledgeCardView';

export default function Family() {
  const { t } = useTranslation('family');
  const { tab = 'knowledge' } = useParams();
  const nav = useNavigate();
  const { cards } = useContent('family');
  const { country } = usePrefs();
  const crisis = crisisFor(useContent(), country);
  const genos = useStore(() => all('genogram'));
  const plans = useStore(() => all('familyPlan'));
  const violence = cards.find((c) => /violence|przemoc|niebiesk|blue/i.test(`${c.id} ${c.tags.join(' ')}`));

  const tabs = [
    {
      value: 'knowledge',
      label: t('tabs.knowledge'),
      content: (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <KnowledgeTile key={c.id} card={c} to={`/knowledge/${c.id}`} />
          ))}
        </div>
      ),
    },
    {
      value: 'violence',
      label: t('tabs.violence'),
      content: (
        <div className="space-y-4">
          <Notice tone="accent" icon={<ShieldAlert aria-hidden />}>
            <strong>{t('violenceUrgent', { context: country })}</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {crisis.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.number.replace(/\s/g, '')}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-3 text-sm font-semibold"
                >
                  <Phone className="size-4" aria-hidden /> {c.number} · {c.name}
                </a>
              ))}
            </div>
          </Notice>
          {violence ? <KnowledgeCardView card={violence} /> : null}
        </div>
      ),
    },
    {
      value: 'tools',
      label: t('tabs.tools'),
      content: (
        <div className="space-y-4">
          <Card className="text-sm leading-relaxed">{t('toolsIntro')}</Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Network className="size-5 text-primary" aria-hidden /> {t('genograms')}
          </h2>
          {genos.length === 0 ? (
            <EmptyState title={t('noGenograms')} />
          ) : (
            <List>
              {genos.map((g) => {
                const c = get('client', g.clientId);
                return (
                  <ListRow
                    key={g.id}
                    to={`/clients/${g.clientId}/genogram`}
                    leading={c && <Avatar label={c.code} />}
                    title={<span className="pii">{c?.code}</span>}
                    subtitle={t('nodes', { count: g.nodes.length })}
                  />
                );
              })}
            </List>
          )}
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HeartHandshake className="size-5 text-primary" aria-hidden /> {t('plans')}
          </h2>
          {plans.length === 0 ? (
            <EmptyState title={t('noPlans')} />
          ) : (
            <List>
              {plans.map((p) => {
                const c = get('client', p.clientId);
                return (
                  <ListRow
                    key={p.id}
                    to={`/clients/${p.clientId}/family`}
                    leading={c && <Avatar label={c.code} />}
                    title={<span className="pii">{c?.code}</span>}
                    subtitle={p.familyGoals.slice(0, 2).join(' · ')}
                  />
                );
              })}
            </List>
          )}
        </div>
      ),
    },
  ];

  return (
    <Page wide>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Tabs tabs={tabs} value={tab} onChange={(v) => nav(`/family/${v}`, { replace: true })} />
    </Page>
  );
}
