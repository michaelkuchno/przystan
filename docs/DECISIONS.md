# Rejestr decyzji

Każda decyzja: **co** i **dlaczego**. Numeracja stała.

## D-001 PWA + Capacitor zamiast natywnej aplikacji iOS
Darmowa, samodzielna aplikacja natywna na iOS nie jest możliwa bez płatnego konta Apple Developer
(99 USD/rok), a Expo Go wymaga ciągle działającego serwera deweloperskiego. PWA działa offline,
instaluje się na ekranie początkowym jak aplikacja i nic nie kosztuje. Na Androidzie ta sama
aplikacja jest dodatkowo opakowana w Capacitor (plik APK do instalacji z maila).

## D-002 Wersje narzędzi
React 19, Vite 8, Tailwind 4, Dexie 4, i18next 26, Capacitor 8 (najnowsze stabilne). TypeScript
**6.0** zamiast 7.0: `typescript-eslint` obsługuje obecnie TS < 6.1. ESLint **9** zamiast 10:
`eslint-plugin-jsx-a11y` (dostępność) nie wspiera jeszcze ESLint 10.

## D-003 Hash routing, względne ścieżki
`HashRouter` + `base: './'` – ten sam build działa na GitHub Pages pod dowolną ścieżką
i w WebView Capacitora (schemat `https://localhost`), bez przepisywania adresów na serwerze.

## D-004 Model szyfrowania: klucz danych (DEK) chroniony kluczem z hasła (KEK)
- Hasło → PBKDF2-SHA-256, **600 000 iteracji** (rekomendacja OWASP 2023), losowa sól 16 B → KEK.
- Losowy 256-bitowy DEK (AES-GCM) szyfruje rekordy; DEK jest zapisany zaszyfrowany KEK-iem.
- Każdy rekord: AES-GCM, losowy IV 12 B, dane dodatkowe (AAD) = `id|kind|space` – zamiana
  zaszyfrowanych bloków między rekordami jest wykrywana.
- Zmiana hasła = ponowne zaszyfrowanie samego DEK (szybka, bez ryzyka utraty danych w połowie).
- Po odblokowaniu DEK jest importowany jako **nieeksportowalny** `CryptoKey` i trzymany wyłącznie
  w pamięci; blokada usuwa referencję.
- Utrata hasła = utrata danych (brak „furtki”) – komunikowane wprost w kreatorze.

## D-005 Co jest jawne w bazie
Zaszyfrowana jest **cała treść** każdego rekordu. Jawne pozostają tylko: identyfikator losowy,
rodzaj rekordu (`kind`), przestrzeń (`practice`/`demo`), identyfikator podopiecznego (losowy UUID)
i znacznik czasu aktualizacji – potrzebne do indeksów. Nie ujawniają one danych osobowych.
Preferencje interfejsu (język, motyw, rozmiar tekstu) są jawne, bo muszą działać przed
odblokowaniem; nie zawierają danych podopiecznych.

## D-006 Tryb szkoleniowy jako osobna przestrzeń w tej samej bazie
Rekordy mają pole `space`. Tryb demo widzi wyłącznie `space = 'demo'`, tryb praktyczny wyłącznie
`practice`. Dane demo także są szyfrowane (jednolity kod, brak ścieżek „na skróty”). Przestrzeń demo
można w każdej chwili zresetować do stanu początkowego.

## D-007 Daty w danych demo względem „dziś”
Dane demo zapisują daty jako przesunięcie w dniach (`@-30`, `@0T10:00`). Dzięki temu w dniu
prezentacji na uczelni pulpit zawsze pokazuje dzisiejsze spotkania i aktualne wskaźniki uwagi.

## D-008 Raporty PDF: pdfmake (offline) zamiast `window.print()`
`window.print()` nie działa w WebView Androida (Capacitor) i jest zawodne w trybie standalone PWA
na iOS. pdfmake generuje PDF w przeglądarce, offline, z czcionką obsługującą polskie znaki.
Moduł ładowany leniwie (nie spowalnia startu). Plik jest udostępniany przez `navigator.share`
(iOS), `@capacitor/share` + `@capacitor/filesystem` (Android) lub pobierany (komputer).

## D-009 Wykresy: Recharts
Dojrzały, deklaratywny, obsługuje wykres radarowy (diagnoza), liniowy (pomiary) i słupkowy
(ewaluacja pre/post). Ładowany w osobnym fragmencie (chunk).

## D-010 Narzędzia przesiewowe – status licencji
| Narzędzie | Decyzja | Status licencji |
|---|---|---|
| AUDIT | **włączone** | WHO (Babor i in., 2001): wolno swobodnie przeglądać, streszczać, powielać i tłumaczyć, nie do sprzedaży ani celów komercyjnych. Aplikacja jest niekomercyjna. |
| AUDIT-C | **włączone** | Pozycje 1–3 AUDIT (warunki WHO); SAMHSA opisuje AUDIT-C jako dostępny w domenie publicznej. |
| DUDIT | **włączone** | Pozycje w domenie publicznej, układ chroniony – autorzy proszą o zachowanie układu (EUDA, Berman i in.). Kolejność pozycji i skala odpowiedzi bez zmian. |
| CRAFFT 2.1 | **pominięte** | © Boston Children's Hospital; reprodukcja wymaga pisemnej zgody (crafft@childrens.harvard.edu), zgoda nie obejmuje automatycznie aplikacji. |
| CAST | **pominięte** | Brak jednoznacznej informacji o licencji (OFDT); tylko źródła wtórne podają „free”. |
| FTND | **pominięte** | Sprzeczne informacje: część źródeł „public domain”, inne wymagają zgody autora (K.O. Fagerström). |
| PGSI | **pominięte** | Brak jasnej licencji; źródła wtórne wskazują ochronę prawem autorskim (CCSA). |

Specyfikacja nakazuje pominąć narzędzia o niejasnym statusie. Silnik narzędzi jest sterowany
danymi – po uzyskaniu zgody wystarczy dopisać definicję (patrz `HANDOVER.md`).
Wersje polskie: nie tłumaczymy narzędzi walidowanych; do czasu wstawienia oficjalnej wersji
UI pokazuje oryginał angielski z widocznym znacznikiem „TODO: oficjalna wersja PL”.

## D-011 Progi interpretacji
- AUDIT: strefy ryzyka WHO 0–7 / 8–15 / 16–19 / 20–40.
- AUDIT-C: wynik dodatni ≥ 4 (mężczyźni) / ≥ 3 (kobiety) (Bradley i in., 2007); przy płci
  „nieokreślona/inna” stosujemy próg ≥ 4 i pokazujemy informację o tym.
- DUDIT: ≥ 6 (mężczyźni) / ≥ 2 (kobiety) – prawdopodobne problemy związane z narkotykami;
  ≥ 25 – prawdopodobne uzależnienie (podręcznik DUDIT).
Wszystkie interpretacje oznaczone jako pomocnicze, nie diagnoza.

## D-012 Treści merytoryczne jako JSON per język
UI: `src/locales/<lang>/*.json` (i18next). Treści: `src/locales/<lang>/content/*.json` o identycznej
strukturze w obu językach (test automatyczny pilnuje zgodności). Autorka może edytować treść bez
programowania. Pole `reviewStatus` domyślnie `do_weryfikacji`; zmiana na „zweryfikowane” w UI jest
zapisywana lokalnie (preferencje) – nie modyfikuje plików.

