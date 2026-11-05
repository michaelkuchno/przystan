import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Quote, CheckCircle2, AlertTriangle, Wrench, BookMarked, Clock } from 'lucide-react';
import { Card, Badge } from '@/components/ui/core';
import { ReviewBadge } from '@/components/ui/page';
import { ExplainButtons } from '@/features/ai/ExplainButtons';
import type { KnowledgeCard } from '@/content/types';

export function KnowledgeCardView({ card }: { card: KnowledgeCard }) {
  const { t } = useTranslation('knowledge');
  const block = (icon: React.ReactNode, title: string, items: string[], tone = '') =>
    items.length > 0 && (
      <Card className={tone}>
        <h3 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold">
          {icon}
          {title}
        </h3>
        <ul className="space-y-1.5 text-[length:calc(0.95rem*var(--fs-body))] leading-relaxed">
          {items.map((x) => (
            <li key={x} className="flex gap-2">
              <span className="text-muted" aria-hidden>
                •
              </span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </Card>
    );
  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReviewBadge id={card.id} status={card.reviewStatus} />
        {card.tags.map((tag) => (
          <Badge key={tag}>#{tag}</Badge>
        ))}
      </div>
      <Card className="border-primary/25 bg-primary-soft/40">
        <p className="font-serif text-lg leading-relaxed">{card.essence}</p>
      </Card>
      <ExplainButtons
        title={card.title}
        text={[card.essence, ...card.whenToUse, ...card.techniques, ...card.pitfalls].join('\n')}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {block(<Clock className="size-4 text-blue" aria-hidden />, t('whenToUse'), card.whenToUse)}
        {block(<Wrench className="size-4 text-primary" aria-hidden />, t('techniques'), card.techniques)}
      </div>
      {card.phrases.length > 0 && (
        <Card>
          <h3 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold">
            <Quote className="size-4 text-accent" aria-hidden />
            {t('phrases')}
          </h3>
          <ul className="space-y-2">
            {card.phrases.map((p) => (
              <li key={p} className="rounded-xl bg-surface-2/70 px-3 py-2 font-serif italic">
                „{p}”
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {block(<AlertTriangle className="size-4 text-warn" aria-hidden />, t('pitfalls'), card.pitfalls, 'border-warn/25')}
        <Card>
          <h3 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold">
            <BookMarked className="size-4 text-muted" aria-hidden />
            {t('sources')}
          </h3>
          <ul className="space-y-1.5 text-sm">
            {card.sources.map((s) => (
              <li key={`${s.authors}-${s.title}`}>
                {s.authors} ({s.year}). <em>{s.title}</em>
                {s.publisher ? `. ${s.publisher}` : ''}.
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <CheckCircle2 className="size-3.5" aria-hidden /> {t('ownWords')}
      </p>
    </article>
  );
}

export function KnowledgeTile({ card, to }: { card: KnowledgeCard; to: string }) {
  return (
    <Link
      to={to}
      className="group block rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="font-serif text-lg leading-snug font-semibold">{card.title}</div>
      <p className="mt-1 line-clamp-3 text-sm text-muted">{card.essence}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {card.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs text-muted">
            #{tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
