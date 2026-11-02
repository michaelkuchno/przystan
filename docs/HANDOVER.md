# HANDOVER – co zostało do zrobienia ręcznie

Wszystko poza publikacją jest gotowe i przetestowane. Podpisany plik APK leży w
`release/przystan-1.0.0.apk` (lokalnie, poza gitem).

## 1. Publikacja na GitHubie (repozytorium + PWA na GitHub Pages)

Nie została wykonana automatycznie: na tym komputerze `gh` jest zalogowane na **konto służbowe**,
a projekt jest prywatny (patrz `DECISIONS.md`, D-025).

```bash
gh auth login                 # zaloguj się na konto, które ma być właścicielem projektu
cd ~/projects/przystan
bash scripts/publish.sh       # tworzy publiczne repo, włącza Pages, ustawia sekrety keystore, robi push
```

Po ok. 2–3 minutach PWA będzie pod adresem `https://<login>.github.io/przystan/`
(postęp: `gh run list`). Ten adres wysyłasz do instalacji na iPhonie.

> Wolisz konto służbowe? Skrypt pokazuje login i pyta o zgodę przed czymkolwiek.

## 2. Wysłanie APK mailem

Załącz plik `release/przystan-1.0.0.apk` (≈ 6 MB). Uwaga: Gmail blokuje niektóre załączniki
wykonywalne – jeśli tak się stanie, wyślij link do pliku z Dysku Google albo pobierz APK
z zakładki *Actions → Android APK → Artifacts* (po publikacji, workflow uruchamiany ręcznie
lub tagiem `v1.0.0`).

## 3. Opcjonalnie: zgody na dodatkowe narzędzia przesiewowe

| Narzędzie | Do kogo napisać |
|---|---|
| CRAFFT 2.1 | crafft@childrens.harvard.edu (Boston Children's Hospital) – zgoda na użycie w aplikacji |
| CAST | OFDT (Francja), autorzy: S. Legleye i in. |
| FTND | Prawa autorskie / zgoda autora (K.O. Fagerström) |
| PGSI | Canadian Centre on Substance Use and Addiction (CCSA) |

Po uzyskaniu zgody definicję narzędzia dodaje się w `src/lib/screening/instruments.ts`
(pozycje, punktacja, progi) – reszta aplikacji obsłuży je automatycznie.

Oficjalne **polskie** wersje AUDIT / AUDIT-C / DUDIT wstaw w `src/lib/screening/pl.ts`
(do tego czasu aplikacja pokazuje oryginał angielski z widocznym znacznikiem „TODO”).

## 4. Weryfikacja treści

Lista wszystkich treści merytorycznych, prawnych i numerów telefonów do sprawdzenia:
[`docs/CONTENT_REVIEW.md`](CONTENT_REVIEW.md).

---

## Przechowaj bezpiecznie 🔐

Klucz podpisu APK – **ten sam klucz jest potrzebny do każdej przyszłej aktualizacji**
(inny klucz = konieczność odinstalowania aplikacji i utrata danych na telefonie).

| Co | Gdzie |
|---|---|
| Keystore | `~/przystan-keystore/przystan-release.jks` |
| Hasła (store/key), alias | `~/przystan-keystore/keystore.properties` |
| Odcisk SHA-256 certyfikatu | `D1:7B:A3:C6:5D:C8:22:10:B6:79:67:10:91:16:80:88:88:74:9C:8F:ED:CB:8F:89:E9:8B:B4:A6:64:2A:8F:92` |

Hasła celowo **nie** są zapisane w tym pliku, bo repozytorium może być publiczne (D-020).
Zrób kopię katalogu `~/przystan-keystore/` w menedżerze haseł lub na zaszyfrowanym nośniku.
Po uruchomieniu `scripts/publish.sh` keystore jest też zapisany jako sekrety repozytorium
(`PRZYSTAN_KEYSTORE_*`) – GitHub Actions zbuduje nim APK.
