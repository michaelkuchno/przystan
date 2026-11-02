// All UI namespaces of one language – bundled as a single lazily loaded chunk.
const files = import.meta.glob<{ default: Record<string, unknown> }>('./en/*.json', { eager: true });

export default Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [path.match(/\/(\w+)\.json$/)![1]!, mod.default]),
) as Record<string, Record<string, unknown>>;
