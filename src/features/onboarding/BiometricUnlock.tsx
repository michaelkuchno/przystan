import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { BioError, biometricBlock, readBio, unlockWithBiometric, type BioBlock } from '@/lib/biometric';
import { haptic } from '@/lib/platform';

/**
 * Lock screen: "Unlock with biometrics" when it is enabled and the password is not required
 * (7-day rule, 5 failures, biometrics changed). On Android the prompt opens by itself;
 * WebAuthn (iOS / PWA) needs a tap.
 */
export function BiometricUnlock() {
  const { t } = useTranslation();
  const [state, setState] = useState<{ block: BioBlock; kind?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const autoTried = useRef(false);

  const refresh = useCallback(async () => {
    const s = await readBio();
    setState({ block: await biometricBlock(), kind: s?.kind });
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      await unlockWithBiometric({ title: t('appName'), subtitle: t('lock.bioPrompt'), cancel: t('lock.usePassword') });
      void haptic('success');
    } catch (e) {
      if (!(e instanceof BioError)) throw e;
      if (e.code === 'invalidated') setMsg(t('lock.bioChanged'));
      else if (e.code === 'lockout') setMsg(t('lock.bioLockout'));
      else if (e.code === 'failed') setMsg(t('lock.bioFailed'));
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [t, refresh]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await readBio();
      const block = await biometricBlock();
      if (!alive) return;
      setState({ block, kind: s?.kind });
      // Android: open the system prompt right away (WebAuthn needs a tap)
      if (block === null && s?.kind === 'android' && !autoTried.current) {
        autoTried.current = true;
        await run();
      }
    })();
    return () => {
      alive = false;
    };
  }, [run]);

  if (!state || state.block === 'off') return msg ? <p className="mt-4 text-sm text-muted">{msg}</p> : null;
  if (state.block) {
    return (
      <p className="mt-4 text-sm text-muted" role="status">
        {msg ?? t(state.block === 'tooManyFailures' ? 'lock.bioTooMany' : 'lock.bioExpired')}
      </p>
    );
  }
  return (
    <div className="mt-4">
      <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Fingerprint className="size-5" aria-hidden />}
        {t('lock.bioUnlock')}
      </Button>
      {msg && (
        <p className="mt-2 text-sm text-muted" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
