import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, EmptyState } from '@/components/ui/core';
import { useConfirm } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { listTrash, type TrashItem } from '@/lib/history';
import { emptyTrash, purgeNow, restoreFromTrash, storeVersion, TRASH_DAYS, useStore } from '@/lib/store';
import { fmtDateTime } from './describe';
import { fmtDate } from '@/lib/format';

export default function Trash() {
  const { t } = useTranslation('audit');
  const confirm = useConfirm();
  const toast = useToast();
  const tick = useStore(storeVersion);
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [rev, setRev] = useState(0);
  useEffect(() => {
    let alive = true;
    void listTrash().then((x) => alive && setItems(x));
    return () => {
      alive = false;
    };
  }, [tick, rev]);

  const name = (i: TrashItem) => `${t(`kinds.${i.kind}`)} ${i.label ? `„${i.label}”` : t('trash.untitled')}`;

  const act = async (id: string, fn: () => Promise<void>, msg: string) => {
    setBusy(id);
    try {
      await fn();
      toast({ text: msg, tone: 'ok' });
      setRev((n) => n + 1);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page>
      <PageHeader
        back="/settings"
        title={t('trash.title')}
        actions={
          items && items.length > 0 ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="size-4" />}
              disabled={busy !== null}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: t('trash.emptyConfirm'),
                    text: t('trash.emptyText'),
                    danger: true,
                    confirm: t('trash.emptyAll'),
                  }))
                )
                  return;
                await act('*', () => emptyTrash(), t('trash.emptied'));
              }}
            >
              {t('trash.emptyAll')}
            </Button>
          ) : undefined
        }
      />
      <p className="mb-5 text-sm leading-relaxed text-muted">{t('trash.intro', { days: TRASH_DAYS })}</p>
      {!items ? (
        <Loader2 className="mx-auto size-6 animate-spin text-muted" aria-hidden />
      ) : items.length === 0 ? (
        <EmptyState title={t('trash.empty')} />
      ) : (
        <Card className="divide-y divide-line p-0 sm:p-0">
          {items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3" data-testid="trash-item">
              <div className="min-w-0 flex-1 basis-56">
                <div className="pii font-medium break-words">{name(i)}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {t('trash.deletedOn', { date: fmtDateTime(i.deletedAt) })}
                  {i.related > 0 && ` · ${t('trash.related', { count: i.related })}`}
                  {' · '}
                  {t('trash.purgeIn', { date: fmtDate(new Date(i.purgeAt).toISOString()) })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null}
                  icon={busy === i.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  onClick={() => void act(i.id, () => restoreFromTrash(i.id), t('trash.restored'))}
                >
                  {t('trash.restore')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  icon={<Trash2 className="size-4" />}
                  onClick={async () => {
                    if (
                      !(await confirm({
                        title: t('trash.purgeConfirm'),
                        text: t('trash.purgeText'),
                        danger: true,
                        confirm: t('trash.purge'),
                      }))
                    )
                      return;
                    await act(i.id, () => purgeNow(i.id), t('trash.purged'));
                  }}
                >
                  {t('trash.purge')}
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </Page>
  );
}
