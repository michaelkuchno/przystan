# HANDOVER – stan projektu i co zostało do zrobienia ręcznie

Wersja **1.1.0**. Repozytorium: https://github.com/michaelkuchno/przystan (konto `michaelkuchno`).

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

## 2. Weryfikacja treści

Lista: [`docs/CONTENT_REVIEW.md`](CONTENT_REVIEW.md) – w szczególności nowa sekcja 12
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

Starsze commity (przed `26b248e`) zawierają katalogi `C:\Users\...\lighthouse.*` z niedozwolonymi
w Windows nazwami – checkout takiego commitu na Windows się nie powiedzie (D-027). Usunięcie ich
z całej historii wymagałoby przepisania historii (`git filter-repo`) i force-pusha – nie zrobiono
tego bez decyzji właściciela.

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
