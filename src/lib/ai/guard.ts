/**
 * Privacy guard (D-053) – hard rules, enforced in code and covered by tests:
 *
 * 1. Mode 'off' → no provider, no request, no network.
 * 2. Client-linked data ('client') is processed on the device. It may go to the cloud only when
 *    the user enabled it in Settings AND the text was pseudonymised AND the user saw the exact
 *    outgoing text and agreed – a one-time consent token bound to that exact text.
 * 3. Presentation mode: client-linked AI only in the demo space (demo data).
 */
import { AiError, type AiMode, type Sensitivity } from './types';
import type { Space } from '@/domain/types';

export interface GuardContext {
  sensitivity: Sensitivity;
  mode: AiMode;
  /** Settings: allow pseudonymised client text in the cloud (default false). */
  cloudClientData: boolean;
  presentation: boolean;
  space: Space;
  /** A local LLM is downloaded and the device can run it. */
  hasLocalLlm: boolean;
}

export type Route =
  | { kind: 'device' }
  | { kind: 'cloud'; consent: boolean }
  | { kind: 'none'; reason: 'off' | 'presentation' | 'clientLocalOnly' | 'noLocalLlm' };

export function routeFor(c: GuardContext): Route {
  if (c.mode === 'off') return { kind: 'none', reason: 'off' };
  const client = c.sensitivity === 'client';
  if (client && c.presentation && c.space !== 'demo') return { kind: 'none', reason: 'presentation' };
  if (c.mode === 'local') return c.hasLocalLlm ? { kind: 'device' } : { kind: 'none', reason: 'noLocalLlm' };
  if (!client) return { kind: 'cloud', consent: false };
  if (c.hasLocalLlm) return { kind: 'device' };
  return c.cloudClientData ? { kind: 'cloud', consent: true } : { kind: 'none', reason: 'clientLocalOnly' };
}

/* --------------------------------------------------------------- consent */

export interface ConsentToken {
  readonly text: string;
  used: boolean;
}

const issued = new WeakSet<ConsentToken>();

/** Created only by the preview dialog after the user pressed "Send". */
export function grantConsent(exactText: string): ConsentToken {
  const t: ConsentToken = { text: exactText, used: false };
  issued.add(t);
  return t;
}

/**
 * Throws unless the outgoing text may leave the device. For client data the token must have been
 * issued for exactly this text and is consumed (one request per consent).
 */
export function assertCloudAllowed(sensitivity: Sensitivity, outgoing: string, token?: ConsentToken): void {
  if (sensitivity !== 'client') return;
  if (!token || !issued.has(token) || token.used || token.text !== outgoing)
    throw new AiError('privacy', 'client data may not be sent without a consent for this exact text');
  token.used = true;
}

/** The exact text of a request as shown in the preview and checked by the guard. */
export function outgoingText(system: string, parts: string[]): string {
  return [system, ...parts].join('\n\n---\n\n');
}
