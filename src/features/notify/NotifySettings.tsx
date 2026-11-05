import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, CalendarPlus, Mail, Send } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, SectionTitle, buttonClass } from '@/components/ui/core';
import { Field, Select, Switch, TextInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { getPrefs, setPrefs, usePrefs } from '@/lib/prefs';
import { isNative } from '@/lib/platform';
import { logEvent } from '@/lib/audit';
import { NOTIFY_RULES, type NotifyPrefs } from '@/lib/notify/settings';
import { emailJsReady, emptySecrets, loadSecrets, saveSecrets, signature, type CommsSecrets } from '@/lib/notify/secrets';
import {
  exactAlarms,
  openExactAlarmSettings,
  permission,
  requestPermission,
  showNow,
  type Permission,
} from '@/lib/notify/system';
import { sendEmailJs } from '@/lib/notify/emailjs';
import { mailtoUrl } from '@/lib/notify/links';
import { exportCalendar } from '@/lib/notify/calendar';
import { runNotifications, todaysDigest } from '@/lib/notify/engine';
import type { Digest } from '@/lib/notify/text';

const setNotify = (patch: Partial<NotifyPrefs>) => setPrefs({ notify: { ...getPrefs().notify, ...patch } });

export default function NotifySettings() {
  const { t } = useTranslation('notify');
  const { notify } = usePrefs();
  const toast = useToast();
  const [perm, setPerm] = useState<Permission>('prompt');
  const [exact, setExact] = useState<boolean | null>(null);
  const [s, setS] = useState<CommsSecrets>(emptySecrets());
  const [digest, setDigest] = useState<Digest | null>(null);
  const rulesKey = JSON.stringify(notify.rules);

  useEffect(() => {
    void permission()
      .then(setPerm)
      .catch(() => setPerm('unsupported'));
    void exactAlarms().then(setExact);
    void loadSecrets().then(setS);
  }, []);

  // re-plan reminders after every change of the settings
  useEffect(() => {
    void runNotifications(t).then((r) => r.scheduled && toast({ text: t('scheduled', { count: r.scheduled }), tone: 'info' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the settings change
  }, [
    notify.enabled,
    notify.channels.system,
    notify.meetingLeadMin,
    notify.meetingDayBefore,
    notify.digestTime,
    notify.privacy,
    rulesKey,
  ]);

  const persist = async () => {
    await saveSecrets(s);
    toast({ text: t('saved'), tone: 'ok' });
    void logEvent({
      action: 'notify.settings',
      details: { setting: 'notify.secrets', value: emailJsReady(s) ? 'emailjs' : 'basic' },
    });
  };

  const testEmail = async () => {
    try {
      await saveSecrets(s);
      await sendEmailJs(s.emailjs!, {
        to_email: s.myEmail,
        to_name: s.myName,
        subject: t('testEmailSubject'),
        message: t('testEmailBody'),
        from_name: 'Przystań',
      });
      toast({ text: t('testEmailOk'), tone: 'ok' });
    } catch (e) {
      toast({ text: t('testEmailFail', { msg: e instanceof Error ? e.message : String(e) }), tone: 'warn' });
    }
  };

  const ej = s.emailjs ?? { serviceId: '', templateId: '', publicKey: '' };
  const steps = t('emailjsSteps', {
    returnObjects: true,
    to_email: '{{to_email}}',
    subject: '{{subject}}',
    message: '{{message}}',
    from_name: '{{from_name}}',
    reply_to: '{{reply_to}}',
  }) as string[];

  return (
    <Page>
      <PageHeader back="/settings" title={t('title')} subtitle={t('subtitle')} />
      <div className="space-y-4">
        <Card>
          <Switch
            label={t('enabled')}
            description={t('enabledText')}
            checked={notify.enabled}
            onChange={(v) => void setNotify({ enabled: v })}
          />
        </Card>

        {notify.enabled && (
          <>
            <SectionTitle>{t('channels')}</SectionTitle>
            <Card className="space-y-4">
              <Switch
                label={t('system')}
                description={isNative() ? t('systemAndroid') : t('systemWeb')}
                checked={notify.channels.system}
                onChange={(v) => void setNotify({ channels: { ...notify.channels, system: v } })}
              />
              <p className="text-sm text-muted" data-testid="notify-permission">
                {t(`permission.${perm}`)}
              </p>
              <div className="flex flex-wrap gap-2">
                {perm === 'prompt' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<BellRing className="size-4" aria-hidden />}
                    onClick={() => void requestPermission().then(setPerm)}
                  >
                    {t('allow')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void showNow(t('testTitle'), t('testBody'), 'test').then(
                      (ok) => !ok && toast({ text: t('testFailed'), tone: 'warn' }),
                    )
                  }
                >
                  {t('testNotification')}
                </Button>
              </div>
              {exact !== null && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">{t('exact')}:</span> {exact ? t('exactOn') : t('exactOff')}
                    <span className="block text-xs text-muted">{t('exactText')}</span>
                  </span>
                  {!exact && (
                    <Button size="sm" variant="ghost" onClick={() => void openExactAlarmSettings()}>
                      {t('exactOff')}
                    </Button>
                  )}
                </div>
              )}
              <Switch
                label={t('email')}
                description={emailJsReady(s) && s.myEmail ? t('emailText') : t('emailNeedsSetup')}
                checked={notify.channels.email}
                onChange={(v) => void setNotify({ channels: { ...notify.channels, email: v } })}
              />
            </Card>

            <SectionTitle>{t('what')}</SectionTitle>
            <Card className="space-y-3">
              {NOTIFY_RULES.map((r) => (
                <Switch
                  key={r}
                  label={t(`rules.${r}`)}
                  checked={notify.rules[r]}
                  onChange={(v) => void setNotify({ rules: { ...notify.rules, [r]: v } })}
                />
              ))}
              <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                <Field label={t('leadMin')} htmlFor="n-lead">
                  <Select
                    id="n-lead"
                    value={String(notify.meetingLeadMin)}
                    onChange={(e) => void setNotify({ meetingLeadMin: Number(e.target.value) })}
                  >
                    {[0, 15, 30, 60, 120, 240].map((m) => (
                      <option key={m} value={m}>
                        {m ? t('leadOption', { min: m }) : t('leadNone')}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('digestTime')} htmlFor="n-digest">
                  <TextInput
                    id="n-digest"
                    type="time"
                    value={notify.digestTime}
                    onChange={(e) => e.target.value && void setNotify({ digestTime: e.target.value })}
                  />
                </Field>
              </div>
              <Switch
                label={t('dayBefore')}
                checked={notify.meetingDayBefore}
                onChange={(v) => void setNotify({ meetingDayBefore: v })}
              />
            </Card>

            <SectionTitle>{t('privacy')}</SectionTitle>
            <Card className="space-y-2" role="radiogroup" aria-label={t('privacy')}>
              {(['hidden', 'codes'] as const).map((p) => (
                <label key={p} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-surface-2">
                  <input
                    type="radio"
                    name="notify-privacy"
                    className="mt-1 size-5 accent-[var(--color-primary)]"
                    checked={notify.privacy === p}
                    onChange={() => void setNotify({ privacy: p })}
                  />
                  <span>
                    <span className="block font-medium">{t(p === 'hidden' ? 'privacyHidden' : 'privacyCodes')}</span>
                    <span className="block text-sm text-muted">
                      {t(p === 'hidden' ? 'privacyHiddenText' : 'privacyCodesText')}
                    </span>
                  </span>
                </label>
              ))}
            </Card>
          </>
        )}

        <SectionTitle>{t('calendar')}</SectionTitle>
        <Card className="space-y-3">
          <p className="text-sm leading-relaxed">{t('calendarText')}</p>
          <Button
            variant="secondary"
            icon={<CalendarPlus className="size-4" aria-hidden />}
            onClick={() =>
              void exportCalendar(t).then((n) =>
                toast({ text: n ? t('calendarDone', { count: n }) : t('calendarEmpty'), tone: n ? 'ok' : 'info' }),
              )
            }
          >
            {t('calendarExport')}
          </Button>
        </Card>

        <SectionTitle>{t('me')}</SectionTitle>
        <Card className="space-y-3">
          <p className="text-sm text-muted">{t('meText')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('myName')} htmlFor="n-name">
              <TextInput id="n-name" value={s.myName} onChange={(e) => setS({ ...s, myName: e.target.value })} />
            </Field>
            <Field label={t('myRole')} htmlFor="n-role">
              <TextInput id="n-role" value={s.myRole} onChange={(e) => setS({ ...s, myRole: e.target.value })} />
            </Field>
            <Field label={t('myContact')} htmlFor="n-contact">
              <TextInput id="n-contact" value={s.myContact} onChange={(e) => setS({ ...s, myContact: e.target.value })} />
            </Field>
            <Field label={t('myEmail')} htmlFor="n-email">
              <TextInput
                id="n-email"
                type="email"
                inputMode="email"
                value={s.myEmail}
                onChange={(e) => setS({ ...s, myEmail: e.target.value })}
              />
            </Field>
          </div>
          <Button onClick={() => void persist()}>{t('save')}</Button>
        </Card>

        <SectionTitle>{t('emailjs')}</SectionTitle>
        <Card className="space-y-3">
          <p className="text-sm leading-relaxed">{t('emailjsLead')}</p>
          <details className="rounded-2xl bg-surface-2 p-3 text-sm">
            <summary className="min-h-11 cursor-pointer content-center font-medium">{t('emailjsHow')}</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
              {steps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </details>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['serviceId', 'templateId', 'publicKey', 'privateKey'] as const).map((k) => (
              <Field key={k} label={t(k)} htmlFor={`n-${k}`}>
                <TextInput
                  id={`n-${k}`}
                  type={k === 'privateKey' ? 'password' : 'text'}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  value={ej[k] ?? ''}
                  onChange={(e) => setS({ ...s, emailjs: { ...ej, [k]: e.target.value } })}
                />
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void persist()}>{t('save')}</Button>
            <Button
              variant="secondary"
              icon={<Send className="size-4" aria-hidden />}
              disabled={!emailJsReady(s) || !s.myEmail.includes('@')}
              onClick={() => void testEmail()}
            >
              {t('testEmail')}
            </Button>
          </div>
        </Card>

        <SectionTitle>{t('test')}</SectionTitle>
        <Card className="space-y-3">
          <Button
            variant="secondary"
            onClick={() => setDigest(digest ? null : todaysDigest(t, Date.now(), signature(s)))}
            aria-expanded={!!digest}
          >
            {t('preview')}
          </Button>
          {digest && (
            <div className="space-y-2">
              <pre
                className="rounded-2xl border border-line bg-surface-2 p-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]"
                data-testid="digest-preview"
              >
                {digest.text}
              </pre>
              {s.myEmail.includes('@') && (
                <a className={buttonClass('secondary', 'sm')} href={mailtoUrl(s.myEmail, digest.subject, digest.text)}>
                  <Mail className="size-4" aria-hidden /> {t('previewSend')}
                </a>
              )}
            </div>
          )}
          <Notice>{t('info')}</Notice>
        </Card>
      </div>
    </Page>
  );
}
