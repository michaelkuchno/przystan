import { describe, expect, it } from 'vitest';
import { norm, search } from './searchIndex';

const docs = [
  {
    id: '1',
    kind: 'knowledge' as const,
    title: 'Dialog motywujący',
    body: 'OARS, pytania otwarte, odzwierciedlenia',
    to: '/k/1',
  },
  {
    id: '2',
    kind: 'knowledge' as const,
    title: 'Zapobieganie nawrotom',
    body: 'sytuacje wysokiego ryzyka, źródła wsparcia',
    to: '/k/2',
  },
];

describe('search', () => {
  it('normalises Polish diacritics', () => {
    expect(norm('Źródła ŁĄKA')).toBe('zrodla laka');
  });

  it('finds by title and body, ranks title matches higher', () => {
    expect(search(docs, 'motywujacy')[0]!.id).toBe('1');
    expect(search(docs, 'zrodla')[0]!.id).toBe('2');
    expect(search(docs, 'oars otwarte').map((h) => h.id)).toEqual(['1']);
  });

  it('requires all terms and ignores 1-letter queries', () => {
    expect(search(docs, 'oars nawrotom')).toEqual([]);
    expect(search(docs, 'a')).toEqual([]);
  });
});
