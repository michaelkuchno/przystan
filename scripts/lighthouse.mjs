// Runs Lighthouse (mobile) against a local `vite preview` server.
//
// The temporary Chrome profile is created in the OS temp directory (os.tmpdir()), never inside
// the project. Previously Lighthouse was started with a Windows TEMP path in a POSIX shell,
// which created folders literally named "C:\Users\...\lighthouse.XXXX" in the repository.
//
// Usage: npm run build && npm run preview  (in another terminal)
//        npm run lighthouse [-- <url>]
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173/';
const profile = mkdtempSync(join(tmpdir(), 'przystan-lighthouse-'));
const outDir = resolve('lighthouse-report');
mkdirSync(outDir, { recursive: true });

const env = { ...process.env, TMPDIR: tmpdir(), TEMP: tmpdir(), TMP: tmpdir() };
const result = spawnSync(
  'npx',
  [
    '--yes',
    'lighthouse@12.8.2',
    url,
    '--quiet',
    '--output=html',
    '--output=json',
    `--output-path=${join(outDir, 'report')}`,
    `--chrome-flags=--headless=new --user-data-dir=${profile}`,
  ],
  { stdio: 'inherit', env, shell: process.platform === 'win32' },
);

rmSync(profile, { recursive: true, force: true });
process.exit(result.status ?? 1);