## D-013 Algorytm powtórek: SM-2
Klasyczny SuperMemo-2 (Woźniak, 1990) z ocenami 0–5 zmapowanymi na 4 przyciski
(„Nie pamiętam” 1, „Trudne” 3, „Dobrze” 4, „Łatwe” 5). Prosty, przewidywalny, łatwy do testowania.

## D-014 Wskaźniki „Do zwrócenia uwagi” – jawne reguły
Każdy wskaźnik to nazwana reguła z progiem, a karta pokazuje, z czego wynika:
craving wzrósł o ≥ 2 pkt względem poprzedniego pomiaru lub ≥ 7/10; wzrost wyniku narzędzia
przesiewowego lub przejście do wyższej strefy; opuszczone spotkanie w ostatnich 14 dniach;
kluczowy termin w ciągu 14 dni; brak kontaktu > 30 dni z aktywnym podopiecznym; IPR po terminie
przeglądu. Reguły w `src/lib/attention.ts`, testy jednostkowe.

## D-015 Ochrona podglądu na przełączniku aplikacji
PWA: przy `visibilitychange → hidden` treść jest natychmiast zasłaniana i aplikacja blokuje się.
Android: dodatkowo `FLAG_SECURE` w `MainActivity` (system nie robi zrzutu do przełącznika
i blokuje zrzuty ekranu).

## D-016 Fonty lokalne
Inter (tekst) i Fraunces (nagłówki – ciepły, „kulinarny” charakter) z pakietów `@fontsource-variable`,
bundlowane w aplikacji – zero zapytań do Google Fonts.

## D-017 Haptyka
Android (Capacitor): `@capacitor/haptics`. Web: `navigator.vibrate`, jeśli dostępne. iOS Safari
nie udostępnia wibracji – funkcja po cichu nic nie robi, a UI nie obiecuje wibracji na iOS.

## D-018 Kopia zapasowa
Plik `.przystan` (JSON) zawiera zaszyfrowane rekordy wraz z solą i zaszyfrowanym DEK – do
odtworzenia potrzebne jest hasło obowiązujące w chwili wykonania kopii. Import: walidacja formatu
i wersji, sprawdzenie hasła, odszyfrowanie **każdego** rekordu przed zapisem; dopiero gdy
wszystko jest poprawne, dane są zastępowane w jednej transakcji.

## D-019 Wybór kont i publikacji
Repozytorium aplikacji jest osobne (`~/projects/przystan`), poza repozytoriami służbowymi.
Commity podpisane prywatnym adresem autora. Konto GitHub zalogowane w `gh` na tej maszynie jest
kontem służbowym – publikacja repozytorium i GitHub Pages wymaga decyzji, na którym koncie
(patrz `HANDOVER.md`).

## D-020 Hasła keystore nie trafiają do repozytorium
Specyfikacja prosi o zapisanie haseł keystore w `HANDOVER.md`. Repozytorium może być publiczne,
więc hasła i sam keystore leżą **poza repozytorium**: `~/przystan-keystore/` (`przystan-release.jks`,
`keystore.properties`, uprawnienia 600). `HANDOVER.md` wskazuje to miejsce w sekcji
„Przechowaj bezpiecznie”. Kopia `android/keystore.properties` jest w `.gitignore`.

## D-021 Uprawnienie INTERNET w APK
WebView Capacitora serwuje aplikację z `https://localhost`. Bez możliwości przetestowania na
urządzeniu/emulatorze (brak KVM w środowisku budowania) pozostawiono standardowe uprawnienie
INTERNET, by nie ryzykować niedziałającej aplikacji. Brak ruchu sieciowego gwarantują: CSP
`connect-src 'self'`, brak zewnętrznych zasobów i brak kodu wykonującego zapytania. Kopie
zapasowe Androida są wyłączone (`allowBackup=false`, `dataExtractionRules`), a `FLAG_SECURE`
ukrywa treść na przełączniku aplikacji i blokuje zrzuty ekranu.

## D-022 Nazewnictwo w wersji angielskiej
„podopieczny” → *service user*, „klient” → *client*, „wychowanek” → *resident*, „uczestnik” →
*participant*. Polskie formy przypadków (dopełniacz, celownik) są wstrzykiwane jako zmienne
i18next (`{{clientGen}}`, `{{clientDat}}`), więc zmiana nazewnictwa działa w całym interfejsie.

## D-023 Treści ładowane na żądanie, lekki pierwszy ekran
Onboarding i ekran blokady nie potrzebują treści merytorycznych ani biblioteki animacji. Treści
(~130 kB gzip) i główna część aplikacji ładują się dopiero po odblokowaniu (lub przy otwarciu
listy telefonów kryzysowych). Teksty interfejsu ładowane są tylko dla aktywnego języka. Wynik:
Lighthouse Performance 91–92 (mobile, symulowane 4G), Accessibility 100, Best Practices 100.

## D-024 Dane demo a zmiana języka
Dane trybu szkoleniowego są fikcyjne; po zmianie języka w trybie DEMO są automatycznie wczytywane
ponownie w nowym języku (zmiany wprowadzone w DEMO są wtedy tracone). Dane praktyczne nigdy nie
są modyfikowane przy zmianie języka.

## D-025 Brak automatycznej publikacji na koncie służbowym
Na tej maszynie `gh` jest zalogowane na służbowe konto GitHub. Publikacja prywatnego projektu
(repozytorium publiczne + GitHub Pages + sekrety z keystore) na koncie służbowym byłaby
niewłaściwa i trudna do odwrócenia, dlatego ten krok czeka na decyzję właściciela
(gotowe komendy w `HANDOVER.md`).

## D-026 Wybór pomocniczy: autosave
Formularze dokumentacji (diagnoza, IPR, plany, genogram, przepisy, programy) zapisują się
automatycznie po 600 ms bez pisania, ze wskaźnikiem „Zapisano”. Usunięcia są „miękkie”
z możliwością cofnięcia przez ok. minutę.

---

# Wersja 1.1

## D-027 Naprawa repozytorium na Windows i profil Lighthouse
Do repozytorium trafiło 2895 plików tymczasowych profili Chrome z Lighthouse
(`C:\Users\...\AppData\Local\lighthouse.*` – nazwy z dwukropkiem i odwrotnym ukośnikiem są
niedozwolone w Windows, więc checkout się nie udawał). Git for Windows nie przyjmuje tych ścieżek
do indeksu nawet z `core.protectNTFS=false`, więc `git rm --cached` nie mogło zadziałać. Zamiast
tego zbudowano drzewo bez tych katalogów (`git mktree`), wczytano je do indeksu i zatwierdzono
(commit `b211e58`; przed przepisaniem historii `26b248e`). Później usunięto je z całej historii (D-044).
Lighthouse uruchamia się teraz przez `npm run lighthouse` (`scripts/lighthouse.mjs`), który
tworzy profil Chrome w katalogu tymczasowym systemu (`os.tmpdir()`) i usuwa go po zakończeniu.
`.gitignore` blokuje `C:*`, `**/lighthouse.*/` i `lighthouse-report`.

## D-028 Edge-to-edge na Androidzie: jedno źródło insetów
Przy targetSdk 36 Android wymusza edge-to-edge. Capacitor 8 ma wbudowaną wtyczkę SystemBars;
ustawiono `insetsHandling: 'css'` i `initialViewportFitValueHint: 'cover'` (`capacitor.config.ts`).
Wtyczka wstrzykuje `--safe-area-inset-*` (w Android WebView < 140 `env(safe-area-inset-*)` zwraca 0),
a przy starszym WebView sama dodaje padding. W CSS jedynym źródłem prawdy są zmienne
`--inset-top/right/bottom/left` = `var(--safe-area-inset-*, env(safe-area-inset-*, 0px))`;
nagłówek, dolna nawigacja, toasty, arkusze dialogowe, pasek aktualizacji, widok „pokaż
podopiecznemu” i stopka formularza przesiewowego używają tylko ich (oraz `--tabbar-h`).
Kolor ikon pasków systemowych podąża za motywem aplikacji (`SystemBars.setStyle`), a nie systemu.

