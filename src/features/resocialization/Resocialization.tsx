import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DoorOpen, Users } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Card, List, ListRow, EmptyState, Avatar, Badge, SectionTitle } from '@/components/ui/core';
import { Tabs } from '@/components/ui/overlay';
import { useContent } from '@/content/ContentProvider';
import { useStore, all, get } from '@/lib/store';
import { KnowledgeTile } from '@/features/knowledge/KnowledgeCardView';

export default function Resocialization() {
  const { t } = useTranslation('resocialization');
  const { tab = 'knowledge' } = useParams();
  const nav = useNavigate();
  const { cards } = useContent('resocialization');
  const socio = useContent('templates').sociotherapy;
  const plans = useStore(() => all('readaptation'));

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
      value: 'readaptation',
      label: t('tabs.readaptation'),
      content: (
        <div className="space-y-4">
          <Card className="flex gap-3">
            <DoorOpen className="size-6 shrink-0 text-primary" aria-hidden />
            <p className="text-sm leading-relaxed">{t('readaptationIntro')}</p>
          </Card>
          {plans.length === 0 ? (
            <EmptyState icon={<Users />} title={t('noPlans')} text={t('noPlansText')} />
          ) : (
            <List>
              {plans.map((p) => {
                const c = get('client', p.clientId);
                const done = p.items.filter((i) => i.done).length;
                return (
                  <ListRow
                    key={p.id}
                    to={`/clients/${p.clientId}/readaptation`}
                    leading={c && <Avatar label={c.code} />}
                    title={<span className="pii">{c?.code}</span>}
                    subtitle={t('progress', { done, total: p.items.length })}
                    trailing={
                      <Badge tone={done === p.items.length ? 'ok' : 'primary'}>
                        {Math.round((done / Math.max(1, p.items.length)) * 100)}%
                      </Badge>
                    }
                  />
                );
              })}
            </List>
          )}
        </div>
      ),
    },
    {
      value: 'sociotherapy',
      label: t('tabs.sociotherapy'),
      content: (
        <div className="space-y-4">
          <Card>
            <h2 className="text-xl font-semibold">{socio.title}</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1 font-sans font-semibold">{t('goals')}</h3>
                <ul className="space-y-1 text-sm">
                  {socio.goals.map((g) => (
                    <li key={g}>• {g}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 font-sans font-semibold">{t('rules')}</h3>
                <ul className="space-y-1 text-sm">
                  {socio.groupRules.map((g) => (
                    <li key={g}>• {g}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          <SectionTitle>{t('cycle')}</SectionTitle>
          <ol className="grid gap-3 md:grid-cols-2">
            {socio.cycle.map((m) => (
              <li key={m.no}>
                <Card>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft font-serif font-bold text-accent-soft-fg">
                      {m.no}
                    </span>
                    <div className="font-semibold">{m.title}</div>
                  </div>
                  <p className="mt-2 text-sm text-muted">{m.aims}</p>
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {m.activities.map((a) => (
                      <li key={a}>– {a}</li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Page wide>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Tabs tabs={tabs} value={tab} onChange={(v) => nav(`/resocialization/${v}`, { replace: true })} />
    </Page>
  );
}
