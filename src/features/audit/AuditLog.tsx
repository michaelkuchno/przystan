import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, FileSpreadsheet, Loader2, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Button, Card, SectionTitle } from '@/components/ui/core';
import { Chips, TextInput } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { auditVersionNow, readAudit, subscribeAudit, type AuditEntry } from '@/lib/audit';
import { checkIntegrity, type IntegrityReport } from '@/lib/history';
import { useStore, storeVersion } from '@/lib/store';
import { exportFile, todayIso } from '@/lib/platform';
import { auditLogPdf } from '@/lib/reports';
import { AUDIT_FILTERS, describeEntry, fmtDateTime, matchesFilter, type AuditFilter } from './describe';
import { HistorySheet } from './HistorySheet';

const PAGE = 100;
/** UTF-8 byte order mark: Excel then reads Polish / German characters correctly. */
const BOM = String.fromCharCode(0xfeff);
const APP_VERSION = __APP_VERSION__;

function csvCell(s: string) {
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AuditLog() {
  const { t } = useTranslation('audit');
  const toast = useToast();
  const tick = useStore(storeVersion);
  const auditTick = useSyncExternalStore(subscribeAudit, auditVersionNow, auditVersionNow);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    void readAudit().then((e) => alive && setEntries(e));
    return () => {
      alive = false;
    };
  }, [tick, auditTick]);

  const rows = useMemo(() => (entries ?? []).map((e) => ({ e, d: describeEntry(t, e), time: fmtDateTime(e.at) })), [entries, t]);
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    return rows.filter(
      (r) =>
        matchesFilter(r.e, filter) &&
        (!needle || `${r.d.action} ${r.d.object} ${r.d.detail} ${r.time}`.toLocaleLowerCase().includes(needle)),
    );
  }, [rows, filter, q]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      setReport(await checkIntegrity());
    } finally {
      setChecking(false);
    }
  }, []);

  const integrityLine = (r: IntegrityReport) =>
    r.audit.ok
      ? t('export.pdfIntegrityOk', { entries: r.audit.entries })
      : t('export.pdfIntegrityBad', { seq: r.audit.brokenAt ?? '?' });

  const exportPdf = async () => {
    setExporting(true);
    try {
      const r = await checkIntegrity();
      setReport(r);
      const res = await auditLogPdf(
        rows.map(({ e, d, time }) => ({ seq: e.seq, time, action: d.action, object: d.object, detail: d.detail })),
        integrityLine(r),
        APP_VERSION,
      );
      if (res !== 'cancelled') toast({ text: t('export.done'), tone: 'ok' });
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = async () => {
    const r = await checkIntegrity();
    setReport(r);
    const head = ['seq', 'time_iso', 'action', 'action_label', 'object_kind', 'record_id', 'object', 'details'];
    const lines = rows.map(({ e, d }) =>
      [String(e.seq), new Date(e.at).toISOString(), e.action, d.action, e.kind, e.recordId, d.object, d.detail]
        .map(csvCell)
        .join(';'),
    );
    const text = `${BOM}# ${integrityLine(r)}\n${head.join(';')}\n${lines.join('\n')}\n`;
    const res = await exportFile(`przystan-audyt-${todayIso()}.csv`, new Blob([text], { type: 'text/csv' }), t('log.title'), {
      action: 'audit.export',
      details: { format: 'csv', entries: rows.length },
    });
    if (res !== 'cancelled') toast({ text: t('export.done'), tone: 'ok' });
  };

  return (
    <Page wide>
      <PageHeader
        back="/settings"
        title={t('log.title')}
        subtitle={entries ? t('log.count', { count: entries.length }) : undefined}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={exporting || !entries?.length}
              icon={exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
              onClick={() => void exportPdf()}
            >
              {t('export.pdf')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!entries?.length}
              icon={<FileSpreadsheet className="size-4" />}
              onClick={() => void exportCsv()}
            >
              {t('export.csv')}
            </Button>
          </>
        }
      />
      <p className="mb-4 text-sm leading-relaxed text-muted">{t('log.intro')}</p>

      <Card className="mb-5 space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="font-semibold">{t('integrity.title')}</h2>
            <p className="mt-1 text-sm text-muted">{t('integrity.text')}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={checking}
            icon={checking ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            onClick={() => void runCheck()}
          >
            {checking ? t('integrity.running') : t('integrity.run')}
          </Button>
        </div>
        {report && (
          <div role="status" data-testid="integrity">
            {report.audit.ok && report.unreadable.length === 0 ? (
              <Notice icon={<ShieldCheck className="size-5" />}>
                <strong>{t('integrity.ok')}.</strong>{' '}
                {t('integrity.okText', { entries: report.audit.entries, records: report.records, versions: report.versions })}
              </Notice>
            ) : (
              <Notice tone="warn" icon={<ShieldAlert className="size-5" />}>
                <strong>{t('integrity.bad')}.</strong>{' '}
                {!report.audit.ok &&
                  t('integrity.badAudit', {
                    seq: report.audit.brokenAt ?? '?',
                    reason: t(`integrity.reason.${report.audit.reason ?? 'mac'}`),
                  })}{' '}
                {report.unreadable.length > 0 && t('integrity.badRecords', { count: report.unreadable.length })}
              </Notice>
            )}
          </div>
        )}
      </Card>

      <div className="mb-3 space-y-3">
        <Chips
          value={filter}
          onChange={(v) => {
            if (v[0]) setFilter(v[0]);
            setLimit(PAGE);
          }}
          options={AUDIT_FILTERS.map((f) => ({ value: f, label: t(`log.filters.${f}`) }))}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="audit-q" className="sr-only">
            {t('log.search')}
          </label>
          <TextInput
            id="audit-q"
            type="search"
            className="pl-9"
            placeholder={t('log.search')}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
          />
        </div>
      </div>

      <SectionTitle>{t('log.count', { count: shown.length })}</SectionTitle>
      {!entries ? (
        <Loader2 className="mx-auto size-6 animate-spin text-muted" aria-hidden />
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">{t('log.empty')}</p>
      ) : (
        <Card className="divide-y divide-line p-0 sm:p-0">
          {shown.slice(0, limit).map(({ e, d, time }) => {
            const inner = (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{d.action}</span>
                  {d.object && <span className="pii min-w-0 break-words">{d.object}</span>}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  <span className="tabular-nums">#{e.seq}</span> · <time dateTime={new Date(e.at).toISOString()}>{time}</time>
                  {d.detail && <span className="pii"> · {d.detail}</span>}
                </div>
              </>
            );
            return e.recordId && e.action !== 'record.purge' ? (
              <button
                key={e.seq}
                type="button"
                data-testid="audit-entry"
                className="block min-h-14 w-full px-4 py-3 text-left hover:bg-surface-2"
                onClick={() => setHistoryOf(e.recordId)}
                aria-label={`${d.action} ${d.object} ${time} – ${t('history.title')}`}
              >
                {inner}
              </button>
            ) : (
              <div key={e.seq} data-testid="audit-entry" className="min-h-14 px-4 py-3">
                {inner}
              </div>
            );
          })}
        </Card>
      )}
      {shown.length > limit && (
        <Button className="mt-4" variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
          {t('log.showMore')}
        </Button>
      )}
      <HistorySheet recordId={historyOf} open={historyOf !== null} onOpenChange={(o) => !o && setHistoryOf(null)} />
    </Page>
  );
}
