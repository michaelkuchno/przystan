import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeOff, Plus, Trash2, X } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, EmptyState, IconButton } from '@/components/ui/core';
import { Field, SelectField, Switch, TextField, TextInput } from '@/components/ui/form';
import { useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { SaveStatus } from '@/components/SaveStatus';
import { useStore, all, get, remove, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { usePrefs } from '@/lib/prefs';
import { todayIso } from '@/lib/platform';
import { fmtDate } from '@/lib/format';
import type { Note } from '@/domain/types';
import { parseTags } from './notes';

function newNote(type: Note['type'], tag: string, clientId?: string, meetingId?: string, programId?: string): Note {
  const now = new Date().toISOString();
  return {
    id: uid(),
    type,
    title: '',
    body: '',
    tags: type === 'supervision' ? [tag] : [],
    pinned: false,
    ...(clientId ? { clientId } : {}),
    ...(meetingId ? { meetingId } : {}),
    ...(programId ? { programId } : {}),
    ...(type === 'supervision' ? { date: todayIso(), role: '', conclusions: '', tasks: [] } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

function Editor({ note, isNew }: { note: Note; isNew: boolean }) {
  const { t } = useTranslation('notes');
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  // new notes are saved on the first edit
  const { draft, update, status } = useEditable('note', note);
  const [tagText, setTagText] = useState(note.tags.join(', '));
  const [taskText, setTaskText] = useState('');
  const clients = useStore(() => all('client').filter((c) => c.status !== 'closed'));
  const meetings = useStore(() => (draft.clientId ? all('meeting').filter((m) => m.clientId === draft.clientId) : []));
  const programs = useStore(() => all('prevention'));
  const sup = draft.type === 'supervision';

  // once a new note is saved, give it its own address (reload, back button, delete)
  useEffect(() => {
    if (isNew && status === 'saved') nav(`/notes/${draft.id}`, { replace: true });
  }, [isNew, status, draft.id, nav]);

  const addTask = () => {
    const title = taskText.trim();
    if (!title) return;
    update((d) => ({ ...d, tasks: [...(d.tasks ?? []), { id: uid(), title, done: false }] }));
    setTaskText('');
  };

  return (
    <Page>
      <PageHeader
        back="/notes"
        eyebrow={sup ? t('filter.supervision') : t('filter.note')}
        title={draft.title || (isNew ? (sup ? t('newSupervision') : t('new')) : t('untitled'))}
        actions={<SaveStatus status={status} history={{ kind: 'note', id: draft.id }} />}
      />
      <div className="space-y-4">
        <Card className="space-y-4">
          <TextField label={t('fields.title')} value={draft.title} onChange={(v) => update({ title: v })} />
          {sup && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={t('fields.date')} type="date" value={draft.date ?? ''} onChange={(v) => update({ date: v })} />
                <TextField
                  label={t('fields.role')}
                  hint={t('fields.roleHint')}
                  value={draft.role ?? ''}
                  onChange={(v) => update({ role: v })}
                />
              </div>
              <TextField
                label={t('fields.conclusions')}
                multiline
                rows={4}
                value={draft.conclusions ?? ''}
                onChange={(v) => update({ conclusions: v })}
              />
            </>
          )}
          <TextField
            label={sup ? t('fields.notes') : t('fields.body')}
            multiline
            rows={sup ? 4 : 10}
            value={draft.body}
            onChange={(v) => update({ body: v })}
          />
        </Card>

        {sup && (
          <Card className="space-y-3">
            <h2 className="font-sans text-base font-semibold">{t('fields.tasks')}</h2>
            <p className="text-sm text-muted">{t('fields.tasksHint')}</p>
            <ul className="space-y-2">
              {(draft.tasks ?? []).map((task) => (
                <li key={task.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2">
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--primary)]"
                    checked={task.done}
                    aria-label={task.title}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        tasks: d.tasks?.map((x) => (x.id === task.id ? { ...x, done: e.target.checked } : x)),
                      }))
                    }
                  />
                  <span className={`min-w-0 flex-1 basis-40 ${task.done ? 'text-muted line-through' : ''}`}>{task.title}</span>
                  <TextInput
                    type="date"
                    className="w-40"
                    aria-label={t('fields.due')}
                    value={task.due ?? ''}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        tasks: d.tasks?.map((x) => (x.id === task.id ? { ...x, due: e.target.value || undefined } : x)),
                      }))
                    }
                  />
                  <IconButton
                    label={t('common:delete')}
                    onClick={() => update((d) => ({ ...d, tasks: d.tasks?.filter((x) => x.id !== task.id) }))}
                  >
                    <X className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <TextInput
                className="min-w-0 flex-1 basis-48"
                placeholder={t('fields.newTask')}
                aria-label={t('fields.newTask')}
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTask();
                  }
                }}
              />
              <Button variant="secondary" icon={<Plus className="size-4" />} onClick={addTask} disabled={!taskText.trim()}>
                {t('fields.addTask')}
              </Button>
            </div>
          </Card>
        )}

        <Card className="space-y-4">
          <Field label={t('fields.tags')} hint={t('fields.tagsHint')} htmlFor="note-tags">
            <TextInput
              id="note-tags"
              value={tagText}
              onChange={(e) => {
                setTagText(e.target.value);
                update({ tags: parseTags(e.target.value) });
              }}
            />
          </Field>
          <Switch label={t('fields.pinned')} checked={draft.pinned} onChange={(v) => update({ pinned: v })} />
          <SelectField
            label={t('fields.client')}
            value={draft.clientId ?? ''}
            onChange={(v) => update((d) => ({ ...d, clientId: v || undefined, meetingId: undefined }))}
            options={[{ value: '', label: t('fields.none') }, ...clients.map((c) => ({ value: c.id, label: c.code }))]}
          />
          {draft.clientId && meetings.length > 0 && (
            <SelectField
              label={t('fields.meeting')}
              value={draft.meetingId ?? ''}
              onChange={(v) => update({ meetingId: v || undefined })}
              options={[
                { value: '', label: t('fields.none') },
                ...meetings
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((m) => ({ value: m.id, label: `${fmtDate(m.date)}${m.title ? ` · ${m.title}` : ''}` })),
              ]}
            />
          )}
          {programs.length > 0 && (
            <SelectField
              label={t('fields.program')}
              value={draft.programId ?? ''}
              onChange={(v) => update({ programId: v || undefined })}
              options={[{ value: '', label: t('fields.none') }, ...programs.map((p) => ({ value: p.id, label: p.title }))]}
            />
          )}
        </Card>

        {!isNew && (
          <Button
            variant="ghost"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              if (!(await confirm({ title: t('deleteConfirm'), danger: true }))) return;
              const undo = await remove('note', draft.id);
              nav('/notes');
              toast({ text: t('deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
            }}
          >
            {t('common:delete')}
          </Button>
        )}
      </div>
    </Page>
  );
}

export default function NoteEditor() {
  const { t } = useTranslation('notes');
  const { id } = useParams();
  const [params] = useSearchParams();
  const { presentation } = usePrefs();
  const existing = useStore(() => (id && id !== 'new' ? get('note', id) : undefined));
  const fresh = useMemo(
    () =>
      newNote(
        params.get('type') === 'supervision' ? 'supervision' : 'note',
        t('supervisionTag'),
        params.get('client') ?? undefined,
        params.get('meeting') ?? undefined,
        params.get('program') ?? undefined,
      ),
    [params, t],
  );
  if (presentation)
    return (
      <Page>
        <EmptyState icon={<EyeOff />} title={t('hiddenTitle')} text={t('hiddenText')} />
      </Page>
    );
  if (id !== 'new' && !existing)
    return (
      <Page>
        <EmptyState title={t('notFound')} />
      </Page>
    );
  const note = existing ?? fresh;
  return <Editor key={note.id} note={note} isNew={!existing} />;
}
