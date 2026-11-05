import { save, uid, activeSpace } from '@/lib/store';
import { logEvent } from '@/lib/audit';
import { isNative } from '@/lib/platform';
import type { Message, MessageVia } from '@/domain/types';

/** Records a message as sent / handed over (content stays encrypted; the audit log gets metadata only). */
export async function recordSent(
  m: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; createdAt?: string },
  via: MessageVia,
) {
  const now = new Date().toISOString();
  const saved = await save('message', {
    ...m,
    id: m.id ?? uid(),
    status: 'sent',
    via,
    sentAt: now,
    createdAt: m.createdAt ?? now,
    updatedAt: now,
  });
  void logEvent({
    action: 'message.send',
    space: activeSpace(),
    kind: 'message',
    recordId: saved.id,
    clientId: m.clientId ?? '',
    details: { channel: m.channel, via, kind: 'manual' },
  });
  return saved;
}

export async function saveDraft(
  m: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; createdAt?: string },
) {
  const now = new Date().toISOString();
  return save('message', { ...m, id: m.id ?? uid(), status: 'draft', createdAt: m.createdAt ?? now, updatedAt: now });
}

/** System share sheet (Android app: Capacitor Share; browser: Web Share). */
export async function shareText(title: string, text: string): Promise<boolean> {
  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
  } catch {
    /* cancelled */
  }
  return false;
}
