# HANDOVER – stan projektu i co zostało do zrobienia ręcznie

Wersja **1.4.0**. Repozytorium: https://github.com/michaelkuchno/przystan (konto `michaelkuchno`).

| Co | Gdzie |
|---|---|
| PWA (iPhone / Android / komputer) | https://michaelkuchno.github.io/przystan/ – aktualizuje się przy każdym pushu na `main` (workflow „Deploy PWA to GitHub Pages”) |
| APK (Android) | https://github.com/michaelkuchno/przystan/releases/latest – workflow „Android APK” po tagu `v*` buduje podpisany APK i dołącza go do Release |
| Podgląd lokalny | `scripts/start-local.ps1` (patrz README) |

## 1. Weryfikacja na urządzeniach (nie da się jej zautomatyzować)

**Samsung Galaxy (One UI, Android 15/16, APK):**
- [ ] Nagłówek nie wchodzi pod pasek stanu, a dolna nawigacja pod pasek gestów / przyciski
      (oba tryby nawigacji systemowej), także w poziomie (wycięcie aparatu).
- [ ] Ustawienia → Wyświetlacz → Rozmiar czcionki na maksimum: tekst rośnie, układ się nie rozjeżdża,
      nie ma przewijania w poziomie (D-029).
- [ ] Tryb ciemny systemu + „Tryb ciemny dla aplikacji” One UI: aplikacja nie jest odwracana;
      ikony pasków systemowych czytelne w jasnym i ciemnym motywie aplikacji.
- [ ] Klawiatura: pola formularzy (np. nowy podopieczny, notatka, logowanie) nie są zasłaniane,
      dolna nawigacja chowa się przy pisaniu.
- [ ] Biometria: włączenie (wymaga hasła), odblokowanie odciskiem/twarzą, „Użyj hasła”;
      dodanie nowego odcisku w systemie → aplikacja wyłącza biometrię i prosi o hasło;
      5 nieudanych prób → hasło. Zrzuty ekranu nadal zablokowane (FLAG_SECURE).
- [ ] Aktualizacja: instalacja APK 1.1.0 **na** 1.0.0 zachowuje dane.

**iPhone (Safari, PWA z ekranu początkowego):**
- [ ] Wycięcie / Dynamic Island i pasek domowy – bez nakładania się.
- [ ] Face ID / Touch ID (passkey z PRF, iOS 18+): włączenie, odblokowanie; na starszym iOS opcja
      ma być niewidoczna.
- [ ] Eksport PDF (dzienniczek praktyk, studium przypadku) – arkusz udostępniania.

**Wersja 1.2 – historia i audyt (oba telefony):**
- [ ] Aktualizacja 1.1.x → 1.2.0 zachowuje dane (migracja bazy do wersji 3).
- [ ] Notatka: zmiana treści, potem Historia → „Przywróć tę wersję” – treść wraca od razu.
- [ ] Usunięcie osoby → Ustawienia → Historia i audyt → Kosz → Przywróć (wraca z diagnozą, spotkaniami…).
- [ ] Dziennik audytu → Sprawdź teraz: „Integralność potwierdzona”; Raport PDF i CSV otwierają się
      (CSV w Excelu z polskimi znakami).
- [ ] Profil osoby → Eksport danych (RODO): plik JSON udostępnia się / zapisuje.
- [ ] Kopia zapasowa z 1.2.0 przywrócona na drugim urządzeniu: historia i dziennik są na miejscu.

**Wersja 1.3 – asystent AI (oba telefony):**
- [ ] Aktualizacja 1.2.0 → 1.3.0 zachowuje dane; AI jest domyślnie **wyłączona**, aplikacja działa
      offline jak wcześniej (tryb samolotowy).
- [ ] Ustawienia → Asystent AI → Chmura: wklejenie darmowego klucza z aistudio.google.com/apikey,
      „Sprawdź połączenie” → „Połączenie działa”.
- [ ] Symulator → scenariusz → „Na żywo z AI”: 3–4 wypowiedzi (także podyktowane), ocena każdej,
      „Czytaj na głos” (głos polski / niemiecki), podsumowanie ze statystykami.
