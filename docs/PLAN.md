# Plan realizacji – Przystań / Harbor

Źródło wymagań: [`docs/SPEC.md`](SPEC.md). Status bieżący: [`docs/PROGRESS.md`](PROGRESS.md). Decyzje: [`docs/DECISIONS.md`](DECISIONS.md).

## Architektura w skrócie

```
src/
  domain/types.ts          model domenowy (podopieczny, diagnoza, IPR, spotkanie, pomiar, …)
  content/types.ts         kształt treści merytorycznych (PL/EN)
  locales/{pl,en}/*.json   teksty interfejsu (i18next, przestrzenie nazw)
  locales/{pl,en}/content/ treści merytoryczne (wiedza, scenariusze, talie, dane demo, …)
  lib/
    crypto.ts              PBKDF2 → klucz KEK, losowy klucz danych DEK, AES-GCM
    db.ts                  Dexie: tabele `records` (zaszyfrowane), `meta`, `prefs`; migracje
    vault.ts               zakładanie/odblokowanie/zmiana hasła, blokada
    repo.ts                CRUD rekordów z szyfrowaniem, przestrzeń praktyczna/demo
    backup.ts              eksport/import zaszyfrowanej kopii z walidacją
    screening/             AUDIT, AUDIT-C, DUDIT: pozycje, punktacja, progi
    srs.ts                 algorytm SM-2
    attention.ts           reguły „Do zwrócenia uwagi”
    referral.ts            kreator skierowania
    demo.ts                zasilenie przestrzeni demo
    pdf.ts                 raporty PDF (pdfmake, offline)
    platform.ts            haptyka, udostępnianie/zapis plików (Capacitor / Web)
  components/ui/           design system (Button, Card, Field, Sheet, Tabs, …)
  features/<moduł>/        ekrany modułów
```

## Etapy (zgodnie z sekcją 8 specyfikacji)

1. Szkielet: Vite + React + TS strict, Tailwind v4 + tokeny, i18n PL/EN, hash routing, PWA, Capacitor Android, CI.
2. Warstwa danych: Dexie, szyfrowanie, hasło, blokada, migracje, kopia zapasowa.
3. Onboarding, tryby praktyczny/szkoleniowy, dane demo.
4. Podopieczni: profil, diagnoza (radar), IPR, plan zapobiegania nawrotom, oś czasu, genogram/ekomapa.
5. Spotkania, notatki (przebieg / DAP / obserwacja), kreator zajęć („przepis”).
6. Narzędzia interaktywne (12) z trybem „pokaż podopiecznemu”.
7. Narzędzia przesiewowe i wykresy.
8. Profilaktyka – kreator programu w 7 krokach z ewaluacją i PDF.
9. Resocjalizacja, rodzina, system pomocy, kreator skierowania.
10. Baza wiedzy, wyszukiwarka globalna.
11. Symulator rozmowy motywującej.
12. Nauka: fiszki SM-2, tryb egzaminu.
13. Pulpit, wskaźniki uwagi, raporty PDF, tryb prezentacji.
14. Szlif UX, dostępność, wydajność, E2E, Lighthouse.
15. Build APK (podpisany), GitHub Pages, dokumentacja.

## Podział pracy

Treści merytoryczne (PL/EN) powstają równolegle jako pliki JSON o ściśle określonym kształcie
(`src/content/types.ts`) i są automatycznie sprawdzane testem `src/content/content.test.ts`
(zgodność struktury PL/EN, poprawność odwołań, spójność wyników przesiewowych w danych demo,
poprawność grafów scenariuszy). Kod aplikacji nie zależy od konkretnej treści.
