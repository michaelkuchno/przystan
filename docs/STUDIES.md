# Studia – nauka do egzaminów (od wersji 1.5.0)

Moduł dla studentki **WSHE w Brzegu** (Wyższa Szkoła Humanistyczno-Ekonomiczna, ul. Piastowska 14):
**Pedagogika II stopnia, specjalność „Pedagogika resocjalizacyjna z profilaktyką uzależnień”**
(niestacjonarne, 4 semestry, 120 ECTS). Decyzje: `docs/DECISIONS.md` D-067…D-069. Stan: 05.11.2026.

## 1. Skąd jest program

W Brzegu działa jedna uczelnia, WSHE. Specjalność „z profilaktyką uzależnień” prowadzona jest od 2025/26,
ale **WSHE nie opublikowała jej osobnego planu ani sylabusów**. Program w aplikacji złożono więc z
publicznych dokumentów WSHE:

| Część | Źródło |
|---|---|
| Przedmioty ogólne II stopnia (semestry 1–2), moduł resocjalizacyjny (semestry 2–4), seminarium, praktyki | [Program studiów II stopnia (2023)](https://www.wshe.edu.pl/dopobrania/program_studiow_II_stopnia.pdf), [Treści programowe II stopnia](https://www.wshe.edu.pl/dopobrania/tresci_programowe_studia_II_stopnia.pdf) |
| Psychologia uzależnień i współuzależnień, Profilaktyka uzależnień, Podstawy terapii w resocjalizacji, Profilaktyka niedostosowania społecznego – oznaczone **„odpowiednik”** | [Treści programowe I stopnia](https://www.wshe.edu.pl/dopobrania/tresci_programowe_studia_I_stopnia.pdf) (najbliższe przedmioty o uzależnieniach) |
| Praktyki (480 h, po 120 h w semestrze), egzamin dyplomowy | [Instrukcja praktyk II st.](https://www.wshe.edu.pl/dopobrania/instrukcja_odbywania_praktyk_zawodowych_studia_II_stopnia.pdf), [Regulamin studiów](https://www.wshe.edu.pl/dopobrania/regulamin_studiow.pdf) |

Tematy i literatura są **streszczone** (nie przepisane w całości) – to publiczna informacja o programie.
Plik danych: `src/content/studies/wshe-brzeg.json`. **Program dopasowuje się do własnego planu zajęć**:
ukrywanie przedmiotów, których nie ma, dodawanie własnych przedmiotów i tematów, daty egzaminów.

## 2. Funkcje

- **Studia** (Menu → Studia, także z Nauki i pulpitu): wybór semestru, karta „Dziś” (cel dzienny,
  seria dni, najbliższy egzamin z odliczaniem), przedmioty z pierścieniem gotowości (tematy + fiszki +
  egzaminy próbne).
- **Przedmiot:**
  - *Program* – tematy z sylabusa z samooceną („Nie znam / Do powtórki / Umiem”), „Wytłumacz na
    egzamin” (AI: pojęcia, koncepcje, przykład z praktyki – PCPR, kurator, MOW, terapia uzależnień –
    i 3 pytania egzaminacyjne), literatura, data i forma egzaminu, własne tematy.
  - *Materiały* – notatki, prezentacje, skrypty (tekst / PDF – tekst wyciągany na urządzeniu,
    dyktowanie); zaszyfrowane; główne źródło dla wyszukiwania, pytań i egzaminów.
  - *Fiszki* – talia przedmiotu (powtórki SM-2 jak w Nauce), fiszki z AI z tematów i materiałów
    (do zatwierdzenia), własne fiszki.
  - *Egzamin próbny* – z AI (pytania jednokrotnego wyboru + otwarte z odpowiedzią wzorcową, tylko w
    zakresie tematów sylabusa i materiałów) albo **bez AI** – test z własnych fiszek; wynik, historia.
  - *Zapytaj* – odpowiedzi **wyłącznie** na podstawie sylabusa i własnych materiałów, z odnośnikami
    do źródeł; gdy tego nie ma – „nie ma tego w materiałach uczelni” + wskazanie przedmiotu i literatury.
- **Szukaj w studiach** – cały program lub semestr; bez AI (słowa kluczowe, odmiana) lub semantycznie
  (lokalny model e5, jeśli pobrany); własne materiały mają pierwszeństwo w wynikach.
- **Cel dzienny i seria dni** – każda fiszka i pytanie egzaminu próbnego liczy się do celu (domyślnie 15).

## 2a. Gotowe materiały (od 1.6.0, D-072)

Dla każdego przedmiotu: **opracowanie każdego tematu** (Program → „Notatka”, Materiały → „Opracowanie
tematów”), **gotowe fiszki** w talii przedmiotu, **bank pytań egzaminacyjnych** (Egzamin próbny →
„Egzamin z bazy pytań” – pytania zamknięte z wyjaśnieniami i otwarte z odpowiedziami wzorcowymi, za
każdym razem inne losowanie). Wszystko działa bez AI i bez internetu. Opracowania przygotowała
Przystań na podstawie sylabusów WSHE i literatury przedmiotu – nie są to oficjalne materiały uczelni.

## 3. Prywatność

Materiały i postępy są zaszyfrowanymi rekordami (`studyCourse`, `studyMaterial`, `studyAttempt`,
talie `study-*`) – z historią, koszem i kopią zapasową jak wszystkie dane. Do AI w chmurze trafiają
tylko tematy z sylabusa, fragmenty materiałów i pytanie (wrażliwość „nauka” – nie wklejaj danych
osób z pracy do materiałów).

## 4. Do zrobienia przez studentkę

- Ukryć przedmioty, których nie ma w jej planie, i dodać brakujące (np. z planu zajęć w dziekanacie).
- Wpisać daty egzaminów i dodawać notatki po zajęciach – wtedy pytania, fiszki i egzaminy próbne
  odpowiadają temu, czego faktycznie uczą prowadzący.
