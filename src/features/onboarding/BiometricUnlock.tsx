import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { BioError, bioBlockOf, isBioPromptActive, readBio, unlockWithBiometric, type BioBlock, type BioState } from '@/lib/biometric';
import { haptic } from '@/lib/platform';

/**
 * Lock screen: "Unlock with biometrics" when it is enabled and the password is not required
 * (7-day rule, 5 failures, biometrics changed).
 *  - The state is read in advance, so a tap opens Face ID / Touch ID immediately (Safari allows
 *    WebAuthn only directly from a user gesture).
 *  - Android: the system prompt opens by itself – only while the app is visible, and once per
 *    return to the app (not again after "Use password").
 */
export function BiometricUnlock() {
  const { t } = useTranslation();
  const [bio, setBio] = useState<{ state?: BioState; block: BioBlock } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const autoTried = useRef(false);

  const load = useCallback(async () => {
    const state = await readBio();
    const next = { state, block: bioBlockOf(state) };
    setBio(next);
    return next;
  }, []);

  const run = useCallback(
    (state: BioState | undefined) => {
      setBusy(true);
      setMsg(null);
      // no await before this call: the prompt must open within the tap
      unlockWithBiometric({ title: t('appName'), subtitle: t('lock.bioPrompt'), cancel: t('lock.usePassword') }, Date.now(), state)
        .then(() => void haptic('success'))
        .catch(async (e: unknown) => {
          if (!(e instanceof BioError)) throw e;
          if (e.code === 'invalidated') setMsg(t('lock.bioChanged'));
          else if (e.code === 'lockout') setMsg(t('lock.bioLockout'));
          else if (e.code === 'failed') setMsg(t('lock.bioFailed'));
          else if (e.code === 'unavailable') setMsg(t('lock.bioUnavailable'));
          await load();
        })
        .finally(() => setBusy(false));
    },
    [t, load],
  );

  useEffect(() => {
    let alive = true;
    const tryAuto = async () => {
      if (document.visibilityState !== 'visible') return;
      const next = await load();
      if (!alive || autoTried.current) return;
      if (next.block === null && next.state?.kind === 'android') {
        autoTried.current = true;
        run(next.state);
      }
    };
    const onVis = () => {
      // leaving the app for real (not the system prompt) → offer the prompt again on return
      if (document.visibilityState === 'hidden' && !isBioPromptActive()) autoTried.current = false;
      else void tryAuto();
    };
    void tryAuto();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load, run]);

  if (!bio || bio.block === 'off') return msg ? <p className="mt-4 text-sm text-muted">{msg}</p> : null;
  if (bio.block) {
    return (
      <p className="mt-4 text-sm text-muted" role="status">
        {msg ?? t(bio.block === 'tooManyFailures' ? 'lock.bioTooMany' : 'lock.bioExpired')}
      </p>
    );
  }
  return (
    <div className="mt-4">
      <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy} onClick={() => run(bio.state)}>
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
