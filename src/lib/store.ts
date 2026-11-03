/**
 * Decrypted in-memory record store for the active space.
 *
 * On unlock (or mode switch) every record of the active space is decrypted once
 * into memory; reads are synchronous; writes encrypt and persist, then notify
 * subscribers. The dataset of a single practitioner is small (hundreds to a few
 * thousand records), so this is fast and keeps the UI simple.
 *
 * History and audit (docs/DECISIONS.md D-049): every change of a record in the
 * work space also stores an encrypted snapshot (version) and an audit entry, in
 * the same transaction. Deleted records go to the trash for TRASH_DAYS days.
 */
import { useSyncExternalStore } from 'react';
import { db, type StoredRecord, type VersionOp, type VersionRow } from './db';
import { decryptJson, encryptJson } from './crypto';
import { getKey, lockEpoch } from './vault';
import { buildEntries, redactDetails, serial, writeEntries, type AuditAction, type AuditInput } from './audit';
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

/** Version snapshots use their own AAD so they cannot be swapped with live records. */
export function versionAad(id: string, kind: RecordKind, sp: Space) {
  return `v|${id}|${kind}|${sp}`;
}

/** Edits of one record within this window (same unlock session) are folded into one version. */
export const FOLD_MS = 5 * 60_000;
/** Deleted records stay in the trash this long before permanent deletion. */
export const TRASH_DAYS = 30;
export const TRASH_MS = TRASH_DAYS * 86_400_000;

/**
 * Kinds without history: spaced-repetition state changes on every reviewed
 * flash card and has no documentary value.
 */
const UNVERSIONED: ReadonlySet<RecordKind> = new Set<RecordKind>(['cardState']);

/** History and audit cover the real work space only (the training space holds fictional data). */
export function isTracked(kind: RecordKind, sp: Space): boolean {
  return sp === 'practice' && !UNVERSIONED.has(kind);
}

/** Short human readable label of a record for the audit log (stored encrypted). */
export function recordLabel(kind: RecordKind, value: unknown): string {
  const v = (value ?? {}) as Record<string, unknown>;
  for (const k of ['code', 'title', 'name', 'date']) {
    const x = v[k];
    if (typeof x === 'string' && x.trim()) return x.trim().slice(0, 80);
  }
  if (kind === 'measurement') {
    const src = v.source as { instrument?: string; tool?: string } | undefined;
    return src?.instrument ?? src?.tool ?? '';
  }
  return '';
}

/** JSON without the volatile `updatedAt` – to skip saves that change nothing. */
function contentKey(value: unknown): string {
  const { updatedAt: _u, ...rest } = (value ?? {}) as Record<string, unknown>;
  return JSON.stringify(rest);
}

type RevertListener = (id: string, value: AnyRecord) => void;
const revertListeners = new Set<RevertListener>();

