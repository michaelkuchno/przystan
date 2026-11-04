/**
 * Pseudonymisation before anything client-related may go to the cloud (D-053).
 *
 * Unlike `anonymize` (exports: data is removed), identifiers are replaced by stable placeholders
 * – "[Osoba A]", "[Placówka 1]" – and the mapping stays on the device, so the AI answer can be
 * turned back into readable text locally (`restore`). The user always sees the exact outgoing
 * text before it is sent (CloudPreview), so this is a safety net, not the only safeguard.
 *
 * Replaced: known names (clients, family members – incl. inflected forms), common Polish /
 * German / Swiss first names and the capitalised word after them, "Pan/Pani/Herr/Frau X",
 * dates (birth dates incl. "ur."), street addresses, postal code + town, phones, e-mails,
 * PESEL, AHV, IBAN, names of facilities (schools, centres, prisons, clinics …).
 */
import { namePattern, nameTokens } from '@/lib/anonymize';
import type { Lang } from '@/lib/prefs';

export type PlaceholderKind = 'person' | 'facility' | 'date' | 'address' | 'phone' | 'email' | 'id';

const LABELS: Record<Lang, Record<PlaceholderKind, string>> = {
  pl: { person: 'Osoba', facility: 'Placówka', date: 'Data', address: 'Adres', phone: 'Telefon', email: 'E-mail', id: 'Numer' },
  en: { person: 'Person', facility: 'Facility', date: 'Date', address: 'Address', phone: 'Phone', email: 'E-mail', id: 'Number' },
  de: {
    person: 'Person',
    facility: 'Einrichtung',
    date: 'Datum',
    address: 'Adresse',
    phone: 'Telefon',
    email: 'E-Mail',
    id: 'Nummer',
  },
};

/**
 * Frequent first names (PL, DE/CH) – catches people the app does not know (a brother, a teacher).
 * Short list on purpose: names that are also common words ("Róża", "Wiktoria"? no – "Mai", "Will") are left out.
 */
const FIRST_NAMES = (
  'Adam Adrian Agata Agnieszka Aleksander Aleksandra Alicja Amelia Andrzej Aneta Anna Antoni Arkadiusz Artur Barbara Bartek ' +
  'Bartosz Beata Bogdan Bożena Damian Daniel Danuta Dariusz Dawid Dominik Dominika Dorota Edyta Elżbieta Emilia Ewa Ewelina ' +
  'Filip Franciszek Gabriela Grażyna Grzegorz Halina Hanna Helena Hubert Igor Iwona Jacek Jadwiga Jakub Janina Jarosław Joanna ' +
  'Jolanta Józef Julia Julian Justyna Kacper Kamil Kamila Karol Karolina Katarzyna Kinga Klaudia Krystyna Krzysztof Kuba Lena ' +
  'Leszek Łukasz Maciej Magdalena Maja Małgorzata Marcin Marek Maria Mariusz Marta Marzena Mateusz Michał Mikołaj Milena ' +
  'Monika Natalia Nikola Norbert Oliwia Oliwer Patryk Paulina Paweł Piotr Przemysław Rafał Renata Robert Roman Ryszard ' +
  'Sebastian Stanisław Szymon Tadeusz Teresa Tomasz Tomek Urszula Wanda Weronika Wiesław Wiktor Wiktoria Witold Wojciech ' +
  'Zbigniew Zofia Zuzanna Zdzisław ' +
  'Andreas Beat Christian Christoph Daniela Dominique Elias Fabian Florian Gabriel Hans Heidi Jan Jonas Juerg Jürg Kurt Lara ' +
  'Laura Leon Leonie Lukas Luca Manuel Marco Markus Martin Matthias Mia Nicole Noah Peter Rahel Reto Sabine Sandra Simon ' +
  'Stefan Stephanie Thomas Ueli Urs Ursula Yannick Thomas Michael Sarah Lea Nina Tim Tobias Ruedi Werner'
).split(/\s+/);

const FACILITY_HEADS =
  '(?:Młodzieżowy Ośrodek (?:Wychowawczy|Socjoterapii)|Ośrodek|Szkoła(?: Podstawowa)?|Liceum|Technikum|Zakład Karny|Areszt Śledczy|' +
  'Zakład Poprawczy|Schronisko dla Nieletnich|Poradnia|Szpital|Przychodnia|Fundacja|Stowarzyszenie|Monar|Dom Dziecka|' +
  'Klinik|Klinikum|Spital|Schule|Gymnasium|Sekundarschule|Justizvollzugsanstalt|Heim|Wohnheim|Stiftung|Verein|Fachstelle|' +
  'Beratungsstelle|Massnahmenzentrum|Jugendheim|Kantonsspital|Universitätsklinik|MOW|MOS|JVA)';

interface Rule {
  re: RegExp;
  kind: PlaceholderKind;
}

