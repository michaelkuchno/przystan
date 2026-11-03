# Przystań / Harbor

Aplikacja do pracy i nauki dla pedagoga resocjalizacyjnego, specjalisty ds. uzależnień i pracownika
socjalnego (**PL / EN / DE**, Polska i Szwajcaria). Działa **w 100% offline**, bez kont, serwerów
i opłat, na **iPhonie** (PWA) i **Androidzie** (PWA albo plik APK). Wszystkie dane są szyfrowane
i zostają wyłącznie na urządzeniu.

## Pobierz

| | Link | Jak |
|---|---|---|
| **iPhone / iPad / komputer (PWA)** | **https://michaelkuchno.github.io/przystan/** | Otwórz w **Safari** → **Udostępnij** → **Do ekranu początkowego** → **Dodaj**. Uruchamiaj z ikony. |
| **Android (APK)** | **https://github.com/michaelkuchno/przystan/releases/latest** | Pobierz plik `przystan-<wersja>.apk` z sekcji *Assets* i zainstaluj (szczegóły niżej). |
| **Android (PWA)** | https://michaelkuchno.github.io/przystan/ | Chrome → menu **⋮** → **Zainstaluj aplikację**. |

**Aktualizacja bez utraty danych**

- **PWA:** aktualizuje się sama. Po otwarciu z internetem pojawi się „Dostępna jest nowa wersja” →
  **Aktualizuj**. Dane zostają w przeglądarce.
- **APK:** pobierz nowszy plik z *releases/latest* i zainstaluj go **na** obecną wersję
  (bez odinstalowywania). Każdy APK jest podpisany tym samym kluczem, więc dane zostają.
  **Nie odinstalowuj** aplikacji – to usuwa dane.
- Przed każdą aktualizacją dla pewności zrób **kopię zapasową** (Ustawienia → Kopia zapasowa).

> Przystań wspiera pracę i naukę. **Nie stawia diagnoz medycznych i nie podejmuje decyzji
> za specjalistę** – wszystkie wskaźniki i podpowiedzi mają charakter pomocniczy.

**Co jest w środku:** pulpit z „Do zwrócenia uwagi”, podopieczni (diagnoza pedagogiczna z wykresem
radarowym, IPR, plan zapobiegania nawrotom, oś czasu, genogram/ekomapa, readaptacja, plan wsparcia
rodziny), spotkania z trybem spotkania, kreator zajęć („przepisy”), 12 narzędzi interaktywnych,
AUDIT / AUDIT-C / DUDIT, kreator programu profilaktycznego z ewaluacją i PDF, system pomocy
i kreator skierowania (**Polska lub Szwajcaria – ustawienie „Kraj pracy”**), baza wiedzy, symulator
rozmowy motywującej, fiszki i tryb egzaminu, **dzienniczek praktyk**, **notatnik i superwizja**,
**anonimowe studium przypadku (PDF)**, tryb szkoleniowy z fikcyjnymi przypadkami (PL i CH), tryb
prezentacji na rzutnik, opcjonalne **odblokowanie biometrią**.

## Kurzfassung (Deutsch)

**Przystań** ist eine App für Soziale Arbeit, Sozialpädagogik und Suchtberatung – auf Deutsch
(Schweizer Schreibweise), Polnisch und Englisch, mit dem **Arbeitsland Schweiz** (Hilfesystem des
Kantons Bern, rechtliche Grundlagen, Notfallnummern 143 / 147 / 144 / 117 / 112) oder Polen. Sie
läuft **vollständig offline**, ohne Konto und ohne Server; alle Daten bleiben verschlüsselt auf dem
Gerät.

- **iPhone:** https://michaelkuchno.github.io/przystan/ in **Safari** öffnen → **Teilen** →
  **Zum Home-Bildschirm**.
- **Android:** APK unter https://github.com/michaelkuchno/przystan/releases/latest herunterladen
  und installieren (oder in Chrome: **⋮ → App installieren**).
- **Aktualisieren ohne Datenverlust:** Die Web-App aktualisiert sich selbst («Neue Version
  verfügbar» → **Aktualisieren**). Beim APK die neue Datei **über** die alte installieren – nicht
  deinstallieren. Vorher eine **Datensicherung** erstellen (Einstellungen → Datensicherung).
