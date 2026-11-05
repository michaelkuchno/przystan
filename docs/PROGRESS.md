# Postęp prac

Stan: **wersja 1.4.0** – powiadomienia, wiadomości e-mail / SMS z AI (D-060…D-064, `docs/NOTIFICATIONS.md`); 1.3: asystent AI (D-051…D-059, `docs/AI.md`).
historia z audytem (1.2) i asystent AI (1.3) zakończone.

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

## Wersja 1.3 – asystent AI (D-051…D-058, docs/AI.md)

| Punkt | Zakres | Status |
|---|---|---|
| 1 | Architektura `src/lib/ai`: AiProvider (generate / stream / structured), Embedder, Transcriber; tryby Wyłączony / Lokalny / Chmura; Gemini REST z własnym kluczem (zaszyfrowany), obsługa 429; Transformers.js (e5, Whisper) i WebLLM (Qwen3 1.7B) w workerach, pobieranie po zgodzie, wykrywanie możliwości, usuwanie modeli; CSP | ✅ |
| 2 | Prywatność: strażnik wrażliwości, pseudonimizacja PL/DE z przywracaniem, podgląd dokładnego tekstu + jednorazowa zgoda, wpis w dzienniku audytu, tryb prezentacji tylko na demo, ekran „AI w Przystani”, oznaczenie „Pomocnicze – zweryfikuj”, numery kryzysowe przy sygnałach | ✅ |
| 3 | Symulator „na żywo”: wolne odpowiedzi tekstem / głosem, ocena MITI + lepsza wersja, paski, statystyki, głos rozmówcy, limit 12, zapis przebiegu | ✅ |
| 4 | Asystent nauki: fiszki z notatek / TXT / PDF, egzamin z pytaniami otwartymi i oceną, „Wytłumacz prościej / podaj przykład” | ✅ |
| 5 | „Zapytaj bazę wiedzy”: wyszukiwanie semantyczne (indeks lokalny, zaszyfrowany, przyrostowy), odpowiedzi z odnośnikami, „nie wiem”, notatki tylko lokalnie | ✅ |
| 6 | Dyktowanie (notatki, spotkania, tryb spotkania, dzienniczek, superwizja) i „Uporządkuj” (przebieg / DAP / obserwacja) jako propozycja | ✅ |
| 7 | Kreatory: propozycja scenariusza zajęć i programu profilaktycznego + kontrola dobrych praktyk; materiały prostym językiem / dla młodzieży / tłumaczenie (plan nawrotów, karty narzędzi); pytania do superwizji | ✅ |
| 8 | Testy, leniwe ładowanie (kod modeli poza prekeszem PWA), dokumentacja, wersja 1.3.0 | ✅ |

## Wersja 1.4 – powiadomienia i wiadomości (D-060…D-064, docs/NOTIFICATIONS.md)

| Punkt | Zakres | Status |
|---|---|---|
| 1 | Silnik przypomnień: spotkania (N min przed, wieczór wcześniej), zadania (też z superwizji), przegląd IPR, ważne daty, „Do zwrócenia uwagi”, kopia; podsumowanie dnia; prywatność treści | ✅ |
| 2 | Kanały: powiadomienia systemowe (Android zaplanowane, PWA przy otwarciu), kalendarz .ics z alarmami, e-mail do siebie przez własne EmailJS | ✅ |
| 3 | Wiadomości: e-mail / SMS, 11 szablonów PL/EN/DE, kontakty, historia, szkice, przekazanie do aplikacji poczty / SMS, EmailJS, kopiuj, udostępnij | ✅ |
| 4 | AI: napisz, odpowiedz na e-mail (wytyczne korespondencji, wiedza z aplikacji, podsumowanie osoby), popraw; pseudonimizacja i zgoda, podpis lokalnie | ✅ |
| 5 | Wejścia: spotkanie, lista spotkań, profil osoby, kreator skierowania, program profilaktyczny, pulpit „Na dziś”, Ustawienia, Więcej | ✅ |
| 6 | Android: plugin powiadomień, ikona, dokładne godziny; CSP + EmailJS; audyt; testy; wersja 1.4.0 | ✅ |

