/**
 * Audit log (docs/DECISIONS.md D-049).
 *
 * Append-only list of what happened to the data: record changes, deletions,
 * restores, unlocks, exports, backups. Entries are chained with HMAC-SHA256:
 *
 *   mac[n] = HMAC(auditKey, mac[n-1] ␟ id ␟ at ␟ action ␟ space ␟ kind ␟ recordId ␟ clientId ␟ detailsHash)
 *
 * The audit key is random and stored encrypted with the data key, so without
 * the password nobody can forge, edit, reorder or remove entries undetected.
 * A signed "head" (last id + mac) also detects a cut-off tail.
 *
 * Details (labels, file names…) are encrypted and only their hash is chained,
 * so after a permanent deletion the details can be erased (GDPR) while the
 * chain still verifies.
 *
 * Fictional data of the training space ('demo') is not audited.
 */
import { db, type AuditRow } from './db';
import { decryptBytes, decryptJson, encryptBytes, encryptJson, randomBytes, toB64, type Cipher } from './crypto';
import { getKey, isUnlocked, lastUnlockMethod, onLockChange, takeFailedUnlocks } from './vault';
import type { RecordKind, Space } from '@/domain/types';

const KEY_META = 'auditKey';
const HEAD_META = 'auditHead';
const KEY_AAD = 'przystan-audit-key';
const SEP = '\u001f';

export type AuditAction =
  | 'vault.setup'
  | 'session.unlock'
  | 'session.unlockFailed'
  | 'password.change'
  | 'biometric.enable'
  | 'biometric.disable'
  | 'record.create'
  | 'record.update'
  | 'record.revert'
  | 'record.import'
  | 'record.delete'
  | 'record.restore'
  | 'record.purge'
  | 'data.export'
  | 'backup.export'
  | 'backup.restore'
  | 'audit.export'
  | 'audit.verify'
  | 'ai.settings'
  | 'ai.cloudSend';

export interface AuditInput {
  action: AuditAction;
  space?: Space | '';
  kind?: RecordKind | '';
  recordId?: string;
  clientId?: string;
  details?: Record<string, unknown>;
  at?: number;
}

export interface AuditHead {
  id: string;
  mac: string;
  sig: string;
}

/* ------------------------------------------------------------ serial queue */

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs data-changing work one at a time, so audit entries stay in the order of
 * the changes and every entry chains onto the previous one.
 */
export function serial<T>(fn: () => Promise<T>): Promise<T> {
  const p = queue.then(fn, fn);
  queue = p.catch(() => undefined);
  return p;
}

/* -------------------------------------------------------------- key + mac */

let macKey: CryptoKey | null = null;
/** The data key the cached audit key belongs to. */
let macKeyFor: CryptoKey | null = null;

