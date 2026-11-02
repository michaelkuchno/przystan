import { beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { db, defineSchema, resetDbForTests, DB_VERSION } from './db';
import { setupVault, unlock, lock, changePassword, isUnlocked } from './vault';
import { all, get, loadSpace, remove, save, clearStore, purgeDeleted } from './store';
import { createBackup, parseBackup, restoreBackup, serializeBackup, BackupError } from './backup';
import { WrongPasswordError } from './crypto';
import type { Client } from '@/domain/types';

const IT = 1000;
let n = 0;

function client(id: string, code = 'AB-1'): Client {
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
    strengths: 'gotuje',
    supportNetwork: '',
    family: '',
    education: '',
    keyDates: [],
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(async () => {
  resetDbForTests(`test-${++n}`);
  lock();
  clearStore();
});

describe('vault + store', () => {
  it('stores records encrypted at rest', async () => {
    await setupVault('hasło-123', IT);
    await loadSpace('practice');
    await save('client', client('c1', 'TAJNY-KOD'));
    const raw = await db.records.get('c1');
    expect(raw?.kind).toBe('client');
    expect(JSON.stringify(raw)).not.toContain('TAJNY-KOD');
    expect(JSON.stringify(raw)).not.toContain('gotuje');
  });

  it('reloads data after lock/unlock and rejects wrong password', async () => {
    await setupVault('hasło-123', IT);
    await loadSpace('practice');
    await save('client', client('c1'));
    lock();
    clearStore();
    expect(isUnlocked()).toBe(false);
    await expect(unlock('złe')).rejects.toBeInstanceOf(WrongPasswordError);
    await unlock('hasło-123');
    await loadSpace('practice');
    expect(get('client', 'c1')?.code).toBe('AB-1');
  });

  it('isolates practice and demo spaces', async () => {
    await setupVault('hasło-123', IT);
    await loadSpace('practice');
    await save('client', client('p1'));
    await loadSpace('demo');
    expect(all('client')).toHaveLength(0);
    await save('client', client('d1'));
    await loadSpace('practice');
    expect(all('client').map((c) => c.id)).toEqual(['p1']);
  });

  it('soft-deletes a client with related records and supports undo', async () => {
    await setupVault('hasło-123', IT);
    await loadSpace('practice');
    await save('client', client('c1'));
    await save('event', { id: 'e1', clientId: 'c1', date: '2026-01-01', type: 'other', title: 't', note: '' });
    const undo = await remove('client', 'c1');
    expect(get('client', 'c1')).toBeUndefined();
    expect(all('event')).toHaveLength(0);
    await undo();
    expect(get('client', 'c1')).toBeDefined();
    expect(all('event')).toHaveLength(1);
    await remove('event', 'e1');
    await purgeDeleted(-1000);
    expect(await db.records.get('e1')).toBeUndefined();
  });

  it('keeps data readable after a password change', async () => {
    await setupVault('stare-hasło', IT);
    await loadSpace('practice');
    await save('client', client('c1'));
    await changePassword('stare-hasło', 'nowe-hasło', IT);
    lock();
    await unlock('nowe-hasło');
    await loadSpace('practice');
    expect(get('client', 'c1')).toBeDefined();
  });
});

describe('backup', () => {
  it('exports and restores an encrypted backup', async () => {
    await setupVault('hasło-123', IT);
    await loadSpace('practice');
    await save('client', client('c1', 'KOD-X'));
    const text = serializeBackup(await createBackup('test'));
    expect(text).not.toContain('KOD-X');

    resetDbForTests(`restore-${n}`);
    lock();
    await expect(restoreBackup(text, 'złe')).rejects.toMatchObject({ code: 'wrong-password' });
    const r = await restoreBackup(text, 'hasło-123');
    expect(r.records).toBe(1);
    expect(isUnlocked()).toBe(true);
    await loadSpace('practice');
    expect(get('client', 'c1')?.code).toBe('KOD-X');
  });

  it('rejects invalid and newer-version files', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"format":"x"}')).toThrow(BackupError);
    const future = JSON.stringify({
      format: 'przystan-backup',
      version: 99,
      records: [],
      vault: { salt: 'a', iterations: 1, wrappedDek: { iv: 'a', ct: 'b' } },
    });
    expect(() => parseBackup(future)).toThrow(expect.objectContaining({ code: 'unsupported-version' }));
  });

  it('detects a corrupted record before touching local data', async () => {
    await setupVault('hasło-123', IT);
    await loadSpace('practice');
    await save('client', client('c1'));
    const b = await createBackup('test');
    b.records[0]!.id = 'other-id'; // AAD mismatch
    await save('client', client('local'));
    await expect(restoreBackup(serializeBackup(b), 'hasło-123')).rejects.toMatchObject({ code: 'corrupted' });
    expect(await db.records.get('local')).toBeDefined();
  });
});

describe('migrations', () => {
  it('upgrades a version 1 database to the current schema', async () => {
    const name = `mig-${n}`;
    const v1 = new Dexie(name);
    defineSchema(v1, 1);
    await v1.open();
    await v1.table('records').put({
      id: 'r1',
      kind: 'client',
      space: 'practice',
      clientId: 'r1',
      updatedAt: 1,
      data: { iv: 'x', ct: 'y' },
    });
    v1.close();

    const current = resetDbForTests(name);
    await current.open();
    expect(current.verno).toBe(DB_VERSION);
    const row = await current.records.get('r1');
    expect(row?.deletedAt).toBe(0);
    expect(await current.records.where('[space+kind]').equals(['practice', 'client']).count()).toBe(1);
  });
});
