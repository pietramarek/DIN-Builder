# Rozdzielnia Studio — plan rozwoju

Interaktywny edytor rozdzielnic DIN w przeglądarce (HTML, CSS, JavaScript, SVG, bez frameworka). Projekty są
zapisywane lokalnie w przeglądarce, z eksportem JSON i wydrukiem PDF. Produkcja: https://rozdzielnia-studio.vercel.app
(numer commitu w lewym dolnym rogu).

Stan na 1.11.2026. Szczegóły techniczne i zasady jakości: `AGENTS.md`.

## Zrobione

### Edytor i obsługa
- Rozmiar obudowy wybierany przy nowym projekcie (1–8 szyn × 6–36 modułów) i zmieniany później; „+ Szyna” i „×” przy rzędzie.
- Zoom 40–200% (przyciski, Ctrl +/−, dopasowanie), poprawne przeciąganie przy powiększeniu.
- Wygląd aparatów wzorowany na Schneider Acti9 (grafika poglądowa, przykładowe nazwy ze źródłami w `CATALOG-SOURCES.md`).
- Etykiety obwodów pod wyłącznikami (jak naklejki w rozdzielnicy).
- Klik w zacisk z podłączonym przewodem trafia w zacisk; czytelny wynik kontroli (czerwony przy konfliktach, zwijane grupy informacji).
- Lista projektów z autozapisem i statusem zapisu, duplikowanie i usuwanie, migracja starego zapisu.
- Telefon: dopasowanie planszy przy pierwszym wejściu, przewijanie katalogu palcem, powiększony obszar dotyku zacisków na ekranach dotykowych (@media pointer:coarse) – sprawdzone w ramce 390 px i w automatyzacji dotykowej, nie na fizycznym telefonie.
- Zaznaczanie wielu aparatów (Shift/Ctrl+klik) i ich grupowe przesuwanie przeciągnięciem; kopiowanie aparatów (przycisk „Kopiuj”, Ctrl+D) bez przewodów, w pierwszym wolnym miejscu.
- Ręczna zmiana przebiegu przewodu: przeciągnięcie poziomego odcinka w górę/dół (zapis jako `wire.midY`, walidowany przy imporcie), przycisk przywracający automatyczny przebieg.
- Wersja (commit i godzina) w lewym dolnym rogu, generowana przy budowaniu na Vercel.

### Aparatura
- Wyłącznik główny 4P i 1P+N, RCD 4P i 2P, MCB 1P/2P/3P/3P+N, RCBO, SPD, złączka rozdziału PEN (PE↔N zmostkowane – oceniana według układu sieci).
- Katalog aparatów jako pasek grup nad rozdzielnicą (Zasilanie, Różnicowoprądowe, Nadprądowe, Listwy i bloki); import JSON przeniesiony do nagłówka.
- Listwy N i PE (zwykłe oraz bezgwintowe 7/11/15 zacisków), GSU (główna szyna uziemiająca).
- Bloki rozdzielcze 2P/4P/5P z 7/11/15 otworami na tor – każdy tor jako osobna szyna z wszystkimi otworami; stare bloki z zapisanych projektów są automatycznie przenoszone na nowy model (gdy się mieszczą).
- Szyny grzebieniowe 1P i 3P (piny L1/L2/L3 co moduł) dodawane z panelu wyłącznika.

### Sieć i topologia (`topology.js`)
- Parametry sieci: układ TN-S/TN-C-S/TT, zasilanie 1F/3F, zabezpieczenie przedlicznikowe; brak danych zgłaszany jawnie.
- Wyznaczanie faz dla każdego zacisku i każdego bieguna, bilans mocy na L1–L3.
- Wykrywane: zwarcia w modelu, PE pod napięciem, obejście RCD, wspólny N dwóch grup RCD, N obwodu spoza grupy RCD, N z PE za RCD, rozdział PEN (dozwolony tylko w TN-C-S), obwody bez RCD, niepełne zasilanie obwodu wielofazowego, bieguny na tej samej fazie.

### Obliczenia (`calc.js`)
- In ≤ Iz dla Cu/PVC przy 30 °C (PN-HD 60364-5-52 tab. B.52.2 i B.52.4, ułożenia A1/A2/B1/B2/C, 1,5–16 mm², bez współczynników korekcyjnych).
- Spadek napięcia obwodu (1F, 2P jako dwie połówki, 3F przy 400 V) wobec zalecanych 3%/5% (zał. G, informacyjny).