- [ ] Nauka → „Fiszki z notatek” z pliku **PDF** (wybór pliku na iPhonie i Androidzie), zapis w talii;
      „Pytania otwarte z oceną AI”; karta wiedzy → „Wytłumacz prościej”.
- [ ] Modele lokalne (Wi‑Fi): „Wyszukiwanie semantyczne” i „Dyktowanie (Whisper)” – pobranie z paskiem
      postępu, potem w trybie samolotowym: „Zapytaj bazę wiedzy” i dyktowanie notatki działają.
      **Android:** przy pierwszym „Dyktuj” system pyta o mikrofon.
- [ ] Lokalny model językowy (Qwen3 1.7B, ok. 1,1 GB): na iPhonie z iOS 26 i na Samsungu – czy przycisk
      „Pobierz” jest dostępny (WebGPU), czy model się ładuje, ile trwa „Uporządkuj” i czy aplikacja nie
      jest zamykana z braku pamięci. Jeśli tak – zanotować model telefonu (do decyzji D-054).
- [ ] Spotkanie z notatkami → „Uporządkuj” w trybie Chmura **bez** zgody na dane osób: komunikat
      „tylko na urządzeniu”; po włączeniu zgody: podgląd bez imion / telefonów, „Wyślij ten tekst”,
      wpis w dzienniku audytu.
- [ ] „Usuń wszystkie modele” zwalnia miejsce (Ustawienia telefonu → pamięć aplikacji / Safari).

**Wersja 1.4 – powiadomienia i wiadomości:**
- [ ] Android: Ustawienia → Powiadomienia i wiadomości → włącz → zgoda systemu; „Pokaż próbne
      powiadomienie”; zaplanuj spotkanie za 70 min z przypomnieniem 60 min → powiadomienie przy
      **zamkniętej** aplikacji; „Dokładne godziny” → ustawienia Androida.
- [ ] iPhone: „Eksportuj terminy do kalendarza” → plik otwiera się w Kalendarzu („Dodaj wszystkie”),
      alarmy są widoczne; ponowny eksport po zmianie terminu aktualizuje wpis.
- [ ] Spotkanie → „Przypomnienie” → SMS: aplikacja SMS otwiera się z numerem i treścią (iPhone i Samsung).
- [ ] Wiadomości → e-mail z szablonu → „Otwórz w aplikacji poczty”: Gmail / Mail / Outlook mają temat,
      treść z polskimi znakami i podziałem linii.
- [ ] EmailJS: konfiguracja wg docs/NOTIFICATIONS.md → „Wyślij próbny e-mail do siebie” (PWA i APK –
      w APK sprawdzić, czy EmailJS nie zwraca 403; wtedy w EmailJS Account → Security zezwolić na API).
- [ ] Podsumowanie dnia po godzinie z ustawień: powiadomienie + e-mail (raz dziennie).

**Wersja 1.5 – wysyłka bezpośrednia i Studia:**
- [ ] Gmail: konfiguracja Google Cloud wg docs/NOTIFICATIONS.md §7 (Gmail API, użytkownicy testowi, klient
      „Aplikacja internetowa” + klient „Android” z SHA-1) → „Połącz z Google” → próbny e-mail (PWA i APK).
- [ ] iPhone (PWA z ekranu początkowego): czy okno logowania Google wraca do aplikacji; jeśli nie – Safari lub EmailJS.
- [ ] APK: „Wyślij z tego telefonu” → zgoda SEND_SMS (Android 13+: ewentualnie „Zezwól na ustawienia
      z ograniczeniami” w informacjach o aplikacji) → SMS dociera; Play Protect może ostrzec przy instalacji.
- [ ] 1.5.1: po odmowie SMS → „Otwórz ustawienia aplikacji” otwiera „Informacje o aplikacji”; po „Zezwól na
      ustawienia z ograniczeniami” i zgodzie SMS wychodzi.
