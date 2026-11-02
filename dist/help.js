// Help topics shown in the "Pomoc" dialog. Static content only; norm references are given so the reader can verify them.
(function(root){
const PEN_SVG=`<svg class="helpsvg" viewBox="0 0 760 350" role="img" aria-labelledby="penSvgTitle"><title id="penSvgTitle">Schemat rozdziału PEN w rozdzielnicy (układ TN-C-S)</title>
<defs><pattern id="gy" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="#3c9a3e"/><rect x="6" width="6" height="12" fill="#e9cd2c"/></pattern></defs>
<g font-size="12" fill="#243b45">
<text x="14" y="30" font-weight="700">WLZ 4-żyłowy</text><text x="14" y="47" font-size="10" fill="#75858b">L1, L2, L3, PEN</text>
<line x1="40" y1="70" x2="330" y2="70" stroke="#7b523c" stroke-width="4"/><text x="44" y="64" font-size="10">L1</text>
<line x1="40" y1="90" x2="330" y2="90" stroke="#303e46" stroke-width="4"/><text x="44" y="84" font-size="10">L2</text>
<line x1="40" y1="110" x2="330" y2="110" stroke="#8a9399" stroke-width="4"/><text x="44" y="104" font-size="10">L3</text>
<line x1="40" y1="150" x2="120" y2="150" stroke="#3c9a3e" stroke-width="6"/><line x1="40" y1="150" x2="120" y2="150" stroke="#e9cd2c" stroke-width="6" stroke-dasharray="6 6"/>
<rect x="36" y="144" width="10" height="12" fill="#2f8cc6"/><text x="44" y="140" font-size="10" font-weight="700">PEN</text>
<rect x="120" y="140" width="80" height="20" rx="3" fill="url(#gy)" stroke="#4f6a3a"/><text x="160" y="178" text-anchor="middle" font-size="10" font-weight="700">zacisk / szyna PE</text><text x="160" y="194" text-anchor="middle" font-size="9" fill="#75858b">PEN dochodzi tutaj</text>
<line x1="200" y1="150" x2="230" y2="150" stroke="#243b45" stroke-width="5"/><text x="215" y="134" text-anchor="middle" font-size="9" font-weight="700">mostek</text>
<rect x="230" y="140" width="60" height="20" rx="3" fill="#2f8cc6" stroke="#1f5f86"/><text x="260" y="154" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">N</text>
<line x1="290" y1="150" x2="330" y2="150" stroke="#2f8cc6" stroke-width="4"/>
<rect x="330" y="50" width="56" height="120" rx="4" fill="#eef1f0" stroke="#7d8a8f"/><text x="358" y="40" text-anchor="middle" font-size="10" font-weight="700">wyłącznik główny 4P</text>
<g stroke="#243b45" stroke-width="2"><line x1="345" y1="70" x2="372" y2="62"/><line x1="345" y1="90" x2="372" y2="82"/><line x1="345" y1="110" x2="372" y2="102"/><line x1="345" y1="150" x2="372" y2="142"/></g>
<line x1="386" y1="70" x2="470" y2="70" stroke="#7b523c" stroke-width="4"/><line x1="386" y1="90" x2="470" y2="90" stroke="#303e46" stroke-width="4"/><line x1="386" y1="110" x2="470" y2="110" stroke="#8a9399" stroke-width="4"/><line x1="386" y1="150" x2="470" y2="150" stroke="#2f8cc6" stroke-width="4"/>
<rect x="470" y="50" width="96" height="120" rx="4" fill="#f4f8fb" stroke="#7d8a8f"/><text x="518" y="100" text-anchor="middle" font-weight="700">RCD</text><text x="518" y="116" text-anchor="middle" font-size="10">→ obwody</text>
<line x1="140" y1="160" x2="140" y2="240" stroke="#3c9a3e" stroke-width="4"/><line x1="140" y1="160" x2="140" y2="240" stroke="#e9cd2c" stroke-width="4" stroke-dasharray="5 5"/>
<line x1="140" y1="240" x2="566" y2="240" stroke="#3c9a3e" stroke-width="4"/><line x1="140" y1="240" x2="566" y2="240" stroke="#e9cd2c" stroke-width="4" stroke-dasharray="5 5"/><text x="470" y="232" font-size="10" font-weight="700">PE obwodów (listwy PE)</text>
<line x1="180" y1="160" x2="180" y2="285" stroke="#3c9a3e" stroke-width="4"/><line x1="180" y1="160" x2="180" y2="285" stroke="#e9cd2c" stroke-width="4" stroke-dasharray="5 5"/>
<rect x="150" y="285" width="110" height="18" rx="3" fill="url(#gy)" stroke="#4f6a3a"/><text x="270" y="298" font-size="10" font-weight="700">GSU – główna szyna uziemiająca</text>
<line x1="205" y1="303" x2="205" y2="322" stroke="#243b45" stroke-width="2" stroke-dasharray="4 3"/><g stroke="#243b45" stroke-width="2"><line x1="190" y1="322" x2="220" y2="322"/><line x1="195" y1="328" x2="215" y2="328"/><line x1="200" y1="334" x2="210" y2="334"/></g><text x="228" y="332" font-size="10" fill="#75858b">uziom (uziemienie punktu rozdziału – wg projektu i warunków OSD)</text>
<rect x="590" y="40" width="160" height="176" rx="6" fill="#fff" stroke="#dfe6e7"/><text x="602" y="60" font-weight="700" font-size="11">Pamiętaj</text>
<text x="602" y="80" font-size="10">1. PEN → najpierw do PE</text><text x="602" y="98" font-size="10">2. Jeden mostek PE → N</text><text x="602" y="116" font-size="10">3. Rozdział przed RCD</text><text x="602" y="134" font-size="10">4. PEN nie przez łącznik</text><text x="602" y="152" font-size="10">5. Za rozdziałem N ≠ PE</text><text x="602" y="170" font-size="10">6. PEN ≥ 10 mm² Cu</text><text x="616" y="187" font-size="10">lub ≥ 16 mm² Al</text><text x="602" y="202" font-size="10" fill="#75858b">poglądowo, nie projekt</text>
</g></svg>`;

const TOPICS=[
{id:'start',title:'Szybki start',html:`
<p>Kolejność pracy, która najszybciej daje poprawny projekt:</p>
<ol>
<li><b>Rozmiar obudowy</b> – „Nowy” albo „Rozmiar obudowy”: liczba szyn DIN i modułów na szynie.</li>
<li><b>Parametry sieci</b> – kliknij puste miejsce planszy: układ sieci, zasilanie 1/3-fazowe, zabezpieczenie przedlicznikowe, dane WLZ.</li>
<li><b>WLZ</b> – z katalogu „Zasilanie” dodaj przewód WLZ (wejście od dołu lub od góry obudowy), ustaw materiał i liczbę żył.</li>
<li><b>Aparaty</b> – kliknij element w katalogu nad planszą (trafi w pierwsze wolne miejsce) albo przeciągnij go na szynę.</li>
<li><b>Przewody</b> – kliknij zacisk, potem drugi zacisk. Funkcję żyły i przekrój zmienisz po kliknięciu przewodu.</li>
<li><b>Katalog</b> – na górze ulubione; „Wszystkie aparaty” rozwija pełną listę. Gwiazdka dodaje lub usuwa aparat z ulubionych.</li>
<li><b>Szyny grzebieniowe</b> – zaznacz wyłącznik nadprądowy i dodaj szynę w panelu po prawej.</li>
<li><b>Obwody</b> – w tabeli pod planszą: nazwa, aparat, moc, przewód, długość, sposób ułożenia.</li>
<li><b>Sprawdź projekt</b> – lista błędów i ostrzeżeń po prawej; kliknięcie pozycji pokazuje element.</li>
</ol>
<p>Lista po lewej zawiera wszystkie użyte elementy – kliknięcie otwiera ich właściwości. Kreator buduje całą rozdzielnicę z listy obwodów.</p>`},
{id:'pen',title:'Rozdział PEN (TN-C-S)',html:`
<p>Przyłącze w układzie <b>TN-C</b> ma przewód <b>PEN</b> (neutralny i ochronny w jednym). W budynku instalacja ma mieć osobne <b>N</b> i <b>PE</b> – w miejscu, gdzie PEN dzieli się na N i PE, powstaje układ <b>TN-C-S</b>. Gdzie jest punkt rozdziału (złącze czy rozdzielnica główna), wynika z projektu i warunków przyłączenia OSD.</p>
${PEN_SVG}
<h3>Jak podłączyć krok po kroku</h3>
<ol>
<li>Żyłę <b>PEN</b> z WLZ podłącz do <b>zacisku lub szyny PE</b>, nie do zacisku N (PN-HD 60364-5-54, 543.4).</li>
<li>Z szyny PE wykonaj <b>jedno</b> połączenie (mostek) do szyny <b>N</b>. To jedyne miejsce, w którym N i PE są połączone.</li>
<li>Z szyny N poprowadź N do wyłącznika głównego, fazy L1–L3 bezpośrednio do wyłącznika głównego.</li>
<li>Z szyny PE poprowadź przewody PE do listew PE obwodów oraz do GSU. Uziemienie punktu rozdziału wykonuje się zgodnie z projektem i warunkami OSD.</li>
<li>Wyłączniki różnicowoprądowe montuj <b>za</b> punktem rozdziału – przez RCD przechodzi tylko N, nigdy PEN ani PE.</li>
</ol>
<h3>Zasady</h3>
<ul>
<li><b>Za punktem rozdziału N i PE nie mogą się ponownie łączyć</b> – ani na listwach, ani w puszkach, ani w odbiornikach.</li>
<li><b>PEN nie może być przerywany ani przełączany</b> (PN-HD 60364-4-46) – dlatego rozdział jest przed wyłącznikiem głównym, a nie za nim.</li>
<li><b>Przekrój PEN</b> w instalacji stałej co najmniej 10 mm² Cu lub 16 mm² Al (PN-HD 60364-5-54).</li>
<li><b>Oznaczenie PEN</b>: zielono-żółty na całej długości z niebieskimi oznaczeniami na końcach albo niebieski z zielono-żółtymi oznaczeniami na końcach (PN-EN 60445).</li>
<li>W układzie <b>TN-C</b> (bez rozdziału) nie stosuje się RCD (PN-HD 60364-4-41, 411.4.5).</li>
</ul>
<h3>Jak to zrobić w programie</h3>
<ol>
<li>W parametrach sieci ustaw układ <b>TN-C-S</b>.</li>
<li>Dodaj WLZ i ustaw <b>4 żyły (L1, L2, L3, PEN)</b>; przy aluminium dodaj też złączki Al/Cu.</li>
<li>Dodaj <b>złączkę rozdziału PEN</b> (katalog „Zasilanie”, symbol PEN) – ma zacisk PE i zacisk N połączone mostkiem.</li>
<li>Połącz żyłę PEN z WLZ z zaciskiem <b>PE</b> złączki, zacisk <b>N</b> złączki z górnym zaciskiem N wyłącznika głównego, a dolny zacisk PE złączki z listwą PE.</li>
<li>„Sprawdź projekt” pokaże punkt rozdziału jako informację. Błędem jest m.in.: rozdział za wyłącznikiem głównym, N połączony z PE za RCD, PEN w TN-S/TT/IT.</li>
</ol>
<p class="muted">Schemat i opis są poglądowe. Rozwiązanie w konkretnym obiekcie określa projekt instalacji i warunki przyłączenia; prace wykonuje osoba z uprawnieniami.</p>`},
{id:'systems',title:'Układy sieci',html:`
<table class="helptable"><thead><tr><th>Układ</th><th>Przewody</th><th>Na co uważać</th></tr></thead><tbody>
<tr><td><b>TN-S</b></td><td>L, N, PE osobno od źródła</td><td>N i PE nigdzie w instalacji nie są połączone.</td></tr>
<tr><td><b>TN-C-S</b></td><td>do punktu rozdziału PEN, dalej N i PE</td><td>Jeden punkt rozdziału, przed RCD; dalej N ≠ PE.</td></tr>
<tr><td><b>TN-C</b></td><td>L i PEN</td><td>Starsze instalacje. Bez RCD. Przy modernizacji zwykle przejście na TN-C-S.</td></tr>
<tr><td><b>TT</b></td><td>L, N od sieci, PE z własnego uziomu</td><td>Ochrona zwykle przez RCD; N nie łączy się z PE.</td></tr>
<tr><td><b>IT</b></td><td>sieć izolowana lub uziemiona przez impedancję</td><td>Kontrola stanu izolacji i wyłączenie przy drugim zwarciu – program tego nie sprawdza.</td></tr>
</tbody></table>`},
{id:'colors',title:'Kolory żył',html:`
<table class="helptable"><thead><tr><th>Żyła</th><th>Kolor wg PN-EN 60445</th><th>W programie</th></tr></thead><tbody>
<tr><td>L1</td><td>brązowy</td><td><span class="sw" style="background:#7b523c"></span> brązowy</td></tr>
<tr><td>L2</td><td>czarny</td><td><span class="sw" style="background:#303e46"></span> czarny</td></tr>
<tr><td>L3</td><td>szary</td><td><span class="sw" style="background:#d23a2f"></span> czerwony – dla czytelności na planszy</td></tr>
<tr><td>N</td><td>niebieski</td><td><span class="sw" style="background:#2f8cc6"></span> niebieski</td></tr>
<tr><td>PE</td><td>zielono-żółty</td><td><span class="sw" style="background:#61a33a"></span> zielony</td></tr>
<tr><td>PEN</td><td>zielono-żółty z niebieskimi końcami (lub odwrotnie)</td><td><span class="sw" style="background:#2f7f6a"></span> zielono-niebieski</td></tr>
</tbody></table>`},
{id:'wlz',title:'WLZ i złączki Al/Cu',html:`
<ul>
<li>WLZ to przewód od złącza (licznika) do rozdzielnicy. W programie rysuje się jako przewód wchodzący do obudowy od dołu lub od góry; jego żyły są zaciskami, z których prowadzisz przewody.</li>
<li>Liczba żył: 5 (L1 L2 L3 N PE – TN-S), 4 (L1 L2 L3 PEN – rozdział w rozdzielnicy), 3 (L N PE), 2 (L PEN).</li>
<li>Gdy WLZ jest na planszy, to on zasila rozdzielnicę – wyłącznik główny trzeba do niego podłączyć.</li>
<li><b>Aluminium</b>: żył Al nie łącz bezpośrednio z zaciskami przeznaczonymi tylko do miedzi. Użyj złączek przejściowych Al/Cu albo aparatów z zaciskami dopuszczonymi do Al. Program ostrzega o żyle Al podłączonej wprost do aparatu.</li>
<li>Obliczenia WLZ: obciążalność wobec zabezpieczenia przedlicznikowego (tylko Cu 1,5–16 mm²) i spadek napięcia doliczany do obwodów.</li>
</ul>`},
{id:'rcd',title:'Grupy RCD i przewód N',html:`
<ul>
<li>Każda grupa RCD potrzebuje <b>własnej listwy N</b> zasilanej z dolnego zacisku N swojego RCD.</li>
<li>N obwodu musi wracać do tej samej grupy RCD, przez którą idzie jego faza – inaczej RCD zadziała przy obciążeniu.</li>
<li>Dwie grupy RCD nie mogą mieć wspólnego N za wyłącznikami.</li>
<li>W tabeli obwodów wskaż „Listwę N” obwodu – wtedy program sprawdzi powrót N.</li>
<li>Tryb RCBO w kreatorze daje każdemu obwodowi 1-fazowemu własny wyłącznik różnicowo-nadprądowy.</li>
</ul>`},
{id:'subboards',title:'Podrozdzielnice',html:`
<ol>
<li>W rozdzielnicy głównej kliknij <b>„＋ Podrozdzielnica”</b> w pasku nad katalogiem. Wybierz obwód, z którego będzie zasilana, albo utwórz nowy obwód zasilający.</li>
<li>Podrozdzielnica to osobny projekt; pasek „Rozdzielnice w projekcie” przełącza między nimi.</li>
<li>W rozdzielnicy głównej uzupełnij dla obwodu zasilającego aparat, przewód, długość i sposób ułożenia – to on jest „WLZ” podrozdzielnicy.</li>
<li>Moc obwodu zasilającego sumuje się automatycznie z obwodów podrozdzielnicy (bez współczynnika jednoczesności).</li>
<li>Spadek napięcia obwodów podrozdzielnicy jest liczony od złącza: WLZ + obwód zasilający + obwód końcowy.</li>
<li>Przy układzie TN-C-S podrozdzielnica dostaje układ TN-S – za punktem rozdziału PEN N i PE już się nie łączą.</li>
</ol>`},
{id:'meterbox',title:'Skrzynka licznikowa',html:`
<ol>
<li>Kliknij puste miejsce planszy i w panelu projektu wybierz <b>„＋ Dodaj skrzynkę licznikową”</b>. Pojawi się obok rozdzielnicy (położenie: po prawej lub po lewej) z licznikiem OSD 3-fazowym, przyłączem ze złącza i wyjściem WLZ.</li>
<li>Na szynę skrzynki (9 lub 12 modułów) przeciągnij zabezpieczenie przedlicznikowe, np. rozłącznik bezpiecznikowy 3P albo wyłącznik.</li>
<li>Połącz: przyłącze → zabezpieczenie → licznik (górne zaciski) → licznik (dolne zaciski) → wyjście WLZ. Wyjście WLZ jest połączone z przewodem WLZ wchodzącym do rozdzielnicy – dalej żyły WLZ do wyłącznika głównego.</li>
<li>Liczbę żył przyłącza ustawiasz w jego panelu (np. 4 żyły z PEN), a WLZ – w parametrach sieci.</li>
</ol>
<p class="muted">Rozmieszczenie w skrzynce i typ licznika określa OSD w warunkach przyłączenia.</p>`},
{id:'gen',title:'Agregat i przełącznik 1-0-2',html:`
<ol>
<li>Dodaj <b>„Drugie źródło: agregat / falownik”</b> z katalogu (Zasilanie) – rysuje się jako drugi przewód wchodzący do obudowy. Ustaw liczbę żył w jego panelu.</li>
<li>Dodaj <b>przełącznik 1-0-2</b>. Sieć podłącz do zacisków <b>I</b>, źródło 2 do zacisków <b>II</b>, a odbiory zasilaj z zacisków wspólnych (górnych).</li>
<li>Kliknij przełącznik – w panelu zobaczysz, które obwody są zasilane w położeniu I (z sieci), a które w położeniu II (ze źródła 2) i co zostaje bez zasilania. Ta sama tabela jest na wydruku.</li>
<li>Program zgłasza błąd, gdy przewody sieci i źródła 2 gdziekolwiek się spotykają (np. ominięcie przełącznika), oraz informuje o wspólnym N.</li>
</ol>
<p class="muted">Program nie dobiera agregatu ani nie sprawdza warunków ochrony przy zasilaniu z agregatu (uziemienie, impedancja pętli) – to wymaga projektu.</p>`},
{id:'docs',title:'Dokumenty i pomiary',html:`
<ul>
<li><b>Dokumentacja projektu</b> – arkusz A4 do druku lub PDF.</li>
<li><b>Opisy na drzwiczki</b> – paski w skali 1:1 (18 mm na moduł) z oznaczeniem aparatu i nazwami obwodów. Drukuj w skali 100%; przy aparatach 17,5 mm ustaw 97%.</li>
<li><b>Protokół pomiarów</b> – wpisz zmierzone Zs, Riso, czas i prąd zadziałania RCD; program porówna je z warunkami: Zs ≤ U0/Ia (Ia = 5·In dla B, 10·In dla C, 20·In dla D), Riso ≥ 1 MΩ przy 500 V DC, RCD ogólnego typu t ≤ 300 ms przy IΔn i prąd zadziałania 0,5–1,0 IΔn. Wartości zapisują się w projekcie.</li>
<li><b>Lista zakupów</b> – jednakowe aparaty zsumowane, obudowa, zaślepki na wolne miejsca, metry przewodów (+10%), linka do połączeń w rozdzielnicy w kolorach żył (szacunkowo 0,3 m na odcinek). Do druku z polem do odhaczania albo jako CSV; można objąć cały projekt z podrozdzielnicami.</li>
<li><b>Zestawienie materiałów CSV</b> – otwiera się w Excelu; długości przewodów pochodzą z tabeli obwodów (+10% zapasu), więc uzupełnij tam długości.</li>
</ul>
<p class="muted">Protokół w programie to formularz pomocniczy – pełne sprawdzenie odbiorcze obejmuje też oględziny, ciągłość przewodów ochronnych, kolejność faz i próby działania.</p>`},
{id:'calc',title:'Co program liczy',html:`
<ul>
<li><b>Obciążalność</b>: In ≤ Iz dla przewodów Cu PVC w temperaturze 30 °C (PN-HD 60364-5-52, tabele B.52.2 i B.52.4) – bez współczynników grupowania i temperatury.</li>
<li><b>Spadek napięcia</b> od złącza: obwód + WLZ, limit 3 % dla oświetlenia i 5 % dla pozostałych (wartości informacyjne).</li>
<li><b>Topologia</b>: zwarcia, PE pod napięciem, obejście RCD, wspólny N, N–PE poza punktem rozdziału, bilans faz.</li>
<li><b>Impedancja pętli (przewidywana)</b>: po wpisaniu Zs w złączu program dolicza WLZ i przewody obwodów i sprawdza Zs ≤ U0/Ia (B: 5·In, C: 10·In, D: 20·In). Uproszczenie: rezystancja w ok. 20 °C, bez reaktancji – wynik do porównania z pomiarem, nie zamiast niego.</li>
<li><b>Wybiórczość (uproszczona)</b>: ostrzeżenie, gdy zabezpieczenie niżej ma prąd znamionowy równy lub większy niż zabezpieczenie powyżej. Pełna wybiórczość wymaga tabel producenta.</li>
<li><b>Obudowa</b>: zajęte moduły i zalecany rozmiar z ok. 20% rezerwy (zalecenie praktyczne, nie wymóg normy).</li>
<li><b>Gniazda modułowe</b>: czy są zasilane i chronione przez RCD. Styczniki, przekaźniki i zegary przewodzą tylko, gdy są załączone (dźwignia); ich cewki nie są modelowane.</li>
<li>Program <b>nie</b> sprawdza selektywności, prądów zwarciowych, impedancji pętli ani doboru do konkretnego producenta. To narzędzie pomocnicze – nie zastępuje projektu ani pomiarów.</li>
</ul>`}
];
root.DINHelp={TOPICS};
})(typeof window!=='undefined'?window:globalThis);
