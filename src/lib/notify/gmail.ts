/**
 * Sending e-mails directly from the user's own Gmail account (D-066):
 *  - browser / PWA: Google Identity Services token client (popup) with the user's own OAuth
 *    "Web application" client ID; the access token lives in memory only (≈ 1 h);
 *  - Android app: native AuthorizationClient (PrzystanGoogle plugin) – Google forbids OAuth in
 *    WebViews ("disallowed_useragent").
 * Scope: gmail.send only (send on your behalf – no reading of the mailbox) + email (to show which
 * account is connected). Message: RFC 2822, UTF-8, base64url, POST gmail/v1/users/me/messages/send.
 */
import { registerPlugin } from '@capacitor/core';
import { isNative } from '@/lib/platform';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const SCOPES = `${GMAIL_SEND_SCOPE} openid email`;
export const GIS_SRC = 'https://accounts.google.com/gsi/client';
export const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export class GmailError extends Error {
  constructor(
    public code: 'noClientId' | 'popup' | 'denied' | 'auth' | 'send' | 'network' | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'GmailError';
  }
}

/* ---------------------------------------------------------------- MIME */

const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const utf8 = (s: string) => new TextEncoder().encode(s);
export const base64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** RFC 2047 encoded-words (≤ 75 chars each) for non-ASCII header values. */
export function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  const words: string[] = [];
  let chunk = '';
  for (const ch of value) {
    // 45 raw bytes → 60 base64 chars + 12 for "=?UTF-8?B??=" ≤ 75
    if (utf8(chunk + ch).length > 45) {
      words.push(chunk);
      chunk = '';
    }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${b64(utf8(w))}?=`).join('\r\n ');
}

/** Address with an optional (encoded) display name: "Anna Nowak <a@b.pl>". */
export function address(email: string, name?: string): string {
  const n = name?.trim().replace(/[<>"\r\n]/g, '');
  return n ? `${encodeHeader(n)} <${email.trim()}>` : email.trim();
}

/** Complete RFC 2822 message, base64url-encoded for the Gmail API. */
export function buildRawMessage(m: { from?: string; fromName?: string; to: string; toName?: string; subject: string; body: string; replyTo?: string }): string {
  const to = m.to
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x, i) => address(x, i === 0 ? m.toName : undefined))
    .join(', ');
  const body = b64(utf8(m.body.replace(/\r?\n/g, '\r\n')))
    .match(/.{1,76}/g)!
    .join('\r\n');
  const headers = [
    ...(m.from ? [`From: ${address(m.from, m.fromName)}`] : []),
    `To: ${to}`,
    ...(m.replyTo ? [`Reply-To: ${m.replyTo}`] : []),
    `Subject: ${encodeHeader(m.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  return base64url(utf8(`${headers.join('\r\n')}\r\n\r\n${body}\r\n`));
}

/* --------------------------------------------------------------- token */

interface Token {
  access: string;
  expires: number;
  email?: string;
}
let token: Token | null = null;

export const connectedEmail = () => (token && token.expires > Date.now() ? token.email : undefined);
export const forgetGoogle = () => {
  token = null;
};

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface GisTokenClient {
  requestAccessToken(o?: { prompt?: string; login_hint?: string }): void;
}
type Gis = {
  accounts: {
    oauth2: {
      initTokenClient(c: {
        client_id: string;
        scope: string;
        callback: (r: GisTokenResponse) => void;
        error_callback?: (e: { type: string }) => void;
        login_hint?: string;
      }): GisTokenClient;
    };
  };
};

let gisLoading: Promise<Gis> | undefined;
function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  gisLoading ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => (w.google?.accounts?.oauth2 ? resolve(w.google) : reject(new GmailError('unavailable', 'GIS not loaded')));
    s.onerror = () => {
      gisLoading = undefined;
      reject(new GmailError('network', 'Google sign-in could not be loaded'));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

interface GooglePluginApi {
  authorize(o: { scopes: string[] }): Promise<{ accessToken: string; email?: string }>;
}
const GoogleNative = registerPlugin<GooglePluginApi>('PrzystanGoogle');

async function fetchEmail(access: string, fetchImpl: typeof fetch): Promise<string | undefined> {
  try {
    const r = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { authorization: `Bearer ${access}` } });
    return r.ok ? ((await r.json()) as { email?: string }).email : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Gets a token – must be called from a click (the browser opens Google's popup). Reuses a valid
 * token silently. `hint` = the e-mail the user connected before (fewer clicks).
 */
export async function connectGoogle(clientId: string, hint?: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<Token> {
  if (token && token.expires > Date.now() + 60_000) return token;
  if (isNative()) {
    try {
      const r = await GoogleNative.authorize({ scopes: [GMAIL_SEND_SCOPE, 'email'] });
      token = { access: r.accessToken, expires: Date.now() + 50 * 60_000, email: r.email ?? (await fetchEmail(r.accessToken, fetchImpl)) };
      return token;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      throw new GmailError(/cancel|denied/i.test(msg) ? 'denied' : 'auth', msg);
    }
  }
  if (!clientId.trim()) throw new GmailError('noClientId', 'OAuth client ID missing');
  const gis = await loadGis();
  const resp = await new Promise<GisTokenResponse>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: SCOPES,
      login_hint: hint,
      callback: resolve,
      error_callback: (e) => reject(new GmailError(e.type === 'popup_failed_to_open' ? 'popup' : 'denied', e.type)),
    });
    client.requestAccessToken({ prompt: hint ? '' : 'consent', login_hint: hint });
  });
  if (!resp.access_token) throw new GmailError('denied', resp.error_description ?? resp.error ?? 'no token');
  token = { access: resp.access_token, expires: Date.now() + (resp.expires_in ?? 3600) * 1000, email: await fetchEmail(resp.access_token, fetchImpl) };
  return token;
}

/** Sends one e-mail with an existing token (call connectGoogle first, from the click). */
export async function sendGmail(
  t: Token,
  m: { to: string; toName?: string; subject: string; body: string; fromName?: string },
  fetchImpl: typeof fetch = (...a) => fetch(...a),
): Promise<{ id: string }> {
  let res: Response;
  try {
    res = await fetchImpl(GMAIL_SEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${t.access}`, 'content-type': 'application/json' },
      body: JSON.stringify({ raw: buildRawMessage({ ...m, from: t.email }) }),
    });
  } catch (e) {
    throw new GmailError('network', String(e));
  }
  if (res.status === 401) {
    token = null;
    throw new GmailError('auth', 'token expired');
  }
  if (!res.ok) {
    const msg = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    throw new GmailError('send', msg);
  }
  return (await res.json()) as { id: string };
}
