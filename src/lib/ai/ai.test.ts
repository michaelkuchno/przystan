import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractJson, parseJson, repairJson } from './parse';
import { pseudonymize, restore, restoreDeep } from './pseudonymize';
import { assertCloudAllowed, grantConsent, routeFor, type GuardContext } from './guard';
import { GeminiProvider, errorFrom, parseRetryDelay } from './gemini';
import { hasCrisisSignal } from './crisis';
import {
  validateAnswer,
  validateFlashcards,
  validateGrade,
  validateLessonPlan,
  validateOrganize,
  validateSimTurn,
  simTurnSchema,
} from './tasks';
import { FakeProvider, fakeSimTurn } from './fake';
import { AiError } from './types';
import { ORT_VERSION } from './local/catalog';
import { stripThink } from './local/strip';

/* ------------------------------------------------------------------ parse */

describe('parsing model output', () => {
  it('takes JSON out of code fences and prose', () => {
    expect(parseJson('Oto wynik:\n```json\n{"a": 1, "b": [1,2]}\n```\nDziękuję')).toEqual({ a: 1, b: [1, 2] });
    expect(parseJson('Sure! {"x": "y {z}"} trailing')).toEqual({ x: 'y {z}' });
  });

  it('repairs trailing commas, smart quotes and a truncated answer', () => {
    expect(parseJson('{"a": [1, 2,], }')).toEqual({ a: [1, 2] });
    expect(parseJson('{“a”: 1}')).toEqual({ a: 1 });
    expect(parseJson('{"cards": [{"front": "A", "back": "B"}, {"front": "C", "back": "D')).toEqual({
      cards: [
        { front: 'A', back: 'B' },
        { front: 'C', back: 'D' },
      ],
    });
    expect(repairJson('{"a": {"b": 1')).toBe('{"a": {"b": 1}}');
  });

  it('throws AiError(format) when there is no JSON', () => {
    expect(() => parseJson('Nie wiem.')).toThrow(AiError);
    expect(extractJson('nothing')).toBeNull();
    try {
      parseJson('{{{ "a": nope');
    } catch (e) {
      expect((e as AiError).code).toBe('format');
    }
  });
});

describe('validation of task answers', () => {
  it('simulator turn: normalises categories, clamps alliance, rejects missing reply', () => {
    const t = validateSimTurn({
      classification: { category: 'OpenQuestion', alliance: 7, feedback: 'ok', better: 'x' },
      reply: { text: 'No dobra.', talk: 'CHANGE', mood: 'unknown' },
      end: 'true',
    });
    expect(t).toMatchObject({ category: 'openQuestion', alliance: 2, talk: 'change', mood: 'guarded', end: true });
    expect(validateSimTurn({ classification: { category: 'nonsense' }, reply: { text: 'a' } }).category).toBe('closedQuestion');
    expect(() => validateSimTurn({ classification: {}, reply: {} })).toThrow();
    expect(() => validateSimTurn('text')).toThrow();
  });

  it('flashcards: keeps good items, drops broken ones, rejects empty', () => {
    const r = validateFlashcards({ cards: [{ front: 'Q', back: 'A' }, { front: '' }, 5], questions: 'no' });
    expect(r).toEqual({ cards: [{ front: 'Q', back: 'A' }], questions: [] });
    expect(() => validateFlashcards({ cards: [] })).toThrow();
  });

  it('grade: verdict follows the score', () => {
    expect(validateGrade({ score: '82', verdict: 'insufficient' }).verdict).toBe('good');
    expect(validateGrade({ score: 50 }).verdict).toBe('partial');
    expect(validateGrade({ score: -3 })).toMatchObject({ score: 0, verdict: 'insufficient', covered: [] });
  });

  it('answer: only existing source numbers', () => {
    expect(validateAnswer({ answer: 'A [2]', sources: [2, 2, '1', 9, 'x'], known: true }, 3)).toEqual({
      answer: 'A [2]',
      sources: [2, 1],
      known: true,
    });
    expect(validateAnswer({ answer: 'Nie wiem', known: 'false' }, 3).known).toBe(false);
  });

  it('organize: only allowed fields, flat answers accepted', () => {
    expect(validateOrganize({ fields: { data: 'D', hack: 'x' } }, ['data', 'plan'])).toEqual({ data: 'D' });
    expect(validateOrganize({ plan: 'P' }, ['data', 'plan'])).toEqual({ plan: 'P' });
    expect(() => validateOrganize({ fields: {} }, ['data'])).toThrow();
  });

  it('lesson plan: clamps minutes', () => {
    expect(validateLessonPlan({ steps: [{ title: 'A', minutes: 999, description: 'd' }] }).steps[0]!.minutes).toBe(180);
  });

  it('local model: thinking blocks are removed', () => {
    expect(stripThink('<think>hmm</think>\n{"a":1}')).toBe('{"a":1}');
    expect(stripThink('<think>unfinished')).toBe('');
  });
});

