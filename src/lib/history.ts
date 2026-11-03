/**
 * Read side of history and audit (docs/DECISIONS.md D-049): versions of a
 * record with field-level differences, the trash, the integrity check and the
 * export of everything stored about one person (GDPR art. 15 / 20).
 */
import { db, type VersionOp } from './db';
import { decryptJson } from './crypto';
import { getKey } from './vault';
import { activeSpace, decryptRow, recordLabel, TRASH_MS, versionAad, aad } from './store';
import { readAudit, verifyAudit, type AuditEntry, type AuditVerification } from './audit';
import type { RecordKind, RecordMap } from '@/domain/types';

type AnyRecord = RecordMap[RecordKind];

export interface Version {
  seq: number;
  at: number;
  startedAt: number;
  op: VersionOp;
  kind: RecordKind;
  value: AnyRecord | null;
}

/** Versions of a record, newest first. */
export async function listVersions(recordId: string): Promise<Version[]> {
  const key = getKey();
  const rows = await db.versions.where('recordId').equals(recordId).toArray();
  rows.sort((a, b) => b.seq! - a.seq!);
  const out: Version[] = [];
  for (const r of rows) {
    let value: AnyRecord | null = null;
    try {
      value = await decryptJson<AnyRecord>(key, r.data, versionAad(r.recordId, r.kind, r.space));
    } catch {
      value = null;
    }
    out.push({ seq: r.seq!, at: r.at, startedAt: r.startedAt, op: r.op, kind: r.kind, value });
  }
  return out;
}

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

const IGNORED = new Set(['id', 'updatedAt', 'createdAt']);

/** Top-level fields that differ between two versions (before → after). */
export function diffValues(before: unknown, after: unknown): FieldChange[] {
  const a = (before ?? {}) as Record<string, unknown>;
  const b = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !IGNORED.has(k));
  const out: FieldChange[] = [];
  for (const k of keys) {
    const x = a[k];
    const y = b[k];
    const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty(x) && empty(y)) continue;
    if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ field: k, before: x, after: y });
  }
  return out.sort((p, q) => p.field.localeCompare(q.field));
}

/** Short readable form of a field value for the history view. */
export function showValue(v: unknown, max = 160): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'string') return v.length > max ? `${v.slice(0, max - 1)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) return showValue(v.join(', '), max);
    const labels = v.map((x) => recordLabel('note', x)).filter(Boolean);
    return labels.length === v.length ? showValue(labels.join(', '), max) : `[${v.length}]`;
  }
  const s = JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* ------------------------------------------------------------------ trash */

export interface TrashItem {
  id: string;
  kind: RecordKind;
  clientId: string;
  label: string;
  deletedAt: number;
  /** epoch ms when it will be deleted permanently */
  purgeAt: number;
  /** records deleted together with it (a client's records) */
  related: number;
}

/** Trashed records of the active space (records deleted along with their client are counted, not listed). */
export async function listTrash(): Promise<TrashItem[]> {
  const key = getKey();
  const rows = await db.records
    .where('space')
    .equals(activeSpace())
    .filter((r) => r.deletedAt > 0)
    .toArray();
  const clientsDeleted = new Map(rows.filter((r) => r.kind === 'client').map((r) => [r.id, r.deletedAt]));
  const out: TrashItem[] = [];
  for (const r of rows) {
    if (r.kind !== 'client' && clientsDeleted.get(r.clientId) === r.deletedAt) continue;
    const related =
      r.kind === 'client' ? rows.filter((x) => x.clientId === r.id && x.id !== r.id && x.deletedAt === r.deletedAt).length : 0;
    out.push({
      id: r.id,
      kind: r.kind,
      clientId: r.clientId,
      label: recordLabel(r.kind, await decryptRow(r, key)),
      deletedAt: r.deletedAt,
      purgeAt: r.deletedAt + TRASH_MS,
      related,
    });
  }
  return out.sort((a, b) => b.deletedAt - a.deletedAt);
}

export async function trashCount(): Promise<number> {
  return (await listTrash()).length;
}

/* -------------------------------------------------------------- integrity */

export interface IntegrityReport {
  audit: AuditVerification;
  records: number;
  versions: number;
  /** ids of records / versions that could not be decrypted (damaged or altered) */
  unreadable: string[];
  checkedAt: number;
}

/** Decrypts every record and version and verifies the audit chain. */
export async function checkIntegrity(): Promise<IntegrityReport> {
  const key = getKey();
  const unreadable: string[] = [];
  const records = await db.records.toArray();
  for (const r of records) {
    try {
      const v = await decryptJson<{ id?: string }>(key, r.data, aad(r.id, r.kind, r.space));
      if (v.id !== r.id) unreadable.push(r.id);
    } catch {
      unreadable.push(r.id);
    }
  }
  const versions = await db.versions.toArray();
  for (const v of versions) {
    try {
      await decryptJson(key, v.data, versionAad(v.recordId, v.kind, v.space));
    } catch {
      unreadable.push(`${v.recordId}#${v.seq}`);
    }
  }
  return { audit: await verifyAudit(), records: records.length, versions: versions.length, unreadable, checkedAt: Date.now() };
}

/* ----------------------------------------------------- person data export */

export interface PersonExport {
  format: 'przystan-person-export';
  version: 1;
  exportedAt: string;
  app: string;
  client: AnyRecord | undefined;
  records: { kind: RecordKind; value: AnyRecord }[];
  history: { recordId: string; kind: RecordKind; at: string; op: VersionOp; value: AnyRecord | null }[];
  audit: (Omit<AuditEntry, 'at'> & { at: string })[];
}

/**
 * Everything stored about one person, readable (decrypted) – for a data
 * subject access / portability request. Trashed records are left out.
 */
export async function exportPerson(clientId: string, app: string): Promise<PersonExport> {
  const key = getKey();
  const rows = await db.records
    .where('clientId')
    .equals(clientId)
    .filter((r) => !r.deletedAt)
    .toArray();
  const records: PersonExport['records'] = [];
  let client: AnyRecord | undefined;
  for (const r of rows) {
    const value = await decryptRow(r, key);
    if (!value) continue;
    if (r.kind === 'client') client = value;
    else records.push({ kind: r.kind, value });
  }
  const history: PersonExport['history'] = [];
  for (const r of rows) {
    for (const v of await listVersions(r.id))
      history.push({ recordId: r.id, kind: v.kind, at: new Date(v.at).toISOString(), op: v.op, value: v.value });
  }
  const audit = (await readAudit({ clientId })).map((e) => ({ ...e, at: new Date(e.at).toISOString() }));
  return {
    format: 'przystan-person-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    app,
    client,
    records,
    history,
    audit,
  };
}
