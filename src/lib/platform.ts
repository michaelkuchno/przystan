/**
 * Platform helpers: haptics and file export/sharing for Web (PWA) and Android (Capacitor).
 */
import { Capacitor } from '@capacitor/core';
import { logEvent, type AuditAction } from './audit';
import { activeSpace } from './store';

export const isNative = () => Capacitor.isNativePlatform();

export type HapticKind = 'light' | 'medium' | 'success' | 'warning';

/** Gentle haptic feedback. Android: Capacitor Haptics; web: vibrate(); iOS Safari: no-op. */
export async function haptic(kind: HapticKind = 'light') {
  try {
    if (isNative()) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'warning') await Haptics.notification({ type: NotificationType.Warning });
      else await Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    }
    if ('vibrate' in navigator) navigator.vibrate(kind === 'light' ? 10 : kind === 'medium' ? 20 : [12, 40, 12]);
  } catch {
    /* haptics are optional */
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Saves or shares a file:
 *  - Android app: writes to the cache dir and opens the system share sheet
 *    (save to Files / Drive / e-mail…);
 *  - iOS/Android PWA: Web Share with files when available;
 *  - desktop: regular download.
 */
export async function exportFile(
  name: string,
  blob: Blob,
  title?: string,
  audit?: { action: AuditAction; details?: Record<string, unknown> },
): Promise<ExportResult> {
  const res = await saveOrShare(name, blob, title);
  if (res !== 'cancelled') {
    // every file that leaves the app is recorded (fictional training data is not)
    const action = audit?.action ?? (name.endsWith('.przystan') ? 'backup.export' : 'data.export');
    await logEvent({
      action,
      space: action === 'data.export' ? activeSpace() : '',
      details: { file: name, size: blob.size, via: res, ...audit?.details },
    }).catch(() => undefined);
  }
  return res;
}

async function saveOrShare(name: string, blob: Blob, title?: string): Promise<ExportResult> {
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const written = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    try {
      await Share.share({ title: title ?? name, files: [written.uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title ?? name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Opens a file picker and returns the text of the chosen file. */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

/** Android app: status/navigation bar icons follow the app theme, not the system theme. */
export function syncSystemBars(dark: boolean) {
  if (!isNative()) return;
  void import('@capacitor/core')
    .then(({ SystemBars, SystemBarsStyle }) =>
      SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }),
    )
    .catch(() => undefined);
}
