import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, IconButton } from '@/components/ui/core';
import { Field, TextArea, TextInput } from '@/components/ui/form';
import { Sheet } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { all, remove, save, uid, useStore } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import type { CourseView } from '@/lib/studies/program';
import type { StudyMaterial } from '@/lib/studies/types';
import { DictateButton } from '@/features/ai/DictateButton';
import { appendText } from '@/features/ai/text';

/** Class notes, handouts and PDF text – private (encrypted), the main source for AI answers and exams. */
export function Materials({ c }: { c: CourseView }) {
  const { t } = useTranslation('studies');
  const toast = useToast();
  const list = useStore(() => all('studyMaterial').filter((m) => m.courseId === c.id)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const [edit, setEdit] = useState<StudyMaterial | null>(null);

  const fromFile = async () => {
    const { pickStudyFile, extractText } = await import('@/lib/ai/extract');
    const f = await pickStudyFile();
    if (!f || !edit) return;
    try {
      const text = await extractText(f);
      setEdit({
        ...edit,
        title: edit.title || f.name.replace(/\.\w+$/, ''),
        text: appendText(edit.text, text),
        kind: /\.pdf$/i.test(f.name) ? 'pdf' : 'text',
      });
      toast({ text: t('materials.fileRead', { chars: text.length.toLocaleString() }), tone: 'ok' });
    } catch {
      toast({ text: t('materials.fileError'), tone: 'warn' });
    }
  };

  const now = () => new Date().toISOString();
  return (
    <div className="space-y-3">
      <Notice>{t('materials.lead')}</Notice>
      <Button
        icon={<Plus className="size-4" aria-hidden />}
        onClick={() =>
          setEdit({ id: uid(), courseId: c.id, title: '', text: '', kind: 'notes', createdAt: now(), updatedAt: now() })
        }
      >
        {t('materials.add')}
      </Button>
      {list.length === 0 ? (
        <EmptyState title={t('materials.empty')} />
      ) : (
        <ul className="space-y-2" data-testid="materials">
          {list.map((m) => (
            <li key={m.id}>
              <Card className="space-y-1 p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEdit(m)}>
                    <div className="font-medium [overflow-wrap:anywhere]">{m.title || t('materials.untitled')}</div>
                    <div className="text-xs text-muted">
                      {fmtDate(m.createdAt)} · {t(`materials.kind.${m.kind}`)} · {t('materials.chars', { count: m.text.length })}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{m.text}</p>
                  </button>
                  <IconButton label={t('materials.delete')} onClick={() => void remove('studyMaterial', m.id)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Sheet
        open={!!edit}
        wide
        onOpenChange={(o) => !o && setEdit(null)}
        title={t('materials.edit')}
        footer={
          edit && (
            <Button
              disabled={!edit.text.trim()}
              onClick={() =>
                void save('studyMaterial', {
                  ...edit,
                  title: edit.title.trim() || t('materials.untitled'),
                  updatedAt: now(),
                }).then(() => {
                  setEdit(null);
                  toast({ text: t('materials.saved'), tone: 'ok' });
                })
              }
            >
              {t('save')}
            </Button>
          )
        }
      >
        {edit && (
          <div className="space-y-3">
            <Field label={t('materials.title')} htmlFor="mat-title">
              <TextInput
                id="mat-title"
                value={edit.title}
                placeholder={t('materials.titleHint')}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </Field>
            <Field label={t('materials.text')} htmlFor="mat-text">
              <TextArea id="mat-text" rows={12} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<FileUp className="size-4" aria-hidden />} onClick={() => void fromFile()}>
                {t('materials.file')}
              </Button>
              <DictateButton sensitivity="study" onText={(x) => setEdit((e) => e && { ...e, text: appendText(e.text, x) })} />
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
