import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Field, Switch, TextInput } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { WrongPasswordError } from '@/lib/crypto';
import {
  BioError,
  bioSupport,
  cancelEnable,
  continueEnable,
  disableBiometric,
  readBio,
  startEnable,
  type BioState,
  type EnableSession,
} from '@/lib/biometric';

/**
 * Settings → Security: optional biometric unlock. Hidden when the device cannot do it.
 * Enabling: 1) password (checked, unlocks a copy of the data key), 2) a separate tap that opens
 * the system prompt – Safari only allows Face ID / Touch ID directly from a tap.
 */
export function BiometricSetting() {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const [kind, setKind] = useState<BioState['kind'] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // step 2 / 3: password accepted, waiting for the tap that opens the prompt
  const [step, setStep] = useState<'password' | 'prompt' | 'confirm'>('password');
  const session = useRef<EnableSession | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const k = await bioSupport();
      const s = await readBio();
      if (!alive) return;
      setKind(k);
      setEnabled(!!s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // never keep the key copy in memory longer than needed
  useEffect(() => () => cancelEnable(session.current), []);

  if (!kind) return null;

  const texts = { title: t('bio.promptTitle'), subtitle: t('bio.promptEnable'), cancel: t('common:cancel') };

  const close = () => {
    cancelEnable(session.current);
    session.current = null;
    setOpen(false);
    setPw('');
    setStep('password');
    setErr(null);
  };

  const checkPassword = async () => {
    setBusy(true);
    setErr(null);
    try {
      session.current = await startEnable(pw);
      setPw('');
      setStep('prompt');
    } catch (e) {
      if (e instanceof WrongPasswordError) setErr(t('password.wrong'));
      else if (e instanceof BioError && e.code === 'unsupported') setErr(t('bio.unsupported'));
      else setErr(t('bio.error'));
    } finally {
      setBusy(false);
    }
  };

  // called directly from the button's onClick – the system prompt must open within the tap
  const runPrompt = () => {
    const sess = session.current;
    if (!sess) return;
    setBusy(true);
    setErr(null);
    continueEnable(sess, texts)
      .then((r) => {
        if (r === 'confirm') {
          setStep('confirm');
          return;
        }
        session.current = null;
        setEnabled(true);
        close();
        toast({ text: t('bio.enabled'), tone: 'ok' });
      })
      .catch((e: unknown) => {
        if (e instanceof BioError && e.code === 'cancelled') setErr(null);
        else if (e instanceof BioError && e.code === 'unsupported') {
          setErr(t('bio.unsupported'));
          cancelEnable(sess);
          session.current = null;
          setStep('password');
        } else setErr(t('bio.error'));
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Switch
        label={t(kind === 'android' ? 'bio.labelAndroid' : 'bio.labelPasskey')}
        description={t('bio.hint')}
        checked={enabled}
        onChange={(on) => {
          if (on) {
            setErr(null);
            setStep('password');
            setOpen(true);
          } else {
            void disableBiometric().then(() => {
              setEnabled(false);
              toast({ text: t('bio.disabled'), tone: 'info' });
            });
          }
        }}
      />
      <Sheet
        open={open}
        onOpenChange={(o) => !o && close()}
        title={t('bio.enableTitle')}
        description={step === 'password' ? t('bio.enableText') : step === 'prompt' ? t('bio.stepPrompt') : t('bio.stepConfirm')}
        footer={
          step === 'password' ? (
            <Button disabled={busy || !pw} onClick={() => void checkPassword()}>
              {t('common:next')}
            </Button>
          ) : (
            <Button disabled={busy} onClick={runPrompt} icon={<Fingerprint className="size-4" />}>
              {step === 'prompt' ? t('bio.enable') : t('bio.confirm')}
            </Button>
          )
        }
      >
        {step === 'password' ? (
          <Field label={t('password.old')} error={err ?? undefined} htmlFor="bio-password">
            <TextInput
              id="bio-password"
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && pw && void checkPassword()}
            />
          </Field>
        ) : (
          err && (
            <p className="text-sm font-medium text-danger" role="alert">
              {err}
            </p>
          )
        )}
      </Sheet>
    </>
  );
}
