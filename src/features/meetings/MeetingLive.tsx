import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pause, Play, Square, CheckSquare2, Sparkles, ListChecks, Timer } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, EmptyState, Badge } from '@/components/ui/core';
import { TextArea } from '@/components/ui/form';
import { Sheet, useToast } from '@/components/ui/overlay';
import { get, save, useStore } from '@/lib/store';
import { haptic } from '@/lib/platform';
import { NoteForm } from './MeetingEditor';
import { cn } from '@/components/ui/cn';
import type { Meeting, ToolId } from '@/domain/types';

const QUICK_TOOLS: ToolId[] = ['readinessRuler', 'urgeSurfing', 'decisionalBalance', 'chainAnalysis', 'halt', 'scaling', 'grounding', 'breathing'];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MeetingLive() {
  const { t } = useTranslation('meetings');
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const stored = useStore(() => get('meeting', id));
  const [m, setM] = useState<Meeting | undefined>(stored);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checked, setChecked] = useState<number[]>([]);
  const [finishing, setFinishing] = useState(false);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const iv = setInterval(() => setElapsed(baseRef.current + Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000)), 500);
    return () => {
      clearInterval(iv);
      baseRef.current += Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
    };
  }, [running]);


  if (!m) return <Page><EmptyState title={t('notFound')} /></Page>;
  const client = get('client', m.clientId);
  // tools used are recorded by ToolRunner directly in the stored meeting
  const toolsUsed = stored?.toolsUsed ?? m.toolsUsed;
  const planned = m.durationMin * 60;
  const pct = Math.min(100, (elapsed / planned) * 100);
  const over = elapsed > planned;

  const persist = (next: Meeting) => {
    const merged = { ...next, toolsUsed: get('meeting', next.id)?.toolsUsed ?? next.toolsUsed };
    setM(merged);
    void save('meeting', merged);
  };

  const finish = async () => {
    const next: Meeting = { ...m, toolsUsed, status: 'done', durationMin: Math.max(1, Math.round(elapsed / 60)) || m.durationMin };
    await save('meeting', next);
    void haptic('success');
    toast({ text: t('finished'), tone: 'ok' });
    nav(client ? `/clients/${client.id}/meetings` : '/meetings', { replace: true });
  };

  return (
    <Page wide>
      <PageHeader
        back
        eyebrow={t('liveMode')}
        title={<span className="pii">{client?.code ?? m.title ?? t(`type.${m.type}`)}</span>}
        subtitle={t(`type.${m.type}`)}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card className="text-center">
            <Timer className="mx-auto size-6 text-muted" aria-hidden />
            <div className={cn('mt-1 font-serif text-6xl font-semibold tabular-nums', over ? 'text-accent' : 'text-fg')} role="timer" aria-live="off">
              {fmt(elapsed)}
            </div>
            <div className="text-sm text-muted">{t('of', { min: m.durationMin })}</div>
            <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-surface-3">
              <div className={cn('h-full rounded-full transition-all', over ? 'bg-accent' : 'bg-primary')} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                size="lg"
                variant={running ? 'secondary' : 'primary'}
                icon={running ? <Pause className="size-5" /> : <Play className="size-5" />}
                onClick={() => {
                  setRunning(!running);
                  void haptic('light');
                }}
              >
                {running ? t('pause') : elapsed ? t('resume') : t('start')}
              </Button>
              <Button size="lg" variant="accent" icon={<Square className="size-4" />} onClick={() => { setRunning(false); setFinishing(true); }}>
                {t('finish')}
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="size-5 text-primary" aria-hidden />
              {t('agenda')}
            </h2>
            {m.agenda.length === 0 ? (
              <p className="text-sm text-muted">{t('noAgenda')}</p>
            ) : (
              <ul className="space-y-1">
                {m.agenda.map((a, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked.includes(i)}
                      onClick={() => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2"
                    >
                      {checked.includes(i) ? <CheckSquare2 className="size-5 text-ok" aria-hidden /> : <Square className="size-5 text-muted" aria-hidden />}
                      <span className={cn(checked.includes(i) && 'text-muted line-through')}>{a}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-5 text-primary" aria-hidden />
              {t('tools')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_TOOLS.map((tool) => (
                <Link
                  key={tool}
                  to={`/tools/${tool}?meeting=${m.id}${m.clientId ? `&client=${m.clientId}` : ''}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm hover:border-primary"
                >
                  {t(`tools:names.${tool}`)}
                  {toolsUsed.includes(tool) && <Badge tone="ok">✓</Badge>}
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <label htmlFor="quick" className="mb-2 block text-lg font-semibold">
              {t('quickNotes')}
            </label>
            <TextArea
              id="quick"
              rows={10}
              placeholder={t('quickNotesPlaceholder')}
              value={m.quickNotes}
              onChange={(e) => persist({ ...m, quickNotes: e.target.value })}
            />
          </Card>
          <Card>
            <label htmlFor="hw" className="mb-2 block text-lg font-semibold">
              {t('homework')}
            </label>
            <TextArea id="hw" rows={3} placeholder={t('homeworkPlaceholder')} value={m.homework} onChange={(e) => persist({ ...m, homework: e.target.value })} />
          </Card>
        </div>
      </div>

      <Sheet
        open={finishing}
        onOpenChange={setFinishing}
        title={t('finishTitle')}
        description={t('finishText')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFinishing(false)}>
              {t('backToMeeting')}
            </Button>
            <Button onClick={() => void finish()}>{t('saveAndClose')}</Button>
          </>
        }
      >
        <NoteForm m={m} onChange={persist} />
      </Sheet>
    </Page>
  );
}
