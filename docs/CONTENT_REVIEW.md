# Treści do weryfikacji (CONTENT_REVIEW)

Wszystkie treści merytoryczne mają w aplikacji znacznik **„Do weryfikacji”** (pole `reviewStatus: "do_weryfikacji"`).
Po sprawdzeniu możesz kliknąć znacznik w aplikacji (zmienia status lokalnie na „Zweryfikowane”) albo zmienić wartość w pliku JSON na `"zweryfikowane"`.
Każda pozycja ma wersję PL i EN o tej samej strukturze – poprawiaj obie.

Plik wygenerowany przez `node scripts/content-review.mjs`.

## 1. Narzędzia przesiewowe

| Narzędzie | Co sprawdzić | Lokalizacja |
|---|---|---|
| AUDIT | Brzmienie pozycji EN z podręcznikiem WHO (Babor i in., 2001), progi stref 0–7 / 8–15 / 16–19 / 20–40. **TODO: wstaw oficjalną polską wersję walidowaną.** | `src/lib/screening/instruments.ts`, `src/lib/screening/pl.ts` |
| AUDIT-C | Progi ≥ 4 (M) / ≥ 3 (K), próg „wysoki” ≥ 8 (decyzja własna – sprawdź). **TODO: oficjalna polska wersja (pozycje 1–3 AUDIT).** | jw. |
| DUDIT | Brzmienie pozycji EN z podręcznikiem (Berman i in.), progi ≥ 6 (M) / ≥ 2 (K), ≥ 25. **TODO: oficjalna polska wersja.** | jw. |
| CRAFFT, CAST, FTND, PGSI | Pominięte z powodu niejasnej licencji – patrz `docs/DECISIONS.md` (D-010) i `docs/HANDOVER.md`. | — |
| Opisy progów (interpretacje) | Teksty wskazówek dla stref. | `src/locales/{pl,en}/screening.json` → `bandHints` |

## 2. Baza wiedzy – podejścia

Plik: `src/locales/{pl,en}/content/knowledge.json`

