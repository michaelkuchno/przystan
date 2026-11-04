/**
 * Semantic search over the app's content and the user's notes (D-056). Vectors are computed on the
 * device (multilingual-e5-small), stored encrypted with the data key and updated incrementally
 * (only changed documents are embedded again). Notes never leave the device.
 */
import { db } from '@/lib/db';
import { decryptJson, encryptJson, fromB64, toB64, type Cipher } from '@/lib/crypto';
import { getKey } from '@/lib/vault';
import type { Embedder } from '@/lib/ai/types';
import { EMBED_MODEL } from '@/lib/ai/local/catalog';
import { norm } from '@/features/search/searchIndex';

export interface AskDoc {
  id: string;
  kind: string;
  title: string;
  body: string;
  to: string;
}

export interface Hit {
  doc: AskDoc;
  score: number;
}

interface StoredIndex {
  model: string;
  items: Record<string, { h: number; v: string }>;
}

const keyOf = (d: AskDoc) => `${d.kind}:${d.id}`;
export const docText = (d: AskDoc) => `${d.title}. ${d.body}`.slice(0, 1200);

/** FNV-1a – detects changed documents. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

const encode = (v: Float32Array) => toB64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
const decode = (s: string) => new Float32Array(fromB64(s).buffer);

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i]! * b[i]!;
  return s;
}

/** Brings the index up to date and returns the vectors of all current documents. */
export async function updateIndex(
  scope: string,
  docs: AskDoc[],
  embedder: Embedder,
  model = EMBED_MODEL,
  onProgress?: (fraction: number) => void,
): Promise<Map<string, Float32Array>> {
  const meta = `aiIndex:${scope}`;
  const aad = `ai:index:${scope}`;
  let stored: StoredIndex = { model, items: {} };
  const row = (await db.meta.get(meta))?.value as Cipher | undefined;
  if (row) {
    try {
      const s = await decryptJson<StoredIndex>(getKey(), row, aad);
      if (s.model === model) stored = s;
    } catch {
      /* corrupt or old – rebuild */
    }
  }
  const out = new Map<string, Float32Array>();
  const todo: { key: string; text: string; h: number }[] = [];
  for (const d of docs) {
    const key = keyOf(d);
    const text = docText(d);
    const h = hash(text);
    const have = stored.items[key];
    if (have && have.h === h) out.set(key, decode(have.v));
    else todo.push({ key, text, h });
  }
  const items: StoredIndex['items'] = {};
  for (const d of docs) {
    const k = keyOf(d);
    if (stored.items[k] && out.has(k)) items[k] = stored.items[k]!;
  }
  const BATCH = 8;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const vecs = await embedder.embed(
      batch.map((b) => b.text),
      'passage',
    );
    batch.forEach((b, j) => {
      out.set(b.key, vecs[j]!);
      items[b.key] = { h: b.h, v: encode(vecs[j]!) };
    });
    onProgress?.(Math.min(1, (i + batch.length) / todo.length));
  }
  if (todo.length || Object.keys(items).length !== Object.keys(stored.items).length)
    await db.meta.put({ key: meta, value: await encryptJson(getKey(), { model, items } satisfies StoredIndex, aad) });
  onProgress?.(1);
  return out;
}

export function semanticSearch(query: Float32Array, docs: AskDoc[], vectors: Map<string, Float32Array>, k = 8): Hit[] {
  return docs
    .map((doc) => ({ doc, score: vectors.has(keyOf(doc)) ? dot(query, vectors.get(keyOf(doc))!) : -1 }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Fallback without the embedding model: ranks by how many (stemmed) words of the question occur. */
export function keywordSearch(query: string, docs: AskDoc[], k = 8): Hit[] {
  const terms = [...new Set(norm(query).split(/[^\p{L}\d]+/u))]
    .filter((w) => w.length > 3)
    .map((w) => w.slice(0, Math.max(4, w.length - 2)));
  if (!terms.length) return [];
  return docs
    .map((doc) => {
      const title = norm(doc.title);
      const body = norm(doc.body);
      let score = 0;
      for (const w of terms) score += (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0);
      return { doc, score: score / terms.length };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