## D-029 Duża czcionka systemowa: skalowany tekst, nie cały układ
Domyślnie WebView stosuje skalę czcionki systemu przez `textZoom`, co powiększa tylko część bloków
tekstu i rozjeżdża układ. `MainActivity` ustawia `textZoom = 100` i przekazuje efektywną skalę dla
tekstu podstawowego (16 sp → dp, więc z nieliniowym skalowaniem Androida 14+) do CSS jako
`--os-font-scale`. Jak w natywnym Androidzie (sp vs dp) skalowany jest **tylko tekst**: tokeny
`--text-*` Tailwinda; duże nagłówki rosną słabiej (jak nieliniowe skalowanie Androida). Odstępy,
pola dotyku i szerokości zostają, dzięki czemu przy 200 % na ekranie 360 px nadal jest miejsce na
treść. Ustawienie „Rozmiar tekstu” w aplikacji nadal skaluje cały układ (`--text-scale`).
Globalnie: elementy siatki i `flex-1` mogą się zwężać (`min-width: 0`), długie słowa się łamią,
w przyciskach także w środku słowa. Etykiety dolnej nawigacji i plakietka trybu w nagłówku
rosną do limitu i się obcinają (pełna nazwa zostaje w nazwie dostępnej).

## D-030 Brak wymuszonego trybu ciemnego
`WebSettingsCompat.setAlgorithmicDarkeningAllowed(false)` i `android:forceDarkAllowed=false`
w motywie – aplikacja ma własny motyw ciemny, a One UI nie może odwracać jej kolorów.

## D-031 Klawiatura ekranowa
`src/lib/viewport.ts` porównuje widoczną wysokość z największą zmierzoną dla danej szerokości.
Gdy fokus jest w polu edycyjnym, a widok zmalał o > 150 px, ustawia `html[data-keyboard=open]`.
Wtedy dolna nawigacja jest ukryta, a pole przewijane na środek widoku. Na Androidzie okno
zmniejsza wtyczka SystemBars (padding o wysokość IME), w iOS/przeglądarce `visualViewport`.
Pozostałe `vh` zamieniono na `dvh`.

## D-032 Testy profili Androida
Projekty Playwright `android-360` (360×780), `android-412` (412×915) i `android-large-font`
(360×780, skala 2,0) wstrzykują typowe insety One UI. Szerokość porównywana jest
z `visualViewport.width`, a nie z `innerWidth`: w mobilnym Chromium element szerszy od ekranu
poszerza layout viewport, więc wcześniejszy test (`scrollWidth > innerWidth`) nie wykrywał
przepełnień. Poprawiony test ujawnił i naprawiono istniejące przepełnienia (diagnoza, chipy
„Do weryfikacji”, lista telefonów kryzysowych).

## D-033 Końce linii
`.gitattributes` wymusza LF (poza `*.bat`, `*.ps1`). Bez tego przy `core.autocrlf=true` na
Windows skrypty `.sh` i `gradlew` dostałyby CRLF.

## D-034 Wersja niemiecka (DE) – pisownia i terminologia szwajcarska
Trzeci język `de` (interfejs, wszystkie treści, symulator, fiszki, baza wiedzy, PDF). Pisownia
szwajcarska: „ss” zamiast „ß” – testy (`content.test.ts`, `locales.test.ts`) odrzucają „ß”.
Terminologia: Soziale Arbeit, Sozialpädagogik, Suchtberatung, Klient/in (formy z ukośnikiem; bez
odmiany przez przypadki, więc zmienne `{{client}}` nie wymagają form fleksyjnych). Interfejs używa
„du”; w dialogach symulatora rejestr zależy od sytuacji (młodzież – „du”, dorośli – „Sie”).
Polskie treści przetłumaczono wiernie (polskie instytucje i ustawy z niemieckim objaśnieniem), bez
„uszwajcarszczania”. Domyślny język = język systemu (pl → PL, de/gsw → DE, inne → EN). Nazwa
aplikacji w DE: „Przystań” (jak w PDF). Tłumaczenie przygotowano równolegle w kilku częściach;
spójność struktury pilnuje `scripts/check-locale-shape.mjs` i testy treści.

## D-035 Kraj pracy niezależny od języka
Nowe ustawienie `country: 'PL' | 'CH'` (onboarding i Ustawienia; domyślnie CH dla locale `*-CH`
i języka niemieckiego, inaczej PL). Od niego zależą: system pomocy i „Gdzie skierować?” (nowy rodzaj
treści `helpsystemCH` obok `helpsystem` – polski), podstawy prawne, numery kryzysowe (kraj pracy
pierwszy; każdy kraj z własnego pliku), przypadki DEMO (`DemoCase.country`; zmiana kraju w trybie
DEMO wczytuje przypadki ponownie, jak zmiana języka – D-024), kolejność scenariuszy symulatora
(`Scenario.country`, plakietka kraju) oraz teksty zależne od kraju przez kontekst i18next
(`klucz_CH`: linia kryzysowa w PDF, przemoc w rodzinie, podtytuł systemu pomocy).

## D-036 Narzędzia przesiewowe po niemiecku
Jak w PL nie tłumaczymy samodzielnie narzędzi walidowanych: `src/lib/screening/de.ts` ma puste
miejsca na oficjalne wersje DE (AUDIT, AUDIT-C, DUDIT); do tego czasu – oryginał angielski
z widocznym znacznikiem „TODO: offizielle DE-Fassung”. Wspólna funkcja `officialText()`.

## D-037 Odblokowanie biometrią
Opcjonalne, w Ustawieniach → Bezpieczeństwo. Hasło zawsze działa.
- **Android**: własna wtyczka `PrzystanBiometric` (`BiometricPlugin.java`, `androidx.biometric`
  – darmowe, utrzymywane przez Google; bez zewnętrznych pluginów). Klucz AES-256-GCM w Android
  Keystore z `setUserAuthenticationRequired(true)` i `setInvalidatedByBiometricEnrollment(true)`,
  użycie tylko przez `BiometricPrompt` + `CryptoObject` (silna biometria, każdorazowo). Szyfruje
  kopię DEK. Zmiana biometrii w systemie → `KeyPermanentlyInvalidatedException` → opcja wyłączana,
  wymagane hasło.
- **iOS / PWA**: passkey (WebAuthn) z rozszerzeniem PRF; wynik PRF → HKDF-SHA256 → klucz AES-GCM
  opakowujący kopię DEK. Opcja widoczna tylko, gdy `getClientCapabilities()` deklaruje
  `extension:prf` i jest platformowy uwierzytelniacz; przy braku PRF przy tworzeniu – błąd, opcja
  się nie włącza.
- Hasło wymagane: przy włączaniu (odszyfrowuje DEK do opakowania), po zmianie biometrii (Android),
  po 5 nieudanych próbach, co 7 dni (`src/lib/biometric/policy.ts`). Wyłączenie usuwa opakowany
  klucz (i klucz z Keystore). Przywrócenie kopii zapasowej (inny DEK) usuwa ustawienie biometrii.
- Na iOS (WebAuthn) nie da się wykryć zmiany biometrii – chroni zasada 7 dni.

