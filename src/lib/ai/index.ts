/**
 * Entry point of the AI layer for the UI. Light: Gemini is plain fetch, local models are loaded
 * with a dynamic import only when used. With mode 'off' nothing here creates a provider.
 */
import { getPrefs } from '@/lib/prefs';
import { activeSpace } from '@/lib/store';
import { assertCloudAllowed, outgoingText, routeFor, type ConsentToken, type GuardContext, type Route } from './guard';
import {
  AiError,
  type AiProvider,
  type Embedder,
  type GenerateRequest,
  type Sensitivity,
  type StructuredRequest,
  type Transcriber,
} from './types';
import { FakeProvider, fakeEmbedder, fakeEnabled, fakeTranscriber } from './fake';
import { GeminiProvider } from './gemini';
import { loadApiKey } from './key';
import { GEMINI_MODELS } from './settings';

export { AiError } from './types';
export type { Route } from './guard';

export function guardContext(sensitivity: Sensitivity): GuardContext {
  const p = getPrefs();
  return {
    sensitivity,
    mode: p.ai.mode,
    cloudClientData: p.ai.cloudClientData,
    presentation: p.presentation,
    space: activeSpace(),
    hasLocalLlm: p.ai.localModels.includes('llm'),
  };
}

export const currentRoute = (sensitivity: Sensitivity): Route => routeFor(guardContext(sensitivity));

/** Exact text of a request – what the preview shows and the guard compares. */
export function requestText(req: GenerateRequest): string {
  const parts = req.messages ? req.messages.map((m) => `${m.role === 'user' ? '>' : '<'} ${m.text}`) : [req.prompt ?? ''];
  return outgoingText(req.system, parts);
}

let fake: FakeProvider | undefined;
export const fakeProvider = () => (fake ??= new FakeProvider());

async function cloud(): Promise<GeminiProvider> {
  const key = await loadApiKey();
  if (!key) throw new AiError('noKey');
  const model = getPrefs().ai.model;
  return new GeminiProvider({ apiKey: key, model, fallbackModel: GEMINI_MODELS.find((m) => m.id !== model)?.id });
}

/** Wraps a cloud provider so every request is checked by the privacy guard first. */
function guarded(p: AiProvider, sensitivity: Sensitivity, consent?: ConsentToken): AiProvider {
  const check = (req: GenerateRequest) => assertCloudAllowed(sensitivity, requestText(req), consent);
  return {
    id: p.id,
    where: p.where,
    generate: (req) => (check(req), p.generate(req)),
    stream: (req, on) => (check(req), p.stream(req, on)),
    structured: <T>(req: StructuredRequest<T>) => (check(req), p.structured(req)),
  };
}

/** Validation errors of any kind become AiError('format'). */
function safeValidate<T>(req: StructuredRequest<T>): StructuredRequest<T> {
  return {
    ...req,
    validate: (v) => {
      try {
        return req.validate(v);
      } catch (e) {
        throw e instanceof AiError ? e : new AiError('format', String(e));
      }
    },
  };
}

export async function providerFor(route: Route, sensitivity: Sensitivity, consent?: ConsentToken): Promise<AiProvider> {
  if (route.kind === 'none') throw new AiError('unavailable', route.reason);
  let p: AiProvider;
  if (fakeEnabled()) p = fakeProvider();
  else if (route.kind === 'cloud') p = await cloud();
  else p = new (await import('./local')).LocalLlmProvider();
  const g = p.where === 'cloud' ? guarded(p, sensitivity, consent) : p;
  return { ...g, structured: <T>(req: StructuredRequest<T>) => g.structured(safeValidate(req)) };
}

/** Local semantic search (never the cloud). */
export async function getEmbedder(): Promise<Embedder | null> {
  const p = getPrefs().ai;
  if (p.mode === 'off') return null;
  if (fakeEnabled()) return fakeEmbedder;
  if (!p.localModels.includes('embed')) return null;
  return (await import('./local')).localEmbedder;
}

/**
 * Dictation. Local Whisper when downloaded; otherwise – only for non-client text (simulator,
 * study) and in cloud mode – Gemini.
 */
export async function getTranscriber(sensitivity: Sensitivity): Promise<Transcriber | null> {
  const p = getPrefs().ai;
  if (p.mode === 'off') return null;
  if (fakeEnabled()) return fakeTranscriber;
  if (p.localModels.includes('whisper')) return (await import('./local')).localTranscriber;
  if (p.mode === 'cloud' && sensitivity !== 'client' && !getPrefs().presentation) {
    const g = await cloud();
    const { pcmToWavBase64 } = await import('./audio');
    return { transcribe: (pcm, lang) => g.transcribe(pcmToWavBase64(pcm), lang) };
  }
  return null;
}

export function aiEnabled(): boolean {
  return getPrefs().ai.mode !== 'off';
}
