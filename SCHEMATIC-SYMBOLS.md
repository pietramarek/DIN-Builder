# Symbole schematu jednokreskowego — źródła i zastrzeżenia

Schemat jednokreskowy (`dist/schematic.js`, przycisk „Schemat” i sekcja na wydruku) rysuje aparaty zabezpieczające
uproszczonymi symbolami graficznymi. Ten dokument opisuje, na czym są oparte i czego **nie** potwierdzono.

## Co sprawdzono, a czego nie

Rodzina symboli aparatury łączeniowej, sterowniczej i zabezpieczającej w normie IEC 60617 to część 7
(„Graphical symbols for diagrams – Part 7: Switchgear, controlgear and protective devices”); PN-EN 60617-7 jest
polskim wydaniem tej normy. **Pełna treść graficzna normy (dokładna geometria symboli) jest płatna i nie była
dostępna do weryfikacji w tej pracy.** Wyszukiwanie (1.11.2026) nie znalazło darmowego, autorytatywnego źródła z
dokładnym rysunkiem symbolu wyłącznika nadprądowego ani wyłącznika różnicowoprądowego wg IEC 60617-7 — patrz
źródła poniżej. Symbole w aplikacji są więc rysowane wg **powszechnie stosowanej praktyki rysunku jednokreskowego**
(łącznik + wskaźniki funkcji), nie wg zweryfikowanego pierwowzoru normy. Traktuj schemat jako poglądowy, zgodnie z
opisem w aplikacji — nie zastępuje dokumentacji projektowej ani rysunku wykonanego wg pełnej treści normy.

## Konstrukcja symboli (`symbol()` w `dist/schematic.js`)

- **Łącznik (styk)** — przekątna kreska między dwoma punktami na przewodzie, wspólna dla wszystkich aparatów z
  funkcją łączeniową (MAIN, MAIN2, MCB, MCB2/3/4, RCD, RCD2, RCBO).
- **Wyzwalacz termiczno-magnetyczny (nadprądowy)** — mały kwadrat przy łączniku, rysowany dla aparatów z funkcją
  wyłącznika nadprądowego (wszystkie oprócz samego RCD/RCD2, które mają tylko funkcję różnicowoprądową).
- **Czujnik różnicowoprądowy (toroidalny)** — okrąg obejmujący łącznik, rysowany dla RCD, RCD2, RCBO.
- **Ogranicznik przepięć (SPD)** — prostokąt z przekątną „strzałką” w środku, umowny symbol warystora/iskiernika.
- **Opis biegunów** (`polesLabel()`) — liczony wprost z `TYPES[type].poles` w `dist/model.js` (np. „3P+N”, „1P”),
  nie jest to osobne źródło danych — pokazuje to, co już jest w modelu aparatu.

## Numeracja i tabelka rysunkowa

- Każdy aparat zabezpieczający dostaje numer w kółku (lewy górny róg ramki), w kolejności czytania schematu
  (rząd po rzędzie, od góry, w obrębie rzędu od lewej) — to numer na potrzeby tego rysunku, nie identyfikator
  zapisany w projekcie (tym pozostaje oznaczenie, np. „F1”).
- Numer obwodu przy nazwie odbioru odpowiada pozycji obwodu na liście obwodów w edytorze i w zestawieniu na
  wydruku (ta sama liczba w obu miejscach).
- Tabelka rysunkowa w prawym dolnym rogu (pola: Projekt, Treść rysunku, Data, Układ/zasilanie) to uproszczona
  wersja metryki rysunku technicznego (por. PN-EN ISO 7200) — nie jest pełną metryką z polami typu
  „wykonał/sprawdził/skala” wymaganymi w formalnej dokumentacji projektowej.

## Źródła sprawdzone przy tej zmianie (1.11.2026)

- IEC 60617-7 / PN-EN 60617-7 — tytuł i zakres części 7 („Switchgear, controlgear and protective devices”)
  potwierdzony w katalogach norm (np. https://6sku3uaup9f9.din.de/en/standard/en-60617-7/2145688 ,
  https://www.boutique.afnor.org/standard/nf-en-60617-7/graphical-symbols-for-diagrams-part-7-switchgear-controlgear-and-protective-devices/article/860890/fa040209 ).
  Treść graficzna płatna — nie pobrana ani nie zweryfikowana.
- Wątek o statusie PN-EN 60617 (wycofanie przez PKN) sygnalizowany na forum elektroda.pl — nie potwierdzony w
  źródle oficjalnym; jeśli to istotne dla Twojej dokumentacji, sprawdź aktualny status w katalogu PKN.
- Pomocniczo, dla ogólnej konwencji rysowania (nie jako źródło normy): „Kompletny przewodnik po symbolach
  wyłączników automatycznych”, https://viox.com/pl/complete-guide-to-circuit-breaker-symbols/ — źródło komercyjne,
  potraktowane jako wskazówka co do powszechnej praktyki, nie jako treść normy.

## Co zrobić, żeby podnieść pewność zgodności z normą

1. Zdobyć (kupić) aktualne wydanie PN-EN 60617-7 w PKN i porównać dokładną geometrię symboli.
2. Sprawdzić aktualny status normy (czy nie została wycofana/zastąpiona) w katalogu PKN.
3. W razie rozbieżności — poprawić funkcję `symbol()` w `dist/schematic.js` i zaktualizować ten plik.
