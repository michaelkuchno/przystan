import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Save, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, ButtonLink, Card } from '@/components/ui/core';
import { Chips, ListEditor, SelectField, TextField, Field, TextInput } from '@/components/ui/form';
import { useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { all, get, remove, save, uid, useStore } from '@/lib/store';
import { nowLocalIso, toLocalInput } from '@/lib/format';
import { NOTE_FIELDS, type Meeting, type NoteType } from '@/domain/types';
import { haptic } from '@/lib/platform';

export function NoteForm({ m, onChange }: { m: Meeting; onChange: (m: Meeting) => void }) {
  const { t } = useTranslation('meetings');
  return (
    <div className="space-y-4">
      <Chips
        label={t('noteType')}
        value={m.noteType}
        onChange={(v) => v[0] && onChange({ ...m, noteType: v[0] })}
        options={(['progress', 'dap', 'observation'] as NoteType[]).map((n) => ({ value: n, label: t(`notes.${n}.name`) }))}
      />
      <p className="text-sm text-muted">{t(`notes.${m.noteType}.hint`)}</p>
      {NOTE_FIELDS[m.noteType].map((f) => (
        <TextField
          key={f}
          multiline
          rows={3}
          label={t(`notes.${m.noteType}.${f}`)}
          hint={t(`notes.${m.noteType}.${f}Hint`)}
          value={m.note[f] ?? ''}
          onChange={(v) => onChange({ ...m, note: { ...m.note, [f]: v } })}
        />
      ))}
    </div>
  );
}

export default function MeetingEditor() {
  const { t } = useTranslation('meetings');
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const clients = useStore(() => all('client')).filter((c) => c.status !== 'closed');
  const recipes = useStore(() => all('recipe'));
  const existing = get('meeting', id);
  const [m, setM] = useState<Meeting>(
    () =>
      existing ?? {
        id: uid(),
        clientId: params.get('client') ?? undefined,
        type: 'individual',
        date: nowLocalIso(),
        durationMin: 50,
        status: 'planned',
        agenda: [],
        quickNotes: '',
        noteType: 'progress',
        note: {},
        toolsUsed: [],
        homework: '',
      },
  );
  const client = get('client', m.clientId);

  const submit = async (thenLive = false) => {
    await save('meeting', m);
    void haptic('success');
    toast({ text: t('common:saved'), tone: 'ok' });
    nav(thenLive ? `/meetings/${m.id}/live` : client ? `/clients/${client.id}/meetings` : '/meetings', { replace: true });
  };

  return (
    <Page>
      <PageHeader
        back
        title={existing ? t('edit') : t('new')}
        actions={
          existing &&
          m.status === 'planned' && (
            <ButtonLink to={`/meetings/${m.id}/live`} icon={<Play className="size-4" />}>
              {t('startLive')}
            </ButtonLink>
          )
        }
      />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Card className="space-y-4">
          <Chips
            label={t('typeLabel')}
            value={m.type}
            onChange={(v) => v[0] && setM({ ...m, type: v[0] })}
            options={(['individual', 'group', 'family'] as const).map((v) => ({ value: v, label: t(`type.${v}`) }))}
          />
          <SelectField
            label={t('client')}
            value={m.clientId ?? ''}
            onChange={(v) => setM({ ...m, clientId: v || undefined })}
            options={[{ value: '', label: t('noClient') }, ...clients.map((c) => ({ value: c.id, label: c.code }))]}
          />
          <TextField label={t('titleLabel')} value={m.title ?? ''} onChange={(v) => setM({ ...m, title: v })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('date')} htmlFor="m-date">
              <TextInput
                id="m-date"
                type="datetime-local"
                value={toLocalInput(m.date)}
                onChange={(e) => e.target.value && setM({ ...m, date: `${e.target.value}:00` })}
              />
            </Field>
            <TextField
              label={t('duration')}
              type="number"
              min={5}
              max={480}
              value={String(m.durationMin)}
              onChange={(v) => setM({ ...m, durationMin: Number(v) || 0 })}
            />
            <SelectField
              label={t('statusLabel')}
              value={m.status}
              onChange={(v) => setM({ ...m, status: v })}
              options={(['planned', 'done', 'missed', 'cancelled'] as const).map((v) => ({ value: v, label: t(`status.${v}`) }))}
            />
          </div>
          {recipes.length > 0 && (
            <SelectField
              label={t('recipe')}
              value={m.recipeId ?? ''}
              onChange={(v) => {
                const r = get('recipe', v);
                setM({
                  ...m,
                  recipeId: v || undefined,
                  ...(r && !m.agenda.length ? { agenda: r.items.map((i) => i.title) } : {}),
                });
              }}
              options={[{ value: '', label: '—' }, ...recipes.map((r) => ({ value: r.id, label: r.title }))]}
            />
          )}
          <ListEditor label={t('agenda')} items={m.agenda} onChange={(v) => setM({ ...m, agenda: v })} />
        </Card>

        {m.status !== 'planned' && (
          <Card>
            <NoteForm m={m} onChange={setM} />
          </Card>
        )}
        <Card className="space-y-4">
          <TextField multiline label={t('quickNotes')} value={m.quickNotes} onChange={(v) => setM({ ...m, quickNotes: v })} />
          <TextField multiline label={t('homework')} value={m.homework} onChange={(v) => setM({ ...m, homework: v })} />
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!(await confirm({ title: t('deleteConfirm'), danger: true, confirm: t('common:delete') }))) return;
                const undo = await remove('meeting', m.id);
                nav(-1);
                toast({ text: t('common:deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
              }}
            >
              {t('common:delete')}
            </Button>
          )}
          {!existing && m.status === 'planned' && (
            <Button variant="secondary" icon={<Play className="size-4" />} onClick={() => void submit(true)}>
              {t('saveAndStart')}
            </Button>
          )}
          <Button type="submit" icon={<Save className="size-4" />}>
            {t('common:save')}
          </Button>
        </div>
      </form>
    </Page>
  );
}
