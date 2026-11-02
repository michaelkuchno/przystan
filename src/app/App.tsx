import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentProvider } from '@/content/ContentProvider';
import { hasVault } from '@/lib/vault';
import { usePrefs } from '@/lib/prefs';
import { useAutoLock, useUnlocked, useLockEpoch, openSpace } from './session';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { LockScreen } from '@/features/onboarding/LockScreen';
import { UpdatePrompt } from './UpdatePrompt';
import { Logo } from '@/components/Logo';

const AuthedApp = lazy(() => import('./AuthedApp'));

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <Logo className="size-16 animate-pulse" />
    </div>
  );
}

type Phase = 'loading' | 'onboarding' | 'locked' | 'opening' | 'ready';

function Gate() {
  const unlocked = useUnlocked();
  const prefs = usePrefs();
  const [vault, setVault] = useState<boolean | null>(null);
  const epoch = useLockEpoch();
  const sessionKey = `${epoch}|${prefs.mode}|${prefs.lang}`;
  const [openedKey, setOpenedKey] = useState<string | null>(null);
  const opened = openedKey === sessionKey;
  const { shielded } = useAutoLock();
  const { t } = useTranslation();

  useEffect(() => {
    void hasVault().then(setVault);
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked || !prefs.onboarded) return;
    let alive = true;
    void openSpace(prefs.mode).then(() => {
      if (alive) setOpenedKey(sessionKey);
    });
    return () => {
      alive = false;
    };
  }, [unlocked, prefs.mode, prefs.onboarded, sessionKey]);

  // warm up the main chunk while the user types the password
  useEffect(() => {
    if (vault) void import('./AuthedApp');
  }, [vault]);

  const phase: Phase =
    vault === null
      ? 'loading'
      : !vault
        ? 'onboarding'
        : !unlocked
          ? 'locked'
          : !prefs.onboarded
            ? 'onboarding'
            : !opened
              ? 'opening'
              : 'ready';

  const shield = shielded && (
    <div className="privacy-shield" aria-hidden>
      <Logo className="size-16" />
      <span className="sr-only">{t('locked')}</span>
    </div>
  );

  if (phase === 'ready')
    return (
      <Suspense fallback={<Splash />}>
        <AuthedApp overlay={shield} />
      </Suspense>
    );
  return (
    <>
      {phase === 'onboarding' && <Onboarding hasVault={!!vault} onDone={() => setVault(true)} />}
      {phase === 'locked' && <LockScreen />}
      {(phase === 'loading' || phase === 'opening') && <Splash />}
      {shield}
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <ContentProvider>
        <Gate />
        <UpdatePrompt />
      </ContentProvider>
    </HashRouter>
  );
}
