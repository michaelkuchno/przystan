import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Badge, Button, Card, EmptyState, IconButton } from '@/components/ui/core';
import { Field, Select, TextArea, TextInput } from '@/components/ui/form';
import { Sheet, Tabs } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { all, remove, save, uid, useStore } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { CONTACT_ROLES, type Contact } from '@/domain/types';
import { Composer } from './Composer';

function History() {
  const { t } = useTranslation('messages');
  const messages = useStore(() => all('message'));
  const clients = useStore(() => all('client'));
  const nav = useNavigate();
  const list = [...messages].sort((a, b) => (b.sentAt ?? b.updatedAt).localeCompare(a.sentAt ?? a.updatedAt));
  if (!list.length) return <EmptyState title={t('history.empty')} />;
  return (
    <ul className="space-y-2" data-testid="message-history">
      {list.map((m) => (
        <li key={m.id}>
          <Card className="space-y-1 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {m.channel === 'email' ? (
                <Mail className="size-4 text-primary" aria-hidden />
              ) : (
                <MessageSquare className="size-4 text-primary" aria-hidden />
              )}
              <Badge tone={m.status === 'sent' ? 'ok' : 'warn'}>{t(`history.${m.status}`)}</Badge>
              <span className="text-muted">
                {fmtDate(m.sentAt ?? m.updatedAt)}
                {m.via ? ` · ${t(`history.via.${m.via}`)}` : ''}
              </span>
              {m.clientId && <Badge>{clients.find((c) => c.id === m.clientId)?.code}</Badge>}
            </div>
            <div className="font-medium [overflow-wrap:anywhere]">
              {m.toName || m.to} {m.subject && `· ${m.subject}`}
            </div>
            <p className="line-clamp-2 text-sm text-muted">{m.body}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => nav(`/messages/new?id=${m.id}${m.status === 'sent' ? '&again=1' : ''}`)}
              >
                {m.status === 'sent' ? t('history.duplicate') : t('history.open')}
              </Button>
              <IconButton label={t('history.delete')} onClick={() => void remove('message', m.id)}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

const emptyContact = (): Contact => ({
  id: uid(),
  name: '',
  role: 'other',
  email: '',
  phone: '',
  org: '',
  notes: '',
  updatedAt: '',
});

function Contacts() {
  const { t } = useTranslation('messages');
  const contacts = useStore(() => all('contact'));
  const clients = useStore(() => all('client'));
  const toast = useToast();
  const [edit, setEdit] = useState<Contact | null>(null);
  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEdit(emptyContact())}>
          {t('contacts.add')}
        </Button>
      </div>
      <Notice>{t('contacts.privacy')}</Notice>
      {!sorted.length ? (
        <EmptyState title={t('contacts.empty')} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" data-testid="contacts">
          {sorted.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1 basis-48">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-muted [overflow-wrap:anywhere]">
                  {t(`roles.${c.role}`)}
                  {c.org && ` · ${c.org}`}
                  {c.email && ` · ${c.email}`}
                  {c.phone && ` · ${c.phone}`}
                </div>
              </div>
              {c.email && (
                <Link
                  className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-primary"
                  to={`/messages/new?contact=${c.id}&channel=email`}
                >
                  <Mail className="size-4" aria-hidden /> {t('channel.email')}
                </Link>
              )}
              {c.phone && (
                <Link
                  className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-primary"
                  to={`/messages/new?contact=${c.id}&channel=sms`}
                >
                  <MessageSquare className="size-4" aria-hidden /> {t('channel.sms')}
                </Link>
              )}
              <IconButton label={t('contacts.edit')} onClick={() => setEdit(c)}>
                <Pencil className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <Sheet
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        title={t('contacts.edit')}
        footer={
          edit && (
            <>
              {contacts.some((c) => c.id === edit.id) && (
                <Button
                  variant="ghost"
                  className="mr-auto text-danger"
                  icon={<Trash2 className="size-4" aria-hidden />}
                  onClick={() =>
                    void remove('contact', edit.id).then(() => {
                      setEdit(null);
                      toast({ text: t('contacts.deleted'), tone: 'info' });
                    })
                  }
                >
                  {t('history.delete')}
                </Button>
              )}
              <Button
                disabled={!edit.name.trim()}
                onClick={() =>
                  void save('contact', { ...edit, updatedAt: new Date().toISOString() }).then(() => {
                    setEdit(null);
                    toast({ text: t('contacts.saved'), tone: 'ok' });
                  })
                }
              >
                {t('common:save')}
              </Button>
            </>
          )
        }
      >
        {edit && (
          <div className="space-y-3">
            <Field label={t('contacts.name')} htmlFor="c-name">
              <TextInput id="c-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label={t('contacts.role')} htmlFor="c-role">
              <Select
                id="c-role"
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as Contact['role'] })}
              >
                {CONTACT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('contacts.email')} htmlFor="c-email">
                <TextInput
                  id="c-email"
                  type="email"
                  inputMode="email"
                  value={edit.email}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                />
              </Field>
              <Field label={t('contacts.phone')} htmlFor="c-phone">
                <TextInput
                  id="c-phone"
                  type="tel"
                  inputMode="tel"
                  value={edit.phone}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('contacts.org')} htmlFor="c-org">
              <TextInput id="c-org" value={edit.org} onChange={(e) => setEdit({ ...edit, org: e.target.value })} />
            </Field>
            <Field label={t('contacts.client')} htmlFor="c-client">
              <Select
                id="c-client"
                value={edit.clientId ?? ''}
                onChange={(e) => setEdit({ ...edit, clientId: e.target.value || undefined })}
              >
                <option value="">{t('noClient')}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('contacts.notes')} htmlFor="c-notes">
              <TextArea id="c-notes" rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </Field>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default function Messages() {
  const { t } = useTranslation('messages');
  const { tab } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const value = tab === 'history' || tab === 'contacts' ? tab : 'new';
  return (
    <Page wide>
      <PageHeader back title={t('title')} subtitle={t('subtitle')} />
      <Tabs
        value={value}
        onChange={(v) => nav(`/messages/${v}`, { replace: true })}
        tabs={[
          { value: 'new', label: t('tabs.compose'), content: <Composer key={location.key} /> },
          { value: 'history', label: t('tabs.history'), content: <History /> },
          { value: 'contacts', label: t('tabs.contacts'), content: <Contacts /> },
        ]}
      />
    </Page>
  );
}
