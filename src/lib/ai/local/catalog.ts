/**
 * Local models (D-054). Nothing is downloaded before the user agrees in Settings → AI assistant.
 * Sizes are download sizes (verified on Hugging Face 2026-11-04).
 */
import type { LocalModelId } from '../settings';

/** ONNX Runtime used by Transformers.js 4.3.2 – keep public/ort/*.mjs in sync (unit test checks it). */
export const ORT_VERSION = '1.31.0-dev.20260914-8d85527a0';
export const ORT_WASM_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.asyncify.wasm`;
export const ORT_MJS_PATH = 'ort/ort-wasm-simd-threaded.asyncify.mjs';
export const ORT_WASM_MB = 27;

/** Cache API bucket for Transformers.js models and the ONNX runtime (separate from the app cache). */
export const MODEL_CACHE = 'przystan-ai-models';
/** Caches used by WebLLM. */
export const WEBLLM_CACHES = ['webllm/model', 'webllm/config', 'webllm/wasm'];

export const EMBED_MODEL = 'Xenova/multilingual-e5-small';
export const WHISPER_MODEL = 'onnx-community/whisper-base';
export const LLM_MODEL = 'Qwen3-1.7B-q4f16_1-MLC';

export interface LocalModelInfo {
  id: LocalModelId;
  /** Approximate download in MB (incl. the shared runtime for the first Transformers.js model). */
  sizeMB: number;
  needs: 'wasm' | 'webgpu';
}

export const LOCAL_MODELS: LocalModelInfo[] = [
  { id: 'embed', sizeMB: 118, needs: 'wasm' },
  { id: 'whisper', sizeMB: 77, needs: 'wasm' },
  { id: 'llm', sizeMB: 1100, needs: 'webgpu' },
];

export interface DeviceInfo {
  wasm: boolean;
  webgpu: boolean;
  /** WebGPU adapter supports 16-bit floats (needed by the q4f16 model). */
  f16: boolean;
  /** navigator.deviceMemory (GB, Chrome only, capped at 8). */
  memoryGB?: number;
  /** Free storage quota in MB (estimate). */
  freeMB?: number;
  mic: boolean;
  tts: boolean;
}

let device: Promise<DeviceInfo> | undefined;

export function detectDevice(): Promise<DeviceInfo> {
  device ??= (async () => {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter(o?: unknown): Promise<{ features: Set<string> } | null> };
      deviceMemory?: number;
    };
    let webgpu = false;
    let f16 = false;
    try {
      const a = await nav.gpu?.requestAdapter();
      webgpu = !!a;
      f16 = !!a?.features.has('shader-f16');
    } catch {
      /* no WebGPU */
    }
    let freeMB: number | undefined;
    try {
      const e = await navigator.storage?.estimate?.();
      if (e?.quota) freeMB = Math.round(((e.quota ?? 0) - (e.usage ?? 0)) / 1_048_576);
    } catch {
      /* unknown */
    }
    return {
      wasm: typeof WebAssembly === 'object',
      webgpu,
      f16,
      memoryGB: nav.deviceMemory,
      freeMB,
      mic: !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined',
      tts: typeof speechSynthesis !== 'undefined',
    };
  })();
  return device;
}

/** Why a model cannot run here (null = it can). */
export function unsupportedReason(
  m: LocalModelInfo,
  d: DeviceInfo,
): 'noWasm' | 'noWebgpu' | 'noF16' | 'lowMemory' | 'noSpace' | null {
  if (!d.wasm) return 'noWasm';
  if (m.needs === 'webgpu') {
    if (!d.webgpu) return 'noWebgpu';
    if (!d.f16) return 'noF16';
    if (d.memoryGB !== undefined && d.memoryGB < 4) return 'lowMemory';
  }
  if (d.freeMB !== undefined && d.freeMB < m.sizeMB * 1.5) return 'noSpace';
  return null;
}
