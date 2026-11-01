# Źródła przykładowych nazw aparatów

Pole `example` w `TYPES` (`dist/model.js`) zawiera **przykładowe** oznaczenia handlowe pokazywane w katalogu i w podpowiedzi aparatu. Są to dane opisowe typu aparatu, nie dobór zabezpieczeń. Parametry konkretnego aparatu w projekcie (pole `rating`) mogą się różnić od przykładu. Wygląd aparatów na planszy to własna, uproszczona grafika CSS inspirowana ogólnym wyglądem aparatów modułowych. Nie używa zdjęć, renderów ani logo producentów.

Sprawdzono 1.11.2026 na kartach produktów u dystrybutora prof-elec.com (karty Schneider Electric). Strona se.com/pl nie zwróciła treści karty produktu przy pobieraniu automatycznym.

| Typ | Przykład | Symbol | Parametry ze źródła | Szerokość ze źródła | Szerokość w `TYPES` | Źródło |
|---|---|---|---|---|---|---|
| MAIN | Schneider Electric Acti9 iSW, rozłącznik izolacyjny | A9S65440 | 4P, 40 A, 415 V AC | 72 mm (8 × 9 mm) | 4 mod. (72 mm), zgodna | https://prof-elec.com/all-categories/circuit-protection/modular-circuit-breakers/a9s65440-en/ |
| RCD | Schneider Electric Acti9 iID, wyłącznik różnicowoprądowy | A9R21440 | 4P, 40 A, 30 mA, typ A; przycisk testu; wskaźniki VisiTrip i VisiSafe | 72 mm × 91 mm × 73,5 mm | 4 mod., zgodna | https://prof-elec.com/all-categories/circuit-protection/modular-circuit-breakers/a9r21440-en/ |
| MCB | Schneider Electric Acti9 iC60N, wyłącznik nadprądowy | A9F73116 | 1P, 16 A, charakterystyka B, 6 kA (EN/IEC 60898-1) | 18 mm × 85 mm × 78,5 mm | 1 mod., zgodna | https://prof-elec.com/all-categories/circuit-protection/modular-circuit-breakers/a9f73116-en/ |
| RCBO | Schneider Electric Acti9 iDPN N Vigi | A9D56616 | 1P+N, 16 A, charakterystyka B, 30 mA, typ A, 6000 A | 36 mm × 85 mm × 73 mm | 2 mod., zgodna | https://prof-elec.com/all-categories/circuit-protection/modular-circuit-breakers/a9d56616-en/ |
| SPD | Schneider Electric Acti9 iPRD40r, ogranicznik przepięć typu 2 | A9L40601 | 3P+N, Imax 40 kA, In 15 kA, Up 1,4 kV, wymienne wkładki, styk zdalnej sygnalizacji | 72 mm × 85 mm × 69 mm | 4 mod., zgodna | https://prof-elec.com/all-categories/modular-devices-en/surge-arrester-en/a9l40601-en/ |
| N, PE | brak przykładu | — | — | — | 3 mod. | Nie potwierdzono konkretnego produktu. Listwy pozostają modelem ogólnym. |

Dodatkowo, dla porównania: Acti9 iC60N C16 1P ma symbol A9F74116 (18 mm × 85 mm × 78,5 mm, RAL 9003), https://prof-elec.com/all-categories/circuit-protection/modular-circuit-breakers/a9f74116-en/.

## Uzupełnienie 1.11.2026 — szerokości MCB2/MCB3/MCB4, RCD2 i blok rozdzielczy

Ta sesja nie miała bezpośredniego dostępu sieciowego do prof-elec.com ani rs-online.com (polityka sieci środowiska
uruchomieniowego) — dane poniżej pochodzą z fragmentów wyszukiwarki (WebSearch), nie z samodzielnie pobranej i
przeczytanej strony źródłowej. Traktuj je jako wskazówkę do potwierdzenia, nie jak poprzednie wiersze tabeli.

