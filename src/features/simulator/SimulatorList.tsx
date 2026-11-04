import { useTranslation } from 'react-i18next';
import { MessagesSquare, Trophy } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { CardLink, Badge } from '@/components/ui/core';
import { useContent } from '@/content/ContentProvider';
import { useStore, all } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';

export default function SimulatorList() {
  const { t } = useTranslation('simulator');
  const { scenarios } = useContent('scenarios');
  const runs = useStore(() => all('simRun'));
  const { country } = usePrefs();
  // scenarios set in the country of work first (stable order otherwise)
  const ordered = [...scenarios].sort(
    (a, b) => Number((b.country ?? 'PL') === country) - Number((a.country ?? 'PL') === country),
  );
  return (
    <Page wide>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Notice className="mb-5">{t('intro')}</Notice>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((s) => {
          const best = runs.filter((r) => r.scenarioId === s.id).reduce((m, r) => Math.max(m, r.alliance), -1);
          return (
            <CardLink key={s.id} to={`/simulator/${s.id}`}>
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue font-serif text-lg font-bold text-primary-fg">
                  {s.persona.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <div className="font-serif text-lg leading-snug font-semibold">{s.title}</div>
                  <div className="text-sm text-muted">
                    {s.persona.name}, {s.persona.age} · {t(`enums:context.${s.context}`)}
                  </div>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm">{s.intro}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={(s.country ?? 'PL') === 'CH' ? 'accent' : 'neutral'}>{t(`help:country.${s.country ?? 'PL'}`)}</Badge>
                <Badge tone="blue">
                  <MessagesSquare className="size-3" aria-hidden /> {t(`audience.${s.audience}`)}
                </Badge>
                {best >= 0 && (
                  <Badge tone="ok">
                    <Trophy className="size-3" aria-hidden /> {t('best', { n: best })}
                  </Badge>
                )}
              </div>
            </CardLink>
          );
        })}
      </div>
    </Page>
  );
}
