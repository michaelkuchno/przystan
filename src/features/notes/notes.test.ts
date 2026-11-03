import { describe, expect, it } from 'vitest';
import { allTags, filterNotes, openSupervisionTasks, parseTags } from './notes';
import type { Note } from '@/domain/types';

const note = (o: Partial<Note>): Note => ({
  id: Math.random().toString(36),
  type: 'note',
  title: '',
  body: '',
  tags: [],
  pinned: false,
  createdAt: '2026-11-01T10:00:00',
  updatedAt: '2026-11-01T10:00:00',
  ...o,
});

describe('notebook', () => {
  it('parses tags', () => {
    expect(parseTags('MI, #superwizja;  grupa\n#MI #rodzina')).toEqual(['MI', 'superwizja', 'grupa', 'rodzina']);
  });

  it('searches title, body, tags and tasks, ignoring case and diacritics', () => {
    const a = note({ title: 'Opór w rozmowie', tags: ['MI'] });
    const b = note({ type: 'supervision', title: 'Superwizja', conclusions: 'Więcej odzwierciedleń', tasks: [{ id: '1', title: 'Przeczytać rozdział', done: false }] });
    expect(filterNotes([a, b], 'opor', 'all', null)).toEqual([a]);
    expect(filterNotes([a, b], 'odzwierciedlen', 'all', null)).toEqual([b]);
    expect(filterNotes([a, b], 'rozdzial', 'all', null)).toEqual([b]);
    expect(filterNotes([a, b], '', 'supervision', null)).toEqual([b]);
    expect(filterNotes([a, b], '', 'all', 'mi')).toEqual([a]);
  });

  it('lists pinned notes first, then newest', () => {
    const old = note({ title: 'old', updatedAt: '2026-01-01' });
    const recent = note({ title: 'recent', updatedAt: '2026-10-01' });
    const pinned = note({ title: 'pinned', pinned: true, updatedAt: '2025-01-01' });
    expect(filterNotes([old, recent, pinned], '', 'all', null).map((n) => n.title)).toEqual(['pinned', 'recent', 'old']);
  });

  it('collects tags case-insensitively', () => {
    expect(allTags([note({ tags: ['MI', 'grupa'] }), note({ tags: ['mi', 'Rodzina'] })])).toEqual(['grupa', 'MI', 'Rodzina']);
  });

  it('lists open supervision tasks for the dashboard', () => {
    const s = note({
      type: 'supervision',
      tasks: [
        { id: 'a', title: 'bez terminu', done: false },
        { id: 'b', title: 'zrobione', done: true, due: '2026-11-02' },
        { id: 'c', title: 'pilne', done: false, due: '2026-11-05' },
      ],
    });
    const plain = note({ tasks: [{ id: 'x', title: 'not supervision', done: false }] });
    expect(openSupervisionTasks([s, plain]).map((x) => x.task.title)).toEqual(['pilne', 'bez terminu']);
  });
});
