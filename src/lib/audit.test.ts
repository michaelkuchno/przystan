import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, resetDbForTests } from './db';
import { lock, setupVault, unlock } from './vault';
import {
  clearStore,
  emptyTrash,
  get,
  loadSpace,
  onRevert,
  purgeDeleted,
  purgeNow,
  remove,
  restoreFromTrash,
  revertToVersion,
  save,
  saveMany,
  TRASH_MS,
} from './store';
import { readAudit, serial, verifyAudit } from './audit';
import { checkIntegrity, diffValues, exportPerson, listTrash, listVersions, showValue } from './history';
import { createBackup, parseBackup, restoreBackup, serializeBackup } from './backup';
import type { Client, Note } from '@/domain/types';

const IT = 1000;
let n = 0;

function client(id: string, code = 'AB-1', extra: Partial<Client> = {}): Client {
  const now = new Date().toISOString();
  return {
    id,
    code,
    ageGroup: 'adult',
    sex: 'male',
    context: 'clinic',
    problems: ['alcohol'],
    goal: 'abstinence',
    stage: 'contemplation',
    status: 'active',
    strengths: '',
    supportNetwork: '',
    family: '',
    education: '',
    keyDates: [],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function note(id: string, title: string, clientId?: string): Note {
  return { id, title, body: '', tags: [], pinned: false, clientId, createdAt: '', updatedAt: '' } as unknown as Note;
}

/** Waits for the async unlock entry and all queued writes. */
async function settle() {
  await new Promise((r) => setTimeout(r, 30));
  await serial(async () => undefined);
}

async function start() {
  await setupVault('hasło-123', IT);
  await loadSpace('practice');
  await settle();
}

beforeEach(() => {
  resetDbForTests(`audit-${++n}`);
  lock();
  clearStore();
  vi.useRealTimers();
});

describe('versions', () => {
  it('records create and update, folds quick edits, skips saves without changes', async () => {
    await start();
    await save('client', client('c1', 'A'));
    await save('client', client('c1', 'B'));
    await save('client', client('c1', 'C')); // folded into the previous update
    await save('client', { ...client('c1', 'C'), updatedAt: 'later' }); // no real change
    const v = await listVersions('c1');
    expect(v.map((x) => x.op)).toEqual(['update', 'create']);
    expect((v[0]!.value as Client).code).toBe('C');
    expect((v[1]!.value as Client).code).toBe('A');
    const log = await readAudit();
    expect(log.filter((e) => e.recordId === 'c1').map((e) => e.action)).toEqual(['record.update', 'record.create']);
    expect(log.at(-1)!.action).toBe('vault.setup');
  });

  it('starts a new version in a new session (after lock / unlock)', async () => {
    await start();
    await save('client', client('c1', 'A'));
    await save('client', client('c1', 'B'));
    lock();
    await unlock('hasło-123');
    await loadSpace('practice');
    await save('client', client('c1', 'X'));
    expect((await listVersions('c1')).map((x) => (x.value as Client).code)).toEqual(['X', 'B', 'A']);
  });

  it('restores an earlier version as a new version and tells open editors', async () => {
    await start();
    await save('client', client('c1', 'Dobra treść'));
    await save('client', client('c1', 'Przypadkowo zmienione'));
    const seen: string[] = [];
    const off = onRevert((id, v) => seen.push(`${id}:${(v as Client).code}`));
    const versions = await listVersions('c1');
    await revertToVersion(versions[1]!.seq);
    off();
    expect(get('client', 'c1')?.code).toBe('Dobra treść');
    expect(seen).toEqual(['c1:Dobra treść']);
    const after = await listVersions('c1');
    expect(after[0]!.op).toBe('revert');
    expect(after).toHaveLength(3);
    expect((await readAudit())[0]!.action).toBe('record.revert');
  });

  it('does not track the fictional training space or flash card state', async () => {
    await start();
    await saveMany([{ kind: 'client', value: client('d1') }], 'demo');
    await save('cardState', { id: 'cs1', cardId: 'x', deckId: 'd' } as never);
    expect(await db.versions.count()).toBe(0);
    expect((await readAudit()).map((e) => e.action)).toEqual(['vault.setup']);
  });

  it('lists changed fields', () => {
    const d = diffValues(
      { id: 'a', code: 'A', tags: [], notes: 'x', updatedAt: '1' },
      { id: 'a', code: 'B', notes: 'x', updatedAt: '2' },
    );
    expect(d).toEqual([{ field: 'code', before: 'A', after: 'B' }]);
    expect(showValue(['a', 'b'])).toBe('a, b');
    expect(showValue('')).toBe('—');
    expect(showValue('x'.repeat(300)).length).toBeLessThanOrEqual(160);
  });
});

describe('trash', () => {
  it('keeps deleted records for 30 days and restores a client with their records', async () => {
    await start();
    await save('client', client('c1', 'KOD'));
    await save('note', note('n1', 'Notatka', 'c1'));
    await remove('client', 'c1');
    expect(get('client', 'c1')).toBeUndefined();
    expect(get('note', 'n1')).toBeUndefined();
    const trash = await listTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0]).toMatchObject({ id: 'c1', label: 'KOD', related: 1 });

    await purgeDeleted(); // not old enough
    expect(await db.records.count()).toBe(2);

    await restoreFromTrash('n1'); // the client comes back with it
    expect(get('client', 'c1')?.code).toBe('KOD');
    expect(get('note', 'n1')?.title).toBe('Notatka');
    const actions = (await readAudit()).map((e) => e.action);
    // the note and its client are both reported as restored
    expect(actions.slice(0, 3)).toEqual(['record.restore', 'record.restore', 'record.delete']);
  });

  it('purges after the trash period: record and versions gone, labels erased, chain intact', async () => {
    await start();
    await save('client', client('c1', 'NAZWISKO'));
    await remove('client', 'c1');
    const deletedAt = (await db.records.get('c1'))!.deletedAt;
    await db.records.update('c1', { deletedAt: deletedAt - TRASH_MS - 1000 });
    await purgeDeleted();
    expect(await db.records.get('c1')).toBeUndefined();
    expect(await db.versions.where('recordId').equals('c1').count()).toBe(0);
    const log = await readAudit({ recordIds: ['c1'] });
    expect(log.map((e) => e.action)).toEqual(['record.purge', 'record.delete', 'record.create']);
    expect(log.filter((e) => e.action !== 'record.purge').every((e) => e.redacted && e.details === null)).toBe(true);
    expect(JSON.stringify(await db.audit.toArray())).not.toContain('NAZWISKO');
    expect((await verifyAudit()).ok).toBe(true);
  });

  it('deletes permanently on request and empties the trash', async () => {
    await start();
    await save('note', note('n1', 'A'));
    await save('note', note('n2', 'B'));
    await remove('note', 'n1');
    await remove('note', 'n2');
    await purgeNow('n1');
    expect(await listTrash()).toHaveLength(1);
    await emptyTrash();
    expect(await listTrash()).toHaveLength(0);
    expect(await db.records.count()).toBe(0);
  });
});

