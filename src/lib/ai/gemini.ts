/**
 * Google Gemini (cloud) via the documented REST endpoint `models/{model}:generateContent`
 * (plain fetch – the official SDK pulls Node-only dependencies and is not needed). CORS for
 * browser and Capacitor origins verified 2026-11-04. Auth: the user's own key in `x-goog-api-key`.
 *
 * 429 / 5xx: retried with backoff when the server asks for a short wait (RetryInfo ≤ 20 s),
 * otherwise AiError('rateLimit') with the suggested wait so the UI can explain it.
 */
import { AiError, type AiProvider, type ChatMessage, type GenerateRequest, type StructuredRequest } from './types';
import { parseJson } from './parse';
import { GEMINI_MODELS } from './settings';

export const GEMINI_HOST = 'https://generativelanguage.googleapis.com';

type Fetch = typeof fetch;

interface Part {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiOptions {
  apiKey: string;
  model: string;
  fetchImpl?: Fetch;
  /** Waits between retries (tests use 0). */
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** "13s" / "1.5s" → seconds. */
export function parseRetryDelay(body: unknown): number | undefined {
  const details = (body as { error?: { details?: { '@type'?: string; retryDelay?: string }[] } })?.error?.details;
  const info = details?.find((d) => d['@type']?.endsWith('RetryInfo'));
  const m = info?.retryDelay ? /^([\d.]+)s$/.exec(info.retryDelay) : null;
  return m ? Math.ceil(Number(m[1])) : undefined;
}

export function errorFrom(status: number, body: unknown): AiError {
  const e = (body as { error?: { message?: string; status?: string; details?: { reason?: string }[] } })?.error;
  const msg = e?.message ?? `HTTP ${status}`;
  const reason = e?.details?.find((d) => d.reason)?.reason ?? '';
  if (status === 429) return new AiError('rateLimit', msg, parseRetryDelay(body));
  if (/API_KEY|PERMISSION_DENIED/.test(reason + (e?.status ?? '')) || status === 401 || status === 403)
    return new AiError('badKey', msg);
  if (status === 400 && /api key/i.test(msg)) return new AiError('badKey', msg);
  if (status === 400 && /location is not supported|user location/i.test(msg)) return new AiError('unavailable', msg);
  if (status >= 500 || status === 408) return new AiError('server', msg);
  return new AiError('server', msg);
}

function contents(req: GenerateRequest, extra?: Part[]) {
  const msgs: ChatMessage[] = req.messages ?? [{ role: 'user', text: req.prompt ?? '' }];
  const out = msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] as Part[] }));
  if (extra?.length) out[out.length - 1]!.parts.push(...extra);
  return out;
}

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;
  readonly where = 'cloud' as const;
  private fetch: Fetch;
  private sleep: (ms: number) => Promise<void>;

  constructor(private o: GeminiOptions) {
    this.fetch = o.fetchImpl ?? ((...a) => fetch(...a));
    this.sleep = o.sleep ?? wait;
  }

  private body(req: GenerateRequest, json?: Record<string, unknown>, extra?: Part[]) {
    const thinking = GEMINI_MODELS.find((m) => m.id === this.o.model)?.thinking ?? 'low';
    return {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: contents(req, extra),
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 2048,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        thinkingConfig: { thinkingLevel: thinking },
        ...(json ? { responseMimeType: 'application/json', responseJsonSchema: json } : {}),
      },
    };
  }

  /** POST with retries for 429 (short waits only), 408 and 5xx. */
  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    let attempt = 0;
    for (;;) {
      let res: Response;
      try {
        res = await this.fetch(`${GEMINI_HOST}/v1beta/models/${encodeURIComponent(this.o.model)}:${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': this.o.apiKey },
          body: JSON.stringify(body),
          signal,
        });
      } catch (e) {
        if (signal?.aborted) throw new AiError('aborted');
        throw new AiError('network', String(e));
      }
      if (res.ok) return res;
      const data: unknown = await res.json().catch(() => ({}));
      const err = errorFrom(res.status, data);
      const retryable = err.code === 'server' || (err.code === 'rateLimit' && (err.retryAfterS ?? 2) <= 20);
      if (!retryable || attempt >= 2) throw err;
      attempt++;
      await this.sleep(err.code === 'rateLimit' ? (err.retryAfterS ?? 2) * 1000 : 1000 * 2 ** attempt);
    }
  }

  private static text(data: unknown): string {
    const d = data as {
      candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (d.promptFeedback?.blockReason) throw new AiError('blocked', d.promptFeedback.blockReason);
    const c = d.candidates?.[0];
    if (!c) return '';
    if (c.finishReason && /SAFETY|PROHIBITED|BLOCKLIST|SPII/.test(c.finishReason)) throw new AiError('blocked', c.finishReason);
    return (c.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join('');
  }

  async generate(req: GenerateRequest): Promise<string> {
    const res = await this.post('generateContent', this.body(req), req.signal);
    return GeminiProvider.text(await res.json());
  }

  async stream(req: GenerateRequest, onText: (chunk: string) => void): Promise<string> {
    const res = await this.post('streamGenerateContent?alt=sse', this.body(req), req.signal);
    if (!res.body) {
      const t = GeminiProvider.text(await res.json());
      onText(t);
      return t;
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    let all = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const chunk = GeminiProvider.text(JSON.parse(line.slice(5)));
        if (chunk) {
          all += chunk;
          onText(chunk);
        }
      }
    }
    return all;
  }

  async structured<T>(req: StructuredRequest<T>): Promise<T> {
    const res = await this.post('generateContent', this.body(req, req.schema), req.signal);
    return req.validate(parseJson(GeminiProvider.text(await res.json())));
  }

  /** Speech to text for non-client content (simulator): audio is sent as WAV. */
  async transcribe(wavBase64: string, lang: string, signal?: AbortSignal): Promise<string> {
    const req: GenerateRequest = {
      system: 'You transcribe speech verbatim. Output only the transcript, no comments.',
      prompt: `Transcribe this recording (language: ${lang}).`,
      maxTokens: 1024,
      signal,
    };
    const res = await this.post(
      'generateContent',
      this.body(req, undefined, [{ inlineData: { mimeType: 'audio/wav', data: wavBase64 } }]),
      signal,
    );
    return GeminiProvider.text(await res.json()).trim();
  }

  /** Cheap request to check the key (lists nothing, generates one token). */
  async ping(): Promise<void> {
    await this.generate({ system: 'Reply with OK.', prompt: 'OK?', maxTokens: 16 });
  }
}
