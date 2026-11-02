import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChefHat, Plus, Clock } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, EmptyState, SectionTitle } from '@/components/ui/core';
import { useStore, all, save, uid } from '@/lib/store';
import { useContent } from '@/content/ContentProvider';
import type { Recipe } from '@/domain/types';
import type { SessionTemplate, Ingredient } from '@/content/types';

export function recipeFromTemplate(tpl: SessionTemplate | undefined, ingredients: Ingredient[]): Recipe {
  const items =
    tpl?.items.map((it) => {
      const ing = ingredients.find((i) => i.id === it.ingredientId);
      return { id: uid(), ingredientId: it.ingredientId, title: ing?.title ?? it.ingredientId, minutes: it.minutes, note: '' };
    }) ?? [];
  return {
    id: uid(),
    title: tpl?.title ?? '',
    goal: tpl?.goal ?? '',
    audience: tpl?.audience ?? '',
    durationMin: Math.max(45, items.reduce((s, i) => s + i.minutes, 0)),
    items,
    ...(tpl ? { templateId: tpl.id } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export default function RecipesList() {
  const { t } = useTranslation('recipes');
  const nav = useNavigate();
  const recipes = useStore(() => all('recipe')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const { sessionTemplates, ingredients } = useContent('templates');

  const create = async (tpl?: SessionTemplate) => {
    const r = recipeFromTemplate(tpl, ingredients);
    await save('recipe', r);
    nav(`/recipes/${r.id}`);
  };

  return (
    <Page wide>
      <PageHeader
        back="/meetings"
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => void create()}>
            {t('new')}
          </Button>
        }
      />
      <SectionTitle>{t('mine')}</SectionTitle>
      {recipes.length === 0 ? (
        <EmptyState icon={<ChefHat />} title={t('emptyTitle')} text={t('emptyText')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => nav(`/recipes/${r.id}`)}
              className="recipe-card rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
            >
              <ChefHat className="size-6 text-accent" aria-hidden />
              <div className="mt-2 font-serif text-lg font-semibold">{r.title || t('untitled')}</div>
              <div className="mt-1 line-clamp-2 text-sm text-muted">{r.goal}</div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <Clock className="size-4" aria-hidden /> {r.items.reduce((s, i) => s + i.minutes, 0)} min · {t('steps', { count: r.items.length })}
              </div>
            </button>
          ))}
        </div>
      )}
      <SectionTitle>{t('templates')}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessionTemplates.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col">
            <div className="text-xs font-semibold tracking-wide text-accent uppercase">{t('template')}</div>
            <div className="mt-1 font-serif text-lg font-semibold">{tpl.title}</div>
            <p className="mt-1 flex-1 text-sm text-muted">{tpl.goal}</p>
            <div className="mt-2 text-xs text-muted">
              {tpl.audience} · {tpl.items.reduce((s, i) => s + i.minutes, 0)} min
            </div>
            <Button className="mt-3" variant="soft" size="sm" onClick={() => void create(tpl)}>
              {t('useTemplate')}
            </Button>
          </Card>
        ))}
      </div>
    </Page>
  );
}
