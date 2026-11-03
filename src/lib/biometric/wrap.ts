/**
 * Wrapping a copy of the data key (DEK) with a key that only the biometric factor can release.
 *
 *   WebAuthn PRF output (32 B) ──HKDF-SHA256(salt, info)──▶ wrapping key ──AES-GCM──▶ wrapped DEK
 *
 * On Android the wrapping happens natively (AES-GCM key in the Android Keystore that requires
 * strong biometric authentication), see android/.../BiometricPlugin.java.
 */
import { decryptBytes, encryptBytes, importDek, type Cipher } from '../crypto';

const AAD = 'przystan-bio-dek-v1';
const INFO = new TextEncoder().encode('przystan-bio-prf-v1');

/** Derives the AES-GCM wrapping key from a WebAuthn PRF result. */
export async function keyFromPrf(prf: ArrayBuffer | Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const bytes = prf instanceof Uint8Array ? prf : new Uint8Array(prf);
  if (bytes.length < 32) throw new Error('prf-too-short');
  const base = await crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function wrapDek(wrappingKey: CryptoKey, rawDek: Uint8Array<ArrayBuffer>): Promise<Cipher> {
  return encryptBytes(wrappingKey, rawDek, AAD);
}

/** Returns the non-extractable DEK; throws if the wrapping key is wrong or the data was altered. */
export async function unwrapDek(wrappingKey: CryptoKey, wrapped: Cipher): Promise<CryptoKey> {
  const raw = new Uint8Array(await decryptBytes(wrappingKey, wrapped, AAD));
  try {
    return await importDek(raw);
  } finally {
    raw.fill(0);
  }
}
