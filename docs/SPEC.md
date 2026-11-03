# SPEC – „Przystań / Harbor” – aplikacja dla pedagoga resocjalizacyjnego i specjalisty ds. uzależnień (PL/EN)

## 0\. Tryb pracy – PRZECZYTAJ NAJPIERW

Jesteś zespołem w jednej osobie: senior full-stack/mobile engineer, UX/UI designer, QA oraz ekspert merytoryczny w pedagogice resocjalizacyjnej, profilaktyce i terapii uzależnień. Budujesz aplikację od zera do końca.

**Pracujesz w pełni autonomicznie:**

* **Nie zadajesz mi żadnych pytań.** Każdą niejasność rozstrzygasz sam, wybierając rozwiązanie najlepsze dla praktyka w tej dziedzinie i najzgodniejsze z tą specyfikacją. Każdą istotną decyzję zapisujesz w `docs/DECISIONS.md` (decyzja + krótkie uzasadnienie).
* Nie czekasz na akceptację planu. Najpierw zapisujesz plan w `docs/PLAN.md`, potem od razu go realizujesz.
* Prowadzisz `docs/PROGRESS.md`: co zrobione, co w toku, co dalej. Aktualizujesz go po każdym etapie. **Jeśli sesja zostanie przerwana, na polecenie „kontynuuj według docs/PROGRESS.md” wznawiasz pracę dokładnie od miejsca przerwania.**
* Po każdym etapie: `lint` + testy + build muszą przejść. Naprawiasz błędy sam. Robisz commit w git z czytelnym opisem.
* Jeśli brakuje narzędzia (np. Node, JDK, Android SDK), instalujesz je sam, jeśli to możliwe. Jeśli nie, wybierasz alternatywę (np. budowanie przez GitHub Actions) i idziesz dalej. Wszystko, czego naprawdę nie da się zrobić bez mnie, zbierasz na końcu w `docs/HANDOVER.md` jako krótką listę kroków.
* Nie kończysz pracy, dopóki nie ma obu artefaktów końcowych z sekcji 9 (albo, jeśli jakiś krok wymaga mojego konta, dopóki wszystko poza tym krokiem nie jest gotowe i opisane).

## 1\. Cel produktu i użytkowniczka

Użytkowniczka: studentka studiów II stopnia na kierunku **pedagogika, specjalność „Pedagogika resocjalizacyjna z profilaktyką uzależnień”** (z licencjatem z pedagogiki resocjalizacyjnej), planująca dalsze szkolenie w kierunku certyfikatu specjalisty terapii uzależnień. Lubi gotować.

Jej przyszłe miejsca pracy to m.in.: poradnie i ośrodki dla osób uzależnionych, ośrodki kuratorskie, zakłady karne i poprawcze, schroniska dla nieletnich, ośrodki readaptacji społecznej i pomocy postpenitencjarnej, ośrodki dla osób bezdomnych, pogotowia opiekuńcze, PCPR, ośrodki interwencji kryzysowej, szkoły i świetlice (profilaktyka).

Aplikacja ma:

* realnie pomagać w pracy z wieloma podopiecznymi (diagnoza pedagogiczna, indywidualny program, spotkania, praca nad zmianą, zapobieganie nawrotom, praca z rodziną),
* pomagać w **projektowaniu programów profilaktycznych**,
* pomagać w nauce i być narzędziem do pokazania na uczelni (efekt „wow” u wykładowców: spójność, rzetelność merytoryczna, osadzenie w polskim systemie, jakość UX),
* działać **bez opłat, bez serwerów i w 100% offline**, na **iOS i Androidzie**,
* mieć pełny wybór języka **polski / angielski**.

To narzędzie wspierające pracę i naukę. **Nie stawia diagnoz medycznych i nie podejmuje decyzji za specjalistę.** Wszystkie wskaźniki i podpowiedzi są oznaczone jako pomocnicze. Pokaż to w ekranie „O aplikacji” i w onboardingu.

