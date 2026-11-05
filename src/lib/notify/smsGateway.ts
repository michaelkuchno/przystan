/**
 * Free SMS gateway "SMS Gateway for Android" (open source, sms-gate.app): an Android phone with
 * that app sends the SMS from its own SIM; Przystań calls its public cloud API. The API sends no
 * CORS headers, so it works only from the Android app (native HTTP), not from a browser page
 * (checked 05.11.2026). Message text and numbers pass through the sms-gate.app server – use it
 * only for content without sensitive data (D-065).
 */
import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '@/lib/platform';
import { normPhone } from './links';

export const SMS_GATE_URL = 'https://api.sms-gate.app/3rdparty/v1/messages';

export interface SmsGateConfig {
  username: string;
  password: string;
}

export class SmsGateError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SmsGateError';
  }
}

export const smsGateReady = (c?: SmsGateConfig) => !!(c?.username.trim() && c.password.trim());
/** The gateway can be used from this build (Android app). */
export const smsGateUsable = () => isNative();

export function smsGateBody(to: string, text: string) {
  return {
    textMessage: { text },
    phoneNumbers: to
      .split(/[;,]+/)
      .map(normPhone)
      .filter((n) => n.replace('+', '').length >= 3),
  };
}

export async function sendViaSmsGate(cfg: SmsGateConfig, to: string, text: string): Promise<{ id?: string }> {
  if (!isNative()) throw new SmsGateError(0, 'only in the Android app');
  const auth = btoa(unescape(encodeURIComponent(`${cfg.username.trim()}:${cfg.password.trim()}`)));
  let res;
  try {
    res = await CapacitorHttp.post({
      url: SMS_GATE_URL,
      headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
      data: smsGateBody(to, text),
      connectTimeout: 20_000,
      readTimeout: 30_000,
    });
  } catch (e) {
    throw new SmsGateError(0, String(e));
  }
  if (res.status === 401) throw new SmsGateError(401, 'wrong username or password');
  if (res.status < 200 || res.status >= 300) throw new SmsGateError(res.status, typeof res.data === 'string' ? res.data.slice(0, 200) : `HTTP ${res.status}`);
  return { id: (res.data as { id?: string } | undefined)?.id };
}
