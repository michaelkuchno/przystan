# Powiadomienia i wiadomości (od wersji 1.4.0)

Wszystko jest **bezpłatne i działa bez serwera Przystani**. Przypomnienia są domyślnie wyłączone.
Decyzje: `docs/DECISIONS.md` D-060…D-064. Stan sprawdzenia faktów: 05.11.2026.

## 1. Kanały

| Kanał | Android (APK) | iPhone / przeglądarka (PWA) | Koszt |
|---|---|---|---|
| Powiadomienia systemowe | **zaplanowane w systemie** – pojawiają się także przy zamkniętej aplikacji (`@capacitor/local-notifications`) | tylko przy otwarciu aplikacji (Apple nie pozwala PWA planować powiadomień bez serwera push) | 0 |
| Kalendarz (.ics z alarmami) | działa (zależnie od aplikacji kalendarza) | **zalecane** – przypomnienia z kalendarza iPhone’a przy zamkniętej aplikacji | 0 |
| E-mail ręcznie | aplikacja poczty (`mailto:`) | aplikacja poczty (`mailto:`) | 0 |
| E-mail automatycznie | własne konto EmailJS (200 e-maili/mies.), wysyłka przy otwarciu aplikacji | jw. | 0 |
| SMS ręcznie | aplikacja SMS (`sms:` z treścią) | aplikacja SMS | w ramach abonamentu |
| SMS automatycznie | **niedostępne** – każda bramka SMS jest płatna (D-062) | – | – |

## 2. O czym przypomina (Ustawienia → Powiadomienia i wiadomości)

- zaplanowane spotkania – N minut przed (15–240) i wieczorem dzień wcześniej (18:00);
- zadania z terminem, także zadania z notatek superwizji;
- przegląd IPR – 7 dni przed i po terminie;
- ważne daty osób (rozprawa, koniec dozoru…) – 14 dni przed;
- „Do zwrócenia uwagi” – tylko sprawy ważne (np. opuszczone spotkanie, wzrost głodu);
- kopia zapasowa starsza niż 7 dni.

**Podsumowanie dnia** o wybranej godzinie: powiadomienie i (opcjonalnie) e-mail do siebie. Na pulpicie
pojawia się karta „Na dziś”.

**Prywatność treści** (powiadomienia na ekranie blokady, e-maile do siebie, kalendarz):
„Bez szczegółów” (domyślnie – tylko liczby i godziny) albo „Z kodami osób i tytułami”. Imiona
i nazwiska nigdy nie trafiają do powiadomień, e-maili do siebie ani kalendarza.

## 3. Wiadomości (Więcej → Wiadomości)

- **Nowa:** e-mail lub SMS, adresat z kontaktów albo wpisany, powiązanie z osobą, 11 szablonów PL/EN/DE
  (przypomnienie / zmiana terminu / po nieobecności, rodzic, szkoła, skierowanie, sąd / kurator, superwizja,
  zaproszenie do programu, potwierdzenie otrzymania, podziękowanie), licznik znaków SMS.
- **Wysyłka:** „Otwórz w aplikacji poczty / SMS” (wysyłasz sam – Przystań niczego nie wysyła za Ciebie),
  „Wyślij teraz (EmailJS)”, „Kopiuj”, „Udostępnij”, „Zapisz szkic”. Wysłane wiadomości zostają w historii
  (zaszyfrowane, z historią zmian); dziennik audytu zapisuje tylko fakt przekazania (kanał, sposób).
- **Kontakty:** szkoła, kurator, sąd, rodzic, instytucja… – zaszyfrowane jak wszystkie dane.
- **Wejścia:** spotkanie („Przypomnienie”, „Do kalendarza”), lista spotkań („Eksport do kalendarza”),
  profil osoby („Wiadomość”), kreator skierowania („Wyślij e-mailem”), program profilaktyczny
  („Zaproszenie e-mail”), pulpit („Na dziś”).

## 4. AI przy wiadomościach

- **Napisz z AI** (z instrukcji), **Odpowiedz na e-mail** (wklejony e-mail + co chcesz odpowiedzieć +
  opcjonalnie wiedza z aplikacji i podstawowe, nieidentyfikujące informacje o osobie), **Popraw**
  (krócej, formalniej, cieplej, prościej, tłumaczenie).
- Model dostaje obszerne wytyczne korespondencji zawodowej (`src/lib/ai/commsPrompts.ts`, przegląd
  w `CONTENT_REVIEW.md` sekcja 15): poufność i minimalizacja danych, nieujawnianie, że ktoś jest klientem,
  małoletni i rodzice, sąd / kurator / KESB tylko w zakresie zapytania, deeskalacja, sygnały zagrożenia
  (kontakt osobisty + numery pomocy), struktura e-maila, konwencje PL / DE-CH / EN, zasady SMS.
- Zwraca szkic, wersję SMS i listę „Na co uważać”. Brakujące fakty zostawia jako „[data]”.
- Wiadomości dotyczące osób są traktowane jak dane osób (D-053): lokalnie albo w chmurze tylko po
  pseudonimizacji, podglądzie i zgodzie. Twój podpis nigdy nie jest wysyłany do AI – model pisze
  „[podpis]”, a aplikacja wstawia podpis lokalnie.

## 5. Konfiguracja EmailJS (opcjonalnie, ok. 5 minut)

1. Konto na https://www.emailjs.com (darmowy plan: 200 e-maili miesięcznie, 2 szablony).
2. Email Services → dodaj usługę (np. Gmail) → **Service ID**.
3. Email Templates → nowy szablon: *To Email* `{{to_email}}`, *Subject* `{{subject}}`, treść `{{message}}`,
   *From Name* `{{from_name}}`, *Reply To* `{{reply_to}}` → **Template ID**.
4. Account → General → **Public Key** (Private Key tylko przy włączonym trybie ścisłym).
5. Przystań → Ustawienia → Powiadomienia i wiadomości → wklej dane → „Wyślij próbny e-mail do siebie”.

Dane EmailJS i Twój adres są szyfrowane kluczem danych i nie trafiają do kopii zapasowej. E-maile
przez EmailJS przechodzą przez serwery EmailJS i Twojego dostawcy poczty – dlatego podsumowania dnia
domyślnie nie zawierają szczegółów.

## 6. Technika

- `src/lib/notify/`: `due.ts` (co i kiedy przypomnieć – czyste funkcje), `text.ts` (teksty z poziomem
  prywatności), `system.ts` (powiadomienia: Capacitor / Notification API), `engine.ts` (planowanie po
  odblokowaniu i zmianach danych, podsumowanie raz dziennie), `ics.ts` + `calendar.ts` (RFC 5545: CRLF,
  UTC, zawijanie 75 oktetów, stałe UID), `links.ts` (`mailto:` RFC 6068, `sms:?&body=` dla iOS i Androida),
  `emailjs.ts` (REST `POST https://api.emailjs.com/api/v1.0/email/send`), `templates.ts`, `secrets.ts`.
- Rekordy `contact` i `message` w zaszyfrowanym magazynie (historia, kosz, audyt jak wszędzie).
- Android: ikona `ic_stat_przystan`, `SCHEDULE_EXACT_ALARM` (opcjonalnie dokładne godziny; bez zgody
  przypomnienie może się spóźnić o kilka minut), zgoda na powiadomienia pytana przy włączeniu.
- CSP `connect-src` + `https://api.emailjs.com`.
- Testy: `src/lib/notify/notify.test.ts`, `e2e/messages.spec.ts`.