**Język i perspektywa:** pedagogiczna i resocjalizacyjna, nie medyczna. Domyślnie „podopieczny / podopieczna” (w ustawieniach możliwość zmiany na „klient”, „wychowanek” lub „uczestnik”). Język bez stygmatyzacji („osoba z problemem alkoholowym”, nie „alkoholik”; „osoba opuszczająca zakład karny”, nie „więzień”), w obu językach.

## 2\. Architektura i stos (decyzja podjęta – nie zmieniaj)

Jeden kod źródłowy, dwa wyniki:

1. **PWA** (Progressive Web App) – instalowana na **iPhonie** przez Safari → Udostępnij → „Do ekranu początkowego” (działa także na Androidzie). Hosting za darmo na **GitHub Pages**.
2. **Android APK** – ta sama aplikacja opakowana w **Capacitor**, do wysłania mailem i instalacji bezpośrednio z pliku.

Uzasadnienie (wpisz do DECISIONS.md): darmowa, samodzielna aplikacja natywna na iOS nie jest możliwa bez płatnego konta Apple Developer; Expo Go wymaga ciągle działającego serwera deweloperskiego. PWA działa offline, instaluje się jak aplikacja i nic nie kosztuje.

Stos:

* React 18+, TypeScript (strict), Vite
* `vite-plugin-pwa` (Workbox): manifest, service worker, pełny precache, ikony i splash screeny wygenerowane w projekcie, poprawne meta-tagi Apple, `display: standalone`, obsługa safe-area/notcha
* Capacitor (Android): `@capacitor/haptics` (wibracje na Androidzie; na iOS w PWA brak wibracji – obsłuż to łagodnie), `@capacitor/filesystem` + `@capacitor/share` do eksportu plików
* Dane: IndexedDB przez **Dexie.js**, wersjonowany schemat i migracje; przy starcie `navigator.storage.persist()`
* Routing: React Router (hash routing pod GitHub Pages)
* i18n: `i18next` + `react-i18next`, pliki `src/locales/pl/\\\*.json` i `src/locales/en/\\\*.json`, wszystkie teksty i treści merytoryczne w obu językach, przełącznik w ustawieniach i na onboardingu, domyślnie język systemu. Treści o polskim systemie prawnym i instytucjonalnym w wersji EN tłumaczone z dopiskiem, że dotyczą Polski.
* UI: Tailwind CSS + własny design system (tokeny kolorów, typografia, odstępy), komponenty dostępne (np. Radix UI), animacje Framer Motion z obsługą `prefers-reduced-motion`
* Wykresy: Recharts (lub lżejsza alternatywa – zdecyduj)
* Raporty PDF: generowanie po stronie klienta (np. `pdfmake` lub widok do druku z CSS `@media print` – zdecyduj, ma działać offline na iOS i Androidzie)
* Testy: Vitest + React Testing Library, Playwright (E2E, w tym scenariusz offline i zmiana języka), ESLint + Prettier
* **Zero** zewnętrznych zapytań sieciowych w działającej aplikacji: żadnej analityki, trackerów, CDN, Google Fonts (fonty bundlowane lokalnie)

## 3\. Bezpieczeństwo i prywatność danych podopiecznych (wymóg krytyczny)

Dane o zdrowiu, uzależnieniu i karalności to dane szczególnie chronione (RODO w Polsce, nDSG w Szwajcarii). Zaimplementuj:

* **Szyfrowanie danych w spoczynku:** wrażliwe pola szyfrowane AES-GCM przez Web Crypto API; klucz wyprowadzany z hasła/PIN-u (PBKDF2, dużo iteracji, losowa sól). Kreator przy pierwszym uruchomieniu wyraźnie informuje, że **utrata hasła = utrata danych**.
* Automatyczna blokada po bezczynności (konfigurowalna) i przy przejściu w tło; zasłanianie treści na przełączniku aplikacji.
* **Pseudonimizacja domyślnie:** podopieczny identyfikowany kodem/inicjałami; pole na pełne dane opcjonalne i opisane jako niezalecane.
* Eksport kopii zapasowej jako **zaszyfrowany** plik (import z walidacją), plus eksport pojedynczego raportu PDF bez danych identyfikujących.
* Przy pierwszym dodaniu podopiecznego krótki komunikat: dane realnych osób prowadź zgodnie z zasadami placówki, tajemnicą zawodową i RODO; w czasie studiów i praktyk korzystaj z trybu szkoleniowego.
* Ekran „Prywatność” opisujący prosto, co i gdzie jest przechowywane (tylko na tym urządzeniu).

