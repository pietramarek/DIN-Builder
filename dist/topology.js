// Deterministic topology of the board model: which supply conductor reaches which terminal.
// It models conductive paths only (wires, comb busbars, closed devices, N/PE bars). It does not
// compute currents, impedances, cable ampacity or selectivity, and it is not a safety approval.
(function(root){
const M=root.DIN||require('./model.js');
const {TYPES,BUSBARS,BUSBAR_DEVICES,MAIN_TYPES,ports}=M;
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
  if(c.type==='SPD'||!c.on)continue; // SPD is not a series conductor; an open device breaks the path
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
 const issues=[],E=edges(s),mains=s.components.filter(c=>MAIN_TYPES.includes(c.type)),net=s.network||{},byId=new Map(s.components.map(c=>[c.id,c]));
 const res={supplied:mains.length>0,circuits:[],balance:{L1:0,L2:0,L3:0,unknown:0,total:0},issues,phaseOf:new Map()};
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

 if(!mains.length){
  issues.push({severity:'info',title:'Brak punktu zasilania – nie sprawdzono topologii',text:'Dodaj wyłącznik główny (FR). Jego górne zaciski są w modelu zasilaniem L1, L2, L3 i N. Bez tego faz, zwarć, grup RCD ani bilansu nie sprawdzono.'});
  for(const c of s.circuits){res.circuits.push({id:c.id,status:'nodata',phase:null,rcd:[]});res.balance.unknown+=c.power;res.balance.total+=c.power}
  return res;
 }

 // A single-pole main switch terminal 'L' is the L1 source; a 1-phase supply energises only L1 and N.
 const starts=l=>mains.flatMap(m=>ports(m).filter(p=>p.side==='t'&&(p.role===l||(l==='L1'&&p.role==='L'))).map(p=>key(m.id,p.key)));
 const active=net.supply==='1F'?['L1','N']:SOURCES;
 if(!net.supply)issues.push({severity:'info',title:'Brak danych: liczba faz zasilania',text:'Nie podano, czy zasilanie jest 1- czy 3-fazowe. Model przyjął napięcie na wszystkich fazowych zaciskach wyłącznika głównego. Uzupełnij w parametrach sieci.'});
 if(!net.system)issues.push({severity:'info',title:'Brak danych: układ sieci',text:'Nie podano układu sieci (TN-S, TN-C-S, TT), więc połączenia N z PE oceniono jako wymagające sprawdzenia.'});
 if(net.supply==='1F'&&mains.some(m=>m.type==='MAIN'))issues.push({severity:'info',title:'Zasilanie 1-fazowe',text:'Zaciski L2 i L3 wyłącznika głównego są w modelu bez napięcia.'});
 if(net.supply==='3F'&&mains.every(m=>m.type==='MAIN2'))issues.push({severity:'warn',title:'Wyłącznik główny 1P+N przy zasilaniu 3-fazowym',text:'Model przyjmuje, że wyłącznik 1P+N jest na fazie L1. Sprawdź, czy rozdzielnica nie potrzebuje wyłącznika 4P.'});
 const supply=list=>{const adj=adjacency(list),map=new Map();for(const l of active)for(const n of reach(adj,starts(l))){if(!map.has(n))map.set(n,new Set());map.get(n).add(l)}return map};
 const full=supply(E);

 // Shorts and live PE
 const seenShort=new Set();let livePE=false,nOnPE=null;
 for(const[node,set]of full){
  if(node.startsWith('bb:'))continue;
  if(set.size>1){const sig=[...set].sort().join('+');if(!seenShort.has(sig)){seenShort.add(sig);issues.push({severity:'error',device:node.split(':')[0],title:'Zwarcie w modelu: '+[...set].join(' z '),text:`Połączone ze sobą: ${[...set].join(', ')} (np. przy ${label(node)}). Po załączeniu oznacza to zwarcie. Sprawdź przewody i szyny.`})}}
  if(roleOf(node)==='PE'&&set.size){const live=[...set].filter(l=>LIVE.includes(l));if(live.length&&!livePE){livePE=true;issues.push({severity:'error',device:node.split(':')[0],title:'PE pod napięciem w modelu',text:`${label(node)} jest połączony z ${live.join(', ')}. Przewód ochronny nie może łączyć się z przewodem fazowym.`})}else if(!live.length&&!nOnPE)nOnPE=node}
 }

 // N joined to PE: legitimate only as the PEN split point in TN-C-S.
 if(nOnPE){const dev=nOnPE.split(':')[0];if(net.system==='TN-C-S')issues.push({severity:'info',device:dev,title:'Rozdział PEN w rozdzielnicy (TN-C-S)',text:`N i PE są połączone (np. przy ${label(nOnPE)}). W układzie TN-C-S to punkt rozdziału PEN; za nim N i PE nie mogą się ponownie łączyć.`});else if(net.system)issues.push({severity:'error',device:dev,title:'Połączenie N z PE w układzie '+net.system,text:`N i PE są połączone (np. przy ${label(nOnPE)}). W układzie ${net.system} rozdzielnica nie powinna łączyć N z PE.`});else issues.push({severity:'warn',device:dev,title:'Połączenie N z PE – sprawdź układ sieci',text:`N i PE są połączone (np. przy ${label(nOnPE)}). Dopuszczalne tylko w punkcie rozdziału PEN w układzie TN-C-S.`})}
 // RCD groups: analyse the graph with every residual-current device opened
 const rcds=s.components.filter(c=>RCD_TYPES.includes(c.type));
 const noRcdEdges=E.filter(e=>!(e.kind==='device'&&RCD_TYPES.includes(e.type)));
 const noRcd=supply(noRcdEdges),compNo=components(noRcdEdges);
 const portOf=(c,side,role)=>{const p=ports(c).find(p=>p.side===side&&p.role===role);return p&&key(c.id,p.key)};
 for(const r of rcds){
  for(const p of ports(r).filter(p=>p.side==='t')){const t=key(r.id,p.key),b=key(r.id,'b'+p.i);if(sameComp(compNo,t,b))issues.push({severity:'error',device:r.id,title:'Obejście '+TYPES[r.type].short+' '+r.label,text:`Zacisk ${p.role} przed i za ${r.label} jest połączony inną drogą. Prąd ominie wyłącznik różnicowoprądowy.`})}
 }
 for(let i=0;i<rcds.length;i++)for(let j=i+1;j<rcds.length;j++){const a=portOf(rcds[i],'b','N'),b=portOf(rcds[j],'b','N');if(a&&b&&sameComp(compNo,a,b))issues.push({severity:'error',device:rcds[j].id,title:'Wspólny N dla dwóch grup RCD',text:`Przewody N za ${rcds[i].label} i za ${rcds[j].label} są połączone. Każda grupa RCD potrzebuje własnego N, inaczej wyłączniki będą wyzwalać bez usterki.`})}
 const peNodes=[...compNo.keys()].filter(n=>!n.startsWith('bb:')&&roleOf(n)==='PE');
 for(const r of rcds){const bn=portOf(r,'b','N');if(bn&&peNodes.some(pn=>sameComp(compNo,pn,bn)))issues.push({severity:'error',device:r.id,title:'N połączony z PE za '+r.label,text:`Przewód N za ${r.label} łączy się z PE. Prąd wróci przez PE i RCD zadziała; rozdział PEN może być tylko przed RCD.`})}
 const rcdsReaching=(node,phase)=>rcds.filter(r=>{const own=E.filter(e=>e.kind==='device'&&e.device===r.id);return supply(noRcdEdges.concat(own)).get(node)?.has(phase)&&!noRcd.get(node)?.has(phase)}).map(r=>r.id);

 // Circuits
 for(const ci of s.circuits){
  const d=byId.get(ci.device),row={id:ci.id,status:'unassigned',phase:null,rcd:[]};
  res.balance.total+=ci.power;
  if(!d){res.balance.unknown+=ci.power;res.circuits.push(row);continue}
  // Each pole of a multi-pole breaker is followed separately; power is split evenly over its phases.
  const outs=ports(d).filter(p=>p.side==='b'&&p.role==='L').map(p=>key(d.id,p.key)),out=outs[0],per=outs.map(o=>[...(full.get(o)||[])].filter(l=>LIVE.includes(l)));
  if(per.some(p=>p.length>1)){row.status='short';res.balance.unknown+=ci.power}
  else if(per.every(p=>!p.length)){row.status=d.on?'unpowered':'off';res.balance.unknown+=ci.power;if(d.on)issues.push({severity:'warn',device:d.id,title:'Obwód bez zasilania: '+ci.name,text:`${d.label} nie jest połączony z fazą wyłącznika głównego (w modelu).`})}
  else if(per.some(p=>!p.length)){row.status='partial';res.balance.unknown+=ci.power;issues.push({severity:'warn',device:d.id,title:'Niepełne zasilanie: '+ci.name,text:`Nie wszystkie bieguny ${d.label} mają napięcie (w modelu). Odbiornik wielofazowy pracowałby bez jednej fazy.`})}
  else{
   const phases=per.map(p=>p[0]);
   row.status='ok';row.phases=phases;row.phase=phases.join('+');for(const p of phases)res.balance[p]+=ci.power/phases.length;res.phaseOf.set(ci.id,row.phase);
   if(new Set(phases).size<phases.length)issues.push({severity:'warn',device:d.id,title:'Bieguny na tej samej fazie: '+ci.name,text:`${d.label} ma kilka biegunów zasilanych z ${[...new Set(phases)].join(', ')}. Odbiornik wielofazowy wymaga różnych faz – sprawdź przewody i szynę grzebieniową.`});
   row.rcd=d.type==='RCBO'?[d.id]:outs.map((o,i)=>rcdsReaching(o,phases[i])).reduce((a,b)=>a.filter(x=>b.includes(x)));
   if(!row.rcd.length)issues.push({severity:'warn',device:d.id,title:'Obwód bez ochrony RCD: '+ci.name,text:`Faza ${d.label} nie przechodzi przez wyłącznik różnicowoprądowy. Wiele obwodów w mieszkaniach wymaga ochrony dodatkowej RCD ≤30 mA (PN-HD 60364-4-41) – sprawdź przeznaczenie obwodu.`});
   if(d.type==='MCB'){
    const nb=ci.nBar&&byId.get(ci.nBar),nNode=nb&&key(nb.id,'t0');
    if(!nb){if(row.rcd.length)issues.push({severity:'info',device:d.id,title:'Brak danych: listwa N obwodu '+ci.name,text:'Nie wskazano listwy N tego obwodu, więc nie sprawdzono, czy N wraca do tej samej grupy RCD co faza.'})}
    else{
     const rcdN=row.rcd.map(id=>portOf(byId.get(id),'b','N')).filter(Boolean),anyRcdN=rcds.map(r=>portOf(r,'b','N')).filter(Boolean);
     if(!full.get(nNode)?.has('N'))issues.push({severity:'warn',device:nb.id,title:'Listwa N bez połączenia z N',text:`${nb.label} (N obwodu ${ci.name}) nie jest połączona z przewodem N zasilania.`});
     else if(row.rcd.length&&!rcdN.some(n=>sameComp(compNo,n,nNode)))issues.push({severity:'error',device:nb.id,title:'N obwodu spoza grupy RCD: '+ci.name,text:`Faza obwodu przechodzi przez ${row.rcd.map(id=>byId.get(id).label).join(', ')}, a N wraca na ${nb.label} spoza tej grupy. RCD zadziała przy obciążeniu.`});
     else if(!row.rcd.length&&anyRcdN.some(n=>sameComp(compNo,n,nNode)))issues.push({severity:'error',device:nb.id,title:'N obwodu za RCD, faza przed RCD: '+ci.name,text:`N wraca przez wyłącznik różnicowoprądowy, a faza go omija. RCD zadziała przy obciążeniu.`});
    }
   }
  }
  res.circuits.push(row);
 }

 // Phase balance: reported as information only; there is no single normative limit for a dwelling.
 const assigned=LIVE.map(l=>res.balance[l]),max=Math.max(...assigned),min=Math.min(...assigned);
 if(assigned.filter(v=>v>0).length>1&&max>=3000&&max>2*Math.max(min,1))issues.push({severity:'info',title:'Nierównomierne obciążenie faz',text:`L1 ${Math.round(res.balance.L1)} W · L2 ${Math.round(res.balance.L2)} W · L3 ${Math.round(res.balance.L3)} W (moc zainstalowana z listy obwodów). Najbardziej obciążona faza ma ponad 2× więcej niż najmniej obciążona. To wskazówka projektowa, nie wymóg normy.`});
 return res;
}
const api={edges,components,busbarLinks,underBusbar,analyze};
if(typeof module!=='undefined')module.exports=api;root.DINTopology=api;
})(typeof window!=='undefined'?window:globalThis);
