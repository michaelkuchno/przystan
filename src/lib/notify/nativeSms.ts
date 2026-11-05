/**
 * Direct SMS from this phone (Android app only): native SmsManager through the app-local
 * PrzystanSms plugin (android/app/src/main/java/pl/przystan/app/SmsPlugin.java). Sent with the
 * phone's own SIM and plan – free for Przystań, no third party. Asks for SEND_SMS on first use.
 */
import { registerPlugin } from '@capacitor/core';
import { isNative } from '@/lib/platform';
import { normPhone } from './links';

interface SmsPluginApi {
  available(): Promise<{ available: boolean; permission: 'granted' | 'prompt' }>;
  send(o: { to: string; body: string }): Promise<{ sent: boolean; confirmed: boolean }>;
}

const Sms = registerPlugin<SmsPluginApi>('PrzystanSms');

export async function nativeSmsAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    return (await Sms.available()).available;
  } catch {
    return false;
  }
}

export class SmsSendError extends Error {
  constructor(
    public code: 'DENIED' | 'UNAVAILABLE' | 'FAILED' | 'INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'SmsSendError';
  }
}

/** Sends to one or more numbers (comma separated). Resolves when the network accepted it. */
export async function sendNativeSms(to: string, body: string): Promise<{ confirmed: boolean }> {
  const numbers = to
    .split(/[;,]+/)
    .map(normPhone)
    .filter((n) => n.replace('+', '').length >= 3)
    .join(',');
  try {
    const r = await Sms.send({ to: numbers, body });
    return { confirmed: r.confirmed };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const code = (['DENIED', 'UNAVAILABLE', 'INVALID'] as const).find((c) => c === err.code) ?? 'FAILED';
    throw new SmsSendError(code, err.message ?? String(e));
  }
}
