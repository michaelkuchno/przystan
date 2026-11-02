import { describe, expect, it } from 'vitest';
import { parseDeckImport, shuffle } from './decks';

describe('deck import', () => {
  it('accepts a single deck, an array and {decks}', () => {
    const one = { title: 'T', cards: [{ front: 'a', back: 'b' }] };
    expect(parseDeckImport(JSON.stringify(one))).toHaveLength(1);
    expect(parseDeckImport(JSON.stringify([one, one]))).toHaveLength(2);
    expect(parseDeckImport(JSON.stringify({ decks: [one] }))[0]!.cards[0]).toEqual({ front: 'a', back: 'b' });
  });

  it('rejects malformed decks', () => {
    expect(() => parseDeckImport('{"title": 1}')).toThrow();
    expect(() => parseDeckImport('{"title":"x","cards":[{"front":1}]}')).toThrow();
    expect(() => parseDeckImport('nope')).toThrow();
  });
});

describe('shuffle', () => {
  it('keeps all elements', () => {
    const a = [1, 2, 3, 4, 5];
    expect(shuffle(a).sort()).toEqual(a);
  });
});
