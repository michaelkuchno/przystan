/**
 * Hand-over to the device's own mail / SMS app (free, no server; the message is sent by the
 * user's own account / phone plan). Nothing leaves the app before the user taps "Send" there.
 */

/** mailto: with RFC 6068 encoding (spaces as %20, line breaks as %0D%0A). */
export function mailtoUrl(to: string, subject: string, body: string): string {
  const enc = (s: string) =>
    encodeURIComponent(s)
      .replace(/%0A/g, '%0D%0A')
      .replace(/%0D%0D%0A/g, '%0D%0A');
  const params = [subject && `subject=${enc(subject)}`, body && `body=${enc(body.replace(/\r\n/g, '\n'))}`]
    .filter(Boolean)
    .join('&');
  const addr = to
    .split(/[;,\s]+/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => encodeURIComponent(a).replace(/%40/g, '@'))
    .join(',');
  return `mailto:${addr}${params ? `?${params}` : ''}`;
}

/** Normalises a phone number for sms: (keeps a leading +, drops spaces, dashes, brackets). */
export function normPhone(phone: string): string {
  const p = phone.trim().replace(/^00/, '+');
  return (p.startsWith('+') ? '+' : '') + p.replace(/[^\d]/g, '');
}

/**
 * sms: link that works on iOS and Android: "sms:+41791234567?&body=…" (iOS needs the "&",
 * Android accepts it). Several recipients are joined with commas.
 */
export function smsUrl(phone: string, body: string): string {
  const nums = phone
    .split(/[;,]+/)
    .map(normPhone)
    .filter((n) => n.replace('+', '').length >= 3)
    .join(',');
  return `sms:${nums}?&body=${encodeURIComponent(body)}`;
}

/** Practical limit for mailto: links (long bodies are truncated by some mail apps). */
export const MAILTO_SAFE_LENGTH = 1800;

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const looksLikePhone = (s: string) => normPhone(s).replace('+', '').length >= 6;

/** SMS segments (GSM-7: 160 / 153 chars, otherwise UCS-2: 70 / 67) – shown as a hint. */
export function smsSegments(text: string): { chars: number; segments: number; unicode: boolean } {
  const gsm = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/.test(text);
  const per = gsm ? [160, 153] : [70, 67];
  const n = [...text].length;
  return { chars: n, segments: n === 0 ? 0 : n <= per[0]! ? 1 : Math.ceil(n / per[1]!), unicode: !gsm };
}