## D-038 Dzienniczek praktyk, notatnik i superwizja
Nowe rodzaje zaszyfrowanych rekordów `practice` i `note` (automatycznie w kopii zapasowej).
Cel godzin w preferencjach (`practiceGoalH`, domyślnie 90). Notatki: typ `note` / `supervision`
(data, rola osoby bez danych osobowych, wnioski, zadania); otwarte zadania z superwizji na Pulpicie;
notatki w wyszukiwarce globalnej; w trybie prezentacji lista, edytor, zadania i wyniki wyszukiwania
notatek są ukryte.

## D-039 Anonimizacja w eksportach (dzienniczek, studium przypadku)
`src/lib/anonymize.ts` (best effort): kody i imiona/nazwiska osób (także formy odmienione – polska
fleksja), osoby wspierające i imiona z genogramu, e-maile, telefony PL/CH, PESEL, AHV, IBAN, adresy,
kody pocztowe; dokładne daty → miesiąc i rok. Studium przypadku ma **podgląd z edycją** i wyłączaniem
sekcji przed eksportem, z jasną informacją, że odpowiedzialność za anonimizację ma użytkownik.

## D-040 Przypomnienie o kopii
Baner na Pulpicie (tylko tryb praktyczny, gdy są dane), gdy ostatnia kopia jest starsza niż 7 dni
lub nie było żadnej; „Jutro” odkłada przypomnienie o 24 h; „Zrób kopię” prowadzi do sekcji kopii.

## D-041 Commity punktów 2–7
Punkty 2–7 powstawały równolegle (wspólne pliki: preferencje, typy, teksty). Zatwierdzono je
w osobnych commitach według grup plików; pełna weryfikacja (lint, typecheck, testy jednostkowe
i E2E) dotyczy stanu po ostatnim z nich – pośrednie commity nie były testowane osobno.

## D-042 Wersja 1.1.0 i versionCode
`versionCode` jest wyliczany w `android/app/build.gradle` z `package.json`
(`major·10000 + minor·100 + patch`): 1.0.0 → 10000, 1.1.0 → 10100. Wymóg „versionCode +1” rozumiany
jako „większy od poprzedniego” (warunek aktualizacji APK bez odinstalowania) – zachowano istniejący,
jednoznaczny schemat zamiast ręcznego licznika.

## D-043 Podgląd lokalny
`scripts/start-local.ps1` (UTF-8 z BOM, by Windows PowerShell 5.1 poprawnie pokazywał polskie znaki):
`npm ci` przy braku `node_modules`, `npm run build`, `vite preview --host`, adresy IPv4 kart
Wi-Fi/Ethernet (bez wirtualnych). Przez http na IP PWA i service worker nie działają (brak secure
context) – to wyłącznie podgląd układu.

## D-044 Usunięcie artefaktów Lighthouse z całej historii
Na życzenie właściciela usunięto katalogi `C:\Users\...\lighthouse.*` ze wszystkich commitów
(uzupełnienie D-027). `git filter-repo` wymaga Pythona (na tej maszynie go nie ma), a
`git filter-branch --index-filter` nie działa na Windows dla tych ścieżek, więc zastosowano ten
sam mechanizm co filter-repo: `git fast-export --all` → filtr strumienia (Node, odrzuca zmiany
plików o ścieżkach zaczynających się od `C:`) → `git fast-import` do nowego repozytorium. Weryfikacja
przed wypchnięciem: 25 commitów, identyczni autorzy, daty i opisy, identyczne drzewa poza ścieżkami
`C:`, drzewo HEAD bit w bit takie samo. Wypchnięto `main`, `v1.0.0`, `v1.1.0` przez
`--force-with-lease`; Release'y GitHub (powiązane z nazwą tagu) i plik APK zostały. Paczka repo:
8,6 MB → 2,1 MB. Kopia historii sprzed zmiany: bundle w katalogu tymczasowym sesji.

## D-045 Poprawki biometrii (1.1.1)
Zgłoszenie: „zawsze trzeba wpisywać hasło”. Przyczyny i poprawki:
- Android: po zejściu aplikacji do tła ekran blokady montował się, gdy strona była niewidoczna, i od
  razu otwierał okno biometrii; system go nie pokazywał, a błąd liczył się jako nieudana próba – po
  kilku wyjściach z aplikacji działała zasada „5 nieudanych prób”. Teraz okno otwiera się samo tylko,
  gdy aplikacja jest widoczna (raz na każdy powrót), a nieudaną próbą jest wyłącznie nierozpoznany
  palec / twarz (`failedAttempts` z `onAuthenticationFailed`) albo zły wynik PRF; błędy systemowe →
  `unavailable` (nie liczone).
- Okno biometrii chwilowo ukrywa stronę – auto-blokada ignoruje to (`isBioPromptActive()`),
  wcześniej mogła zablokować aplikację w trakcie włączania.
- iOS: opcja była ukryta, jeśli Safari nie deklaruje PRF w `getClientCapabilities()`; teraz ukryta
  tylko przy jawnym „nie” – resztę rozstrzyga utworzenie passkeya (`prf.enabled`). Safari wymaga
  wywołania WebAuthn bezpośrednio z gestu, a wcześniej przed nim liczono PBKDF2 hasła i czytano bazę.
  Włączanie ma teraz kroki (hasło → osobne dotknięcie „Włącz” → ewentualnie „Potwierdź”, gdy passkey
  nie zwrócił PRF przy tworzeniu), a ekran blokady wczytuje stan zawczasu.
- Na Samsungu zwykle działa tylko odcisk palca (rozpoznawanie twarzy One UI to słaba biometria –
  klasa 3 jest wymagana do odblokowania klucza w Keystore).

## D-046 Ściśnięty tekst (1.1.1)
Globalne `min-width: 0` dla `.flex-1` (D-029) pozwalało zwęzić kolumnę tekstu do kilku liter obok
przycisków (np. nagłówek „Mapa wsparcia”). Teraz: reguły globalne w `@layer base` (klasy narzędziowe
mogą je nadpisać), `.flex-1:not(:empty)` ma `min-width: min(100%, 5rem)`, a wiersze z przyciskami
i plakietkami (nagłówek strony, `ListRow`, karta spotkania, pomiary, pasek AUDIT, tytuł sekcji, daty)
zawijają się zamiast ściskać tekst. Test E2E profili Androida wykrywa tekst węższy niż 80 px
zawinięty na ≥ 3 linie.

## D-047 GitHub po angielsku
Na życzenie właściciela wszystko w zakładce Actions jest po angielsku: workflowy mają stały
`run-name` (niezależny od opisu commitu), opisy commitów od wersji 1.1.1 są po angielsku, a stare
uruchomienia z polskimi tytułami usunięto. README ma sekcje PL / EN / DE, opis repozytorium jest po
angielsku. Dokumentacja w `docs/` pozostaje po polsku.

## D-048 Biometria: diagnostyka zamiast ukrywania (1.1.2)
Zgłoszenie po 1.1.1: na Androidzie (APK) i iPhonie (iOS 18+) opcja biometrii w ogóle się nie
pokazuje. Aplikacja ukrywała ją po cichu, gdy wykrywanie zwracało „niedostępne”, więc nie było
wiadomo dlaczego. Teraz opcja jest zawsze widoczna: gdy biometria nie jest możliwa, Ustawienia
pokazują powód (status `BiometricManager` – brak odcisku, tylko słaba biometria, brak czytnika…,
albo błąd wtyczki / brak WebAuthn) i dane diagnostyczne. Na iOS deklaracje Safari
(`isUserVerifyingPlatformAuthenticatorAvailable`, `getClientCapabilities`) są tylko ostrzeżeniem –
o wyniku decyduje próba utworzenia passkeya. Etykieta Androida: „biometrią (odcisk palca)”.

