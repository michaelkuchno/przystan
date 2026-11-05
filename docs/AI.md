# Asystent AI w Przystani (od wersji 1.3.0)

AI jest **opcjonalna, bezpłatna i domyślnie wyłączona**. Bez AI aplikacja działa dokładnie jak
wcześniej: offline, bez żadnego ruchu sieciowego (test E2E „AI off: no request leaves the device”).
Decyzje projektowe: `docs/DECISIONS.md` D-051…D-058. Stan sprawdzenia faktów: 04.11.2026.

## 1. Tryby (Ustawienia → Asystent AI)

| Tryb | Co działa | Sieć |
|---|---|---|
| **Wyłączony** (domyślnie) | Nic z AI. Przyciski AI są ukryte. | brak |
| **Lokalny** | Modele pobrane na urządzenie: wyszukiwanie semantyczne, dyktowanie, opcjonalnie mały model językowy. | tylko jednorazowe pobranie modeli (po zgodzie) |
| **Chmura (Gemini)** | Wszystko z trybu lokalnego + Google Gemini z **własnym kluczem** użytkownika. | Gemini API (+ pobranie modeli, jeśli wybrane) |

## 2. Co jest wysyłane dokąd

| Dane | Wyłączony | Lokalny | Chmura |
|---|---|---|---|
| Treści merytoryczne aplikacji (karty wiedzy, fiszki, scenariusze, narzędzia) | – | urządzenie | Gemini |
| Tekst do nauki wklejony przez użytkownika, odpowiedzi w symulatorze i egzaminie | – | urządzenie* | Gemini |
| Notatki, spotkania, superwizja, dzienniczek, plan nawrotów (dane powiązane z osobą) | – | urządzenie | **urządzenie**; Gemini tylko gdy włączono „Zezwalaj na wysyłkę danych osób”, po pseudonimizacji, podglądzie i zgodzie na to jedno zapytanie |
| Indeks wyszukiwania (także notatek) | – | urządzenie, zaszyfrowany | urządzenie, zaszyfrowany |
| Nagranie głosu | – | urządzenie (Whisper), nie jest zapisywane | dane osób: tylko urządzenie; symulator / nauka: Gemini, jeśli Whisper nie jest pobrany |

\* Symulator „na żywo” wymaga Chmury (D-056).

Twarde reguły są w kodzie (`src/lib/ai/guard.ts`) i w testach (`src/lib/ai/ai.test.ts`,
`e2e/ai.spec.ts`):

- dane osób nigdy nie trafiają do chmury automatycznie; wysyłka wymaga jednorazowego „tokenu
  zgody” wydanego przez podgląd dla **dokładnie** tego tekstu (inny tekst = blokada);
- pseudonimizacja (`src/lib/ai/pseudonymize.ts`): imiona i nazwiska znanych osób (z odmianą),
  częste imiona PL/DE/CH z nazwiskiem, „Pan/Pani/Herr/Frau X”, daty (także „ur.”), adresy,
  kody pocztowe, telefony, e-maile, PESEL, AHV, IBAN, nazwy placówek → zamienniki „[Osoba A]”,
  „[Placówka 1]”… Mapa zamienników zostaje na urządzeniu, odpowiedź jest odtwarzana lokalnie;
- tryb prezentacji: AI na danych osób tylko w trybie szkoleniowym (dane demo);
- każda wysyłka po zgodzie jest zapisywana w dzienniku audytu („Wysłano tekst do chmury AI”);
- każda odpowiedź ma oznaczenie „Pomocnicze – zweryfikuj”; prompty systemowe zabraniają diagnoz
  i oceny ryzyka (`src/lib/ai/prompts.ts`, przegląd: `CONTENT_REVIEW.md`, sekcja 14);
- sygnały kryzysu (myśli samobójcze, samookaleczenia, przemoc – PL/DE/EN) w tekście lub
  odpowiedzi → numery pomocy kraju pracy (`src/lib/ai/crisis.ts`). To nie jest ocena ryzyka.

## 3. Jak bezpłatnie uzyskać klucz Gemini

1. Otwórz https://aistudio.google.com/apikey i zaloguj się kontem Google.
2. Zaakceptuj warunki – AI Studio samo tworzy projekt i klucz (w darmowym pakiecie nie podaje się karty).
3. Skopiuj klucz (zaczyna się od `AQ.` – nowy format – albo `AIza`) i wklej w Ustawienia → Asystent AI → „Klucz API Gemini”.
4. „Sprawdź połączenie”.

Klucz jest szyfrowany kluczem danych (AES-GCM, jak wszystkie dane), trzymany w pamięci tylko po
odblokowaniu i **nie trafia do kopii zapasowej** – po przywróceniu kopii na innym urządzeniu trzeba
go wpisać ponownie.

## 4. Modele i limity

