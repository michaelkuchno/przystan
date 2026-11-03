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