## D-049 Historia zmian, kosz i dziennik audytu (1.2.0)
Cel: przypadkowa zmiana lub usunięcie nie może oznaczać utraty danych, a na żądanie kontroli
(NFZ / KCPU, sąd, inspektor ochrony danych) trzeba umieć pokazać, kto i kiedy co zrobił
(zasada rozliczalności, art. 5 ust. 2 i art. 32 RODO; nDSG art. 8).

- **Wersje.** Każdy zapis rekordu w trybie praktycznym zapisuje w tej samej transakcji
  zaszyfrowany obraz całego rekordu (tabela `versions`, AAD `v|id|kind|space`, nie da się go
  podmienić z rekordem). Zmiany w ciągu 5 minut w tej samej sesji odblokowania łączą się w jedną
  wersję (autozapis co 600 ms nie zalewa historii), a zapisy bez zmiany treści są pomijane.
  Przywrócenie wersji tworzy nową wersję „przywrócenie”, więc też je można cofnąć. Otwarte edytory
  dostają przywróconą treść (`onRevert`). Bez historii: `cardState` (postęp fiszek – zmienia się
  przy każdej karcie, bez wartości dokumentacyjnej) i cały tryb szkoleniowy (dane fikcyjne).
- **Kosz.** Usunięcie przenosi rekord (u osoby – wraz ze wszystkimi jej rekordami) do kosza na
  30 dni (wcześniej 60 s na „Cofnij”). Potem, albo na żądanie („Usuń trwale”), rekord znika
  razem z wersjami. To realizuje prawo do usunięcia danych – kosz i historia nie trzymają danych
  w nieskończoność.
- **Dziennik audytu** (tabela `audit`, tylko dopisywanie): tworzenie, zmiana, przywrócenie wersji,
  import, usunięcie, przywrócenie z kosza, trwałe usunięcie, odblokowanie (hasło / biometria),
  nieudane próby odblokowania (licznik jawny, przenoszony do dziennika przy następnym
  odblokowaniu, bo bez hasła nie ma klucza), zmiana hasła, włączenie / wyłączenie biometrii,
  każdy plik wychodzący z aplikacji (PDF, JSON, CSV, kopia), przywrócenie kopii, eksport dziennika.
  Blokowania nie zapisujemy – po zablokowaniu nie ma już klucza.
- **Ochrona przed manipulacją.** Wpisy tworzą łańcuch HMAC-SHA256 (poprzedni MAC + metadane +
  skrót zaszyfrowanych szczegółów). Klucz HMAC jest losowy, zaszyfrowany kluczem danych, więc bez
  hasła nie da się podrobić, zmienić, przestawić ani usunąć wpisu. Podpisana „głowa” (ostatni
  wpis) wykrywa ucięcie końcówki. Ograniczenie: osoba znająca hasło i mająca dostęp do bazy może
  przebudować łańcuch – to dziennik wykrywający manipulację, nie notarialny znacznik czasu.
- **Szczegóły zaszyfrowane, metadane jawne** (czas, rodzaj operacji i rekordu, identyfikatory –
  te same, które już są jawne w `records`). Po trwałym usunięciu szczegóły (np. kod osoby)
  starszych wpisów o tym rekordzie są wymazywane (`redacted`); łańcuch nadal się weryfikuje, bo
  podpisany jest skrót szczegółów, a nie same szczegóły.
- **Kopia zapasowa – format 2**: zawiera kosz, wersje, dziennik, zaszyfrowany klucz audytu i
  głowę łańcucha, więc po przywróceniu historia i dziennik trwają dalej (pierwszym nowym wpisem jest
  „przywrócono kopię”). Pliki w formacie 1 nadal działają – dziennik zaczyna się wtedy od nowa.
- **Kontrola integralności** (Ustawienia → Historia i audyt): odszyfrowuje wszystkie rekordy i
  wersje oraz weryfikuje łańcuch. **Eksport dla kontroli**: PDF (poziomo, z oświadczeniem
  o integralności) i CSV (UTF-8 z BOM, średnik – otwiera się w Excelu). **Eksport danych osoby**
  (art. 15 i 20 RODO): JSON z rekordami, historią i wpisami dziennika tej osoby.
- „Usuń wszystkie dane” nadal usuwa wszystko, także dziennik – to świadoma decyzja właściciela
  urządzenia (dane i tak przestają istnieć).

## D-050 Zakres „profesjonalizacji” w 1.2.0
Z propozycji wdrożone teraz: historia z przywracaniem, kosz, dziennik audytu z weryfikacją,
eksport PDF/CSV dla kontroli, eksport danych osoby, wpis w „Prywatności”. Odłożone (wymagają
decyzji właściciela lub serwera): podpis kwalifikowany / zewnętrzny znacznik czasu dziennika,
wielu użytkowników na jednym urządzeniu z rolami, automatyczna kopia do chmury, polityka retencji
dokumentacji konfigurowana per placówka (np. 20 lat dla dokumentacji medycznej).

## D-051 Asystent AI – architektura i tryby (1.3.0)
- AI jest opcjonalna, domyślnie **wyłączona**; trzy tryby: Wyłączony / Lokalny / Chmura (Gemini).
  W trybie Wyłączony żaden moduł AI nie tworzy providera i nie wysyła zapytań – sprawdza to test
  E2E rejestrujący każde żądanie sieciowe oraz test jednostkowy (`fetch` nie jest wywoływany).
  Przyciski AI są wtedy ukryte, więc interfejs jest taki jak w 1.2.
- Warstwa `src/lib/ai` z interfejsem `AiProvider` (generate, stream, structured), osobno
  `Embedder` i `Transcriber` (tylko lokalnie albo Gemini dla mowy bez danych osób). Zadania
  (`tasks.ts`) mają schemat JSON i walidator niezależny od dostawcy, więc ten sam kod działa
  z Gemini, lokalnym modelem i fałszywym providerem testowym.
- Gemini przez **REST `generateContent`** i `fetch`, nie przez SDK `@google/genai`: SDK ciągnie
  zależności z Node (google-auth-library, ws, protobufjs), a potrzebujemy jednego endpointu.
  Nowe Interactions API Google odrzuca w przeglądarce nagłówek `Api-Revision` (preflight 403,
  sprawdzone 04.11.2026), a klasyczne `generateContent` ma CORS także dla `capacitor://localhost`
  i `https://localhost` (sprawdzone też z aplikacji: `npm run e2e:ai-real`). Klucz tylko
  w nagłówku `x-goog-api-key`, nigdy w URL.
- Model domyślny `gemini-3.8-flash` (thinking „low” – „minimal” nie jest obsługiwane),
  alternatywa `gemini-3.5-flash-lite`. Obie z darmowym pakietem i structured output.
  `gemini-2.5-*` są wycofywane 01.12.2026 – świadomie ich nie używamy.
- 429: ponowienie maks. 2× tylko, gdy `RetryInfo.retryDelay` ≤ 20 s; dłuższe oczekiwanie (limit
  dzienny) → komunikat z liczbą minut. 5xx/408: 2 ponowienia z backoffem. 400/403 bez ponowień.

