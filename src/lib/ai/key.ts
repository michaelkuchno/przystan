/**
 * The user's Gemini API key – encrypted with the data key (AES-GCM, like all data) in db.meta.
 * Kept in memory only while the vault is unlocked. Not part of backups (D-052).
 */
import { db } from '@/lib/db';
import { decryptJson, encryptJson, type Cipher } from '@/lib/crypto';
import { getKey, onLockChange, isUnlocked } from '@/lib/vault';

const META = 'aiKey';
const AAD = 'ai:gemini-key';
let cached: string | null | undefined;

onLockChange(() => {
  if (!isUnlocked()) cached = undefined;
});

export async function loadApiKey(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const row = (await db.meta.get(META))?.value as Cipher | undefined;
  cached = row ? await decryptJson<string>(getKey(), row, AAD) : null;
  return cached;
}

export async function saveApiKey(key: string): Promise<void> {
  const k = key.trim();
  await db.meta.put({ key: META, value: await encryptJson(getKey(), k, AAD) });
  cached = k;
}

export async function deleteApiKey(): Promise<void> {
  await db.meta.delete(META);
  cached = null;
}

/** Shape check only (Google API keys: "AIza" + 35 chars). */
export const looksLikeApiKey = (k: string) => /^AIza[0-9A-Za-z_-]{35}$/.test(k.trim());