| id | Tytuł | Źródła |
|---|---|---|
| `mi-core` | Dialog motywujący – duch i procesy | Miller W.R., Rollnick S. (2014); Miller W.R., Rollnick S. (2023); Miller W.R., Rose G.S. (2009); Miller W.R., Forcehimes A.A., Zweben A. (2014) |
| `mi-oars` | Dialog motywujący – umiejętności OARS | Miller W.R., Rollnick S. (2014); Miller W.R., Rollnick S. (2013); Rosengren D.B. (2018) |
| `mi-darncat` | Dialog motywujący – język zmiany (DARN-CAT) | Miller W.R., Rollnick S. (2014); Amrhein P.C., Miller W.R., Yahne C.E., Palmer M., Fulcher L. (2003); Miller W.R., Rollnick S. (2013) |
| `mi-discord` | Dialog motywujący – język podtrzymania i niezgoda | Miller W.R., Rollnick S. (2013); Miller W.R., Rollnick S. (2014); Rosengren D.B. (2018) |
| `ttm` | Model transteoretyczny (etapy zmiany) | Prochaska J.O., DiClemente C.C. (1983); Prochaska J.O., DiClemente C.C., Norcross J.C. (1992); Prochaska J.O., Norcross J.C., DiClemente C.C. (1994); Miller W.R., Forcehimes A.A., Zweben A. (2014) |
| `cbt` | Terapia poznawczo-behawioralna w uzależnieniach | Beck A.T., Wright F.D., Newman C.F., Liese B.S. (1993); Carroll K.M. (1998); Monti P.M., Kadden R.M., Rohsenow D.J., Cooney N.L., Abrams D.B. (2002); Miller W.R., Forcehimes A.A., Zweben A. (2014) |
| `relapse-prevention` | Zapobieganie nawrotom (Marlatt i Gordon) | Marlatt G.A., Gordon J.R. (red./eds.) (1985); Marlatt G.A., Donovan D.M. (red./eds.) (2005); Witkiewitz K., Marlatt G.A. (2004); Bowen S., Chawla N., Marlatt G.A. (2011) |
| `sfbt` | Terapia skoncentrowana na rozwiązaniach (TSR) | de Shazer S. (1985); Berg I.K., Miller S.D. (1992); De Jong P., Berg I.K. (2013) |
| `group-tsf` | Terapia grupowa i ułatwianie 12 kroków | Yalom I.D., Leszcz M. (2005); Nowinski J., Baker S., Carroll K. (1992); Kelly J.F., Humphreys K., Ferri M. (2020); Project MATCH Research Group (1997) |
| `cra` | Podejście wzmacniania społecznego (CRA) | Hunt G.M., Azrin N.H. (1973); Meyers R.J., Smith J.E. (1995); Miller W.R., Forcehimes A.A., Zweben A. (2014) |
| `craft` | CRAFT – praca z bliskimi osoby używającej substancji | Meyers R.J., Wolfe B.L. (2004); Smith J.E., Meyers R.J. (2004); Miller W.R., Meyers R.J., Tonigan J.S. (1999) |
| `contingency-management` | Zarządzanie wzmocnieniami (contingency management) | Higgins S.T., Silverman K., Heil S.H. (red./eds.) (2008); Petry N.M. (2000); Petry N.M. (2012) |
| `dbt-skills` | Umiejętności DBT | Linehan M.M. (2015); Linehan M.M., Schmidt H., Dimeff L.A., Craft J.C., Kanter J., Comtois K.A. (1999); Dimeff L.A., Linehan M.M. (2008) |
| `harm-reduction` | Redukcja szkód | Marlatt G.A. (red./ed.) (1998); Marlatt G.A., Larimer M.E., Witkiewitz K. (red./eds.) (2012); Tatarsky A. (red./ed.) (2002); Rhodes T., Hedrich D. (red./eds.) (2010) |
| `behavioural-addictions` | Uzależnienia behawioralne (hazard, internet, gry, zakupy) | Griffiths M.D. (2005); Blaszczynski A., Nower L. (2002); Petry N.M. (2005); Kuss D.J., Griffiths M.D. (2012) |
| `adolescents` | Używanie substancji przez młodzież | Hawkins J.D., Catalano R.F., Miller J.Y. (1992); Naar-King S., Suarez M. (2011); Jessor R., Jessor S.L. (1977) |
| `co-occurring` | Współwystępowanie zaburzeń (podwójna diagnoza) | Mueser K.T., Noordsy D.L., Drake R.E., Fox L. (2003); Najavits L.M. (2002); Khantzian E.J. (1997) |
| `dependence-criteria` | Kryteria uzależnienia – ICD-11 i DSM-5-TR (streszczenie) | World Health Organization (2022); American Psychiatric Association (2022); Saunders J.B., Degenhardt L., Reed G.M., Poznyak V. (2019) |

## 3. Resocjalizacja

Plik: `src/locales/{pl,en}/content/resocialization.json`

| id | Tytuł | Źródła |
|---|---|---|
| `resocializationConcepts` | Koncepcje resocjalizacji | Czapów Cz. (1978); Pytka L. (2000); Urban B., Stanik J.M. (red.) (2007) |
| `creativeResocialization` | Twórcza resocjalizacja (M. Konopczyński) | Konopczyński M. (2006) |
| `socialMaladjustment` | Niedostosowanie społeczne | Czapów Cz. (1978); Pytka L. (2000); Wysocka E. (2008) |
| `sociotherapy` | Socjoterapia | Sawicka K. (red.) (1998); Urban B., Stanik J.M. (red.) (2007) |
| `openEnvironment` | Praca w środowisku otwartym | Urban B., Stanik J.M. (red.) (2007); Pytka L. (2000) |
| `streetworking` | Streetworking (praca na ulicy) | Urban B., Stanik J.M. (red.) (2007) |
| `readaptation` | Readaptacja i pomoc postpenitencjarna | Sejm RP (1997); Urban B., Stanik J.M. (red.) (2007) |
| `mediation` | Mediacja i sprawiedliwość naprawcza | Zehr H. (1990); Czarnecka-Dzialuk B., Wójcik D. (2001) |
| `probation` | Kuratela sądowa | Sejm RP (2001); Sejm RP (1997); Sejm RP (2022) |
| `juvenileInstitutions` | Placówki dla nieletnich: MOW, MOS, schronisko, zakład poprawczy | Sejm RP (2022); Sejm RP (2016); Urban B., Stanik J.M. (red.) (2007) |

