# DIN Builder

Wizualny edytor rozdzielni DIN. HTML, CSS, JavaScript i SVG. Zapis lokalny oraz import i eksport JSON.

Uruchomienie: `python -m http.server 8000 --directory dist`.
Testy: `node test-model.cjs && node test-topology.cjs && node test-calc.cjs && node test-schematic.cjs`.

Prototyp kontroluje wybrane konflikty połączeń oraz topologię w modelu (fazy, zwarcia, grupy RCD, bilans faz). Nie potwierdza bezpieczeństwa instalacji i nie wykonuje pełnych obliczeń elektrycznych. AI i Firebase nie są jeszcze podłączone.