## 4\. Tryby pracy

* **Tryb praktyczny:** prawdziwa praca, dane zaszyfrowane.
* **Tryb szkoleniowy / demo:** osobna, odizolowana przestrzeń z **fikcyjnymi, realistycznymi studiami przypadków** (min. 8), m.in.:

  * 16-latek w młodzieżowym ośrodku wychowawczym, konopie + wagary, konflikt z rodziną,
  * 15-latka nadużywająca internetu i gier, wycofanie społeczne,
  * mężczyzna po opuszczeniu zakładu karnego, problem alkoholowy, readaptacja i szukanie pracy,
  * osoba w kryzysie bezdomności z problemem alkoholowym,
  * młody dorosły pod dozorem kuratora, stymulanty,
  * mężczyzna z problemem hazardowym i długami,
  * matka w roli osoby współuzależnionej (praca z rodziną),
  * grupa: klasa szkolna jako adresat programu profilaktycznego.
    Każdy przypadek ma pełną historię: diagnozę pedagogiczną, program, spotkania, pomiary, wykresy. Wyraźny znacznik „DEMO” w interfejsie. To główny materiał do prezentacji na uczelni.

## 5\. Moduły

### 5.1 Pulpit

* Przegląd: dzisiejsze spotkania, podopieczni wymagający uwagi, zadania, postęp nauki.
* Wskaźniki uwagi oparte na **przejrzystych regułach** (np. wzrost cravingu, pogorszenie wyniku skali, opuszczone spotkanie, zbliżający się termin, np. koniec dozoru lub opuszczenie placówki). Każdy wskaźnik pokazuje, z czego wynika. Nazwa: „Do zwrócenia uwagi”.

### 5.2 Podopieczni (wielu jednocześnie)

* Lista z wyszukiwaniem, filtrami (kontekst pracy, problem, etap zmiany, status), sortowaniem.
* Profil: kod, wiek/grupa wiekowa, **kontekst pracy** (poradnia, ośrodek, zakład karny/poprawczy, kuratela, szkoła, środowisko otwarte, streetworking), problem(y) – substancje i uzależnienia behawioralne, cel (abstynencja / ograniczanie szkód), etap zmiany (model transteoretyczny), **mocne strony i zasoby**, sieć wsparcia, sytuacja rodzinna, edukacyjna i zawodowa.
* **Diagnoza pedagogiczna / resocjalizacyjna:** ustrukturyzowany formularz – obszary funkcjonowania (rodzina, szkoła/praca, grupa rówieśnicza, czas wolny, zdrowie, używanie substancji, zachowania ryzykowne, kontakt z wymiarem sprawiedliwości), czynniki ryzyka i czynniki chroniące, zasoby, wnioski. Prezentacja graficzna (np. wykres radarowy obszarów).
* **Indywidualny program (IPR / plan pracy):** cele SMART, działania, osoby odpowiedzialne, terminy, przegląd postępów, ewaluacja.
* **Plan zapobiegania nawrotom:** sytuacje wysokiego ryzyka, wyzwalacze, sygnały ostrzegawcze, strategie radzenia sobie, osoby i miejsca wsparcia, plan na wypadek „poślizgu”. Eksport jako karta dla podopiecznego.
* **Oś czasu:** spotkania, pomiary, zmiany etapu, ważne wydarzenia (rozprawy, przepustki, zmiana placówki, powrót do szkoły), nawroty opisywane bez oceniania.
* **Genogram / ekomapa:** prosty, dotykowy edytor relacji rodzinnych i środowiskowych (z legendą), przydatny w pracy z rodziną.
* Wykresy postępów.

### 5.3 Spotkania

