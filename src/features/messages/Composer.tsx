import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { i18n as I18n } from 'i18next';
import { Copy, Mail, MessageSquare, Save, Send, Share2 } from 'lucide-react';
import { Button, Card, buttonClass } from '@/components/ui/core';
import { Chips, Field, Select, TextArea, TextInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { all, get, useStore } from '@/lib/store';
import { locale } from '@/lib/format';
import { mailtoUrl, smsUrl, smsSegments, looksLikeEmail, looksLikePhone, MAILTO_SAFE_LENGTH } from '@/lib/notify/links';
import { emailJsReady, loadSecrets, saveSecrets, signature, emptySecrets, type CommsSecrets } from '@/lib/notify/secrets';
import { sendEmailJs } from '@/lib/notify/emailjs';
import { connectGoogle, GmailError, sendGmail } from '@/lib/notify/gmail';
import { nativeSmsAvailable, openSmsSettings, sendNativeSms, SmsSendError } from '@/lib/notify/nativeSms';
import { sendViaSmsGate, smsGateReady, smsGateUsable } from '@/lib/notify/smsGateway';
import { isNative } from '@/lib/platform';
import { useConfirm } from '@/components/ui/overlay';
import { renderTemplate, templateVars, templates, type TemplateId } from '@/lib/notify/templates';
import type { Contact, ContactRole, Message, MessageChannel } from '@/domain/types';
import { hasCrisisSignal } from '@/lib/ai/crisis';
import { CrisisBox } from '@/features/ai/AiOutput';
import { MessageAi } from './MessageAi';
import { recordSent, saveDraft, shareText } from './send';

type Draft = Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; createdAt?: string };

interface Prefill {
  subject?: string;
  body?: string;
  channel?: MessageChannel;
}

/** Fills a template for the current draft (recipient, meeting, signature). */
function applyTemplate(
  d: Draft,
  id: TemplateId | '',
  ctx: { meetingId?: string; myName: string; sig: string; program?: string; i18n: I18n },
): Draft {
  const tpl = id ? templates(ctx.i18n).find((x) => x.id === id) : undefined;
  if (!tpl) return { ...d, templateId: undefined };
  const vars = templateVars({
    locale: locale(),
    placeholder: (k) => ctx.i18n.t(`messages:placeholders.${k}`),
    meeting: get('meeting', ctx.meetingId ?? d.meetingId),
    recipientName: d.toName,
    myName: ctx.myName,
    signature: ctx.sig,
    program: ctx.program,
  });
  const channel = d.channel === 'sms' && !tpl.sms ? 'email' : d.channel;
  return {
    ...d,
    templateId: tpl.id,
    channel,
    subject: renderTemplate(tpl.subject, vars),
    body: renderTemplate(channel === 'sms' && tpl.sms ? tpl.sms : tpl.body, vars),
  };
}

/** The draft as it starts: stored message, contact, meeting, template and prefill from the URL. */
function initialDraft(params: URLSearchParams, prefill: Prefill, i18n: I18n): Draft {
  const existing = get('message', params.get('id') ?? undefined);
  if (existing) {
    const { status: _s, updatedAt: _u, ...rest } = existing;
    return params.get('again') === '1'
      ? { ...rest, id: undefined, createdAt: undefined, sentAt: undefined, via: undefined }
      : rest;
  }
  const meetingId = params.get('meeting') ?? undefined;
  const contact = all('contact').find((c) => c.id === params.get('contact'));
  const channel = (params.get('channel') as MessageChannel) ?? prefill.channel ?? 'email';
  const d: Draft = {
    channel,
    to: params.get('to') ?? (contact ? (channel === 'sms' ? contact.phone : contact.email) : ''),
    toName: contact?.name ?? '',
    clientId: params.get('client') ?? get('meeting', meetingId)?.clientId ?? contact?.clientId,
    meetingId,
    contactId: contact?.id,
    subject: prefill.subject ?? '',
    body: prefill.body ?? '',
  };
  const tpl = params.get('template') as TemplateId | null;
  return tpl ? applyTemplate(d, tpl, { myName: '', sig: '', program: params.get('program') ?? undefined, i18n }) : d;
}