## 4. Rodzina

Plik: `src/locales/{pl,en}/content/family.json`

| id | Tytuł | Źródła |
|---|---|---|
| `codependency` | Współuzależnienie | Mellibruda J., Sobolewska-Mellibruda Z. (2006); Cierpiałkowska L. (2000) |
| `childrenAlcoholFamilies` | Dzieci z rodzin z problemem alkoholowym (DDA/DDD) | Wegscheider-Cruse S. (1981); Woititz J.G. (1983); Cierpiałkowska L. (2000) |
| `domesticViolence` | Przemoc domowa – rozpoznanie i ścieżki pomocy | Sejm RP (2005); Herman J.L. (1992) |
| `blueCard` | Procedura „Niebieskie Karty” krok po kroku | Sejm RP (2005); Rada Ministrów (2023) |
| `craft` | CRAFT – wzmacnianie rodziny | Smith J.E., Meyers R.J. (2004); Meyers R.J., Wolfe B.L. (2004) |
| `familySystems` | Rodzina jako system: genogram i ekomapa | McGoldrick M., Gerson R., Petry S. (2008); Hartman A. (1978) |

## 5. System pomocy

Plik: `src/locales/{pl,en}/content/helpsystem.json`

### 5.1 Numery telefonów (sprawdź przed każdym użyciem!)

| Kraj | Numer | Nazwa | id |
|---|---|---|---|
| CH | **143** | Die Dargebotene Hand / La Main Tendue | `ch143` |
| CH | **147** | Pro Juventute – telefon dla dzieci i młodzieży | `ch147` |
| CH | **144** | Pogotowie ratunkowe (Szwajcaria) | `ch144` |
| CH | **117** | Policja (Szwajcaria) | `ch117` |
| PL | **116 123** | Kryzysowy telefon zaufania dla dorosłych | `pl116123` |
| PL | **116 111** | Telefon zaufania dla dzieci i młodzieży | `pl116111` |
| PL | **800 120 002** | Niebieska Linia – pogotowie dla osób doznających przemocy domowej | `pl800120002` |
| PL | **800 70 2222** | Centrum Wsparcia dla osób w stanie kryzysu psychicznego | `pl800702222` |
| PL | **112** | Numer alarmowy 112 | `pl112` |

Numery kryzysowe są też wpisane na stałe w karcie PDF planu nawrotów: `src/locales/{pl,en}/reports.json` → `crisisLine`.

### 5.2 Podstawy prawne

| id | Akt / temat | Stan na |
|---|---|---|
| `alcoholAct` | Ustawa o wychowaniu w trzeźwości i przeciwdziałaniu alkoholizmowi (1982) | 2026-11 |
| `drugAct` | Ustawa o przeciwdziałaniu narkomanii (2005) | 2026-11 |
| `juvenileAct` | Ustawa o wspieraniu i resocjalizacji nieletnich (2022) | 2026-11 |
| `violenceAct` | Ustawa o przeciwdziałaniu przemocy domowej (2005, nowelizacja 2023) | 2026-11 |
| `publicHealthAct` | Ustawa o zdrowiu publicznym (2015) i Narodowy Program Zdrowia | 2026-11 |
| `kcpu` | Krajowe Centrum Przeciwdziałania Uzależnieniom (KCPU) | 2026-11 |

### 5.3 Instytucje