- WLZ jako widoczny przewód wchodzący do obudowy od dołu albo od góry (nie moduł na szynie); jego żyły są zaciskami, z których prowadzi się przewody. Liczba żył (5: L1 L2 L3 N PE, 4: L1 L2 L3 PEN, 3: L N PE, 2: L PEN) i materiał Cu/Al w parametrach sieci. Gdy WLZ jest na planszy, to on jest źródłem zasilania w topologii (PEN niesie N), a wyłącznik główny trzeba do niego podłączyć. Kontrole: liczba żył wobec liczby faz, żyła PEN w TN-S/TT (błąd), aluminiowy WLZ podłączony wprost do zacisku miedzianego (ostrzeżenie).
- Dokumenty (przycisk w nagłówku): dokumentacja A4, opisy na drzwiczki w skali 1:1 (18 mm/moduł, paski dzielone między aparatami, nazwy obwodów), protokół pomiarów do wypełnienia w programie i do druku (Zs ≤ U0/Ia wg krzywej B/C/D, Riso ≥ 1 MΩ, RCD t ≤ 300 ms i IΔ 0,5–1,0 IΔn; ocena TAK/NIE; dane zapisane w projekcie), zestawienie materiałów z długościami przewodów z obwodów (+10% zapasu), WLZ i eksportem CSV dla Excela.
- Skrzynka licznikowa obok rozdzielnicy (po lewej lub po prawej): szyna DIN 9 lub 12 mod. na zabezpieczenie przedlicznikowe, pole z licznikiem OSD 3F, przyłącze ze złącza (źródło zasilania w topologii, własna liczba żył) i wyjście WLZ połączone żyła po żyle z wejściem WLZ rozdzielnicy (kabel rysowany między obudowami). Pełny łańcuch w kontroli: przyłącze → zabezpieczenie → licznik → WLZ → wyłącznik główny. W liście zakupów skrzynka i licznik (z uwagą, że zwykle dostarcza go OSD).
- Zabezpieczenie przedlicznikowe pobierane z pierwszego aparatu zabezpieczającego na szynie skrzynki licznikowej (wyłącznik 3P, rozłącznik bezpiecznikowy) – używane w kontroli WLZ, wybiórczości, na schemacie i wydruku; pole w parametrach sieci wypełnia się wtedy samo. Charakterystyka E (SLS) rozpoznawana w prądzie znamionowym.
- Warstwa przewodów: przełącznik „Pod aparatami / Nad aparatami” (zapamiętany). Niezależnie od niego nad przewodami leży warstwa niewidocznych uchwytów zacisków, więc każdy zacisk da się kliknąć także pod przewodem. Przewody wychodzą z zacisku w naturalnym kierunku i omijają łączone aparaty bokiem.
- Złączki szynowe: szara (L), niebieska (N), zielono-żółta (PE), 1-torowe i 2-torowe (piętrowe, dwa niezależne tory); kontrola koloru (np. faza na złączce N to błąd). Rysowane jako 1 moduł (rzeczywiste 5–8 mm), styk złączki PE z szyną nie jest modelowany.
- Skrzynka licznikowa: WLZ wychodzi dołem albo górą (przy „górą” zawartość skrzynki przesuwa się w dół, kabel obchodzi skrzynkę bokiem do wejścia WLZ rozdzielnicy).
- Rozróżnienie wyłącznika głównego (rozłącznik FR na wejściu rozdzielnicy, punkt zasilania, kontrola rozdziału PEN i wybiórczości) i rozłączników izolacyjnych 1P/3P/4P (odcięcie grupy / urządzenia) – opisowe nazwy w katalogu i podpowiedzi w katalogu i panelu aparatu.
- Licznik OSD jak prawdziwy licznik 3F: wszystkie zaciski w listwie na dole (L1 we/wy, L2 we/wy, L3 we/wy, N we/wy); starsze projekty przenoszone automatycznie (górne zaciski → wejścia, dolne → wyjścia). Przewody odchodzą dalej od zacisków i rozkładają się w torach co 7 px, obejścia dalej od aparatów.
- Lista zakupów (Dokumenty): pozycje zsumowane, także dla całego projektu z podrozdzielnicami; obudowa (z zaleceniem rozmiaru), zaślepki na wolne miejsca, przewody obwodów i WLZ z zapasem 10%, linka w kolorach żył z szacunkiem długości; druk z polem do odhaczania i CSV.
- Przewidywana impedancja pętli zwarcia: Zs w złączu (parametry sieci) + pętla WLZ 2·L/(γ·S) + pętla przewodu obwodu, w podrozdzielnicy od Zs na końcu obwodu zasilającego; warunek Zs ≤ U0/Ia (B/C/D: 5/10/20·In). Uproszczenie: rezystancja w ok. 20 °C, bez reaktancji, PE o przekroju fazy; dla wkładek topikowych i w TT nie liczone. Zs przewidywana w tabeli obwodów i w protokole pomiarów obok zmierzonej.
- Uproszczona wybiórczość (porównanie prądów znamionowych): wyłącznik główny wobec zabezpieczenia przedlicznikowego, rozłącznik główny słabszy niż zabezpieczenie przed nim, obwody wobec najbliższego zabezpieczenia powyżej (wyłącznik główny, przedlicznikowe, obwód zasilający podrozdzielnicy), RCD słabszy niż wyłącznik za nim.
- Drugie źródło (agregat / falownik z magazynem) jako osobny przewód w strefie wejścia, osobne źródło w topologii: obwody zasilane ze źródła 2 rozpoznawane, błąd przy spotkaniu sieci ze źródłem 2, informacja o wspólnym N, zwarcia w obwodzie źródła 2; w panelu przełącznika 1-0-2 i na wydruku – co jest zasilane w położeniu I i II (z sieci / ze źródła 2 / bez zasilania).
- Przegląd kontroli (2.11.2026): N przez tę samą grupę RCD co faza dla wszystkich aparatów z biegunem N (MCB 1P+N, 3P+N, RCBO wobec RCD powyżej), wkładki gG: I2 = 1,6/1,9 In ≤ 1,45 Iz, ciągłość przewodu ochronnego listew PE i zacisku PE ograniczników przepięć. MCB 2P jest traktowany jako dwa bieguny fazowe – do obwodu L+N używaj MCB 1P+N.
- Katalog z ulubionymi: na górze tylko ulubione (gwiazdka), pozostałe w rozwijanej liście „Wszystkie aparaty”; przełącznik nazw pełne/krótkie; zapis w przeglądarce.
- Nowe aparaty: zaślepka (nie liczy się do zajętego miejsca), MCB 1P+N, rozłączniki izolacyjne 1P/3P/4P, przełączniki 1-0-2 2P/4P (położenie 0/I/II na aparacie i w panelu; kontrola obejścia – zaciski I i II połączone poza przełącznikiem), rozłączniki bezpiecznikowe 10×38 1P/3P (jako aparaty obwodów), czujnik kontroli faz, wyłącznik silnikowy 3P, zasilacz DC, transformator dzwonkowy, sterownik smart. Wyjścia DC/niskonapięciowe i styki sterujące nie są modelowane. Drugie źródło (agregat) nie jest modelowane jako zasilanie – kontrola dotyczy połączeń.
- Wygląd aparatów (pasek narzędzi → „Wygląd”): ogólny, styl Easy9, styl Hager – własna grafika CSS (śruby zacisków, pasek akcentu, okienka stanu I-ON/O-OFF, listwa dźwigni), bez logo i nazw producentów; wybór zapamiętany w przeglądarce. Większe miniatury w katalogu, szerokość wg liczby modułów. Styl Hager dopracowany według zdjęcia aparatu (niebieskie paski modułów, jasne dźwignie biegunów, przezroczysta osłona etykiety).
- Schemat wielokreskowy (okno „Schemat” → „Wielokreskowy”, także na wydruku): każdy biegun i każdy przewód z modelu, aparaty w poziomach według odległości od zasilania, symbole zestyku, wyzwalacza, przekładnika RCD, SPD, licznika, listew, szyny grzebieniowe; elementy bez połączenia z zasilaniem osobno.
- Podrozdzielnice: osobne projekty powiązane z obwodem rozdzielnicy nadrzędnej (`feed`), pasek „Rozdzielnice w projekcie”, tworzenie podrozdzielnicy z wyborem lub utworzeniem obwodu zasilającego, automatyczne sumowanie mocy w obwodzie zasilającym, spadek napięcia liczony łańcuchowo od złącza (WLZ → obwód zasilający → obwody podrozdzielnicy), TN-S dla podrozdzielnicy za rozdziałem PEN. Ograniczenia: powiązanie działa w obrębie jednej przeglądarki (eksport JSON przenosi jedną rozdzielnicę); selektywność między rozdzielnicami nie jest sprawdzana.
- Aparatura pomiarowa i sterująca (katalog „Pomiar i sterowanie”): liczniki energii 1F/3F (zawsze przewodzą), styczniki 2P/4P, przekaźnik bistabilny, zegar sterujący (przewodzą, gdy załączone), lampki kontrolne faz i gniazdo modułowe (odbiorniki – bez przejścia góra–dół); SPD T1+T2. Kontrola: gniazdo modułowe bez zasilania lub bez RCD. Na schemacie jednokreskowym liczniki (symbol kWh) i łączniki sterowane (styk bez wyzwalacza). Cewki styczników i przekaźników nie są modelowane.
- Rozmiar obudowy: zajęte i wolne moduły, zalecana obudowa z ok. 20% rezerwy (zalecenie praktyczne), informacja w kontroli przy mniejszej rezerwie.
- Gotowe szablony w kreatorze: mieszkanie 1F, dom 3F, dom z pompą ciepła, dom z fotowoltaiką (lista obwodów z typowymi mocami i długościami + opcje kreatora).
- Pomoc (przycisk w nagłówku): szybki start, rozdział PEN ze schematem i zasadami, układy sieci, kolory żył, WLZ i Al/Cu, grupy RCD, zakres obliczeń.
- Kontrola rozdziału PEN: rozdział za wyłącznikiem głównym to błąd (PEN nie może być przełączany, PN-HD 60364-4-46); PEN podłączony najpierw do zacisku N – ostrzeżenie (PEN → PE, potem mostek do N).
- Przewody na planszy: większy obszar kliknięcia (dotyk – jeszcze większy), podświetlenie po najechaniu, opis żyły w podpowiedzi, zaznaczony przewód zawsze na wierzchu, kolejne kliknięcia w tym samym miejscu przełączają między nakładającymi się przewodami.
- Lista elementów projektu w lewej kolumnie (pogrupowana jak katalog, z położeniem i parametrami); kliknięcie zaznacza element na planszy i otwiera jego właściwości. Szyny grzebieniowe też na liście.
- Układy sieci: TN-S, TN-C-S, TN-C, TT, IT. TN-C: połączenie N–PE jest zgodne z układem, RCD to błąd (PN-HD 60364-4-41, 411.4.5); IT/TT/TN-S: połączenie N–PE i żyła PEN w WLZ to błąd; IT: informacja, że kontrola izolacji i drugie zwarcie nie są sprawdzane. Kreator nadal oferuje TN-S, TN-C-S i TT.
- Złączki przejściowe Al/Cu (bimetaliczne) jako element na szynie, z tą samą liczbą żył co WLZ.
- WLZ – obliczenia (parametry sieci: przewód, długość, ułożenie, materiał): sprawdzenie obciążalności wobec zabezpieczenia przedlicznikowego (gG: 1,6·In ≤ 1,45·Iz, inaczej In ≤ Iz; tylko Cu 1,5–16 mm² z tabel w programie), dla Al obciążalność nie jest sprawdzana – brak zweryfikowanych tabel Al; spadek napięcia WLZ (γ Cu 56, Al 34) z mocy zainstalowanej (bez współczynnika jednoczesności) doliczany do każdego obwodu wobec limitu 3 %/5 % od złącza; WLZ na schemacie i wydruku.

