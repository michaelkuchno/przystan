/**
 * AI help for e-mails / SMS: write from an instruction, reply to an incoming e-mail (with the
 * professional's intention, knowledge from the app and a pseudonymous client summary) and
 * rework a draft. Client-related text is pseudonymised and needs consent for the cloud (D-053);
 * the user's signature never leaves the device ("[podpis]" is replaced locally).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Reply, Sparkles, Wand2 } from 'lucide-react';
import { Button, Card } from '@/components/ui/core';
import { Field, SelectField, Switch, TextArea } from '@/components/ui/form';
import { Tabs } from '@/components/ui/overlay';
import { usePrefs, LANGS, type Lang } from '@/lib/prefs';
import { LANG_META } from '@/lib/langs';
import { COMMS_PROMPTS, type Recipient } from '@/lib/ai/commsPrompts';
import { messageSchema, validateMessage, type DraftMessage } from '@/lib/ai/tasks';
import { useContent } from '@/content/ContentProvider';
import { buildDocs } from '@/features/search/searchIndex';
import { keywordSearch, docText } from '@/features/ai/semantic';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiOutput } from '@/features/ai/AiOutput';
import { knownNames } from '@/features/ai/names';
import { CONTACT_ROLES, type Client, type MessageChannel } from '@/domain/types';

export interface AiApply {
  subject?: string;
  body?: string;
  incoming?: string;
}

/** Pseudonymous summary of a client for the reply context (no names, no free-text notes). */
function clientSummary(c: Client, t: TFunction): string {
  return [
    `Age group: ${c.ageGroup}${c.age ? ` (${c.age})` : ''}`,
    `Work context: ${t(`enums:context.${c.context}`, { defaultValue: c.context })}`,
    `Stage of change: ${t(`enums:stage.${c.stage}`, { defaultValue: c.stage })}`,
    `Goal: ${t(`enums:goal.${c.goal}`, { defaultValue: c.goal })}`,
    `Areas: ${c.problems.map((p) => t(`enums:problem.${p}`, { defaultValue: p })).join(', ')}`,
  ].join('\n');
}

