import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, RotateCcw, ThumbsUp, ThumbsDown, MinusCircle, Play, HeartHandshake, TrendingUp } from 'lucide-react';
import { Page, PageHeader, ReviewBadge } from '@/components/ui/page';
import { Button, ButtonLink, Card, EmptyState, Badge } from '@/components/ui/core';
import { usePrefs } from '@/lib/prefs';
import { useContent } from '@/content/ContentProvider';
import { save, uid } from '@/lib/store';
import { haptic } from '@/lib/platform';
import { todayIso } from '@/lib/platform';
import { cn } from '@/components/ui/cn';
import { computeStats, isConsistent, isInconsistent, type SimStep } from './sim';
import { Bar, MOOD_EMOJI, StatsGrid } from './simUi';
import type { Scenario, ScenarioNode } from '@/content/types';

function Run({ scenario }: { scenario: Scenario }) {
  const { t } = useTranslation(['simulator', 'ai']);
  const aiMode = usePrefs().ai.mode;
  const nodes = useMemo(() => new Map(scenario.nodes.map((n) => [n.id, n])), [scenario]);
  const [started, setStarted] = useState(false);
  const [steps, setSteps] = useState<SimStep[]>([]);
  const [current, setCurrent] = useState(scenario.start);
  const [flash, setFlash] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const node = nodes.get(current)!;
  const stats = computeStats(scenario, steps);
  const talkTotal = stats.changeTalk + stats.sustainTalk;
  const changePct = talkTotal ? (stats.changeTalk / talkTotal) * 100 : 50;
  const savedRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [steps.length]);

  useEffect(() => {
    if (node.ending && !savedRef.current) {
      savedRef.current = true;
      void save('simRun', {
        id: uid(),
        scenarioId: scenario.id,
        date: todayIso(),
        choices: steps.map((s) => s.option.id),
        alliance: stats.alliance,
        changeTalk: stats.changeTalk,
        sustainTalk: stats.sustainTalk,
      }).catch(() => undefined);
      void haptic(node.ending.quality === 'good' ? 'success' : 'medium');
    }
  }, [node, scenario.id, steps, stats.alliance, stats.changeTalk, stats.sustainTalk]);

  const choose = (i: number) => {
    const option = node.options[i]!;
    setFlash(option.alliance);
    setTimeout(() => setFlash(null), 700);
    void haptic(option.alliance > 0 ? 'light' : option.alliance < 0 ? 'warning' : 'light');
    setSteps([...steps, { nodeId: node.id, option }]);
    setCurrent(option.next);
  };

  const restart = () => {
    setSteps([]);
    setCurrent(scenario.start);
    savedRef.current = false;
  };

  if (!started)
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue font-serif text-3xl font-bold text-primary-fg">
          {scenario.persona.name.slice(0, 1)}
        </div>
        <h2 className="mt-3 text-2xl font-semibold">
          {scenario.persona.name}, {scenario.persona.age}
        </h2>
        <p className="mt-1 text-muted">{scenario.persona.description}</p>
        <p className="mt-4 leading-relaxed">{scenario.intro}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button size="lg" icon={<Play className="size-5" />} onClick={() => setStarted(true)}>
            {t('start')}
          </Button>
          {aiMode !== 'off' && (
            <ButtonLink
              size="lg"
              variant="soft"
              to={`/simulator/${scenario.id}/live`}
              icon={<Sparkles className="size-5" aria-hidden />}
            >
              {t('ai:sim.live')}
            </ButtonLink>
          )}
        </div>
        {aiMode !== 'off' && <p className="mt-3 text-sm text-muted">{t('ai:sim.liveText')}</p>}
      </Card>
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
      <div>
        <div className="space-y-3" aria-live="polite">
          {[...steps.map((s) => s.nodeId), ...(node ? [] : [])].map((nid, i) => {
            const n = nodes.get(nid)!;
            const s = steps[i]!;
            return (
              <div key={i} className="space-y-3">
                <ClientBubble node={n} name={scenario.persona.name} />
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-3 text-primary-fg"
                >
                  {s.option.text}
                </motion.div>
              </div>
            );
          })}
          <ClientBubble node={node} name={scenario.persona.name} />
        </div>

        <AnimatePresence mode="wait">
          {node.ending ? (
            <motion.div key="end" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
              <Card
                className={cn(
                  node.ending.quality === 'good'
                    ? 'border-ok/40 bg-ok-soft/40'
                    : node.ending.quality === 'poor'
                      ? 'border-accent/40 bg-accent-soft/40'
                      : 'border-warn/40 bg-warn-soft/40',
                )}
              >
                <Badge tone={node.ending.quality === 'good' ? 'ok' : node.ending.quality === 'poor' ? 'accent' : 'warn'}>
                  {t(`quality.${node.ending.quality}`)}
                </Badge>
                <h2 className="mt-2 text-2xl font-semibold">{node.ending.title}</h2>
                <p className="mt-1 leading-relaxed">{node.ending.text}</p>
              </Card>
              <Card>
                <h3 className="mb-3 text-lg font-semibold">{t('summary')}</h3>
                <StatsGrid stats={stats} />
              </Card>
              <Card>
                <h3 className="mb-3 text-lg font-semibold">{t('decisions')}</h3>
                <ol className="space-y-3">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 shrink-0">
                        {isInconsistent(s.option.category) ? (
                          <ThumbsDown className="size-5 text-accent" aria-label={t('inconsistent')} />
                        ) : isConsistent(s.option.category) ? (
                          <ThumbsUp className="size-5 text-ok" aria-label={t('consistent')} />
                        ) : (
                          <MinusCircle className="size-5 text-warn" aria-label={t('neutral')} />
                        )}
                      </span>
                      <div className="text-sm">
                        <div className="font-medium">„{s.option.text}”</div>
                        <div className="mt-0.5">
                          <Badge tone="blue">{t(`miti.${s.option.category}`)}</Badge>
                        </div>
                        <p className="mt-1 text-muted">{s.option.feedback}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
              <Button size="lg" icon={<RotateCcw className="size-5" />} onClick={restart}>
                {t('again')}
              </Button>
            </motion.div>
          ) : (
            <motion.div key={node.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-2">
              <div className="text-sm font-medium text-muted">{t('yourResponse')}</div>
              {node.options.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => choose(i)}
                  className="block min-h-14 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  {o.text}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="space-y-4">
          <Bar
            label={t('alliance')}
            value={stats.alliance}
            tone="primary"
            icon={<HeartHandshake className="size-3.5" aria-hidden />}
          />
          <Bar label={t('changeTalk')} value={changePct} tone="blue" icon={<TrendingUp className="size-3.5" aria-hidden />} />
          <div className="flex justify-between text-xs text-muted">
            <span>
              {t('change')}: {stats.changeTalk}
            </span>
            <span>
              {t('sustain')}: {stats.sustainTalk}
            </span>
          </div>
          <AnimatePresence>
            {flash !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'rounded-xl px-3 py-2 text-center text-sm font-semibold',
                  flash > 0 ? 'bg-ok-soft text-ok' : flash < 0 ? 'bg-accent-soft text-accent-soft-fg' : 'bg-surface-2',
                )}
              >
                {flash > 0 ? t('flashUp') : flash < 0 ? t('flashDown') : t('flashSame')}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="border-t border-line pt-3">
            <ReviewBadge id={scenario.id} status={scenario.reviewStatus} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ClientBubble({ node, name }: { node: ScenarioNode; name: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex max-w-[90%] items-end gap-2">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl"
        role="img"
        aria-label={node.mood}
      >
        {MOOD_EMOJI[node.mood]}
      </span>
      <div className="rounded-3xl rounded-bl-md border border-line bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-muted">{name}</div>
        <div className="leading-relaxed">{node.client}</div>
      </div>
    </motion.div>
  );
}

export default function SimulatorRun() {
  const { t } = useTranslation('simulator');
  const { id } = useParams();
  const scenario = useContent('scenarios').scenarios.find((s) => s.id === id);
  return (
    <Page wide>
      <PageHeader back="/simulator" eyebrow={t('title')} title={scenario?.title ?? t('notFound')} />
      {scenario ? <Run key={scenario.id} scenario={scenario} /> : <EmptyState title={t('notFound')} />}
    </Page>
  );
}