### Dokumentacja
- Arkusz A4 do druku/PDF: rysunek, schemat jednokreskowy, obwody z fazą/RCD/obliczeniami, bilans faz, zestawienie materiałów, lista połączeń, wynik kontroli.
- Schemat jednokreskowy (`schematic.js`) generowany z połączeń – przycisk „Schemat”. Symbole aparatów nawiązujące do rodziny IEC 60617-7 / PN-EN 60617-7 (łącznik, wyzwalacz nadprądowy, czujnik różnicowoprądowy, SPD) – dokładna treść graficzna normy jest płatna i nie była weryfikowana, zob. `SCHEMATIC-SYMBOLS.md`. Numeracja aparatów (kolejność czytania) i obwodów (zgodna z listą obwodów), legenda użytych symboli, uproszczona tabelka rysunkowa (projekt, treść, data, układ/zasilanie).

### Kreator (`wizard.js`)
- Rozdzielnica z listy obwodów: dobór wyłączników i przekrojów, grupy RCD, wyrównanie faz przy ciągłych rzędach pod szyną 3P, listwy N/PE, SPD, rozdział PEN, wszystkie przewody. Wynik jako nowy projekt, bez błędów kontroli.
- Rodzaj obwodu „silnik / sprężarka” dobiera charakterystykę C zamiast B; wybór typu RCD (AC/A/F/B) trafia do opisu parametrów każdego RCD.
- Prąd wyłącznika głównego i każdego RCD dobierany z listy standardowych wartości (25/32/40/50/63/80/100 A) wg sumy prądów obwodów na najbardziej obciążonej fazie, bez współczynnika jednoczesności; generowanie jest odmawiane, gdy to przekracza 100 A, i ostrzega (bez blokowania), gdy wynik przekracza podane zabezpieczenie przedlicznikowe.
- Zapamiętane szablony list obwodów (zapisz / wczytaj / usuń) w localStorage, niezależne od listy projektów.