* **Tryb spotkania:** start/stop, timer, agenda, szybkie notatki, uruchamianie narzędzi z 5.4, zadanie do wykonania na koniec.
* Notatki do wyboru: **notatka z przebiegu spotkania** (cel – przebieg – obserwacje – ustalenia – kolejny krok), **DAP**, **karta obserwacji pedagogicznej**.
* Spotkania indywidualne, grupowe i rodzinne.
* **Kreator zajęć („przepis na zajęcia”)** – akcent kulinarny w estetyce kart: przeciąganie „składników” (ćwiczeń i interwencji) na oś czasu z budżetem minut, szablony (pierwsze spotkanie, rozmowa motywująca, analiza łańcuchowa, zajęcia socjoterapeutyczne, trening umiejętności społecznych, sesja z rodziną, zajęcia profilaktyczne w klasie), zapis własnych „przepisów”, ładna karta do eksportu PDF.

### 5.4 Narzędzia interaktywne (do używania razem z podopiecznym)

Każde narzędzie: tryb pełnoekranowy „pokaż podopiecznemu” (bez danych osobowych) + zapis wyniku do karty. Wersje językowe dostosowane do młodzieży i dorosłych.

* **Surfowanie na fali głodu (urge surfing):** animowana fala, oddech, ocena cravingu 0–10 przed/po.
* **Linijka gotowości** 0–10 (ważność / pewność / gotowość) z pytaniami MI.
* **Balans decyzyjny** – interaktywna macierz.
* **Analiza łańcuchowa** – wizualny łańcuch wyzwalacz → myśli → emocje → zachowanie → konsekwencje.
* **HALT** – szybki check-in.
* **Dziennik myśli (CBT)** ze zniekształceniami poznawczymi.
* **Skalowanie i pytanie o cud** (podejście skoncentrowane na rozwiązaniach – TSR/SFBT).
* **Mapa wyzwalaczy** i **mapa wsparcia** – dotykowe, wizualne.
* **Uziemienie 5-4-3-2-1** i ćwiczenie oddechowe.
* **Trening umiejętności społecznych:** karty sytuacji do odgrywania ról (odmowa, radzenie sobie z presją grupy, rozwiązywanie konfliktu, rozmowa o pracę).

### 5.5 Przesiewowe narzędzia i pomiary

* Zaimplementuj narzędzia **swobodnie dostępne do użytku**, z automatycznym liczeniem i interpretacją progową zgodną z oficjalnym źródłem: **AUDIT**, **AUDIT-C**, **DUDIT**, **CRAFFT** (młodzież), **CAST** (konopie), **Fagerström (FTND)**, **PGSI** (hazard). Zweryfikuj status licencji każdego i wpisz go do DECISIONS.md; narzędzie o niejasnym statusie pomiń.
* Wyraźnie oznacz w UI, że to **narzędzia przesiewowe**, a nie diagnoza.
* **Nie tłumacz samodzielnie narzędzi walidowanych.** Wersję angielską wprowadź zgodnie z oficjalnym źródłem; dla polskiej przygotuj strukturę na oficjalne polskie tłumaczenie i oznacz pozycje `TODO: wstaw oficjalną polską wersję walidowaną`, z widocznym znacznikiem w UI.
* Wyniki zapisywane z datą, widoczne na wykresach w profilu.

### 5.6 Profilaktyka (moduł kluczowy dla tej specjalności)

* **Kreator programu profilaktycznego** krok po kroku:

  1. diagnoza potrzeb i zasobów środowiska (np. szkoły, świetlicy, osiedla),
  2. grupa docelowa i **poziom profilaktyki: uniwersalna / selektywna / wskazująca**,
  3. czynniki ryzyka i chroniące, na które program oddziałuje,
  4. cele ogólne i szczegółowe,
  5. strategie (np. edukacja normatywna, rozwijanie umiejętności życiowych, alternatywy, interwencje wobec rodziców) i scenariusze zajęć (z kreatora z 5.3),
  6. harmonogram i zasoby,
  7. **ewaluacja** (wskaźniki, ankiety pre/post, wykres zmian).

