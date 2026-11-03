/**
 * IndexedDB schema (Dexie). See docs/DECISIONS.md D-005.
 *
 * Version history
 *  1 – records(id, kind, space, clientId, updatedAt), meta(key), prefs(key)
 *  2 – compound index [space+kind] for faster per-module queries;
 *      `deletedAt` column for undo (soft delete) – existing rows get deletedAt = 0.
 *  3 – `versions` (encrypted snapshots for history / revert) and `audit`
 *      (append-only, HMAC-chained audit log). See docs/DECISIONS.md D-049.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Cipher } from './crypto';
import type { RecordKind, Space } from '@/domain/types';

export interface StoredRecord {
  id: string;
  kind: RecordKind;
  space: Space;
  /** Random UUID of the client this record belongs to ('' when none). */
  clientId: string;
  updatedAt: number;
  /** 0 = live, otherwise epoch ms of soft deletion (undo window). */
  deletedAt: number;
  data: Cipher;
}

/** One saved state of a record (encrypted snapshot of the whole record). */
export interface VersionRow {
  seq?: number;
  recordId: string;
  kind: RecordKind;
  space: Space;
  clientId: string;
  /** Epoch ms of the last write folded into this version. */
  at: number;
  /** Epoch ms of the first write of this version (edits within a short window are folded). */
  startedAt: number;
  op: VersionOp;
  /** Lock epoch (unlock session) the version was written in. */
  session: number;
  data: Cipher;
}

export type VersionOp = 'create' | 'update' | 'revert' | 'import';

/**
 * Audit log entry. Metadata (time, action, ids) is plain – the same as already
 * visible in `records`; human readable details are encrypted. `mac` chains the
 * entries (HMAC-SHA256 over the previous mac + this entry incl. `detailsHash`),
 * so details can be redacted (GDPR erasure) without breaking verification.
 */
export interface AuditRow {
  seq?: number;
  id: string;
  at: number;
  action: string;
  space: Space | '';
  kind: RecordKind | '';
  recordId: string;
  clientId: string;
  details: Cipher | null;
  /** SHA-256 (base64) of the encrypted details ('' when none). */
  detailsHash: string;
  /** true when details were erased after permanent deletion of the record. */
  redacted?: boolean;
  mac: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export const DB_NAME = 'przystan';
export const DB_VERSION = 3;

export class PrzystanDB extends Dexie {
  records!: EntityTable<StoredRecord, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;
  prefs!: EntityTable<MetaRow, 'key'>;
  versions!: EntityTable<VersionRow, 'seq'>;
  audit!: EntityTable<AuditRow, 'seq'>;

  constructor(name = DB_NAME) {
    super(name);
    defineSchema(this);
  }
}

/** Kept separate so migration tests can build version 1 databases. */
export function defineSchema(db: Dexie, upTo = DB_VERSION) {
  db.version(1).stores({
    records: 'id, kind, space, clientId, updatedAt',
    meta: 'key',
    prefs: 'key',
  });
  if (upTo < 2) return;
  db.version(2)
    .stores({
      records: 'id, kind, space, clientId, updatedAt, deletedAt, [space+kind]',
    })
    .upgrade(async (tx) => {
      await tx
        .table('records')
        .toCollection()
        .modify((r: Partial<StoredRecord>) => {
          if (r.deletedAt === undefined) r.deletedAt = 0;
        });
    });
  if (upTo < 3) return;
  db.version(3).stores({
    versions: '++seq, recordId, clientId, space, at',
    audit: '++seq, &id, at, recordId, clientId, action',
  });
}

export let db = new PrzystanDB();

/** Test helper: use a fresh database. */
export function resetDbForTests(name: string) {
  db.close();
  db = new PrzystanDB(name);
  return db;
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
