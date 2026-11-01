# Rozdzielnia Studio — dalszy rozwój

Pierwszy etap: interaktywny prototyp 2D działający lokalnie w przeglądarce, bez usług zewnętrznych. Zapis lokalny i eksport JSON umożliwiają testowanie modelu bez konta.

## Kolejny etap

- Migracja edytora do Next.js / TypeScript i React Flow po zatwierdzeniu interakcji.
- Firebase Authentication i Firestore: projekty przypisane do użytkownika, reguły dostępu oraz wersjonowanie; testy reguł przed wdrożeniem.
- Vercel: aplikacja i endpoint analizy AI. Klucze dostawcy wyłącznie po stronie serwera.
- Wersjonowany format projektu: urządzenia, zaciski, wewnętrzne połączenia urządzeń, przewody, obwody, parametry sieci i położenie na szynach.
- Oddzielne modelowanie przewodności, ochrony i fizycznego rozmieszczenia. Linie na ekranie nie definiują elektrycznej funkcji przewodu.
- Zweryfikowany katalog producentów: szerokości, zaciski, dopuszczalne przekroje i liczby żył, charakterystyki, szyny i ograniczenia montażu.
- Silnik reguł z identyfikatorem i wersją każdej reguły, zakresem stosowalności, źródłem oraz listą brakujących danych.
- AI wyjaśnia deterministyczne wyniki kontroli oraz proponuje różnicę w projekcie do zaakceptowania. Każda propozycja jest ponownie walidowana; AI nie nadaje projektowi statusu bezpiecznej instalacji.

## Zakres weryfikacji

Trzy wyniki: wykryty problem, sprawdzone w określonym zakresie, niewystarczające dane. Brak wykrytych problemów nie oznacza zatwierdzenia projektu.

Obliczenia ochrony, obciążalności, spadków napięcia i selektywności wymagają odrębnej implementacji, danych wejściowych oraz sprawdzonych przypadków odniesienia. Weryfikacja produktu powinna obejmować przegląd przez osobę kompetentną w projektowaniu instalacji. Pomiary i jakość rzeczywistego montażu pozostają poza modelem.

## Testy przed rozszerzeniem zastosowania

Przykłady poprawnych i błędnych topologii, neutralne przypisane do grup RCD, zmiana stanu wyłączników, rozgałęzienia i cykle, kompletność obwodów, migracje plików, błędne dane wejściowe oraz uprawnienia do projektów. Każda reguła powinna mieć przypadki pozytywne, negatywne i przypadki braku danych.
