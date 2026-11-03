# Postęp prac

Stan: **wersja 1.2.0 opublikowana** (PWA na GitHub Pages, APK w GitHub Releases). Etapy 1–15 (1.0), punkty 0–9 (1.1) i historia z audytem (1.2) zakończone.

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
| 8 | Podgląd lokalny (`scripts/start-local.ps1`): build, `vite preview --host`, link lokalny i Wi-Fi | ✅ |
| 9 | Wersja 1.1.0 (versionCode 10100), Pages, Release „Przystań 1.1.0” z podpisanym APK, README z sekcją „Pobierz” i skrótem DE | ✅ |

## Wersja 1.2 – historia zmian i audyt (D-049, D-050)

| Punkt | Zakres | Status |
|---|---|---|
| 1 | Schemat bazy v3: `versions` (zaszyfrowane wersje) i `audit` (łańcuch HMAC) | ✅ |
| 2 | Wersje przy każdym zapisie (łączenie w 5 min, bez pustych zapisów), przywracanie wersji, przycisk „Historia” w 11 edytorach | ✅ |
| 3 | Kosz na 30 dni: przywracanie (z powiązanymi rekordami), trwałe usunięcie, opróżnianie, wymazanie szczegółów w dzienniku | ✅ |
| 4 | Dziennik audytu: dane, odblokowania, nieudane próby, hasło, biometria, eksporty, kopie; filtry i wyszukiwanie | ✅ |
| 5 | Kontrola integralności, eksport dziennika PDF / CSV, eksport danych osoby (RODO art. 15/20) | ✅ |
| 6 | Kopia zapasowa format 2 (historia + dziennik), zgodność z formatem 1 | ✅ |
| 7 | Testy: 18 jednostkowych (w tym próby manipulacji), 4 E2E, nowe ekrany w testach przewijania / a11y / Androida | ✅ |
| 8 | Wersja 1.2.0, Pages, Release z APK | ✅ |

## Jakość (ostatni przebieg, wersja 1.2.0)

- `npm run lint` – 0 błędów, 0 ostrzeżeń; `npm run typecheck` – 0 błędów
- `npm test` – **193 testy jednostkowe** ✅ (w tym struktura treści PL/EN/DE, pisownia bez „ß”, biometria –
  opakowanie DEK i zasady hasła, anonimizacja, dzienniczek, notatnik, studium przypadku, przypomnienie o kopii)
- `npx playwright test` – **33 testy E2E** ✅: historia z przywróceniem wersji, kosz i trwałe usunięcie, dziennik z kontrolą integralności i eksportem PDF/CSV, eksport danych osoby, dotychczasowe scenariusze, profile Androida (360×780, 412×915,
  duża czcionka 200 %: paski systemowe, poziome przewijanie, klawiatura), wersja niemiecka + Szwajcaria,
  kraj pracy niezależny od języka, dzienniczek z PDF, superwizja z zadaniem na Pulpicie, notatki ukryte
  w trybie prezentacji, studium przypadku bez identyfikatorów, baner kopii, widoczność opcji biometrii
- GitHub Actions: CI, Pages i podpisany APK (z natywną wtyczką biometrii) – zielone
- Lighthouse (mobile, wersja 1.0): Performance 91–92, Accessibility 100, Best Practices 100, SEO 100
  (`npm run lighthouse`)

## Wznawianie

Polecenie „kontynuuj według docs/PROGRESS.md” – kolejne kroki: ręczna weryfikacja na urządzeniach
(`HANDOVER.md`, sekcja 1) i poprawki po weryfikacji treści (`CONTENT_REVIEW.md`, sekcje 12–13).
