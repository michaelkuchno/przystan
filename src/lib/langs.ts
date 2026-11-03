import type { Lang } from './prefs';

/** Language names in their own language (never translated). */
export const LANG_META: Record<Lang, { name: string; flag: string }> = {
  pl: { name: 'Polski', flag: '🇵🇱' },
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch (Schweiz)', flag: '🇨🇭' },
};
