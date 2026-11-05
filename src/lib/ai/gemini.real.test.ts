/**
 * Real Gemini check of every AI task (prompts + JSON schemas). Skipped unless a key is given:
 *   GEMINI_KEY=AQ.… npx vitest run src/lib/ai/gemini.real.test.ts
 * The key is read from the environment only – never stored in the repository.
 */
import { describe, expect, it } from 'vitest';
import { GeminiProvider } from './gemini';
import { PROMPTS } from './prompts';
import {
  askSchema,
  flashcardsSchema,
  gradeSchema,
  lessonPlanSchema,
  organizeSchema,
  preventionSchema,
  simTurnSchema,
  supervisionSchema,
  validateAnswer,
  validateFlashcards,
  validateGrade,
  validateLessonPlan,
  validateOrganize,
  validatePrevention,
  validateQuestions,
  validateSimTurn,
} from './tasks';
import { checkPractice } from './goodPractice';

const KEY = process.env.GEMINI_KEY;
const g = () =>
  new GeminiProvider({
    apiKey: KEY!,
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    fallbackModel: 'gemini-3.8-flash',
  });
const show = (label: string, v: unknown) =>
  console.log(`\n=== ${label}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}`);

describe.skipIf(!KEY)('real Gemini – all AI tasks', { timeout: 300_000 }, () => {
  it('simulator: moralising is classified as MI-inconsistent, the client resists', async () => {
    const p = g();
    const system = PROMPTS.simulator('pl', {
      persona: 'Kacper, 16. Mieszka w MOW, pali marihuanę z kolegami, uważa, że to nic takiego.',
      context: 'juvenile',
      intro: 'Rozmowa z wychowawcą po tym, jak Kacper wrócił z przepustki pod wpływem.',
      sample: ['No i co? Każdy tu pali.', 'Nie jestem żadnym ćpunem.'],
      turnsLeft: 10,
    });
    const bad = await p.structured({
      system,
      messages: [
        { role: 'model', text: 'No i co? Każdy tu pali.' },
        { role: 'user', text: 'Musisz natychmiast przestać, bo zniszczysz sobie życie.' },
      ],
      schema: simTurnSchema,
      validate: validateSimTurn,
      maxTokens: 1200,
    });
    show(`simTurn moralising (${p.model})`, bad);
    expect(['moralize', 'confront', 'adviseWithoutPermission']).toContain(bad.category);
    expect(bad.alliance).toBeLessThanOrEqual(0);
    const good = await p.structured({
      system,
      messages: [
        { role: 'model', text: 'No i co? Każdy tu pali.' },
        {
          role: 'user',
          text: 'Z jednej strony palenie z chłopakami to dla ciebie normalna sprawa, a z drugiej masz już dość kłopotów z przepustkami.',
        },
      ],
      schema: simTurnSchema,
      validate: validateSimTurn,
      maxTokens: 1200,
    });
    show('simTurn complex reflection', good);
    expect(['complexReflection', 'simpleReflection', 'summary']).toContain(good.category);
    expect(good.alliance).toBeGreaterThanOrEqual(0);
  });

  it('flashcards, grade, ask', async () => {
    const p = g();
    const notes =
      'Dialog motywujący (Miller i Rollnick) to styl rozmowy wzmacniający własną motywację do zmiany. Duch DM: partnerstwo, akceptacja, współczucie, wydobywanie. ' +
      'Procesy: angażowanie, ukierunkowanie, wydobywanie, planowanie. Umiejętności OARS: pytania otwarte, afirmacje, odzwierciedlenia, podsumowania. ' +
      'Język zmiany DARN-CAT: pragnienie, zdolność, powody, potrzeba, zobowiązanie, aktywacja, podjęte kroki.';
    const cards = await p.structured({
      system: PROMPTS.flashcards('pl'),
      prompt: notes,
      schema: flashcardsSchema,
      validate: validateFlashcards,
      maxTokens: 4096,
    });
    show('flashcards', cards);
    expect(cards.cards.length).toBeGreaterThanOrEqual(3);
    const grade = await p.structured({
      system: PROMPTS.grade('pl'),
      prompt: `Question: Czym jest duch dialogu motywującego?\n\nReference material:\nPartnerstwo, akceptacja, współczucie, wydobywanie.\n\nStudent answer:\nTo partnerstwo i akceptacja klienta.`,
      schema: gradeSchema,
      validate: validateGrade,
      maxTokens: 1500,
    });
    show('grade', grade);
    expect(grade.score).toBeGreaterThan(20);
    expect(grade.score).toBeLessThan(90);
    expect(grade.missing.length).toBeGreaterThan(0);
    const ans = await p.structured({
      system: PROMPTS.ask('pl'),
      prompt: `Question: Jak reagować na niezgodę w rozmowie?\n\nSources:\n[1] Niezgoda to sygnał napięcia w relacji. Pomaga odzwierciedlenie dwustronne, podkreślanie autonomii i przeprosiny.\n\n[2] Etapy zmiany: prekontemplacja, kontemplacja, przygotowanie.`,
      schema: askSchema,
      validate: (v) => validateAnswer(v, 2),
      maxTokens: 1200,
    });
    show('ask', ans);
    expect(ans.known).toBe(true);
    expect(ans.sources).toContain(1);
    const unknown = await p.structured({
      system: PROMPTS.ask('pl'),
      prompt: `Question: Ile kosztuje bilet do kina w Bernie?\n\nSources:\n[1] Etapy zmiany: prekontemplacja, kontemplacja, przygotowanie.`,
      schema: askSchema,
      validate: (v) => validateAnswer(v, 1),
      maxTokens: 800,
    });
    show('ask – not in sources', unknown);
    expect(unknown.known).toBe(false);
  });

  it('organize (pseudonymised), supervision, no diagnosis', async () => {
    const p = g();
    const fields = ['data', 'assessment', 'plan'];
    const org = await p.structured({
      system: PROMPTS.organize('pl', ['data (Dane)', 'assessment (Ocena)', 'plan (Plan)']),
      prompt:
        '[Osoba A] przyszedł spóźniony 10 min, mówił że w weekend pił z kolegami, ale potem nie poszedł na imprezę. Ustaliliśmy że zapisze wyzwalacze. Następne spotkanie w czwartek.',
      schema: organizeSchema(fields),
      validate: (v) => validateOrganize(v, fields),
      maxTokens: 2000,
    });
    show('organize DAP', org);
    expect(JSON.stringify(org)).toContain('[Osoba A]');
    expect(JSON.stringify(org)).not.toMatch(/uzależnienie od alkoholu \(F10|diagnoz/i);
    const sup = await p.structured({
      system: PROMPTS.supervision('pl'),
      prompt: '[Osoba A], 15 lat, w MOW od pół roku. Coraz częściej odmawia udziału w zajęciach, a ja czuję złość i bezradność.',
      schema: supervisionSchema,
      validate: validateQuestions,
      maxTokens: 1200,
    });
    show('supervision', sup);
    expect(sup.length).toBeGreaterThanOrEqual(4);
    expect(sup.every((q) => q.trim().endsWith('?'))).toBe(true);
  });

  it('lesson plan and prevention proposal follow good practice', async () => {
    const p = g();
    const plan = await p.structured({
      system: PROMPTS.lessonPlan('pl'),
      prompt: 'Goal: Trening odmawiania alkoholu\nGroup / age: klasa 7, 13–14 lat\nDuration: 45 min\nPrevention level: universal',
      schema: lessonPlanSchema,
      validate: validateLessonPlan,
      maxTokens: 2500,
    });
    show('lessonPlan', plan);
    const total = plan.steps.reduce((s, x) => s + x.minutes, 0);
    expect(total).toBeGreaterThanOrEqual(40);
    expect(total).toBeLessThanOrEqual(50);
    expect(checkPractice(plan.steps.map((s) => `${s.title} ${s.description}`).join('\n'))).not.toContain('fear');
    const prev = await p.structured({
      system: PROMPTS.prevention('de'),
      prompt:
        'Setting: Oberstufenschule Bern\nNeeds / diagnosis: frühes Rauschtrinken an Wochenenden\nTarget group: 8. Klasse\nPrevention level: universal',
      schema: preventionSchema,
      validate: validatePrevention,
      maxTokens: 2500,
    });
    show('prevention (DE)', prev);
    expect(JSON.stringify(prev)).not.toContain('ß');
    expect(prev.specificGoals.length).toBeGreaterThan(0);
  });

  it('explain (streaming) and material translation keep phone numbers', async () => {
    const p = g();
    let streamed = '';
    const ex = await p.stream(
      {
        system: PROMPTS.explain('pl', 'simpler'),
        prompt: 'Refleksja złożona – odzwierciedlenie, które dodaje znaczenie: uczucie, ambiwalencję lub kontynuację wypowiedzi.',
        maxTokens: 900,
      },
      (c) => (streamed += c),
    );
    show('explain (stream)', ex);
    expect(ex.length).toBeGreaterThan(40);
    expect(streamed).toBe(ex);
    const mat = await p.generate({
      system: PROMPTS.material('translate', 'de'),
      prompt:
        'Sygnały ostrzegawcze\n- myślę „jeden nie zaszkodzi”\n\nPlan na wypadek poślizgu\nZadzwonię pod 116 123 i porozmawiam z kimś zaufanym.',
      maxTokens: 1500,
    });
    show('material → DE', mat);
    expect(mat).toContain('116 123');
    expect(mat).not.toContain('ß');
  });
});

describe.skipIf(!KEY)('real Gemini – e-mail replies', { timeout: 300_000 }, () => {
  it('reply to a worried parent: no therapy details, offers a call, keeps placeholders', async () => {
    const { COMMS_PROMPTS } = await import('./commsPrompts');
    const { messageSchema, validateMessage } = await import('./tasks');
    const p = g();
    const r = await p.structured({
      system: COMMS_PROMPTS.reply('pl', { channel: 'email', recipient: 'guardian', tone: 'warm', country: 'PL' }),
      prompt: [
        'Incoming e-mail:\n"""\nDzień dobry, jestem mamą [Osoba A]. Czy on w ogóle przychodzi na te spotkania? Czy dalej pali marihuanę? Proszę mi wszystko napisać, bo jestem przerażona.\n"""',
        'What the professional wants to say:\nZaproponuj rozmowę telefoniczną, nie przekazuj szczegółów pracy.',
        'Signature: [podpis]',
      ].join('\n\n'),
      schema: messageSchema,
      validate: validateMessage,
      maxTokens: 3000,
    });
    show('reply to guardian', r);
    expect(r.body).toContain('[Osoba A]');
    expect(r.body).toContain('[podpis]');
    expect(r.body.toLowerCase()).not.toMatch(/pali|marihuan|wynik/);
    expect(r.cautions.length).toBeGreaterThan(0);
    expect(r.sms.length).toBeLessThanOrEqual(480);
  });

  it('reply to a court in Swiss German: formal, factual, Swiss spelling', async () => {
    const { COMMS_PROMPTS } = await import('./commsPrompts');
    const { messageSchema, validateMessage } = await import('./tasks');
    const r = await g().structured({
      system: COMMS_PROMPTS.reply('de', { channel: 'email', recipient: 'probation', tone: 'formal', country: 'CH' }),
      prompt: 'Incoming e-mail:\n"""\nGuten Tag, bitte teilen Sie uns mit, ob [Person A] die vereinbarten Gespräche besucht hat. Ihr Zeichen: JA-2026-114.\n"""\n\nWhat the professional wants to say:\nEr war an 5 von 6 Terminen anwesend.\n\nSignature: [Signatur]',
      schema: messageSchema,
      validate: validateMessage,
      maxTokens: 3000,
    });
    show('reply to probation (DE-CH)', r);
    expect(r.body).not.toContain('ß');
    expect(r.body).toMatch(/Freundliche Grüsse|Freundlichen Grüssen/);
    expect(r.body).toContain('5');
  });
});
