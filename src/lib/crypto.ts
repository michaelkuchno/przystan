/**
 * Encryption primitives (Web Crypto API). See docs/DECISIONS.md D-004.
 *
 *   password ──PBKDF2-SHA256(salt, 600k)──▶ KEK ──AES-GCM──▶ wrapped DEK
 *   DEK (random 256-bit) ──AES-GCM(iv, aad)──▶ record payloads
 */

export const PBKDF2_ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface Cipher {
  /** base64 IV (12 bytes) */
  iv: string;
  /** base64 ciphertext incl. GCM tag */
  ct: string;
}

export function toB64(bytes: Uint8Array | ArrayBuffer): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function deriveKek(password: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>, aad?: string): Promise<Cipher> {
  const iv = randomBytes(12);
  const params: AesGcmParams = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = enc.encode(aad);
  const ct = await crypto.subtle.encrypt(params, key, data);
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptBytes(key: CryptoKey, c: Cipher, aad?: string): Promise<Uint8Array> {
  const params: AesGcmParams = { name: 'AES-GCM', iv: fromB64(c.iv) };
  if (aad) params.additionalData = enc.encode(aad);
  return new Uint8Array(await crypto.subtle.decrypt(params, key, fromB64(c.ct)));
}

export async function encryptJson(key: CryptoKey, value: unknown, aad?: string): Promise<Cipher> {
  return encryptBytes(key, enc.encode(JSON.stringify(value)), aad);
}

export async function decryptJson<T>(key: CryptoKey, c: Cipher, aad?: string): Promise<T> {
  return JSON.parse(dec.decode(await decryptBytes(key, c, aad))) as T;
}

export interface WrappedVault {
  salt: string;
  iterations: number;
  /** DEK raw bytes encrypted with KEK */
  wrappedDek: Cipher;
}

/** Creates a new random DEK and wraps it with a key derived from the password. */
export async function createVault(password: string, iterations = PBKDF2_ITERATIONS) {
  const salt = randomBytes(16);
  const kek = await deriveKek(password, salt, iterations);
  const rawDek = randomBytes(32);
  const wrappedDek = await encryptBytes(kek, rawDek, 'przystan-dek');
  const dek = await importDek(rawDek);
  rawDek.fill(0);
  const vault: WrappedVault = { salt: toB64(salt), iterations, wrappedDek };
  return { vault, dek };
}

async function importDek(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function unwrapRaw(password: string, vault: WrappedVault): Promise<Uint8Array<ArrayBuffer>> {
  const kek = await deriveKek(password, fromB64(vault.salt), vault.iterations);
  try {
    return new Uint8Array(await decryptBytes(kek, vault.wrappedDek, 'przystan-dek'));
  } catch {
    throw new WrongPasswordError();
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('wrong-password');
    this.name = 'WrongPasswordError';
  }
}

/** Returns the (non-extractable) DEK or throws WrongPasswordError. */
export async function openVault(password: string, vault: WrappedVault): Promise<CryptoKey> {
  const raw = await unwrapRaw(password, vault);
  const key = await importDek(raw);
  raw.fill(0);
  return key;
}

/** Re-wraps the same DEK with a new password. Data does not need re-encryption. */
export async function rewrapVault(
  oldPassword: string,
  newPassword: string,
  vault: WrappedVault,
  iterations = PBKDF2_ITERATIONS,
): Promise<WrappedVault> {
  const raw = await unwrapRaw(oldPassword, vault);
  const salt = randomBytes(16);
  const kek = await deriveKek(newPassword, salt, iterations);
  const wrappedDek = await encryptBytes(kek, raw, 'przystan-dek');
  raw.fill(0);
  return { salt: toB64(salt), iterations, wrappedDek };
}

/** Rough password strength 0–4 for the UI hint (not a security boundary). */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length < 6) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-ząćęłńóśźż]/.test(pw) && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^\p{L}\d]/u.test(pw)) score++;
  if (/^\d+$/.test(pw)) score = Math.min(score, 1);
  return Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
}
