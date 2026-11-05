/**
 * Personal communication settings – the user's own name / signature / addresses and the optional
 * EmailJS credentials. Encrypted with the data key (like the Gemini key), not part of backups.
 */
import { db } from '@/lib/db';
import { decryptJson, encryptJson, type Cipher } from '@/lib/crypto';
import { getKey, isUnlocked, onLockChange } from '@/lib/vault';

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  /** Optional "private key" (access token) – needed when strict mode is on in EmailJS. */
  privateKey?: string;
}

export interface CommsSecrets {
  /** Name used in signatures ("Anna Nowak"). */
  myName: string;
  /** Role / organisation for the signature ("pedagog, MOW Kraków"). */
  myRole: string;
  /** Contact line in the signature (phone / e-mail) – optional. */
  myContact: string;
  /** Where the daily summary goes. */
  myEmail: string;
  emailjs?: EmailJsConfig;
}

const META = 'commsSecrets';
const AAD = 'notify:comms';
let cached: CommsSecrets | undefined;

onLockChange(() => {
  if (!isUnlocked()) cached = undefined;
});

export const emptySecrets = (): CommsSecrets => ({ myName: '', myRole: '', myContact: '', myEmail: '' });

export async function loadSecrets(): Promise<CommsSecrets> {
  if (cached) return cached;
  const row = (await db.meta.get(META))?.value as Cipher | undefined;
  cached = row ? { ...emptySecrets(), ...(await decryptJson<CommsSecrets>(getKey(), row, AAD)) } : emptySecrets();
  return cached;
}

export async function saveSecrets(s: CommsSecrets): Promise<void> {
  await db.meta.put({ key: META, value: await encryptJson(getKey(), s, AAD) });
  cached = s;
}

export const emailJsReady = (s: CommsSecrets) =>
  !!(s.emailjs?.serviceId.trim() && s.emailjs.templateId.trim() && s.emailjs.publicKey.trim());

/** "Anna Nowak\npedagog, MOW Kraków\ntel. …" – empty lines left out. */
export function signature(s: CommsSecrets): string {
  return [s.myName, s.myRole, s.myContact]
    .map((x) => x.trim())
    .filter(Boolean)
    .join('\n');
}
