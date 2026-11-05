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
| `ch-bern-apprentice-cannabis` | Jan, uczeń zawodu w Bernie – marihuana w przerwie | school |
| `ch-bern-parent-alcohol` | Sandra w ośrodku pomocy społecznej – wino po rozstaniu | community |
| `ch-bern-gassenarbeit` | Marco na Schützenmatte – pierwszy kontakt w streetworkingu | streetwork |

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

Plik: `src/locales/{pl,en}/content/demo.json` – 11 fikcyjnych przypadków. Sprawdź realizm i język (bez stygmatyzacji).

## 12. Wersja 1.1 – Szwajcaria (kanton Berno) i język niemiecki

Wszystkie nowe treści mają `reviewStatus: "do_weryfikacji"`. Szwajcarskie treści istnieją w PL, EN i DE (wersją wzorcową jest DE).
Tekst niemiecki: pisownia szwajcarska (ss zamiast ß – pilnują tego testy), forma „du” w interfejsie.

### 12.1 Szwajcarski system pomocy – `src/locales/{pl,en,de}/content/helpsystemCH.json`

| Kraj | Numer | Nazwa | id |
|---|---|---|---|
| CH | **143** | Die Dargebotene Hand (telefon zaufania) | `ch143` |
| CH | **147** | Pro Juventute – telefon zaufania dla dzieci i młodzieży | `ch147` |
| CH | **144** | Pogotowie ratunkowe (Sanitätsnotruf) | `ch144` |
| CH | **117** | Policja (Polizeinotruf) | `ch117` |
| CH | **112** | Europejski numer alarmowy | `ch112` |

Numery CH są też w karcie PDF planu nawrotów: `reports.json` → `crisisLine_CH`.

| id | Podstawa prawna | Stan na |
|---|---|---|
| `chBetmg` | Betäubungsmittelgesetz, BetmG (federalna ustawa o środkach odurzających, SR 812.121) | 2026-11 |
| `chCannabisFine` | Konopie: mandat (Ordnungsbusse) i nieznaczna ilość (BetmG art. 19b, 28b i n.) | 2026-11 |
| `chAlcoholYouth` | Ochrona małoletnich – alkohol i tytoń (prawo żywnościowe, Alkoholgesetz, Tabakproduktegesetz) | 2026-11 |
| `chJstg` | Jugendstrafgesetz, JStG (ustawa o prawie karnym nieletnich) i Jugendstrafprozessordnung, JStPO (procedura karna nieletnich) | 2026-11 |
| `chZgbKesr` | Prawo ochrony dzieci i dorosłych (szwajcarski kodeks cywilny ZGB, art. 307 i n., 314c–314d, 360 i n.) | 2026-11 |
| `chBgs` | Geldspielgesetz, BGS (federalna ustawa o grach pieniężnych, SR 935.51) | 2026-11 |
| `chBernSlg` | Kanton Berno: Gesetz über die sozialen Leistungsangebote, SLG (ustawa o świadczeniach społecznych) i Sozialhilfegesetz, SHG (ustawa o pomocy społecznej) | 2026-11 |

