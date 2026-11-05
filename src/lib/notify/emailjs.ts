/**
 * Optional automatic e-mail through the user's OWN free EmailJS account (no Przystań server):
 * the daily summary to yourself and – on demand – a message written in the app. Sent only
 * while the app is open and unlocked. Template parameters: to_email, to_name, subject, message,
 * from_name, reply_to (set "To Email" = {{to_email}} in the EmailJS template). See docs/NOTIFICATIONS.md.
 */
import type { EmailJsConfig } from './secrets';

export const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

export interface EmailParams {
  to_email: string;
  to_name?: string;
  subject: string;
  message: string;
  from_name?: string;
  reply_to?: string;
}

export class EmailJsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'EmailJsError';
  }
}

export async function sendEmailJs(
  cfg: EmailJsConfig,
  params: EmailParams,
  fetchImpl: typeof fetch = (...a) => fetch(...a),
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service_id: cfg.serviceId.trim(),
        template_id: cfg.templateId.trim(),
        user_id: cfg.publicKey.trim(),
        ...(cfg.privateKey?.trim() ? { accessToken: cfg.privateKey.trim() } : {}),
        template_params: params,
      }),
    });
  } catch (e) {
    throw new EmailJsError(0, String(e));
  }
  if (!res.ok) throw new EmailJsError(res.status, (await res.text().catch(() => '')).slice(0, 300) || `HTTP ${res.status}`);
}
