/**
 * One AI request from the UI: routing (privacy guard), pseudonymisation + preview + one-time
 * consent for client data in the cloud, the call itself, restoring placeholders, crisis check.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { currentRoute, providerFor, requestText } from '@/lib/ai';
import { AiError, type GenerateRequest, type JsonSchema, type Sensitivity } from '@/lib/ai/types';
import { pseudonymize, restoreDeep } from '@/lib/ai/pseudonymize';
import { grantConsent, type ConsentToken } from '@/lib/ai/guard';
import { hasCrisisSignal } from '@/lib/ai/crisis';
import { getPrefs } from '@/lib/prefs';
import { logEvent } from '@/lib/audit';
import { CloudPreview } from './CloudPreview';

export interface AiJob<T> {
  sensitivity: Sensitivity;
  /** User / client text that ends up in the request (pseudonymised when it goes to the cloud). */
  texts: string[];
  /** Known names to replace (client full name, code, family members). */
  names?: string[];
  build: (texts: string[]) => GenerateRequest & { schema?: JsonSchema; validate?: (v: unknown) => T };
  /** Streaming text answers: called with the whole text so far. */
  onText?: (all: string) => void;
}

export interface AiState<T> {
  status: 'idle' | 'working' | 'done' | 'error';
  result?: T;
  error?: AiError;
  where?: 'cloud' | 'device' | 'fake';
  crisis: boolean;
}

const SEP = '\n␞\n';

export function useAiTask<T = string>() {
  const [state, setState] = useState<AiState<T>>({ status: 'idle', crisis: false });
  const [preview, setPreview] = useState<{ text: string; count: number; resolve: (ok: boolean) => void } | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (job: AiJob<T>): Promise<T | undefined> => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const inputCrisis = job.sensitivity !== 'content' && hasCrisisSignal(...job.texts);
    setState({ status: 'working', crisis: inputCrisis });
    try {
      const route = currentRoute(job.sensitivity);
      if (route.kind === 'none') throw new AiError('unavailable', route.reason);
      let texts = job.texts;
      let map = new Map<string, string>();
      let consent: ConsentToken | undefined;
      let req = job.build(texts);
      if (route.kind === 'cloud' && route.consent) {
        const p = pseudonymize(job.texts.join(SEP), { lang: getPrefs().lang, names: job.names ?? [] });
        texts = p.text.split(SEP);
        map = p.map;
        req = job.build(texts);
        const outgoing = requestText(req);
        const ok = await new Promise<boolean>((resolve) => setPreview({ text: outgoing, count: p.count, resolve }));
        setPreview(null);
        if (!ok) {
          setState({ status: 'idle', crisis: false });
          return undefined;
        }
        consent = grantConsent(outgoing);
        void logEvent({
          action: 'ai.cloudSend',
          details: { task: String(req.schema?.title ?? 'text'), chars: outgoing.length, replaced: p.count },
        });
      }
      const provider = await providerFor(route, job.sensitivity, consent);
      const full = { ...req, signal: ctrl.signal };
      let result: T;
      if (req.schema && req.validate) {
        result = await provider.structured<T>({ ...full, schema: req.schema, validate: req.validate });
      } else if (job.onText) {
        let all = '';
        result = (await provider.stream(full, (c) => {
          all += c;
          job.onText!(restoreDeep(all, map));
        })) as T;
      } else {
        result = (await provider.generate(full)) as T;
      }
      if (ctrl.signal.aborted) return undefined;
      const restored = restoreDeep(result, map);
      const crisis = inputCrisis || (job.sensitivity !== 'content' && hasCrisisSignal(JSON.stringify(restored)));
      setState({ status: 'done', result: restored, where: provider.id === 'fake' ? 'fake' : provider.where, crisis });
      return restored;
    } catch (e) {
      if (ctrl.signal.aborted) return undefined;
      const err = e instanceof AiError ? e : new AiError('server', String(e));
      setState({ status: 'error', error: err, crisis: inputCrisis });
      return undefined;
    }
  }, []);

  const cancel = useCallback(() => {
    abort.current?.abort();
    preview?.resolve(false);
    setState({ status: 'idle', crisis: false });
  }, [preview]);

  const reset = useCallback(() => setState({ status: 'idle', crisis: false }), []);

  const previewEl: ReactNode = preview ? (
    <CloudPreview text={preview.text} count={preview.count} onDecide={(ok) => preview.resolve(ok)} />
  ) : null;

  return { state, run, cancel, reset, previewEl };
}
