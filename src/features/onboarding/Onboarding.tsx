import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Languages,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Users,
  Sparkles,
  Sprout,
  MessagesSquare,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Field, TextInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/components/ui/cn';
import { Logo } from '@/components/Logo';
import { setPrefs, usePrefs, type Lang } from '@/lib/prefs';
import { changeLanguage } from '@/i18n';
import { setupVault } from '@/lib/vault';
import { passwordStrength } from '@/lib/crypto';
import { haptic } from '@/lib/platform';
import type { Space } from '@/domain/types';

type Step = 'language' | 'password' | 'modules' | 'mode';

export function Onboarding({ hasVault, onDone }: { hasVault: boolean; onDone: () => void }) {
  const { t } = useTranslation('onboarding');
  const prefs = usePrefs();
  // freeze the step list: creating the vault mid-flow must not change it
  const [steps] = useState<Step[]>(() =>
    hasVault ? ['language', 'modules', 'mode'] : ['language', 'password', 'modules', 'mode'],
  );
  const [i, setI] = useState(0);
  const step = steps[i]!;
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = passwordStrength(pw);

  const next = () => setI((x) => Math.min(steps.length - 1, x + 1));
  const prev = () => setI((x) => Math.max(0, x - 1));

  const pickLang = async (lang: Lang) => {
    await setPrefs({ lang });
    await changeLanguage(lang, prefs.term);
  };

  const createPassword = async () => {
    setError(null);
    if (pw.length < 6) return setError(t('password.tooShort'));
    if (pw !== pw2) return setError(t('password.mismatch'));
    if (!ack) return setError(t('password.ackRequired'));
    setBusy(true);
    try {
      await setupVault(pw);
      onDone();
      void haptic('success');
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (mode: Space) => {
    await setPrefs({ mode, onboarded: true });
  };

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-gradient-to-b from-primary-soft/60 to-bg">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-8 pb-6">
        <div className="mb-6 flex items-center justify-between">
          <Logo className="size-11" />
          <div className="flex gap-1.5" aria-label={t('progress', { step: i + 1, total: steps.length })} role="img">
            {steps.map((s, j) => (
              <span key={s} className={cn('h-1.5 rounded-full transition-all', j === i ? 'w-8 bg-primary' : 'w-3 bg-line')} />
            ))}
          </div>
        </div>

        <section key={step} className="step-in flex flex-1 flex-col" aria-labelledby="ob-title">
          {step === 'language' && (
            <>
              <Languages className="mb-4 size-9 text-primary" aria-hidden />
              <h1 id="ob-title" className="text-3xl font-semibold">
                {t('welcome.title')}
              </h1>
              <p className="mt-3 text-muted">{t('welcome.text')}</p>
              <div className="mt-8 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('language')}>
                {(['pl', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={prefs.lang === l}
                    onClick={() => void pickLang(l)}
                    className={cn(
                      'min-h-20 rounded-2xl border-2 px-4 text-left transition',
                      prefs.lang === l ? 'border-primary bg-surface shadow' : 'border-line bg-surface/60',
                    )}
                  >
                    <div className="text-2xl" aria-hidden>
                      {l === 'pl' ? '🇵🇱' : '🇬🇧'}
                    </div>
                    <div className="font-semibold">{l === 'pl' ? 'Polski' : 'English'}</div>
                  </button>
                ))}
              </div>
              <Notice className="mt-8" icon={<WifiOff aria-hidden />}>
                {t('welcome.offline')}
              </Notice>
            </>
          )}

          {step === 'password' && (
            <>
              <KeyRound className="mb-4 size-9 text-primary" aria-hidden />
              <h1 id="ob-title" className="text-3xl font-semibold">
                {t('password.title')}
              </h1>
              <p className="mt-3 text-muted">{t('password.text')}</p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createPassword();
                }}
              >
                <Field label={t('password.label')} htmlFor="pw" hint={t('password.hint')}>
                  <TextInput
                    id="pw"
                    type="password"
                    autoComplete="new-password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                </Field>
                <div className="flex gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      key={n}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        strength >= n ? (strength <= 1 ? 'bg-danger' : strength <= 2 ? 'bg-warn' : 'bg-ok') : 'bg-line',
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted" aria-live="polite">
                  {t(`password.strength${strength}`)}
                </p>
                <Field label={t('password.repeat')} htmlFor="pw2">
                  <TextInput
                    id="pw2"
                    type="password"
                    autoComplete="new-password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                  />
                </Field>
                <Notice tone="warn" icon={<ShieldAlert aria-hidden />}>
                  <strong>{t('password.lossTitle')}</strong> {t('password.lossText')}
                </Notice>
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    className="mt-0.5 size-5 accent-[var(--primary)]"
                  />
                  <span>{t('password.ack')}</span>
                </label>
                {error && (
                  <p className="text-sm font-medium text-danger" role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" hidden />
              </form>
            </>
          )}

          {step === 'modules' && (
            <>
              <h1 id="ob-title" className="text-3xl font-semibold">
                {t('modules.title')}
              </h1>
              <p className="mt-3 text-muted">{t('modules.text')}</p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: Users, k: 'clients' },
                  { icon: Sparkles, k: 'tools' },
                  { icon: Sprout, k: 'prevention' },
                  { icon: MessagesSquare, k: 'simulator' },
                  { icon: GraduationCap, k: 'learn' },
                ].map(({ icon: Icon, k }) => (
                  <li key={k} className="flex gap-3 rounded-2xl bg-surface p-3 shadow-sm">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold">{t(`modules.${k}.title`)}</span>
                      <span className="block text-sm text-muted">{t(`modules.${k}.text`)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Notice className="mt-5" tone="accent">
                {t('modules.disclaimer')}
              </Notice>
            </>
          )}

          {step === 'mode' && (
            <>
              <h1 id="ob-title" className="text-3xl font-semibold">
                {t('mode.title')}
              </h1>
              <p className="mt-3 text-muted">{t('mode.text')}</p>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => void finish('demo')}
                  className="w-full rounded-2xl border-2 border-accent/40 bg-surface p-4 text-left shadow-sm transition hover:border-accent"
                >
                  <GraduationCap className="mb-2 size-7 text-accent" aria-hidden />
                  <div className="font-serif text-lg font-semibold">{t('mode.demo')}</div>
                  <div className="text-sm text-muted">{t('mode.demoText')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => void finish('practice')}
                  className="w-full rounded-2xl border-2 border-line bg-surface p-4 text-left shadow-sm transition hover:border-primary"
                >
                  <Briefcase className="mb-2 size-7 text-primary" aria-hidden />
                  <div className="font-serif text-lg font-semibold">{t('mode.practice')}</div>
                  <div className="text-sm text-muted">{t('mode.practiceText')}</div>
                </button>
              </div>
              <p className="mt-4 text-xs text-muted">{t('mode.changeLater')}</p>
            </>
          )}
        </section>

        {step !== 'mode' && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {i > 0 && step !== 'modules' && (
              <Button variant="ghost" onClick={prev} icon={<ArrowLeft className="size-4" />}>
                {t('common:back')}
              </Button>
            )}
            <div className="flex-1" />
            {step === 'password' ? (
              <Button size="lg" onClick={() => void createPassword()} disabled={busy}>
                {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
                {busy ? t('password.creating') : t('password.create')}
              </Button>
            ) : (
              <Button size="lg" onClick={next} icon={<ArrowRight className="size-5" />}>
                {t('common:next')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