| id | Instytucja | Kategoria |
|---|---|---|
| `chBag` | Bundesamt für Gesundheit, BAG (Federalny Urząd Zdrowia Publicznego) | central |
| `chSuchtSchweiz` | Sucht Schweiz (krajowe centrum ds. uzależnień) | central |
| `chInfodrog` | Infodrog (szwajcarskie centrum koordynacji i wiedzy o uzależnieniach) | central |
| `chSafeZone` | SafeZone.ch – poradnictwo online w sprawach uzależnień | phone |
| `chBernerGesundheit` | Berner Gesundheit (fundacja ds. promocji zdrowia i uzależnień, kanton Berno) | treatment |
| `chBlauesKreuz` | Blaues Kreuz Bern-Solothurn-Freiburg (Niebieski Krzyż) | treatment |
| `chContact` | Contact – Stiftung für Suchthilfe (fundacja pomocy w uzależnieniach; punkty kontaktowe) | local |
| `chDrugChecking` | Drug Checking Bern (badanie substancji, Contact) | local |
| `chResidential` | Stacjonarna terapia uzależnień (np. Klinik Südhang, wspólnoty terapeutyczne) | treatment |
| `chGp` | Lekarze rodzinni (Hausärzt/innen) i leczenie substytucyjne (terapia agonistami opioidowymi) | treatment |
| `chUpd` | Universitäre Psychiatrische Dienste Bern, UPD (Uniwersyteckie Służby Psychiatryczne w Bernie), w tym psychiatria dzieci i młodzieży | treatment |
| `chKesb` | KESB – Kindes- und Erwachsenenschutzbehörde (urząd ochrony dzieci i dorosłych) | social |
| `chSozialdienst` | Sozialdienst – gminne służby społeczne (w tym pomoc społeczna i poradnictwo zadłużeniowe) | social |
| `chSchulsozialarbeit` | Schulsozialarbeit (praca socjalna w szkole) | education |
| `chErziehungsberatung` | Erziehungsberatung des Kantons Bern (kantonalna poradnia wychowawcza) | education |
| `chJugendanwaltschaft` | Jugendanwaltschaft des Kantons Bern (prokuratura ds. nieletnich kantonu Berno) | justice |
| `chBvd` | Bewährungs- und Vollzugsdienste, BVD (służby kuratorskie i wykonawcze), Urząd Wykonania Kar kantonu Berno | justice |
| `chPolice` | Kantonspolizei Bern (policja kantonu Berno) | justice |
| `chOpferhilfe` | Opferhilfe – poradnie pomocy ofiarom przestępstw (kanton Berno: Lantana, Vista) i domy dla kobiet (Frauenhäuser) | social |
| `chGassenarbeit` | Gassenarbeit (praca uliczna), noclegownie i dzienne punkty spotkań | local |
| `chAa` | Anonimowi Alkoholicy (AA, Anonyme Alkoholiker) | selfHelp |
| `chNa` | Anonimowi Narkomani (NA, Narcotics Anonymous) | selfHelp |
| `chAlAnon` | Al-Anon i Alateen | selfHelp |
| `chSelbsthilfe` | Selbsthilfe Schweiz i regionalne centrum samopomocy w Bernie | selfHelp |
| `chDargeboteneHand` | Die Dargebotene Hand (telefon zaufania 143) | phone |
| `chProJuventute` | Pro Juventute – Beratung + Hilfe 147 (telefon zaufania dla dzieci i młodzieży) | phone |
| `chSosSpielsucht` | SOS-Spielsucht (pomoc w uzależnieniu od hazardu) i specjalistyczne poradnictwo hazardowe | phone |

Kreator skierowania (CH): 22 reguł, pytania: age, problem, context, urgency.

### 12.2 Szwajcarskie przypadki DEMO i scenariusze symulatora

- DEMO `demo-ch-01` – LM-17 (clinic, cannabis, alcohol)
- DEMO `demo-ch-02` – RB-42 (clinic, alcohol)
- DEMO `demo-ch-03` – SK-29 (probation, opioids, stimulants, gambling)
- Symulator `ch-bern-apprentice-cannabis` – Jan, uczeń zawodu w Bernie – marihuana w przerwie
- Symulator `ch-bern-parent-alcohol` – Sandra w ośrodku pomocy społecznej – wino po rozstaniu
- Symulator `ch-bern-gassenarbeit` – Marco na Schützenmatte – pierwszy kontakt w streetworkingu

### 12.3 Narzędzia przesiewowe po niemiecku

AUDIT, AUDIT-C i DUDIT: **TODO: oficjalna wersja DE** – do czasu wstawienia oficjalnej, walidowanej wersji niemieckiej (`src/lib/screening/de.ts`) aplikacja pokazuje oryginał angielski ze znacznikiem TODO.

### 12.4 Tłumaczenie niemieckie (wszystkie pliki `src/locales/de/`)

