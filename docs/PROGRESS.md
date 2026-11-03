| 7 | Przypomnienie o kopii zapasowej (baner > 7 dni) | ✅ || 6 | Anonimowe studium przypadku: automatyczna anonimizacja, podgląd z edycją, PDF | ✅ || 5 | Notatnik i superwizja: tagi, wyszukiwanie, przypinanie, przypisania, zadania na Pulpicie, ukryte w prezentacji | ✅ || 4 | Dzienniczek praktyk: wpisy, licznik godzin (cel 90 h), PDF dla opiekuna z anonimizacją | ✅ || 3 | Odblokowanie biometrią: Android Keystore (własna wtyczka) / WebAuthn PRF, zasady hasła, testy | ✅ || 2 | Wersja niemiecka (DE, pisownia szwajcarska) i „Kraj pracy” PL/CH: szwajcarski system pomocy, prawo, numery, 3 przypadki DEMO, 3 scenariusze | ✅ |# Postęp prac

Stan: **wszystkie etapy 1–15 zakończone**, poza publikacją na GitHubie (wymaga decyzji o koncie – patrz `HANDOVER.md`).

| Etap | Zakres | Status |
|---|---|---|
| 1 | Szkielet: Vite + React 19 + TS strict, Tailwind 4, design system, i18n PL/EN, hash routing, PWA | ✅ |
| 2 | Dexie, AES-GCM + PBKDF2, hasło, blokada, migracje (v1→v2), kopia zapasowa | ✅ |
| 3 | Onboarding (4 ekrany), tryby praktyczny/szkoleniowy, 8 przypadków demo | ✅ |
| 4 | Podopieczni: profil, diagnoza (radar), IPR (SMART), plan nawrotów (PDF), oś czasu, genogram/ekomapa | ✅ |
| 5 | Spotkania, tryb spotkania (timer, agenda, notatki, narzędzia), notatki przebieg/DAP/obserwacja, kreator zajęć | ✅ |
| 6 | 12 narzędzi interaktywnych z widokiem „pokaż podopiecznemu” i zapisem wyniku | ✅ |
| 7 | AUDIT, AUDIT-C, DUDIT, wykresy w profilu | ✅ |
| 8 | Kreator programu profilaktycznego (7 kroków, ewaluacja pre/post, lista dobrych praktyk, PDF) | ✅ |
| 9 | Resocjalizacja (karty, readaptacja, socjoterapia), rodzina, system pomocy, kreator skierowania, prawo | ✅ |
| 10 | Baza wiedzy (34 karty), wyszukiwarka globalna | ✅ |
| 11 | Symulator MI – 11 scenariuszy, paski sojuszu i języka zmiany, statystyki MITI | ✅ |
| 12 | Fiszki SM-2 (6 talii, 163 karty), własne talie, import/eksport JSON, egzamin | ✅ |
| 13 | Pulpit, „Do zwrócenia uwagi” (7 reguł), raporty PDF, tryb prezentacji | ✅ |
| 14 | Dostępność (axe bez błędów poważnych), brak poziomego przewijania, Lighthouse ≥ 90 | ✅ |
| 15 | Podpisany APK, workflowy CI / Pages / APK, dokumentacja | ✅ (publikacja: czeka) |

## Wersja 1.1

| Punkt | Zakres | Status |
|---|---|---|
| 0 | Naprawa repo na Windows (artefakty Lighthouse), profil Lighthouse poza projektem, `npm ci`, `gh` na koncie michaelkuchno | ✅ |
| 1 | Układ na Androidzie: edge-to-edge (SystemBars, insety jako zmienne CSS), duża czcionka (skalowany tekst), bez wymuszonego trybu ciemnego, klawiatura, testy 3 profili Androida | ✅ |
| 2 | Wersja niemiecka (DE, pisownia szwajcarska) i „Kraj pracy” PL/CH: szwajcarski system pomocy, prawo, numery, 3 przypadki DEMO, 3 scenariusze | ✅ |
| 3 | Odblokowanie biometrią: Android Keystore (własna wtyczka) / WebAuthn PRF, zasady hasła, testy | ✅ (wymaga testu na urządzeniu) |
| 4 | Dzienniczek praktyk: wpisy, licznik godzin (cel 90 h), PDF dla opiekuna z anonimizacją | ✅ |
| 5 | Notatnik i superwizja: tagi, wyszukiwanie, przypinanie, przypisania, zadania na Pulpicie, ukryte w prezentacji | ✅ |
| 6 | Anonimowe studium przypadku: automatyczna anonimizacja, podgląd z edycją, PDF | ✅ |
| 7 | Przypomnienie o kopii zapasowej (baner > 7 dni) | ✅ |
| 8 | Podgląd lokalny (`scripts/start-local.ps1`) | ⏳ |
| 9 | Wersja 1.1.0, Pages, Release z APK, README | ⏳ |

## Jakość (ostatni przebieg)

- `npm run lint` – 0 błędów, 0 ostrzeżeń; `npm run typecheck` – 0 błędów
- `npm test` – 118 testów jednostkowych ✅
- `npx playwright test` – 11 scenariuszy E2E ✅ (onboarding, podopieczny z diagnozą, spotkanie z narzędziem
  i badaniem przesiewowym, program profilaktyczny z PDF, zmiana języka, DEMO + symulator, offline,
  kopia zapasowa i przywrócenie, tryb prezentacji, brak poziomego przewijania, dostępność)
- Lighthouse (mobile): Performance 91–92, Accessibility 100, Best Practices 100, SEO 100; PWA: manifest
  + service worker z pełnym precache (Lighthouse 12 nie ma już osobnej kategorii PWA)

## Wznawianie

Polecenie „kontynuuj według docs/PROGRESS.md” – kolejny krok: publikacja (sekcja „Do zrobienia”
w `HANDOVER.md`), następnie ewentualne poprawki po weryfikacji treści (`CONTENT_REVIEW.md`).
