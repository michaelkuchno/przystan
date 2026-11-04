import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { HeartHandshake, Lightbulb, RotateCcw, Send, Square, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, ButtonLink, Card, EmptyState } from '@/components/ui/core';
import { TextArea } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/components/ui/cn';
import { useContent } from '@/content/ContentProvider';
import { save, uid } from '@/lib/store';
import { haptic, todayIso } from '@/lib/platform';
import { usePrefs } from '@/lib/prefs';
import { currentRoute } from '@/lib/ai';
import { PROMPTS } from '@/lib/ai/prompts';
import { simTurnSchema, validateSimTurn, type SimTurn } from '@/lib/ai/tasks';
import type { ChatMessage } from '@/lib/ai/types';
import type { Scenario, ScenarioNode } from '@/content/types';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiBadge, AiErrorView, CrisisBox } from '@/features/ai/AiOutput';
import { DictateButton } from '@/features/ai/DictateButton';
import { isConsistent, isInconsistent, statsFrom } from './sim';
import { Bar, MOOD_EMOJI, StatsGrid } from './simUi';

/** Max trainee utterances in one live conversation (cost / free-tier limits, focus). */
export const MAX_TURNS = 12;

interface Turn {
  user: string;
  ai: SimTurn;
}

const VOICE_LANG = { pl: 'pl-PL', en: 'en-GB', de: 'de-CH' } as const;

function speak(text: string, lang: keyof typeof VOICE_LANG) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[lang];
  u.rate = 1;
  speechSynthesis.speak(u);
}

/** Up to five typical lines of the persona – the model imitates the voice. */
function sampleLines(s: Scenario): string[] {
  return s.nodes
    .filter((n) => !n.ending)
    .map((n) => n.client)
    .slice(0, 5);
}

function Bubble({ who, mood, children }: { who: string; mood: ScenarioNode['mood']; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex max-w-[90%] items-end gap-2">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl"
        role="img"
        aria-label={mood}
      >
        {MOOD_EMOJI[mood]}
      </span>
      <div className="rounded-3xl rounded-bl-md border border-line bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-muted">{who}</div>
        <div className="leading-relaxed">{children}</div>
      </div>
    </motion.div>
  );
}

function Verdict({ ai }: { ai: SimTurn }) {
  const { t } = useTranslation(['simulator', 'ai']);
  const tone = isInconsistent(ai.category) ? 'accent' : isConsistent(ai.category) ? 'ok' : 'warn';
  return (
    <div
      className="ml-auto max-w-[85%] space-y-1 rounded-2xl border border-line bg-surface-2 p-3 text-sm"
      data-testid="live-verdict"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{t(`miti.${ai.category}`)}</Badge>
        <span className="text-xs text-muted tabular-nums">{ai.alliance > 0 ? `+${ai.alliance}` : ai.alliance}</span>
      </div>
      {ai.feedback && (
        <p>
          <span className="font-medium">{t('ai:sim.coach')}:</span> {ai.feedback}
        </p>
      )}
      {ai.better && (
        <p className="flex gap-1.5 text-muted">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <span>
            <span className="font-medium">{t('ai:sim.better')}:</span> „{ai.better}”
          </span>
        </p>
      )}
    </div>
  );
}

