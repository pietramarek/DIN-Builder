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

## Cechy wyglądu ujęte w grafice (poglądowo)

- Obudowa biała lub jasnoszara. Karty produktów podają kolor biały RAL 9003.
- Typowa wysokość frontu aparatów Acti9 to 85 mm, a szerokość modułu to 18 mm. Plansza zachowuje swoją umowną geometrię: 40 px na moduł i 98 px wysokości aparatu. Proporcje nie są więc odwzorowane w skali.
- RCD i RCBO mają przycisk testu. Na grafice jest to przycisk „T”.
- iPRD40r ma wymienne wkładki, po jednej na biegun.
- Okienko stanu przy dźwigni (czerwone I = załączony, zielone O = wyłączony) to umowna konwencja aplikacji. Nie odwzorowuje wskaźników VisiSafe ani VisiTrip.
- Kolory dźwigni, wskaźników wkładek SPD oraz listew N i PE nie zostały potwierdzone dla konkretnych produktów i są umowne.
