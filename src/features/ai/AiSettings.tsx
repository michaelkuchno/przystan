import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, Check, ChevronRight, Cloud, Download, KeyRound, PowerOff, Smartphone, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, SectionTitle } from '@/components/ui/core';
import { Field, SelectField, Switch, TextInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/components/ui/cn';
import { getPrefs, setPrefs, usePrefs } from '@/lib/prefs';
import { GEMINI_MODELS, type AiPrefs, type LocalModelId } from '@/lib/ai/settings';
import { deleteApiKey, loadApiKey, looksLikeApiKey, saveApiKey } from '@/lib/ai/key';
import { GeminiProvider } from '@/lib/ai/gemini';
import { AiError, type AiMode } from '@/lib/ai/types';
import { LOCAL_MODELS, detectDevice, unsupportedReason, type DeviceInfo } from '@/lib/ai/local/catalog';
import { fakeEnabled } from '@/lib/ai/fake';
import { logEvent } from '@/lib/audit';
import { AiErrorView } from './AiOutput';

const setAi = (patch: Partial<AiPrefs>) => setPrefs({ ai: { ...getPrefs().ai, ...patch } });

const MODE_ICON: Record<AiMode, typeof Cloud> = { off: PowerOff, local: Smartphone, cloud: Cloud };

function ModePicker() {
  const { t } = useTranslation('ai');
  const { ai } = usePrefs();
  return (
    <div role="radiogroup" aria-label={t('settings.mode')} className="grid gap-2 sm:grid-cols-3">
      {(['off', 'local', 'cloud'] as const).map((m) => {
        const Icon = MODE_ICON[m];
        const on = ai.mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              void setAi({ mode: m });
              void logEvent({ action: 'ai.settings', details: { setting: 'ai.mode', value: m } });
            }}
            className={cn(
              'flex min-h-14 flex-col items-start gap-1 rounded-2xl border p-3 text-left transition',
              on ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-primary/50',
            )}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Icon className="size-4" aria-hidden /> {t(`settings.modes.${m}`)}
              {on && <Check className="size-4 text-primary" aria-hidden />}
            </span>
            <span className="text-sm text-muted">{t(`settings.modes.${m}Text`)}</span>
          </button>
        );
      })}
    </div>
  );
}

function CloudSettings() {
  const { t } = useTranslation('ai');
  const { ai } = usePrefs();
  const toast = useToast();
  const [stored, setStored] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<AiError | null>(null);

  useEffect(() => {
    void loadApiKey().then(setStored);
  }, []);

  const save = async () => {
    await saveApiKey(draft);
    setStored(draft.trim());
    setDraft('');
    setError(null);
    void logEvent({ action: 'ai.settings', details: { setting: 'ai.key', value: 'saved' } });
  };

  const test = async () => {
    setTesting(true);
    setError(null);
    try {
      const key = await loadApiKey();
      if (!key) throw new AiError('noKey');
      if (!fakeEnabled()) await new GeminiProvider({ apiKey: key, model: ai.model }).ping();
      toast({ text: t('settings.testOk'), tone: 'ok' });
    } catch (e) {
      setError(e instanceof AiError ? e : new AiError('server', String(e)));
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    await deleteApiKey();
    setStored(null);
    toast({ text: t('settings.removed'), tone: 'ok' });
    void logEvent({ action: 'ai.settings', details: { setting: 'ai.key', value: 'deleted' } });
  };

  const invalid = draft.length > 0 && !looksLikeApiKey(draft);
  return (
    <Card className="space-y-5">
      <Field
        label={t('settings.key')}
        htmlFor="ai-key"
        hint={stored ? t('settings.keySet', { tail: stored.slice(-4) }) : t('settings.keyHint')}
        error={invalid ? t('settings.keyInvalid') : undefined}
      >
        <div className="flex flex-wrap gap-2">
          <TextInput
            id="ai-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 basis-56 font-mono"
            placeholder="AIza…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button icon={<KeyRound className="size-4" aria-hidden />} disabled={!draft || invalid} onClick={() => void save()}>
            {t('settings.save')}
          </Button>
        </div>
      </Field>
      {stored && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={testing} onClick={() => void test()}>
            {t('settings.test')}
          </Button>
          <Button variant="ghost" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => void remove()}>
            {t('settings.remove')}
          </Button>
        </div>
      )}
      {error && <AiErrorView error={error} />}
      <details className="rounded-2xl bg-surface-2 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-medium">{t('settings.howTo')}</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
          {(t('settings.howToSteps', { returnObjects: true }) as string[]).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>
      <SelectField
        label={t('settings.model')}
        hint={t('settings.modelHint')}
        value={ai.model}
        onChange={(v) => void setAi({ model: v })}
        options={GEMINI_MODELS.map((m) => ({ value: m.id, label: m.label }))}
      />
      <Switch
        label={t('settings.clientData')}
        description={t('settings.clientDataText')}
        checked={ai.cloudClientData}
        onChange={(v) => {
          void setAi({ cloudClientData: v });
          void logEvent({ action: 'ai.settings', details: { setting: 'ai.cloudClientData', value: String(v) } });
        }}
      />
    </Card>
  );
}