Całość przetłumaczona z EN/PL (interfejs, baza wiedzy, fiszki, narzędzia, symulator, przypadki DEMO, polski system pomocy po niemiecku). Polskie instytucje i ustawy zachowały polskie nazwy z niemieckim objaśnieniem. Sporne terminy – w sekcji 13.

## 13. Niepewności zgłoszone podczas przygotowania treści

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


# Wersja 1.1 – tłumaczenie DE i treści szwajcarskie

## de/content/helpsystem.json (polski system pomocy po niemiecku)
- „pedagog szkolny” → „Schulpädagog/in … (vergleichbar mit der Schulsozialarbeit)” – porównanie przybliżone.
- „PPP” → „vergleichbar mit einem schulpsychologischen Dienst” – porównanie przybliżone.
- „demoralizacja” → „Demoralisierung (Verwahrlosung)” – brak dokładnego odpowiednika.
- „kurator” → „Bewährungshelfer/in” / „Familienbewährungshelfer/in”; zakres inny niż szwajcarska Bewährungshilfe.
- „zakład poprawczy” / „schronisko dla nieletnich” → „Besserungsanstalt” / „Jugendheim” – archaiczne brzmienie.
- Niemieckie tytuły ustaw to tłumaczenia własne (polskie tytuły w nawiasach).
- „Anonyme Spieler/innen” (Anonimowi Hazardziści) – nazwa niemieckojęzycznych grup niepotwierdzona.
- 144 „Sanitätsnotruf (Schweiz)”, 147 „Beratung für Kinder und Jugendliche” – sprawdzić oficjalne nazwy.
- „dzielnicowy” → „Quartierpolizist/in”.
## de/content/decks.json (fiszki)
- res-02: „niedostosowanie społeczne” → „soziale Fehlanpassung” (rozważyć „Dissozialität”/„Verhaltensauffälligkeit”).
- res-26: „zakład poprawczy” → „Erziehungsanstalt”, „schronisko dla nieletnich” → „Jugendunterkunft” – terminy opisowe.
- res-20/21, law-22: „System der programmierten Einwirkung” – tłumaczenie dosłowne.
- res-23, law-05, law-21: „kurator sądowy” → „Bewährungshelfer/in” (polska rola szersza).
- law-01…27: niemieckie nazwy polskich ustaw i instytucji (GKRPA, KCPU, PARPA, KBPN, Niebieska Karta, PCPR, OPS) – tłumaczenia robocze.
- law-10: wyrażenie dla nakazu opuszczenia mieszkania – sformułowanie własne.
- prev-16: ORE → „Zentrum für Bildungsentwicklung”; prev-21: „Verhältnisprävention (strukturelle Prävention)”.
- add-16: lapse → „Ausrutscher” (alternatywa „Vorfall”); mi-19: righting reflex → „Korrekturreflex” (alt. „Reparaturreflex”).
- fam-09: skrót „EKA” dla ACoA mało rozpowszechniony; fam-27: świetlica → „Tagesbetreuung”.
## de/content/scenarios.json – scenariusze 7–11
- Patryk (23, terapia stacjonarna): „Sie”; w szwajcarskiej terapii stacjonarnej z młodymi dorosłymi często „du” – do decyzji.
- Kuba (19, streetwork): „du”; „Gassenarbeiter/in einer Stiftung”.
- Polskie realia opisane szwajcarskimi terminami: Notschlafstelle, Tagestreff, Wärmestube, Gassenarztpraxis, Spital, Staplerausweis, Abendschule – sprawdzić, czy akceptowalne dla polskiego kontekstu.
- Terapia stacjonarna: Gemeinschaftssitzung, Bezugstherapeut, „Austritt auf eigenen Wunsch”.
- Natalia: „Informatik-Fachschule (Technikum)”, „versetzungsgefährdet”.
- Neutralne płciowo przeróbki zakończeń („Wieder eine erwachsene Person gegen sie”, „Jungs, mit der Person kann man reden.”).
## de/content/prevention.json, templates.json, tools.json
- Standardy profilaktyki: pełne polskie nazwy KBPN/PARPA/KCPU/ORE/IPiN z niemieckimi objaśnieniami; nazwa systemu rekomendacji zrekonstruowana; poziomy „vielversprechendes Programm / Programm guter Praxis / Modellprogramm” – sprawdzić z oficjalnymi.
- „environmental strategies” → „Verhältnisprävention (Umweltstrategien)”.
- Socjoterapia „Razem łatwiej” → „Gemeinsam geht's leichter”.
- Readaptacja: polskie terminy (meldunek, ZUS, NFZ, PUP, CIS, OPS/MOPS, Fundusz Sprawiedliwości, kurator, mieszkanie socjalne/treningowe) z niemieckimi objaśnieniami – sprawdzić.
- Narzędzia: ogólne terminy niemieckie (Bewährungshelfer/in, Sozialdienst, Heim/Einrichtung, Schulsozialarbeiter/in); urge surfing → „Suchtdruck-Surfen”; chain analysis → „Verhaltensanalyse (Kettenanalyse)”.
## de/content/scenarios.json – scenariusze 1–6
- Kacper: „MOW (Jugenderziehungszentrum, Polen)”, przepustka → „Wochenendurlaub”, zakład poprawczy → „geschlossene Einrichtung”.
- Damian: kurator → „Bewährungshelferin”; wyrok w zawieszeniu → „bedingte Strafe” (termin szwajcarski) – sprawdzić względem polskiego prawa.
- Marek: MOPS → „Sozialhilfezentrum”; „Abstinenznachweise”.
- Andrzej: „Zwangsbehandlung”, „Entzugsklinik”.
- Zuzia: pedagog szkolny → „Schulsozialarbeit”; klasa liceum → „erstes Jahr der Oberstufe”; autokar → „Bus” (szwajc. „Car”).
- Tomasz: chwilówki → „Sofortkredite”, samowykluczenie → „Spielsperre”, GA → „Anonyme Spieler”.
## de/content/knowledge.json, family.json, resocialization.json
- EKA (ACoA); role Wegscheider-Cruse: „Held/in, Sündenbock, verlorenes Kind, Maskottchen (Clown)”.
- ICD-11: „Störungen durch Substanzgebrauch oder Verhaltenssüchte” – oficjalnie (BfArM) być może „…oder abhängig machende Verhaltensweisen”; 6C51 „Computerspielstörung” – sprawdzić.
- DSM-5-TR: „leicht / mittel / schwer” (wyd. niem. może mieć „mittelgradig”).
- Procesy MI: „Beziehungsaufbau, Fokussierung, Evokation, Planung” (w niem. wydaniu być może „Hervorrufen”).
- CRA → „Gemeindeorientierter Verstärkungsansatz” (rzadko używane); TSF → „Zwölf-Schritte-Förderung” (nieustalony termin).
- „Soziale Unangepasstheit”, „Demoralisierung/Verwahrlosung”, „Besserungsanstalt”, „Kreiszentrum für Familienhilfe (PCPR)”, „Entlassenenhilfe”, „Justizfonds”, „Tageszentren der Bewährungshilfe” – opisowe tłumaczenia polskich pojęć.
- „Soziotherapie” – w krajach niemieckojęzycznych także świadczenie psychiatryczne; ryzyko pomyłki.
## de/content/demo.json (8 przypadków polskich)
- przepustka → „Urlaub / Wochenendurlaub” (alt. „Ausgang”); wychowawca → „Erzieher”/„Sozialpädagoge”; key worker → „Bezugsperson”.
- kurator → „Bewährungshelfer des Gerichts”.
- IPR → „individueller Förderplan (IPR)”.
- Przypadek 2: dopisano objaśnienie polskiej skali ocen 1–6.
- schronisko/ogrzewalnia/świetlica/jadłodajnia → „Notunterkunft”, „Wärmestube”, „Tagestreff”, „Gassenküche” – szwajcarskie odpowiedniki.
- Kwoty w PLN („polnische Złoty”).
- Przypadek 7: objaśnienie „Niebieska Karta” – sformułowanie własne; przypadek 8: formy żeńskie/męskie wybrane arbitralnie.
## helpsystemCH.json (NOWE – szwajcarski system pomocy, kanton Berno; PL/EN/DE)
- Czy Suchthilfekonzept kantonu Berno (GSI, 2011) jest nadal aktualny / czy ma następcę.
- SLG (uchwalona 9.3.2021, w mocy od 1.1.2022 – założenie); czy SLV nadal reguluje finansowanie Suchthilfe.
- Stan całkowitej rewizji Sozialhilfegesetz kantonu Berno (konsultacje 2024, cel 2026).
- Nationale Strategie Sucht – czy przedłużona po 2024 (np. do 2028) i obecna nazwa.
- Infodrog: czy katalog nadal nazywa się „Suchtindex”; czy SafeZone.ch prowadzi Infodrog.
- Czy poradnictwo Berner Gesundheit i Blaues Kreuz jest bezpłatne dla mieszkańców kantonu; obecna nazwa „Blaues Kreuz Bern-Solothurn-Freiburg”.
- Kontakt- und Anlaufstellen (Contact) w Bernie/Biel/Thun i zasady dostępu.
- Drug Checking Bern: lokalizacja, godziny, odpłatność.
- Klinik Südhang jako przykład terapii stacjonarnej – aktualność.
- Substytucja: zezwolenie kantonalne czy zgłoszenie (po zmianie BetmVV 2023); rola Kantonsarztamt; ośrodek HeGeBe w Bernie.
- UPD Bern – dostęp do psychiatrycznego dyżuru; regionalne służby psychiatryczne.
- KESB w kantonie Berno: liczba regionalnych KESB, możliwość anonimowej porady.
- Erziehungsberatung kantonu Berno – nazwa i bezpłatność; Opferhilfe Bern („Lantana”, „Vista”).
- Uprawnienia policji Berno przy przemocy domowej (Wegweisung, Fernhaltung, czas trwania).
- BVD (Amt für Justizvollzug) – nazwa i organizacja; Jugendanwaltschaft Bern – zakres decyzji, mediacja.
- JStG: środki do 25. r.ż.; grzywna i pozbawienie wolności od 15 lat.
- Konopie: Ordnungsbusse CHF 100; orzeczenie Sądu Federalnego (do 10 g dorośli bez grzywny); limit 1% THC dla CBD; stan projektów pilotażowych i prac parlamentarnych.
- BetmG art. 3c (Melderecht) – dokładne brzmienie.
- Alkohol: 16 lat (napoje fermentowane, prawo żywnościowe) / 18 lat (napoje spirytusowe) – numery artykułów; zakupy testowe w Bernie.
- Ustawa o wyrobach tytoniowych: 18 lat w całym kraju od 1.10.2024.
- ZGB art. 314d – lista zawodów i czy poinformowanie przełożonego wypełnia obowiązek; art. 426 (FU).
- BGS: art. 85; minimalny wiek dla loterii/zakładów; zasięg wykluczenia z gier (kasyna i online).
- SOS-Spielsucht jako krajowa linia, Berner Gesundheit jako poradnia hazardowa w Bernie.
- 143: koszt połączenia; 147: brak na rachunku, SMS, serwis dla rodziców.
- Selbsthilfe Schweiz i regionalne centrum samopomocy w Bernie; Al-Anon/Alateen, NA w Bernie.
- Terminy „Fachberatung Geldspiel”, „Kinderschutzgruppe” – ogólne, sprawdzić lokalne nazewnictwo.
## de/*.json (interfejs)
- Nazwa aplikacji w DE: w tekstach zostawiono angielskie „Harbor” – do decyzji (np. „Przystań” jak w nagłówku PDF).
- Nazewnictwo podopiecznego w DE: „Klient/in (Betreuung)”, „Klient/in (Beratung)”, „Jugendliche/r (Einrichtung)”, „Teilnehmer/in”.
- Readaptacja → „Wiedereingliederung”.
- AUDIT: strefy „riskanter / schädlicher Konsum”, „mögliche Abhängigkeit” oraz poziomy interwencji WHO („einfache Beratung”, „Kurzintervention”) – sformułowania własne, porównać z oficjalną wersją niemiecką.
- Poradnia leczenia uzależnień → „Suchtfachstelle”; diagnoza pedagogiczna → „Sozialpädagogische Abklärung”; IPR → „individueller Förderplan”.
- Narzędzia: „Bereitschaftslineal”, „Entscheidungswaage”, „Nein sagen”; „Anzeigen für {{client}}”.
- Symulator: sojusz → „Arbeitsbündnis/Arbeitsbeziehung”, afirmacja → „Würdigung”.
- Nazwa aplikacji w DE ujednolicona na „Przystań” (alternatywa: „Hafen”).
- „sesja” → „Gespräch”; „Sitzungsrezepte”, „Sitzungsbaukasten”.
- Formy bez rodzajnika przy {{client}}: sprawdzić w aplikacji „Das ist die/der {{client}}” (genogram) i „Neu: {{client}}” (pulpit).
- enums.context: juvenile → „Jugendheim / Massnahmenzentrum für Jugendliche”, probation → „Bewährungshilfe” (terminy szwajcarskie dla polskiego kontekstu).
- enums.sex: „Divers”, „Keine Angabe”; help.cat local → „Gemeinde / Kanton”.
- Prywatność: tekst wspomina DSGVO (jak EN); dla Szwajcarii właściwa nDSG; „besonders schützenswerte Daten” to termin nDSG.
## Szwajcarskie przypadki DEMO (demo-ch-01…03) i scenariusze symulatora (ch-bern-*) – NOWE, PL/EN/DE
- Jugendanwaltschaft: „persönliche Leistung” (art. 23 JStG) jako sesje w Berner Gesundheit nakazane Strafbefehl przy pierwszym czynie.
- Nazwy: „Jugendanwaltschaft Region Bern-Mittelland”, „Regionalgericht Bern-Mittelland”, „Bewährungs- und Vollzugsdienste (BVD)”, „Berner Schuldenberatung”, „Ausbildungsberatung des Mittelschul- und Berufsbildungsamts (MBA)”.
- Leczenie agonistami opioidowymi u lekarza rodzinnego „mit Bewilligung des Kantonsarztamts”.
- Spielsperre obejmuje wszystkie licencjonowane kasyna, także online.
- K&A Bern: pokój konsumpcji, pielęgniarka, podstawowa opieka medyczna; Klinik Südhang; pilotażowy program konopny w Bernie (tylko dorośli).
- Szwajcarska skala ocen (6 najlepsza, 4 dostateczna), „Stange” = 3 dl piwa, Pikettdienst.
- KESB i nadzorowane kontakty z dzieckiem rodziców niebędących małżeństwem.
- Forma zwracania się: „Sie” w Sozialdienst, „du” w Gassenarbeit – potwierdzić praktykę w Bernie.

