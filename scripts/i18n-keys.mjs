// Lists i18n keys used in src (static ones), grouped by namespace.
// Dynamic keys (template literals) are reported with a "*" placeholder.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) && !p.includes('.test.') && files.push(p); });
walk('src');
const out = {};
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  const m = s.match(/useTranslation\(\s*'(\w+)'/);
  const def = m ? m[1] : 'common';
  const re = /\bt\(\s*(['`])((?:(?!\1).)+)\1/g;
  let x;
  while ((x = re.exec(s))) {
    let key = x[2].replace(/\$\{[^}]+\}/g, '*');
    let ns = def;
    const i = key.indexOf(':');
    if (i > 0 && /^\w+$/.test(key.slice(0, i))) { ns = key.slice(0, i); key = key.slice(i + 1); }
    (out[ns] ??= new Set()).add(key);
  }
}
for (const [ns, set] of Object.entries(out).sort()) console.log(`## ${ns}\n` + [...set].sort().join('\n'));
