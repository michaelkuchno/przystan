import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Card } from '@/components/ui/core';
import { Logo } from '@/components/Logo';
import { useContent } from '@/content/ContentProvider';
import { useAllCards } from '@/features/knowledge/Knowledge';
import { INSTRUMENTS } from '@/lib/screening/instruments';
import type { Source } from '@/content/types';

function About() {
  const { t } = useTranslation('info');
  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4">
        <Logo className="size-16" />
        <div>
          <div className="font-serif text-2xl font-semibold">Przystań · Harbor</div>
          <div className="text-sm text-muted">{t('about.version', { v: __APP_VERSION__ })}</div>
        </div>
      </Card>
      <Notice tone="accent">
        <strong>{t('about.disclaimerTitle')}</strong> {t('about.disclaimer')}
      </Notice>
      {(t('about.paragraphs', { returnObjects: true }) as string[]).map((p) => (
        <p key={p} className="leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}

function Privacy() {
  const { t } = useTranslation('info');
  const items = t('privacy.items', { returnObjects: true }) as { q: string; a: string }[];
  return (
    <div className="space-y-3">
      <Notice>{t('privacy.lead')}</Notice>
      {items.map((i) => (
        <Card key={i.q}>
          <h2 className="font-sans text-base font-semibold">{i.q}</h2>
          <p className="mt-1 leading-relaxed text-fg/90">{i.a}</p>
        </Card>
      ))}
    </div>
  );
}

function Sources() {
  const { t } = useTranslation('info');
  const cards = useAllCards();
  const prevention = useContent('prevention');
  const all = new Map<string, Source>();
  for (const s of [...cards.flatMap((c) => c.sources), ...prevention.goodPractice.flatMap((g) => g.sources)])
    all.set(`${s.authors}|${s.title}`, s);
  const list = [...all.values()].sort((a, b) => a.authors.localeCompare(b.authors));
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-sans text-base font-semibold">{t('sources.screening')}</h2>
        <ul className="space-y-2 text-sm">
          {Object.values(INSTRUMENTS).map((i) => (
            <li key={i.id}>
              <strong>{i.id}:</strong> {i.source}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 font-sans text-base font-semibold">{t('sources.literature', { count: list.length })}</h2>
        <ul className="space-y-1.5 text-sm">
          {list.map((s) => (
            <li key={`${s.authors}-${s.title}`}>
              {s.authors} ({s.year}). <em>{s.title}</em>
              {s.publisher ? `. ${s.publisher}` : ''}.
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-muted">{t('sources.fonts')}</p>
    </div>
  );
}

export default function InfoPage() {
  const { t } = useTranslation('info');
  const { page = 'about' } = useParams();
  return (
    <Page>
      <PageHeader back title={t(`${page}.title`)} />
      {page === 'privacy' ? <Privacy /> : page === 'sources' ? <Sources /> : <About />}
    </Page>
  );
}
