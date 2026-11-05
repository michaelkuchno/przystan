import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff, NotebookText, Pin, Plus, Search as SearchIcon, Users } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Badge, ButtonLink, CardLink, EmptyState } from '@/components/ui/core';
import { Chips, TextInput } from '@/components/ui/form';
import { useStore, all, get } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { fmtDate } from '@/lib/format';
import { allTags, filterNotes } from './notes';

export default function NotesList() {
  const { t } = useTranslation('notes');
  const { presentation } = usePrefs();
  const notes = useStore(() => all('note'));
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'note' | 'supervision'>('all');
  const [tag, setTag] = useState<string | null>(null);
  const list = useMemo(() => filterNotes(notes, q, type, tag), [notes, q, type, tag]);
  const tags = useMemo(() => allTags(notes), [notes]);

  return (
    <Page>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          presentation ? undefined : (
            <>
              <ButtonLink to="/notes/new?type=supervision" variant="secondary" icon={<Users className="size-4" />}>
                {t('newSupervision')}
              </ButtonLink>
              <ButtonLink to="/notes/new" icon={<Plus className="size-4" />}>
                {t('new')}
              </ButtonLink>
            </>
          )
        }
      />
      {presentation ? (
        // private notes never appear on a projected screen
        <EmptyState icon={<EyeOff />} title={t('hiddenTitle')} text={t('hiddenText')} />
      ) : (
        <>
          <Notice className="mb-4">{t('privacy')}</Notice>
          <div className="relative mb-3">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <TextInput
              type="search"
              className="pl-10"
              placeholder={t('search')}
              aria-label={t('search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Chips
            className="mb-3"
            value={type}
            onChange={(v) => v[0] && setType(v[0])}
            options={[
              { value: 'all', label: t('filter.all') },
              { value: 'note', label: t('filter.note') },
              { value: 'supervision', label: t('filter.supervision') },
            ]}
          />
          {tags.length > 0 && (
            <Chips
              className="mb-4"
              label={t('tags')}
              value={tag ? [tag] : []}
              multiple
              onChange={(v) => setTag(v.filter((x) => x !== tag)[0] ?? null)}
              options={tags.map((x) => ({ value: x, label: `#${x}` }))}
            />
          )}
          {list.length === 0 ? (
            <EmptyState
              icon={<NotebookText />}
              title={notes.length ? t('noResults') : t('emptyTitle')}
              text={notes.length ? undefined : t('emptyText')}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((n) => {
                const client = get('client', n.clientId);
                const openTasks = (n.tasks ?? []).filter((x) => !x.done).length;
                return (
                  <CardLink key={n.id} to={`/notes/${n.id}`}>
                    <div className="flex items-start gap-2">
                      {n.pinned && <Pin className="mt-1 size-4 shrink-0 text-accent" aria-label={t('pinned')} />}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{n.title || t('untitled')}</div>
                        <div className="text-xs text-muted">
                          {n.type === 'supervision' ? `${t('filter.supervision')} · ` : ''}
                          {fmtDate(n.date ?? n.updatedAt)}
                        </div>
                      </div>
                    </div>
                    {(n.conclusions || n.body) && <p className="mt-2 line-clamp-3 text-sm">{n.conclusions || n.body}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {client && (
                        <Badge tone="primary">
                          <span className="pii">{client.code}</span>
                        </Badge>
                      )}
                      {openTasks > 0 && <Badge tone="warn">{t('openTasks', { count: openTasks })}</Badge>}
                      {n.tags.map((x) => (
                        <Badge key={x}>#{x}</Badge>
                      ))}
                    </div>
                  </CardLink>
                );
              })}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
