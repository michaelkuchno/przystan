import { describe, expect, it } from 'vitest';
import { encryptJson, decryptJson, randomBytes } from '../crypto';
import { keyFromPrf, unwrapDek, wrapDek } from './wrap';
import {
  afterBioSuccess,
  afterFailure,
  afterPasswordUnlock,
  bioBlock,
  MAX_FAILURES,
  PASSWORD_INTERVAL_MS,
  type BioState,
} from './policy';

const NOW = Date.parse('2026-11-03T12:00:00Z');

const state = (over: Partial<BioState> = {}): BioState => ({
  kind: 'webauthn',
  wrapped: { iv: '', ct: '' },
  enabledAt: new Date(NOW).toISOString(),
  lastPasswordAt: new Date(NOW).toISOString(),
  failures: 0,
  ...over,
});

describe('DEK wrapping with a PRF-derived key', () => {
  it('round-trips: the unwrapped DEK decrypts data encrypted with the original DEK', async () => {
    const raw = randomBytes(32);
    const original = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    const secret = await encryptJson(original, { note: 'tajne' }, 'aad');

    const prf = randomBytes(32);
    const salt = randomBytes(32);
    const wrapped = await wrapDek(await keyFromPrf(prf, salt), raw);
    const dek = await unwrapDek(await keyFromPrf(prf, salt), wrapped);
    await expect(decryptJson(dek, secret, 'aad')).resolves.toEqual({ note: 'tajne' });
    expect(dek.extractable).toBe(false);
  });

  it('fails with a different PRF output or salt (another passkey / tampered state)', async () => {
    const raw = randomBytes(32);
    const salt = randomBytes(32);
    const wrapped = await wrapDek(await keyFromPrf(randomBytes(32), salt), raw);
    await expect(unwrapDek(await keyFromPrf(randomBytes(32), salt), wrapped)).rejects.toThrow();
  });

  it('fails when the wrapped key was altered', async () => {
    const raw = randomBytes(32);
    const prf = randomBytes(32);
    const salt = randomBytes(32);
    const key = await keyFromPrf(prf, salt);
    const wrapped = await wrapDek(key, raw);
    const ct = atob(wrapped.ct);
    const tampered = { ...wrapped, ct: btoa(String.fromCharCode(ct.charCodeAt(0) ^ 1) + ct.slice(1)) };
    await expect(unwrapDek(key, tampered)).rejects.toThrow();
  });

  it('rejects a too short PRF output', async () => {
    await expect(keyFromPrf(randomBytes(16), randomBytes(32))).rejects.toThrow('prf-too-short');
  });
});

describe('when the password is required', () => {
  it('biometrics off → password', () => {
    expect(bioBlock(undefined, NOW)).toBe('off');
  });

  it('fresh state → biometrics allowed', () => {
    expect(bioBlock(state(), NOW)).toBeNull();
  });

  it('after 5 failed attempts → password', () => {
    let s = state();
    for (let i = 0; i < MAX_FAILURES - 1; i++) s = afterFailure(s);
    expect(bioBlock(s, NOW)).toBeNull();
    s = afterFailure(s);
    expect(bioBlock(s, NOW)).toBe('tooManyFailures');
    expect(afterFailure(s, 10).failures).toBe(MAX_FAILURES);
  });

  it('a successful biometric unlock resets failures but not the 7-day rule', () => {
    const s = afterBioSuccess(state({ failures: 3, lastPasswordAt: new Date(NOW - 6 * 86_400_000).toISOString() }));
    expect(s.failures).toBe(0);
    expect(bioBlock(s, NOW + 86_400_000)).toBe('passwordExpired');
  });

  it('every 7 days → password', () => {
    const s = state();
    expect(bioBlock(s, NOW + PASSWORD_INTERVAL_MS - 1)).toBeNull();
    expect(bioBlock(s, NOW + PASSWORD_INTERVAL_MS)).toBe('passwordExpired');
  });

  it('a password unlock resets both rules', () => {
    const s = afterPasswordUnlock(state({ failures: 5, lastPasswordAt: '2020-01-01T00:00:00Z' }), NOW);
    expect(s.failures).toBe(0);
    expect(bioBlock(s, NOW)).toBeNull();
  });

  it('a corrupted timestamp → password', () => {
    expect(bioBlock(state({ lastPasswordAt: 'x' }), NOW)).toBe('passwordExpired');
  });
});