| id | Nazwa | Kategoria |
|---|---|---|
| `addictionClinic` | Poradnia leczenia uzależnień (poradnia terapii uzależnienia i współuzależnienia) | treatment |
| `inpatientUnit` | Oddział lub ośrodek stacjonarnej terapii uzależnień | treatment |
| `dayCentre` | Oddział dzienny terapii uzależnień | treatment |
| `rehabCentre` | Ośrodek rehabilitacji dla osób uzależnionych od substancji psychoaktywnych | treatment |
| `hostel` | Hostel dla osób uzależnionych | treatment |
| `consultationPoint` | Punkt konsultacyjny (gminny) | local |
| `gkrpa` | Gminna komisja rozwiązywania problemów alkoholowych (GKRPA) | local |
| `interdisciplinaryTeam` | Zespół interdyscyplinarny ds. przeciwdziałania przemocy domowej | local |
| `socialWelfare` | Ośrodek pomocy społecznej (OPS / MOPS / GOPS) | social |
| `pcpr` | Powiatowe centrum pomocy rodzinie (PCPR) | social |
| `crisisCentre` | Ośrodek interwencji kryzysowej (OIK) | social |
| `homelessShelter` | Schronisko, noclegownia, ogrzewalnia dla osób w kryzysie bezdomności | social |
| `familyProbation` | Kurator rodzinny (sądowy) | justice |
| `adultProbation` | Kurator dla dorosłych (sądowy) | justice |
| `familyCourt` | Sąd rodzinny (wydział rodzinny i nieletnich sądu rejonowego) | justice |
| `police` | Policja (112) | justice |
| `readaptationCentre` | Ośrodki pomocy postpenitencjarnej i readaptacji społecznej | justice |
| `counsellingCentre` | Poradnia psychologiczno-pedagogiczna (PPP) | education |
| `schoolPedagogue` | Pedagog i psycholog szkolny | education |
| `youthCentres` | Młodzieżowy ośrodek socjoterapii (MOS) i młodzieżowy ośrodek wychowawczy (MOW) | education |
| `juvenileFacilities` | Schronisko dla nieletnich i zakład poprawczy | justice |
| `aa` | Anonimowi Alkoholicy (AA) | selfHelp |
| `na` | Anonimowi Narkomani (NA) | selfHelp |
| `alAnon` | Al-Anon i Alateen | selfHelp |
| `ga` | Anonimowi Hazardziści (AH) | selfHelp |
| `helplines` | Telefony zaufania i linie wsparcia | phone |
| `kcpu` | Krajowe Centrum Przeciwdziałania Uzależnieniom (KCPU) | central |

### 5.4 Kreator skierowania – 22 reguł

Sprawdź ścieżki (kroki i instytucje) w `referral.rules`. Test `src/content/content.test.ts` pilnuje, by każda kombinacja odpowiedzi miała co najmniej jedną ścieżkę.

## 6. Profilaktyka

Plik: `src/locales/{pl,en}/content/prevention.json`

- Opis standardów jakości i systemu rekomendacji programów: **„Standardy jakości i system rekomendacji programów w Polsce”** (`standards`).
- Dobre praktyki (15) wraz ze źródłami: `goodPractice`.
- Strategie (12) i poziom dowodów (`evidence`): `strategies`.
- Czynniki ryzyka (15) i chroniące (15).

## 7. Szablony zajęć, readaptacja, socjoterapia

Plik: `src/locales/{pl,en}/content/templates.json` – 37 składników, 8 szablonów, program socjoterapeutyczny (10 spotkań), lista readaptacji (6 obszarów).

## 8. Narzędzia interaktywne

Plik: `src/locales/{pl,en}/content/tools.json` – instrukcje (młodzież/dorośli), zniekształcenia poznawcze, karty treningu umiejętności społecznych, wzorce oddechowe.

## 9. Symulator rozmowy motywującej

Plik: `src/locales/{pl,en}/content/scenarios.json`

| id | Tytuł | Kontekst |
|---|---|---|
| `mow-cannabis` | Kacper w MOW – marihuana | juvenile |
| `probation-stimulants` | Damian pod dozorem – amfetamina | probation |
| `release-alcohol-job` | Marek po wyjściu z więzienia – alkohol i praca | community |
| `parent-daughter-drugs` | Andrzej – ojciec córki, która bierze | clinic |
| `school-trip-alcohol` | Zuzia po wycieczce – alkohol | school |
| `gambling-debts` | Tomasz – zakłady bukmacherskie i długi | clinic |
| `gaming-overuse` | Natalia – granie po nocach | clinic |
| `homeless-alcohol` | Zbigniew w kryzysie bezdomności – alkohol | homeless |
| `codependency-mother` | Grażyna – żona pijącego męża | clinic |
| `residential-leaving` | Patryk chce przerwać terapię | residential |
| `streetwork-first-contact` | Kuba – pierwszy kontakt w streetworku | streetwork |

