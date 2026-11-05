/**
 * AI preferences (plain, non-sensitive – part of Prefs). The Gemini API key is NOT here:
 * it is encrypted with the data key (src/lib/ai/key.ts).
 * Must not import prefs.ts (prefs imports this file).
 */
import type { AiMode } from './types';

export interface AiPrefs {
  mode: AiMode;
  /** Gemini model id. */
  model: string;
  /** The user picked the model (otherwise the current default is used – D-059). */
  modelChosen?: boolean;
  /**
   * Allow client-linked text to go to the cloud – only pseudonymised, after a preview of the exact
   * text and a one-time consent per request. Off by default (D-053).
   */
  cloudClientData: boolean;
  /** Read the simulated client's replies aloud (speechSynthesis, on the device). */
  voice: boolean;
  /** Local models the user agreed to download and that finished downloading. */
  localModels: LocalModelId[];
}

export type LocalModelId = 'embed' | 'whisper' | 'llm';

/**
 * Free-tier models, default first (D-059). Gemini 3.8 Flash has only 20 free requests per day
 * (quota error seen 2026-11-05) – one live simulator conversation would use most of it – so
 * Flash-Lite is the default and each model is the other's fallback (separate quotas).
 */
export const GEMINI_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', thinking: 'minimal' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', thinking: 'low' },
] as const;

export const DEFAULT_MODEL: string = GEMINI_MODELS[0].id;

export const defaultAiPrefs = (): AiPrefs => ({
  mode: 'off',
  model: DEFAULT_MODEL,
  cloudClientData: false,
  voice: false,
  localModels: [],
});
