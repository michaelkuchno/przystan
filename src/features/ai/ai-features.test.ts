import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDbForTests, db } from '@/lib/db';
import { lock, setupVault } from '@/lib/vault';
import { clearStore } from '@/lib/store';
import { setPrefs, getPrefs } from '@/lib/prefs';
import { defaultAiPrefs } from '@/lib/ai/settings';
import { currentRoute, getEmbedder, getTranscriber, providerFor } from '@/lib/ai';
import { fakeEmbedder } from '@/lib/ai/fake';
import { deleteApiKey, loadApiKey, looksLikeApiKey, saveApiKey } from '@/lib/ai/key';
import { checkPractice } from '@/lib/ai/goodPractice';
import { statsFrom } from '@/features/simulator/sim';
import { dot, hash, keywordSearch, semanticSearch, updateIndex, type AskDoc } from './semantic';
import { appendText } from './text';

let n = 0;
beforeEach(async () => {
  resetDbForTests(`ai-${++n}`);
  lock();
  clearStore();
  await setPrefs({ ai: defaultAiPrefs(), presentation: false });
});

const docs: AskDoc[] = [
  {
    id: 'mi',
    kind: 'knowledge',
    title: 'Dialog motywujący',
    body: 'Refleksje, pytania otwarte, praca z oporem i ambiwalencją.',
    to: '/knowledge/mi',
  },
  {
    id: 'rp',
    kind: 'knowledge',
    title: 'Zapobieganie nawrotom',
    body: 'Sytuacje wysokiego ryzyka, wyzwalacze, plan na wypadek poślizgu.',
    to: '/knowledge/rp',
  },
  { id: 'n1', kind: 'note', title: 'Moja notatka', body: 'Opór nastolatka na zajęciach – refleksja pomogła.', to: '/notes/n1' },
];