## D-052 Klucz Gemini użytkownika
Każdy używa **własnego, darmowego klucza** (bring-your-own-key). Aplikacja nie ma serwera ani
wspólnego klucza – nie ma kosztów, a użytkownik jest stroną umowy z Google. Klucz jest
szyfrowany kluczem danych (AES-GCM, AAD `ai:gemini-key`) w `db.meta`, w pamięci tylko po
odblokowaniu i **poza kopią zapasową** (kopia może trafić na inny dysk – klucz to dostęp do
konta Google). Uwaga prawna: Dodatkowe warunki Gemini API (obowiązujące od 23.03.2026) mówią,
że udostępniając „API Clients” użytkownikom w EOG/CH/UK należy korzystać z usług płatnych.
Przy modelu „własny klucz” to użytkownik jest klientem API i korzysta z niego we własnym imieniu
– to nasza interpretacja, nie opinia prawna; informujemy o tym na ekranie „AI w Przystani”.

## D-053 Prywatność: dane osób tylko lokalnie, chmura wyłącznie po pseudonimizacji i zgodzie
Każde zapytanie ma wrażliwość `content` / `study` / `client`. Strażnik (`guard.ts`):
- `client` (profil, notatki, spotkania, diagnoza, wyniki, superwizja, dzienniczek, plan nawrotów)
  → model lokalny; jeśli go nie ma – chmura **tylko** gdy w ustawieniach włączono „Zezwalaj na
  wysyłkę danych osób” (domyślnie wyłączone). Wtedy tekst jest pseudonimizowany, użytkownik
  widzi **dokładnie** tekst wysyłany do Gemini (prompt systemowy + treść) i zgadza się na to
  jedno zapytanie. Zgoda to obiekt-token wydany przez podgląd, związany z dokładnym tekstem
  i jednorazowy – inny tekst, ponowne użycie albo podrobiony token są blokowane (testy).
- Pseudonimizacja zamiast anonimizacji: stałe zamienniki („[Osoba A]”) pozwalają przywrócić
  czytelną odpowiedź lokalnie, a mapa nie opuszcza urządzenia. Lista częstych imion PL/DE/CH
  łapie osoby, których aplikacja nie zna. To siatka bezpieczeństwa – podstawą jest podgląd.
- Każda wysyłka po zgodzie trafia do dziennika audytu (`ai.cloudSend`: zadanie, liczba znaków,
  liczba zamian – bez treści).
- Tryb prezentacji: AI na danych osób tylko w trybie szkoleniowym (dane demo).
- Notatki są w wyszukiwaniu semantycznym tylko lokalnie; do Gemini w „Zapytaj” trafiają wyłącznie
  treści merytoryczne aplikacji.
- Dyktowanie danych osób – tylko Whisper na urządzeniu. Nagranie nie jest zapisywane.
- Teksty do nauki (fiszki z notatek, symulator, egzamin) mają wrażliwość `study`: idą do chmury
  bez pseudonimizacji (np. nazwiska autorów teorii muszą zostać), z widocznym ostrzeżeniem, by nie
  wklejać danych osób, i ze sprawdzaniem sygnałów kryzysu.

## D-054 Modele lokalne
- Wyszukiwanie: `Xenova/multilingual-e5-small` q8 (118 MB) – najlżejszy dobry model
  wielojęzyczny; `embeddinggemma-300m` (≈ 200–300 MB) odrzucony ze względu na rozmiar na telefonie.
- Dyktowanie: `onnx-community/whisper-base` q8 (77 MB). `whisper-tiny` jest za słaby dla
  polskiego, `whisper-small` (≈ 250 MB) zbyt ciężki dla telefonu w przeglądarce.
- LLM: `Qwen3-1.7B-q4f16_1-MLC` (WebLLM; ≈ 2 GB VRAM, flaga „low resource”) – najlepsza znana
  nam jakość PL/DE wśród modeli mieszczących się w pamięci iPhone’a; 3–4B (Qwen3-4B, gemma-4-E2B)
  ryzykują zamknięcie karty Safari. Tylko z WebGPU i `shader-f16` (iOS 26+, Chrome/WebView
  Android 12+ z Adreno/Mali). Myślenie Qwen3 wyłączone (`enable_thinking: false`), bloki
  `<think>` są usuwane.
- Pobieranie wyłącznie po świadomej zgodzie (rozmiar, zalecenie Wi‑Fi), z paskiem postępu,
  do osobnej pamięci `przystan-ai-models` (WebLLM: `webllm/*`), przycisk „Usuń wszystkie modele”.
  Poza pobieraniem Transformers.js działa z `allowRemoteModels = false` – po pobraniu nic nie
  wychodzi z urządzenia (test na prawdziwym modelu w trybie offline: `npm run e2e:ai-real`).
- Wykrywanie możliwości (WebAssembly, WebGPU, f16, pamięć, wolne miejsce): niedostępny model ma
  wyłączony przycisk i wyjaśnienie.
- Plik wasm ONNX Runtime (27 MB) nie trafia do paczki ani APK: wtyczka Vite podmienia odwołanie
  na przypiętą wersję z jsDelivr, a worker pobiera go raz (z pierwszym modelem) do tej samej
  pamięci i podaje jako `wasmBinary`. Klej `.mjs` (53 kB) jest w `public/ort/` – test pilnuje
  zgodności z zainstalowaną wersją.

## D-055 Granice merytoryczne AI
Prompty systemowe (`prompts.ts`, przegląd w `CONTENT_REVIEW.md` sekcja 14) zabraniają diagnoz,
oceny ryzyka (samobójstwa, przemocy, nawrotu, recydywy) i rekomendacji leków; nakazują
zachowanie zamienników, język bez stygmatyzacji i odwoływanie się do praktyk opartych na
dowodach. Instrukcje są po angielsku (małe modele lokalne trzymają się ich najlepiej), język
odpowiedzi jest ustawiany jawnie (DE: pisownia szwajcarska). Każda odpowiedź ma oznaczenie
„Pomocnicze – zweryfikuj” i źródło (chmura / urządzenie). Wykrywanie sygnałów kryzysu jest
lokalne, celowo nadwrażliwe i pokazuje tylko numery pomocy – nigdy nie jest prezentowane jako
ocena ryzyka. AI niczego nie nadpisuje sama: „Uporządkuj”, propozycje kreatorów i pytania do
superwizji są dopisywane dopiero po kliknięciu, a „Wstaw do notatki” dopisuje do istniejących pól.

## D-056 Symulator „na żywo”
Jedno wywołanie na wypowiedź zwraca naraz klasyfikację (kategorie inspirowane MITI jak w
obecnym symulatorze, sojusz −2…+2, komentarz, lepsza wersja) i odpowiedź rozmówcy (tekst, typ
wypowiedzi, nastrój) – połowa zapytań względem dwóch osobnych wywołań, co ma znaczenie przy
limitach darmowego pakietu. Statystyki liczy ten sam kod co w symulatorze z wyborem (`statsFrom`).
Limit 12 wypowiedzi. Głos rozmówcy: `speechSynthesis` (lokalnie). Przebieg zapisywany do nauki
w `simRun.live` (postać fikcyjna). **Tryb lokalny nie prowadzi rozmowy „na żywo”**: model 1,7B
nie gra wiarygodnie roli z oporem i ambiwalencją przy jednoczesnej poprawnej klasyfikacji MITI
w JSON – pokazujemy, że ta funkcja wymaga Chmury, a symulator z wyborem odpowiedzi działa bez
zmian. Do ponownej oceny, gdy w WebLLM pojawi się mocniejszy model mieszczący się w telefonie.

