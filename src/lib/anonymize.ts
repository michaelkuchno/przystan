/**
 * Removes identifying data from free text before it leaves the app (PDF exports: practice log,
 * anonymous case study). Best effort – the user always sees a preview before exporting.
 *
 * Replaced:
 *  - known identifiers of clients: codes / initials, full names (and each part of the name),
 *  - e-mail addresses, phone numbers, Polish PESEL, Swiss AHV numbers, IBANs,
 *  - exact dates (YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY) → only the month and year are kept,
 *  - street addresses ("ul. Długa 5", "Bahnhofstrasse 12"), postal codes with towns.
 */

export interface AnonymizeOptions {
  /** Codes / initials / names of people that must not appear (client.code, client.fullName). */
  names: string[];
  /** Replacement for a person ("[osoba]", "[person]", "[Person]"). */
  person: string;
  /** Replacement for other removed data ("[usunięto]"…). */
  removed: string;
}

export interface AnonymizeResult {
  text: string;
  /** How many fragments were replaced. */
  count: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Regex for a name incl. inflected forms (Polish declension, German genitive "-s"):
 * Nowak → Nowaka, Nowakowi; Ewa → Ewy, Ewie, Ewą; Tomek → Tomka; Kowalski → Kowalskiego.
 * Codes (digits, hyphens) and short tokens (≤ 3 letters) match only exactly.
 */
function namePattern(token: string): string {
  if (!/^[\p{L}]+$/u.test(token)) return escape(token);
  const lower = token.toLowerCase();
  // 3-letter names inflect only when they end in a vowel (Ewa → Ewy); "Jan" must not match "Janusz"
  const properName = /^\p{Lu}\p{Ll}+$/u.test(token);
  if (token.length < 3 || (token.length === 3 && !(properName && /[aeiouy]$/.test(lower)))) return escape(token);
  if (lower.endsWith('ek')) return `${escape(token.slice(0, -2))}(?:ek|k)\\p{L}{0,4}`;
  if (/[aeiouyąęó]$/.test(lower)) return `${escape(token.slice(0, -1))}\\p{L}{0,4}`;
  return `${escape(token)}\\p{L}{0,4}`;
}

/** Name fragments to look for: the full value and every part of a full name (≥ 3 letters). */
export function nameTokens(names: string[]): string[] {
  const out = new Set<string>();
  for (const raw of names) {
    const n = raw.trim();
    if (n.length < 2) continue;
    out.add(n);
    for (const part of n.split(/[\s,]+/)) if (part.length >= 3 && /\p{Lu}/u.test(part[0]!)) out.add(part);
  }
  // longest first, so "Jan Kowalski" is replaced before "Jan"
  return [...out].sort((a, b) => b.length - a.length);
}

const PATTERNS: { re: RegExp; kind: 'removed' | 'date' }[] = [
  { re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, kind: 'removed' }, // e-mail
  { re: /\b756[.\s]?\d{4}[.\s]?\d{4}[.\s]?\d{2}\b/g, kind: 'removed' }, // AHV / AVS
  { re: /\b[A-Z]{2}\d{2}(?:\s?[\dA-Z]{4}){3,7}(?:\s?[\dA-Z]{1,3})?\b/g, kind: 'removed' }, // IBAN
  { re: /\b\d{11}\b/g, kind: 'removed' }, // PESEL
  { re: /(?:\+|00)\d{2}[\s-]?\d{2,3}(?:[\s-]?\d{2,3}){2,4}\b/g, kind: 'removed' }, // international phone
  { re: /\b0\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, kind: 'removed' }, // Swiss phone 079 123 45 67
  { re: /\b\d{3}[\s-]\d{3}[\s-]\d{3}\b/g, kind: 'removed' }, // Polish phone 600 123 456
  { re: /\b(?:ul\.|ulica|al\.|aleja|os\.|pl\.)\s*\p{Lu}[\p{L}.-]*(?:\s\p{Lu}?[\p{L}.-]+)*\s\d+[a-z]?(?:\/\d+)?/gu, kind: 'removed' }, // PL street
  { re: /\b\p{Lu}[\p{L}-]*(?:strasse|gasse|weg|platz|allee|rain|matte)\s\d+[a-z]?\b/giu, kind: 'removed' }, // CH/DE street
  { re: /\b\d{2}-\d{3}\s\p{Lu}[\p{L}-]+/gu, kind: 'removed' }, // PL postal code + town
  { re: /\b(?:CH-)?\d{4}\s\p{Lu}[\p{L}-]+(?:\s(?:bei|an der)\s\p{Lu}[\p{L}-]+)?/gu, kind: 'removed' }, // CH postal code + town
  { re: /\b(\d{4})-(\d{2})-\d{2}\b/g, kind: 'date' }, // 2026-03-14
  { re: /\b\d{1,2}[./](\d{1,2})[./](\d{4})\b/g, kind: 'date' }, // 14.03.2026
];

export function anonymize(text: string, o: AnonymizeOptions): AnonymizeResult {
  if (!text) return { text: '', count: 0 };
  let count = 0;
  let out = text;
  for (const token of nameTokens(o.names)) {
    // whole words only, case-sensitive for short codes, insensitive for longer names
    const flags = token.length <= 3 ? 'gu' : 'giu';
    const re = new RegExp(`(?<![\\p{L}\\d])${namePattern(token)}(?![\\p{L}\\d])`, flags);
    out = out.replace(re, () => {
      count++;
      return o.person;
    });
  }
  for (const { re, kind } of PATTERNS) {
    out = out.replace(re, (...m: string[]) => {
      count++;
      if (kind === 'date') {
        // keep only month / year: "2026-03" or "03.2026"
        return m[0]!.includes('-') ? `${m[1]}-${m[2]}` : `${m[1]!.padStart(2, '0')}.${m[2]}`;
      }
      return o.removed;
    });
  }
  return { text: out, count };
}