* Lista kontrolna zgodności z dobrymi praktykami w profilaktyce: czego unikać (np. straszenie, jednorazowe pogadanki, pokazywanie „ofiar” jako jedyna metoda) i co działa – z krótkim uzasadnieniem i źródłami.
* Odniesienie do standardów jakości programów profilaktycznych w Polsce i **systemu rekomendacji programów profilaktycznych** (opisz własnymi słowami, oznacz do weryfikacji).
* Eksport gotowego programu do PDF jako estetyczny dokument (dobry do zaliczeń i praktyk).

### 5.7 Resocjalizacja i readaptacja

* Karty wiedzy: koncepcje resocjalizacji (m.in. twórcza resocjalizacja), niedostosowanie społeczne, socjoterapia, praca w środowisku otwartym, streetworking, readaptacja i pomoc postpenitencjarna, mediacja.
* **Plan readaptacji** dla osoby opuszczającej placówkę/zakład: mieszkanie, dokumenty, praca/edukacja, zdrowie i leczenie uzależnienia, relacje, wsparcie instytucjonalne – lista kontrolna z terminami.
* Szablon **programu socjoterapeutycznego** (cele, zasady grupy, cykl spotkań).

### 5.8 Rodzina

* Karty wiedzy: współuzależnienie, dzieci z rodzin z problemem alkoholowym, przemoc w rodzinie (z jasnym wskazaniem procedur i ścieżek pomocy), CRAFT (wzmacnianie rodziny w motywowaniu bliskiej osoby).
* Narzędzia: genogram/ekomapa (z 5.2), plan wsparcia dla rodziny.

### 5.9 System pomocy w Polsce (przewodnik „gdzie skierować”)

* Przejrzysta mapa systemu: poradnie leczenia uzależnień, ośrodki stacjonarne i dzienne, hostele, punkty konsultacyjne, gminne komisje rozwiązywania problemów alkoholowych, ośrodki pomocy społecznej, PCPR, kuratorzy, grupy samopomocowe (AA, NA, Al-Anon, AH itp.), telefony zaufania.
* Interaktywny **„kreator skierowania”**: wybierasz sytuację (np. „nieletni + substancje + szkoła”, „osoba po wyroku + alkohol”) → aplikacja pokazuje możliwe ścieżki i instytucje z krótkim opisem roli.
* **Podstawy prawne** (krótko, własnymi słowami, z datą stanu i znacznikiem do weryfikacji): ustawa o wychowaniu w trzeźwości i przeciwdziałaniu alkoholizmowi, ustawa o przeciwdziałaniu narkomanii, ustawa o wspieraniu i resocjalizacji nieletnich, przepisy o obowiązku leczenia odwykowego; rola instytucji centralnej odpowiedzialnej za politykę wobec uzależnień. **Sprawdź aktualną nazwę i kompetencje tej instytucji; nie opisuj nieistniejących już urzędów jako aktualnych.**

### 5.10 Wiedza (baza oparta na dowodach)

* Karty podejść: dialog motywujący (OARS, DARN-CAT, praca z oporem/niezgodą), model transteoretyczny, CBT w uzależnieniach, zapobieganie nawrotom (Marlatt i Gordon), terapia skoncentrowana na rozwiązaniach, terapia grupowa i ułatwianie 12 kroków, podejście wzmacniania społecznego (CRA) i CRAFT, zarządzanie wzmocnieniami, umiejętności DBT, redukcja szkód, uzależnienia behawioralne (hazard, internet, gry, zakupy), uzależnienia u młodzieży, współwystępowanie zaburzeń.
* Każda karta: istota, kiedy stosować, kluczowe techniki, przykładowe sformułowania, typowe błędy, źródła (autorzy, rok, tytuł). Pisz **własnymi słowami**, rzeczowo, zwięźle. Uwzględnij literaturę obecną w polskich programach studiów (np. Miller, Forcehimes, Zweben – „Terapia uzależnień. Podręcznik dla profesjonalistów”; Miller i Rollnick – dialog motywujący).
* **Nie kopiuj dosłownie DSM-5 ani tekstów z płatnych podręczników.** Kryteria uzależnienia jako krótkie streszczenie z odnośnikiem (ICD-11, DSM-5-TR). Bez porad dotyczących dawkowania leków.
* **Wyszukiwarka** w całej bazie wiedzy i we wszystkich modułach.
* Wszystkie treści merytoryczne oznacz polem `reviewStatus: "do\\\_weryfikacji"` z subtelnym znacznikiem w UI, który autorka może zmienić na „zweryfikowane”.

