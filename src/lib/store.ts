/**
 * Decrypted in-memory record store for the active space.
 *
 * On unlock (or mode switch) every record of the active space is decrypted once
 * into memory; reads are synchronous; writes encrypt and persist, then notify
 * subscribers. The dataset of a single practitioner is small (hundreds to a few
 * thousand records), so this is fast and keeps the UI simple.
 */
import { useSyncExternalStore } from 'react';
import { db, type StoredRecord } from './db';
import { decryptJson, encryptJson } from './crypto';
import { getKey } from './vault';
import type { RecordKind, RecordMap, Space } from '@/domain/types';

type AnyRecord = RecordMap[RecordKind];

const cache = new Map<string, { kind: RecordKind; value: AnyRecord }>();
let space: Space = 'practice';
let version = 0;
let loaded = false;
const subs = new Set<() => void>();

function notify() {
  version++;
  subs.forEach((s) => s());
}

export function aad(id: string, kind: RecordKind, sp: Space) {
  return `${id}|${kind}|${sp}`;
}

export function uid(): string {
  return crypto.randomUUID();
}

export function activeSpace(): Space {
  return space;
}

export function isLoaded() {
  return loaded;
}

/** Decrypts all live records of a space into memory. */
export async function loadSpace(sp: Space): Promise<void> {
  const key = getKey();
  const rows = await db.records.where('space').equals(sp).toArray();
  cache.clear();
  for (const r of rows) {
    if (r.deletedAt) continue;
    const value = await decryptJson<AnyRecord>(key, r.data, aad(r.id, r.kind, r.space));
    cache.set(r.id, { kind: r.kind, value });
  }
  space = sp;
  loaded = true;
  notify();
}

export function clearStore() {
  cache.clear();
  loaded = false;
  notify();
}

function clientIdOf(kind: RecordKind, value: AnyRecord): string {
  if (kind === 'client') return value.id;
  const c = (value as { clientId?: string }).clientId;
  return c ?? '';
}

async function persist(kind: RecordKind, value: AnyRecord, sp: Space) {
  const row: StoredRecord = {
    id: value.id,
    kind,
    space: sp,
    clientId: clientIdOf(kind, value),
    updatedAt: Date.now(),
    deletedAt: 0,
    data: await encryptJson(getKey(), value, aad(value.id, kind, sp)),
  };
  await db.records.put(row);
}

export async function save<K extends RecordKind>(kind: K, value: RecordMap[K]): Promise<RecordMap[K]> {
  await persist(kind, value, space);
  cache.set(value.id, { kind, value });
  notify();
  return value;
}

/** Bulk insert into a given space (used by demo seeding and import). */
export async function saveMany(items: { kind: RecordKind; value: AnyRecord }[], sp: Space = space) {
  const key = getKey();
  const rows: StoredRecord[] = [];
  for (const { kind, value } of items) {
    rows.push({
      id: value.id,
      kind,
      space: sp,
      clientId: clientIdOf(kind, value),
      updatedAt: Date.now(),
      deletedAt: 0,
      data: await encryptJson(key, value, aad(value.id, kind, sp)),
    });
  }
  await db.records.bulkPut(rows);
  if (sp === space) {
    for (const { kind, value } of items) cache.set(value.id, { kind, value });
    notify();
  }
}

/**
 * Soft-deletes a record (and, for clients, all their records).
 * Returns an undo function valid until purgeDeleted() runs.
 */
export async function remove(kind: RecordKind, id: string): Promise<() => Promise<void>> {
  const now = Date.now();
  const ids = [id];
  if (kind === 'client') {
    const related = await db.records.where('clientId').equals(id).primaryKeys();
    ids.push(...related.filter((x) => x !== id));
  }
  await db.records.where('id').anyOf(ids).modify({ deletedAt: now });
  const removed = ids.map((x) => [x, cache.get(x)] as const);
  ids.forEach((x) => cache.delete(x));
  notify();
  return async () => {
    await db.records.where('id').anyOf(ids).modify({ deletedAt: 0 });
    for (const [x, entry] of removed) if (entry) cache.set(x, entry);
    notify();
  };
}

/** Permanently removes soft-deleted rows older than `olderThanMs`. */
export async function purgeDeleted(olderThanMs = 60_000) {
  const limit = Date.now() - olderThanMs;
  await db.records.where('deletedAt').between(1, limit, true, true).delete();
}

/** Removes all records of a space (e.g. reset demo). */
export async function clearSpace(sp: Space) {
  await db.records.where('space').equals(sp).delete();
  if (sp === space) {
    cache.clear();
    notify();
  }
}

export function all<K extends RecordKind>(kind: K): RecordMap[K][] {
  const out: RecordMap[K][] = [];
  for (const e of cache.values()) if (e.kind === kind) out.push(e.value as RecordMap[K]);
  return out;
}

export function get<K extends RecordKind>(kind: K, id: string | undefined): RecordMap[K] | undefined {
  if (!id) return undefined;
  const e = cache.get(id);
  return e && e.kind === kind ? (e.value as RecordMap[K]) : undefined;
}

export function forClient<K extends RecordKind>(kind: K, clientId: string): RecordMap[K][] {
  return all(kind).filter((v) => (v as { clientId?: string }).clientId === clientId);
}

export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function storeVersion() {
  return version;
}

/**
 * React hook: re-renders when the store changes. The selector runs on each
 * change; keep it cheap (filters over in-memory arrays are fine).
 */
export function useStore<T>(selector: () => T): T {
  useSyncExternalStore(subscribe, storeVersion, storeVersion);
  return selector();
}
