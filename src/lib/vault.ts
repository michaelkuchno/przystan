/**
 * Vault: password setup, unlock, lock, password change.
 * The data key lives only in memory while unlocked.
 */
import { createVault, openVault, rewrapVault, type WrappedVault } from './crypto';
import { db } from './db';

type Listener = () => void;

let dek: CryptoKey | null = null;
/** Increments on every lock/unlock – lets the UI know a new session started. */
let epoch = 0;
const listeners = new Set<Listener>();

function emit() {
  epoch++;
  listeners.forEach((l) => l());
}

export function onLockChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function lockEpoch(): number {
  return epoch;
}

export function isUnlocked(): boolean {
  return dek !== null;
}

export function getKey(): CryptoKey {
  if (!dek) throw new Error('locked');
  return dek;
}

export async function readVault(): Promise<WrappedVault | undefined> {
  return (await db.meta.get('vault'))?.value as WrappedVault | undefined;
}

export async function hasVault(): Promise<boolean> {
  return (await readVault()) !== undefined;
}

export async function setupVault(password: string, iterations?: number): Promise<void> {
  if (await hasVault()) throw new Error('vault-exists');
  const { vault, dek: key } = await createVault(password, iterations);
  await db.meta.put({ key: 'vault', value: vault });
  dek = key;
  emit();
}

export async function unlock(password: string): Promise<void> {
  const vault = await readVault();
  if (!vault) throw new Error('no-vault');
  dek = await openVault(password, vault);
  emit();
}

export function lock(): void {
  if (!dek) return;
  dek = null;
  emit();
}

export async function changePassword(oldPassword: string, newPassword: string, iterations?: number) {
  const vault = await readVault();
  if (!vault) throw new Error('no-vault');
  const next = await rewrapVault(oldPassword, newPassword, vault, iterations);
  await db.meta.put({ key: 'vault', value: next });
}

/** Erases everything (used by "delete all data"). */
export async function wipeAll(): Promise<void> {
  dek = null;
  await db.transaction('rw', db.records, db.meta, async () => {
    await db.records.clear();
    await db.meta.clear();
  });
  emit();
}

/** For tests and backup import: install a key directly. */
export function _setKey(key: CryptoKey | null) {
  dek = key;
  emit();
}