### 5.11 Symulator rozmowy motywującej (efekt „wow”)

* Rozgałęzione scenariusze rozmowy z wirtualnym podopiecznym (min. 10, w PL i EN), dopasowane do kontekstów pracy: nastolatek w ośrodku wychowawczym, osoba pod dozorem kuratora, osoba po wyroku, rodzic osoby uzależnionej, uczeń po incydencie w szkole, osoba z problemem hazardowym. Zapisane jako dane JSON.
* Wybór spośród 3–4 odpowiedzi; każda sklasyfikowana wg kategorii inspirowanych kodowaniem MITI (refleksja prosta/złożona, pytanie otwarte/zamknięte, dowartościowanie, konfrontacja, moralizowanie, doradzanie bez pozwolenia).
* Na żywo dwa paski: **relacja / sojusz** i **wypowiedzi o zmianie vs. podtrzymanie**. Rozmówca reaguje różnie zależnie od wyboru.
* Podsumowanie ze statystykami (stosunek refleksji do pytań, odsetek pytań otwartych), komentarz do każdej decyzji, możliwość powtórzenia.
* Delikatne animacje i wibracje (Android).

### 5.12 Nauka

* Fiszki z powtórkami rozłożonymi w czasie (algorytm typu SM-2), talie startowe PL/EN z każdego modułu (resocjalizacja, profilaktyka, uzależnienia, prawo, MI), własne talie, import/eksport JSON.
* **Tryb przygotowania do egzaminu:** quiz z losowymi pytaniami z wybranych talii, wynik i lista do powtórki.

### 5.13 Ustawienia i inne

* Język PL/EN, nazewnictwo (podopieczny/klient/wychowanek/uczestnik), motyw jasny/ciemny/systemowy, rozmiar tekstu, czas automatycznej blokady, zmiana hasła.
* Kopia zapasowa i przywracanie (zaszyfrowane).
* „O aplikacji”, „Prywatność”, źródła.
* **Pomoc w kryzysie** – stały, łatwo dostępny link: Szwajcaria 143 (Die Dargebotene Hand), 147 (dla dzieci i młodzieży), 144 (pogotowie); Polska 116 123 (wsparcie emocjonalne dla dorosłych), 116 111 (dla dzieci i młodzieży), 800 120 002 (Niebieska Linia – przemoc w rodzinie), 112. Oznacz numery jako do weryfikacji.

## 6\. Design i UX (cel: „wow” i przyjemność użycia)

* Styl: spokojny, nowoczesny, profesjonalny, ciepły. Paleta: szałwia, przygaszony błękit, ciepły beż, akcent terakota (nawiązanie do kuchni). Tryb jasny i ciemny dopracowane równorzędnie.
* Mobile-first, ale responsywny na tablet i laptop (prezentacja na uczelni z rzutnika – dodaj **tryb prezentacji**: większa czcionka, ukrycie danych, nawigacja strzałkami).
* Mikrointerakcje: płynne przejścia, informacja zwrotna po każdej akcji, przemyślane puste stany z zachętą do pierwszego kroku, skeletony, cofanie usunięcia.
* Onboarding w 3–4 ekranach: wybór języka, hasło, prezentacja modułów, wybór trybu (praktyczny / szkoleniowy).
* Spójność: jeden design system, te same wzorce dla list, formularzy i kart w całej aplikacji.
* Dostępność: kontrast WCAG 2.1 AA, etykiety ARIA, VoiceOver/TalkBack, pola dotykowe min. 44 px, skalowanie czcionki.

## 7\. Jakość

* Testy jednostkowe logiki: liczenie wyników narzędzi przesiewowych, szyfrowanie/odszyfrowanie, migracje bazy, algorytm SRS, reguły wskaźników uwagi, kreator skierowania, import/eksport.
* Testy E2E (Playwright): onboarding, dodanie podopiecznego z diagnozą, spotkanie z narzędziem, wypełnienie narzędzia przesiewowego, utworzenie programu profilaktycznego z eksportem PDF, zmiana języka, działanie offline, kopia zapasowa i przywrócenie.
* Lighthouse: PWA installable, Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90.
* Brak ostrzeżeń TypeScript i ESLint.