| Zastosowanie | Model | Uwagi |
|---|---|---|
| Chmura – domyślny (od 1.3.1) | `gemini-3.5-flash-lite` (thinking: minimal) | szybki, wyższe limity darmowe; jakość PL/DE sprawdzona na prawdziwym kluczu (05.11.2026) |
| Chmura – do wyboru | `gemini-3.8-flash` (thinking: low) | lepsza jakość, ale w darmowym pakiecie **tylko 20 zapytań dziennie** |
| Wyszukiwanie semantyczne | `Xenova/multilingual-e5-small` (q8, ok. 118 MB) | ok. 100 języków, 384 wymiary |
| Dyktowanie | `onnx-community/whisper-base` (q8, ok. 77 MB) | wielojęzyczny; kompromis jakość / telefon |
| Lokalny model językowy | `Qwen3-1.7B-q4f16_1-MLC` (WebLLM, ok. 1,1 GB, ok. 2 GB VRAM) | tylko z WebGPU i shader-f16; iPhone: iOS 26 |
| Środowisko ONNX | `onnxruntime-web` 1.31.0-dev (plik wasm ok. 27 MB z jsDelivr) | pobierane z pierwszym modelem |

Limity darmowego pakietu Gemini Google pokazuje tylko w AI Studio (nie są publikowane w
dokumentacji). Z komunikatu błędu: `gemini-3.8-flash` – 20 zapytań dziennie (05.11.2026). Każdy model
ma osobny limit, więc po wyczerpaniu limitu albo przy przeciążeniu (503) aplikacja sama przechodzi na
drugi model. Zapytanie bez odpowiedzi przez 90 s kończy się komunikatem (nie wisi w nieskończoność). Przy błędzie 429 ponawia zapytanie, gdy serwer prosi o
krótkie oczekiwanie (≤ 20 s, maks. 2 razy), w przeciwnym razie pokazuje czytelny komunikat
(„spróbuj za ok. N min”). Symulator „na żywo” ma limit 12 wypowiedzi na rozmowę.

## 5. Funkcje

| Funkcja | Gdzie | Wrażliwość |
|---|---|---|
| Symulator „na żywo” (tekst / głos, ocena MITI, lepsza wersja, paski, statystyki, głos rozmówcy) | Symulator → scenariusz → „Na żywo z AI” | nauka (Chmura) |
| Wytłumacz prościej / podaj przykład | karty wiedzy, fiszki | treść |
| Fiszki z notatek (tekst, TXT, PDF – tekst wyciągany lokalnie) | Nauka → Asystent AI | nauka |
| Egzamin – pytania otwarte z oceną (rubryka, braki, wzorzec) | Nauka → Asystent AI | nauka |
| Zapytaj bazę wiedzy (semantycznie, z odnośnikami; „nie wiem”, gdy brak podstaw) | Więcej, Baza wiedzy | treść (+ notatki tylko lokalnie) |
| Dyktowanie | notatki, spotkania, tryb spotkania, dzienniczek, superwizja, symulator, nauka | dane osób: lokalnie |
| Uporządkuj (przebieg / DAP / obserwacja) – propozycja do zatwierdzenia | spotkanie, notatka | dane osób |
| Pytania refleksyjne do superwizji | notatka „superwizja” | dane osób |
| Zaproponuj scenariusz zajęć + kontrola dobrych praktyk | Kreator zajęć | nauka |
| Propozycja programu profilaktycznego + kontrola dobrych praktyk | Kreator programu | nauka |
| Materiał prostym językiem / dla młodzieży / tłumaczenie | plan nawrotów (bez osób wspierających i kontaktów), karty narzędzi | dane osób / treść |

## 6. Jak wyłączyć AI i usunąć modele

Ustawienia → Asystent AI → tryb **Wyłączony**. Tam też: „Usuń klucz” i „Usuń wszystkie modele”
(kasuje pamięć podręczną `przystan-ai-models` oraz `webllm/*`). Indeks wyszukiwania jest częścią
zaszyfrowanej bazy i znika razem z danymi („Usuń wszystkie dane”).

## 7. Technika (dla programisty)

- `src/lib/ai/` – interfejs `AiProvider` (generate, stream, structured), `Embedder`,
  `Transcriber`; `gemini.ts` (REST `models/{model}:generateContent`, SSE, `responseJsonSchema`,
  `x-goog-api-key`, bez SDK), `local/` (Transformers.js i WebLLM w Web Workerach), `fake.ts`
  (deterministyczny provider do testów: `window.__PRZYSTAN_FAKE_AI__ = true`), `parse.ts`
  (odporny parser JSON + walidatory), `tasks.ts` (schematy i walidacja zadań).
- Kod AI ładuje się leniwie. Biblioteki modeli są w plikach `assets/lazy-ai-*` – **poza
  prekeszem PWA** (dochodzą do pamięci podręcznej dopiero przy użyciu); plik wasm ONNX nie jest
  w paczce ani w APK (wtyczka `ort-wasm-from-cdn` w `vite.config.ts`).
- CSP `connect-src`: `generativelanguage.googleapis.com` (Gemini), `huggingface.co` i `*.hf.co`
  (modele i przekierowania CDN), `cdn.jsdelivr.net` (wasm ONNX, przypięta wersja),
  `raw.githubusercontent.com` (biblioteki modeli WebLLM). `script-src` bez zmian.
- Testy: `src/lib/ai/ai.test.ts`, `src/features/ai/ai-features.test.ts`, `e2e/ai.spec.ts`;
  ręcznie na prawdziwych usługach: `npm run e2e:ai-real` (pobiera ok. 220 MB).
