import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  BellRing,
  Mail,
  Download,
  Upload,
  KeyRound,
  RefreshCcw,
  Trash2,
  Info,
  ShieldCheck,
  BookMarked,
  ChevronRight,
  Loader2,
  History,
  ArchiveRestore,
} from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Button, Card, SectionTitle } from '@/components/ui/core';
import { Chips, Field, TextInput, Switch } from '@/components/ui/form';
import { Sheet, useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { usePrefs, setPrefs, LANGS, COUNTRIES, type Country, type Lang, type Term, type Theme } from '@/lib/prefs';
import { LANG_META } from '@/lib/langs';
import { changeLanguage, setTerm } from '@/i18n';
import { changePassword, wipeAll } from '@/lib/vault';
import { BiometricSetting } from './BiometricSetting';
import { createBackup, restoreBackup, serializeBackup, BackupError } from '@/lib/backup';
import { exportFile, pickTextFile, todayIso } from '@/lib/platform';
import { WrongPasswordError } from '@/lib/crypto';
import { fmtDate } from '@/lib/format';
import { onLanguageChanged, openSpace, seedDemo, switchMode } from '@/app/session';
import { clearStore, storeVersion, useStore } from '@/lib/store';
import { logEvent } from '@/lib/audit';
import { listTrash } from '@/lib/history';

const APP_VERSION = __APP_VERSION__;

export default function Settings() {
  const [params] = useSearchParams();
  // dashboard backup reminder → jump to the backup section
  useEffect(() => {
    if (params.get('section') !== 'backup') return;
    const id = setTimeout(() => document.getElementById('backup')?.scrollIntoView({ block: 'start' }), 150);
    return () => clearTimeout(id);
  }, [params]);
  const { t } = useTranslation('settings');
  const prefs = usePrefs();
  const toast = useToast();
  const confirm = useConfirm();
  const [pwOpen, setPwOpen] = useState(false);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  const [restorePw, setRestorePw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const tick = useStore(storeVersion);
  const [trashN, setTrashN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void listTrash()
      .then((x) => alive && setTrashN(x.length))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tick, prefs.mode]);

  const setLang = async (lang: Lang) => {
    await setPrefs({ lang });
    await changeLanguage(lang, prefs.term);
    await onLanguageChanged();
  };

  const setCountry = async (country: Country) => {
    await setPrefs({ country });
    await onLanguageChanged();
  };

  const doBackup = async () => {
    const b = await createBackup(APP_VERSION);
    const res = await exportFile(
      `przystan-kopia-${todayIso()}.przystan`,
      new Blob([serializeBackup(b)], { type: 'application/json' }),
      t('backup.title'),
    );
    if (res !== 'cancelled') {
      await setPrefs({ lastBackupAt: new Date().toISOString() });
      toast({ text: t('backup.done', { count: b.records.length }), tone: 'ok' });
    }
  };

  const doRestore = async () => {
    if (!restoreText) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await restoreBackup(restoreText, restorePw);
      await openSpace(prefs.mode);
      setRestoreText(null);
      setRestorePw('');
      toast({ text: t('backup.restored', { count: r.records }), tone: 'ok' });
    } catch (e) {
      setErr(e instanceof BackupError ? t(`backup.errors.${e.code}`) : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doChangePw = async () => {
    setErr(null);
    if (newPw.length < 6) return setErr(t('password.tooShort'));
    if (newPw !== newPw2) return setErr(t('password.mismatch'));
    setBusy(true);
    try {
      await changePassword(oldPw, newPw);
      await logEvent({ action: 'password.change' });
      setPwOpen(false);
      setOldPw('');
      setNewPw('');
      setNewPw2('');
      toast({ text: t('password.changed'), tone: 'ok' });
    } catch (e) {
      setErr(e instanceof WrongPasswordError ? t('password.wrong') : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title={t('title')} />

      <SectionTitle>{t('appearance')}</SectionTitle>
      <Card className="space-y-5">
        <Chips
          label={t('language')}
          value={prefs.lang}
          onChange={(v) => v[0] && void setLang(v[0])}
          options={LANGS.map((l) => ({ value: l, label: LANG_META[l].name }))}
        />
        <Chips
          label={t('country')}
          hint={t('countryHint')}
          value={prefs.country}
          onChange={(v) => v[0] && void setCountry(v[0])}
          options={COUNTRIES.map((c) => ({ value: c, label: t(`help:country.${c}`) }))}
        />
        <Chips
          label={t('term')}
          value={prefs.term}
          onChange={(v) => {
            if (!v[0]) return;
            void setPrefs({ term: v[0] });
            setTerm(prefs.lang, v[0]);
          }}
          options={(['podopieczny', 'klient', 'wychowanek', 'uczestnik'] as Term[]).map((x) => ({
            value: x,
            label: t(`terms.${x}`),
          }))}
        />
        <Chips
          label={t('theme')}
          value={prefs.theme}
          onChange={(v) => v[0] && void setPrefs({ theme: v[0] })}
          options={(['system', 'light', 'dark'] as Theme[]).map((x) => ({ value: x, label: t(`themes.${x}`) }))}
        />
        <Chips
          label={t('textSize')}
          value={String(prefs.textScale)}
          onChange={(v) => v[0] && void setPrefs({ textScale: Number(v[0]) })}
          options={[
            { value: '1', label: 'A' },
            { value: '1.125', label: 'A+' },
            { value: '1.25', label: 'A++' },
            { value: '1.375', label: 'A+++' },
          ]}
        />
        <Switch
          label={t('presentation')}
          description={t('presentationHint')}
          checked={prefs.presentation}
          onChange={(v) => void setPrefs({ presentation: v })}
        />
      </Card>

      <SectionTitle>{t('mode')}</SectionTitle>
      <Card className="space-y-4">
        <Chips
          value={prefs.mode}
          onChange={(v) => v[0] && void switchMode(v[0])}
          options={[
            { value: 'practice', label: t('modes.practice') },
            { value: 'demo', label: t('modes.demo') },
          ]}
        />
        <p className="text-sm text-muted">{t(prefs.mode === 'demo' ? 'modes.demoText' : 'modes.practiceText')}</p>
        {prefs.mode === 'demo' && (
          <Button
            variant="secondary"
            icon={<RefreshCcw className="size-4" />}
            onClick={async () => {
              if (!(await confirm({ title: t('resetDemo'), text: t('resetDemoText') }))) return;
              await seedDemo();
              await openSpace('demo');
              toast({ text: t('demoReset'), tone: 'ok' });
            }}
          >
            {t('resetDemo')}
          </Button>
        )}
      </Card>

      <SectionTitle>{t('security')}</SectionTitle>
      <Card className="space-y-5">
        <Field label={t('autoLock')} hint={t('autoLockHint')}>
          <Chips
            value={String(prefs.autoLockMin)}
            onChange={(v) => v[0] && void setPrefs({ autoLockMin: Number(v[0]) })}
            options={['1', '3', '5', '10', '15'].map((m) => ({ value: m, label: `${m} min` }))}
          />
        </Field>
        <Button
          variant="secondary"
          icon={<KeyRound className="size-4" />}
          onClick={() => {
            setErr(null);
            setPwOpen(true);
          }}
        >
          {t('password.change')}
        </Button>
        <BiometricSetting />
      </Card>

      <SectionTitle id="backup">{t('backup.title')}</SectionTitle>
      <Card className="space-y-4">
        <p className="text-sm leading-relaxed">{t('backup.text')}</p>
        <p className="text-sm text-muted">
          {prefs.lastBackupAt ? t('backup.last', { date: fmtDate(prefs.lastBackupAt) }) : t('backup.never')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download className="size-4" />} onClick={() => void doBackup()}>
            {t('backup.export')}
          </Button>
          <Button
            variant="secondary"
            icon={<Upload className="size-4" />}
            onClick={async () => {
              const text = await pickTextFile('.przystan,application/json');
              if (text) {
                setErr(null);
                setRestoreText(text);
              }
            }}
          >
            {t('backup.import')}
          </Button>
        </div>
      </Card>

      <SectionTitle id="ai">{t('ai:name')}</SectionTitle>
      <Card className="p-0 sm:p-0">
        <Link to="/settings/ai" className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <span className="flex-1">
            <span className="block">{t('ai:settings.title')}</span>
            <span className="block text-sm text-muted">{t(`ai:settings.modes.${prefs.ai.mode}`)}</span>
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
      </Card>

      <SectionTitle id="notify">{t('notify:title')}</SectionTitle>
      <Card className="divide-y divide-line p-0 sm:p-0">
        <Link to="/settings/notify" className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
          <BellRing className="size-5 text-primary" aria-hidden />
          <span className="flex-1">
            <span className="block">{t('notify:enabled')}</span>
            <span className="block text-sm text-muted">
              {prefs.notify.enabled ? t('notify:statusOn') : t('notify:statusOff')}
            </span>
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
        <Link to="/messages" className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
          <Mail className="size-5 text-primary" aria-hidden />
          <span className="flex-1">{t('messages:title')}</span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
      </Card>

      <SectionTitle id="audit">{t('audit:section')}</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm leading-relaxed">{t('audit:sectionText')}</p>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {[
            { to: '/audit', icon: History, label: t('audit:logLink'), extra: '' },
            { to: '/trash', icon: ArchiveRestore, label: t('audit:trashLink'), extra: trashN ? String(trashN) : '' },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
              <l.icon className="size-5 text-primary" aria-hidden />
              <span className="flex-1">{l.label}</span>
              {l.extra && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tabular-nums" aria-label={l.extra}>
                  {l.extra}
                </span>
              )}
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </Link>
          ))}
        </div>
      </Card>

      <SectionTitle>{t('info')}</SectionTitle>
      <Card className="divide-y divide-line p-0 sm:p-0">
        {[
          { to: '/info/about', icon: Info, label: t('about') },
          { to: '/info/privacy', icon: ShieldCheck, label: t('privacy') },
          { to: '/info/sources', icon: BookMarked, label: t('sources') },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
            <l.icon className="size-5 text-primary" aria-hidden />
            <span className="flex-1">{l.label}</span>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>
        ))}
      </Card>

      <SectionTitle>{t('danger')}</SectionTitle>
      <Card className="border-danger/30">
        <p className="mb-3 text-sm">{t('wipeText')}</p>
        <Button
          variant="danger"
          icon={<Trash2 className="size-4" />}
          onClick={async () => {
            if (!(await confirm({ title: t('wipe'), text: t('wipeConfirm'), danger: true, confirm: t('wipe') }))) return;
            clearStore();
            await wipeAll();
            await setPrefs({ onboarded: false, privacyNoticeSeen: false, mode: 'practice' });
          }}
        >
          {t('wipe')}
        </Button>
      </Card>
      <p className="mt-6 text-center text-xs text-muted">Przystań {APP_VERSION}</p>

      <Sheet
        open={pwOpen}
        onOpenChange={setPwOpen}
        title={t('password.change')}
        footer={
          <Button disabled={busy} onClick={() => void doChangePw()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t('password.save')}
          </Button>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doChangePw();
          }}
        >
          <Field label={t('password.old')} htmlFor="pw-old">
            <TextInput
              id="pw-old"
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
          </Field>
          <Field label={t('password.new')} htmlFor="pw-new">
            <TextInput
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </Field>
          <Field label={t('password.repeat')} htmlFor="pw-new2">
            <TextInput
              id="pw-new2"
              type="password"
              autoComplete="new-password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
            />
          </Field>
          <Notice tone="warn">{t('password.note')}</Notice>
          {err && (
            <p className="text-sm font-medium text-danger" role="alert">
              {err}
            </p>
          )}
          <button type="submit" hidden />
        </form>
      </Sheet>

      <Sheet
        open={restoreText !== null}
        onOpenChange={(o) => !o && setRestoreText(null)}
        title={t('backup.import')}
        description={t('backup.importText')}
        footer={
          <Button variant="danger" disabled={busy || !restorePw} onClick={() => void doRestore()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t('backup.restore')}
          </Button>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doRestore();
          }}
        >
          <Field label={t('backup.password')} htmlFor="restore-pw">
            <TextInput id="restore-pw" type="password" value={restorePw} onChange={(e) => setRestorePw(e.target.value)} />
          </Field>
          <Notice tone="warn">{t('backup.replaceWarning')}</Notice>
          {err && (
            <p className="text-sm font-medium text-danger" role="alert">
              {err}
            </p>
          )}
          <button type="submit" hidden />
        </form>
      </Sheet>
    </Page>
  );
}