/* ----------------------------------------------------------- pseudonymize */

describe('pseudonymisation (PL)', () => {
  const names = ['Jan Kowalski', 'KW-16'];

  it('replaces known names in all forms with one stable placeholder and restores them', () => {
    const p = pseudonymize('Jan Kowalski (KW-16) przyszedł. Kowalskiemu zaproponowałem plan, Jan się zgodził.', {
      lang: 'pl',
      names,
    });
    expect(p.text).not.toMatch(/Kowalsk|KW-16|Jan\b/);
    expect(p.text).toContain('[Osoba A]');
    expect(restore(p.text, p.map)).toContain('Jan Kowalski');
  });

  it('removes birth dates, PESEL, phones, e-mail, address and facility names', () => {
    const src =
      'Ur. 14.03.2008, PESEL 08231401234, tel. 600 123 456, mail ola@example.pl. Mieszka przy ul. Długa 5/3, 00-950 Warszawa. ' +
      'Przebywa w Młodzieżowy Ośrodek Wychowawczy nr 2 w Koninie, wcześniej Szkoła Podstawowa nr 12. Matka – pani Zielińska.';
    const p = pseudonymize(src, { lang: 'pl', names: [] });
    for (const leaked of [
      '14.03.2008',
      '08231401234',
      '600 123 456',
      'ola@example',
      'Długa',
      '00-950',
      'Koninie',
      'nr 12',
      'Zielińsk',
    ])
      expect(p.text).not.toContain(leaked);
    expect(p.text).toMatch(/\[Data 1\]/);
    expect(p.text).toMatch(/\[Placówka 1\]/);
    expect(p.text).toMatch(/pani \[Osoba A\]/);
  });

  it('catches common first names with a surname that the app does not know', () => {
    const p = pseudonymize('Rozmawiałem z Tomaszem Wiśniewskim i jego siostrą Martą.', { lang: 'pl', names: [] });
    expect(p.text).not.toMatch(/Tomasz|Wiśniewsk|Mart/);
  });

  it('leaves professional text untouched', () => {
    const s = 'Dialog motywujący: refleksje złożone, pytania otwarte, afirmacje. Etap kontemplacji, ambiwalencja.';
    expect(pseudonymize(s, { lang: 'pl', names: [] })).toMatchObject({ text: s, count: 0 });
  });
});

describe('pseudonymisation (DE/CH)', () => {
  it('replaces AHV, Swiss phone, address, names with Herr/Frau, facilities', () => {
    const src =
      'Herr Müller (geb. 3. März 2007), AHV 756.1234.5678.97, Tel. 079 123 45 67, wohnt Bahnhofstrasse 12, 3011 Bern. ' +
      'Aufenthalt im Massnahmenzentrum Uitikon, Schule Bümpliz. Seine Freundin Laura Meier kam mit.';
    const p = pseudonymize(src, { lang: 'de', names: [] });
    for (const leaked of [
      'Müller',
      '2007',
      '756.1234',
      '079 123',
      'Bahnhofstrasse',
      '3011',
      'Uitikon',
      'Bümpliz',
      'Laura',
      'Meier',
    ])
      expect(p.text).not.toContain(leaked);
    expect(p.text).toContain('Herr [Person A]');
    expect(p.text).toContain('[Einrichtung 1]');
  });

  it('restores placeholders deep inside an AI answer', () => {
    const p = pseudonymize('Frau Keller', { lang: 'de', names: [] });
    expect(restoreDeep({ a: ['[Person A] wirkt motiviert'] }, p.map)).toEqual({ a: ['Keller wirkt motiviert'] });
  });
});

/* ------------------------------------------------------------------ guard */

const ctx = (o: Partial<GuardContext>): GuardContext => ({
  sensitivity: 'content',
  mode: 'cloud',
  cloudClientData: false,
  presentation: false,
  space: 'practice',
  hasLocalLlm: false,
  ...o,
});

