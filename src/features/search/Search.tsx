import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, EmptyState } from '@/components/ui/core';
import { TextInput } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import { useStore, all } from '@/lib/store';
import { TOOL_META } from '@/features/tools/registry';
import { buildDocs, search } from './searchIndex';

export default function Search() {
  const { t } = useTranslation('search');
  const content = useContent();
  const clients = useStore(() => all('client'));
  const meetings = useStore(() => all('meeting'));
  const recipes = useStore(() => all('recipe'));
  const programs = useStore(() => all('prevention'));
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const toolNames = useMemo(() => Object.fromEntries(TOOL_META.map((m) => [m.id, t(`tools:names.${m.id}`)])), [t]);
  const docs = useMemo(
    () => buildDocs(content, { clients, meetings, recipes, programs }, toolNames),
    [content, clients, meetings, recipes, programs, toolNames],
  );
  const hits = useMemo(() => search(docs, q), [docs, q]);

  return (
    <Page>
      <PageHeader back title={t('title')} />
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="global-search" className="sr-only">
          {t('placeholder')}
        </label>
        <TextInput
          ref={ref}
          id="global-search"
          type="search"
          className="min-h-13 pl-11 text-lg"
          placeholder={t('placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {q.trim().length < 2 ? (
        <p className="text-sm text-muted">{t('hint')}</p>
      ) : hits.length === 0 ? (
        <EmptyState title={t('noResults')} />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            {t('results', { count: hits.length })}
          </p>
          <ul className="space-y-2">
            {hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link to={h.to} className="block rounded-2xl border border-line bg-surface p-3 hover:border-primary/40">
                  <div className="flex items-center gap-2">
                    <Badge tone={h.kind === 'client' || h.kind === 'meeting' ? 'accent' : 'blue'}>{t(`kind.${h.kind}`)}</Badge>
                    <span className={h.kind === 'client' ? 'pii font-medium' : 'font-medium'}>{h.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{h.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
