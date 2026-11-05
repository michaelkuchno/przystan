import type { Note, NoteTask } from '@/domain/types';

/** Lower case without diacritics (incl. Polish ł and German ß, which NFD does not decompose). */
export const norm = (s: string) =>
  s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/ß/g, 'ss');

/** Parses "tag1, #tag2  tag3" → unique, trimmed tags without "#". */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,;\n]+|\s+(?=#)/)) {
    const tag = raw.trim().replace(/^#+/, '').trim();
    if (tag && !out.some((x) => norm(x) === norm(tag))) out.push(tag);
  }
  return out;
}

/** Notebook list: filter by query (title, body, tags, conclusions, tasks), type and tag; pinned first, newest first. */
export function filterNotes(notes: Note[], q: string, type: 'all' | Note['type'], tag: string | null): Note[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return notes
    .filter((n) => type === 'all' || n.type === type)
    .filter((n) => !tag || n.tags.some((x) => norm(x) === norm(tag)))
    .filter((n) => {
      if (!words.length) return true;
      const hay = norm(
        [n.title, n.body, n.tags.join(' '), n.role ?? '', n.conclusions ?? '', ...(n.tasks ?? []).map((t) => t.title)].join(' '),
      );
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.date ?? b.updatedAt).localeCompare(a.date ?? a.updatedAt));
}

export function allTags(notes: Note[]): string[] {
  const seen = new Map<string, string>();
  for (const n of notes) for (const t of n.tags) if (!seen.has(norm(t))) seen.set(norm(t), t);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Open supervision tasks for the dashboard, earliest due date first (no date last). */
export function openSupervisionTasks(notes: Note[]): { note: Note; task: NoteTask }[] {
  return notes
    .filter((n) => n.type === 'supervision')
    .flatMap((note) => (note.tasks ?? []).filter((t) => !t.done).map((task) => ({ note, task })))
    .sort((a, b) => (a.task.due ?? '9999').localeCompare(b.task.due ?? '9999'));
}