- Sprache und Arbeitsland: beim ersten Start oder in den **Einstellungen**. Inhalte, die noch
  geprüft werden müssen, sind entsprechend markiert (siehe `docs/CONTENT_REVIEW.md`).

---

## Instalacja na iPhonie

1. Otwórz w **Safari** adres https://michaelkuchno.github.io/przystan/.
   Inne przeglądarki na iPhonie nie dodają aplikacji do ekranu początkowego w ten sam sposób.
2. Dotknij przycisku **Udostępnij** (kwadrat ze strzałką w górę) na dole ekranu.
3. Przewiń listę w dół i wybierz **„Do ekranu początkowego”**.
4. Zostaw nazwę „Przystań” i dotknij **Dodaj**.
5. Uruchamiaj aplikację **z ikony na ekranie początkowym** (nie z Safari) – wtedy działa jak
   aplikacja, na pełnym ekranie i bez internetu.
6. Przy pierwszym uruchomieniu wybierz język i kraj pracy, ustal hasło i tryb pracy.

## Instalacja na Androidzie (plik APK)

1. Na telefonie otwórz https://github.com/michaelkuchno/przystan/releases/latest i w sekcji
   **Assets** dotknij pliku `przystan-<wersja>.apk` (albo pobierz załącznik z maila).
2. Dotknij pobranego pliku (powiadomienie „Pobrano” albo aplikacja **Pliki → Pobrane**).
3. Android zapyta o zgodę na instalację z tego źródła: **Ustawienia → Zezwalaj z tego źródła**
   (włącz dla aplikacji, z której otwierasz plik – np. Chrome lub Pliki), potem wróć.
4. Dotknij **Zainstaluj**. Jeśli Google Play Protect wyświetli ostrzeżenie o nieznanej aplikacji,
   wybierz **Więcej szczegółów → Zainstaluj mimo to** (aplikacja nie jest w Sklepie Play,
   dlatego Android jej „nie zna”).
5. Otwórz **Przystań** z listy aplikacji.

## Kopia zapasowa – zrób ją regularnie!

Dane istnieją **tylko na tym urządzeniu**. Zgubiony telefon, odinstalowanie aplikacji albo
wyczyszczenie danych przeglądarki = utrata danych. Nie ma też możliwości odzyskania hasła.
Pulpit przypomina o kopii, gdy ostatnia jest starsza niż 7 dni.

- **Zrób kopię:** Ustawienia → Kopia zapasowa → **Utwórz kopię**. Powstaje plik
  `przystan-kopia-RRRR-MM-DD.przystan` – zapisz go w bezpiecznym miejscu (np. na komputerze,
  w zaszyfrowanym folderze). Plik jest zaszyfrowany Twoim hasłem.
- **Przywróć:** Ustawienia → Kopia zapasowa → **Przywróć z kopii** → wybierz plik → wpisz hasło,
  które obowiązywało w dniu wykonania kopii. Przywrócenie zastępuje wszystkie obecne dane
  (odblokowanie biometrią trzeba potem włączyć ponownie).