## 14. Asystent AI – prompty systemowe i przykładowe odpowiedzi (NOWE w 1.3.0)

Plik: `src/lib/ai/prompts.ts` (instrukcje po angielsku, język odpowiedzi ustawiany jawnie).
Zasady wspólne (`BASE`) dla wszystkich zadań poza symulatorem:

1. Brak diagnoz, brak oceny ryzyka (samobójstwa, przemocy, nawrotu, recydywy), brak rekomendacji
   leków – odesłanie do specjalisty i procedury.
2. Odpowiedź jest materiałem pomocniczym dla profesjonalisty.
3. Zamienniki w nawiasach kwadratowych („[Osoba A]”) zostają bez zmian, AI nie zgaduje danych.
4. Przy sygnałach zagrożenia życia / samookaleczenia / przemocy – jedno zdanie o natychmiastowym
   kontakcie z pomocą kryzysową, bez oceny ryzyka.
5. Praktyki oparte na dowodach (MI, CBT, zapobieganie nawrotom, standardy profilaktyki); bez
   wymyślania przepisów, liczb i źródeł.
6. Zwięźle, z szacunkiem, język bez stygmatyzacji („osoba używająca substancji”, nie „narkoman”).

| Zadanie | Co sprawdzić merytorycznie | Przykład oczekiwanej odpowiedzi (skrót) |
|---|---|---|
| `simulator` (symulator „na żywo”) | Czy definicje kategorii odpowiadają MITI 4.2.1 (w aplikacji „inspirowane MITI”); czy reguła „element niezgodny z MI wygrywa” jest właściwa; czy rozmówca nie „mięknie” za szybko; czy limit 1–3 zdań jest realistyczny. | Trener: „Moralizowanie – »powinieneś« budzi opór.” Lepsza wersja: „Z jednej strony palenie cię uspokaja, z drugiej martwią cię oceny.” Rozmówca: „No i co z tego? Każdy w MOW pali.” (`sustain`, `angry`) |
| `explain` | Czy „prościej” nie zniekształca treści karty; czy przykłady są realistyczne i anonimowe. | „Refleksja złożona to powiedzenie na głos tego, co osoba czuje lub myśli, choć tego nie nazwała…” |
| `flashcards` | Czy fiszki i pytania nie dodają treści spoza notatek. | Przód: „Co oznacza skrót OARS?” Tył: „Pytania otwarte, afirmacje, refleksje, podsumowania.” |
| `grade` | Progi 75 / 40 % (dobra / częściowa / niewystarczająca); czy ocena uznaje poprawne myśli wyrażone innymi słowami. | 60 % – „Częściowo”: uwzględniono definicję, brakuje przykładu z praktyki. |
| `ask` | Czy odpowiada tylko na podstawie źródeł i przyznaje „nie wiem”. | „Według karty [1] w pracy z oporem pomaga odzwierciedlenie dwustronne…” |
| `organize` | Czy pola przebieg / DAP / obserwacja są wypełniane bez interpretacji i bez dopisywania faktów. | DAP – Dane: „[Osoba A] przyszedł punktualnie, mówił o konflikcie z wychowawcą…” Ocena: tylko opis, bez diagnozy. |
| `lessonPlan` | Zgodność z zaleceniami (interaktywność, umiejętności, normy, bez straszenia, bez jednorazowych pogadanek, bez instrukcji używania substancji). | Rozgrywka 10 min → scenki odmawiania 25 min → runda refleksji 10 min. |
| `prevention` | Cele SMART; strategie z dowodami (EUPC / EDPQS, rekomendacje KCPU, Sucht Schweiz); czynniki ryzyka i chroniące adekwatne do grupy. | Cel szczegółowy: „Do czerwca 80 % uczniów kl. 7 potrafi odmówić w 3 scenkach.” |
| `material` | Czy wersja prostym językiem / dla młodzieży nie zmienia kroków planu i numerów telefonów; jakość tłumaczenia PL/DE/EN. | „Kiedy czujesz silną ochotę: 1. Odczekaj 15 minut. 2. Zadzwoń do …” |
| `supervision` | Czy pytania są refleksyjne, otwarte i nie zawierają interpretacji ani rozwiązań. | „Co czujesz, kiedy myślisz o ostatnim spotkaniu z [Osoba A]?” „Jakie mocne strony widzisz u [Osoba A]?” |

