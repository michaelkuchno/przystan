import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Lang, Term } from '@/lib/prefs';

// UI strings are loaded per language (only the active one at start-up), one chunk each.
const bundles: Record<string, () => Promise<{ default: Record<string, Record<string, unknown>> }>> = {
  pl: () => import('./locales/pl'),
  en: () => import('./locales/en'),
  de: () => import('./locales/de'),
};

async function loadLanguage(lang: string): Promise<Record<string, Record<string, unknown>>> {
  return (await (bundles[lang] ?? bundles.pl!)()).default;
}

export const NAMESPACES = Object.keys(import.meta.glob('./locales/pl/*.json')).map((p) => p.match(/\/(\w+)\.json$/)![1]!);

async function ensureLanguage(lang: string) {
  if (i18n.hasResourceBundle(lang, 'common')) return;
  const bundle = await loadLanguage(lang);
  for (const [ns, res] of Object.entries(bundle)) i18n.addResourceBundle(lang, ns, res, true, true);
}

/** Terminology variants (settings → nazewnictwo), injected as interpolation variables. */
const TERMS: Record<Lang, Record<Term, Record<string, string>>> = {
  pl: {
    podopieczny: {
      client: 'podopieczny',
      Client: 'Podopieczny',
      clients: 'podopieczni',
      Clients: 'Podopieczni',
      clientGen: 'podopiecznego',
      clientsGen: 'podopiecznych',
      clientDat: 'podopiecznemu',
    },
    klient: {
      client: 'klient',
      Client: 'Klient',
      clients: 'klienci',
      Clients: 'Klienci',
      clientGen: 'klienta',
      clientsGen: 'klientów',
      clientDat: 'klientowi',
    },
    wychowanek: {
      client: 'wychowanek',
      Client: 'Wychowanek',
      clients: 'wychowankowie',
      Clients: 'Wychowankowie',
      clientGen: 'wychowanka',
      clientsGen: 'wychowanków',
      clientDat: 'wychowankowi',
    },
    uczestnik: {
      client: 'uczestnik',
      Client: 'Uczestnik',
      clients: 'uczestnicy',
      Clients: 'Uczestnicy',
      clientGen: 'uczestnika',
      clientsGen: 'uczestników',
      clientDat: 'uczestnikowi',
    },
  },
  en: {
    podopieczny: { client: 'service user', Client: 'Service user', clients: 'service users', Clients: 'Service users' },
    klient: { client: 'client', Client: 'Client', clients: 'clients', Clients: 'Clients' },
    wychowanek: { client: 'resident', Client: 'Resident', clients: 'residents', Clients: 'Residents' },
    uczestnik: { client: 'participant', Client: 'Participant', clients: 'participants', Clients: 'Participants' },
  },
  // Swiss usage: gender-inclusive slash forms; the forms do not change with the case here
  de: {
    podopieczny: { client: 'Klient/in', Client: 'Klient/in', clients: 'Klient/innen', Clients: 'Klient/innen' },
    klient: { client: 'Klient/in', Client: 'Klient/in', clients: 'Klient/innen', Clients: 'Klient/innen' },
    wychowanek: {
      client: 'Jugendliche/r',
      Client: 'Jugendliche/r',
      clients: 'Jugendliche',
      Clients: 'Jugendliche',
    },
    uczestnik: {
      client: 'Teilnehmer/in',
      Client: 'Teilnehmer/in',
      clients: 'Teilnehmer/innen',
      Clients: 'Teilnehmer/innen',
    },
  },
};

export function termVars(lang: Lang, term: Term): Record<string, string> {
  const v = TERMS[lang][term];
  // EN / DE: no case forms needed – reuse the base forms
  return {
    clientGen: v.client!,
    clientsGen: v.clients!,
    clientDat: v.client!,
    ...v,
  };
}

export async function initI18n(lang: Lang, term: Term) {
  const resources = { [lang]: await loadLanguage(lang) };
  await i18n.use(initReactI18next).init({
    resources,
    partialBundledLanguages: true,
    lng: lang,
    fallbackLng: 'pl',
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false, defaultVariables: termVars(lang, term) },
    returnNull: false,
  });
}

/**
 * Namespaces needed only after unlocking (the optional AI assistant) – kept out of the start-up
 * bundle so they do not delay the first paint. Loaded together with the content (ContentProvider).
 */
const lazyBundles = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/ai.json');
let lazyWanted = false;

export async function ensureLazyNamespaces(lang: string) {
  lazyWanted = true;
  if (i18n.hasResourceBundle(lang, 'ai')) return;
  const load = lazyBundles[`./locales/${lang}/ai.json`] ?? lazyBundles['./locales/pl/ai.json']!;
  i18n.addResourceBundle(lang, 'ai', (await load()).default, true, true);
}

export async function changeLanguage(lang: Lang, term: Term) {
  await ensureLanguage(lang);
  if (lazyWanted) await ensureLazyNamespaces(lang);
  i18n.options.interpolation = { ...i18n.options.interpolation, defaultVariables: termVars(lang, term) };
  await i18n.changeLanguage(lang);
}

export function setTerm(lang: Lang, term: Term) {
  i18n.options.interpolation = { ...i18n.options.interpolation, defaultVariables: termVars(lang, term) };
  // force re-render of translated components
  i18n.emit('languageChanged', lang);
}

export default i18n;