describe('audit chain', () => {
  async function withEntries() {
    await start();
    await save('client', client('c1', 'A'));
    await save('note', note('n1', 'N'));
    await save('note', note('n2', 'M'));
    expect(await verifyAudit()).toMatchObject({ ok: true, entries: 4 });
    return db.audit.orderBy('seq').toArray();
  }

  it('detects an edited entry', async () => {
    const rows = await withEntries();
    await db.audit.update(rows[1]!.seq!, { action: 'record.update' });
    expect(await verifyAudit()).toMatchObject({ ok: false, reason: 'mac', brokenAt: rows[1]!.seq });
  });

  it('detects a removed entry in the middle', async () => {
    const rows = await withEntries();
    await db.audit.delete(rows[1]!.seq!);
    expect(await verifyAudit()).toMatchObject({ ok: false, reason: 'mac' });
  });

  it('detects a cut-off tail', async () => {
    const rows = await withEntries();
    await db.audit.delete(rows.at(-1)!.seq!);
    expect(await verifyAudit()).toMatchObject({ ok: false, reason: 'head' });
  });

  it('detects swapped details', async () => {
    const rows = await withEntries();
    await db.audit.update(rows[2]!.seq!, { details: rows[3]!.details });
    expect(await verifyAudit()).toMatchObject({ ok: false, reason: 'details' });
  });

  it('keeps details encrypted at rest', async () => {
    await start();
    await save('client', client('c1', 'TAJNE-INICJAŁY'));
    expect(JSON.stringify(await db.audit.toArray())).not.toContain('TAJNE');
    expect(JSON.stringify(await db.versions.toArray())).not.toContain('TAJNE');
  });

  it('records failed unlock attempts at the next unlock', async () => {
    await start();
    lock();
    await expect(unlock('złe')).rejects.toThrow();
    await expect(unlock('złe2')).rejects.toThrow();
    await unlock('hasło-123');
    await settle();
    const log = await readAudit();
    expect(log[0]).toMatchObject({ action: 'session.unlock', details: { method: 'password' } });
    expect(log[1]).toMatchObject({ action: 'session.unlockFailed', details: { count: 2, methods: ['password'] } });
    expect(await db.meta.get('failedUnlocks')).toBeUndefined();
    expect((await verifyAudit()).ok).toBe(true);
  });
});

