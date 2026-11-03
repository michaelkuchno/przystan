/**
 * Biometric unlock – when is the password required again? (pure logic, unit-tested)
 *
 * The password is required:
 *  - to enable biometric unlock,
 *  - after the biometrics registered in the system changed (Android: the Keystore key is
 *    invalidated → biometric unlock is switched off, see index.ts),
 *  - after 5 failed biometric attempts,
 *  - every 7 days.
 */
import type { Cipher } from '../crypto';

export const MAX_FAILURES = 5;
export const PASSWORD_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export interface BioState {
  kind: 'android' | 'webauthn';
  /** DEK wrapped by the biometric key (Android Keystore key / WebAuthn PRF-derived key). */
  wrapped: Cipher;
  /** WebAuthn only: credential id (base64) and PRF salt (base64). */
  credentialId?: string;
  prfSalt?: string;
  enabledAt: string;
  /** Last successful unlock (or enabling) with the password. */
  lastPasswordAt: string;
  /** Failed biometric attempts since the last password unlock. */
  failures: number;
}

export type BioBlock = 'off' | 'tooManyFailures' | 'passwordExpired' | null;

/** Why biometric unlock cannot be offered right now (null = it can). */
export function bioBlock(s: BioState | undefined, now: number): BioBlock {
  if (!s) return 'off';
  if (s.failures >= MAX_FAILURES) return 'tooManyFailures';
  const last = Date.parse(s.lastPasswordAt);
  if (!Number.isFinite(last) || now - last >= PASSWORD_INTERVAL_MS) return 'passwordExpired';
  return null;
}

export function afterFailure(s: BioState, count = 1): BioState {
  return { ...s, failures: Math.min(MAX_FAILURES, s.failures + Math.max(1, count)) };
}

/** A successful biometric unlock does not reset the 7-day password rule, only the failure count. */
export function afterBioSuccess(s: BioState): BioState {
  return { ...s, failures: 0 };
}

export function afterPasswordUnlock(s: BioState, now: number): BioState {
  return { ...s, failures: 0, lastPasswordAt: new Date(now).toISOString() };
}
