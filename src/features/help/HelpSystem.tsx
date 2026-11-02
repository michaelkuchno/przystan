import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Compass, RotateCcw, Siren, ListOrdered, Building2, Scale } from 'lucide-react';
import { Page, PageHeader, Notice, ReviewBadge } from '@/components/ui/page';
import { Card, Badge, Button, SectionTitle } from '@/components/ui/core';
import { Tabs } from '@/components/ui/overlay';
import { useContent } from '@/content/ContentProvider';
import { findPaths, type ReferralAnswers } from '@/lib/referral';
import { cn } from '@/components/ui/cn';
import type { Institution, InstitutionCategory } from '@/content/types';
import { CrisisList } from '@/features/settings/Crisis';

function InstitutionCard({ i }: { i: Institution }) {
  const { t } = useTranslation('help');
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-sans text-base font-semibold">{i.name}</h3>
        <ReviewBadge id={i.id} status={i.reviewStatus} />
      </div>
      <p className="text-sm">{i.role}</p>
      <dl className="grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-muted">{t('forWhom')}</dt>
          <dd>{i.forWhom}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">{t('howToAccess')}</dt>
          <dd>{i.howToAccess}</dd>
        </div>
      </dl>
    </Card>
  );
}

function Wizard() {
  const { t } = useTranslation('help');
  const help = useContent('helpsystem');
  const [answers, setAnswers] = useState<ReferralAnswers>({});
  const qs = help.referral.questions;
  const current = qs.find((q) => !answers[q.id]);
  const paths = useMemo(() => (current ? [] : findPaths(help, answers)), [current, help, answers]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {qs.map((q) => {
          const a = answers[q.id];
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                const next = { ...answers };
                delete next[q.id];
                setAnswers(next);
              }}
              disabled={!a}
              className={cn(
                'min-h-11 rounded-full border px-3 text-sm',
                a ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-dashed border-line text-muted',
              )}
            >
              {a ? q.options.find((o) => o.id === a)?.label : q.text}
            </button>
          );
        })}
        {Object.keys(answers).length > 0 && (
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setAnswers({})}>
            {t('restart')}
          </Button>
        )}
      </div>

      {current ? (
        <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="text-xs font-semibold tracking-wider text-accent uppercase">
              {t('question', { n: qs.indexOf(current) + 1, total: qs.length })}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{current.text}</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {current.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [current.id]: o.id })}
                  className="min-h-14 rounded-2xl border border-line bg-surface px-4 text-left font-medium transition hover:border-primary hover:bg-primary-soft/40"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {paths.map((p, idx) => (
            <motion.div
              key={p.rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <Card className={cn(p.rule.when.urgency?.includes('crisis') && 'border-accent/50 bg-accent-soft/30')}>
                <div className="flex items-start gap-3">
                  {p.rule.when.urgency?.includes('crisis') ? (
                    <Siren className="size-6 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <Compass className="size-6 shrink-0 text-primary" aria-hidden />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{p.rule.title}</h3>
                    {p.rule.note && <p className="mt-1 text-sm text-muted">{p.rule.note}</p>}
                  </div>
                  <Badge tone={idx === 0 ? 'primary' : 'neutral'}>{idx === 0 ? t('bestMatch') : t('alsoConsider')}</Badge>
                </div>
                <h4 className="mt-4 mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
                  <ListOrdered className="size-4" aria-hidden /> {t('steps')}
                </h4>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {p.rule.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <h4 className="mt-4 mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
                  <Building2 className="size-4" aria-hidden /> {t('institutions')}
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {p.institutions.map((i) => (
                    <div key={i.id} className="rounded-xl bg-surface-2/70 p-3 text-sm">
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-muted">{i.role}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
          <Notice>{t('wizardNote')}</Notice>
        </div>
      )}
    </div>
  );
}

const CATS: InstitutionCategory[] = ['central', 'treatment', 'social', 'justice', 'education', 'local', 'selfHelp', 'phone'];

export default function HelpSystem() {
  const { t } = useTranslation('help');
  const { tab = 'referral' } = useParams();
  const nav = useNavigate();
  const help = useContent('helpsystem');
  const [cat, setCat] = useState<InstitutionCategory | 'all'>('all');

  const tabs = [
    { value: 'referral', label: t('tabs.referral'), content: <Wizard /> },
    {
      value: 'map',
      label: t('tabs.map'),
      content: (
        <div className="space-y-4">
          <p className="leading-relaxed">{help.intro}</p>
          <div className="flex flex-wrap gap-2">
            {(['all', ...CATS] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
                className={cn(
                  'min-h-11 rounded-full border px-3.5 text-sm',
                  cat === c ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface',
                )}
              >
                {t(`cat.${c}`)}{' '}
                {c !== 'all' && <span className="opacity-70">({help.institutions.filter((i) => i.category === c).length})</span>}
              </button>
            ))}
          </div>
          {CATS.filter((c) => cat === 'all' || c === cat).map((c) => {
            const list = help.institutions.filter((i) => i.category === c);
            if (!list.length) return null;
            return (
              <section key={c}>
                <SectionTitle>{t(`cat.${c}`)}</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((i) => (
                    <InstitutionCard key={i.id} i={i} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ),
    },
    {
      value: 'law',
      label: t('tabs.law'),
      content: (
        <div className="space-y-3">
          <Notice tone="warn" icon={<Scale aria-hidden />}>
            {t('lawNote')}
          </Notice>
          {help.legal.map((l) => (
            <Card key={l.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-sans text-lg font-semibold">{l.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge>{t('stateAsOf', { date: l.stateAsOf })}</Badge>
                  <ReviewBadge id={l.id} status={l.reviewStatus} />
                </div>
              </div>
              <p className="mt-2 leading-relaxed">{l.summary}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {l.keyPoints.map((k) => (
                  <li key={k}>• {k}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ),
    },
    { value: 'crisis', label: t('tabs.crisis'), content: <CrisisList /> },
  ];

  return (
    <Page wide>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {help.countryNote && <Notice className="mb-4">{help.countryNote}</Notice>}
      <Tabs tabs={tabs} value={tab} onChange={(v) => nav(`/help/${v}`, { replace: true })} />
    </Page>
  );
}
