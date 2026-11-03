import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/core';
import { Field, Switch, TextInput } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { WrongPasswordError } from '@/lib/crypto';
import { BioError, bioSupport, disableBiometric, enableBiometric, readBio, type BioState } from '@/lib/biometric';

/** Settings → Security: optional biometric unlock. Hidden when the device cannot do it safely. */
export function BiometricSetting() {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const [kind, setKind] = useState<BioState['kind'] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  if (!kind) return null;

  const texts = { title: t('bio.promptTitle'), subtitle: t('bio.promptEnable'), cancel: t('common:cancel') };

  const enable = async () => {
    setBusy(true);
    setErr(null);
    try {
      await enableBiometric(pw, texts);
      setEnabled(true);
      setOpen(false);
      setPw('');
      toast({ text: t('bio.enabled'), tone: 'ok' });
    } catch (e) {
      if (e instanceof WrongPasswordError) setErr(t('password.wrong'));
      else if (e instanceof BioError && e.code === 'cancelled') setErr(null);
      else if (e instanceof BioError && e.code === 'unsupported') setErr(t('bio.unsupported'));
      else setErr(t('bio.error'));
    } finally {
      setBusy(false);
    }
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
        onOpenChange={setOpen}
        title={t('bio.enableTitle')}
        description={t('bio.enableText')}
        footer={
          <Button disabled={busy || !pw} onClick={() => void enable()} icon={<Fingerprint className="size-4" />}>
            {t('bio.enable')}
          </Button>
        }
      >
        <Field label={t('password.old')} error={err ?? undefined} htmlFor="bio-password">
          <TextInput
            id="bio-password"
            type="password"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && pw && void enable()}
          />
        </Field>
      </Sheet>
    </>
  );
}