- Kopia działa między urządzeniami (np. z Androida na iPhone'a i odwrotnie).

## Aktualizacje (dla opiekuna projektu)

Nowa wersja: podnieś `version` w `package.json` (Android `versionCode` liczy się z niej sam),
zrób push na `main` (GitHub Pages aktualizuje PWA) i utwórz tag `v<wersja>` – workflow „Android APK”
zbuduje podpisany APK tym samym kluczem (sekrety `PRZYSTAN_KEYSTORE_*`) i dołączy go do Release.

## Podgląd lokalny (Windows)

```powershell
.\scripts\start-local.ps1
# jeśli uruchamianie skryptów jest zablokowane:
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Skrypt instaluje zależności (`npm ci`, jeśli nie ma `node_modules`), buduje aplikację, uruchamia
`vite preview --host` i otwiera przeglądarkę. Wypisuje link lokalny (np. http://localhost:4173/)
i link w sieci Wi-Fi (np. http://192.168.0.77:4173/) do otwarcia na telefonie w tej samej sieci.
**Przez http na adresie IP instalacja PWA i service worker nie działają – to tylko podgląd układu.**
Jeśli telefon się nie łączy, zezwól Node.js w Zaporze systemu Windows (sieć prywatna).
Parametry: `-Port 5000`, `-NoBrowser`.

## Jak dodawać własne treści

Wszystkie treści są w plikach JSON – w trzech językach o **identycznej strukturze**:
`src/locales/{pl,en,de}/content/*.json` (niemiecki: pisownia szwajcarska, bez „ß”). Po zmianie
uruchom `npm test` – test sprawdzi zgodność PL/EN/DE i poprawność odwołań, a
`node scripts/check-locale-shape.mjs <plik>` porówna pojedynczy plik z wersją EN.

| Co | Plik | Wskazówka |
|---|---|---|
| **Talie fiszek** | `decks.json` | Albo bez programowania: Nauka → **Nowa talia** / **Importuj JSON**. Format importu: `{"title": "Moja talia", "cards": [{"front": "Pytanie", "back": "Odpowiedź"}]}` |
| **Scenariusze symulatora** | `scenarios.json` | Węzły `nodes` z wypowiedzią `client`, 3–4 opcje (`category` wg MITI, `alliance` −2…+2, `next` → id kolejnego węzła); węzeł końcowy ma `ending` i pustą listę `options`. Graf bez pętli. `"country": "CH"` = scenariusz szwajcarski. |
| **Przepisy na zajęcia** | w aplikacji: Spotkania → **Przepisy na zajęcia** | Składniki i szablony: `templates.json` (`ingredients`, `sessionTemplates`). |
| **Karty wiedzy** | `knowledge.json`, `resocialization.json`, `family.json` | Pola: `essence`, `whenToUse`, `techniques`, `phrases`, `pitfalls`, `sources`, `tags`, `reviewStatus`. |
| **Instytucje, ścieżki, prawo, telefony** | `helpsystem.json` (Polska), `helpsystemCH.json` (Szwajcaria) | Reguły kreatora skierowania: `referral.rules` (`when` → odpowiedzi, `institutionIds`). |
| **Profilaktyka** | `prevention.json` | Poziomy, czynniki, strategie, dobre praktyki, standardy. |
| **Przypadki DEMO** | `demo.json` | `"country": "CH"` = przypadek szwajcarski (wczytywany przy kraju pracy „Szwajcaria”). Daty względne: `"@-30"` (30 dni temu), `"@0T10:00"` (dziś 10:00). |
| **Teksty interfejsu** | `src/locales/{pl,en,de}/*.json` | i18next; warianty zależne od kraju mają sufiks `_CH`. |
| **Oficjalne wersje narzędzi przesiewowych** | `src/lib/screening/pl.ts`, `src/lib/screening/de.ts` | Do czasu wstawienia oficjalnej wersji pokazywany jest oryginał angielski ze znacznikiem TODO. |

Status weryfikacji treści zmienisz w aplikacji (kliknij znacznik „Do weryfikacji”) albo w pliku
(`"reviewStatus": "zweryfikowane"`). Lista treści do sprawdzenia: `docs/CONTENT_REVIEW.md`.

## Dla programisty

```bash
npm ci
npm run dev          # serwer deweloperski
npm run check        # lint + typecheck + testy jednostkowe + build
npx playwright test  # testy E2E (po npm run build), w tym profile Androida 360×780 / 412×915 / duża czcionka
npm run apk          # podpisany APK → release/ (Android SDK + JDK 21 + keystore)
npm run lighthouse   # Lighthouse (profil Chrome w katalogu tymczasowym systemu, nie w projekcie)
npm run assets       # ikony PWA i ekrany startowe iOS z public/logo.svg
node scripts/content-review.mjs   # odświeża docs/CONTENT_REVIEW.md
```

Stos: React 19, TypeScript (strict), Vite 8, Tailwind 4, Radix UI, Framer Motion, Dexie (IndexedDB),
Web Crypto (AES-256-GCM, PBKDF2 600k), i18next, Recharts, pdfmake, vite-plugin-pwa (Workbox),
Capacitor 8 (SystemBars, edge-to-edge), androidx.biometric. Dokumentacja: `docs/PLAN.md`,
`docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOVER.md`, `docs/CONTENT_REVIEW.md`.
