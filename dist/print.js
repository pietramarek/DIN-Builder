// Printable project sheet (A4 landscape). The browser's print dialog saves it as PDF; no external libraries.
(function(root){
const {TYPES,BUSBARS,exampleName,dims,ports,getPort,validate}=root.DIN;
const {analyze}=root.DINTopology;
const calcFor=s=>new Map(root.DINCalc.analyzeCircuits(s).results.map(r=>[r.id,r]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kw=w=>(w/1000).toLocaleString('pl-PL',{maximumFractionDigits:2})+' kW';
const PRINT_WIDTH=1040; // ~277 mm printable width of A4 landscape at 96 dpi

function boardSnapshot(){
 const src=document.getElementById('board');if(!src)return'';
 const clone=src.cloneNode(true);clone.removeAttribute('id');clone.classList.add('print-board');
 clone.querySelectorAll('[id]').forEach(el=>{el.classList.add('pv-'+el.id);el.removeAttribute('id')}); // no duplicate ids in the document
 clone.querySelectorAll('.selected,.pending').forEach(el=>el.classList.remove('selected','pending'));
 clone.querySelectorAll('button').forEach(b=>{b.setAttribute('tabindex','-1');b.removeAttribute('title')});
 clone.querySelectorAll('.railbtn,.bustag').forEach(el=>el.remove());
 const w=parseFloat(src.style.width)||src.offsetWidth;
 clone.style.zoom=String(Math.min(1,PRINT_WIDTH/w));
 return clone.outerHTML;
}
function materials(s){
 const rows=root.DINDocs.materialRows(s);
 return rows.map(r=>`<tr><td>${esc(r.qty===''?'—':String(r.qty).replace('.',','))} ${esc(r.unit)}</td><td>${esc(r.name)}</td><td>${esc(r.params)}</td><td>${esc(r.where)}</td><td class="ex">${esc(r.example)}</td></tr>`).join('')||'<tr><td colspan="5">Brak elementów.</td></tr>';
}
// Door label strips at 1:1 scale (18 mm per module), split to fit the A4 landscape width.
const MODULE_MM=18;
function labels(s){
 const segs=root.DINDocs.labelSegments(s,15);
 const strips=segs.map(g=>`<div class="lblhead">Rząd ${g.row+1} · moduły ${g.from+1}–${g.to}</div><div class="lblrow" style="width:${(g.to-g.from)*MODULE_MM}mm">${g.cells.map(c=>`<div class="lblcell" style="left:${c.offset*MODULE_MM}mm;width:${c.width*MODULE_MM}mm"><b>${esc(c.title)}</b><span>${esc(c.text)}</span></div>`).join('')}</div>`).join('');
 return `<div class="ph"><div><h1>Opisy na drzwiczki – ${esc(s.name)}</h1><p>Skala 1:1, ${MODULE_MM} mm na moduł. Drukuj w skali 100% (bez dopasowania do strony). Dla aparatów 17,5 mm wydrukuj w skali 97%.</p></div><div class="brand">DIN Builder</div></div>${strips||'<p>Brak aparatów na szynach.</p>'}`;
}
// Measurement protocol sheet: header, circuits (loop impedance, insulation), RCD tests, signatures.
function protocol(s){
 const P=root.DINDocs.protocolRows(s),p=s.protocol||{},n=v=>v==null?'':String(Math.round(v*100)/100).replace('.',','),mk=v=>v===true?'<b class="okm">TAK</b>':v===false?'<b class="failm">NIE</b>':'';
 const head=[['Obiekt',p.object],['Adres',p.address],['Wykonał',p.by],['Przyrząd (typ, nr)',p.instrument],['Data pomiarów',p.date],['Układ sieci',s.network?.system]].map(([k,v])=>`<div><span>${k}</span><b>${esc(v||'')}</b></div>`).join('');
 const cr=P.circuits.map(r=>`<tr><td>${r.nr}</td><td>${esc(r.name)}</td><td>${esc(r.device)} ${esc(r.rating)}</td><td class="num">${n(r.Ia)}</td><td class="num">${n(r.zsMax)}</td><td class="num">${n(r.zs)}</td><td>${mk(r.zsOk)}</td><td class="num">${n(r.riso)}</td><td>${mk(r.risoOk)}</td></tr>`).join('')||'<tr><td colspan="9">Brak obwodów.</td></tr>';
 const rr=P.rcds.map(r=>`<tr><td>${esc(r.label)}</td><td>${esc(r.rating)}</td><td class="num">${n(r.idn)}</td><td class="num">${n(r.t)}</td><td>${mk(r.tOk)}</td><td class="num">${n(r.i)}</td><td>${mk(r.iOk)}</td></tr>`).join('')||'<tr><td colspan="7">Brak wyłączników różnicowoprądowych.</td></tr>';
 const sm=P.summary;
 return `<div class="ph"><div><h1>Protokół z pomiarów – ${esc(s.name)}</h1><p>Wynik: zmierzono ${sm.measured} z ${sm.total} wartości, niespełnionych warunków: ${sm.failed}.</p></div><div class="brand">DIN Builder</div></div>
<div class="prothead">${head}</div>
<section class="psec"><h2>Impedancja pętli zwarcia i rezystancja izolacji</h2><table><thead><tr><th>Nr</th><th>Obwód</th><th>Zabezpieczenie</th><th>Ia [A]</th><th>Zs dop. [Ω]</th><th>Zs zm. [Ω]</th><th>Zs ok</th><th>Riso [MΩ]</th><th>Riso ok</th></tr></thead><tbody>${cr}</tbody></table>
<p class="bal">Zs dop. = U0 / Ia, U0 = 230 V, Ia = 5·In (B), 10·In (C), 20·In (D) – PN-HD 60364-4-41, 411.4.4; wartość bez współczynników korekcyjnych. Riso ≥ 1 MΩ przy napięciu probierczym 500 V DC – PN-HD 60364-6, tab. 6.1.${s.network?.system==='TT'?' Układ TT: oceń też warunek RA × IΔn ≤ 50 V dla uziomu.':''}</p></section>
<section class="psec"><h2>Wyłączniki różnicowoprądowe</h2><table><thead><tr><th>Aparat</th><th>Parametry</th><th>IΔn [mA]</th><th>t przy IΔn [ms]</th><th>t ok</th><th>IΔ zadziałania [mA]</th><th>IΔ ok</th></tr></thead><tbody>${rr}</tbody></table>
<p class="bal">Wyłącznik ogólnego typu: t ≤ 300 ms przy IΔn, prąd zadziałania 0,5–1,0 IΔn (PN-EN 61008-1 / 61009-1). Wyłączniki selektywne (S) mają inne granice czasu.</p></section>
${p.notes?`<section class="psec"><h2>Uwagi</h2><p>${esc(p.notes)}</p></section>`:''}
<div class="signs"><div>Data i podpis wykonującego pomiary</div><div>Nr uprawnień</div></div>
<div class="pfoot">Formularz pomocniczy z prototypu DIN Builder. Ocena dotyczy tylko wpisanych wartości i podanych warunków; nie zastępuje pełnego protokołu odbiorczego (oględziny, ciągłość przewodów, kolejność faz, próby funkcjonalne).</div>`;
}
function render(s){
 const t=analyze(s),byId=new Map(s.components.map(c=>[c.id,c])),info=new Map(t.circuits.map(c=>[c.id,c])),calc=calcFor(s),cx=r=>!r?'—':[r.Iz!=null?`Iz ${r.Iz} A${r.In!=null?(r.In<=r.Iz?' ≥ ':' < ')+'In '+r.In+' A':''}`:'Iz ?',r.dU!=null?`ΔU ${(r.dUtotal??r.dU).toFixed(2).replace('.',',')}%${r.dUw!=null?' (z WLZ)':''}`:'ΔU ?'].join(' · ');
 const d=dims(s),issues=[...validate(s),...t.issues].filter(i=>!i.free),errs=issues.filter(i=>i.severity==='error');
 const net=s.network||{},netTxt=[net.system?'układ '+net.system:'układ sieci: brak danych',net.supply==='1F'?'zasilanie 1-fazowe':net.supply==='3F'?'zasilanie 3-fazowe':'liczba faz: brak danych',net.mainFuse?'zabezpieczenie przedlicznikowe '+net.mainFuse:'zabezpieczenie przedlicznikowe: brak danych',net.wlz?.cable?'WLZ '+net.wlz.cable+(net.wlz.material?' '+net.wlz.material:'')+(net.wlz.cores?', '+net.wlz.cores+' żył':'')+(net.wlz.length?', '+net.wlz.length+' m':''):'WLZ: brak danych'].join(' · ');
 const label=e=>{const c=byId.get(e.device),p=getPort(s,e);return c?esc(c.label)+' / '+(p.side==='t'?'góra ':'dół ')+esc(p.role):'?'};
 const circuits=s.circuits.map((c,i)=>{const ci=info.get(c.id)||{},dev=byId.get(c.device),nb=byId.get(c.nBar);return `<tr><td>${i+1}</td><td>${esc(c.name)}</td><td>${dev?esc(dev.label)+' · '+esc(dev.rating):'—'}</td><td>${ci.phase||{partial:'niepełne zasilanie',unpowered:'bez zasilania',off:'wyłączony',short:'zwarcie',nodata:'brak danych'}[ci.status]||'—'}</td><td>${(ci.rcd||[]).map(id=>esc(byId.get(id)?.label)).join(', ')||'—'}</td><td>${dev?.type==='RCBO'?'własny (RCBO)':nb?esc(nb.label):'—'}</td><td>${esc(c.cable)}${c.length?' · '+c.length+' m':''}${c.method?' · '+c.method:''}</td><td class="num">${c.power}</td><td>${cx(calc.get(c.id))}</td></tr>`}).join('')||'<tr><td colspan="9">Brak obwodów.</td></tr>';
 const wires=s.wires.map((w,i)=>`<tr><td>${i+1}</td><td>${label(w.a)}</td><td>${label(w.b)}</td><td>${esc(w.role)}</td><td>${String(w.gauge).replace('.',',')} mm²</td></tr>`).join('')||'<tr><td colspan="5">Brak przewodów.</td></tr>';
 const b=t.balance;
 return `<div class="ph"><div><h1>${esc(s.name)}</h1><p>Rozdzielnica ${d.rows} × ${d.modules} mod. · ${s.components.length} aparatów · ${s.wires.length} przewodów · ${new Date().toLocaleDateString('pl-PL')}</p><p>${esc(netTxt)}</p></div><div class="brand">DIN Builder</div></div>
<section class="psec">${boardSnapshot()}</section>
<section class="psec sldsec"><h2>Schemat jednokreskowy</h2>${root.DINSchematic.svg(s)}</section>
<section class="psec"><h2>Obwody</h2><table><thead><tr><th>Nr</th><th>Nazwa</th><th>Aparat</th><th>Faza</th><th>RCD</th><th>Listwa N</th><th>Przewód</th><th>Moc [W]</th><th>Obliczenia</th></tr></thead><tbody>${circuits}</tbody></table>
<p class="bal">${t.supplied?`Bilans faz (moc zainstalowana, bez współczynnika jednoczesności): L1 ${kw(b.L1)} · L2 ${kw(b.L2)} · L3 ${kw(b.L3)}${b.unknown?` · bez ustalonej fazy ${kw(b.unknown)}`:''}`:'Bilans faz: brak wyłącznika głównego jako punktu zasilania.'}</p></section>
<section class="psec"><h2>Zestawienie materiałów</h2><table><thead><tr><th>Ilość</th><th>Element</th><th>Parametry</th><th>Oznaczenia / położenie</th><th>Przykład handlowy</th></tr></thead><tbody>${materials(s)}</tbody></table></section>
<section class="psec"><h2>Lista połączeń</h2><table><thead><tr><th>Nr</th><th>Od</th><th>Do</th><th>Żyła</th><th>Przekrój</th></tr></thead><tbody>${wires}</tbody></table></section>
<section class="psec"><h2>Wynik kontroli</h2><p>${errs.length?`Wykryto problemy: ${errs.length}.`:'Nie wykryto konfliktów w sprawdzanym zakresie.'} Sprawdzono połączenia, fazy, zwarcia w modelu, grupy RCD, In ≤ Iz (Cu, PVC, 30 °C, bez współczynników – PN-HD 60364-5-52 tab. B.52.2) i spadek napięcia obwodów (zał. G, informacyjny). Nie sprawdzono selektywności, prądów zwarciowych ani impedancji pętli.</p>${issues.length?'<ul>'+issues.map(i=>`<li class="${i.severity}"><b>${esc(i.title)}</b> – ${esc(i.text)}</li>`).join('')+'</ul>':''}</section>
<div class="pfoot">Dokument roboczy z prototypu DIN Builder. Nie potwierdza bezpieczeństwa instalacji, doboru zabezpieczeń ani zgodności z normami. Wygląd i przykładowe nazwy aparatów są poglądowe. Projekt i pomiary wymagają weryfikacji przez osobę z uprawnieniami.</div>`;
}
function show(html){const v=document.getElementById('printView');v.innerHTML=html;root.print()}
function open(s){show(render(s))}
root.addEventListener('afterprint',()=>{const v=document.getElementById('printView');if(v)v.innerHTML=''});
root.DINPrint={render,open,labels,protocol,openLabels:s=>show(labels(s)),openProtocol:s=>show(protocol(s))};
})(window);
