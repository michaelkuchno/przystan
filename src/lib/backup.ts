/**
 * Encrypted backup (docs/DECISIONS.md D-018, D-049).
 *
 * The file contains the wrapped data key and the already-encrypted records, so
 * it is protected by the password that was valid when the backup was made.
 *
 * Format 2 (version 1.2) also carries the trash, the version history and the
 * audit log (with its encrypted key and signed head), so after a restore the
 * history and the audit trail continue. Format 1 files are still accepted.
 */
import { db, type AuditRow, type StoredRecord, type VersionRow } from './db';
import { decryptJson, openVault, WrongPasswordError, type Cipher, type WrappedVault } from './crypto';
import { aad, versionAad } from './store';
import { RECORD_KINDS, type RecordKind } from '@/domain/types';
import { _setKey } from './vault';
import { AUDIT_META, auditSnapshot, logEvent, resetAuditCache, serial, type AuditHead } from './audit';

export const BACKUP_FORMAT = 'przystan-backup';
export const BACKUP_VERSION = 2;

type BackupRecord = Omit<StoredRecord, 'deletedAt'> & { deletedAt?: number };

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  app: string;
  vault: WrappedVault;
  records: BackupRecord[];
  /** format 2 */
  versions?: VersionRow[];
  audit?: AuditRow[];
  auditKey?: Cipher | null;
  auditHead?: AuditHead | null;
}

export class BackupError extends Error {
  constructor(public code: 'invalid-file' | 'unsupported-version' | 'wrong-password' | 'corrupted') {
    super(code);
    this.name = 'BackupError';
  }
}

export async function createBackup(appVersion: string): Promise<BackupFile> {
  const vault = (await db.meta.get('vault'))?.value as WrappedVault | undefined;
  if (!vault) throw new Error('no-vault');
  // wait for pending writes so the file is consistent
  return serial(async () => {
    const rows = await db.records.toArray();
    const snap = await auditSnapshot();
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      app: appVersion,
      vault,
      records: rows.map(({ deletedAt, ...r }) => (deletedAt ? { ...r, deletedAt } : r)),
      versions: (await db.versions.toArray()).map(({ seq: _s, ...v }) => v),
      audit: snap.audit,
      auditKey: snap.auditKey,
      auditHead: snap.auditHead,
    };
  });
}

export function serializeBackup(b: BackupFile): string {
  return JSON.stringify(b);
}

function isCipher(x: unknown): boolean {
  const c = x as { iv?: unknown; ct?: unknown };
  return !!c && typeof c.iv === 'string' && typeof c.ct === 'string';
}

const isSpace = (s: unknown) => s === 'practice' || s === 'demo';

/** Structural validation without decryption. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-file');
  }
  const b = data as Partial<BackupFile>;
  if (!b || b.format !== BACKUP_FORMAT || !Array.isArray(b.records) || !b.vault) throw new BackupError('invalid-file');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new BackupError('unsupported-version');
  const v = b.vault;
  if (typeof v.salt !== 'string' || typeof v.iterations !== 'number' || !isCipher(v.wrappedDek))
    throw new BackupError('invalid-file');
  for (const r of b.records) {
    if (
      typeof r.id !== 'string' ||
      !RECORD_KINDS.includes(r.kind as RecordKind) ||
      !isSpace(r.space) ||
      !isCipher(r.data) ||
      (r.deletedAt !== undefined && typeof r.deletedAt !== 'number')
    )
      throw new BackupError('invalid-file');
  }
  if (b.versions !== undefined) {
    if (!Array.isArray(b.versions)) throw new BackupError('invalid-file');
    for (const x of b.versions)
      if (
        typeof x.recordId !== 'string' ||
        !RECORD_KINDS.includes(x.kind) ||
        !isSpace(x.space) ||
        typeof x.at !== 'number' ||
        !isCipher(x.data)
      )
        throw new BackupError('invalid-file');
  }
  if (b.audit !== undefined) {
    if (!Array.isArray(b.audit)) throw new BackupError('invalid-file');
    for (const x of b.audit)
      if (
        typeof x.id !== 'string' ||
        typeof x.at !== 'number' ||
        typeof x.action !== 'string' ||
        typeof x.mac !== 'string' ||
        (x.details !== null && !isCipher(x.details))
      )
        throw new BackupError('invalid-file');
    if (b.audit.length && !isCipher(b.auditKey)) throw new BackupError('invalid-file');
  }
  return b as BackupFile;
}

/**
 * Verifies the password, decrypts EVERY record and version (integrity check),
 * and only then replaces all local data in a single transaction. After import
 * the vault from the backup is active, i.e. the backup's password becomes the
 * app password. The restore itself is written to the (restored) audit log.
 */
export async function restoreBackup(text: string, password: string): Promise<{ records: number }> {
  const b = parseBackup(text);
  let key: CryptoKey;
  try {
    key = await openVault(password, b.vault);
  } catch (e) {
    if (e instanceof WrongPasswordError) throw new BackupError('wrong-password');
    throw e;
  }
  for (const r of b.records) {
    try {
      const v = await decryptJson<{ id?: string }>(key, r.data, aad(r.id, r.kind, r.space));
      if (v.id !== r.id) throw new Error('id mismatch');
    } catch {
      throw new BackupError('corrupted');
    }
  }
  for (const x of b.versions ?? []) {
    try {
      await decryptJson(key, x.data, versionAad(x.recordId, x.kind, x.space));
    } catch {
      throw new BackupError('corrupted');
    }
  }
  const replaced = await serial(async () => {
    const localEntries = await db.audit.count();
    await db.transaction('rw', [db.records, db.meta, db.versions, db.audit], async () => {
      await db.records.clear();
      await db.versions.clear();
      await db.audit.clear();
      await db.records.bulkPut(b.records.map((r) => ({ ...r, deletedAt: r.deletedAt ?? 0 })));
      if (b.versions?.length) await db.versions.bulkAdd(b.versions.map(({ seq: _s, ...v }) => v));
      if (b.audit?.length) await db.audit.bulkAdd(b.audit.map(({ seq: _s, ...a }) => a));
      await db.meta.put({ key: 'vault', value: b.vault });
      if (b.auditKey) await db.meta.put({ key: AUDIT_META.KEY_META, value: b.auditKey });
      else await db.meta.delete(AUDIT_META.KEY_META);
      if (b.auditHead) await db.meta.put({ key: AUDIT_META.HEAD_META, value: b.auditHead });
      else await db.meta.delete(AUDIT_META.HEAD_META);
      // the restored vault has another data key: biometric unlock must be set up again
      await db.meta.delete('bio');
    });
    return localEntries;
  });
  resetAuditCache();
  _setKey(key, 'restore');
  await logEvent({
    action: 'backup.restore',
    details: {
      createdAt: b.createdAt,
      app: b.app,
      format: b.version,
      records: b.records.length,
      replacedLocalEntries: replaced,
    },
  });
  return { records: b.records.filter((r) => !r.deletedAt).length };
}