Do weryfikacji także:
- lista sygnałów kryzysu (`src/lib/ai/crisis.ts`, PL/DE/EN) – celowo nadwrażliwa;
- reguły kontroli dobrych praktyk (`src/lib/ai/goodPractice.ts`) i ich opisy (`ai.json` → `practice`);
- teksty ekranu „AI w Przystani” (`ai.json` → `info`), zwłaszcza fragment o warunkach Gemini API
  (stan na 04.11.2026 – przy zmianie warunków Google zaktualizować datę i treść).

Uwaga: przykłady w tabeli to oczekiwany kształt odpowiedzi, nie zapis odpowiedzi modelu. Po
uzyskaniu klucza warto zrobić próbę na 5–10 typowych wypowiedziach w każdym zadaniu
(PL i DE) i odnotować tu wyniki.

## 15. Wiadomości i powiadomienia – szablony i wytyczne AI (NOWE w 1.4.0)

- **Wytyczne korespondencji dla AI** (`src/lib/ai/commsPrompts.ts`, `COMMS_GUIDE`): sprawdzić zgodność z
  RODO / nDSG i tajemnicą zawodową, zasady wobec rodziców małoletnich, sądu / kuratora / KESB /
  Jugendanwaltschaft, procedury przy zagrożeniu (Niebieska Karta, zgłoszenie do KESB) – czy opis
  „do sprawdzenia przez specjalistę” jest wystarczający; konwencje grzecznościowe PL / DE-CH / EN.
