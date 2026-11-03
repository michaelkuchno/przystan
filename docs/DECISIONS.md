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
(commit `26b248e`). Historia nie została przepisana – starsze commity nadal je zawierają.
Lighthouse uruchamia się teraz przez `npm run lighthouse` (`scripts/lighthouse.mjs`), który
tworzy profil Chrome w katalogu tymczasowym systemu (`os.tmpdir()`) i usuwa go po zakończeniu.
`.gitignore` blokuje `C:*`, `**/lighthouse.*/` i `lighthouse-report`.
