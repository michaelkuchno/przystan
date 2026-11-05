// All UI namespaces of one language – bundled as a single lazily loaded chunk. The optional AI
// assistant, notifications and messages strings (ai, notify, messages) are loaded only after unlocking (src/i18n.ts, ensureLazyNamespaces).
const files = import.meta.glob<{ default: Record<string, unknown> }>(['./pl/*.json', '!./pl/ai.json', '!./pl/notify.json', '!./pl/messages.json', '!./pl/studies.json'], { eager: true });

export default Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [path.match(/\/(\w+)\.json$/)![1]!, mod.default]),
) as Record<string, Record<string, unknown>>;