## D-057 CSP i Android
`connect-src` rozszerzone tylko o: `https://generativelanguage.googleapis.com`,
`https://huggingface.co`, `https://*.hf.co` (przekierowania CDN modeli: cdn-lfs, xet),
`https://cdn.jsdelivr.net` (wasm ONNX), `https://raw.githubusercontent.com` (biblioteki modeli
WebLLM). `script-src` bez zmian (`'self' 'wasm-unsafe-eval'`) – żaden zdalny skrypt nie jest
wykonywany jako JS. Android: `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` (dyktowanie; zgoda systemu
pytana dopiero przy pierwszym „Dyktuj”, obsługuje to `BridgeWebChromeClient` Capacitora).
Dostępność WebGPU w WebView zależy od wersji Chrome WebView na telefonie.

## D-058 Wydajność i PWA
Cały kod AI jest ładowany leniwie (dynamic import, osobne workery). Biblioteki modeli
(Transformers.js ≈ 0,5 MB, WebLLM ≈ 6 MB, pdf.js ≈ 1,8 MB) są w plikach `lazy-ai-*` **poza
prekeszem** service workera (prekesz rośnie o ≈ 100 kB interfejsu AI), a po pierwszym użyciu
trafiają do pamięci `przystan-ai-code` (CacheFirst), więc działają też offline. APK rośnie
o ≈ 14 MB (pliki są lokalne w paczce, bez pobierania). Start aplikacji i pierwszy widok nie
ładują nic z AI – także teksty interfejsu AI (`ai.json`, ≈ 6 kB gzip) są poza paczką językową
startu i ładują się po odblokowaniu (`ensureLazyNamespaces`); pierwsza wersja z nimi w paczce
startowej opóźniała FCP w Lighthouse o ≈ 0,5 s. Lighthouse 1.3.0 = 1.2.0 (90–92) na tej samej maszynie. Kontrola dobrych praktyk w kreatorach (lokalne reguły) jest widoczna tylko
z włączonym asystentem – bez AI interfejs pozostaje taki jak w 1.2.

## D-059 Gemini w praktyce: format klucza, limity, przeciążenia (1.3.1)
Pierwsza próba na prawdziwym, darmowym kluczu (05.11.2026) pokazała trzy rzeczy, których nie było
w dokumentacji:
- **Format klucza.** Google AI Studio wydaje teraz klucze `AQ.…` (ok. 50 znaków), a nie tylko
  `AIza…`. Walidacja w 1.3.0 przyjmowała wyłącznie `AIza` i blokowała zapis klucza. Teraz przyjmuje
  oba formaty i każdy inny ciąg 30–200 znaków `[A-Za-z0-9._-]` (na przyszłe formaty). Prawdziwym
  sprawdzeniem jest „Sprawdź połączenie”. Nagłówek `x-goog-api-key` działa z oboma formatami.
- **Limity.** `gemini-3.8-flash` ma w darmowym pakiecie tylko **20 zapytań dziennie** – jedna rozmowa
  w symulatorze „na żywo” zużyłaby większość. Domyślnym modelem jest więc `gemini-3.5-flash-lite`
  (jakość PL/DE we wszystkich 9 zadaniach sprawdzona testem `src/lib/ai/gemini.real.test.ts`).
  Ustawienie modelu, którego użytkownik nie wybrał sam, przechodzi na nowy domyślny (`modelChosen`).
- **Przeciążenia i limity.** Oba modele zwracały okresowo 503 „high demand”. Każdy model ma osobny
  limit, więc przy 503 (po jednym ponowieniu) albo wyczerpanym limicie dziennym aplikacja sama
  przełącza się na drugi model. Gdy oba zawiodą: czytelny komunikat („model przeciążony” albo „limit
  odnowi się za ok. N godz.”). Każde zapytanie ma limit 90 s – wcześniej zerwane połączenie mogło
  zostawić „AI pracuje…” bez końca.
- Kontrola dobrych praktyk dawała fałszywy alarm na zdaniach z zaprzeczeniem („bez straszenia”,
  „ohne Abschreckung”, „avoid scare tactics”) – zaprzeczenia są teraz pomijane (testy na
  prawdziwej odpowiedzi modelu).

## D-060 Powiadomienia bez serwera (1.4.0)
Przystań nie ma serwera i nie będzie go mieć (koszt, odpowiedzialność za dane, D-001). Powiadomienia
są więc liczone i planowane na urządzeniu: po odblokowaniu i po każdej zmianie danych (z opóźnieniem
1,5 s) silnik (`src/lib/notify/engine.ts`) wylicza terminy (spotkania, zadania, przeglądy IPR, ważne
daty, „Do zwrócenia uwagi”, kopia) i:
- na Androidzie planuje je w systemie (`@capacitor/local-notifications` 8.3.1, `allowWhileIdle`) – działają
  przy zamkniętej aplikacji; maks. 60 najbliższych, plan odtwarzany po każdym uruchomieniu;
- w przeglądarce / PWA pokazuje powiadomienie przy otwarciu (Notification Triggers porzucono, iOS nie
  ma planowania bez push – sprawdzone 05.11.2026), a na przypomnienia przy zamkniętej aplikacji
  proponuje **eksport do kalendarza** (.ics z alarmami VALARM; na iPhonie to jedyna darmowa droga).
Domyślnie wyłączone. Treść: „bez szczegółów” (domyślnie) albo „z kodami” – nigdy imiona; etykieta
nie jest nawet przekazywana do tłumaczeń (test).

## D-061 E-mail: ręcznie przez aplikację poczty, automatycznie przez własne EmailJS
- Ręcznie: `mailto:` (RFC 6068, CRLF) otwiera aplikację poczty użytkownika – wysyła on sam, ze swojego
  konta, bez pośredników. Przy długiej treści (> ok. 1800 znaków) ostrzeżenie i „Kopiuj”.
- Automatycznie (podsumowanie dnia do siebie, „Wyślij teraz”): **EmailJS z własnym, darmowym kontem
  użytkownika** (200 e-maili/mies.) – jedyna sprawdzona usługa wysyłki z przeglądarki bez własnego
  serwera. Wysyłka tylko przy otwartej, odblokowanej aplikacji. Dane EmailJS szyfrowane jak klucz Gemini.
  Odrzucone: SMTP z przeglądarki (niemożliwe), Gmail API (OAuth wymaga zarejestrowanej aplikacji i
  domeny), własny serwer (koszt, dane).

## D-062 SMS: tylko ręcznie
Bramki SMS (Twilio, SMSAPI, Vonage, Swisscom) są płatne; darmowe „bramki operatorów” nie działają
w PL / CH. Dlatego SMS są przygotowywane w Przystani (szablon / AI, licznik segmentów, polskie znaki)
i przekazywane do aplikacji SMS telefonu (`sms:numer?&body=` – działa na iOS i Androidzie). Koszt jest
w ramach abonamentu użytkownika. Push przez ntfy / Telegram odrzucone – publiczne tematy i obcy
pośrednik dla treści dotyczących osób.

