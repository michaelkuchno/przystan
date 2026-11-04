/**
 * Main-thread access to the local models. Imported only lazily (dynamic import) – it pulls in
 * the workers, which in turn pull in Transformers.js / WebLLM as separate chunks.
 */
import {
  AiError,
  type AiProvider,
  type ChatMessage,
  type Embedder,
  type GenerateRequest,
  type StructuredRequest,
  type Transcriber,
} from '../types';
import { parseJson } from '../parse';
import { stripThink } from './strip';
import { EMBED_MODEL, LLM_MODEL, MODEL_CACHE, ORT_WASM_URL, WEBLLM_CACHES, WHISPER_MODEL } from './catalog';
import type { WorkerRequest, WorkerResponse } from './transformers.worker';
import type { LocalModelId } from '../settings';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';

export type Progress = (fraction: number) => void;

/* --------------------------------------------------------- transformers.js */

let worker: Worker | undefined;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void; progress?: Progress }>();

type Req = WorkerRequest extends infer R ? (R extends { id: number; base: string } ? Omit<R, 'id' | 'base'> : never) : never;

function call<T>(req: Req, progress?: Progress, transfer: Transferable[] = []): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./transformers.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const m = ev.data;
      const p = pending.get(m.id);
      if (!p) return;
      if (m.type === 'progress') p.progress?.(m.total ? m.loaded / m.total : 0);
      else {
        pending.delete(m.id);
        if (m.type === 'done') p.resolve(m.result);
        else
          p.reject(
            new AiError(/missing|not found|allowRemoteModels|local/i.test(m.message) ? 'unavailable' : 'server', m.message),
          );
      }
    };
    // a crashed worker (e.g. out of memory on a phone) must not leave the UI waiting forever
    const fail = (msg: string) => {
      for (const p of pending.values()) p.reject(new AiError('server', msg));
      pending.clear();
      worker?.terminate();
      worker = undefined;
    };
    worker.onerror = (e) => fail(e.message || 'worker error');
    worker.onmessageerror = () => fail('worker message error');
  }
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, progress });
    worker!.postMessage({ ...req, id, base: document.baseURI } as WorkerRequest, transfer);
  });
}

export const localEmbedder: Embedder = {
  async embed(texts, kind) {
    const prefixed = texts.map((t) => `${kind === 'query' ? 'query' : 'passage'}: ${t}`);
    const out = await call<number[][]>({ type: 'embed', texts: prefixed });
    return out.map((v) => Float32Array.from(v));
  },
};

export const localTranscriber: Transcriber = {
  transcribe(pcm, lang) {
    const copy = pcm.slice();
    return call<string>({ type: 'transcribe', pcm: copy, lang }, undefined, [copy.buffer]);
  },
};

/* ------------------------------------------------------------------ WebLLM */

let engine: Promise<MLCEngineInterface> | undefined;

async function llmCached(): Promise<boolean> {
  const { hasModelInCache } = await import('@mlc-ai/web-llm');
  return hasModelInCache(LLM_MODEL);
}

export function loadLlm(progress?: Progress, allowDownload = false): Promise<MLCEngineInterface> {
  engine ??= (async () => {
    if (!allowDownload && !(await llmCached())) throw new AiError('unavailable', 'model not downloaded');
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
    return CreateWebWorkerMLCEngine(new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' }), LLM_MODEL, {
      initProgressCallback: (r) => progress?.(r.progress),
    });
  })().catch((e: unknown) => {
    engine = undefined;
    throw e instanceof AiError ? e : new AiError('unavailable', String(e));
  });
  return engine;
}

function messages(req: GenerateRequest) {
  const msgs: ChatMessage[] = req.messages ?? [{ role: 'user', text: req.prompt ?? '' }];
  return [
    { role: 'system' as const, content: req.system },
    ...msgs.map((m) => ({ role: m.role === 'model' ? ('assistant' as const) : ('user' as const), content: m.text })),
  ];
}

export class LocalLlmProvider implements AiProvider {
  readonly id = 'local' as const;
  readonly where = 'device' as const;

  async generate(req: GenerateRequest): Promise<string> {
    const e = await loadLlm();
    const r = await e.chat.completions.create({
      messages: messages(req),
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.4,
      extra_body: { enable_thinking: false },
    });
    return stripThink(r.choices[0]?.message.content ?? '');
  }

  async stream(req: GenerateRequest, onText: (chunk: string) => void): Promise<string> {
    const e = await loadLlm();
    const chunks = await e.chat.completions.create({
      messages: messages(req),
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.4,
      stream: true,
      extra_body: { enable_thinking: false },
    });
    let all = '';
    let shown = 0;
    for await (const c of chunks) {
      if (req.signal?.aborted) {
        await e.interruptGenerate();
        throw new AiError('aborted');
      }
      all += c.choices[0]?.delta.content ?? '';
      const clean = stripThink(all);
      if (clean.length > shown) {
        onText(clean.slice(shown));
        shown = clean.length;
      }
    }
    return stripThink(all);
  }

  async structured<T>(req: StructuredRequest<T>): Promise<T> {
    const e = await loadLlm();
    const r = await e.chat.completions.create({
      messages: messages(req),
      max_tokens: req.maxTokens ?? 1536,
      temperature: req.temperature ?? 0.2,
      response_format: { type: 'json_object', schema: JSON.stringify(req.schema) },
      extra_body: { enable_thinking: false },
    });
    return req.validate(parseJson(stripThink(r.choices[0]?.message.content ?? '')));
  }
}

/* --------------------------------------------------------- download/delete */

export async function downloadModel(id: LocalModelId, progress: Progress): Promise<void> {
  if (id === 'llm') {
    await loadLlm(progress, true);
    return;
  }
  await call({ type: 'download', model: id }, progress);
}

async function deleteRepo(repo: string) {
  const cache = await caches.open(MODEL_CACHE);
  for (const req of await cache.keys()) if (req.url.includes(`/${repo}/`)) await cache.delete(req);
}

/** Deletes downloaded models; the shared runtime goes when no Transformers.js model is left. */
export async function deleteModels(ids: LocalModelId[], keep: LocalModelId[]): Promise<void> {
  if (ids.includes('embed')) await deleteRepo(EMBED_MODEL);
  if (ids.includes('whisper')) await deleteRepo(WHISPER_MODEL);
  if (!keep.includes('embed') && !keep.includes('whisper')) {
    await caches.delete(MODEL_CACHE);
    void ORT_WASM_URL;
  }
  if (ids.includes('llm')) {
    if (engine) {
      await (await engine.catch(() => null))?.unload();
      engine = undefined;
    }
    try {
      const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
      await deleteModelAllInfoInCache(LLM_MODEL);
    } catch {
      /* fall through to deleting the caches */
    }
    for (const c of WEBLLM_CACHES) await caches.delete(c);
  }
  worker?.terminate();
  worker = undefined;
}
