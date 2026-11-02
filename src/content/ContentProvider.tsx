import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ContentBundle, ContentKind, ReviewStatus } from './types';
import { CONTENT_KINDS } from './types';
import type { Lang } from '@/lib/prefs';
import { usePrefs } from '@/lib/prefs';

const loaders = import.meta.glob<{ default: unknown }>('../locales/*/content/*.json');

const cache = new Map<Lang, ContentBundle>();

export async function loadContent(lang: Lang): Promise<ContentBundle> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const entries = await Promise.all(
    CONTENT_KINDS.map(async (kind) => {
      const loader = loaders[`../locales/${lang}/content/${kind}.json`];
      if (!loader) throw new Error(`missing content ${lang}/${kind}`);
      return [kind, (await loader()).default] as const;
    }),
  );
  const bundle = Object.fromEntries(entries) as unknown as ContentBundle;
  cache.set(lang, bundle);
  return bundle;
}

const Ctx = createContext<ContentBundle | null>(null);

export function ContentProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { lang } = usePrefs();
  const [bundle, setBundle] = useState<ContentBundle | null>(() => cache.get(lang) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadContent(lang)
      .then((b) => alive && setBundle(b))
      .catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [lang]);

  if (error) return <div role="alert">{error}</div>;
  if (!bundle) return <>{fallback}</>;
  return <Ctx.Provider value={bundle}>{children}</Ctx.Provider>;
}

export function useContent(): ContentBundle;
export function useContent<K extends ContentKind>(kind: K): ContentBundle[K];
export function useContent(kind?: ContentKind) {
  const b = useContext(Ctx);
  if (!b) throw new Error('ContentProvider missing');
  return kind ? b[kind] : b;
}

/** Effective review status: local override (prefs) or the content default. */
export function useReviewStatus(id: string, fallback: ReviewStatus): ReviewStatus {
  const { review } = usePrefs();
  return review[id] ?? fallback;
}