### Testy
`node test-model.cjs && node test-topology.cjs && node test-calc.cjs && node test-schematic.cjs && node test-wizard.cjs && node test-docs.cjs` –
każda reguła ma przypadek poprawny, błędny i brak danych.

## Do zrobienia

Kolejność według wartości dla użytkownika:

1. **Wygodniejsze rysowanie – pozostało** – test na fizycznym telefonie (zaznaczanie, przesuwanie grupowe, kopiowanie, ręczny przebieg przewodu i powiększone zaciski są zrobione, ale nie zweryfikowane na prawdziwym urządzeniu dotykowym).
2. ~~**Schemat zgodny z normą**~~ – zrobione w zakresie: symbole nawiązujące do IEC 60617-7 / PN-EN 60617-7, numeracja obwodów i aparatów, legenda, tabelka rysunkowa (zob. sekcja „Zrobione” i `SCHEMATIC-SYMBOLS.md`). **Pozostaje**: zakup i porównanie z pełną treścią graficzną normy (płatna, niedostępna przy tej zmianie) – schemat pozostaje poglądowy do czasu tej weryfikacji.
3. **Zweryfikowany katalog producentów – w toku** – parametry z kart katalogowych (szerokości, zaciski, przekroje, charakterystyki, zgodność szyn grzebieniowych) zamiast modeli umownych. Stan 1.11.2026 (`CATALOG-SOURCES.md`): szerokości MCB2 (2 mod.) i MCB4 (4 mod.) dodatkowo potwierdzone; MCB3 i RCD2 tylko wyliczone z podziałki modułu, nie potwierdzone wprost; **podejrzenie, że `GRID_WIDTH` bloków rozdzielczych (DB{P}_{h}) zaniża szerokość dla 11/15 otworów** (Legrand 4P/11 zacisków = 8 mod., model ma 6) – wymaga kompletu danych z jednej karty katalogowej przed zmianą geometrii, nie zmieniono pochopnie. Ta sesja nie miała dostępu sieciowego do prof-elec.com/rs-online.com (polityka sieci środowiska) – dalsza weryfikacja wymaga albo dostępu do tych domen, albo ręcznego sprawdzenia kart PDF przez użytkownika.
4. **Dokładniejsze obliczenia – częściowo zrobione 2.11.2026** – zrobione w wersji uproszczonej: przewidywana impedancja pętli (bez reaktancji i poprawki temperaturowej) i wybiórczość przez porównanie prądów znamionowych. **Pozostaje**: współczynniki temperatury i grupowania, przewody Al i XLPE, prąd zwarciowy, pełna wybiórczość z tabel producentów. Powód: ta sesja nie miała dostępu do pełnej treści PN-HD 60364-5-52 (płatna, sesja bez dostępu do prof-elec.com/rs-online.com), a wyszukiwarka nie dała spójnych, potwierdzonych wartości tabel współczynników korekcyjnych ani tabel obciążalności dla Al/XLPE – wtórne źródła (viox.com i podobne) są niespójne między sobą i same proszą o sprawdzenie w normie. Kodowanie tych tabel z pamięci bez weryfikacji byłoby ryzykowne dla narzędzia liczącego obciążalność przewodów. Selektywność i prąd zwarciowy/impedancja pętli dodatkowo wymagają danych sieci (Zs lub Ik w złączu), których model obecnie nie zbiera – to osobna, większa zmiana danych wejściowych. **Do zrobienia, gdy będzie dostęp do normy**: dodać tabele współczynników (z cytowaniem konkretnej tabeli i edycji normy), tabele Al/XLPE, a dopiero potem pola sieciowe do zwarcia/impedancji pętli.
5. **Kreator – rozszerzenia – częściowo zrobione**: ~~charakterystyka C dla silników~~, ~~RCD typu A/F/B~~, ~~limity prądu RCD i wyłącznika głównego wobec obciążenia~~ (dobór z listy 25/32/40/50/63/80/100 A wg obliczonego obciążenia bez współczynnika jednoczesności, odmowa generowania powyżej 100 A, ostrzeżenie gdy obciążenie przekracza podane zabezpieczenie przedlicznikowe), ~~zapamiętane szablony obwodów~~ (localStorage, przyciski w dialogu kreatora). ~~RCBO zamiast grup RCD~~ (tryb „RCBO dla każdego obwodu 1-fazowego”: osobne rzędy RCBO na pozycjach 2·p, fazy L1/L3/L2 według pinów szyny, obwody 3-fazowe nadal w grupach RCD 4P; w modelu szyna ma pin co moduł – rzeczywista szyna dla 1P+N ma podziałkę dopasowaną do aparatu). Pozostaje: RCBO 3-fazowe (brak typu w `TYPES`).
6. **Konta i projekty w chmurze – zablokowane, wymaga decyzji i dostępu od użytkownika** – Firebase Authentication + Firestore, reguły dostępu, wersje projektów. Nie da się tego zacząć bez projektu Firebase (ID, konfiguracji, reguł) dostarczonego przez użytkownika – zgodnie z zasadami jakości tej sesji sekrety i konfiguracja usług zewnętrznych nie są tworzone samodzielnie ani zgadywane.
7. **AI – zablokowane, wymaga infrastruktury serwerowej** – endpoint serwerowy (klucz tylko po stronie serwera) wyjaśniający wyniki kontroli i proponujący zmiany do akceptacji, z ponowną walidacją i cofaniem. Wymaga miejsca na hosting endpointu i klucza API dostarczonego przez użytkownika – nie do zrobienia w samym repozytorium frontendowym bez tej decyzji.
8. **Powiązanie z Eco Volt – zablokowane, wymaga danych o integracji** – projekt rozdzielnicy wysyłany razem z zapytaniem o wycenę. Wymaga specyfikacji API/formatu Eco Volt od użytkownika (nie zgadywano jej).
10. **Eksport i import całego projektu** – rozdzielnica główna z podrozdzielnicami w jednym pliku JSON (dziś eksport obejmuje jedną rozdzielnicę).
11. **Obwody sterowania** – zaciski cewek A1/A2 styczników i przekaźników, żeby zegar, CKF lub sterownik smart faktycznie sterowały stycznikiem w modelu.
12. **Skrzynka licznikowa – uzupełnienia** – pokazanie na schemacie jednokreskowym i w opisach na drzwiczki; wybór góra/dół także dla przyłącza.
13. **Złączki szynowe w rzeczywistej szerokości** – ułamkowe szerokości (5–8 mm) zamiast 1 modułu; wymaga obsługi szerokości niecałkowitych w siatce.
14. **Do sprawdzenia przez użytkownika** – wygląd stylów Easy9/Hager, nowych aparatów, skrzynki licznikowej i schematu wielokreskowego na prawdziwym ekranie (część zrzutów w sesji nie działała).
9. **Porządek w kodzie – nie podjęte 1.11.2026** – podział `app.js` na moduły; ewentualna migracja do Next.js + TypeScript z zachowaniem importu dotychczasowych projektów. Świadomie odłożone w tej sesji: to już ostatnia pozycja wg wartości dla użytkownika, a UI (`app.js`) nie ma testów automatycznych (tylko logika w `model.js`/`topology.js`/`calc.js`/`wizard.js`/`schematic.js` ma `test-*.cjs`) – refaktor tak dużego, gęstego pliku bez siatki bezpieczeństwa niósłby realne ryzyko regresji, które dałoby się złapać dopiero ręcznym przeklikaniem całej aplikacji. Zanim to ruszyć: albo dodać chociaż podstawowe testy UI (np. Playwright), albo zrobić to pod bieżącą obserwacją użytkownika w mniejszych, osobno testowanych krokach.

## Zakres weryfikacji

Trzy wyniki: wykryty problem, sprawdzone w określonym zakresie, niewystarczające dane. Brak wykrytych problemów nie
oznacza zatwierdzenia projektu. Weryfikacja produktu powinna obejmować przegląd przez osobę kompetentną w
projektowaniu instalacji. Pomiary i jakość rzeczywistego montażu pozostają poza modelem.