async function importMacKey(raw: Uint8Array<ArrayBuffer>) {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function getMacKey(): Promise<CryptoKey> {
  const dek = getKey();
  if (macKey && macKeyFor === dek) return macKey;
  const stored = (await db.meta.get(KEY_META))?.value as Cipher | undefined;
  let raw: Uint8Array<ArrayBuffer>;
  if (stored) {
    raw = new Uint8Array(await decryptBytes(dek, stored, KEY_AAD));
  } else {
    raw = randomBytes(32);
    await db.meta.put({ key: KEY_META, value: await encryptBytes(dek, raw, KEY_AAD) });
  }
  macKey = await importMacKey(raw);
  macKeyFor = dek;
  raw.fill(0);
  return macKey;
}

/** Forget the cached audit key (after lock or after a backup with another data key was restored). */
export function resetAuditCache() {
  macKey = null;
  macKeyFor = null;
}

const enc = new TextEncoder();

async function hmac(key: CryptoKey, text: string): Promise<string> {
  return toB64(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

export async function sha256(text: string): Promise<string> {
  return toB64(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

const cipherHash = (c: Cipher) => sha256(`${c.iv}.${c.ct}`);

export function macInput(prev: string, r: Omit<AuditRow, 'mac' | 'seq' | 'details' | 'redacted'>): string {
  return [prev, r.id, r.at, r.action, r.space, r.kind, r.recordId, r.clientId, r.detailsHash].join(SEP);
}

const GENESIS = 'przystan-audit-genesis';

/* ------------------------------------------------------------- building */

/**
 * Builds chained rows for the given inputs (continuing after the last stored
 * entry) and the new signed head. Nothing is written – callers put the rows in
 * the same transaction as the data change.
 */
export async function buildEntries(inputs: AuditInput[]): Promise<{ rows: AuditRow[]; head: AuditHead | null }> {
  const todo = inputs.filter((i) => i.space !== 'demo');
  if (!todo.length) return { rows: [], head: null };
  const key = getKey();
  const mk = await getMacKey();
  let prev = (await db.audit.orderBy('seq').last())?.mac ?? GENESIS;
  const rows: AuditRow[] = [];
  for (const i of todo) {
    const id = crypto.randomUUID();
    const details = i.details ? await encryptJson(key, i.details, `audit|${id}`) : null;
    const row: AuditRow = {
      id,
      at: i.at ?? Date.now(),
      action: i.action,
      space: i.space ?? '',
      kind: i.kind ?? '',
      recordId: i.recordId ?? '',
      clientId: i.clientId ?? '',
      details,
      detailsHash: details ? await cipherHash(details) : '',
      mac: '',
    };
    row.mac = await hmac(mk, macInput(prev, row));
    prev = row.mac;
    rows.push(row);
  }
  const last = rows[rows.length - 1]!;
  const head: AuditHead = { id: last.id, mac: last.mac, sig: await hmac(mk, `head${SEP}${last.id}${SEP}${last.mac}`) };
  return { rows, head };
}

/* ------------------------------------------------------- change listeners */

let auditVersion = 0;
const auditSubs = new Set<() => void>();

/** Lets the audit log screen refresh after any new entry (also events that change no record). */
export function subscribeAudit(fn: () => void): () => void {
  auditSubs.add(fn);
  return () => {
    auditSubs.delete(fn);
  };
}

export function auditVersionNow(): number {
  return auditVersion;
}

function notifyAudit() {
  auditVersion++;
  auditSubs.forEach((f) => f());
}

/** Writes prepared entries. Call inside a transaction that includes db.audit and db.meta. */
export async function writeEntries(built: { rows: AuditRow[]; head: AuditHead | null }) {
  if (!built.rows.length) return;
  await db.audit.bulkAdd(built.rows);
  await db.meta.put({ key: HEAD_META, value: built.head });
  // after the surrounding transaction has committed
  setTimeout(notifyAudit, 0);
}

/** Records an event that does not change records (unlock, export…). */
export function logEvent(input: AuditInput): Promise<void> {
  if (input.space === 'demo' || !isUnlocked()) return Promise.resolve();
  return serial(async () => {
    const built = await buildEntries([input]);
    await db.transaction('rw', db.audit, db.meta, () => writeEntries(built));
  });
}

/* ------------------------------------------------------------- sessions */

let wasUnlocked = false;
onLockChange(() => {
  const now = isUnlocked();
  if (!now) {
    resetAuditCache();
  } else if (!wasUnlocked && lastUnlockMethod() !== 'restore') {
    // (a restore from a backup writes its own 'backup.restore' entry)
    const method = lastUnlockMethod();
    void (async () => {
      const failed = await takeFailedUnlocks();
      const inputs: AuditInput[] = [];
      if (failed && failed.count > 0)
        inputs.push({
          action: 'session.unlockFailed',
          at: failed.last,
          details: { count: failed.count, first: failed.first, last: failed.last, methods: failed.methods },
        });
      inputs.push({ action: method === 'setup' ? 'vault.setup' : 'session.unlock', details: { method } });
      await serial(async () => {
        if (!isUnlocked()) return;
        const built = await buildEntries(inputs);
        await db.transaction('rw', db.audit, db.meta, () => writeEntries(built));
      });
    })().catch(() => undefined);
  }
  wasUnlocked = now;
});

/* -------------------------------------------------------------- reading */

export interface AuditEntry {
  seq: number;
  id: string;
  at: number;
  action: AuditAction;
  space: Space | '';
  kind: RecordKind | '';
  recordId: string;
  clientId: string;
  details: Record<string, unknown> | null;
  redacted: boolean;
}

/** All entries, newest first, with decrypted details. */
export async function readAudit(filter?: { recordIds?: string[]; clientId?: string }): Promise<AuditEntry[]> {
  const key = getKey();
  let rows: AuditRow[];
  if (filter?.recordIds) rows = await db.audit.where('recordId').anyOf(filter.recordIds).toArray();
  else if (filter?.clientId) rows = await db.audit.where('clientId').equals(filter.clientId).toArray();
  else rows = await db.audit.toArray();
  rows.sort((a, b) => b.seq! - a.seq!);
  const out: AuditEntry[] = [];
  for (const r of rows) {
    let details: Record<string, unknown> | null = null;
    if (r.details) {
      try {
        details = await decryptJson<Record<string, unknown>>(key, r.details, `audit|${r.id}`);
      } catch {
        details = { unreadable: true };
      }
    }
    out.push({
      seq: r.seq!,
      id: r.id,
      at: r.at,
      action: r.action as AuditAction,
      space: r.space,
      kind: r.kind,
      recordId: r.recordId,
      clientId: r.clientId,
      details,
      redacted: !!r.redacted,
    });
  }
  return out;
}

export async function auditCount(): Promise<number> {
  return db.audit.count();
}

/* ---------------------------------------------------------- verification */

export interface AuditVerification {
  ok: boolean;
  entries: number;
  /** seq of the first entry that does not verify */
  brokenAt?: number;
  reason?: 'mac' | 'details' | 'head';
  firstAt?: number;
  lastAt?: number;
}

/** Recomputes the whole chain and the head signature. */
export async function verifyAudit(): Promise<AuditVerification> {
  const mk = await getMacKey();
  const rows = await db.audit.orderBy('seq').toArray();
  let prev = GENESIS;
  for (const r of rows) {
    if (r.details && (await cipherHash(r.details)) !== r.detailsHash)
      return { ok: false, entries: rows.length, brokenAt: r.seq, reason: 'details' };
    if ((await hmac(mk, macInput(prev, r))) !== r.mac) return { ok: false, entries: rows.length, brokenAt: r.seq, reason: 'mac' };
    prev = r.mac;
  }
  const head = (await db.meta.get(HEAD_META))?.value as AuditHead | null | undefined;
  const last = rows[rows.length - 1];
  if (last || head) {
    const okHead =
      !!last &&
      !!head &&
      head.id === last.id &&
      head.mac === last.mac &&
      (await hmac(mk, `head${SEP}${head.id}${SEP}${head.mac}`)) === head.sig;
    if (!okHead) return { ok: false, entries: rows.length, brokenAt: last?.seq, reason: 'head' };
  }
  return { ok: true, entries: rows.length, firstAt: rows[0]?.at, lastAt: last?.at };
}

/**
 * GDPR erasure: drops the encrypted details of all entries about the given
 * records. The chain keeps verifying because only the details hash is chained.
 * Call inside a transaction that includes db.audit.
 */
export async function redactDetails(recordIds: string[]) {
  if (!recordIds.length) return;
  await db.audit
    .where('recordId')
    .anyOf(recordIds)
    .modify((r: AuditRow) => {
      if (r.details) {
        r.details = null;
        r.redacted = true;
      }
    });
}

/** Raw rows + head for the backup file. */
export async function auditSnapshot() {
  return {
    audit: await db.audit.orderBy('seq').toArray(),
    auditKey: ((await db.meta.get(KEY_META))?.value as Cipher | undefined) ?? null,
    auditHead: ((await db.meta.get(HEAD_META))?.value as AuditHead | undefined) ?? null,
  };
}

export const AUDIT_META = { KEY_META, HEAD_META };
