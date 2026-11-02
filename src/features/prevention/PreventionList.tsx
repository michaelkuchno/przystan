import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Sprout, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Page, PageHeader, ReviewBadge } from '@/components/ui/page';
import { Button, EmptyState, Badge, Card, SectionTitle } from '@/components/ui/core';
import { useStore, all, save, uid } from '@/lib/store';
import { useContent } from '@/content/ContentProvider';
import type { PreventionProgram } from '@/domain/types';

export function newProgram(): PreventionProgram {
  return {
    id: uid(),
    title: '',
    setting: '',
    needs: '',
    resources: '',
    targetGroup: '',
    level: 'universal',
    riskFactors: [],
    protectiveFactors: [],
    generalGoal: '',
    specificGoals: [],
    strategies: [],
    recipeIds: [],
    schedule: [],
    budgetResources: '',
    indicators: [],
    checklist: {},
    updatedAt: new Date().toISOString(),
  };
}

export default function PreventionList() {
  const { t } = useTranslation('prevention');
  const nav = useNavigate();
  const programs = useStore(() => all('prevention')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const content = useContent('prevention');
  const create = async () => {
    const p = newProgram();
    await save('prevention', p);
    nav(`/prevention/${p.id}`);
  };
  return (
    <Page wide>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => void create()}>
            {t('new')}
          </Button>
        }
      />
      {programs.length === 0 ? (
        <EmptyState icon={<Sprout />} title={t('emptyTitle')} text={t('emptyText')} action={<Button onClick={() => void create()}>{t('new')}</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {programs.map((p) => (
            <button key={p.id} type="button" onClick={() => nav(`/prevention/${p.id}`)} className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
              <Badge tone="primary">{content.levels.find((l) => l.id === p.level)?.title}</Badge>
              <div className="mt-2 font-serif text-xl font-semibold">{p.title || t('untitled')}</div>
              <div className="mt-1 text-sm text-muted">{p.targetGroup}</div>
              <div className="mt-3 text-xs text-muted">
                {t('summary', { goals: p.specificGoals.length, strategies: p.strategies.length, indicators: p.indicators.length })}
              </div>
            </button>
          ))}
        </div>
      )}

      <SectionTitle>{t('levelsTitle')}</SectionTitle>
      <div className="grid gap-3 md:grid-cols-3">
        {content.levels.map((l) => (
          <Card key={l.id}>
            <div className="font-serif text-lg font-semibold">{l.title}</div>
            <p className="mt-1 text-sm">{l.description}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-muted">
              {l.examples.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <SectionTitle>{t('goodPracticeTitle')}</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {(['do', 'avoid'] as const).map((kind) => (
          <Card key={kind} className={kind === 'do' ? 'border-ok/30' : 'border-accent/30'}>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              {kind === 'do' ? <ThumbsUp className="size-5 text-ok" aria-hidden /> : <ThumbsDown className="size-5 text-accent" aria-hidden />}
              {t(kind === 'do' ? 'works' : 'avoid')}
            </h3>
            <ul className="space-y-3">
              {content.goodPractice
                .filter((g) => g.kind === kind)
                .map((g) => (
                  <li key={g.id} className="text-sm">
                    <div className="font-medium">{g.text}</div>
                    <div className="text-muted">{g.rationale}</div>
                    <div className="mt-0.5 text-xs text-muted italic">{g.sources.map((s) => `${s.authors} (${s.year})`).join('; ')}</div>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>

      <SectionTitle action={<ReviewBadge id="prevention-standards" status={content.standards.reviewStatus} />}>{content.standards.title}</SectionTitle>
      <Card className="space-y-3 leading-relaxed">
        {content.standards.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </Card>
    </Page>
  );
}
