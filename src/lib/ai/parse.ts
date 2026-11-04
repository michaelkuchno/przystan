/**
 * Robust parsing of model output. Models (especially small local ones) sometimes wrap JSON in
 * code fences, add prose around it, use trailing commas or smart quotes. Everything that comes
 * back is validated before use – a malformed answer becomes AiError('format'), never a crash.
 */
import { AiError } from './types';

/** Extracts the first balanced JSON object/array from text. */
export function extractJson(text: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const src = fenced ? fenced[1]! : text;
  const start = src.search(/[{[]/);
  if (start < 0) return null;
  const open = src[start]!;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open || c === (open === '{' ? '[' : '{')) depth++;
    else if (c === close || c === (close === '}' ? ']' : '}')) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  // truncated output: return what we have, the repair step may still save it
  return src.slice(start);
}

/** Light repairs: smart quotes, trailing commas, unclosed brackets of a truncated answer. */
export function repairJson(s: string): string {
  let out = s.replace(/[“”„]/g, '"').replace(/,\s*([}\]])/g, '$1');
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (const c of out) {
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, '');
  while (stack.length) out += stack.pop();
  return out;
}

export function parseJson(text: string): unknown {
  const raw = extractJson(text);
  if (!raw) throw new AiError('format', 'no JSON in the answer');
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(repairJson(raw));
    } catch {
      throw new AiError('format', 'invalid JSON');
    }
  }
}

/* ------------------------------------------------------------------ validators */

type Obj = Record<string, unknown>;

export function obj(v: unknown, what = 'value'): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new AiError('format', `${what}: object expected`);
  return v as Obj;
}

export function str(v: unknown, what = 'value', max = 4000): string {
  if (typeof v === 'number') v = String(v);
  if (typeof v !== 'string' || !v.trim()) throw new AiError('format', `${what}: text expected`);
  return v.trim().slice(0, max);
}

export function optStr(v: unknown, max = 4000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '';
}

export function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  const norm = v.trim();
  const hit = allowed.find((a) => a.toLowerCase() === norm.toLowerCase());
  return hit ?? fallback;
}

export function arr<T>(v: unknown, item: (x: unknown, i: number) => T, max = 50): T[] {
  if (!Array.isArray(v)) throw new AiError('format', 'array expected');
  const out: T[] = [];
  for (const [i, x] of v.slice(0, max).entries()) {
    try {
      out.push(item(x, i));
    } catch {
      /* skip unusable items, keep the good ones */
    }
  }
  return out;
}

export function strList(v: unknown, max = 20): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && !!x.trim())
    .map((x) => x.trim())
    .slice(0, max);
}
