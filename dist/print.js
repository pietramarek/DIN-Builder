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
 const groups=new Map();
 for(const c of s.components){const k=c.type+'|'+c.rating;if(!groups.has(k))groups.set(k,{type:c.type,rating:c.rating,labels:[]});groups.get(k).labels.push(c.label)}
 const rows=[...groups.values()].sort((a,b)=>Object.keys(TYPES).indexOf(a.type)-Object.keys(TYPES).indexOf(b.type)).map(g=>`<tr><td>${g.labels.length}</td><td>${esc(TYPES[g.type].name)} (${TYPES[g.type].width} mod.)</td><td>${esc(g.rating)}</td><td>${esc(g.labels.join(', '))}</td><td class="ex">${esc(exampleName(g.type))}</td></tr>`);
 for(const b of s.busbars||[])rows.push(`<tr><td>1</td><td>${esc(BUSBARS[b.type].name)}</td><td>${b.to-b.from+1} mod.</td><td>rząd ${b.row+1}, moduły ${b.from+1}–${b.to+1}, ${b.side==='t'?'góra':'dół'}</td><td></td></tr>`);
 const wires=new Map();for(const w of s.wires){const k=w.role+' '+w.gauge;wires.set(k,(wires.get(k)||0)+1)}
 for(const[k,n]of wires){const[role,g]=k.split(' ');rows.push(`<tr><td>${n}</td><td>Przewód ${esc(role)}</td><td>${String(g).replace('.',',')} mm²</td><td>odcinki w rozdzielnicy</td><td>długość do ustalenia</td></tr>`)}
 return rows.join('')||'<tr><td colspan="5">Brak elementów.</td></tr>';
}
function render(s){
 const t=analyze(s),byId=new Map(s.components.map(c=>[c.id,c])),info=new Map(t.circuits.map(c=>[c.id,c])),calc=calcFor(s),cx=r=>!r?'—':[r.Iz!=null?`Iz ${r.Iz} A${r.In!=null?(r.In<=r.Iz?' ≥ ':' < ')+'In '+r.In+' A':''}`:'Iz ?',r.dU!=null?`ΔU ${(r.dUtotal??r.dU).toFixed(2).replace('.',',')}%${r.dUw!=null?' (z WLZ)':''}`:'ΔU ?'].join(' · ');
 const d=dims(s),issues=[...validate(s),...t.issues].filter(i=>!i.free),errs=issues.filter(i=>i.severity==='error');
 const net=s.network||{},netTxt=[net.system?'układ '+net.system:'układ sieci: brak danych',net.supply==='1F'?'zasilanie 1-fazowe':net.supply==='3F'?'zasilanie 3-fazowe':'liczba faz: brak danych',net.mainFuse?'zabezpieczenie przedlicznikowe '+net.mainFuse:'zabezpieczenie przedlicznikowe: brak danych',net.wlz?.cable?'WLZ '+net.wlz.cable+(net.wlz.length?', '+net.wlz.length+' m':''):'WLZ: brak danych'].join(' · ');
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
function open(s){const v=document.getElementById('printView');v.innerHTML=render(s);root.print()}
root.addEventListener('afterprint',()=>{const v=document.getElementById('printView');if(v)v.innerHTML=''});
root.DINPrint={render,open};
})(window);