| Typ w `TYPES` | Co sprawdzono | Wynik | Zgodność z `TYPES.width` | Źródła (fragmenty wyszukiwarki) |
|---|---|---|---|---|
| MCB2 (iC60N 2P) | Szerokość 2-biegunowego iC60N | 36 mm (2 × 18 mm) — spójne w 3 niezależnych ofertach dystrybutorów | zgodna (2 mod.) | one-elec.com (A9F77210), proshop.de, RS Components (hkcn.rs-online.com/web/p/mcbs/0428829) |
| MCB4 (iC60N 4P, czyli 3P+N) | Szerokość 4-biegunowego iC60N | 72 mm (8 modułów po 9 mm) — spójne w kilku ofertach | zgodna (4 mod.) | digitec.ch, one-elec.com, kr.rs-online.com/web/p/mcbs/7349692 |
| MCB3 (iC60N 3P) | Szerokość 3-biegunowego iC60N | Nie znaleziono wprost. Wyliczone z potwierdzonej podziałki modułu Acti9 (18 mm) → 54 mm (3 mod.), **nie potwierdzone wprost w karcie produktu** | niepotwierdzona wprost | — (wyliczenie z podziałki modułu, nie z wymiaru produktu) |
| RCD2 (iID 2P) | Szerokość 2-biegunowego wyłącznika różnicowoprądowego | Nie znaleziono wprost w wynikach wyszukiwania. Prawdopodobnie 36 mm (2 mod.) przez analogię do MCB2, ale to założenie, nie potwierdzenie | niepotwierdzona wprost | se.com (karta produktu nie zwróciła wymiarów w wynikach wyszukiwarki) |
| DB{P}_{h} (blok rozdzielczy) | Szerokość realnych bloków rozdzielczych wg liczby otworów na tor | **Rozbieżność z modelem.** Legrand 400407 (4P, 100 A, 11 zacisków) to **8 modułów**, nie 6 jak w `GRID_WIDTH={7:4,11:6,15:8}` dla `h=11`. Legrand 400405 (4P, 100 A, 6 zacisków) to 4 moduły; Legrand 400402 (2P, 100 A, 10 zacisków) to 6 modułów. Liczby otworów (6, 10) nie pokrywają się dokładnie z `HOLES=[7,11,15]` w modelu, więc nie da się ich wprost podstawić. | **model prawdopodobnie zaniża szerokość dla 11 i 15 otworów** — wymaga potwierdzenia przed zmianą geometrii | legrand.pl (produkty 400402, 400405, 400407), morele.net |

**Wniosek:** szerokości pojedynczych wyłączników (MCB2, MCB4) są wiarygodnie potwierdzone i zgodne z modelem.
Szerokość bloków rozdzielczych (`GRID_WIDTH`) jest **prawdopodobnie zaniżona** dla wariantów 11 i 15 otworów na
podstawie jednego produktu Legrand — to realne ryzyko błędu w kolizjach na planszy, ale zmiana geometrii na
podstawie jednego, niedopasowanego dokładnie punktu danych byłaby nieodpowiedzialna (wpływa na `fits()` i
wszystkie zapisane projekty). Przed zmianą `GRID_WIDTH` zebrać komplet danych (ten sam producent, wszystkie
kombinacje liczby biegunów × liczby otworów z `HOLES`) z oficjalnej karty katalogowej PDF, nie z fragmentów
wyszukiwarki.

## Cechy wyglądu ujęte w grafice (poglądowo)

- Obudowa biała lub jasnoszara. Karty produktów podają kolor biały RAL 9003.
- Typowa wysokość frontu aparatów Acti9 to 85 mm, a szerokość modułu to 18 mm. Plansza zachowuje swoją umowną geometrię: 40 px na moduł i 98 px wysokości aparatu. Proporcje nie są więc odwzorowane w skali.
- RCD i RCBO mają przycisk testu. Na grafice jest to przycisk „T”.
- iPRD40r ma wymienne wkładki, po jednej na biegun.
- Okienko stanu przy dźwigni (czerwone I = załączony, zielone O = wyłączony) to umowna konwencja aplikacji. Nie odwzorowuje wskaźników VisiSafe ani VisiTrip.
- Kolory dźwigni, wskaźników wkładek SPD oraz listew N i PE nie zostały potwierdzone dla konkretnych produktów i są umowne.
