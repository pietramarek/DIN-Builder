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
- Wyłącznik główny 4P i 1P+N, RCD 4P i 2P, MCB 1P/2P/3P/3P+N, RCBO, SPD.
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

### Dokumentacja
- Arkusz A4 do druku/PDF: rysunek, schemat jednokreskowy, obwody z fazą/RCD/obliczeniami, bilans faz, zestawienie materiałów, lista połączeń, wynik kontroli.
- Schemat jednokreskowy (`schematic.js`) generowany z połączeń – przycisk „Schemat”. Symbole aparatów nawiązujące do rodziny IEC 60617-7 / PN-EN 60617-7 (łącznik, wyzwalacz nadprądowy, czujnik różnicowoprądowy, SPD) – dokładna treść graficzna normy jest płatna i nie była weryfikowana, zob. `SCHEMATIC-SYMBOLS.md`. Numeracja aparatów (kolejność czytania) i obwodów (zgodna z listą obwodów), legenda użytych symboli, uproszczona tabelka rysunkowa (projekt, treść, data, układ/zasilanie).

### Kreator (`wizard.js`)
- Rozdzielnica z listy obwodów: dobór wyłączników i przekrojów, grupy RCD, wyrównanie faz przy ciągłych rzędach pod szyną 3P, listwy N/PE, SPD, rozdział PEN, wszystkie przewody. Wynik jako nowy projekt, bez błędów kontroli.
- Rodzaj obwodu „silnik / sprężarka” dobiera charakterystykę C zamiast B; wybór typu RCD (AC/A/F/B) trafia do opisu parametrów każdego RCD.
- Prąd wyłącznika głównego i każdego RCD dobierany z listy standardowych wartości (25/32/40/50/63/80/100 A) wg sumy prądów obwodów na najbardziej obciążonej fazie, bez współczynnika jednoczesności; generowanie jest odmawiane, gdy to przekracza 100 A, i ostrzega (bez blokowania), gdy wynik przekracza podane zabezpieczenie przedlicznikowe.
- Zapamiętane szablony list obwodów (zapisz / wczytaj / usuń) w localStorage, niezależne od listy projektów.

### Testy
`node test-model.cjs && node test-topology.cjs && node test-calc.cjs && node test-schematic.cjs && node test-wizard.cjs` –
każda reguła ma przypadek poprawny, błędny i brak danych.

## Do zrobienia

Kolejność według wartości dla użytkownika:

1. **Wygodniejsze rysowanie – pozostało** – test na fizycznym telefonie (zaznaczanie, przesuwanie grupowe, kopiowanie, ręczny przebieg przewodu i powiększone zaciski są zrobione, ale nie zweryfikowane na prawdziwym urządzeniu dotykowym).
2. ~~**Schemat zgodny z normą**~~ – zrobione w zakresie: symbole nawiązujące do IEC 60617-7 / PN-EN 60617-7, numeracja obwodów i aparatów, legenda, tabelka rysunkowa (zob. sekcja „Zrobione” i `SCHEMATIC-SYMBOLS.md`). **Pozostaje**: zakup i porównanie z pełną treścią graficzną normy (płatna, niedostępna przy tej zmianie) – schemat pozostaje poglądowy do czasu tej weryfikacji.
3. **Zweryfikowany katalog producentów – w toku** – parametry z kart katalogowych (szerokości, zaciski, przekroje, charakterystyki, zgodność szyn grzebieniowych) zamiast modeli umownych. Stan 1.11.2026 (`CATALOG-SOURCES.md`): szerokości MCB2 (2 mod.) i MCB4 (4 mod.) dodatkowo potwierdzone; MCB3 i RCD2 tylko wyliczone z podziałki modułu, nie potwierdzone wprost; **podejrzenie, że `GRID_WIDTH` bloków rozdzielczych (DB{P}_{h}) zaniża szerokość dla 11/15 otworów** (Legrand 4P/11 zacisków = 8 mod., model ma 6) – wymaga kompletu danych z jednej karty katalogowej przed zmianą geometrii, nie zmieniono pochopnie. Ta sesja nie miała dostępu sieciowego do prof-elec.com/rs-online.com (polityka sieci środowiska) – dalsza weryfikacja wymaga albo dostępu do tych domen, albo ręcznego sprawdzenia kart PDF przez użytkownika.
4. **Dokładniejsze obliczenia** – współczynniki temperatury i grupowania, przewody Al i XLPE, spadek napięcia od złącza (WLZ), wybiórczość, prąd zwarciowy i impedancja pętli (wymagają danych sieci i sprawdzonych przypadków odniesienia).
5. **Kreator – rozszerzenia – częściowo zrobione**: ~~charakterystyka C dla silników~~, ~~RCD typu A/F/B~~, ~~limity prądu RCD i wyłącznika głównego wobec obciążenia~~ (dobór z listy 25/32/40/50/63/80/100 A wg obliczonego obciążenia bez współczynnika jednoczesności, odmowa generowania powyżej 100 A, ostrzeżenie gdy obciążenie przekracza podane zabezpieczenie przedlicznikowe), ~~zapamiętane szablony obwodów~~ (localStorage, przyciski w dialogu kreatora). **Pozostaje: RCBO zamiast grup RCD** – nieprzeniesione: algorytm rozmieszczania (`sequence()`) zakłada aparaty szerokości 1 modułu przy wyrównywaniu pinów szyny 3-fazowej, a RCBO ma szerokość 2 modułów i tylko wariant 1P+N (nie ma RCBO 3-fazowego w `TYPES`) – wymaga ogólniejszego algorytmu rozmieszczania szyny grzebieniowej, nie tylko przełącznika typu aparatu.
6. **Konta i projekty w chmurze** – Firebase Authentication + Firestore, reguły dostępu, wersje projektów (wymaga projektu Firebase i konfiguracji).
7. **AI** – endpoint serwerowy (klucz tylko po stronie serwera) wyjaśniający wyniki kontroli i proponujący zmiany do akceptacji, z ponowną walidacją i cofaniem.
8. **Powiązanie z Eco Volt** – projekt rozdzielnicy wysyłany razem z zapytaniem o wycenę.
9. **Porządek w kodzie** – podział `app.js` na moduły; ewentualna migracja do Next.js + TypeScript z zachowaniem importu dotychczasowych projektów.

## Zakres weryfikacji

Trzy wyniki: wykryty problem, sprawdzone w określonym zakresie, niewystarczające dane. Brak wykrytych problemów nie
oznacza zatwierdzenia projektu. Weryfikacja produktu powinna obejmować przegląd przez osobę kompetentną w
projektowaniu instalacji. Pomiary i jakość rzeczywistego montażu pozostają poza modelem.
