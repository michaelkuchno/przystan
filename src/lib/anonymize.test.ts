import { describe, expect, it } from 'vitest';
import { anonymize, nameTokens } from './anonymize';

const O = { names: ['KW-16', 'Jan Kowalski'], person: '[osoba]', removed: '[usunięto]' };

describe('anonymize', () => {
  it('replaces client codes and every part of a full name', () => {
    const r = anonymize('Rozmowa z KW-16. Pan Kowalski (Jan) był spokojny. Jan Kowalski zgodził się.', O);
    expect(r.text).toBe('Rozmowa z [osoba]. Pan [osoba] ([osoba]) był spokojny. [osoba] zgodził się.');
    expect(r.count).toBe(4);
  });

  it('does not replace other words that only start like a short name', () => {
    expect(anonymize('Janusz nie dotyczy? Jan tak.', O).text).toBe('Janusz nie dotyczy? [osoba] tak.');
  });

  it('replaces inflected forms of names (Polish declension)', () => {
    const r = anonymize('Rozmowa z Kowalskim i matką Kowalskiego. Tomka Nowaka nie było, Ewie przekazano.', {
      ...O,
      names: ['Jan Kowalski', 'Tomek Nowak', 'Ewa'],
    });
    expect(r.text).toBe('Rozmowa z [osoba] i matką [osoba]. [osoba] [osoba] nie było, [osoba] przekazano.');
  });

  it('removes contact data and national ids', () => {
    const r = anonymize(
      'Mail: jan.k@example.com, tel. 600 123 456, +41 79 123 45 67, 079 123 45 67, PESEL 02270803628, AHV 756.1234.5678.97',
      O,
    );
    expect(r.text).not.toMatch(/example|600 123|79 123|02270803628|756\.1234/);
    expect(r.count).toBe(6);
  });

  it('removes addresses and postal codes', () => {
    const r = anonymize('Mieszka przy ul. Długa 5/3, 00-950 Warszawa. Neu: Bahnhofstrasse 12, 3011 Bern.', O);
    expect(r.text).not.toMatch(/Długa|00-950|Bahnhofstrasse|3011/);
  });

  it('keeps only month and year of exact dates', () => {
    expect(anonymize('Spotkanie 2026-03-14 oraz 5.4.2026.', O).text).toBe('Spotkanie 2026-03 oraz 04.2026.');
  });

  it('leaves ordinary professional text intact', () => {
    const s = 'Zajęcia profilaktyczne w klasie 7b, 45 min, metoda dramy. Wnioski: grupa zaangażowana.';
    expect(anonymize(s, O)).toEqual({ text: s, count: 0 });
  });

  it('name tokens: longest first, short parts and lowercase words skipped', () => {
    expect(nameTokens(['Anna Maria Nowak', 'AK'])).toEqual(['Anna Maria Nowak', 'Maria', 'Nowak', 'Anna', 'AK']);
  });
});
