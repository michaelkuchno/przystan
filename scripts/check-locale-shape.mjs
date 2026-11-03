// Compares the structure of a translated JSON file with its reference (default: the EN file).
//   node scripts/check-locale-shape.mjs src/locales/de/content/knowledge.json [reference.json]
// Checks: same keys, same array lengths, identical identifiers / enum values / dates / numbers,
// no empty strings where the reference has text, and – for German – Swiss spelling (no "ß").
import { readFileSync } from 'node:fs';

const [, , target, refArg] = process.argv;
if (!target) {
  console.error('usage: node scripts/check-locale-shape.mjs <file> [reference]');
  process.exit(2);
}
const ref = refArg ?? target.replace(/locales[\\/](de|pl)[\\/]/, 'locales/en/');

// keep in sync with src/content/content.test.ts
const ID_KEYS = new Set([
  'id', 'section', 'category', 'kind', 'context', 'audience', 'talk', 'mood', 'next', 'start', 'skill', 'domain',
  'evidence', 'type', 'status', 'noteType', 'country', 'number', 'ingredientId', 'institutionIds', 'toolId',
  'reviewStatus', 'instrument', 'tool', 'band', 'sex', 'ageGroup', 'goal', 'stage', 'level', 'problems', 'from',
  'to', 'quality', 'module', 'stateAsOf', 'templateId', 'recipeIds', 'toolsUsed', 'clientId', 'meetingId', 'sense',
]);
const ENUM_VALUES = ['abstinence', 'harmReduction', 'undecided', 'youth', 'adult', 'both'];
const isUiFile = !/[\\/]content[\\/]/.test(target);

const errors = [];
function compare(a, b, path, key) {
  if (errors.length > 40) return;
  if (Array.isArray(b)) {
    if (!Array.isArray(a)) return void errors.push(`${path}: expected array`);
    if (a.length !== b.length) return void errors.push(`${path}: length ${a.length}, reference ${b.length}`);
    a.forEach((v, i) => compare(v, b[i], `${path}[${i}]`, key));
    return;
  }
  if (b && typeof b === 'object') {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return void errors.push(`${path}: expected object`);
    const strip = (k) => (isUiFile ? k.replace(/_(zero|one|two|few|many|other)$/, '') : k);
    const ka = [...new Set(Object.keys(a).map(strip))].sort();
    const kb = [...new Set(Object.keys(b).map(strip))].sort();
    if (ka.join() !== kb.join()) {
      errors.push(`${path}: keys differ – missing [${kb.filter((k) => !ka.includes(k))}] extra [${ka.filter((k) => !kb.includes(k))}]`);
      return;
    }
    for (const k of Object.keys(b)) if (k in a) compare(a[k], b[k], `${path}.${k}`, k);
    return;
  }
  if (typeof a !== typeof b) return void errors.push(`${path}: ${typeof a}, reference ${typeof b}`);
  if (typeof b === 'number' || typeof b === 'boolean') {
    if (a !== b) errors.push(`${path}: ${a}, reference ${b}`);
    return;
  }
  if (typeof b === 'string') {
    const isDate = /^@[+-]?\d+/.test(b) || /^\d{4}-\d{2}/.test(b);
    const textual = (key === 'goal' || key === 'audience') && !ENUM_VALUES.includes(b);
    if (!isUiFile && ((key && ID_KEYS.has(key) && !textual) || isDate)) {
      if (a !== b) errors.push(`${path}: "${a}", reference "${b}" (identifier – must not be translated)`);
    } else if (b.trim() !== '' && a.trim() === '' && key !== 'countryNote') errors.push(`${path}: empty`);
    if (isUiFile) {
      const vars = (s) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort().join();
      if (vars(a) !== vars(b)) errors.push(`${path}: interpolation variables differ: "${a}"`);
    }
    if (/[\\/]de[\\/]/.test(target) && a.includes('ß')) errors.push(`${path}: "ß" – Swiss spelling uses "ss"`);
  }
}

const A = JSON.parse(readFileSync(target, 'utf8'));
const B = JSON.parse(readFileSync(ref, 'utf8'));
compare(A, B, '$', undefined);
if (errors.length) {
  console.error(`✗ ${target} vs ${ref}\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`✓ ${target} matches ${ref}`);