## 8\. Etapy realizacji

1. Szkielet: Vite + React + TS, Tailwind, design system, i18n PL/EN, routing, PWA, Capacitor Android, CI.
2. Warstwa danych: Dexie, szyfrowanie, hasło, blokada, migracje, kopia zapasowa.
3. Onboarding, tryby praktyczny/szkoleniowy, dane demo.
4. Podopieczni: profil, diagnoza pedagogiczna, IPR, plan zapobiegania nawrotom, oś czasu, genogram/ekomapa.
5. Spotkania, notatki, kreator zajęć.
6. Narzędzia interaktywne.
7. Narzędzia przesiewowe i wykresy.
8. Profilaktyka (kreator programu z ewaluacją i PDF).
9. Resocjalizacja, rodzina, system pomocy i kreator skierowania.
10. Baza wiedzy z wyszukiwarką.
11. Symulator rozmowy motywującej.
12. Nauka: fiszki i tryb egzaminu.
13. Pulpit, wskaźniki uwagi, raporty PDF, tryb prezentacji.
14. Szlif UX, dostępność, wydajność, testy E2E, Lighthouse.
15. Build i dystrybucja (sekcja 9), dokumentacja.

## 9\. Artefakty końcowe (definicja „gotowe”)

1. **Android:** podpisany plik `release/przystan-<wersja>.apk`.

   * Wygeneruj stały keystore narzędziem `keytool` i przechowuj go **poza repozytorium** (np. w katalogu domowym), hasła zapisz w `docs/HANDOVER.md` w sekcji „przechowaj bezpiecznie”. Ten sam klucz jest konieczny do przyszłych aktualizacji – inaczej aktualizacja wymaga odinstalowania i utraty danych.
   * Buduj lokalnie przez Gradle, jeśli Android SDK jest dostępne lub da się je zainstalować z linii komend. W przeciwnym razie przygotuj workflow GitHub Actions budujący APK (keystore jako sekrety repozytorium, ustawione przez `gh secret set`, jeśli `gh` jest zalogowane).

2. **iOS (i Android):** PWA opublikowana na GitHub Pages przez workflow GitHub Actions, z działającym adresem URL.

   * Repozytorium może być publiczne – w kodzie nie ma żadnych danych podopiecznych. Jeśli `gh` jest zalogowane, utwórz repozytorium i wypchnij kod sam; jeśli nie, przygotuj wszystko i opisz w HANDOVER.md 3–4 komendy do wykonania.

3. **`README.md` po polsku**, a w nim:

   * **Instalacja na iPhonie:** otwórz link w Safari → Udostępnij → „Do ekranu początkowego” (krok po kroku).
   * **Instalacja na Androidzie z maila:** pobierz załącznik APK → zezwól na instalację z tego źródła → zainstaluj (krok po kroku), oraz alternatywnie instalacja PWA z Chrome.
   * Jak zrobić i przywrócić kopię zapasową oraz dlaczego to ważne.
   * Jak aktualizować aplikację (PWA aktualizuje się sama po otwarciu z internetem; APK – nowy plik podpisany tym samym kluczem).
   * Jak dodawać własne talie, scenariusze, przepisy na zajęcia i treści.

4. **`docs/HANDOVER.md`:** krótka lista rzeczy, które muszę zrobić ręcznie (jeśli w ogóle), z gotowymi komendami.
5. **`docs/CONTENT\\\_REVIEW.md`:** lista wszystkich treści merytorycznych, prawnych, numerów telefonów i narzędzi przesiewowych do weryfikacji przez autorkę, z ich lokalizacją w kodzie.

Na koniec wypisz w konsoli krótkie podsumowanie: ścieżkę do APK, adres PWA (lub komendy do jego uruchomienia) i liczbę testów, które przeszły.

**Zaczynaj teraz. Bez pytań.**



