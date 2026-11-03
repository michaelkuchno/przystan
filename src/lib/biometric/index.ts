/**
 * Optional biometric unlock (Settings → Security). The password always keeps working.
 *
 *  - Android app: native plugin "PrzystanBiometric" – AES-GCM key in the Android Keystore that
 *    requires strong biometric authentication and is invalidated when the enrolled biometrics
 *    change; it encrypts a copy of the DEK.
 *  - iOS / PWA: a passkey (WebAuthn) with the PRF extension; the PRF output → HKDF → AES-GCM key
 *    wraps a copy of the DEK. Without PRF support the option is hidden.
 *
 * Disabling removes the wrapped key (and the Keystore key). See docs/DECISIONS.md D-034.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { db } from '../db';
import { fromB64, randomBytes, toB64, unwrapRaw, importDek, type Cipher } from '../crypto';
import { readVault, _setKey } from '../vault';
import { afterBioSuccess, afterFailure, afterPasswordUnlock, bioBlock, MAX_FAILURES, type BioBlock, type BioState } from './policy';
import { keyFromPrf, unwrapDek, wrapDek } from './wrap';

export type { BioBlock, BioState };

interface PromptTexts {
  title: string;
  subtitle: string;
  cancel: string;
}

interface NativeBiometric {
  isAvailable(): Promise<{ available: boolean }>;
  encrypt(o: PromptTexts & { data: string }): Promise<{ iv: string; ct: string }>;
  decrypt(o: PromptTexts & { iv: string; ct: string }): Promise<{ data: string; failedAttempts?: number }>;
  deleteKey(): Promise<void>;
}

const Native = registerPlugin<NativeBiometric>('PrzystanBiometric');

/** Errors the UI can explain. */
export class BioError extends Error {
  constructor(
    readonly code: 'cancelled' | 'failed' | 'invalidated' | 'lockout' | 'unsupported' | 'blocked',
    readonly failedAttempts = 0,
  ) {
    super(code);
    this.name = 'BioError';
  }
}

const META_KEY = 'bio';

export async function readBio(): Promise<BioState | undefined> {
  return (await db.meta.get(META_KEY))?.value as BioState | undefined;
}

async function writeBio(s: BioState | undefined) {
  if (s) await db.meta.put({ key: META_KEY, value: s });
  else await db.meta.delete(META_KEY);
}

/** Which biometric method this device offers (null = hide the option). */
export async function bioSupport(): Promise<BioState['kind'] | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() !== 'android') return null;
      return (await Native.isAvailable()).available ? 'android' : null;
    }
    const PKC = window.PublicKeyCredential as
      | (typeof PublicKeyCredential & { getClientCapabilities?: () => Promise<Record<string, boolean>> })
      | undefined;
    if (!PKC || !window.isSecureContext) return null;
    const caps = await PKC.getClientCapabilities?.();
    if (!caps?.['extension:prf']) return null;
    if (!(await PKC.isUserVerifyingPlatformAuthenticatorAvailable())) return null;
    return 'webauthn';
  } catch {
    return null;
  }
}

/** Current block reason for the lock screen (null = biometric unlock can be offered). */
export async function biometricBlock(now = Date.now()): Promise<BioBlock> {
  return bioBlock(await readBio(), now);
}

/* ------------------------------------------------------------------ WebAuthn PRF */

const rpId = () => window.location.hostname;

function prfFirst(cred: PublicKeyCredential | null): ArrayBuffer | undefined {
  const ext = cred?.getClientExtensionResults() as { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } } | undefined;
  return ext?.prf?.results?.first;
}

async function webauthnGetPrf(credentialId: string, salt: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: rpId(),
      allowCredentials: [{ type: 'public-key', id: fromB64(credentialId) }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const prf = prfFirst(cred);
  if (!prf) throw new BioError('unsupported');
  return prf;
}

async function webauthnCreate(userName: string, salt: Uint8Array<ArrayBuffer>): Promise<{ id: string; prf?: ArrayBuffer }> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { id: rpId(), name: 'Przystań' },
      user: { id: randomBytes(16), name: userName, displayName: userName },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
      timeout: 60_000,
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new BioError('cancelled');
  const ext = cred.getClientExtensionResults() as { prf?: { enabled?: boolean } };
  if (!ext.prf?.enabled) throw new BioError('unsupported');
  return { id: toB64(cred.rawId), prf: prfFirst(cred) };
}

/* ------------------------------------------------------------------ enable / disable */

