/**
 * Deterministic provider for unit and E2E tests (no network). Enabled in the browser only when the
 * test runner sets `window.__PRZYSTAN_FAKE_AI__ = true` before the app loads. It answers by the
 * schema title (= task) and, for the simulator, by simple rules on the trainee's utterance.
 */
import type { AiProvider, Embedder, GenerateRequest, StructuredRequest, Transcriber } from './types';

export const fakeEnabled = () =>
  typeof window !== 'undefined' && (window as unknown as { __PRZYSTAN_FAKE_AI__?: boolean }).__PRZYSTAN_FAKE_AI__ === true;

function lastUser(req: GenerateRequest): string {
  const msgs = req.messages ?? [{ role: 'user' as const, text: req.prompt ?? '' }];
  return [...msgs].reverse().find((m) => m.role === 'user')?.text ?? '';
}

export function fakeSimTurn(utterance: string, turn: number) {
  const u = utterance.trim();
  const lower = u.toLowerCase();
  const moralize = /(musisz|powinien|powinnaś|powinieneś|you should|you must|du musst|du solltest)/.test(lower);
  const question = u.endsWith('?');
  const open = question && /^(co|jak|w jaki|opowiedz|what|how|tell|was|wie|erzähl)/.test(lower);
  const category = moralize ? 'moralize' : question ? (open ? 'openQuestion' : 'closedQuestion') : 'complexReflection';
  const good = category === 'complexReflection' || category === 'openQuestion';
  return {
    classification: {
      category,
      alliance: moralize ? -2 : good ? 1 : 0,
      feedback: moralize ? 'FAKE: Moralizowanie budzi opór.' : 'FAKE: Wypowiedź wspiera rozmowę.',
      better: 'FAKE: Z jednej strony to dla ciebie ważne, z drugiej masz wątpliwości.',
    },
    reply: {
      text: moralize ? `FAKE ${turn}: Nie będziesz mi mówić, co mam robić.` : `FAKE ${turn}: Może faktycznie coś bym zmienił.`,
      talk: moralize ? 'sustain' : 'change',
      mood: moralize ? 'angry' : 'hopeful',
    },
    end: false,
  };
}

const ANSWERS: Record<string, (req: GenerateRequest) => unknown> = {
  simTurn: (req) => fakeSimTurn(lastUser(req), (req.messages?.length ?? 1) >> 1),
  flashcards: () => ({
    cards: [
      { front: 'FAKE: Czym jest refleksja złożona?', back: 'Refleksja, która dodaje znaczenie do wypowiedzi.' },
      { front: 'FAKE: Co oznacza skrót OARS?', back: 'Pytania otwarte, afirmacje, refleksje, podsumowania.' },
    ],
    questions: [
      { question: 'FAKE: Opisz ducha dialogu motywującego.', answer: 'Partnerstwo, akceptacja, współczucie, wydobywanie.' },
    ],
  }),
  grade: () => ({
    score: 60,
    verdict: 'partial',
    covered: ['FAKE: definicja'],
    missing: ['FAKE: przykład'],
    modelAnswer: 'FAKE: wzorcowa odpowiedź.',
    tip: 'FAKE: dodaj przykład z praktyki.',
  }),
  ask: () => ({ answer: 'FAKE: Według karty [1] chodzi o dialog motywujący.', sources: [1], known: true }),
  organize: () => ({
    fields: { course: 'FAKE: uporządkowany przebieg', observations: 'FAKE: obserwacje', nextStep: 'FAKE: kolejny krok' },
  }),
  lessonPlan: () => ({
    title: 'FAKE: Zajęcia o presji rówieśniczej',
    steps: [
      { title: 'Rozgrzewka', minutes: 10, description: 'FAKE: krótka integracja' },
      { title: 'Scenki', minutes: 25, description: 'FAKE: odgrywanie odmawiania' },
      { title: 'Podsumowanie', minutes: 10, description: 'FAKE: runda refleksji' },
    ],
  }),
  prevention: () => ({
    generalGoal: 'FAKE: Opóźnienie inicjacji alkoholowej',
    specificGoals: ['FAKE: Uczniowie potrafią odmówić w 3 scenkach do czerwca'],
    strategies: ['FAKE: Trening umiejętności życiowych'],
    riskFactors: ['FAKE: Presja rówieśnicza'],
    protectiveFactors: ['FAKE: Więź ze szkołą'],
  }),
  supervision: () => ({
    questions: ['FAKE: Co czujesz, myśląc o tej sytuacji?', 'FAKE: Jakie mocne strony widzisz u [Osoba A]?'],
  }),
};

export class FakeProvider implements AiProvider {
  readonly id = 'fake' as const;
  readonly where = 'cloud' as const;
  /** Every request, for assertions in tests. */
  readonly log: GenerateRequest[] = [];

  async generate(req: GenerateRequest): Promise<string> {
    this.log.push(req);
    return `FAKE: ${lastUser(req).slice(0, 60)} – pomocnicze wyjaśnienie.`;
  }

  async stream(req: GenerateRequest, onText: (c: string) => void): Promise<string> {
    const t = await this.generate(req);
    onText(t);
    return t;
  }

  async structured<T>(req: StructuredRequest<T>): Promise<T> {
    this.log.push(req);
    const task = String(req.schema.title ?? '');
    const make = ANSWERS[task];
    if (!make) throw new Error(`fake: unknown task ${task}`);
    return req.validate(make(req));
  }
}

/** Bag-of-words hashing – similar texts get similar vectors (enough for E2E of semantic search). */
export const fakeEmbedder: Embedder = {
  async embed(texts) {
    return texts.map((t) => {
      const v = new Float32Array(64);
      for (const w of t
        .toLowerCase()
        .split(/[^\p{L}\d]+/u)
        .filter((x) => x.length > 2)) {
        let h = 0;
        for (const ch of w.slice(0, 6)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        v[h % 64]! += 1;
      }
      const n = Math.hypot(...v) || 1;
      return v.map((x) => x / n);
    });
  },
};

export const fakeTranscriber: Transcriber = {
  async transcribe() {
    return 'FAKE: podyktowany tekst notatki';
  },
};