- **Szablony** (`src/locales/{pl,en,de}/messages.json` → `templates`): przypomnienie, zmiana terminu,
  po nieobecności (bez oceniania), rodzic, szkoła (zgoda opiekuna), skierowanie, sąd / kurator (tylko
  zakres zapytania), superwizja (bez danych identyfikujących), zaproszenie do programu, potwierdzenie,
  podziękowanie. W SMS celowo bez treści wrażliwych. Forma „ty / Pan(i)” w SMS do młodzieży – do decyzji.
- **Teksty powiadomień** (`notify.json` → `line`, `remind`, `digest`) – czy „bez szczegółów” wystarczy
  na ekranie blokady w placówce.
- Przykład z prawdziwego Gemini (05.11.2026, Flash-Lite), odpowiedź do matki pytającej o palenie syna:
  „Rozumiem Pani niepokój, jednak szczegóły dotyczące przebiegu naszych spotkań oraz kwestii zdrowotnych
  mogą być omawiane wyłącznie bezpośrednio, z poszanowaniem prywatności i zaufania [Osoba A]. Zapraszam
  Panią na rozmowę telefoniczną…”; uwagi: „Nie przekazywano przez e-mail informacji o stosowaniu
  substancji…”.

## 16. Studia – program WSHE Brzeg i AI do nauki (NOWE w 1.5.0)