describe('mode "off": no provider, no network', () => {
  it('routes nothing and creates no provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    for (const s of ['content', 'study', 'client'] as const) {
      const r = currentRoute(s);
      expect(r).toEqual({ kind: 'none', reason: 'off' });
      await expect(providerFor(r, s)).rejects.toMatchObject({ code: 'unavailable' });
    }
    expect(await getEmbedder()).toBeNull();
    expect(await getTranscriber('study')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('client text has no route in cloud mode unless allowed; never transcribed in the cloud', async () => {
    await setPrefs({ ai: { ...getPrefs().ai, mode: 'cloud' } });
    expect(currentRoute('client')).toEqual({ kind: 'none', reason: 'clientLocalOnly' });
    expect(currentRoute('content')).toEqual({ kind: 'cloud', consent: false });
    expect(await getTranscriber('client')).toBeNull();
  });

  it('cloud provider without a key → AiError(noKey)', async () => {
    await setupVault('secret-123', 1000);
    await setPrefs({ ai: { ...getPrefs().ai, mode: 'cloud' } });
    await expect(providerFor({ kind: 'cloud', consent: false }, 'content')).rejects.toMatchObject({ code: 'noKey' });
  });
});

describe('Gemini key storage', () => {
  it('is encrypted with the data key, never stored in plain text', async () => {
    await setupVault('secret-123', 1000);
    const key = 'AIza' + 'x'.repeat(35);
    expect(looksLikeApiKey(key)).toBe(true);
    // newer AI Studio format ("AQ.…"), as issued in November 2026
    expect(looksLikeApiKey('AQ.Ab0Fake00' + 'x'.repeat(40))).toBe(true);
    expect(looksLikeApiKey('  AQ.Ab0Fake00' + 'y'.repeat(40) + '  ')).toBe(true);
    expect(looksLikeApiKey('sk-123')).toBe(false);
    expect(looksLikeApiKey('not-a-key')).toBe(false);
    expect(looksLikeApiKey('AQ.Ab0F ake00' + 'x'.repeat(40))).toBe(false);
    await saveApiKey(key);
    const raw = JSON.stringify(await db.meta.get('aiKey'));
    expect(raw).not.toContain('xxxxxxxx');
    expect(await loadApiKey()).toBe(key);
    await deleteApiKey();
    expect(await loadApiKey()).toBeNull();
  });
});

describe('semantic search', () => {
  it('hash and dot product', () => {
    expect(hash('a')).not.toBe(hash('b'));
    expect(dot(Float32Array.from([1, 0]), Float32Array.from([0.5, 0.5]))).toBe(0.5);
  });

  it('builds an encrypted index, reuses unchanged vectors and finds the closest documents', async () => {
    await setupVault('secret-123', 1000);
    const spy = vi.spyOn(fakeEmbedder, 'embed');
    const v1 = await updateIndex('practice:pl', docs, fakeEmbedder, 'fake');
    expect(v1.size).toBe(3);
    expect(spy).toHaveBeenCalledTimes(1);
    const raw = JSON.stringify(await db.meta.get('aiIndex:practice:pl'));
    expect(raw).not.toContain('nastolatka'); // encrypted
    // unchanged documents are not embedded again; a changed one is
    spy.mockClear();
    await updateIndex('practice:pl', docs, fakeEmbedder, 'fake');
    expect(spy).not.toHaveBeenCalled();
    await updateIndex('practice:pl', [{ ...docs[0]!, body: 'nowa treść' }, docs[1]!], fakeEmbedder, 'fake');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toHaveLength(1);
    const [q] = await fakeEmbedder.embed(['wyzwalacze ryzyka nawrotu'], 'query');
    const hits = semanticSearch(q!, docs, v1);
    expect(hits[0]!.doc.id).toBe('rp');
    spy.mockRestore();
  });

  it('keyword fallback understands inflected words', () => {
    expect(keywordSearch('Jak pracować z oporem nastolatków?', docs)[0]!.doc.id).toBe('n1');
    expect(keywordSearch('xy', docs)).toEqual([]);
  });
});

describe('good-practice check (prevention)', () => {
  it('flags scare tactics, ex-user talks, one-off lectures, drug details, moralising', () => {
    expect(checkPractice('Pokażemy drastyczne zdjęcia płuc, żeby ich przestraszyć')).toContain('fear');
    expect(checkPractice('Spotkanie z byłym narkomanem')).toContain('exUser');
    expect(checkPractice('Jednorazowa pogadanka w auli')).toContain('oneOff');
    expect(checkPractice('Wir zeigen Schockbilder zur Abschreckung')).toContain('fear');
    expect(checkPractice('Trening umiejętności odmawiania w scenkach, 6 spotkań')).toEqual([]);
    // negated mentions are good practice (real Gemini answer, 05.11.2026)
    expect(checkPractice('Prowadzący prezentuje strategie asertywnej odmowy bez używania taktyk straszenia.')).toEqual([]);
    expect(checkPractice('Nie moralizujemy, unikamy straszenia.')).toEqual([]);
    expect(checkPractice('Interaktiv, ohne Abschreckung und ohne Moralisieren.')).toEqual([]);
    expect(checkPractice('Interactive sessions, avoid scare tactics.')).toEqual([]);
    // …but a real scare tactic in the same text is still found
    expect(checkPractice('Bez wykładu. Pokażemy zdjęcia płuc, żeby przestraszyć.')).toContain('fear');
  });
});

describe('simulator statistics from live turns', () => {
  it('computes alliance, change talk and MITI ratios', () => {
    const s = statsFrom([
      { category: 'openQuestion', alliance: 1, talk: 'neutral' },
      { category: 'complexReflection', alliance: 2, talk: 'change' },
      { category: 'simpleReflection', alliance: 1, talk: 'change' },
      { category: 'moralize', alliance: -2, talk: 'sustain' },
    ]);
    expect(s).toMatchObject({
      alliance: 70,
      changeTalk: 2,
      sustainTalk: 1,
      rq: 2,
      pctOpen: 100,
      pctComplex: 50,
      miInconsistent: 1,
    });
  });
});

describe('text helpers', () => {
  it('appends on a new line and never replaces', () => {
    expect(appendText('', 'a')).toBe('a');
    expect(appendText('x  \n', 'a')).toBe('x\na');
  });
});
