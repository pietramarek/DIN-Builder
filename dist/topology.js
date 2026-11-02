// Deterministic topology of the board model: which supply conductor reaches which terminal.
// It models conductive paths only (wires, comb busbars, closed devices, N/PE bars). It does not
// compute currents, impedances, cable ampacity or selectivity, and it is not a safety approval.
(function(root){
const M=root.DIN||require('./model.js');
const {TYPES,BUSBARS,BUSBAR_DEVICES,MAIN_TYPES,ports}=M;
const CORES_PEN=n=>(M.CORES[n]||[]).includes('PEN');
const LIVE=['L1','L2','L3'],SOURCES=[...LIVE,'N'],RCD_TYPES=['RCD','RCD2','RCBO'];
const key=(device,port)=>device+':'+port;
const span=c=>[c.slot,c.slot+TYPES[c.type].width-1];
const busbarsOf=s=>Array.isArray(s.busbars)?s.busbars:[];

function underBusbar(s,b){
 const inside=[],partial=[];
 for(const c of s.components){if(c.row!==b.row)continue;const[a,z]=span(c);if(z<b.from||a>b.to)continue;(a>=b.from&&z<=b.to?inside:partial).push(c);}
 return{inside,partial};
}
// Pin k of a 3P comb sits at module offset k (mod 3); the device is fed by the pin at its first module.
function busbarLinks(s,b){
 const out=[];
 for(const c of underBusbar(s,b).inside){if(!BUSBAR_DEVICES.includes(c.type))continue;for(const p of ports(c).filter(p=>p.side===b.side&&p.role==='L')){const pin=BUSBARS[b.type].pins===3?(c.slot+p.i-b.from)%3:0;out.push({port:key(c.id,p.key),node:'bb:'+b.id+':'+pin,pin,device:c.id})}}
 return out;
}
function edges(s){
 const E=[];
 for(const c of s.components){
  const ps=ports(c);
  if(TYPES[c.type].bar){const first=new Map();for(const p of ps){if(!first.has(p.role))first.set(p.role,p);else E.push({a:key(c.id,first.get(p.role).key),b:key(c.id,p.key),kind:'bar'})}if(TYPES[c.type].penBridge&&first.has('PE')&&first.has('N'))E.push({a:key(c.id,first.get('PE').key),b:key(c.id,first.get('N').key),kind:'bar'});continue;}
  if(TYPES[c.type].changeover){const pos=c.pos||0;if(pos)for(const p of ps.filter(p=>p.side==='t')){const q=ps.find(x=>x.side==='b'&&x.i===2*p.i+pos-1);if(q)E.push({a:key(c.id,p.key),b:key(c.id,q.key),kind:'device',device:c.id,type:c.type})}continue;}
  if(TYPES[c.type].noThrough||!c.on)continue; // SPD and loads are not series conductors; an open device breaks the path
  for(const p of ps.filter(p=>p.side==='t')){const q=ps.find(x=>x.side==='b'&&x.i===p.i);if(q)E.push({a:key(c.id,p.key),b:key(c.id,q.key),kind:'device',device:c.id,type:c.type});}
 }
 for(const w of s.wires)E.push({a:key(w.a.device,w.a.port),b:key(w.b.device,w.b.port),kind:'wire',wire:w.id});
 for(const b of busbarsOf(s))for(const l of busbarLinks(s,b))E.push({a:l.port,b:l.node,kind:'busbar',busbar:b.id});
 return E;
}
function adjacency(E){const adj=new Map(),add=(x,y)=>{if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y)};for(const e of E){add(e.a,e.b);add(e.b,e.a)}return adj}
function reach(adj,starts){const seen=new Set(starts),stack=[...starts];while(stack.length){const n=stack.pop();for(const m of adj.get(n)||[])if(!seen.has(m)){seen.add(m);stack.push(m)}}return seen}
function components(E){const adj=adjacency(E),comp=new Map();let id=0;for(const n of adj.keys()){if(comp.has(n))continue;for(const m of reach(adj,[n]))comp.set(m,id);id++}return comp}
const sameComp=(comp,a,b)=>comp.has(a)&&comp.get(a)===comp.get(b);

function analyze(s){
 const issues=[],E=edges(s),mains=s.components.filter(c=>MAIN_TYPES.includes(c.type)),wlzs=s.components.filter(c=>c.type==='WLZ'),gens=s.components.filter(c=>c.type==='GEN'),net=s.network||{},byId=new Map(s.components.map(c=>[c.id,c]));
 const res={supplied:mains.length>0||wlzs.length>0,circuits:[],balance:{L1:0,L2:0,L3:0,unknown:0,total:0},issues,phaseOf:new Map()};
 const roleOf=node=>{const[d,p]=node.split(':');const c=byId.get(d);return c&&ports(c).find(x=>x.key===p)?.role};
 const label=node=>{const[d,p]=node.split(':');const c=byId.get(d);const pt=c&&ports(c).find(x=>x.key===p);return c?c.label+' / '+(pt.side==='t'?'góra ':'dół ')+pt.role:node};

 // Busbar placement (independent of supply)
 const bb=busbarsOf(s);
 for(const b of bb){
  const{inside,partial}=underBusbar(s,b),name=BUSBARS[b.type].short+' rząd '+(b.row+1)+', moduły '+(b.from+1)+'–'+(b.to+1);
  for(const c of partial)issues.push({severity:'error',busbar:b.id,device:c.id,title:'Szyna kończy się w połowie aparatu',text:`Szyna ${name} zachodzi częściowo na ${c.label}. Ustaw zakres na pełne aparaty.`});
  for(const c of inside)if(!BUSBAR_DEVICES.includes(c.type))issues.push({severity:'error',busbar:b.id,device:c.id,title:'Aparat nie pasuje do szyny grzebieniowej',text:`${c.label} (${TYPES[c.type].short}) leży pod szyną ${name}. Model łączy szyną tylko zaciski L wyłączników MCB i RCBO.`});
  if(!inside.some(c=>BUSBAR_DEVICES.includes(c.type)))issues.push({severity:'warn',busbar:b.id,title:'Szyna bez aparatów',text:`Szyna ${name} nie łączy żadnego wyłącznika.`});
  for(const o of bb)if(o.id<b.id&&o.row===b.row&&o.side===b.side&&o.from<=b.to&&b.from<=o.to)issues.push({severity:'error',busbar:b.id,title:'Nakładające się szyny',text:`Dwie szyny po tej samej stronie rzędu ${b.row+1} zachodzą na siebie.`});
 }

 if(!mains.length&&!wlzs.length){
  issues.push({severity:'info',title:'Brak punktu zasilania – nie sprawdzono topologii',text:'Dodaj wprowadzenie WLZ albo wyłącznik główny (FR). Zaciski WLZ (a bez WLZ górne zaciski FR) są w modelu zasilaniem L1, L2, L3 i N. Bez tego faz, zwarć, grup RCD ani bilansu nie sprawdzono.'});
  for(const c of s.circuits){res.circuits.push({id:c.id,status:'nodata',phase:null,rcd:[]});res.balance.unknown+=c.power;res.balance.total+=c.power}
  return res;
 }

 // A single-pole main switch terminal 'L' is the L1 source; a 1-phase supply energises only L1 and N.
 // With a WLZ entry on the board, its cores are the source (PEN carries N) and the main switch must be wired from it.
 const starts=l=>(wlzs.length?wlzs.flatMap(m=>ports(m).filter(p=>p.role===l||(l==='L1'&&p.role==='L')||(l==='N'&&p.role==='PEN')).map(p=>key(m.id,p.key))):mains.flatMap(m=>ports(m).filter(p=>p.side==='t'&&(p.role===l||(l==='L1'&&p.role==='L'))).map(p=>key(m.id,p.key))));
 for(const wz of wlzs){const n=wz.cores||5,sys=net.system,mat=net.wlz?.material;
  if(net.supply==='1F'&&n>=4)issues.push({severity:'warn',device:wz.id,title:'WLZ 3-fazowy przy zasilaniu 1-fazowym',text:`${wz.label} ma ${n} żył (L1, L2, L3…), a w parametrach sieci zasilanie jest 1-fazowe. Model zasila tylko L1 i N.`});
  if(net.supply==='3F'&&n<=3)issues.push({severity:'warn',device:wz.id,title:'WLZ 1-fazowy przy zasilaniu 3-fazowym',text:`${wz.label} ma ${n} żyły (L, N/PEN…), a zasilanie jest 3-fazowe. Sprawdź liczbę żył WLZ.`});
  if(CORES_PEN(n)&&['TN-S','TT','IT'].includes(sys))issues.push({severity:'error',device:wz.id,title:'Żyła PEN w układzie '+sys,text:`${wz.label} ma żyłę PEN (${n} żył), a układ sieci to ${sys}. W ${sys} nie ma przewodu PEN – przewód ochronny i neutralny są osobne${sys==='IT'?' (w IT N często nie jest rozprowadzany)':''}. Sprawdź przewód albo układ sieci.`});
  if(!CORES_PEN(n)&&sys==='TN-C')issues.push({severity:'info',device:wz.id,title:'WLZ z osobnymi N i PE w układzie TN-C',text:`${wz.label} ma osobne żyły N i PE, a układ sieci to TN-C. Jeśli rozdział PEN jest przed rozdzielnicą, instalacja jest w układzie TN-C-S – popraw układ sieci.`});
  if(mat==='Al'){const direct=s.wires.filter(w=>(w.a.device===wz.id||w.b.device===wz.id)&&byId.get(w.a.device===wz.id?w.b.device:w.a.device)?.type!=='ALCU');if(direct.length)issues.push({severity:'warn',device:wz.id,title:'Przewód Al bez złączki Al/Cu',text:`${direct.length} ${direct.length===1?'żyła':'żył'} aluminiowego WLZ ${direct.length===1?'idzie':'idą'} wprost do zacisku miedzianego. Zastosuj złączki przejściowe Al/Cu albo aparaty z zaciskami dopuszczonymi do Al.`})}
  else if(mat==='Cu'&&s.wires.some(w=>(w.a.device===wz.id&&byId.get(w.b.device)?.type==='ALCU')||(w.b.device===wz.id&&byId.get(w.a.device)?.type==='ALCU')))issues.push({severity:'info',device:wz.id,title:'Złączka Al/Cu przy miedzianym WLZ',text:'W parametrach sieci WLZ jest miedziany – złączka przejściowa Al/Cu nie jest potrzebna.'});
 }
 {const penToN=s.wires.filter(w=>w.role==='PEN'&&[roleOf(key(w.a.device,w.a.port)),roleOf(key(w.b.device,w.b.port))].sort().join()==='N,PEN');if(penToN.length)issues.push({severity:'warn',device:penToN[0].a.device,title:'PEN podłączony do zacisku N',text:'Żyła PEN powinna dochodzić najpierw do zacisku lub szyny PE, a dopiero stamtąd mostek do N (PN-HD 60364-5-54, 543.4). Użyj złączki rozdziału PEN: PEN → zacisk PE, zacisk N → wyłącznik główny.'})}
 if(wlzs.length&&!net.wlz?.material)issues.push({severity:'info',title:'Brak danych: materiał WLZ',text:'Nie podano, czy WLZ jest miedziany czy aluminiowy, więc nie sprawdzono potrzeby złączek Al/Cu.'});
 const active=net.supply==='1F'?['L1','N']:SOURCES;
 if(!net.supply)issues.push({severity:'info',title:'Brak danych: liczba faz zasilania',text:'Nie podano, czy zasilanie jest 1- czy 3-fazowe. Model przyjął napięcie na wszystkich fazowych zaciskach wyłącznika głównego. Uzupełnij w parametrach sieci.'});
 if(!net.system)issues.push({severity:'info',title:'Brak danych: układ sieci',text:'Nie podano układu sieci (TN-S, TN-C-S, TN-C, TT, IT), więc połączenia N z PE oceniono jako wymagające sprawdzenia.'});
 if(net.supply==='1F'&&mains.some(m=>m.type==='MAIN'))issues.push({severity:'info',title:'Zasilanie 1-fazowe',text:'Zaciski L2 i L3 wyłącznika głównego są w modelu bez napięcia.'});
 if(net.supply==='3F'&&mains.every(m=>m.type==='MAIN2'))issues.push({severity:'warn',title:'Wyłącznik główny 1P+N przy zasilaniu 3-fazowym',text:'Model przyjmuje, że wyłącznik 1P+N jest na fazie L1. Sprawdź, czy rozdzielnica nie potrzebuje wyłącznika 4P.'});
 const supply=(list,st=starts,act=active)=>{const adj=adjacency(list),map=new Map();for(const l of act)for(const n of reach(adj,st(l))){if(!map.has(n))map.set(n,new Set());map.get(n).add(l)}return map};
 // Second source: its own phases, kept apart from the grid; any meeting of the two is reported.
 const genStarts=l=>gens.flatMap(m=>ports(m).filter(p=>p.role===l||(l==='L1'&&p.role==='L')||(l==='N'&&p.role==='PEN')).map(p=>key(m.id,p.key)));
 const full=supply(E),genMap=gens.length?supply(E,genStarts,SOURCES):new Map();
 if(gens.length){let shownL=false,shownN=false,shownS=false;
  for(const[n,set]of genMap){if(n.startsWith('bb:'))continue;const g=full.get(n),live=[...set].some(l=>LIVE.includes(l));
   if(!shownS&&(set.size>1&&live||roleOf(n)==='PE'&&live)){shownS=true;issues.push({severity:'error',device:n.split(':')[0],title:'Zwarcie w obwodzie drugiego źródła',text:`Przewody drugiego źródła (${[...set].join(', ')}) łączą się ze sobą${roleOf(n)==='PE'?' lub z PE':''} przy ${label(n)}.`})}
   if(!g)continue;const anyLive=live||[...g].some(l=>LIVE.includes(l));
   if(anyLive&&!shownL){shownL=true;issues.push({severity:'error',device:n.split(':')[0],title:'Sieć połączona z drugim źródłem',text:`Przewody sieci i drugiego źródła (agregatu / falownika) spotykają się przy ${label(n)}. Źródła muszą być rozdzielone przełącznikiem 1-0-2 albo automatyką SZR – inaczej grozi zwarcie i podanie napięcia do sieci.`})}
   else if(!anyLive&&!shownN&&set.has('N')&&g.has('N')){shownN=true;issues.push({severity:'info',device:n.split(':')[0],title:'Wspólny N sieci i drugiego źródła',text:`N sieci i drugiego źródła są połączone (np. przy ${label(n)}). Zwykle przełącza się także N (przełącznik 4P lub 1P+N); wspólny N jest dopuszczalny tylko przy rozwiązaniu przewidzianym w projekcie.`})}}}

 // Shorts and live PE
 const seenShort=new Set();let livePE=false,nOnPE=null;
 for(const[node,set]of full){
  if(node.startsWith('bb:'))continue;
  if(set.size>1){const sig=[...set].sort().join('+');if(!seenShort.has(sig)){seenShort.add(sig);issues.push({severity:'error',device:node.split(':')[0],title:'Zwarcie w modelu: '+[...set].join(' z '),text:`Połączone ze sobą: ${[...set].join(', ')} (np. przy ${label(node)}). Po załączeniu oznacza to zwarcie. Sprawdź przewody i szyny.`})}}
  if(roleOf(node)==='PE'&&set.size){const live=[...set].filter(l=>LIVE.includes(l));if(live.length&&!livePE){livePE=true;issues.push({severity:'error',device:node.split(':')[0],title:'PE pod napięciem w modelu',text:`${label(node)} jest połączony z ${live.join(', ')}. Przewód ochronny nie może łączyć się z przewodem fazowym.`})}else if(!live.length&&!nOnPE)nOnPE=node}
 }

 // N joined to PE: legitimate only as the PEN split point in TN-C-S.
 if(nOnPE&&(net.system==='TN-C-S'||!net.system)){const viaMain=supply(E.filter(e=>!(e.kind==='device'&&MAIN_TYPES.includes(e.type))));if(!viaMain.get(nOnPE)?.has('N'))issues.push({severity:'error',device:nOnPE.split(':')[0],title:'Rozdział PEN za wyłącznikiem głównym',text:`N łączy się z PE (np. przy ${label(nOnPE)}) dopiero za stykami wyłącznika głównego. PEN nie może być przerywany ani przełączany (PN-HD 60364-4-46) – punkt rozdziału musi być przed wyłącznikiem głównym.`})}
 if(nOnPE){const dev=nOnPE.split(':')[0];if(net.system==='TN-C')issues.push({severity:'info',device:dev,title:'N i PE połączone (TN-C)',text:`W układzie TN-C przewód neutralny i ochronny to jeden przewód PEN, więc połączenie N z PE (np. przy ${label(nOnPE)}) jest zgodne z tym układem.`});else if(net.system==='TN-C-S')issues.push({severity:'info',device:dev,title:'Rozdział PEN w rozdzielnicy (TN-C-S)',text:`N i PE są połączone (np. przy ${label(nOnPE)}). W układzie TN-C-S to punkt rozdziału PEN; za nim N i PE nie mogą się ponownie łączyć.`});else if(net.system)issues.push({severity:'error',device:dev,title:'Połączenie N z PE w układzie '+net.system,text:`N i PE są połączone (np. przy ${label(nOnPE)}). W układzie ${net.system} rozdzielnica nie powinna łączyć N z PE.`});else issues.push({severity:'warn',device:dev,title:'Połączenie N z PE – sprawdź układ sieci',text:`N i PE są połączone (np. przy ${label(nOnPE)}). Dopuszczalne tylko w punkcie rozdziału PEN w układzie TN-C-S.`})}
 // Changeover 1-0-2: outputs I and II of a pole must never meet outside the switch, otherwise both sources are joined.
 for(const c of s.components.filter(c=>TYPES[c.type].changeover)){const comp=components(E.filter(e=>e.device!==c.id));
  for(let i=0;i<TYPES[c.type].poles.length;i++){if(sameComp(comp,key(c.id,'b'+2*i),key(c.id,'b'+(2*i+1)))){issues.push({severity:'error',device:c.id,title:'Obejście przełącznika 1-0-2: '+c.label,text:`Zaciski I i II bieguna ${TYPES[c.type].poles[i]} są połączone poza przełącznikiem. Dwa źródła (np. sieć i agregat) połączyłyby się ze sobą.`});break}}
  if(!c.pos)issues.push({severity:'info',device:c.id,title:'Przełącznik w położeniu 0: '+c.label,text:'Za przełącznikiem nie ma napięcia w modelu. Zmień położenie na I lub II w panelu aparatu.'})}
 // RCD groups: analyse the graph with every residual-current device opened
 const rcds=s.components.filter(c=>RCD_TYPES.includes(c.type));
 if(net.system==='TN-C'&&rcds.length)issues.push({severity:'error',device:rcds[0].id,title:'Wyłącznik różnicowoprądowy w układzie TN-C',text:'W układzie TN-C nie stosuje się urządzeń różnicowoprądowych (PN-HD 60364-4-41, 411.4.5) – przewód PEN przechodziłby przez RCD. Wymagany rozdział PEN przed RCD, czyli przejście na TN-C-S.'});
 if(net.system==='IT')issues.push({severity:'info',title:'Układ IT – zakres kontroli',text:'Model sprawdza tylko połączenia. Nie ocenia kontroli stanu izolacji ani warunków samoczynnego wyłączenia przy drugim zwarciu doziemnym, wymaganych w układzie IT.'});
 const noRcdEdges=E.filter(e=>!(e.kind==='device'&&RCD_TYPES.includes(e.type)));
 const noRcd=supply(noRcdEdges),compNo=components(noRcdEdges),noRcdGen=gens.length?supply(noRcdEdges,genStarts,SOURCES):new Map();
 const portOf=(c,side,role)=>{const p=ports(c).find(p=>p.side===side&&p.role===role);return p&&key(c.id,p.key)};
 for(const r of rcds){
  for(const p of ports(r).filter(p=>p.side==='t')){const t=key(r.id,p.key),b=key(r.id,'b'+p.i);if(sameComp(compNo,t,b))issues.push({severity:'error',device:r.id,title:'Obejście '+TYPES[r.type].short+' '+r.label,text:`Zacisk ${p.role} przed i za ${r.label} jest połączony inną drogą. Prąd ominie wyłącznik różnicowoprądowy.`})}
 }
 for(let i=0;i<rcds.length;i++)for(let j=i+1;j<rcds.length;j++){const a=portOf(rcds[i],'b','N'),b=portOf(rcds[j],'b','N');if(a&&b&&sameComp(compNo,a,b))issues.push({severity:'error',device:rcds[j].id,title:'Wspólny N dla dwóch grup RCD',text:`Przewody N za ${rcds[i].label} i za ${rcds[j].label} są połączone. Każda grupa RCD potrzebuje własnego N, inaczej wyłączniki będą wyzwalać bez usterki.`})}
 const peNodes=[...compNo.keys()].filter(n=>!n.startsWith('bb:')&&roleOf(n)==='PE');
 for(const r of rcds){const bn=portOf(r,'b','N');if(bn&&peNodes.some(pn=>sameComp(compNo,pn,bn)))issues.push({severity:'error',device:r.id,title:'N połączony z PE za '+r.label,text:`Przewód N za ${r.label} łączy się z PE. Prąd wróci przez PE i RCD zadziała; rozdział PEN może być tylko przed RCD.`})}
 const rcdsReaching=(node,phase,gen=false)=>rcds.filter(r=>{const own=E.filter(e=>e.kind==='device'&&e.device===r.id);return supply(noRcdEdges.concat(own),gen?genStarts:starts,gen?SOURCES:active).get(node)?.has(phase)&&!(gen?noRcdGen:noRcd).get(node)?.has(phase)}).map(r=>r.id);

 // Circuits
 for(const ci of s.circuits){
  const d=byId.get(ci.device),row={id:ci.id,status:'unassigned',phase:null,rcd:[]};
  res.balance.total+=ci.power;
  if(!d){res.balance.unknown+=ci.power;res.circuits.push(row);continue}
  // Each pole of a multi-pole breaker is followed separately; power is split evenly over its phases.
  const outs=ports(d).filter(p=>p.side==='b'&&p.role==='L').map(p=>key(d.id,p.key)),out=outs[0],per=outs.map(o=>[...(full.get(o)||[])].filter(l=>LIVE.includes(l)));
  let gen=false;if(gens.length&&per.every(p=>!p.length)){const pg=outs.map(o=>[...(genMap.get(o)||[])].filter(l=>LIVE.includes(l)));if(pg.some(p=>p.length)){per.splice(0,per.length,...pg);gen=true}}row.source=gen?'gen':'grid';
  if(per.some(p=>p.length>1)){row.status='short';res.balance.unknown+=ci.power}
  else if(per.every(p=>!p.length)){row.status=d.on?'unpowered':'off';res.balance.unknown+=ci.power;if(d.on)issues.push({severity:'warn',device:d.id,title:'Obwód bez zasilania: '+ci.name,text:`${d.label} nie jest połączony z fazą ${wlzs.length?'WLZ':'wyłącznika głównego'}${gens.length?' ani drugiego źródła':''} (w modelu).`})}
  else if(per.some(p=>!p.length)){row.status='partial';res.balance.unknown+=ci.power;issues.push({severity:'warn',device:d.id,title:'Niepełne zasilanie: '+ci.name,text:`Nie wszystkie bieguny ${d.label} mają napięcie (w modelu). Odbiornik wielofazowy pracowałby bez jednej fazy.`})}
  else{
   const phases=per.map(p=>p[0]);
   row.status='ok';row.phases=phases;row.phase=phases.join('+');if(gen)res.balance.gen=(res.balance.gen||0)+ci.power;else for(const p of phases)res.balance[p]+=ci.power/phases.length;res.phaseOf.set(ci.id,row.phase);
   if(new Set(phases).size<phases.length)issues.push({severity:'warn',device:d.id,title:'Bieguny na tej samej fazie: '+ci.name,text:`${d.label} ma kilka biegunów zasilanych z ${[...new Set(phases)].join(', ')}. Odbiornik wielofazowy wymaga różnych faz – sprawdź przewody i szynę grzebieniową.`});
   row.rcd=d.type==='RCBO'?[d.id]:outs.map((o,i)=>rcdsReaching(o,phases[i],gen)).reduce((a,b)=>a.filter(x=>b.includes(x)));
   if(!row.rcd.length)issues.push({severity:'warn',device:d.id,title:'Obwód bez ochrony RCD: '+ci.name,text:`Faza ${d.label} nie przechodzi przez wyłącznik różnicowoprądowy. Wiele obwodów w mieszkaniach wymaga ochrony dodatkowej RCD ≤30 mA (PN-HD 60364-4-41) – sprawdź przeznaczenie obwodu.`});
   // N of the circuit must pass the same RCD group as its phase. Reference point: the device's own N pole (MCB 1P+N,
   // 3P+N, RCBO) or, for single-pole devices, the N bar chosen in the circuit list.
   const nPole=ports(d).find(p=>p.side==='t'&&p.role==='N'),nb=!nPole&&ci.nBar&&byId.get(ci.nBar),single=ports(d).filter(p=>p.side==='t').length===1;
   const nNode=nPole?key(d.id,nPole.key):nb?key(nb.id,'t0'):null,nWhere=nPole?`zacisk N ${d.label}`:nb?nb.label:'';
   if(!nNode){if(single&&row.rcd.length)issues.push({severity:'info',device:d.id,title:'Brak danych: listwa N obwodu '+ci.name,text:'Nie wskazano listwy N tego obwodu, więc nie sprawdzono, czy N wraca do tej samej grupy RCD co faza.'})}
   else{
    const topL=ports(d).find(p=>p.side==='t'&&p.role==='L'),up=d.type==='RCBO'?(topL?rcdsReaching(key(d.id,topL.key),phases[0],gen):[]):row.rcd;
    const rcdN=up.map(id=>portOf(byId.get(id),'b','N')).filter(Boolean),anyRcdN=rcds.filter(r=>r.id!==d.id).map(r=>portOf(r,'b','N')).filter(Boolean);
    if(!(gen?genMap:full).get(nNode)?.has('N'))issues.push({severity:'warn',device:nb?nb.id:d.id,title:nb?'Listwa N bez połączenia z N':'Brak N na zacisku N: '+ci.name,text:`${nWhere} (N obwodu ${ci.name}) nie jest połączony z przewodem N zasilania.`});
    else if(up.length&&!rcdN.some(n=>sameComp(compNo,n,nNode)))issues.push({severity:'error',device:nb?nb.id:d.id,title:'N obwodu spoza grupy RCD: '+ci.name,text:`Faza obwodu przechodzi przez ${up.map(id=>byId.get(id).label).join(', ')}, a N (${nWhere}) przychodzi spoza tej grupy. RCD zadziała przy obciążeniu.`});
    else if(!up.length&&anyRcdN.some(n=>sameComp(compNo,n,nNode)))issues.push({severity:'error',device:nb?nb.id:d.id,title:'N obwodu za RCD, faza przed RCD: '+ci.name,text:`N (${nWhere}) wraca przez wyłącznik różnicowoprądowy, a faza go omija. RCD zadziała przy obciążeniu.`});
   }
  }
  res.circuits.push(row);
 }

 // Protective conductor: PE bars and SPD earth terminals must reach a PE source (WLZ PE/PEN core, PEN split block, GSU).
 {const compAll=components(E),peSrc=[...s.components.filter(c=>c.type==='WLZ'||c.type==='GEN').flatMap(c=>ports(c).filter(p=>p.role==='PE'||p.role==='PEN').map(p=>key(c.id,p.key))),...s.components.filter(c=>c.type==='GSU'||TYPES[c.type].penBridge).flatMap(c=>ports(c).filter(p=>p.role==='PE').map(p=>key(c.id,p.key)))];
  const peBars=s.components.filter(c=>TYPES[c.type].bar&&!TYPES[c.type].penBridge&&c.type!=='GSU'&&ports(c).every(p=>p.role==='PE')),spdPE=s.components.filter(c=>TYPES[c.type].spd).map(c=>({c,n:portOf(c,'b','PE')})).filter(x=>x.n);
  if(!peSrc.length){if(peBars.length||spdPE.length)issues.push({severity:'info',title:'Brak danych: źródło przewodu ochronnego',text:'Na planszy nie ma WLZ z żyłą PE/PEN, złączki rozdziału PEN ani GSU, więc nie sprawdzono, czy listwy PE i ograniczniki przepięć są połączone z przewodem ochronnym.'})}
  else{const ok=n=>peSrc.some(p=>sameComp(compAll,p,n));
   for(const b of peBars)if(!ports(b).some(p=>ok(key(b.id,p.key))))issues.push({severity:'warn',device:b.id,title:'Listwa PE bez połączenia z przewodem ochronnym: '+b.label,text:`${b.label} nie jest połączona z żyłą PE/PEN WLZ, złączką rozdziału PEN ani GSU. Przewody ochronne obwodów nie miałyby połączenia z uziemieniem.`});
   for(const x of spdPE)if(!ok(x.n))issues.push({severity:'warn',device:x.c.id,title:'Ogranicznik przepięć bez połączenia z PE: '+x.c.label,text:`Zacisk PE ${x.c.label} nie jest połączony z przewodem ochronnym (listwa PE / GSU). Bez tego SPD nie odprowadzi przepięć.`})}}
 // Modular sockets: an outlet is a final circuit and in dwellings normally needs additional RCD protection.
 for(const g of s.components.filter(c=>TYPES[c.type].socket)){const p=portOf(g,'t','L'),ph=[...(full.get(p)||[])].filter(l=>LIVE.includes(l));
  if(!ph.length)issues.push({severity:'warn',device:g.id,title:'Gniazdo bez zasilania: '+g.label,text:`Zacisk L ${g.label} nie jest połączony z fazą (w modelu).`});
  else if(!rcdsReaching(p,ph[0]).length)issues.push({severity:'warn',device:g.id,title:'Gniazdo bez ochrony RCD: '+g.label,text:`${g.label} jest zasilane z ${ph[0]} z pominięciem wyłącznika różnicowoprądowego. Gniazda wymagają ochrony dodatkowej RCD ≤30 mA (PN-HD 60364-4-41, 411.3.3).`})}
 // RCD rated current: should not be lower than the largest overcurrent device it feeds (simple comparison).
 {const amps=t=>{const m=String(t||'').match(/\b[BCDKZ]\s*(\d+(?:[.,]\d+)?)\b/i)||String(t||'').match(/(\d+(?:[.,]\d+)?)\s*A\b/);return m?Number(m[1].replace(',','.')):null};
  for(const r of rcds.filter(x=>x.type!=='RCBO')){const own=amps(r.rating);if(own==null)continue;const below=res.circuits.filter(c=>c.rcd?.includes(r.id)).map(c=>byId.get(s.circuits.find(x=>x.id===c.id)?.device)).filter(Boolean),mx=Math.max(0,...below.map(d=>amps(d.rating)||0));
   if(mx>own)issues.push({severity:'warn',device:r.id,title:'RCD słabszy niż wyłącznik za nim: '+r.label,text:`${r.label} ma ${own} A, a za nim jest wyłącznik ${mx} A. Prąd znamionowy RCD powinien być co najmniej taki jak największe zabezpieczenie za nim (lub RCD musi być chroniony przed przeciążeniem zabezpieczeniem przed nim) – sprawdź w danych producenta.`})}}
 // Phase balance: reported as information only; there is no single normative limit for a dwelling.
 const assigned=LIVE.map(l=>res.balance[l]),max=Math.max(...assigned),min=Math.min(...assigned);
 if(assigned.filter(v=>v>0).length>1&&max>=3000&&max>2*Math.max(min,1))issues.push({severity:'info',title:'Nierównomierne obciążenie faz',text:`L1 ${Math.round(res.balance.L1)} W · L2 ${Math.round(res.balance.L2)} W · L3 ${Math.round(res.balance.L3)} W (moc zainstalowana z listy obwodów). Najbardziej obciążona faza ma ponad 2× więcej niż najmniej obciążona. To wskazówka projektowa, nie wymóg normy.`});
 return res;
}
// What is supplied with every changeover switch in position I and in position II (circuits with a device only).
function byPosition(s){if(!s.components.some(c=>TYPES[c.type].changeover))return null;const out={};
 for(const k of [1,2]){const r=analyze({...s,components:s.components.map(c=>TYPES[c.type].changeover?{...c,pos:k}:c)}),by=new Map(r.circuits.map(c=>[c.id,c])),g={grid:[],gen:[],none:[]};
  for(const c of s.circuits){if(!c.device)continue;const x=by.get(c.id);(x?.status==='ok'?g[x.source==='gen'?'gen':'grid']:g.none).push(c.name)}out[k]=g}
 return out}
const api={edges,components,busbarLinks,underBusbar,analyze,byPosition};
if(typeof module!=='undefined')module.exports=api;root.DINTopology=api;
})(typeof window!=='undefined'?window:globalThis);