export function Composer() {
  const { t, i18n } = useTranslation('messages');
  const [params] = useSearchParams();
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const [phoneSms, setPhoneSms] = useState(false);
  const contacts = useStore(() => all('contact'));
  const clients = useStore(() => all('client'));
  const [secrets, setSecrets] = useState<CommsSecrets>(emptySecrets());
  const [m, setM] = useState<Draft>(() => initialDraft(params, (location.state ?? {}) as Prefill, i18n));
  const program = params.get('program') ?? undefined;

  useEffect(() => {
    void nativeSmsAvailable().then(setPhoneSms);
  }, []);

  useEffect(() => {
    void loadSecrets().then((s) => {
      setSecrets(s);
      // the template was filled before the signature was known
      const sig = signature(s);
      const ph = `[${t('placeholders.signature')}]`;
      if (sig) setM((x) => ({ ...x, body: x.body.split(ph).join(sig) }));
    });
  }, [t]);

  const client = clients.find((c) => c.id === m.clientId);
  const contact = contacts.find((c) => c.id === m.contactId);
  const sig = signature(secrets);
  const tpls = useMemo(() => templates(i18n), [i18n]);
  const ctx = { myName: secrets.myName, sig, program, i18n };
  const update = (d: Draft) => setM(d.templateId ? applyTemplate(d, d.templateId as TemplateId, ctx) : d);

  const pickContact = (id: string) => {
    const c: Contact | undefined = contacts.find((x) => x.id === id);
    update({
      ...m,
      contactId: c?.id,
      to: c ? (m.channel === 'sms' ? c.phone : c.email) : '',
      toName: c?.name ?? '',
      clientId: m.clientId ?? c?.clientId,
    });
  };

  const valid = m.channel === 'email' ? looksLikeEmail(m.to.split(/[;,]/)[0] ?? '') : looksLikePhone(m.to);
  const seg = smsSegments(m.body);
  const mailto = mailtoUrl(m.to, m.subject, m.body);
  const sms = smsUrl(m.to, m.body);
  const crisis = hasCrisisSignal(m.body, m.replyTo);

  const done = async (via: Parameters<typeof recordSent>[1]) => {
    const saved = await recordSent(m, via);
    setM((x) => ({ ...x, id: saved.id }));
  };

  const viaEmailJs = async () => {
    try {
      await sendEmailJs(secrets.emailjs!, {
        to_email: m.to.trim(),
        to_name: m.toName,
        subject: m.subject,
        message: m.body,
        from_name: secrets.myName || 'Przystań',
        reply_to: secrets.myEmail,
      });
      await done('emailjs');
      toast({ text: t('send.sentEmailJs'), tone: 'ok' });
    } catch (e) {
      toast({ text: t('send.failed', { msg: e instanceof Error ? e.message : String(e) }), tone: 'warn' });
    }
  };

  const gmailOn = isNative() || !!secrets.google?.clientId.trim();
  const viaGmail = async () => {
    if (!(await confirm({ title: t('send.confirmEmail', { to: m.to }), confirm: t('send.gmail') }))) return;
    try {
      // the token request must stay inside the click (Google opens a popup)
      const tok = await connectGoogle(secrets.google?.clientId ?? '', secrets.google?.email);
      await sendGmail(tok, { to: m.to.trim(), toName: m.toName, subject: m.subject, body: m.body, fromName: secrets.myName });
      if (tok.email && tok.email !== secrets.google?.email) {
        const next = { ...secrets, google: { clientId: secrets.google?.clientId ?? '', email: tok.email } };
        setSecrets(next);
        void saveSecrets(next);
      }
      await done('gmail');
      toast({ text: t('send.sentGmail', { from: tok.email ?? 'Gmail' }), tone: 'ok' });
    } catch (e) {
      toast({
        text: t(`send.gmailError.${e instanceof GmailError ? e.code : 'send'}`, {
          msg: e instanceof Error ? e.message : String(e),
        }),
        tone: 'warn',
      });
    }
  };

  const viaPhone = async () => {
    if (!(await confirm({ title: t('send.confirmSms', { to: m.to }), confirm: t('send.phone') }))) return;
    try {
      const r = await sendNativeSms(m.to, m.body);
      await done('phone');
      toast({ text: r.confirmed ? t('send.sentPhone') : t('send.sentPhoneUnconfirmed'), tone: 'ok' });
    } catch (e) {
      if (e instanceof SmsSendError && e.code === 'DENIED') {
        // Android 13+ blocks SMS for apps installed outside Google Play until allowed in App info
        if (
          await confirm({ title: t('send.phoneError.DENIED'), text: t('send.phoneDeniedHelp'), confirm: t('send.openSettings') })
        )
          void openSmsSettings();
        return;
      }
      toast({
        text: t(`send.phoneError.${e instanceof SmsSendError ? e.code : 'FAILED'}`, {
          msg: e instanceof Error ? e.message : String(e),
        }),
        tone: 'warn',
      });
    }
  };

  const viaGate = async () => {
    if (!(await confirm({ title: t('send.confirmSms', { to: m.to }), text: t('send.gateWarning'), confirm: t('send.smsGate') })))
      return;
    try {
      await sendViaSmsGate(secrets.smsGate!, m.to, m.body);
      await done('smsGate');
      toast({ text: t('send.sentGate'), tone: 'ok' });
    } catch (e) {
      toast({ text: t('send.failed', { msg: e instanceof Error ? e.message : String(e) }), tone: 'warn' });
    }
  };

  const role: ContactRole = contact?.role ?? (client ? 'client' : 'other');
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <Card className="space-y-4">
        <Chips
          label={t('channel.email') + ' / ' + t('channel.sms')}
          value={m.channel}
          onChange={(v) =>
            v[0] && update({ ...m, channel: v[0], to: contact ? (v[0] === 'sms' ? contact.phone : contact.email) : m.to })
          }
          options={(['email', 'sms'] as const).map((c) => ({ value: c, label: t(`channel.${c}`) }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('fromContacts')} htmlFor="msg-contact">
            <Select id="msg-contact" value={m.contactId ?? ''} onChange={(e) => pickContact(e.target.value)}>
              <option value="">{t('noContact')}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {t(`roles.${c.role}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('client')} htmlFor="msg-client">
            <Select
              id="msg-client"
              value={m.clientId ?? ''}
              onChange={(e) => setM((x) => ({ ...x, clientId: e.target.value || undefined }))}
            >
              <option value="">{t('noClient')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={m.channel === 'email' ? t('toEmail') : t('toPhone')}
            htmlFor="msg-to"
            error={m.to && !valid ? (m.channel === 'email' ? t('invalidEmail') : t('invalidPhone')) : undefined}
          >
            <TextInput
              id="msg-to"
              type={m.channel === 'email' ? 'email' : 'tel'}
              inputMode={m.channel === 'email' ? 'email' : 'tel'}
              value={m.to}
              onChange={(e) => setM((x) => ({ ...x, to: e.target.value }))}
            />
          </Field>
          <Field label={t('toName')} htmlFor="msg-toname">
            <TextInput
              id="msg-toname"
              value={m.toName}
              onChange={(e) => setM({ ...m, toName: e.target.value })}
              onBlur={() => m.templateId && update(m)}
            />
          </Field>
        </div>
        <Field label={t('template')} htmlFor="msg-template">
          <Select
            id="msg-template"
            value={m.templateId ?? ''}
            onChange={(e) => setM(applyTemplate(m, e.target.value as TemplateId, ctx))}
          >
            <option value="">{t('noTemplate')}</option>
            {tpls
              .filter((x) => m.channel === 'email' || x.sms)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
          </Select>
        </Field>
        {m.channel === 'email' && (
          <Field label={t('subject')} htmlFor="msg-subject">
            <TextInput id="msg-subject" value={m.subject} onChange={(e) => setM((x) => ({ ...x, subject: e.target.value }))} />
          </Field>
        )}
        <Field
          label={t('body')}
          htmlFor="msg-body"
          hint={
            m.channel === 'sms'
              ? `${t('smsCount', { chars: seg.chars, segments: seg.segments })}${seg.unicode ? ` ${t('smsUnicode')}` : ''}`
              : undefined
          }
        >
          <TextArea
            id="msg-body"
            rows={m.channel === 'sms' ? 4 : 12}
            value={m.body}
            onChange={(e) => setM((x) => ({ ...x, body: e.target.value }))}
          />
        </Field>
        {crisis && <CrisisBox />}
        {m.channel === 'email' && m.body.length + m.subject.length > MAILTO_SAFE_LENGTH && (
          <Notice tone="warn">{t('send.long')}</Notice>
        )}
        <div className="flex flex-wrap gap-2" data-testid="send-actions">
          {m.channel === 'email' && gmailOn && (
            <Button
              icon={<Send className="size-4" aria-hidden />}
              disabled={!valid || !m.body.trim()}
              onClick={() => void viaGmail()}
            >
              {secrets.google?.email ? t('send.gmailFrom', { from: secrets.google.email }) : t('send.gmail')}
            </Button>
          )}
          {m.channel === 'sms' && phoneSms && (
            <Button
              icon={<Send className="size-4" aria-hidden />}
              disabled={!valid || !m.body.trim()}
              onClick={() => void viaPhone()}
            >
              {t('send.phone')}
            </Button>
          )}
          {m.channel === 'sms' && smsGateUsable() && smsGateReady(secrets.smsGate) && (
            <Button
              variant="secondary"
              icon={<Send className="size-4" aria-hidden />}
              disabled={!valid || !m.body.trim()}
              onClick={() => void viaGate()}
            >
              {t('send.smsGate')}
            </Button>
          )}
          {m.channel === 'email' ? (
            <a
              href={valid && m.body.trim() ? mailto : undefined}
              aria-disabled={!valid || !m.body.trim()}
              className={buttonClass(
                gmailOn ? 'secondary' : 'primary',
                'md',
                !valid || !m.body.trim() ? 'pointer-events-none opacity-50' : '',
              )}
              onClick={() => void done('mailApp')}
            >
              <Mail className="size-4" aria-hidden /> {t('send.mailApp')}
            </a>
          ) : (
            <a
              href={valid && m.body.trim() ? sms : undefined}
              aria-disabled={!valid || !m.body.trim()}
              className={buttonClass(
                phoneSms ? 'secondary' : 'primary',
                'md',
                !valid || !m.body.trim() ? 'pointer-events-none opacity-50' : '',
              )}
              onClick={() => void done('smsApp')}
            >
              <MessageSquare className="size-4" aria-hidden /> {t('send.smsApp')}
            </a>
          )}
          {m.channel === 'email' && emailJsReady(secrets) && (
            <Button
              variant="secondary"
              icon={<Send className="size-4" aria-hidden />}
              disabled={!valid || !m.body.trim()}
              onClick={() => void viaEmailJs()}
            >
              {t('send.emailjs')}
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<Copy className="size-4" aria-hidden />}
            disabled={!m.body.trim()}
            onClick={() =>
              void navigator.clipboard
                ?.writeText(m.channel === 'email' && m.subject ? `${m.subject}\n\n${m.body}` : m.body)
                .then(() => done('copy'))
                .then(() => toast({ text: t('send.copied'), tone: 'ok' }))
            }
          >
            {t('send.copy')}
          </Button>
          <Button
            variant="secondary"
            icon={<Share2 className="size-4" aria-hidden />}
            disabled={!m.body.trim()}
            onClick={() =>
              void shareText(m.subject || t('title'), m.body).then((ok) => {
                if (ok) void done('share');
              })
            }
          >
            {t('send.share')}
          </Button>
          <Button
            variant="ghost"
            icon={<Save className="size-4" aria-hidden />}
            disabled={!m.body.trim()}
            onClick={() =>
              void saveDraft(m).then((s) => {
                setM((x) => ({ ...x, id: s.id }));
                toast({ text: t('send.savedDraft'), tone: 'ok' });
              })
            }
          >
            {t('send.draft')}
          </Button>
        </div>
        <p className="text-xs text-muted">{t('send.hint')}</p>
      </Card>
      <MessageAi
        channel={m.channel}
        draft={{ subject: m.subject, body: m.body }}
        client={client}
        recipientRole={role}
        recipientName={m.toName}
        signature={sig}
        onApply={(a) =>
          setM((x) => ({
            ...x,
            subject: a.subject ?? x.subject,
            body: a.body ?? x.body,
            replyTo: a.incoming ?? x.replyTo,
          }))
        }
      />
    </div>
  );
}
