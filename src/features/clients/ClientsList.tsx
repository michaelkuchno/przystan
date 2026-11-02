import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Users, SlidersHorizontal } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { ButtonLink, EmptyState, List, ListRow, Avatar, Badge, Button } from '@/components/ui/core';
import { TextInput, Chips, SelectField } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { useStore, all } from '@/lib/store';
import { PROBLEMS, STAGES, WORK_CONTEXTS, type ClientStatus, type ProblemId, type Stage, type WorkContext } from '@/domain/types';
import { useAttention } from '@/features/dashboard/Dashboard';

type Sort = 'code' | 'updated' | 'stage';

export default function ClientsList() {
  const { t } = useTranslation('clients');
  const clients = useStore(() => all('client'));
  const flags = useAttention();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<WorkContext[]>([]);
  const [problems, setProblems] = useState<ProblemId[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [status, setStatus] = useState<ClientStatus[]>(['active']);
  const [sort, setSort] = useState<Sort>('code');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients
      .filter((c) => !needle || `${c.code} ${c.fullName ?? ''}`.toLowerCase().includes(needle))
      .filter((c) => !ctx.length || ctx.includes(c.context))
      .filter((c) => !problems.length || c.problems.some((p) => problems.includes(p)))
      .filter((c) => !stages.length || stages.includes(c.stage))
      .filter((c) => !status.length || status.includes(c.status))
      .sort((a, b) =>
        sort === 'code'
          ? a.code.localeCompare(b.code)
          : sort === 'updated'
            ? b.updatedAt.localeCompare(a.updatedAt)
            : STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage),
      );
  }, [clients, q, ctx, problems, stages, status, sort]);

  const activeFilters = ctx.length + problems.length + stages.length + (status.length === 1 && status[0] === 'active' ? 0 : 1);

  return (
    <Page>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: clients.length })}
        actions={
          <ButtonLink to="/clients/new" icon={<Plus className="size-4" />}>
            {t('add')}
          </ButtonLink>
        }
      />
      {clients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={t('emptyTitle')}
          text={t('emptyText')}
          action={
            <ButtonLink to="/clients/new" icon={<Plus className="size-4" />}>
              {t('add')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <label htmlFor="client-search" className="sr-only">
                {t('search')}
              </label>
              <TextInput id="client-search" className="pl-9" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={() => setOpen(true)} icon={<SlidersHorizontal className="size-4" />}>
              {t('filters')}
              {activeFilters > 0 && <Badge tone="primary">{activeFilters}</Badge>}
            </Button>
          </div>
          {list.length === 0 ? (
            <EmptyState title={t('noResults')} text={t('noResultsText')} />
          ) : (
            <List>
              {list.map((c) => {
                const f = flags.filter((x) => x.clientId === c.id);
                return (
                  <ListRow
                    key={c.id}
                    to={`/clients/${c.id}`}
                    leading={<Avatar label={c.code} tone={c.isGroup ? 'blue' : 'primary'} />}
                    title={<span className="pii">{c.code}</span>}
                    subtitle={
                      <span className="flex flex-wrap gap-1.5">
                        <span>{t(`enums:context.${c.context}`)}</span>
                        <span aria-hidden>·</span>
                        <span>{c.problems.map((p) => t(`enums:problem.${p}`)).join(', ')}</span>
                      </span>
                    }
                    trailing={
                      <span className="flex flex-col items-end gap-1">
                        <Badge tone="blue">{t(`enums:stage.${c.stage}`)}</Badge>
                        {f.length > 0 && <Badge tone="accent">{t('attention', { count: f.length })}</Badge>}
                      </span>
                    }
                  />
                );
              })}
            </List>
          )}
        </>
      )}

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('filters')}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCtx([]);
                setProblems([]);
                setStages([]);
                setStatus(['active']);
              }}
            >
              {t('resetFilters')}
            </Button>
            <Button onClick={() => setOpen(false)}>{t('showResults', { count: list.length })}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <SelectField<Sort>
            label={t('sort')}
            value={sort}
            onChange={setSort}
            options={(['code', 'updated', 'stage'] as const).map((s) => ({ value: s, label: t(`sortBy.${s}`) }))}
          />
          <Chips
            label={t('fields.status')}
            multiple
            value={status}
            onChange={setStatus}
            options={(['active', 'paused', 'closed'] as const).map((s) => ({ value: s, label: t(`enums:status.${s}`) }))}
          />
          <Chips
            label={t('fields.context')}
            multiple
            value={ctx}
            onChange={setCtx}
            options={WORK_CONTEXTS.map((c) => ({ value: c, label: t(`enums:context.${c}`) }))}
          />
          <Chips
            label={t('fields.problems')}
            multiple
            value={problems}
            onChange={setProblems}
            options={PROBLEMS.map((c) => ({ value: c, label: t(`enums:problem.${c}`) }))}
          />
          <Chips
            label={t('fields.stage')}
            multiple
            value={stages}
            onChange={setStages}
            options={STAGES.map((c) => ({ value: c, label: t(`enums:stage.${c}`) }))}
          />
        </div>
      </Sheet>
    </Page>
  );
}