## Jakość (ostatni przebieg, wersja 1.4.0)

- `npm run lint` – 0 błędów, 0 ostrzeżeń; `npm run typecheck` – 0 błędów
- `npm test` – **250 testów jednostkowych** ✅ (1.4: +14 – terminy i przypomnienia, podsumowanie bez szczegółów,
  .ics RFC 5545, mailto / sms, szablony, EmailJS, walidacja szkiców AI i wytyczne korespondencji; 1.3: +43 – parser odpowiedzi modelu i walidacja JSON przy błędnym
  formacie, pseudonimizacja PL/DE z przywracaniem, strażnik prywatności i jednorazowe zgody, Gemini – nagłówek klucza,
  structured output, 429 z RetryInfo, błędy, SSE; brak ruchu sieciowego w trybie Wyłączony, zaszyfrowany klucz i indeks,
  wyszukiwanie semantyczne, kontrola dobrych praktyk, statystyki symulatora, sygnały kryzysu, zabezpieczenia Whispera)
- `npx playwright test` – **49 testów E2E** ✅ (1.4: +5 – przypomnienie SMS ze spotkania, kontakty i e-mail z szablonu
  z wpisem w dzienniku, odpowiedź AI na e-mail z pseudonimizacją, powiadomienia + karta „Na dziś” + eksport .ics,
  a11y i przewijanie nowych ekranów; 1.3: +11 z fałszywym providerem: zero żądań sieciowych przy wyłączonej AI,
  ustawienia i zgoda na pobranie modelu, symulator „na żywo”, tryb lokalny bez czatu, wyjaśnienia / fiszki / egzamin,
  „Zapytaj”, dane osób tylko lokalnie i podgląd pseudonimizacji + wpis w dzienniku, dyktowanie i pytania do superwizji
  z numerami kryzysowymi, propozycja zajęć z kontrolą dobrych praktyk, tryb prezentacji, a11y i przewijanie ekranów AI;
  nowe ekrany dodane do testów a11y, przewijania i profili Androida)
- `npm run e2e:ai-real` (ręcznie, prawdziwe usługi) – 3/3 ✅: Gemini (CORS, błędny klucz → czytelny komunikat),
  model e5 pobrany po zgodzie i wyszukiwanie semantyczne **offline**, Whisper pobrany i rozpoznawanie **offline**
- `GEMINI_KEY=… npx vitest run src/lib/ai/gemini.real.test.ts` (ręcznie, prawdziwy darmowy klucz `AQ.…`) – 5/5 ✅:
  wszystkie zadania AI (symulator, fiszki, ocena, „Zapytaj” z „nie wiem”, DAP, superwizja, zajęcia, program w DE,
  wyjaśnienie strumieniowe, tłumaczenie z zachowaniem numerów) na `gemini-3.5-flash-lite`
- Lighthouse 1.4.0: Performance 89–90, Accessibility / Best Practices / SEO 100 (ten sam zakres co 1.2–1.3).
- Lighthouse (mobile, lokalnie, 3 przebiegi): 1.3.0 – Performance 90–92, Accessibility 100, Best Practices 100, SEO 100;
  ten sam rozkład co 1.2.0 na tej samej maszynie (start ładuje te same pliki, +0,25 kB gzip). Teksty AI i kod modeli
  ładują się dopiero po odblokowaniu / użyciu.
- GitHub Actions: CI, Pages i podpisany APK – patrz wydanie 1.3.0

## Wznawianie

Polecenie „kontynuuj według docs/PROGRESS.md” – kolejne kroki: ręczna weryfikacja AI na telefonach (`HANDOVER.md`, „Wersja 1.3”), próba promptów z prawdziwym kluczem i wpis wyników do `CONTENT_REVIEW.md` sekcja 14, ręczna weryfikacja na urządzeniach
(`HANDOVER.md`, sekcja 1) i poprawki po weryfikacji treści (`CONTENT_REVIEW.md`, sekcje 12–13).
