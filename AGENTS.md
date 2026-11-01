# DIN Builder — instrukcje i przekazanie projektu

## Cel
Aplikacja do wizualnego układania aparatów na szynach DIN pod podane obwody, łączenia konkretnych zacisków przewodami i wykrywania problemów. Docelowo silnik reguł wykonuje kontrolę i obliczenia, a AI wyjaśnia wyniki i proponuje poprawki do zatwierdzenia przez użytkownika.

## Stan
- HTML, CSS, czysty JavaScript, SVG; brak frameworka i zewnętrznych zależności.
- dist/index.html, style.css, app.js: edytor z wyborem rozmiaru obudowy (1–8 szyn × 6–36 modułów, domyślnie 4 × 18 dla starych projektów), zoom 40–200%, przeciąganie pointer events, kontrola kolizji, przewody, szyny grzebieniowe 1P/3P, panel parametrów, obwody z fazą i listwą N, bilans faz, czyszczenie rozdzielni, undo/redo. Wygląd aparatów poglądowy (przykładowe nazwy Schneider Acti9, źródła w CATALOG-SOURCES.md).
- dist/model.js: czyste funkcje modelu, podstawowe konflikty funkcji i faz, walidacja importu (w tym rows/modules, busbars, circuits[].nBar — pola opcjonalne, format v1 zgodny wstecz).
- dist/topology.js: deterministyczna topologia ścieżek przewodzących (przewody, szyny grzebieniowe, załączone aparaty, listwy N/PE; SPD nie przewodzi szeregowo). Zasilanie = górne zaciski wyłącznika głównego (MAIN). Wykrywa: zwarcia L/N w modelu, PE pod napięciem, obejście RCD, wspólny N dwóch grup RCD, N obwodu spoza grupy RCD (gdy wskazano listwę N), obwody bez RCD (ostrzeżenie z odwołaniem do PN-HD 60364-4-41), bilans mocy zainstalowanej na fazach (informacja, heurystyka 2×, nie wymóg normy). Brak MAIN lub listwy N jest raportowany jako brak danych. Nie liczy prądów, impedancji ani obciążalności.
- localStorage oraz import/eksport JSON. Nie ma kont, Firebase ani serwerowego AI.
- Testy: `node test-model.cjs && node test-topology.cjs` (model: kolizje, import, rozmiar obudowy; topologia: przypadki poprawne, błędne i brak danych dla każdej reguły).
- Podgląd: python -m http.server 8000 --directory dist.
- GitHub: pietramarek/DIN-Builder, gałąź main.
- Vercel: zespół pietramareks-projects, projekt din-builder, ID prj_V9EYcttFrOvJ4aQwm2W46ohnoUS6.
- Działający adres: https://rozdzielnia-studio.vercel.app ; istnieje również alias din-builder-pietramareks-projects.vercel.app.
- ROADMAP.md zawiera plan architektury. Nie traktuj jego propozycji jako już wdrożonych funkcji.

## Kolejność dalszych prac
1. Przejrzeć aktualny kod, uruchomić testy i zweryfikować edytor w przeglądarce.
2. Dopracować ergonomię: zoom/pan, czytelność zacisków, większe i konfigurowalne obudowy, ręczna edycja przebiegu przewodów, zaznaczanie i usuwanie, obsługa dotyku, autosave i informacja o jego stanie.
3. Zdefiniować wersjonowany model danych: aparaty, porty, połączenia wewnętrzne, przewody, szyny grzebieniowe, obwody i zasilanie. Dodać migrację obecnego JSON.
4. Dodać parametry sieci: układ sieci, zasilanie, zabezpieczenie przedlicznikowe i wymagane dane obwodów. Nieznane dane muszą pozostawać jawnie nieznane.
5. Rozbudować deterministyczny silnik topologii: ciągłość, rozgałęzienia, propagacja faz, grupy RCD i neutralne, odłączanie obwodów. Obecne przełączanie dźwigni zapisuje jedynie stan; nie symuluje elektrycznie instalacji.
6. Opracować zweryfikowany katalog aparatów producentów: szerokość, zaciski, liczba i przekroje żył, parametry, kompatybilność szyn. Modele obecne są umowne.
7. Obliczenia elektryczne implementować oddzielnie, z wymaganymi danymi, źródłami i przypadkami odniesienia: obciążalność, spadki napięcia, ochrona, zdolność zwarciowa i selektywność.
8. AI: endpoint serwerowy, dane strukturalne i wyniki reguł jako wejście, wyjaśnienia oraz propozycje zmian; akceptacja przez użytkownika, ponowna walidacja i możliwość cofnięcia.
9. Konta i projekty: Firebase Authentication + Firestore (preferencja użytkownika), reguły dostępu, wersje projektów. Sekrety wyłącznie po stronie serwera.
10. Eksport: zestawienie materiałów, lista połączeń, rysunek montażowy PDF; następnie schemat jednokreskowy.
11. Docelowa migracja do Next.js + TypeScript + React Flow jest propozycją architektury, nie ukończonym zadaniem. Zachować działające funkcje i import dotychczasowych projektów.

## Zasady jakości
- Wynik kontroli: wykryty problem / sprawdzone w określonym zakresie / brak danych.
- Brak konfliktów nie jest potwierdzeniem bezpieczeństwa, zgodności z normami ani poprawności rzeczywistego montażu.
- Nie przedstawiaj AI ani prostej animacji jako pełnego symulatora elektrycznego.
- Każda reguła powinna mieć określony zakres, źródło, wymagane dane i testy: poprawny przypadek, błąd i brak danych.
- Weryfikować import, unikalne bezpieczne ID, referencje zacisków i limity plików.
- Testy obejmują rzeczywiste zachowania, nie tylko kopię implementacji.
- Nie zmieniaj widoczności repozytorium ani ustawień ochrony Vercel bez polecenia użytkownika.
- Nie umieszczaj kluczy API, tokenów ani danych logowania w repozytorium.