/** Editors with a local draft listen here so a restored version replaces the draft. */
export function onRevert(fn: RevertListener): () => void {
  revertListeners.add(fn);
  return () => {
    revertListeners.delete(fn);
  };
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

export function clientIdOf(kind: RecordKind, value: AnyRecord): string {
  if (kind === 'client') return value.id;
  const c = (value as { clientId?: string }).clientId;
  return c ?? '';
}

async function buildRow(kind: RecordKind, value: AnyRecord, sp: Space, key: CryptoKey): Promise<StoredRecord> {
  return {
    id: value.id,
    kind,
    space: sp,
    clientId: clientIdOf(kind, value),
    updatedAt: Date.now(),
    deletedAt: 0,
    data: await encryptJson(key, value, aad(value.id, kind, sp)),
  };
}

async function lastVersion(id: string): Promise<VersionRow | undefined> {
  return db.versions.where('recordId').equals(id).last();
}

export interface SaveOptions {
  /** Forces a new version with this operation (no folding). */
  op?: VersionOp;
  /** Extra audit details (e.g. which version was restored). */
  details?: Record<string, unknown>;
}

/**
 * Plans the version + audit entry of a save. Returns null when the content did
 * not change (nothing is recorded).
 */
async function planVersion(
  kind: RecordKind,
  value: AnyRecord,
  sp: Space,
  key: CryptoKey,
  opts: SaveOptions,
  existed: boolean,
): Promise<{ version: VersionRow; audit: AuditInput | null } | null> {
  const last = await lastVersion(value.id);
  if (last && !opts.op) {
    try {
      const prev = await decryptJson<AnyRecord>(key, last.data, versionAad(last.recordId, last.kind, last.space));
      if (contentKey(prev) === contentKey(value)) return null;
    } catch {
      /* unreadable old version – just write a new one */
    }
  }
  const now = Date.now();
  const clientId = clientIdOf(kind, value);
  const data = await encryptJson(key, value, versionAad(value.id, kind, sp));
  const session = lockEpoch();
  const fold = !opts.op && last && last.op === 'update' && last.session === session && now - last.startedAt < FOLD_MS;
  if (fold) return { version: { ...last, at: now, data, clientId }, audit: null };
  const op: VersionOp = opts.op ?? (existed || last ? 'update' : 'create');
  return {
    version: { recordId: value.id, kind, space: sp, clientId, at: now, startedAt: now, op, session, data },
    audit: {
      action: `record.${op}` as AuditAction,
      space: sp,
      kind,
      recordId: value.id,
      clientId,
      details: { label: recordLabel(kind, value), ...opts.details },
      at: now,
    },
  };
}

export function save<K extends RecordKind>(kind: K, value: RecordMap[K], opts: SaveOptions = {}): Promise<RecordMap[K]> {
  const sp = space;
  return serial(async () => {
    const key = getKey();
    const row = await buildRow(kind, value, sp, key);
    if (!isTracked(kind, sp)) {
      await db.records.put(row);
    } else {
      const existing = await db.records.get(value.id);
      const plan = await planVersion(kind, value, sp, key, opts, !!existing);
      const built = await buildEntries(plan?.audit ? [plan.audit] : []);
      await db.transaction('rw', [db.records, db.versions, db.audit, db.meta], async () => {
        await db.records.put(row);
        if (plan) await db.versions.put(plan.version);
        await writeEntries(built);
      });
    }
    if (sp === space) {
      cache.set(value.id, { kind, value });
      notify();
    }
    return value;
  });
}

/** Bulk insert into a given space (used by demo seeding and import). */
export function saveMany(items: { kind: RecordKind; value: AnyRecord }[], sp: Space = space): Promise<void> {
  return serial(async () => {
    const key = getKey();
    const rows: StoredRecord[] = [];
    const versions: VersionRow[] = [];
    const inputs: AuditInput[] = [];
    const now = Date.now();
    for (const { kind, value } of items) {
      rows.push(await buildRow(kind, value, sp, key));
      if (!isTracked(kind, sp)) continue;
      const clientId = clientIdOf(kind, value);
      versions.push({
        recordId: value.id,
        kind,
        space: sp,
        clientId,
        at: now,
        startedAt: now,
        op: 'import',
        session: lockEpoch(),
        data: await encryptJson(key, value, versionAad(value.id, kind, sp)),
      });
      inputs.push({
        action: 'record.import',
        space: sp,
        kind,
        recordId: value.id,
        clientId,
        details: { label: recordLabel(kind, value) },
        at: now,
      });
    }
    const built = await buildEntries(inputs);
    await db.transaction('rw', [db.records, db.versions, db.audit, db.meta], async () => {
      await db.records.bulkPut(rows);
      if (versions.length) await db.versions.bulkAdd(versions);
      await writeEntries(built);
    });
    if (sp === space) {
      for (const { kind, value } of items) cache.set(value.id, { kind, value });
      notify();
    }
  });
}

export async function decryptRow(r: StoredRecord, key: CryptoKey = getKey()): Promise<AnyRecord | undefined> {
  try {
    return await decryptJson<AnyRecord>(key, r.data, aad(r.id, r.kind, r.space));
  } catch {
    return undefined;
  }
}

/**
 * Moves a record (and, for clients, all their records) to the trash.
 * Returns an undo function; the trash keeps it for TRASH_DAYS days.
 */
export function remove(kind: RecordKind, id: string): Promise<() => Promise<void>> {
  return serial(async () => {
    const key = getKey();
    const now = Date.now();
    const ids = [id];
    if (kind === 'client') {
      const related = await db.records
        .where('clientId')
        .equals(id)
        .filter((r) => !r.deletedAt)
        .primaryKeys();
      ids.push(...related.filter((x) => x !== id));
    }
    const root = await db.records.get(id);
    const inputs: AuditInput[] = [];
    if (root && isTracked(root.kind, root.space)) {
      inputs.push({
        action: 'record.delete',
        space: root.space,
        kind: root.kind,
        recordId: id,
        clientId: root.clientId,
        details: { label: recordLabel(root.kind, await decryptRow(root, key)), related: ids.length - 1 },
        at: now,
      });
    }
    const built = await buildEntries(inputs);
    await db.transaction('rw', [db.records, db.audit, db.meta], async () => {
      await db.records.where('id').anyOf(ids).modify({ deletedAt: now });
      await writeEntries(built);
    });
    ids.forEach((x) => cache.delete(x));
    notify();
    return () => restoreFromTrash(id);
  });
}

/** Rows deleted together with `row` (same deletion time; a client's records come along). */
async function trashGroup(row: StoredRecord): Promise<StoredRecord[]> {
  const group = [row];
  if (row.kind === 'client') {
    const related = await db.records
      .where('clientId')
      .equals(row.id)
      .filter((r) => r.deletedAt === row.deletedAt && r.id !== row.id)
      .toArray();
    group.push(...related);
  }
  return group;
}

/** Brings a record back from the trash (with everything deleted together with it). */
export function restoreFromTrash(id: string): Promise<void> {
  return serial(async () => {
    const key = getKey();
    const row = await db.records.get(id);
    if (!row || !row.deletedAt) return;
    let rows = await trashGroup(row);
    // a record of a client that is also in the trash: bring the client back too
    if (row.kind !== 'client' && row.clientId) {
      const client = await db.records.get(row.clientId);
      if (client?.deletedAt) rows = [...rows, ...(await trashGroup(client))];
    }
    const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
    const roots = unique.filter((r) => r.id === id || (r.kind === 'client' && r.id === row.clientId));
    const inputs: AuditInput[] = [];
    for (const r of roots)
      if (isTracked(r.kind, r.space))
        inputs.push({
          action: 'record.restore',
          space: r.space,
          kind: r.kind,
          recordId: r.id,
          clientId: r.clientId,
          details: {
            label: recordLabel(r.kind, await decryptRow(r, key)),
            related: r.kind === 'client' ? unique.length - 1 : 0,
          },
        });
    const built = await buildEntries(inputs);
    await db.transaction('rw', [db.records, db.audit, db.meta], async () => {
      await db.records
        .where('id')
        .anyOf(unique.map((r) => r.id))
        .modify({ deletedAt: 0 });
      await writeEntries(built);
    });
    let changed = false;
    for (const r of unique) {
      if (r.space !== space) continue;
      const value = await decryptRow(r, key);
      if (value) {
        cache.set(r.id, { kind: r.kind, value });
        changed = true;
      }
    }
    if (changed) notify();
  });
}

/**
 * Permanently deletes rows (record + all its versions). The audit log keeps a
 * "permanently deleted" entry, and the details (labels) of older entries about
 * these records are erased (GDPR).
 */
async function purgeRows(rows: StoredRecord[]) {
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  const inputs: AuditInput[] = rows
    .filter((r) => isTracked(r.kind, r.space))
    .map((r) => ({ action: 'record.purge' as const, space: r.space, kind: r.kind, recordId: r.id, clientId: r.clientId }));
  const built = await buildEntries(inputs);
  await db.transaction('rw', [db.records, db.versions, db.audit, db.meta], async () => {
    await db.records.bulkDelete(ids);
    await db.versions.where('recordId').anyOf(ids).delete();
    await redactDetails(ids);
    await writeEntries(built);
  });
}

/** Permanently removes trashed rows older than `olderThanMs` (default: the trash period). */
export function purgeDeleted(olderThanMs = TRASH_MS): Promise<void> {
  return serial(async () => {
    const limit = Date.now() - olderThanMs;
    const rows = await db.records.where('deletedAt').between(1, limit, true, true).toArray();
    await purgeRows(rows);
  });
}

/** Permanently deletes one trashed record (with everything deleted together with it). */
export function purgeNow(id: string): Promise<void> {
  return serial(async () => {
    const row = await db.records.get(id);
    if (!row?.deletedAt) return;
    await purgeRows(await trashGroup(row));
  });
}

/** Empties the trash of a space. */
export function emptyTrash(sp: Space = space): Promise<void> {
  return serial(async () => {
    const rows = await db.records
      .where('space')
      .equals(sp)
      .filter((r) => r.deletedAt > 0)
      .toArray();
    await purgeRows(rows);
  });
}

/**
 * Restores an earlier version: it becomes the current content (as a new
 * version, so the restore itself can be undone). A trashed record comes back.
 */
export async function revertToVersion(seq: number): Promise<AnyRecord> {
  const v = await db.versions.get(seq);
  if (!v) throw new Error('no-version');
  if (v.space !== space) throw new Error('other-space');
  const value = await decryptJson<AnyRecord>(getKey(), v.data, versionAad(v.recordId, v.kind, v.space));
  const row = await db.records.get(v.recordId);
  if (row?.deletedAt) await restoreFromTrash(v.recordId);
  const next = { ...value } as AnyRecord & { updatedAt?: string };
  if ('updatedAt' in next) next.updatedAt = new Date().toISOString();
  await save(v.kind, next, { op: 'revert', details: { versionAt: v.at } });
  revertListeners.forEach((l) => l(next.id, next));
  return next;
}

/** Removes all records of a space (e.g. reset demo). */
export async function clearSpace(sp: Space) {
  await serial(async () => {
    await db.records.where('space').equals(sp).delete();
    await db.versions.where('space').equals(sp).delete();
  });
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