function Live({ scenario }: { scenario: Scenario }) {
  const { t } = useTranslation(['simulator', 'ai']);
  const { lang, ai: aiPrefs } = usePrefs();
  const start = useMemo(() => scenario.nodes.find((n) => n.id === scenario.start)!, [scenario]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [voice, setVoice] = useState(aiPrefs.voice);
  const task = useAiTask<SimTurn>();
  const endRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);
  const stats = statsFrom(turns.map((x) => x.ai));
  const talkTotal = stats.changeTalk + stats.sustainTalk;
  const changePct = talkTotal ? (stats.changeTalk / talkTotal) * 100 : 50;
  const left = MAX_TURNS - turns.length;
  const busy = task.state.status === 'working';

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [turns.length, busy]);

  useEffect(() => () => void (typeof speechSynthesis !== 'undefined' && speechSynthesis.cancel()), []);

  useEffect(() => {
    if (!ended || savedRef.current || !turns.length) return;
    savedRef.current = true;
    void save('simRun', {
      id: uid(),
      scenarioId: scenario.id,
      date: todayIso(),
      choices: [],
      alliance: stats.alliance,
      changeTalk: stats.changeTalk,
      sustainTalk: stats.sustainTalk,
      live: turns.map((x) => ({ user: x.user, reply: x.ai.reply, category: x.ai.category, feedback: x.ai.feedback })),
    }).catch(() => undefined);
    void haptic('success');
  }, [ended, turns, scenario.id, stats.alliance, stats.changeTalk, stats.sustainTalk]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy || ended) return;
    const history: ChatMessage[] = [{ role: 'model', text: start.client }];
    for (const x of turns) history.push({ role: 'user', text: x.user }, { role: 'model', text: x.ai.reply });
    const system = PROMPTS.simulator(lang, {
      persona: `${scenario.persona.name}, ${scenario.persona.age}. ${scenario.persona.description}`,
      context: scenario.context,
      intro: scenario.intro,
      sample: sampleLines(scenario),
      turnsLeft: left,
    });
    const res = await task.run({
      sensitivity: 'study',
      texts: [text],
      build: ([u]) => ({
        system,
        messages: [...history, { role: 'user', text: u! }],
        schema: simTurnSchema,
        validate: validateSimTurn,
        maxTokens: 1200,
      }),
    });
    if (!res) return;
    setTurns((prev) => [...prev, { user: text, ai: res }]);
    setDraft('');
    void haptic(res.alliance > 0 ? 'light' : res.alliance < 0 ? 'warning' : 'light');
    if (voice) speak(res.reply, lang);
    if (res.end || left <= 1) setEnded(true);
  };

  const restart = () => {
    setTurns([]);
    setEnded(false);
    setDraft('');
    savedRef.current = false;
    task.reset();
  };

  const lastMood = turns.at(-1)?.ai.mood ?? start.mood;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
      <div>
        <Notice className="mb-4">{t('ai:sim.notice')}</Notice>
        <div className="space-y-3" aria-live="polite">
          <Bubble who={scenario.persona.name} mood={start.mood}>
            {start.client}
          </Bubble>
          {turns.map((x, i) => (
            <div key={i} className="space-y-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-3 text-primary-fg"
              >
                {x.user}
              </motion.div>
              <Verdict ai={x.ai} />
              <Bubble who={scenario.persona.name} mood={x.ai.mood}>
                {x.ai.reply}
              </Bubble>
            </div>
          ))}
          {task.state.crisis && <CrisisBox />}
          {task.state.status === 'error' && task.state.error && (
            <AiErrorView error={task.state.error} onRetry={() => void send()} />
          )}
        </div>

        <AnimatePresence mode="wait">
          {ended ? (
            <motion.div key="end" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
              <Card>
                <h2 className="mb-3 text-2xl font-semibold">{t('ai:sim.ended')}</h2>
                <StatsGrid stats={stats} />
                <p className="mt-3 text-sm text-muted">{t('ai:sim.summaryNote')}</p>
                <div className="mt-2">
                  <AiBadge where={task.state.where} />
                </div>
              </Card>
              <Button size="lg" icon={<RotateCcw className="size-5" />} onClick={restart}>
                {t('again')}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-2">
              <label htmlFor="live-input" className="text-sm font-medium text-muted">
                {t('yourResponse')}
              </label>
              <TextArea
                id="live-input"
                rows={3}
                value={draft}
                placeholder={t('ai:sim.placeholder')}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send();
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  icon={<Send className="size-4" aria-hidden />}
                  disabled={!draft.trim() || busy}
                  onClick={() => void send()}
                >
                  {busy ? t('ai:working') : t('ai:sim.send')}
                </Button>
                <DictateButton sensitivity="study" onText={(x) => setDraft((d) => (d ? `${d} ${x}` : x))} />
                {turns.length > 0 && (
                  <Button
                    variant="ghost"
                    icon={<Square className="size-4" aria-hidden />}
                    disabled={busy}
                    onClick={() => setEnded(true)}
                  >
                    {t('ai:sim.finish')}
                  </Button>
                )}
                <span className="ml-auto text-xs text-muted tabular-nums">{t('ai:sim.turnsLeft', { count: left })}</span>
              </div>
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
          <div className={cn('flex items-center justify-between border-t border-line pt-3 text-sm')}>
            <span className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {MOOD_EMOJI[lastMood]}
              </span>
              {scenario.persona.name}
            </span>
            {typeof speechSynthesis !== 'undefined' && (
              <Button
                size="sm"
                variant="ghost"
                aria-pressed={voice}
                icon={voice ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
                onClick={() => {
                  if (voice) speechSynthesis.cancel();
                  setVoice(!voice);
                }}
              >
                {t('ai:sim.voice')}
              </Button>
            )}
          </div>
        </Card>
      </div>
      {task.previewEl}
    </div>
  );
}

export default function SimulatorLive() {
  const { t } = useTranslation(['simulator', 'ai']);
  const { id } = useParams();
  const scenario = useContent('scenarios').scenarios.find((s) => s.id === id);
  usePrefs();
  const route = currentRoute('study');
  return (
    <Page wide>
      <PageHeader back={`/simulator/${id}`} eyebrow={t('ai:sim.live')} title={scenario?.title ?? t('notFound')} />
      {!scenario ? (
        <EmptyState title={t('notFound')} />
      ) : route.kind !== 'cloud' ? (
        <Card className="space-y-3">
          <Notice tone="warn">{t('ai:sim.requiresCloud')}</Notice>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/settings/ai">{t('ai:enable')}</ButtonLink>
            <ButtonLink to={`/simulator/${scenario.id}`} variant="secondary">
              {t('ai:sim.choice')}
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <Live key={scenario.id} scenario={scenario} />
      )}
      <p className="mt-6 text-xs text-muted">
        <Link to="/ai/info" className="underline">
          {t('ai:settings.info')}
        </Link>
      </p>
    </Page>
  );
}