## D-063 AI przy korespondencji
Szablony (11, PL/EN/DE, konwencje krajowe: „Z poważaniem”, „Freundliche Grüsse”) + AI: napisz,
odpowiedz na e-mail, popraw. Model dostaje `COMMS_GUIDE` – zasady korespondencji w pracy
resocjalizacyjnej i terapii uzależnień (poufność, RODO/nDSG, tajemnica zawodowa, nieujawnianie statusu
klienta, małoletni, sąd/kurator/KESB tylko w zakresie zapytania i bez ocen, deeskalacja, sygnały
zagrożenia → kontakt osobisty i numery pomocy, procedury jak Niebieska Karta / zgłoszenie do KESB do
sprawdzenia przez specjalistę, struktura e-maila, zasady SMS) oraz – w odpowiedzi – pytania i prośby z
otrzymanego e-maila, intencję specjalisty, wiedzę z aplikacji (3 najbliższe karty / instytucje / przepisy,
lokalnie wyszukane) i opcjonalnie nieidentyfikujące podsumowanie osoby (etap zmiany, cel, kontekst).
Wynik: temat, treść, wersja SMS, „Na co uważać”. Wiadomości o osobach mają wrażliwość `client`
(pseudonimizacja + podgląd + zgoda); przełącznik „nie zawiera danych osób” dla pism np. do szkoły o
programie. Podpis nie wychodzi do AI – „[podpis]” jest podmieniany lokalnie. Sprawdzone na prawdziwym
Gemini (odpowiedź zaniepokojonej matce: bez szczegółów terapii, propozycja rozmowy, uwagi o poufności).

## D-064 Kontakty, historia wiadomości, audyt
Nowe rodzaje rekordów `contact` i `message` – zaszyfrowane, z historią zmian i koszem jak wszystkie
dane. Wiadomość „wysłana” = przekazana do aplikacji poczty / SMS, EmailJS, schowka albo udostępniona
(Przystań nie wie, czy użytkownik faktycznie nacisnął „Wyślij” w aplikacji poczty – status mówi
„przekazano”). Dziennik audytu: `message.send` (kanał, sposób – bez treści i adresata), `notify.settings`.
Teksty interfejsu powiadomień i wiadomości ładują się po odblokowaniu (jak AI, D-058) – start bez zmian.

## D-065 SMS bezpośrednio z aplikacji (1.5.0)
Na pytanie „dlaczego nie da się wysyłać prosto z Przystani”: w 1.4 SMS-y przekazywaliśmy do aplikacji
Wiadomości, bo bez serwera nie ma darmowej bramki. W 1.5 dochodzą dwie bezpłatne drogi:
- **Z karty SIM tego telefonu** (aplikacja na Androida): własna wtyczka `PrzystanSms`
  (`SmsManager.sendMultipartTextMessage`, zgoda `SEND_SMS` pytana przy pierwszym SMS-ie, potwierdzenie
  wysłania przez `PendingIntent`, limit 60 s). Koszt – abonament użytkownika. APK jest instalowany poza
  Google Play, więc ograniczenia Play dla `SEND_SMS` nie mają zastosowania (Android 13+ może wymagać
  zezwolenia w „ustawieniach z ograniczeniami”). Przed wysłaniem zawsze potwierdzenie.
- **Darmowa bramka „SMS Gateway for Android”** (open source, sms-gate.app): dowolny telefon z Androidem
  wysyła z własnej SIM; Przystań woła publiczne API (`POST /3rdparty/v1/messages`, Basic auth). API nie
  wysyła nagłówków CORS (sprawdzone 05.11.2026), więc działa tylko z aplikacji na Androida (natywny HTTP
  `CapacitorHttp`). Treść przechodzi przez serwer sms-gate.app – ostrzeżenie przy wysyłce.
- Odrzucone: Textbelt (1 SMS/dzień, brak CORS, kraje niepewne), płatne bramki.
- iPhone: Apple nie pozwala aplikacjom webowym wysyłać SMS – zostaje aplikacja Wiadomości z gotową treścią.

## D-066 E-mail prosto z Gmaila (logowanie Google)
E-maile mogą wychodzić z konta Gmail użytkownika bez aplikacji poczty i bez pośredników:
- **Przeglądarka / PWA:** Google Identity Services (token client, okno logowania) z **własnym
  identyfikatorem klienta OAuth** użytkownika (typ „Aplikacja internetowa”, źródło
  `https://michaelkuchno.github.io`) + Gmail API `users.messages.send` (CORS sprawdzony na żywo).
  Zakres tylko `gmail.send` („wysyłanie w Twoim imieniu” – bez czytania poczty; zakres „wrażliwy”,
  nie „zastrzeżony”) + `email`. Token tylko w pamięci (~1 h). Wiadomość RFC 2822, UTF-8 (nagłówki RFC 2047),
  base64url – test jednostkowy z polskimi znakami.
- **Aplikacja na Androida:** Google zabrania OAuth w WebView (`disallowed_useragent`), dlatego własna
  wtyczka `PrzystanGoogle` z natywnym `AuthorizationClient` (play-services-auth 21.3.0). Wymaga klienta
  OAuth typu „Android” z pakietem `pl.przystan.app` i odciskiem SHA-1 klucza podpisu
  `3A:1B:64:F6:AF:22:B3:6E:FA:03:13:27:94:50:C9:E0:DC:5A:AA:FA` (odczytany z logu budowania APK).
- Aplikacja Google pozostaje w trybie „Testowanie” (do 100 użytkowników testowych, bez weryfikacji
  Google; ostrzeżenie „niezweryfikowana aplikacja”; zgoda może wygasać po 7 dniach) – dla własnego
  użytku wystarczy. Instrukcja krok po kroku w aplikacji (Ustawienia → Powiadomienia i wiadomości).
- EmailJS (D-061) zostaje jako alternatywa bez Google Cloud – także z usługą Gmail (wysyła z jej adresu).
- iPhone PWA: zachowanie okna logowania Google w trybie „z ekranu początkowego” nie jest
  udokumentowane – do sprawdzenia na urządzeniu; w razie problemów: Safari albo EmailJS.

## D-067 Studia: program WSHE Brzeg
Badanie (05.11.2026): w Brzegu działa wyłącznie WSHE; dla absolwentki studiów licencjackich innej
uczelni pasuje **Pedagogika II stopnia, specjalność „Pedagogika resocjalizacyjna z profilaktyką
uzależnień”** (nowa od 2025/26). WSHE nie opublikowała planu tej specjalności, więc program złożono z
oficjalnych dokumentów (II st.: przedmioty ogólne i moduł resocjalizacyjny; I st.: sylabusy przedmiotów o
uzależnieniach jako jawnie oznaczone „odpowiedniki”). Treści są streszczone, ze źródłami. Ponieważ plan
grupy może się różnić, wszystko jest edytowalne (ukryj / dodaj przedmiot, własne tematy, daty).

## D-068 AI w nauce: tylko dane uczelni
„Zapytaj” odpowiada wyłącznie z ponumerowanych źródeł – fragmentów sylabusa i materiałów z zajęć –
z cytowaniem [n]; jeśli źródła nie wystarczają: `known=false` i wskazanie przedmiotu / literatury.
Egzaminy próbne i fiszki z AI powstają „w zakresie tematów sylabusa” (+ materiały). „Wytłumacz na
egzamin” korzysta z ogólnej wiedzy akademickiej w granicach tematu i literatury z sylabusa i kończy się
wskazaniem pozycji do sprawdzenia. Odpowiedzi do egzaminu z błędnym kluczem (indeks spoza zakresu) są
odrzucane, nie „naprawiane”. Bez AI moduł działa w pełni: wyszukiwanie, samoocena tematów, fiszki,
test z własnych fiszek.

## D-069 Nauka „miła i przyjemna”
Cel dzienny (15 fiszek / pytań), seria dni, pierścień gotowości przedmiotu (tematy „umiem”, opanowane
fiszki, najlepszy egzamin próbny), odliczanie do egzaminu, karta na pulpicie, życzliwe komunikaty
po egzaminie próbnym. Własne materiały mają pierwszeństwo w wynikach wyszukiwania (×1,5). Teksty
modułu ładują się po odblokowaniu (start bez zmian).