describe('privacy guard', () => {
  it('mode off → nothing', () => {
    for (const s of ['content', 'study', 'client'] as const)
      expect(routeFor(ctx({ mode: 'off', sensitivity: s })).kind).toBe('none');
  });

  it('client data never goes to the cloud by default', () => {
    expect(routeFor(ctx({ sensitivity: 'client' }))).toEqual({ kind: 'none', reason: 'clientLocalOnly' });
    expect(routeFor(ctx({ sensitivity: 'client', hasLocalLlm: true }))).toEqual({ kind: 'device' });
    expect(routeFor(ctx({ sensitivity: 'client', cloudClientData: true }))).toEqual({ kind: 'cloud', consent: true });
    // local LLM available → it wins even when the cloud is allowed
    expect(routeFor(ctx({ sensitivity: 'client', cloudClientData: true, hasLocalLlm: true }))).toEqual({ kind: 'device' });
  });

  it('content and study go to the cloud without consent; local mode needs the local model', () => {
    expect(routeFor(ctx({}))).toEqual({ kind: 'cloud', consent: false });
    expect(routeFor(ctx({ mode: 'local' }))).toEqual({ kind: 'none', reason: 'noLocalLlm' });
    expect(routeFor(ctx({ mode: 'local', hasLocalLlm: true }))).toEqual({ kind: 'device' });
  });

  it('presentation mode: client AI only with demo data', () => {
    expect(routeFor(ctx({ sensitivity: 'client', presentation: true, hasLocalLlm: true }))).toEqual({
      kind: 'none',
      reason: 'presentation',
    });
    expect(routeFor(ctx({ sensitivity: 'client', presentation: true, hasLocalLlm: true, space: 'demo' }))).toEqual({
      kind: 'device',
    });
  });

  it('consent token: exact text, one use, not forgeable', () => {
    expect(() => assertCloudAllowed('client', 'x')).toThrow(AiError);
    const t = grantConsent('exact');
    expect(() => assertCloudAllowed('client', 'exact plus more', t)).toThrow();
    expect(() => assertCloudAllowed('client', 'exact', t)).not.toThrow();
    expect(() => assertCloudAllowed('client', 'exact', t)).toThrow(); // used
    expect(() => assertCloudAllowed('client', 'forged', { text: 'forged', used: false })).toThrow();
    expect(() => assertCloudAllowed('content', 'anything')).not.toThrow();
  });
});

/* ----------------------------------------------------------------- gemini */

const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text }] } }] }), {
    status: 200,
  });
const err = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('Gemini provider', () => {
  it('sends the key in a header, the system prompt and the schema; parses structured output', async () => {
    const fetchImpl = vi.fn(async () =>
      ok(
        '{"classification":{"category":"openQuestion","alliance":1,"feedback":"f","better":"b"},"reply":{"text":"Hm.","talk":"neutral","mood":"calm"},"end":false}',
      ),
    );
    const g = new GeminiProvider({ apiKey: 'AIzaTEST', model: 'gemini-3.8-flash', fetchImpl });
    const r = await g.structured({ system: 'SYS', prompt: 'Hi', schema: simTurnSchema, validate: validateSimTurn });
    expect(r.reply).toBe('Hm.');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIzaTEST');
    const body = JSON.parse(init.body as string);
    expect(body.systemInstruction.parts[0].text).toBe('SYS');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema.title).toBe('simTurn');
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('low');
    expect(url).not.toContain('AIza'); // never in the URL
  });

  it('retries a 429 with a short RetryInfo delay, then succeeds', async () => {
    const retry = {
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'quota',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3s' }],
      },
    };
    const fetchImpl = vi.fn().mockResolvedValueOnce(err(429, retry)).mockResolvedValueOnce(ok('Done'));
    const sleep = vi.fn(async () => undefined);
    const g = new GeminiProvider({ apiKey: 'k', model: 'gemini-3.5-flash-lite', fetchImpl, sleep });
    expect(await g.generate({ system: 's', prompt: 'p' })).toBe('Done');
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('a long quota wait becomes a readable rate-limit error (no endless retries)', async () => {
    const daily = { error: { code: 429, message: 'daily', details: [{ '@type': 'x.RetryInfo', retryDelay: '3600s' }] } };
    const fetchImpl = vi.fn(async () => err(429, daily));
    const g = new GeminiProvider({ apiKey: 'k', model: 'm', fetchImpl, sleep: async () => undefined });
    await expect(g.generate({ system: 's', prompt: 'p' })).rejects.toMatchObject({ code: 'rateLimit', retryAfterS: 3600 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps errors: bad key, server, network, blocked', async () => {
    expect(errorFrom(400, { error: { message: 'API key not valid', details: [{ reason: 'API_KEY_INVALID' }] } }).code).toBe(
      'badKey',
    );
    expect(errorFrom(403, { error: { status: 'PERMISSION_DENIED' } }).code).toBe('badKey');
    expect(errorFrom(503, {}).code).toBe('server');
    expect(parseRetryDelay({ error: { details: [{ '@type': 'google.rpc.RetryInfo', retryDelay: '1.5s' }] } })).toBe(2);
    const net = new GeminiProvider({ apiKey: 'k', model: 'm', fetchImpl: async () => Promise.reject(new TypeError('offline')) });
    await expect(net.generate({ system: 's', prompt: 'p' })).rejects.toMatchObject({ code: 'network' });
    const blocked = new GeminiProvider({
      apiKey: 'k',
      model: 'm',
      fetchImpl: async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } })),
    });
    await expect(blocked.generate({ system: 's', prompt: 'p' })).rejects.toMatchObject({ code: 'blocked' });
  });

  it('streams server-sent events', async () => {
    const sse =
      'data: {"candidates":[{"content":{"parts":[{"text":"Ala "}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"ma kota"}]}}]}\n\n';
    const g = new GeminiProvider({ apiKey: 'k', model: 'm', fetchImpl: async () => new Response(sse) });
    const parts: string[] = [];
    expect(await g.stream({ system: 's', prompt: 'p' }, (c) => parts.push(c))).toBe('Ala ma kota');
    expect(parts).toEqual(['Ala ', 'ma kota']);
  });
});

