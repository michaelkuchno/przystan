import { describe, expect, it } from 'vitest';
import {
  createVault,
  decryptJson,
  encryptJson,
  openVault,
  passwordStrength,
  rewrapVault,
  WrongPasswordError,
  fromB64,
  toB64,
} from './crypto';

// Low iteration count keeps tests fast; production uses PBKDF2_ITERATIONS.
const IT = 1000;

describe('crypto', () => {
  it('round-trips JSON with AES-GCM', async () => {
    const { dek } = await createVault('tajne-hasło', IT);
    const c = await encryptJson(dek, { a: 1, ą: 'źdźbło' }, 'aad');
    expect(c.ct).not.toContain('źdźbło');
    expect(await decryptJson(dek, c, 'aad')).toEqual({ a: 1, ą: 'źdźbło' });
  });

  it('uses a fresh IV for every encryption', async () => {
    const { dek } = await createVault('x'.repeat(8), IT);
    const a = await encryptJson(dek, 'same');
    const b = await encryptJson(dek, 'same');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('detects tampering and wrong AAD', async () => {
    const { dek } = await createVault('password1', IT);
    const c = await encryptJson(dek, { secret: true }, 'id-1|client|practice');
    await expect(decryptJson(dek, c, 'id-2|client|practice')).rejects.toThrow();
    const bytes = fromB64(c.ct);
    bytes[0] = bytes[0]! ^ 0xff;
    await expect(decryptJson(dek, { ...c, ct: toB64(bytes) }, 'id-1|client|practice')).rejects.toThrow();
  });

  it('opens the vault only with the right password', async () => {
    const { vault, dek } = await createVault('correct horse', IT);
    const c = await encryptJson(dek, 42);
    const again = await openVault('correct horse', vault);
    expect(await decryptJson(again, c)).toBe(42);
    await expect(openVault('wrong', vault)).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('changes the password without re-encrypting data', async () => {
    const { vault, dek } = await createVault('old-pass', IT);
    const c = await encryptJson(dek, 'data');
    const next = await rewrapVault('old-pass', 'new-pass', vault, IT);
    expect(next.salt).not.toBe(vault.salt);
    expect(await decryptJson(await openVault('new-pass', next), c)).toBe('data');
    await expect(openVault('old-pass', next)).rejects.toBeInstanceOf(WrongPasswordError);
    await expect(rewrapVault('bad', 'x', vault, IT)).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('keeps the data key non-extractable', async () => {
    const { dek } = await createVault('password', IT);
    expect(dek.extractable).toBe(false);
  });

  it('rates password strength', () => {
    expect(passwordStrength('123')).toBe(0);
    expect(passwordStrength('123456')).toBe(1);
    expect(passwordStrength('12345678901234')).toBe(1);
    expect(passwordStrength('Przystań-2026!')).toBe(4);
  });
});
