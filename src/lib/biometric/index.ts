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
import { readVault, _setKey, noteFailedUnlock } from '../vault';
import {
  afterBioSuccess,
  afterFailure,
  afterPasswordUnlock,
  bioBlock,
  MAX_FAILURES,
  type BioBlock,
  type BioState,
} from './policy';
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
    readonly code: 'cancelled' | 'failed' | 'invalidated' | 'lockout' | 'unavailable' | 'unsupported' | 'blocked',
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

/**
 * Availability with a reason, for Settings: the option is always shown (instead of silently
 * hidden) so the user can see why biometric unlock is not possible on this device.
 *  - reason: why it is unavailable (Android BiometricManager status, missing WebAuthn, …)
 *  - warning: available, but the browser reported something that may make it fail (iOS)
 *  - detail: raw diagnostic data (status codes, error message)
 */
export interface BioAvailability {
  kind: BioState['kind'] | null;
  available: boolean;
  reason?:
    | 'noneEnrolled'
    | 'weakOnly'
    | 'noHardware'
    | 'hwUnavailable'
    | 'updateRequired'
    | 'unsupported'
    | 'unknown'
    | 'plugin'
    | 'noWebAuthn'
    | 'insecure';
  warning?: 'noPlatformAuthenticator' | 'noPrf';
  detail?: string;
}

// androidx.biometric BiometricManager status codes
const ANDROID_STATUS: Record<number, BioAvailability['reason']> = {
  1: 'hwUnavailable',
  11: 'noneEnrolled',
  12: 'noHardware',
  15: 'updateRequired',
  [-2]: 'unsupported',
  [-1]: 'unknown',
};

export async function bioAvailability(): Promise<BioAvailability> {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() !== 'android') return { kind: null, available: false };
    try {
      const r = (await Native.isAvailable()) as { available: boolean; status?: number; weakStatus?: number; sdk?: number };
      const detail = `status ${r.status}, weak ${r.weakStatus}, SDK ${r.sdk}`;
      if (r.available) return { kind: 'android', available: true, detail };
      const reason = r.weakStatus === 0 ? 'weakOnly' : (ANDROID_STATUS[r.status ?? -1] ?? 'unknown');
      return { kind: 'android', available: false, reason, detail };
    } catch (e) {
      return { kind: 'android', available: false, reason: 'plugin', detail: String((e as Error)?.message ?? e) };
    }
  }
  const PKC = window.PublicKeyCredential as
    (typeof PublicKeyCredential & { getClientCapabilities?: () => Promise<Record<string, boolean>> }) | undefined;
  if (!PKC) return { kind: 'webauthn', available: false, reason: 'noWebAuthn' };
  if (!window.isSecureContext) return { kind: 'webauthn', available: false, reason: 'insecure' };
  // Safari (iOS 18 home-screen apps) may under-report both of these – they only warn; creating the
  // passkey decides (prf.enabled) in continueEnable().
  let warning: BioAvailability['warning'];
  const details: string[] = [];
  try {
    const uv = await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
    details.push(`platform authenticator: ${uv}`);
    if (!uv) warning = 'noPlatformAuthenticator';
  } catch (e) {
    details.push(`platform authenticator: ${String(e)}`);
  }
  try {
    const caps = await PKC.getClientCapabilities?.();
    details.push(`prf: ${caps ? String(caps['extension:prf']) : 'n/a'}`);
    if (caps && caps['extension:prf'] === false) warning ??= 'noPrf';
  } catch (e) {
    details.push(`capabilities: ${String(e)}`);
  }
  return { kind: 'webauthn', available: true, warning, detail: details.join(', ') };
}

/** Which biometric method this device offers (null = not possible). */
export async function bioSupport(): Promise<BioState['kind'] | null> {
  const a = await bioAvailability();
  return a.available ? a.kind : null;
}

/** Block reason for an already read state (lock screen). */
export function bioBlockOf(s: BioState | undefined, now = Date.now()): BioBlock {
  return bioBlock(s, now);
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
  const prf = prfFirst(cred);
  if (!ext.prf?.enabled && !prf) throw new BioError('unsupported');
  return { id: toB64(cred.rawId), prf };
}

/* ------------------------------------------------------------------ enable / disable */

/**
 * Enabling happens in steps, because Safari only allows Face ID / Touch ID (WebAuthn) as the
 * direct result of a tap – slow work (PBKDF2 of the password) before it would make Safari refuse:
 *  1. startEnable(password) – checks the password and keeps a copy of the data key in memory;
 *  2. continueEnable(session) – call it straight from a button tap; on iOS it may return
 *     'confirm' when the passkey did not return the PRF result yet – then call it once more
 *     from another tap ("Confirm with Face ID");
 *  3. cancelEnable(session) – wipes the key copy if the user gives up.
 */
export interface EnableSession {
  kind: BioState['kind'];
  raw: Uint8Array<ArrayBuffer>;
  salt?: Uint8Array<ArrayBuffer>;
  credentialId?: string;
}

