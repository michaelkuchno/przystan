/**
 * Encrypted backup (docs/DECISIONS.md D-018).
 *
 * The file contains the wrapped data key and the already-encrypted records, so
 * it is protected by the password that was valid when the backup was made.
 */
import { db, type StoredRecord } from './db';
import { decryptJson, openVault, WrongPasswordError, type WrappedVault } from './crypto';
import { aad } from './store';
import { RECORD_KINDS, type RecordKind } from '@/domain/types';
import { _setKey } from './vault';

export const BACKUP_FORMAT = 'przystan-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  app: string;
  vault: WrappedVault;
  records: Omit<StoredRecord, 'deletedAt'>[];
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
  const rows = await db.records.where('deletedAt').equals(0).toArray();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    app: appVersion,
    vault,
    records: rows.map(({ deletedAt: _d, ...r }) => r),
  };
}

export function serializeBackup(b: BackupFile): string {
  return JSON.stringify(b);
}

function isCipher(x: unknown): boolean {
  const c = x as { iv?: unknown; ct?: unknown };
  return !!c && typeof c.iv === 'string' && typeof c.ct === 'string';
}

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
      (r.space !== 'practice' && r.space !== 'demo') ||
      !isCipher(r.data)
    )
      throw new BackupError('invalid-file');
  }
  return b as BackupFile;
}

/**
 * Verifies the password, decrypts EVERY record (integrity check), and only then
 * replaces all local data in a single transaction. After import the vault from
 * the backup is active, i.e. the backup's password becomes the app password.
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
  await db.transaction('rw', db.records, db.meta, async () => {
    await db.records.clear();
    await db.records.bulkPut(b.records.map((r) => ({ ...r, deletedAt: 0 })));
    await db.meta.put({ key: 'vault', value: b.vault });
    // the restored vault has another data key: biometric unlock must be set up again
    await db.meta.delete('bio');
  });
  _setKey(key);
  return { records: b.records.length };
}
