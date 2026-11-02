# Przystań / Harbor

Aplikacja do pracy i nauki dla pedagoga resocjalizacyjnego i specjalisty ds. uzależnień
(PL / EN). Działa **w 100% offline**, bez kont, serwerów i opłat, na **iPhonie** (PWA)
i **Androidzie** (PWA albo plik APK). Wszystkie dane są szyfrowane i zostają wyłącznie na urządzeniu.

> Przystań wspiera pracę i naukę. **Nie stawia diagnoz medycznych i nie podejmuje decyzji
> za specjalistę** – wszystkie wskaźniki i podpowiedzi mają charakter pomocniczy.

**Co jest w środku:** pulpit z „Do zwrócenia uwagi”, podopieczni (diagnoza pedagogiczna z wykresem
radarowym, IPR, plan zapobiegania nawrotom, oś czasu, genogram/ekomapa, readaptacja, plan wsparcia
rodziny), spotkania z trybem spotkania, kreator zajęć („przepisy”), 12 narzędzi interaktywnych,
AUDIT / AUDIT-C / DUDIT, kreator programu profilaktycznego z ewaluacją i PDF, system pomocy
i kreator skierowania, baza wiedzy, symulator rozmowy motywującej, fiszki i tryb egzaminu,
tryb szkoleniowy z 8 fikcyjnymi przypadkami, tryb prezentacji na rzutnik.

---

## Instalacja na iPhonie

1. Otwórz w **Safari** adres aplikacji (np. `https://<login>.github.io/przystan/` – patrz `docs/HANDOVER.md`).
   Inne przeglądarki na iPhonie nie dodają aplikacji do ekranu początkowego w ten sam sposób.
2. Dotknij przycisku **Udostępnij** (kwadrat ze strzałką w górę) na dole ekranu.
3. Przewiń listę w dół i wybierz **„Do ekranu początkowego”**.
4. Zostaw nazwę „Przystań” i dotknij **Dodaj**.
5. Uruchamiaj aplikację **z ikony na ekranie początkowym** (nie z Safari) – wtedy działa jak
   aplikacja, na pełnym ekranie i bez internetu.
6. Przy pierwszym uruchomieniu wybierz język, ustal hasło i tryb pracy.

## Instalacja na Androidzie z maila (plik APK)

1. Otwórz maila na telefonie i **pobierz załącznik** `przystan-1.0.0.apk`
   (jeśli Gmail blokuje załącznik – pobierz plik z linku, np. z Dysku Google).
2. Dotknij pobranego pliku (powiadomienie „Pobrano” albo aplikacja **Pliki → Pobrane**).
3. Android zapyta o zgodę na instalację z tego źródła: **Ustawienia → Zezwalaj z tego źródła**
   (włącz dla aplikacji, z której otwierasz plik – np. Gmail, Chrome lub Pliki), potem wróć.
4. Dotknij **Zainstaluj**. Jeśli Google Play Protect wyświetli ostrzeżenie o nieznanej aplikacji,
   wybierz **Więcej szczegółów → Zainstaluj mimo to** (aplikacja nie jest w Sklepie Play,
   dlatego Android jej „nie zna”).
5. Otwórz **Przystań** z listy aplikacji.

**Alternatywa – PWA w Chrome:** otwórz adres aplikacji w Chrome → menu **⋮** →
**Dodaj do ekranu głównego / Zainstaluj aplikację**.

## Kopia zapasowa – zrób ją regularnie!

Dane istnieją **tylko na tym urządzeniu**. Zgubiony telefon, odinstalowanie aplikacji albo
wyczyszczenie danych przeglądarki = utrata danych. Nie ma też możliwości odzyskania hasła.

- **Zrób kopię:** Ustawienia → Kopia zapasowa → **Utwórz kopię**. Powstaje plik
  `przystan-kopia-RRRR-MM-DD.przystan` – zapisz go w bezpiecznym miejscu (np. na komputerze,
  w zaszyfrowanym folderze). Plik jest zaszyfrowany Twoim hasłem.
