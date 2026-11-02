import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Download } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, EmptyState, IconButton } from '@/components/ui/core';
import { TextField, TextArea } from '@/components/ui/form';
import { useConfirm, useToast } from '@/components/ui/overlay';
import { SaveStatus } from '@/components/SaveStatus';
import { get, remove, uid, useStore } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { exportFile, slug } from '@/lib/platform';
import type { Deck } from '@/domain/types';

function Editor({ deck }: { deck: Deck }) {
  const { t } = useTranslation('learn');
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { draft, update, status } = useEditable('deck', deck);
  return (
    <div className="space-y-4">
      <Card className="flex items-end gap-3">
        <div className="flex-1">
          <TextField label={t('deckTitle')} value={draft.title} onChange={(v) => update({ title: v })} />
        </div>
        <SaveStatus status={status} />
      </Card>
      {draft.cards.map((c, i) => (
        <Card key={c.id} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <TextArea aria-label={t('front', { n: i + 1 })} placeholder={t('frontPh')} rows={2} value={c.front} onChange={(e) => update({ cards: draft.cards.map((x) => (x.id === c.id ? { ...x, front: e.target.value } : x)) })} />
          <TextArea aria-label={t('backN', { n: i + 1 })} placeholder={t('backPh')} rows={2} value={c.back} onChange={(e) => update({ cards: draft.cards.map((x) => (x.id === c.id ? { ...x, back: e.target.value } : x)) })} />
          <IconButton label={t('common:delete')} onClick={() => update({ cards: draft.cards.filter((x) => x.id !== c.id) })}>
            <Trash2 className="size-4" />
          </IconButton>
        </Card>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button icon={<Plus className="size-4" />} onClick={() => update({ cards: [...draft.cards, { id: uid(), front: '', back: '' }] })}>
          {t('addCard')}
        </Button>
        <Button
          variant="secondary"
          icon={<Download className="size-4" />}
          onClick={async () => {
            const json = JSON.stringify({ title: draft.title, module: draft.module, cards: draft.cards.map(({ front, back }) => ({ front, back })) }, null, 2);
            await exportFile(`${slug(draft.title) || 'talia'}.json`, new Blob([json], { type: 'application/json' }));
          }}
        >
          {t('export')}
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          className="text-danger"
          icon={<Trash2 className="size-4" />}
          onClick={async () => {
            if (!(await confirm({ title: t('deleteDeck'), danger: true, confirm: t('common:delete') }))) return;
            const undo = await remove('deck', draft.id);
            nav('/learn');
            toast({ text: t('common:deleted'), tone: 'info', action: { label: t('common:undo'), run: () => void undo() } });
          }}
        >
          {t('deleteDeck')}
        </Button>
      </div>
    </div>
  );
}

export default function DeckEditor() {
  const { t } = useTranslation('learn');
  const { id = '' } = useParams();
  const deck = useStore(() => get('deck', id));
  return (
    <Page>
      <PageHeader back="/learn" title={deck?.title ?? t('notFound')} />
      {deck ? <Editor key={deck.id} deck={deck} /> : <EmptyState title={t('notFound')} />}
    </Page>
  );
}
