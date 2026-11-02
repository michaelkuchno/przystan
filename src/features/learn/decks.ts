import { useContent } from '@/content/ContentProvider';
import { all, useStore } from '@/lib/store';
import type { Deck } from '@/domain/types';

export function useDecks(): Deck[] {
  const builtIn = useContent('decks').decks;
  const custom = useStore(() => all('deck'));
  return [...builtIn, ...custom];
}

/** Validates an imported deck file ({title, cards:[{front, back}]}, or {decks:[…]}). */
export function parseDeckImport(text: string): { title: string; module?: string; cards: { front: string; back: string }[] }[] {
  const data = JSON.parse(text) as unknown;
  const list = Array.isArray(data) ? data : (data as { decks?: unknown[] }).decks ?? [data];
  const out = list.map((d) => {
    const deck = d as { title?: unknown; module?: unknown; cards?: unknown };
    if (typeof deck.title !== 'string' || !Array.isArray(deck.cards)) throw new Error('invalid');
    const cards = deck.cards.map((c) => {
      const card = c as { front?: unknown; back?: unknown };
      if (typeof card.front !== 'string' || typeof card.back !== 'string') throw new Error('invalid');
      return { front: card.front, back: card.back };
    });
    return { title: deck.title, ...(typeof deck.module === 'string' ? { module: deck.module } : {}), cards };
  });
  if (!out.length) throw new Error('invalid');
  return out;
}

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
