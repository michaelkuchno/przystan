import { useCallback, useEffect, useRef, useState } from 'react';
import { save } from './store';
import type { RecordKind, RecordMap } from '@/domain/types';

/**
 * Local editable copy of a record with debounced autosave (600 ms).
 * Returns the draft, an updater and a status for the "saved" indicator.
 */
export function useEditable<K extends RecordKind>(kind: K, initial: RecordMap[K], opts: { autosave?: boolean } = {}) {
  const autosave = opts.autosave ?? true;
  const [draft, setDraft] = useState<RecordMap[K]>(initial);
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setStatus('saving');
    const v = { ...latest.current } as RecordMap[K] & { updatedAt?: string };
    if ('updatedAt' in v) v.updatedAt = new Date().toISOString();
    await save(kind, v);
    setStatus('saved');
  }, [kind]);

  const update = useCallback(
    (patch: Partial<RecordMap[K]> | ((d: RecordMap[K]) => RecordMap[K])) => {
      setDraft((d) => (typeof patch === 'function' ? patch(d) : { ...d, ...patch }));
      setStatus('dirty');
      if (autosave) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 600);
      }
    },
    [autosave, flush],
  );

  // save pending changes on unmount
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        save(kind, latest.current).catch(() => undefined);
      }
    },
    [kind],
  );

  return { draft, update, flush, status };
}
