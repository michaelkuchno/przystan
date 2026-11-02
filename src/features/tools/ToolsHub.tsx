import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader } from '@/components/ui/page';
import { CardLink, Badge, SectionTitle } from '@/components/ui/core';
import { get } from '@/lib/store';
import { useContent } from '@/content/ContentProvider';
import { TOOL_META } from './registry';

export default function ToolsHub() {
  const { t } = useTranslation('tools');
  const [params] = useSearchParams();
  const clientId = params.get('client');
  const client = get('client', clientId ?? undefined);
  const intros = useContent('tools').intros;
  const qs = params.toString() ? `?${params.toString()}` : '';
  const groups = ['motivation', 'coping', 'cognitive', 'skills'] as const;

  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        {...(client ? { eyebrow: <span className="pii">{t('forClient', { code: client.code })}</span> } : {})}
      />
      {groups.map((g) => (
        <section key={g}>
          <SectionTitle>{t(`groups.${g}`)}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_META.filter((m) => m.group === g).map(({ id, icon: Icon }) => (
              <CardLink key={id} to={`/tools/${id}${qs}`}>
                <div className="flex items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-fg transition group-hover:scale-105">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="font-serif text-lg font-semibold">{t(`names.${id}`)}</div>
                    <p className="mt-0.5 line-clamp-3 text-sm text-muted">{intros[id]?.adult}</p>
                  </div>
                </div>
                {['urgeSurfing', 'readinessRuler', 'scaling', 'thoughtRecord'].includes(id) && (
                  <Badge tone="blue" className="mt-3">
                    {t('chartable')}
                  </Badge>
                )}
              </CardLink>
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}
