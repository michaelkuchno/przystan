import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Save, Plus, Trash2 } from 'lucide-react';
import { Page, PageHeader, Notice } from '@/components/ui/page';
import { Button, Card, IconButton } from '@/components/ui/core';
import { TextField, Chips, SelectField, DateField, TextInput } from '@/components/ui/form';
import { Sheet, useToast } from '@/components/ui/overlay';
import { get, save, uid, all } from '@/lib/store';
import { getPrefs, setPrefs } from '@/lib/prefs';
import { PROBLEMS, STAGES, WORK_CONTEXTS, type Client } from '@/domain/types';
import { haptic } from '@/lib/platform';

const blank = (): Client => {
  const now = new Date().toISOString();
  return {
    id: uid(),
    code: '',
    ageGroup: 'adult',
    sex: 'unspecified',
    context: 'clinic',
    problems: [],
    goal: 'undecided',
    stage: 'contemplation',
    status: 'active',
    strengths: '',
    supportNetwork: '',
    family: '',
    education: '',
    keyDates: [],
    createdAt: now,
    updatedAt: now,
  };
};

export default function ClientForm() {
  const { t } = useTranslation('clients');
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const existing = get('client', id);
  const [c, setC] = useState<Client>(() => existing ?? blank());
  const [showFull, setShowFull] = useState(!!existing?.fullName);
  const [error, setError] = useState<string | null>(null);
  const prefs = getPrefs();
  const [notice, setNotice] = useState(!existing && prefs.mode === 'practice' && !prefs.privacyNoticeSeen && all('client').length === 0);

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    if (!c.code.trim()) return setError(t('codeRequired'));
    const value: Client = { ...c, code: c.code.trim(), updatedAt: new Date().toISOString() };
    if (!showFull || !value.fullName?.trim()) delete value.fullName;
    await save('client', value);
    void haptic('success');
    toast({ text: existing ? t('saved') : t('created'), tone: 'ok' });
    nav(`/clients/${value.id}`, { replace: true });
  };

  return (
    <Page>
      <PageHeader back title={existing ? t('edit') : t('add')} />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Card className="space-y-4">
          <TextField
            label={t('fields.code')}
            hint={t('fields.codeHint')}
            value={c.code}
            onChange={(v) => {
              set('code', v);
              setError(null);
            }}
            autoComplete="off"
            required
          />
          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          {!showFull ? (
            <button type="button" className="text-sm text-muted underline underline-offset-2" onClick={() => setShowFull(true)}>
              {t('fields.addFullName')}
            </button>
          ) : (
            <div className="space-y-2">
              <Notice tone="warn" icon={<ShieldAlert aria-hidden />}>
                {t('fields.fullNameWarning')}
              </Notice>
              <TextField label={t('fields.fullName')} value={c.fullName ?? ''} onChange={(v) => set('fullName', v)} autoComplete="off" />
            </div>
          )}
          <Chips
            label={t('fields.isGroup')}
            value={c.isGroup ? 'group' : 'person'}
            onChange={(v) => set('isGroup', v[0] === 'group')}
            options={[
              { value: 'person', label: t('person') },
              { value: 'group', label: t('group') },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label={t('fields.ageGroup')}
              value={c.ageGroup}
              onChange={(v) => set('ageGroup', v)}
              options={(['child', 'teen', 'youngAdult', 'adult', 'senior'] as const).map((v) => ({ value: v, label: t(`enums:ageGroup.${v}`) }))}
            />
            <TextField
              label={t('fields.age')}
              type="number"
              inputMode="numeric"
              min={5}
              max={100}
              value={c.age?.toString() ?? ''}
              onChange={(v) => set('age', v ? Number(v) : undefined)}
            />
            <SelectField
              label={t('fields.sex')}
              hint={t('fields.sexHint')}
              value={c.sex}
              onChange={(v) => set('sex', v)}
              options={(['female', 'male', 'other', 'unspecified'] as const).map((v) => ({ value: v, label: t(`enums:sex.${v}`) }))}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <Chips
            label={t('fields.context')}
            value={c.context}
            onChange={(v) => v[0] && set('context', v[0])}
            options={WORK_CONTEXTS.map((v) => ({ value: v, label: t(`enums:context.${v}`) }))}
          />
          <Chips
            label={t('fields.problems')}
            multiple
            value={c.problems}
            onChange={(v) => set('problems', v)}
            options={PROBLEMS.map((v) => ({ value: v, label: t(`enums:problem.${v}`) }))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label={t('fields.goal')}
              value={c.goal}
              onChange={(v) => set('goal', v)}
              options={(['abstinence', 'harmReduction', 'undecided'] as const).map((v) => ({ value: v, label: t(`enums:goal.${v}`) }))}
            />
            <SelectField
              label={t('fields.stage')}
              value={c.stage}
              onChange={(v) => set('stage', v)}
              options={STAGES.map((v) => ({ value: v, label: t(`enums:stage.${v}`) }))}
            />
            <SelectField
              label={t('fields.status')}
              value={c.status}
              onChange={(v) => set('status', v)}
              options={(['active', 'paused', 'closed'] as const).map((v) => ({ value: v, label: t(`enums:status.${v}`) }))}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <TextField multiline label={t('fields.strengths')} hint={t('fields.strengthsHint')} value={c.strengths} onChange={(v) => set('strengths', v)} />
          <TextField multiline label={t('fields.supportNetwork')} value={c.supportNetwork} onChange={(v) => set('supportNetwork', v)} />
          <TextField multiline label={t('fields.family')} value={c.family} onChange={(v) => set('family', v)} />
          <TextField multiline label={t('fields.education')} value={c.education} onChange={(v) => set('education', v)} />
          <TextField multiline label={t('fields.notes')} value={c.notes ?? ''} onChange={(v) => set('notes', v)} />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('fields.keyDates')}</h2>
            <Button
              variant="soft"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => set('keyDates', [...c.keyDates, { id: uid(), label: '', date: '' }])}
            >
              {t('addKeyDate')}
            </Button>
          </div>
          <p className="text-sm text-muted">{t('fields.keyDatesHint')}</p>
          {c.keyDates.map((k, i) => (
            <div key={k.id} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted" htmlFor={`kd-${k.id}`}>
                  {t('keyDateLabel')}
                </label>
                <TextInput
                  id={`kd-${k.id}`}
                  value={k.label}
                  onChange={(e) => set('keyDates', c.keyDates.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
              </div>
              <div className="w-40">
                <DateField
                  label={t('keyDateDate')}
                  value={k.date}
                  onChange={(v) => set('keyDates', c.keyDates.map((x, j) => (j === i ? { ...x, date: v } : x)))}
                />
              </div>
              <IconButton label={t('common:delete')} onClick={() => set('keyDates', c.keyDates.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => nav(-1)}>
            {t('common:cancel')}
          </Button>
          <Button type="submit" icon={<Save className="size-4" />}>
            {t('common:save')}
          </Button>
        </div>
      </form>

      <Sheet
        open={notice}
        onOpenChange={setNotice}
        title={t('privacyNotice.title')}
        footer={
          <Button
            onClick={() => {
              setNotice(false);
              void setPrefs({ privacyNoticeSeen: true });
            }}
          >
            {t('privacyNotice.ok')}
          </Button>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed">
          <p>{t('privacyNotice.text1')}</p>
          <p>{t('privacyNotice.text2')}</p>
        </div>
      </Sheet>
    </Page>
  );
}