export function MessageAi({
  channel,
  draft,
  client,
  recipientRole,
  recipientName,
  signature,
  onApply,
}: {
  channel: MessageChannel;
  draft: { subject: string; body: string };
  client?: Client;
  recipientRole: Recipient;
  recipientName: string;
  signature: string;
  onApply: (a: AiApply) => void;
}) {
  const { t } = useTranslation(['messages', 'ai']);
  const { lang, country, ai } = usePrefs();
  const content = useContent();
  const [mode, setMode] = useState<'write' | 'reply' | 'improve'>('write');
  const [instruction, setInstruction] = useState('');
  const [incoming, setIncoming] = useState('');
  const [intention, setIntention] = useState('');
  const [role, setRole] = useState<Recipient>(recipientRole);
  const [tone, setTone] = useState<'formal' | 'neutral' | 'warm'>(
    recipientRole === 'court' || recipientRole === 'probation' ? 'formal' : 'neutral',
  );
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [useClient, setUseClient] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [target, setTarget] = useState<Lang>(lang === 'de' ? 'pl' : 'de');
  const task = useAiTask<DraftMessage>();
  const improve = useAiTask<string>();
  const [improved, setImproved] = useState('');
  const docs = useMemo(
    () =>
      buildDocs(content, { clients: [], meetings: [], recipes: [], programs: [], notes: [] }, {}, country).filter((d) =>
        ['knowledge', 'institution', 'legal'].includes(d.kind),
      ),
    [content, country],
  );
  if (ai.mode === 'off') return null;

  const sensitivity = personal ? 'study' : 'client';
  const names = [...knownNames(), recipientName].filter((n) => n.trim().length > 1);
  const sigPh = t('placeholders.signature');
  const finish = (d: DraftMessage): DraftMessage => {
    const put = (s: string) => (signature ? s.split(`[${sigPh}]`).join(signature) : s);
    return { ...d, body: put(d.body), sms: put(d.sms) };
  };
  const opts = { channel, recipient: role, tone, country } as const;

  const write = () =>
    void task.run({
      sensitivity,
      texts: [instruction, draft.body],
      names,
      build: ([ins, existing]) => ({
        system: COMMS_PROMPTS.compose(lang, opts),
        prompt: [
          `Instructions of the professional:\n${ins}`,
          existing?.trim() ? `Current draft (improve / complete it):\n${existing}` : '',
          `Signature: [${sigPh}]`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        schema: messageSchema,
        validate: validateMessage,
        maxTokens: 2500,
      }),
    });

  const reply = () => {
    const knowledge = useKnowledge
      ? keywordSearch(`${incoming} ${intention}`, docs, 3)
          .map((h, i) => `[K${i + 1}] ${docText(h.doc).slice(0, 700)}`)
          .join('\n\n')
      : '';
    void task.run({
      sensitivity,
      texts: [incoming, intention, useClient && client ? clientSummary(client, t) : ''],
      names,
      build: ([inc, intent, cs]) => ({
        system: COMMS_PROMPTS.reply(lang, opts),
        prompt: [
          `Incoming e-mail:\n"""\n${inc}\n"""`,
          intent?.trim()
            ? `What the professional wants to say:\n${intent}`
            : 'What the professional wants to say: (not specified – propose a sensible, careful reply)',
          cs?.trim() ? `Client summary (pseudonymised, for context only – do not quote):\n${cs}` : '',
          knowledge ? `Context from the app (expert content; use only if relevant):\n${knowledge}` : '',
          `Signature: [${sigPh}]`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        schema: messageSchema,
        validate: validateMessage,
        maxTokens: 3000,
      }),
    });
  };

  const rework = (how: 'shorter' | 'formal' | 'warmer' | 'simpler' | 'translate') => {
    setImproved('');
    void improve
      .run({
        sensitivity,
        texts: [draft.body],
        names,
        build: ([b]) => ({ system: COMMS_PROMPTS.improve(lang, how, target), prompt: b!, maxTokens: 2500 }),
        onText: setImproved,
      })
      .then((r) => r && setImproved(r));
  };

  const result = task.state.result ? finish(task.state.result) : undefined;
  const roleField = (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label={t('ai.recipient')}
        value={role}
        onChange={setRole}
        options={CONTACT_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
      />
      <SelectField
        label={t('ai.tone')}
        value={tone}
        onChange={setTone}
        options={(['formal', 'neutral', 'warm'] as const).map((x) => ({ value: x, label: t(`ai.tones.${x}`) }))}
      />
    </div>
  );

  return (
    <Card className="space-y-4" data-testid="message-ai">
      <h2 className="flex items-center gap-2 font-sans text-base font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden /> {t('ai.title')}
      </h2>
      <Tabs
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        tabs={[
          {
            value: 'write',
            label: t('ai.write'),
            content: (
              <div className="space-y-3">
                <Field label={t('ai.instruction')} htmlFor="ai-instruction" hint={t('ai.writeHint')}>
                  <TextArea id="ai-instruction" rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
                </Field>
                {roleField}
                <Button
                  icon={<Wand2 className="size-4" aria-hidden />}
                  disabled={!instruction.trim() || task.state.status === 'working'}
                  onClick={write}
                >
                  {t('ai.run')}
                </Button>
              </div>
            ),
          },
          {
            value: 'reply',
            label: t('ai.reply'),
            content: (
              <div className="space-y-3">
                <Field label={t('ai.incoming')} htmlFor="ai-incoming">
                  <TextArea id="ai-incoming" rows={6} value={incoming} onChange={(e) => setIncoming(e.target.value)} />
                </Field>
                <Field label={t('ai.intention')} htmlFor="ai-intention" hint={t('ai.intentionHint')}>
                  <TextArea id="ai-intention" rows={2} value={intention} onChange={(e) => setIntention(e.target.value)} />
                </Field>
                {roleField}
                <Switch label={t('ai.useKnowledge')} checked={useKnowledge} onChange={setUseKnowledge} />
                {client && <Switch label={t('ai.useClient')} checked={useClient} onChange={setUseClient} />}
                <Button
                  icon={<Reply className="size-4" aria-hidden />}
                  disabled={!incoming.trim() || task.state.status === 'working'}
                  onClick={reply}
                >
                  {t('ai.run')}
                </Button>
              </div>
            ),
          },
          {
            value: 'improve',
            label: t('ai.improve'),
            content: (
              <div className="space-y-3">
                {!draft.body.trim() ? (
                  <p className="text-sm text-muted">{t('ai.empty')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(['shorter', 'formal', 'warmer', 'simpler'] as const).map((h) => (
                      <Button
                        key={h}
                        size="sm"
                        variant="secondary"
                        disabled={improve.state.status === 'working'}
                        onClick={() => rework(h)}
                      >
                        {t(`ai.${h}`)}
                      </Button>
                    ))}
                    <span className="inline-flex items-center gap-2">
                      <SelectField
                        label={t('ai.translate')}
                        value={target}
                        onChange={setTarget}
                        options={LANGS.filter((l) => l !== lang).map((l) => ({ value: l, label: LANG_META[l].name }))}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="self-end"
                        disabled={improve.state.status === 'working'}
                        onClick={() => rework('translate')}
                      >
                        {t('ai.translate')}
                      </Button>
                    </span>
                  </div>
                )}
                <AiOutput state={improve.state}>
                  {improved && (
                    <div className="space-y-2">
                      <pre
                        className="rounded-2xl border border-line bg-surface-2 p-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]"
                        data-testid="improved"
                      >
                        {improved}
                      </pre>
                      {improve.state.status === 'done' && (
                        <Button
                          size="sm"
                          onClick={() => onApply({ body: signature ? improved.split(`[${sigPh}]`).join(signature) : improved })}
                        >
                          {t('ai.apply')}
                        </Button>
                      )}
                    </div>
                  )}
                </AiOutput>
              </div>
            ),
          },
        ]}
      />
      <Switch label={t('personal')} description={t('personalText')} checked={personal} onChange={setPersonal} />
      <AiOutput state={task.state} onRetry={mode === 'reply' ? reply : write}>
        {result && (
          <div className="space-y-3" data-testid="ai-draft">
            <div className="text-sm font-semibold">{t('ai.draft')}</div>
            {result.subject && channel === 'email' && <div className="text-sm font-medium">{result.subject}</div>}
            <pre className="rounded-2xl border border-line bg-surface-2 p-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
              {channel === 'sms' ? result.sms || result.body : result.body}
            </pre>
            {result.cautions.length > 0 && (
              <div>
                <div className="text-sm font-semibold">{t('ai.cautions')}</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {result.cautions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  onApply({
                    subject: result.subject || undefined,
                    body: channel === 'sms' ? result.sms || result.body : result.body,
                    incoming: mode === 'reply' ? incoming : undefined,
                  })
                }
              >
                {t('ai.apply')}
              </Button>
              {channel === 'email' && result.sms && (
                <Button size="sm" variant="secondary" onClick={() => onApply({ body: result.sms })}>
                  {t('ai.useSms')}
                </Button>
              )}
            </div>
          </div>
        )}
      </AiOutput>
      {task.previewEl}
      {improve.previewEl}
    </Card>
  );
}