describe('integrity, export, backup', () => {
  it('finds a damaged record', async () => {
    await start();
    await save('client', client('c1'));
    const row = (await db.records.get('c1'))!;
    await db.records.update('c1', { data: { ...row.data, ct: row.data.ct.slice(0, -4) + 'AAAA' } });
    const r = await checkIntegrity();
    expect(r.unreadable).toEqual(['c1']);
    expect(r.audit.ok).toBe(true);
  });

  it('exports everything about one person', async () => {
    await start();
    await save('client', client('c1', 'KOD'));
    await save('note', note('n1', 'Dot. KOD', 'c1'));
    await save('note', note('n2', 'Inna osoba'));
    const e = await exportPerson('c1', 'test');
    expect((e.client as Client).code).toBe('KOD');
    expect(e.records.map((r) => r.kind)).toEqual(['note']);
    expect(e.history).toHaveLength(2);
    expect(e.audit.map((a) => a.action).sort()).toEqual(['record.create', 'record.create']);
    expect(JSON.stringify(e)).not.toContain('Inna osoba');
  });

  it('backup format 2 carries history, trash and the audit trail', async () => {
    await start();
    await save('client', client('c1', 'A'));
    lock();
    await unlock('hasło-123');
    await loadSpace('practice');
    await save('client', client('c1', 'B'));
    await save('note', note('n1', 'Kosz'));
    await remove('note', 'n1');
    await settle();
    const b = await createBackup('test');
    const text = serializeBackup(b);
    expect(parseBackup(text).version).toBe(2);

    resetDbForTests(`audit-restore-${n}`);
    lock();
    await restoreBackup(text, 'hasło-123');
    await loadSpace('practice');
    expect(get('client', 'c1')?.code).toBe('B');
    expect(get('note', 'n1')).toBeUndefined();
    expect((await listTrash()).map((x) => x.id)).toEqual(['n1']);
    expect((await listVersions('c1')).map((v) => (v.value as Client).code)).toEqual(['B', 'A']);
    const v = await verifyAudit();
    expect(v.ok).toBe(true);
    expect((await readAudit())[0]).toMatchObject({ action: 'backup.restore', details: { format: 2 } });
  });

  it('still restores format 1 files and starts a new audit trail', async () => {
    await start();
    await save('client', client('c1', 'A'));
    const b = await createBackup('test');
    const v1 = { ...b, version: 1, versions: undefined, audit: undefined, auditKey: undefined, auditHead: undefined };
    resetDbForTests(`audit-v1-${n}`);
    lock();
    await restoreBackup(JSON.stringify(v1), 'hasło-123');
    await loadSpace('practice');
    expect(get('client', 'c1')?.code).toBe('A');
    const log = await readAudit();
    expect(log.map((e) => e.action)).toEqual(['backup.restore']);
    expect((await verifyAudit()).ok).toBe(true);
  });
});