function LocalModels() {
  const { t } = useTranslation('ai');
  const { ai } = usePrefs();
  const confirm = useConfirm();
  const toast = useToast();
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [progress, setProgress] = useState<Partial<Record<LocalModelId, number>>>({});

  useEffect(() => {
    void detectDevice().then(setDevice);
  }, []);

  const size = (mb: number) => (mb >= 1000 ? t('settings.sizeGb', { gb: (mb / 1000).toFixed(1) }) : t('settings.size', { mb }));

  const download = async (id: LocalModelId, mb: number) => {
    const needsRuntime = id !== 'llm' && !ai.localModels.some((m) => m === 'embed' || m === 'whisper');
    const total = needsRuntime ? mb + 27 : mb;
    const ok = await confirm({
      title: t('settings.consentTitle', { name: t(`settings.models.${id}`) }),
      text: t('settings.consentText', { size: size(total) }),
      confirm: t('settings.consentOk'),
    });
    if (!ok) return;
    setProgress((p) => ({ ...p, [id]: 0 }));
    try {
      const local = await import('@/lib/ai/local');
      await local.downloadModel(id, (f) => setProgress((p) => ({ ...p, [id]: Math.round(f * 100) })));
      await setAi({ localModels: [...new Set([...getPrefs().ai.localModels, id])] });
      void logEvent({ action: 'ai.settings', details: { setting: 'ai.model.download', value: id } });
    } catch (e) {
      toast({ text: t('settings.downloadFailed', { msg: e instanceof Error ? e.message : String(e) }), tone: 'warn' });
    } finally {
      setProgress((p) => {
        const { [id]: _, ...rest } = p;
        return rest;
      });
    }
  };

  const remove = async (ids: LocalModelId[]) => {
    const keep = getPrefs().ai.localModels.filter((m) => !ids.includes(m));
    try {
      const local = await import('@/lib/ai/local');
      await local.deleteModels(ids, keep);
    } catch {
      /* caches may already be gone */
    }
    await setAi({ localModels: keep });
    toast({ text: t('settings.deleted'), tone: 'ok' });
    void logEvent({ action: 'ai.settings', details: { setting: 'ai.model.delete', value: ids.join(',') } });
  };

  return (
    <Card className="space-y-4">
      <p className="text-sm text-muted">{t('settings.localLead')}</p>
      {device && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" data-testid="ai-device">
          <span className="font-medium">{t('settings.device')}:</span>
          <span>{t('settings.deviceWebgpu', { v: device.webgpu ? t('settings.yes') : t('settings.no') })}</span>
          {device.memoryGB !== undefined && <span>{t('settings.deviceMemory', { gb: device.memoryGB })}</span>}
          {device.freeMB !== undefined && <span>{t('settings.deviceFree', { mb: device.freeMB.toLocaleString() })}</span>}
        </p>
      )}
      <ul className="divide-y divide-line">
        {LOCAL_MODELS.map((m) => {
          const have = ai.localModels.includes(m.id);
          const pct = progress[m.id];
          const reason = device ? unsupportedReason(m, device) : null;
          return (
            <li key={m.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 basis-60">
                  <div className="font-semibold">
                    {t(`settings.models.${m.id}`)} <span className="font-normal text-muted">· {size(m.sizeMB)}</span>
                  </div>
                  <p className="text-sm text-muted">{t(`settings.models.${m.id}Text`)}</p>
                </div>
                {have ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm font-medium text-ok">
                      <Check className="size-4" aria-hidden /> {t('settings.ready')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 className="size-4" aria-hidden />}
                      onClick={() => void remove([m.id])}
                    >
                      {t('settings.delete')}
                    </Button>
                  </div>
                ) : pct !== undefined ? (
                  <span className="text-sm font-medium tabular-nums" role="status">
                    {t('settings.downloading', { pct })}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download className="size-4" aria-hidden />}
                    disabled={!!reason || !device || ai.mode === 'off'}
                    onClick={() => void download(m.id, m.sizeMB)}
                  >
                    {t('settings.download')}
                  </Button>
                )}
              </div>
              {pct !== undefined && (
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-3"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(`settings.models.${m.id}`)}
                >
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
                </div>
              )}
              {reason && !have && <p className="text-xs text-warn">{t(`settings.unsupported.${reason}`)}</p>}
            </li>
          );
        })}
      </ul>
      {ai.localModels.length > 0 && (
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="size-4" aria-hidden />}
          onClick={() => void remove([...ai.localModels])}
        >
          {t('settings.deleteAll')}
        </Button>
      )}
    </Card>
  );
}

export default function AiSettings() {
  const { t } = useTranslation('ai');
  const { ai } = usePrefs();
  return (
    <Page>
      <PageHeader back="/settings" title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="space-y-4">
        <Link
          to="/ai/info"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 hover:bg-surface-2"
        >
          <BrainCircuit className="size-5 text-primary" aria-hidden />
          <span className="flex-1 font-medium">{t('settings.info')}</span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
        <SectionTitle>{t('settings.mode')}</SectionTitle>
        <ModePicker />
        {ai.mode === 'off' && <Notice>{t('settings.modes.offText')}</Notice>}
        {ai.mode === 'cloud' && (
          <>
            <SectionTitle>{t('settings.cloud')}</SectionTitle>
            <CloudSettings />
          </>
        )}
        {/* downloaded models can always be deleted, also after turning AI off */}
        {(ai.mode !== 'off' || ai.localModels.length > 0) && (
          <>
            <SectionTitle>{t('settings.local')}</SectionTitle>
            <LocalModels />
          </>
        )}
        {ai.mode !== 'off' && (
          <Card>
            <Switch
              label={t('settings.voice')}
              description={t('settings.voiceText')}
              checked={ai.voice}
              onChange={(v) => void setAi({ voice: v })}
            />
          </Card>
        )}
      </div>
    </Page>
  );
}