/* ------------------------------------------------------------ misc rules */

describe('crisis signals', () => {
  it('detects PL / DE / EN signals', () => {
    expect(hasCrisisSignal('Mówi, że ma myśli samobójcze')).toBe(true);
    expect(hasCrisisSignal('Ojciec go bije')).toBe(true);
    expect(hasCrisisSignal('Sie sagt, sie will nicht mehr leben')).toBe(true);
    expect(hasCrisisSignal('He wants to kill myself', undefined)).toBe(true);
    expect(hasCrisisSignal('Rozmowa o planach zawodowych i treningu')).toBe(false);
  });
});

describe('fake provider (tests and E2E)', () => {
  it('classifies deterministically', async () => {
    expect(fakeSimTurn('Musisz przestać pić.', 1).classification.category).toBe('moralize');
    expect(fakeSimTurn('Jak to wygląda u ciebie?', 1).classification.category).toBe('openQuestion');
    const f = new FakeProvider();
    const r = await f.structured({
      system: 's',
      messages: [{ role: 'user', text: 'Brzmi, że to trudne.' }],
      schema: simTurnSchema,
      validate: validateSimTurn,
    });
    expect(r.category).toBe('complexReflection');
    expect(f.log).toHaveLength(1);
  });
});

describe('ONNX runtime glue', () => {
  it('public/ort/*.mjs matches the installed onnxruntime-web (and the pinned version)', () => {
    const pkg = JSON.parse(readFileSync('node_modules/onnxruntime-web/package.json', 'utf8')) as { version: string };
    expect(pkg.version).toBe(ORT_VERSION);
    const local = readFileSync('public/ort/ort-wasm-simd-threaded.asyncify.mjs', 'utf8');
    const installed = readFileSync('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs', 'utf8');
    expect(local === installed).toBe(true);
  });
});

describe('Whisper output safeguards', () => {
  it('collapses hallucinated loops but keeps normal text', async () => {
    const { collapseRepeats, rms, maxTokensFor } = await import('./local/strip');
    expect(collapseRepeats('Właśnie znały się, że to jest to, że to jest to, że to jest to, że to jest to, że')).toBe(
      'Właśnie znały się, że to jest to, że',
    );
    expect(collapseRepeats('nie nie nie nie wiem')).toBe('nie wiem');
    expect(collapseRepeats('Spotkanie było spokojne. Rozmawialiśmy o szkole.')).toBe(
      'Spotkanie było spokojne. Rozmawialiśmy o szkole.',
    );
    expect(collapseRepeats('bardzo bardzo dobrze')).toBe('bardzo bardzo dobrze');
    expect(rms(new Float32Array(100))).toBe(0);
    expect(maxTokensFor(16000 * 3)).toBe(40);
    expect(maxTokensFor(16000 * 600)).toBe(440);
  });
});
