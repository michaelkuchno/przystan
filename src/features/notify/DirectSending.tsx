/**
 * Settings → direct sending: e-mail from the user's own Gmail (Google sign-in), SMS directly from
 * this phone (Android) and the free SMS Gateway for Android. All optional; see docs/NOTIFICATIONS.md.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, MessageSquare, Send } from 'lucide-react';
import { Button, Card, SectionTitle } from '@/components/ui/core';
import { Field, TextInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { isNative } from '@/lib/platform';
import { saveSecrets, type CommsSecrets } from '@/lib/notify/secrets';
import { connectGoogle, connectedEmail, GmailError, sendGmail } from '@/lib/notify/gmail';
import { nativeSmsAvailable, sendNativeSms, SmsSendError } from '@/lib/notify/nativeSms';
import { sendViaSmsGate, smsGateReady } from '@/lib/notify/smsGateway';
import { logEvent } from '@/lib/audit';

export const GOOGLE_ORIGIN = 'https://michaelkuchno.github.io';
export const ANDROID_PACKAGE = 'pl.przystan.app';
export const ANDROID_SHA1 = '3A:1B:64:F6:AF:22:B3:6E:FA:03:13:27:94:50:C9:E0:DC:5A:AA:FA';

export function DirectSending({ s, setS }: { s: CommsSecrets; setS: (s: CommsSecrets) => void }) {
  const { t } = useTranslation('notify');
  const toast = useToast();
  const [phone, setPhone] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [email, setEmail] = useState(connectedEmail() ?? s.google?.email);
  const native = isNative();

  useEffect(() => {
    void nativeSmsAvailable().then(setPhone);
  }, []);

  const save = async (next: CommsSecrets) => {
    setS(next);
    await saveSecrets(next);
    void logEvent({
      action: 'notify.settings',
      details: {
        setting: 'direct',
        value:
          [next.google?.clientId ? 'gmail' : '', next.smsGate?.username ? 'smsGate' : ''].filter(Boolean).join(',') || 'none',
      },
    });
  };

  const connect = async () => {
    try {
      const tok = await connectGoogle(s.google?.clientId ?? '', s.google?.email);
      setEmail(tok.email);
      await save({ ...s, google: { clientId: s.google?.clientId ?? '', email: tok.email } });
      toast({ text: t('gmail.connected', { email: tok.email ?? 'Google' }), tone: 'ok' });
    } catch (e) {
      toast({
        text: t(`gmail.error.${e instanceof GmailError ? e.code : 'auth'}`, { msg: e instanceof Error ? e.message : String(e) }),
        tone: 'warn',
      });
    }
  };

  const testGmail = async () => {
    try {
      const tok = await connectGoogle(s.google?.clientId ?? '', s.google?.email);
      await sendGmail(tok, {
        to: tok.email ?? s.myEmail,
        subject: t('testEmailSubject'),
        body: t('gmail.testBody'),
        fromName: s.myName,
      });
      setEmail(tok.email);
      toast({ text: t('gmail.testOk', { email: tok.email }), tone: 'ok' });
    } catch (e) {
      toast({
        text: t(`gmail.error.${e instanceof GmailError ? e.code : 'send'}`, { msg: e instanceof Error ? e.message : String(e) }),
        tone: 'warn',
      });
    }
  };

  const testPhone = async () => {
    try {
      await sendNativeSms(testNumber, t('sms.testBody'));
      toast({ text: t('sms.testOk'), tone: 'ok' });
    } catch (e) {
      toast({
        text: t(`sms.error.${e instanceof SmsSendError ? e.code : 'FAILED'}`, {
          msg: e instanceof Error ? e.message : String(e),
        }),
        tone: 'warn',
      });
    }
  };

  const testGate = async () => {
    try {
      await sendViaSmsGate(s.smsGate!, testNumber, t('sms.testBody'));
      toast({ text: t('sms.testOk'), tone: 'ok' });
    } catch (e) {
      toast({ text: t('sms.gateFail', { msg: e instanceof Error ? e.message : String(e) }), tone: 'warn' });
    }
  };

  const gate = s.smsGate ?? { username: '', password: '' };
  return (
    <>
      <SectionTitle>{t('direct.title')}</SectionTitle>
      <Card className="space-y-3" data-testid="direct-gmail">
        <h3 className="font-sans text-base font-semibold">{t('gmail.title')}</h3>
        <p className="text-sm leading-relaxed">{t('gmail.lead')}</p>
        {!native && (
          <Field label={t('gmail.clientId')} htmlFor="g-client" hint={t('gmail.clientIdHint')}>
            <TextInput
              id="g-client"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              placeholder="1234567890-abc…apps.googleusercontent.com"
              value={s.google?.clientId ?? ''}
              onChange={(e) => setS({ ...s, google: { ...s.google, clientId: e.target.value } })}
              onBlur={() => void save(s)}
            />
          </Field>
        )}
        {email && <p className="text-sm font-medium text-ok">{t('gmail.as', { email })}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<LogIn className="size-4" aria-hidden />}
            disabled={!native && !s.google?.clientId?.trim()}
            onClick={() => void connect()}
          >
            {email ? t('gmail.reconnect') : t('gmail.connect')}
          </Button>
          <Button
            variant="secondary"
            icon={<Send className="size-4" aria-hidden />}
            disabled={!native && !s.google?.clientId?.trim()}
            onClick={() => void testGmail()}
          >
            {t('gmail.test')}
          </Button>
        </div>
        <details className="rounded-2xl bg-surface-2 p-3 text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-medium">{t('gmail.howTo')}</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed [overflow-wrap:anywhere]">
            {(
              t('gmail.steps', {
                returnObjects: true,
                origin: GOOGLE_ORIGIN,
                pkg: ANDROID_PACKAGE,
                sha1: ANDROID_SHA1,
              }) as string[]
            ).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">{t('gmail.privacy')}</p>
        </details>
      </Card>

      <Card className="space-y-3" data-testid="direct-sms">
        <h3 className="font-sans text-base font-semibold">{t('sms.title')}</h3>
        <p className="text-sm leading-relaxed">{native ? (phone ? t('sms.phoneOn') : t('sms.phoneNoSim')) : t('sms.phoneWeb')}</p>
        <Field label={t('sms.testNumber')} htmlFor="sms-test">
          <TextInput
            id="sms-test"
            type="tel"
            inputMode="tel"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
          />
        </Field>
        {phone && (
          <Button
            variant="secondary"
            icon={<MessageSquare className="size-4" aria-hidden />}
            disabled={testNumber.trim().length < 6}
            onClick={() => void testPhone()}
          >
            {t('sms.testPhone')}
          </Button>
        )}
        <h4 className="pt-2 text-sm font-semibold">{t('sms.gateTitle')}</h4>
        <p className="text-sm leading-relaxed">{t('sms.gateLead')}</p>
        {!native && <Notice tone="warn">{t('sms.gateWeb')}</Notice>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('sms.gateUser')} htmlFor="gate-user">
            <TextInput
              id="gate-user"
              autoComplete="off"
              value={gate.username}
              onChange={(e) => setS({ ...s, smsGate: { ...gate, username: e.target.value } })}
              onBlur={() => void save(s)}
            />
          </Field>
          <Field label={t('sms.gatePassword')} htmlFor="gate-pass">
            <TextInput
              id="gate-pass"
              type="password"
              autoComplete="off"
              value={gate.password}
              onChange={(e) => setS({ ...s, smsGate: { ...gate, password: e.target.value } })}
              onBlur={() => void save(s)}
            />
          </Field>
        </div>
        {native && (
          <Button
            variant="secondary"
            icon={<MessageSquare className="size-4" aria-hidden />}
            disabled={!smsGateReady(gate) || testNumber.trim().length < 6}
            onClick={() => void testGate()}
          >
            {t('sms.testGate')}
          </Button>
        )}
        <details className="rounded-2xl bg-surface-2 p-3 text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-medium">{t('sms.gateHowTo')}</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            {(t('sms.gateSteps', { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </details>
      </Card>
    </>
  );
}