- [ ] Bramka SMS Gateway for Android: login/hasło → „Wyślij próbny SMS”.
- [ ] Studia: wybór semestru, ukrycie / dodanie przedmiotów zgodnie z planem z dziekanatu WSHE,
      fiszki, egzamin próbny, „Zapytaj” z prawdziwym kluczem Gemini (gdy wróci dzienny limit).

## 2. Weryfikacja treści

Lista: [`docs/CONTENT_REVIEW.md`](CONTENT_REVIEW.md) – w szczególności sekcja 15 (wytyczne AI do korespondencji i szablony e-mail / SMS), sekcja 14 (prompty systemowe
asystenta AI i przykładowe odpowiedzi), sekcja 12
(szwajcarski system pomocy kantonu Berno, podstawy prawne ze stanem na 2026-11, numery 143 / 147 /
144 / 117 / 112, przypadki i scenariusze z Berna) oraz sekcja 13 (sporne terminy w tłumaczeniu
niemieckim). Najlepiej, by część szwajcarską przejrzała osoba pracująca w Suchthilfe w Bernie.

## 3. Oficjalne wersje narzędzi przesiewowych

- **PL:** wstaw oficjalne polskie wersje AUDIT / AUDIT-C / DUDIT w `src/lib/screening/pl.ts`.
- **DE:** wstaw oficjalne, walidowane wersje niemieckie w `src/lib/screening/de.ts`
  (np. AUDIT w wersji używanej przez Sucht Schweiz; DUDIT – tekst i zgoda autorów).
Do tego czasu aplikacja pokazuje oryginał angielski z widocznym znacznikiem „TODO”.

## 4. Opcjonalnie: zgody na dodatkowe narzędzia przesiewowe

| Narzędzie | Do kogo napisać |
|---|---|
| CRAFFT 2.1 | crafft@childrens.harvard.edu (Boston Children's Hospital) – zgoda na użycie w aplikacji |
| CAST | OFDT (Francja), autorzy: S. Legleye i in. |
| FTND | Prawa autorskie / zgoda autora (K.O. Fagerström) |
| PGSI | Canadian Centre on Substance Use and Addiction (CCSA) |

Po uzyskaniu zgody definicję narzędzia dodaje się w `src/lib/screening/instruments.ts`.

## 5. Historia repozytorium

Katalogi `C:\Users\...\lighthouse.*` zostały usunięte z **całej** historii (D-044) – każdy commit
i tag da się teraz pobrać na Windows. Historia została przepisana (zmieniły się hashe od commitu
„Etap 14” wzwyż, także tagów `v1.0.0` i `v1.1.0`). **Inne istniejące klony repozytorium trzeba
pobrać od nowa** (albo `git fetch --force --tags && git reset --hard origin/main`), nie wolno z nich
robić push starej historii.

---

## Przechowaj bezpiecznie 🔐

Klucz podpisu APK – **ten sam klucz jest potrzebny do każdej przyszłej aktualizacji**
(inny klucz = konieczność odinstalowania aplikacji i utrata danych na telefonie).

| Co | Gdzie |
|---|---|
| Keystore i hasła | sekrety repozytorium GitHub `PRZYSTAN_KEYSTORE_BASE64`, `PRZYSTAN_KEYSTORE_PASSWORD`, `PRZYSTAN_KEY_ALIAS`, `PRZYSTAN_KEY_PASSWORD` (używa ich workflow „Android APK”) |
| Kopia lokalna | `~/przystan-keystore/` na komputerze, na którym klucz utworzono (**na obecnym komputerze z Windows go nie ma**) |
| Odcisk SHA-256 certyfikatu | `D1:7B:A3:C6:5D:C8:22:10:B6:79:67:10:91:16:80:88:88:74:9C:8F:ED:CB:8F:89:E9:8B:B4:A6:64:2A:8F:92` |

Sekretów GitHub nie da się odczytać – jeśli nie masz kopii `~/przystan-keystore/` (plik `.jks`
i hasła) w menedżerze haseł lub na zaszyfrowanym nośniku, zrób ją z komputera, na którym klucz
powstał. Hasła celowo **nie** są zapisane w repozytorium (D-020).
