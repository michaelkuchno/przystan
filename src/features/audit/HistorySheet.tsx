import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { Sheet, useConfirm } from '@/components/ui/overlay';
import { Badge, Button } from '@/components/ui/core';
import { useToast } from '@/components/ui/toast';
import { diffValues, listVersions, showValue, type Version } from '@/lib/history';
import { revertToVersion, isTracked, activeSpace, useStore, storeVersion } from '@/lib/store';
import type { RecordKind } from '@/domain/types';
import { fmtDateTime } from './describe';

function humanize(key: string) {
  const s = key.replace(/([a-z])([A-Z])/g, '$1 $2');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HistorySheet({
  recordId,
  open,
  onOpenChange,
}: {
  recordId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation('audit');
  const confirm = useConfirm();
  const toast = useToast();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tick = useStore(storeVersion);

  useEffect(() => {
    if (!open || !recordId) return;
    let alive = true;
    void listVersions(recordId).then((v) => alive && setVersions(v));
    return () => {
      alive = false;
    };
  }, [open, recordId, tick]);

  const restore = async (v: Version) => {
    const ok = await confirm({
      title: t('history.restoreConfirm'),
      text: t('history.restoreText'),
      confirm: t('history.restore'),
    });
    if (!ok) return;
    setBusy(v.seq);
    setError(null);
    try {
      await revertToVersion(v.seq);
      toast({ text: t('history.restored', { date: fmtDateTime(v.at) }), tone: 'ok' });
    } catch (e) {
      setError((e as Error).message === 'other-space' ? t('history.otherSpace') : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('history.title')} description={t('history.intro')} wide>
      {!versions ? (
        <Loader2 className="mx-auto size-6 animate-spin text-muted" aria-hidden />
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted">{t('history.empty')}</p>
      ) : (
        <ol className="space-y-3" aria-label={t('history.title')}>
          {error && (
            <li className="text-sm font-medium text-danger" role="alert">
              {error}
            </li>
          )}
          {versions.map((v, i) => {
            const older = versions[i + 1];
            const changes = older ? diffValues(older.value, v.value) : [];
            return (
              <li key={v.seq} className="rounded-2xl border border-line p-4" data-testid="version">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{fmtDateTime(v.at)}</span>
                  <Badge tone={v.op === 'revert' ? 'warn' : v.op === 'create' ? 'primary' : 'neutral'}>
                    {t(`history.op.${v.op}`)}
                  </Badge>
                  {i === 0 && <Badge tone="blue">{t('history.current')}</Badge>}
                </div>
                {v.value === null ? (
                  <p className="mt-2 text-sm text-danger">{t('history.unreadable')}</p>
                ) : older ? (
                  changes.length > 0 && (
                    <dl className="mt-3 space-y-2 text-sm">
                      {changes.map((c) => (
                        <div key={c.field} className="min-w-0">
                          <dt className="font-medium">{t(`fields.${c.field}`, { defaultValue: humanize(c.field) })}</dt>
                          <dd className="pii mt-0.5 break-words text-muted">
                            <del className="decoration-danger/60">{showValue(c.before)}</del>
                            <span aria-hidden> → </span>
                            <ins className="text-fg no-underline">{showValue(c.after)}</ins>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )
                ) : (
                  <p className="mt-2 text-sm text-muted">{t('history.noChanges')}</p>
                )}
                {i > 0 && v.value !== null && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    size="sm"
                    disabled={busy !== null}
                    icon={busy === v.seq ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                    onClick={() => void restore(v)}
                  >
                    {t('history.restore')}
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Sheet>
  );
}

/** "History" button for an editor; hidden in the training space and for new, unsaved records. */
export function HistoryButton({ kind, id, size = 'sm' }: { kind: RecordKind; id: string | undefined; size?: 'sm' | 'md' }) {
  const { t } = useTranslation('audit');
  const [open, setOpen] = useState(false);
  if (!id || !isTracked(kind, activeSpace())) return null;
  return (
    <>
      <Button variant="secondary" size={size} icon={<History className="size-4" />} onClick={() => setOpen(true)}>
        {t('history.button')}
      </Button>
      <HistorySheet recordId={id} open={open} onOpenChange={setOpen} />
    </>
  );
}
