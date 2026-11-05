/**
 * AI layer – shared types. See docs/AI.md and docs/DECISIONS.md D-051…D-058.
 *
 * The app works exactly as before without AI: nothing in this folder is imported
 * eagerly by the shell, and with mode 'off' no provider is ever created.
 */

export type AiMode = 'off' | 'local' | 'cloud';

/**
 * What a request contains – decides where it may be processed (src/lib/ai/guard.ts).
 *  - 'content': only the app's own expert content (knowledge cards, flashcards, scenarios).
 *  - 'study':   text the user wrote or pasted for learning (no link to a client).
 *  - 'client':  anything linked to a client (profile, notes, meetings, diagnosis, results,
 *               supervision, relapse plan). Never sent to the cloud automatically.
 */
export type Sensitivity = 'content' | 'study' | 'client';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GenerateRequest {
  system: string;
  /** Either a single prompt or a conversation. */
  prompt?: string;
  messages?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** JSON schema (subset supported by Gemini `responseJsonSchema` and WebLLM grammars). */
export type JsonSchema = Record<string, unknown>;

export interface StructuredRequest<T> extends GenerateRequest {
  schema: JsonSchema;
  /** Validates and normalises the parsed value; throws AiFormatError when unusable. */
  validate: (value: unknown) => T;
}

export interface AiProvider {
  readonly id: 'gemini' | 'local' | 'fake';
  /** Where the data goes – drives the privacy guard. */
  readonly where: 'cloud' | 'device';
  generate(req: GenerateRequest): Promise<string>;
  stream(req: GenerateRequest, onText: (chunk: string) => void): Promise<string>;
  structured<T>(req: StructuredRequest<T>): Promise<T>;
}

/** Local-only capabilities (Transformers.js in a worker). */
export interface Embedder {
  embed(texts: string[], kind: 'query' | 'passage'): Promise<Float32Array[]>;
}

export interface Transcriber {
  /** 16 kHz mono PCM. */
  transcribe(pcm: Float32Array, lang: string): Promise<string>;
}

export class AiError extends Error {
  constructor(
    public code:
      | 'noKey'
      | 'badKey'
      | 'rateLimit'
      | 'network'
      | 'timeout'
      | 'format'
      | 'blocked'
      | 'unavailable'
      | 'privacy'
      | 'aborted'
      | 'busy'
      | 'server',
    message?: string,
    public retryAfterS?: number,
  ) {
    super(message ?? code);
    this.name = 'AiError';
  }
}