- **Program** (`src/content/studies/wshe-brzeg.json`, opis źródeł: `docs/STUDIES.md`): sprawdzić z planem
  zajęć grupy w dziekanacie – szczególnie przedmioty oznaczone „odpowiednik” (z programu I stopnia),
  przypisanie do semestrów, formy zaliczenia; uzupełnić tematy przedmiotów, dla których sylabus ich
  nie podaje (Historia myśli pedagogicznej, Pedeutologia, Pedagogika penitencjarna, Metodyka resocjalizacji
  w środowisku otwartym i zamkniętym).
- **Prompty** (`src/lib/ai/studyPrompts.ts`): czy „Zapytaj” rzeczywiście ogranicza się do źródeł; czy
  „Wytłumacz na egzamin” używa terminologii z polskiej literatury przedmiotu; jakość pytań egzaminacyjnych.
- **Gotowe materiały (1.6.0)** (`src/content/studies/pack/*.json`): opracowania tematów, fiszki, banki
  pytań i odpowiedzi wzorcowe – porównać z wykładami i literaturą; zwłaszcza stan prawny (ustawa o
  wspieraniu i resocjalizacji nieletnich, k.k.w., ustawa o przeciwdziałaniu przemocy domowej) i tematy
  opracowane w Przystani (przedmioty bez sylabusa WSHE).
- **AUDIT / DUDIT PL i DE (1.6.0)** (`src/lib/screening/pl.ts`, `de.ts`): porównać brzmienie z oficjalną
  wersją KCPU / niemiecką; po potwierdzeniu ustawić `validated: true` (znika informacja o tłumaczeniu roboczym).