/**
 * Enables biometric unlock. The password is required (it releases the DEK copy to wrap).
 * Throws WrongPasswordError for a wrong password, BioError otherwise.
 */
export async function enableBiometric(password: string, texts: PromptTexts, now = Date.now()): Promise<void> {
  const kind = await bioSupport();
  if (!kind) throw new BioError('unsupported');
  const vault = await readVault();
  if (!vault) throw new Error('no-vault');
  const raw = await unwrapRaw(password, vault);
  try {
    let state: BioState;
    const stamp = new Date(now).toISOString();
    if (kind === 'android') {
      const wrapped = await nativeCall(() => Native.encrypt({ ...texts, data: toB64(raw) }));
      state = { kind, wrapped, enabledAt: stamp, lastPasswordAt: stamp, failures: 0 };
    } else {
      const salt = randomBytes(32);
      const created = await webauthnCreate(texts.title, salt);
      // some authenticators return the PRF result only on get(), not on create()
      const prf = created.prf ?? (await webauthnGetPrf(created.id, salt));
      const wrapped = await wrapDek(await keyFromPrf(prf, salt), raw);
      state = { kind, wrapped, credentialId: created.id, prfSalt: toB64(salt), enabledAt: stamp, lastPasswordAt: stamp, failures: 0 };
    }
    await writeBio(state);
  } finally {
    raw.fill(0);
  }
}

/** Switches biometric unlock off and removes the wrapped key (and the Android Keystore key). */
export async function disableBiometric(): Promise<void> {
  const s = await readBio();
  await writeBio(undefined);
  if (s?.kind === 'android' || Capacitor.isNativePlatform()) {
    try {
      await Native.deleteKey();
    } catch {
      /* nothing to delete */
    }
  }
}

/** Call after every successful password unlock (resets the counters of the 7-day / 5-failure rules). */
export async function notePasswordUnlock(now = Date.now()): Promise<void> {
  const s = await readBio();
  if (s) await writeBio(afterPasswordUnlock(s, now));
}

/* ------------------------------------------------------------------ unlock */

async function nativeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const err = e as { code?: string; message?: string; data?: { failedAttempts?: number } };
    const code = (err.code ?? err.message ?? '') as BioError['code'];
    const failed = err.data?.failedAttempts ?? 0;
    if (['cancelled', 'failed', 'invalidated', 'lockout'].includes(code)) throw new BioError(code, failed);
    throw new BioError('failed', failed);
  }
}

/**
 * Unlocks with biometrics. On success the vault is unlocked.
 * Throws BioError: 'blocked' (password needed), 'invalidated' (biometrics changed – switched off),
 * 'cancelled', 'failed', 'lockout'.
 */
export async function unlockWithBiometric(texts: PromptTexts, now = Date.now()): Promise<void> {
  const s = await readBio();
  if (bioBlock(s, now) || !s) throw new BioError('blocked');
  try {
    let dek: CryptoKey;
    if (s.kind === 'android') {
      const res = await nativeCall(() => Native.decrypt({ ...texts, ...s.wrapped }));
      const raw = fromB64(res.data);
      dek = await importDek(raw);
      raw.fill(0);
      if (res.failedAttempts) await writeBio(afterFailure(s, res.failedAttempts));
    } else {
      const salt = fromB64(s.prfSalt!);
      let prf: ArrayBuffer;
      try {
        prf = await webauthnGetPrf(s.credentialId!, salt);
      } catch (e) {
        if (e instanceof BioError) throw e;
        // NotAllowedError = cancelled or not recognised (WebAuthn does not tell them apart)
        throw new BioError((e as DOMException)?.name === 'NotAllowedError' ? 'cancelled' : 'failed');
      }
      try {
        dek = await unwrapDek(await keyFromPrf(prf, salt), s.wrapped);
      } catch {
        throw new BioError('failed');
      }
    }
    const latest = (await readBio()) ?? s;
    await writeBio(afterBioSuccess(latest));
    _setKey(dek);
  } catch (e) {
    if (!(e instanceof BioError)) throw e;
    if (e.code === 'invalidated') {
      // enrolled biometrics changed: the wrapped key is useless – switch off, password required
      await disableBiometric();
    } else if (e.code === 'lockout') {
      await writeBio({ ...s, failures: MAX_FAILURES });
    } else if (e.code === 'failed') {
      await writeBio(afterFailure(s, e.failedAttempts || 1));
    } else if (e.failedAttempts) {
      await writeBio(afterFailure(s, e.failedAttempts));
    }
    throw e;
  }
}

export type { Cipher };