const RULES: Rule[] = [
  { re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, kind: 'email' },
  { re: /\b756[.\s]?\d{4}[.\s]?\d{4}[.\s]?\d{2}\b/g, kind: 'id' }, // AHV
  { re: /\b[A-Z]{2}\d{2}(?:\s?[\dA-Z]{4}){3,7}(?:\s?[\dA-Z]{1,3})?\b/g, kind: 'id' }, // IBAN
  { re: /\b\d{11}\b/g, kind: 'id' }, // PESEL
  { re: /(?:\+|00)\d{2}[\s-]?\d{2,3}(?:[\s-]?\d{2,3}){2,4}\b/g, kind: 'phone' },
  { re: /\b0\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, kind: 'phone' },
  { re: /\b\d{3}[\s-]\d{3}[\s-]\d{3}\b/g, kind: 'phone' },
  {
    re: /\b(?:ul\.|ulica|ulicy|al\.|aleja|alei|os\.|osiedle|osiedlu|pl\.)\s*\p{Lu}[\p{L}.-]*(?:\s\p{Lu}?[\p{L}.-]+)*\s\d+[a-z]?(?:\/\d+)?/gu,
    kind: 'address',
  },
  { re: /\b\p{Lu}[\p{L}-]*(?:strasse|straße|gasse|weg|platz|allee|rain|matte)\s\d+[a-z]?\b/giu, kind: 'address' },
  { re: /\b\d{2}-\d{3}\s\p{Lu}[\p{L}-]+/gu, kind: 'address' },
  { re: /\b(?:CH-)?\d{4}\s\p{Lu}[\p{L}-]+(?:\s(?:bei|an der)\s\p{Lu}[\p{L}-]+)?/gu, kind: 'address' },
  // dates – the whole date, also with "ur." / "geb." and written months
  { re: /\b\d{4}-\d{2}-\d{2}\b/g, kind: 'date' },
  { re: /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g, kind: 'date' },
  {
    re: /\b\d{1,2}\.?\s(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|may|june|july|october|december)\s\d{4}\b/giu,
    kind: 'date',
  },
  // facilities: "Zakład Karny w Wronkach", "MOW nr 3", "Schule Bümpliz", "Ośrodek „Nadzieja”"
  {
    re: new RegExp(
      `\\b${FACILITY_HEADS}(?:\\s(?:nr|Nr\\.?|im\\.|w|we|in|an der|„[^”]+”|"[^"]+"|\\d+|\\p{Lu}[\\p{L}-]+)){1,4}`,
      'gu',
    ),
    kind: 'facility',
  },
];

export interface PseudonymizeOptions {
  lang: Lang;
  /** Names known to the app (client full names, codes, family members from the genogram …). */
  names: string[];
}

export interface Pseudonymized {
  text: string;
  /** placeholder → original */
  map: Map<string, string>;
  count: number;
}

const letter = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : `A${i - 25}`);

export function pseudonymize(text: string, o: PseudonymizeOptions): Pseudonymized {
  const L = LABELS[o.lang];
  const map = new Map<string, string>();
  const byOriginal = new Map<string, string>();
  const counters: Record<PlaceholderKind, number> = { person: 0, facility: 0, date: 0, address: 0, phone: 0, email: 0, id: 0 };
  let count = 0;
  const placeholder = (kind: PlaceholderKind, original: string, key = original.toLowerCase()) => {
    count++;
    const hit = byOriginal.get(`${kind}:${key}`);
    if (hit) return hit;
    const n = counters[kind]++;
    const ph = `[${L[kind]} ${kind === 'person' ? letter(n) : n + 1}]`;
    byOriginal.set(`${kind}:${key}`, ph);
    map.set(ph, original);
    return ph;
  };

  let out = text;
  // 1) structured identifiers first (so digits of a phone are not taken as a date)
  for (const r of RULES) out = out.replace(r.re, (m) => placeholder(r.kind, m));

  // 2) known names – a person keeps one placeholder for all forms of the name
  const known = nameTokens(o.names);
  const personKey = (token: string) => {
    // all parts of one full name share the key of the full name
    const full = o.names.find((n) => n.split(/[\s,]+/).includes(token)) ?? token;
    return full.toLowerCase();
  };
  for (const token of known) {
    const flags = token.length <= 3 ? 'gu' : 'giu';
    const re = new RegExp(`(?<![\\p{L}\\d\\[])${namePattern(token)}(?![\\p{L}\\d\\]])`, flags);
    out = out.replace(re, (m) => placeholder('person', m, personKey(token)));
  }

  // 3) titles + surname: "Pan Nowak", "pani Zielińskiej", "Herr Müller", "Frau Meier"
  out = out.replace(
    /(?<![\p{L}])((?:[Pp]an(?:a|u|em|i|ią)?|[Hh]err(?:n)?|[Ff]rau|Mr\.?|Mrs\.?|Ms\.?)\s)(\p{Lu}\p{Ll}+(?:-\p{Lu}\p{Ll}+)?)/gu,
    (_m, title: string, name: string) => title + placeholder('person', name),
  );

  // 4) common first names (+ an immediately following capitalised surname)
  const firstRe = new RegExp(
    `(?<![\\p{L}\\[])(${FIRST_NAMES.map((n) => namePattern(n)).join('|')})(\\s\\p{Lu}\\p{Ll}+(?:-\\p{Lu}\\p{Ll}+)?)?(?![\\p{L}\\]])`,
    'gu',
  );
  out = out.replace(firstRe, (m: string, first: string, sur?: string) => {
    // the matched token must start with a capital letter (Polish words like "maja" = "May")
    if (!/^\p{Lu}/u.test(first)) return m;
    const base = FIRST_NAMES.find((n) => new RegExp(`^${namePattern(n)}$`, 'u').test(first)) ?? first;
    // a following capitalised word is a surname unless it starts a sentence-like phrase
    const surname = sur && !/^\s(?:I|A|W|Z|Na|Do|Po|Und|Der|Die|Das|The)$/u.test(sur) ? sur : '';
    return placeholder('person', first + surname, (base + surname).toLowerCase()) + (surname ? '' : (sur ?? ''));
  });

  return { text: out, map, count };
}

/** Puts the originals back into a text that came back from the AI. */
export function restore(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [ph, original] of map) out = out.split(ph).join(original);
  return out;
}

/** Restores placeholders in every string of a JSON-like value. */
export function restoreDeep<T>(value: T, map: Map<string, string>): T {
  if (typeof value === 'string') return restore(value, map) as T;
  if (Array.isArray(value)) return value.map((v) => restoreDeep(v, map)) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restoreDeep(v, map)])) as T;
  return value;
}
