/// <reference lib="webworker" />
/**
 * Transformers.js in a worker: multilingual embeddings (semantic search) and Whisper (dictation).
 * Network is allowed only for an explicit 'download' request; every other request works from the
 * local cache only (env.allowRemoteModels = false), so after the download nothing leaves the device.
 */
import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import { EMBED_MODEL, MODEL_CACHE, ORT_MJS_PATH, ORT_WASM_URL, WHISPER_MODEL } from './catalog';
import { collapseRepeats, maxTokensFor, rms } from './strip';

export type WorkerRequest =
  | { id: number; type: 'download'; model: 'embed' | 'whisper'; base: string }
  | { id: number; type: 'embed'; texts: string[]; base: string }
  | { id: number; type: 'transcribe'; pcm: Float32Array; lang: string; base: string };

export type WorkerResponse =
  | { id: number; type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'done'; result?: unknown }
  | { id: number; type: 'error'; message: string };

env.allowLocalModels = false;
env.useBrowserCache = true;
env.cacheKey = MODEL_CACHE;
env.useWasmCache = false;

let runtime: Promise<void> | undefined;

/** The ONNX runtime binary is cached in the same bucket as the models (downloaded with the first model). */
async function ensureRuntime(base: string, allowNetwork: boolean) {
  runtime ??= (async () => {
    const cache = await caches.open(MODEL_CACHE);
    let res = await cache.match(ORT_WASM_URL);
    if (!res) {
      if (!allowNetwork) throw new Error('runtime-missing');
      const fetched = await fetch(ORT_WASM_URL);
      if (!fetched.ok) throw new Error(`runtime ${fetched.status}`);
      await cache.put(ORT_WASM_URL, fetched.clone());
      res = fetched;
    }
    const wasm = env.backends.onnx.wasm!;
    wasm.wasmBinary = await res.arrayBuffer();
    wasm.wasmPaths = { mjs: new URL(ORT_MJS_PATH, base).href, wasm: ORT_WASM_URL };
    wasm.numThreads = 1;
  })().catch((e: unknown) => {
    runtime = undefined;
    throw e;
  });
  return runtime;
}

let embedder: Promise<FeatureExtractionPipeline> | undefined;
let whisper: Promise<AutomaticSpeechRecognitionPipeline> | undefined;

function progress(id: number) {
  const files = new Map<string, { loaded: number; total: number }>();
  return (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== 'progress' || !p.file) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    post({ id, type: 'progress', loaded, total });
  };
}

function opts(id: number, allowNetwork: boolean) {
  env.allowRemoteModels = allowNetwork;
  return { dtype: 'q8' as const, device: 'wasm' as const, progress_callback: progress(id) };
}

function loadEmbed(id: number, allowNetwork: boolean): Promise<FeatureExtractionPipeline> {
  embedder ??= (pipeline('feature-extraction', EMBED_MODEL, opts(id, allowNetwork)) as Promise<FeatureExtractionPipeline>).catch(
    (e: unknown) => {
      embedder = undefined;
      throw e;
    },
  );
  return embedder;
}

function loadWhisper(id: number, allowNetwork: boolean): Promise<AutomaticSpeechRecognitionPipeline> {
  whisper ??= (
    pipeline('automatic-speech-recognition', WHISPER_MODEL, opts(id, allowNetwork)) as Promise<AutomaticSpeechRecognitionPipeline>
  ).catch((e: unknown) => {
    whisper = undefined;
    throw e;
  });
  return whisper;
}

const WHISPER_LANG: Record<string, string> = { pl: 'polish', de: 'german', en: 'english' };

function post(m: WorkerResponse) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const r = ev.data;
  try {
    if (r.type === 'download') {
      await ensureRuntime(r.base, true);
      await (r.model === 'embed' ? loadEmbed(r.id, true) : loadWhisper(r.id, true));
      post({ id: r.id, type: 'done' });
    } else if (r.type === 'embed') {
      await ensureRuntime(r.base, false);
      const pipe = await loadEmbed(r.id, false);
      const out = await pipe(r.texts, { pooling: 'mean', normalize: true });
      post({ id: r.id, type: 'done', result: out.tolist() as number[][] });
    } else {
      // silence: nothing to recognise (Whisper would invent text)
      if (rms(r.pcm) < 0.005) {
        post({ id: r.id, type: 'done', result: '' });
        return;
      }
      await ensureRuntime(r.base, false);
      const pipe = await loadWhisper(r.id, false);
      const out = await pipe(r.pcm, {
        language: WHISPER_LANG[r.lang] ?? 'polish',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        max_new_tokens: maxTokensFor(r.pcm.length),
      });
      const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
      post({ id: r.id, type: 'done', result: collapseRepeats(text) });
    }
  } catch (e) {
    post({ id: r.id, type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
