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
  listeners.forEach((l) => l());
}

/** Sets the key; a transition from locked to unlocked starts a new session (epoch). */
function setKey(key: CryptoKey | null) {
  if (!dek && key) epoch++;
  dek = key;
  emit();
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
  setKey(key);
}

export async function unlock(password: string): Promise<void> {
  const vault = await readVault();
  if (!vault) throw new Error('no-vault');
  setKey(await openVault(password, vault));
}

export function lock(): void {
  if (!dek) return;
  setKey(null);
}

export async function changePassword(oldPassword: string, newPassword: string, iterations?: number) {
  const vault = await readVault();
  if (!vault) throw new Error('no-vault');
  const next = await rewrapVault(oldPassword, newPassword, vault, iterations);
  await db.meta.put({ key: 'vault', value: next });
}

/** Erases everything (used by "delete all data"). */
export async function wipeAll(): Promise<void> {
  // drop the key silently; listeners are notified once the vault is gone
  dek = null;
  await db.transaction('rw', db.records, db.meta, async () => {
    await db.records.clear();
    await db.meta.clear();
  });
  emit();
}

/** For tests and backup import: install a key directly. */
export function _setKey(key: CryptoKey | null) {
  setKey(key);
}
