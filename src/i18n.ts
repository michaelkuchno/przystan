import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Lang, Term } from '@/lib/prefs';

const modules = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/*.json', { eager: true });

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, mod] of Object.entries(modules)) {
  const m = path.match(/locales\/(\w+)\/(\w+)\.json$/);
  if (!m) continue;
  const [, lng, ns] = m as unknown as [string, string, string];
  (resources[lng] ??= {})[ns] = mod.default;
}

export const NAMESPACES = Object.keys(resources.pl ?? {});

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
};

export function termVars(lang: Lang, term: Term): Record<string, string> {
  const v = TERMS[lang][term];
  // EN has no cases – reuse the base forms
  return {
    clientGen: v.client!,
    clientsGen: v.clients!,
    clientDat: v.client!,
    ...v,
  };
}

export function initI18n(lang: Lang, term: Term) {
  return i18n.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: 'pl',
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false, defaultVariables: termVars(lang, term) },
    returnNull: false,
  });
}

export async function changeLanguage(lang: Lang, term: Term) {
  i18n.options.interpolation = { ...i18n.options.interpolation, defaultVariables: termVars(lang, term) };
  await i18n.changeLanguage(lang);
}

export function setTerm(lang: Lang, term: Term) {
  i18n.options.interpolation = { ...i18n.options.interpolation, defaultVariables: termVars(lang, term) };
  // force re-render of translated components
  i18n.emit('languageChanged', lang);
}

export default i18n;