- **Przywróć:** Ustawienia → Kopia zapasowa → **Przywróć z kopii** → wybierz plik → wpisz hasło,
  które obowiązywało w dniu wykonania kopii. Przywrócenie zastępuje wszystkie obecne dane.
- Kopia działa między urządzeniami (np. z Androida na iPhone'a i odwrotnie).

## Aktualizacje

- **PWA (iPhone / Android):** aktualizuje się sama – po otwarciu z dostępem do internetu pojawi się
  komunikat „Dostępna jest nowa wersja” → **Aktualizuj**. Dane zostają.
- **APK:** zainstaluj nowy plik APK „na” starą wersję. Musi być podpisany **tym samym kluczem**
  (patrz `docs/HANDOVER.md` → „Przechowaj bezpiecznie”) – wtedy dane zostają.
  Nowy APK zbudujesz poleceniem `npm run apk` (podnieś wcześniej `version` w `package.json`).

## Jak dodawać własne treści

Wszystkie treści są w plikach JSON – w dwóch językach o **identycznej strukturze**:
`src/locales/pl/content/*.json` i `src/locales/en/content/*.json`. Po zmianie uruchom
`npm test` – test sprawdzi zgodność PL/EN i poprawność odwołań.

| Co | Plik | Wskazówka |
|---|---|---|
| **Talie fiszek** | `decks.json` | Albo bez programowania: Nauka → **Nowa talia** / **Importuj JSON**. Format importu: `{"title": "Moja talia", "cards": [{"front": "Pytanie", "back": "Odpowiedź"}]}` |
| **Scenariusze symulatora** | `scenarios.json` | Węzły `nodes` z wypowiedzią `client`, 3–4 opcje (`category` wg MITI, `alliance` −2…+2, `next` → id kolejnego węzła); węzeł końcowy ma `ending` i pustą listę `options`. Graf bez pętli. |
| **Przepisy na zajęcia** | w aplikacji: Spotkania → **Przepisy na zajęcia** | Składniki i szablony: `templates.json` (`ingredients`, `sessionTemplates`). |
| **Karty wiedzy** | `knowledge.json`, `resocialization.json`, `family.json` | Pola: `essence`, `whenToUse`, `techniques`, `phrases`, `pitfalls`, `sources`, `tags`, `reviewStatus`. |
| **Instytucje, ścieżki, prawo, telefony** | `helpsystem.json` | Reguły kreatora skierowania: `referral.rules` (`when` → odpowiedzi, `institutionIds`). |
| **Profilaktyka** | `prevention.json` | Poziomy, czynniki, strategie, dobre praktyki, standardy. |
| **Przypadki DEMO** | `demo.json` | Daty względne: `"@-30"` (30 dni temu), `"@0T10:00"` (dziś 10:00). |
| **Teksty interfejsu** | `src/locales/{pl,en}/*.json` | i18next. |

Status weryfikacji treści zmienisz w aplikacji (kliknij znacznik „Do weryfikacji”) albo w pliku
(`"reviewStatus": "zweryfikowane"`). Lista treści do sprawdzenia: `docs/CONTENT_REVIEW.md`.

## Dla programisty

```bash
npm ci
npm run dev          # serwer deweloperski
npm run check        # lint + typecheck + testy jednostkowe + build
npx playwright test  # testy E2E (po npm run build)
npm run apk          # podpisany APK → release/ (Android SDK + JDK 21 + keystore)
npm run assets       # ikony PWA i ekrany startowe iOS z public/logo.svg
node scripts/content-review.mjs   # odświeża docs/CONTENT_REVIEW.md
```

Stos: React 19, TypeScript (strict), Vite 8, Tailwind 4, Radix UI, Framer Motion, Dexie (IndexedDB),
Web Crypto (AES-256-GCM, PBKDF2 600k), i18next, Recharts, pdfmake, vite-plugin-pwa (Workbox),
Capacitor 8. Dokumentacja: `docs/PLAN.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`,
`docs/HANDOVER.md`, `docs/CONTENT_REVIEW.md`.
