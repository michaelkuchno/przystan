/**
 * IndexedDB schema (Dexie). See docs/DECISIONS.md D-005.
 *
 * Version history
 *  1 – records(id, kind, space, clientId, updatedAt), meta(key), prefs(key)
 *  2 – compound index [space+kind] for faster per-module queries;
 *      `deletedAt` column for undo (soft delete) – existing rows get deletedAt = 0.
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

export interface MetaRow {
  key: string;
  value: unknown;
}

export const DB_NAME = 'przystan';
export const DB_VERSION = 2;

export class PrzystanDB extends Dexie {
  records!: EntityTable<StoredRecord, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;
  prefs!: EntityTable<MetaRow, 'key'>;

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
