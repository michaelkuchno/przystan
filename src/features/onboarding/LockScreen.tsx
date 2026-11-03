import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, LockKeyhole, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { TextInput } from '@/components/ui/form';
import { Logo } from '@/components/Logo';
import { Sheet } from '@/components/ui/overlay';
import { CrisisList } from '@/features/settings/CrisisList';
import { RequireContent } from '@/content/ContentProvider';
import { Skeleton } from '@/components/ui/core';
import { unlock } from '@/lib/vault';
import { WrongPasswordError } from '@/lib/crypto';
import { haptic } from '@/lib/platform';
import { notePasswordUnlock } from '@/lib/biometric';
import { BiometricUnlock } from './BiometricUnlock';

export function LockScreen() {
  const { t } = useTranslation();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = async () => {
    if (!pw) return;
    setBusy(true);
    setError(false);
    try {
      await unlock(pw);
      void notePasswordUnlock();
      void haptic('success');
    } catch (e) {
      if (e instanceof WrongPasswordError) {
        setError(true);
        setPw('');
        void haptic('warning');
        setShake((n) => n + 1);
        ref.current?.focus();
      } else throw e;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-soft/50 to-bg px-6">
      <form
        className={`w-full max-w-sm text-center ${shake ? 'shake' : ''}`}
        onAnimationEnd={() => setShake(0)}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Logo className="mx-auto size-16" />
        <h1 className="mt-5 text-3xl font-semibold">{t('appName')}</h1>
        <p className="mt-2 text-muted">{t('lock.text')}</p>
        <label htmlFor="unlock" className="sr-only">
          {t('lock.password')}
        </label>
        <TextInput
          ref={ref}
          id="unlock"
          type="password"
          autoComplete="current-password"
          className="mt-6 text-center text-lg"
          placeholder={t('lock.password')}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          aria-invalid={error}
          aria-describedby={error ? 'unlock-err' : undefined}
        />
        {error && (
          <p id="unlock-err" className="mt-2 text-sm font-medium text-danger" role="alert">
            {t('lock.wrong')}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy || !pw}>
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <LockKeyhole className="size-5" aria-hidden />}
          {t('lock.unlock')}
        </Button>
        <BiometricUnlock />
        <p className="mt-6 text-xs text-muted">{t('lock.forgot')}</p>
      </form>
      <button
        type="button"
        className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-soft-fg"
        onClick={() => setCrisis(true)}
      >
        <LifeBuoy className="size-4" aria-hidden />
        {t('nav.crisis')}
      </button>
      <Sheet open={crisis} onOpenChange={setCrisis} title={t('nav.crisis')}>
        <RequireContent fallback={<Skeleton className="h-40" />}>
          <CrisisList />
        </RequireContent>
      </Sheet>
    </div>
  );
}