Sprawdź klasyfikację odpowiedzi (`category`, MITI) i komentarze (`feedback`).

## 10. Fiszki

Plik: `src/locales/{pl,en}/content/decks.json`

- `deck-resocialization` – Resocjalizacja – pojęcia i teorie (27 fiszek)
- `deck-prevention` – Profilaktyka – poziomy, czynniki, strategie (27 fiszek)
- `deck-addiction` – Uzależnienia – mechanizmy, zmiana, nawroty (28 fiszek)
- `deck-law` – Prawo – polskie ramy prawne (27 fiszek)
- `deck-mi` – Dialog motywujący (MI) (27 fiszek)
- `deck-family` – Rodzina – współuzależnienie, role, narzędzia (27 fiszek)

## 11. Dane szkoleniowe (DEMO)

Plik: `src/locales/{pl,en}/content/demo.json` – 8 fikcyjnych przypadków. Sprawdź realizm i język (bez stygmatyzacji).

## 12. Niepewności zgłoszone podczas przygotowania treści

## knowledge.json
- Lata wydań polskich WUJ: Miller & Rollnick „Dialog motywujący” (2014), Miller, Forcehimes, Zweben „Terapia uzależnień” (2014).
- Karta dependence-criteria: kody ICD-11 6C40–6C4x, 6C50, 6C51; DSM-5-TR 11 kryteriów (łagodne 2–3, umiarkowane 4–5, ciężkie 6+).

## prevention.json / templates.json / tools.json
- Ostaszewski K. „Skuteczność profilaktyki używania substancji psychoaktywnych” (Scholar, 2003) – rok/wydanie.
- Gaś Z.B. „Profilaktyka w szkole” (WSiP, 2006) – rok/wydanie.
- Opis systemu rekomendacji (KCPU, ORE, IPiN), nazwy poziomów (obiecujący / dobrej praktyki / modelowy), przykładowe programy (Unplugged, PWR 10–14, Szkoła dla Rodziców i Wychowawców, Przyjaciele Zippiego, Fantastyczne Możliwości).
- Readaptacja: pomoc z Funduszu Sprawiedliwości dla osób po zwolnieniu; ubezpieczenie zdrowotne przez urząd pracy / OPS.

## resocialization.json / family.json / helpsystem.json
1. Niebieska Karta – termin przekazania formularza „A” podany ogólnie („niezwłocznie, termin w rozporządzeniu”).
2. Rozporządzenie RM 2023 ws. procedury NK – bez dokładnej daty.
3. Kto wszczyna NK – lista „m.in.” (OPS, GKRPA, Policja, oświata, ochrona zdrowia).
4. Nowelizacja 2023: dziecko-świadek przemocy jako osoba doznająca przemocy.
5. Grupy diagnostyczno-pomocowe zastąpiły grupy robocze.
6. Ustawa o wspieraniu i resocjalizacji nieletnich: demoralizacja od 10 lat, czyny karalne od 13 lat.
7. Ustawa o przeciwdziałaniu narkomanii: art. 72 (zawieszenie postępowania przy podjęciu leczenia), art. 62a (umorzenie – nieznaczna ilość na własny użytek).
8. Kierowanie do MOW/MOS – opis ogólny.
9. PCPR – pomoc w usamodzielnieniu po opuszczeniu MOW/MOS.
10. Narodowy Program Zdrowia 2021–2025 – sprawdzić aktualną edycję.
11. 800 70 2222 – Centrum Wsparcia dla osób w kryzysie psychicznym – potwierdzić aktualność.
12. Źródła: Czarnecka-Dzialuk & Wójcik „Mediacja…” (Żak 2001); Sawicka (red.) „Socjoterapia” (CMPPP 1998); Pytka (APS 2000); Cierpiałkowska „Alkoholizm…” (UAM 2000).
13. Streetworking – cytowane tylko Urban & Stanik (red.) „Resocjalizacja” (PWN 2007).
- Dodany numer CH 117 (policja).

## decks.json
- Talia „Prawo”: mechanizm „leczenie zamiast karania” i procedura zobowiązania do leczenia opisane ogólnie.