/** Step 1. Throws WrongPasswordError for a wrong password, BioError('unsupported') without support. */
export async function startEnable(password: string): Promise<EnableSession> {
  const kind = await bioSupport();
  if (!kind) throw new BioError('unsupported');
  const vault = await readVault();
  if (!vault) throw new Error('no-vault');
  return { kind, raw: await unwrapRaw(password, vault) };
}

export function cancelEnable(s: EnableSession | null | undefined) {
  s?.raw.fill(0);
}

/** Step 2 (and 3 on iOS). Must run synchronously from a user gesture – no awaits before the prompt. */
export async function continueEnable(sess: EnableSession, texts: PromptTexts, now = Date.now()): Promise<'done' | 'confirm'> {
  const stamp = new Date(now).toISOString();
  const save = async (state: BioState) => {
    await writeBio(state);
    cancelEnable(sess);
    return 'done' as const;
  };
  if (sess.kind === 'android') {
    const wrapped = await nativeCall(() => Native.encrypt({ ...texts, data: toB64(sess.raw) }));
    return save({ kind: 'android', wrapped, enabledAt: stamp, lastPasswordAt: stamp, failures: 0 });
  }
  let prf: ArrayBuffer | undefined;
  if (!sess.credentialId) {
    sess.salt = randomBytes(32);
    const created = await webauthnCall(() => webauthnCreate(texts.title, sess.salt!));
    sess.credentialId = created.id;
    prf = created.prf;
    // the passkey exists but did not evaluate PRF on creation (common on iOS) – ask for one more tap
    if (!prf) return 'confirm';
  } else {
    prf = await webauthnCall(() => webauthnGetPrf(sess.credentialId!, sess.salt!));
  }
  const wrapped = await wrapDek(await keyFromPrf(prf, sess.salt!), sess.raw);
  return save({
    kind: 'webauthn',
    wrapped,
    credentialId: sess.credentialId,
    prfSalt: toB64(sess.salt!),
    enabledAt: stamp,
    lastPasswordAt: stamp,
    failures: 0,
  });
}

/** WebAuthn errors → BioError (NotAllowedError = cancelled / not recognised / no gesture). */
async function webauthnCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await withPrompt(fn);
  } catch (e) {
    if (e instanceof BioError) throw e;
    throw new BioError((e as DOMException)?.name === 'NotAllowedError' ? 'cancelled' : 'unavailable');
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

/**
 * While the system biometric prompt is open the app is briefly "hidden" (Android pauses the
 * activity, iOS shows a system sheet). The auto-lock must ignore that, otherwise it locks the app
 * in the middle of enabling or unlocking – see useAutoLock().
 */
let promptActive = 0;
export function isBioPromptActive(): boolean {
  return promptActive > 0;
}
async function withPrompt<T>(fn: () => Promise<T>): Promise<T> {
  promptActive++;
  try {
    return await fn();
  } finally {
    // the "visible again" event arrives just after the prompt closes
    setTimeout(() => promptActive--, 1500);
  }
}

async function nativeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await withPrompt(fn);
  } catch (e) {
    const err = e as { code?: string; message?: string; data?: { failedAttempts?: number } };
    const code = (err.code ?? err.message ?? '') as BioError['code'];
    const failed = err.data?.failedAttempts ?? 0;
    if (['cancelled', 'failed', 'invalidated', 'lockout', 'unavailable'].includes(code)) throw new BioError(code, failed);
    // any other error (prompt could not be shown, app in background, …) is not a failed attempt
    throw new BioError('unavailable', failed);
  }
}

/**
 * Unlocks with biometrics. On success the vault is unlocked.
 * Throws BioError: 'blocked' (password needed), 'invalidated' (biometrics changed – switched off),
 * 'cancelled', 'failed', 'lockout', 'unavailable'.
 *
 * Pass the state read in advance (`preloaded`) when calling from a tap: Safari allows Face ID only
 * as the direct result of a user gesture, so nothing may be awaited before the WebAuthn call.
 */
export async function unlockWithBiometric(texts: PromptTexts, now = Date.now(), preloaded?: BioState): Promise<void> {
  const s = preloaded ?? (await readBio());
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
      const prf = await webauthnCall(() => webauthnGetPrf(s.credentialId!, salt));
      try {
        dek = await unwrapDek(await keyFromPrf(prf, salt), s.wrapped);
      } catch {
        throw new BioError('failed');
      }
    }
    const latest = (await readBio()) ?? s;
    await writeBio(afterBioSuccess(latest));
    _setKey(dek, 'biometric');
  } catch (e) {
    if (!(e instanceof BioError)) throw e;
    if (e.code === 'invalidated') {
      // enrolled biometrics changed: the wrapped key is useless – switch off, password required
      await disableBiometric();
    } else if (e.code === 'lockout') {
      await writeBio({ ...s, failures: MAX_FAILURES });
    } else if (e.failedAttempts) {
      // only fingers / faces that were actually presented and not recognised count towards the 5
      await writeBio(afterFailure(s, e.failedAttempts));
      await noteFailedUnlock('biometric');
    } else if (e.code === 'failed' && s.kind === 'webauthn') {
      // WebAuthn returned a PRF result that does not open the key – a real failed attempt
      await writeBio(afterFailure(s, 1));
    }
    throw e;
  }
}

export type { Cipher };
