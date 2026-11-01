// Deterministic topology of the board model: which supply conductor reaches which terminal.
// It models conductive paths only (wires, comb busbars, closed devices, N/PE bars). It does not
// compute currents, impedances, cable ampacity or selectivity, and it is not a safety approval.
(function(root){
const M=root.DIN||require('./model.js');
const {TYPES,BUSBARS,BUSBAR_DEVICES,ports}=M;
const LIVE=['L1','L2','L3'],SOURCES=[...LIVE,'N'],RCD_TYPES=['RCD','RCBO'];
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
 for(const c of underBusbar(s,b).inside){if(!BUSBAR_DEVICES.includes(c.type))continue;const p=ports(c).find(p=>p.side===b.side&&p.role==='L');if(!p)continue;const pin=BUSBARS[b.type].pins===3?(c.slot-b.from)%3:0;out.push({port:key(c.id,p.key),node:'bb:'+b.id+':'+pin,pin,device:c.id});}
 return out;
}
function edges(s){
 const E=[];
 for(const c of s.components){
  const ps=ports(c);
  if(c.type==='N'||c.type==='PE'){for(let i=1;i<ps.length;i++)E.push({a:key(c.id,ps[0].key),b:key(c.id,ps[i].key),kind:'bar'});continue;}
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
 const issues=[],E=edges(s),mains=s.components.filter(c=>c.type==='MAIN'),byId=new Map(s.components.map(c=>[c.id,c]));
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

 const starts=l=>mains.flatMap(m=>ports(m).filter(p=>p.side==='t'&&p.role===l).map(p=>key(m.id,p.key)));
 const supply=list=>{const adj=adjacency(list),map=new Map();for(const l of SOURCES)for(const n of reach(adj,starts(l))){if(!map.has(n))map.set(n,new Set());map.get(n).add(l)}return map};
 const full=supply(E);

 // Shorts and live PE
 const seenShort=new Set();
 for(const[node,set]of full){
  if(node.startsWith('bb:'))continue;
  if(set.size>1){const sig=[...set].sort().join('+');if(!seenShort.has(sig)){seenShort.add(sig);issues.push({severity:'error',device:node.split(':')[0],title:'Zwarcie w modelu: '+[...set].join(' z '),text:`Połączone ze sobą: ${[...set].join(', ')} (np. przy ${label(node)}). Po załączeniu oznacza to zwarcie. Sprawdź przewody i szyny.`})}}
  if(roleOf(node)==='PE'&&set.size){issues.push({severity:'error',device:node.split(':')[0],title:'PE pod napięciem w modelu',text:`${label(node)} jest połączony z ${[...set].join(', ')}. Przewód ochronny nie może łączyć się z przewodami czynnymi.`});break}
 }

 // RCD groups: analyse the graph with every residual-current device opened
 const rcds=s.components.filter(c=>RCD_TYPES.includes(c.type));
 const noRcdEdges=E.filter(e=>!(e.kind==='device'&&RCD_TYPES.includes(e.type)));
 const noRcd=supply(noRcdEdges),compNo=components(noRcdEdges);
 const portOf=(c,side,role)=>{const p=ports(c).find(p=>p.side===side&&p.role===role);return p&&key(c.id,p.key)};
 for(const r of rcds){
  for(const p of ports(r).filter(p=>p.side==='t')){const t=key(r.id,p.key),b=key(r.id,'b'+p.i);if(sameComp(compNo,t,b))issues.push({severity:'error',device:r.id,title:'Obejście '+TYPES[r.type].short+' '+r.label,text:`Zacisk ${p.role} przed i za ${r.label} jest połączony inną drogą. Prąd ominie wyłącznik różnicowoprądowy.`})}
 }
 for(let i=0;i<rcds.length;i++)for(let j=i+1;j<rcds.length;j++){const a=portOf(rcds[i],'b','N'),b=portOf(rcds[j],'b','N');if(a&&b&&sameComp(compNo,a,b))issues.push({severity:'error',device:rcds[j].id,title:'Wspólny N dla dwóch grup RCD',text:`Przewody N za ${rcds[i].label} i za ${rcds[j].label} są połączone. Każda grupa RCD potrzebuje własnego N, inaczej wyłączniki będą wyzwalać bez usterki.`})}
 const rcdsReaching=(node,phase)=>rcds.filter(r=>{const own=E.filter(e=>e.kind==='device'&&e.device===r.id);return supply(noRcdEdges.concat(own)).get(node)?.has(phase)&&!noRcd.get(node)?.has(phase)}).map(r=>r.id);

 // Circuits
 for(const ci of s.circuits){
  const d=byId.get(ci.device),row={id:ci.id,status:'unassigned',phase:null,rcd:[]};
  res.balance.total+=ci.power;
  if(!d){res.balance.unknown+=ci.power;res.circuits.push(row);continue}
  const out=portOf(d,'b','L'),phases=[...(full.get(out)||[])].filter(l=>LIVE.includes(l));
  if(!phases.length){row.status=d.on?'unpowered':'off';res.balance.unknown+=ci.power;if(d.on)issues.push({severity:'warn',device:d.id,title:'Obwód bez zasilania: '+ci.name,text:`${d.label} nie jest połączony z fazą wyłącznika głównego (w modelu).`})}
  else if(phases.length>1){row.status='short';res.balance.unknown+=ci.power}
  else{
   row.status='ok';row.phase=phases[0];res.balance[row.phase]+=ci.power;res.phaseOf.set(ci.id,row.phase);
   row.rcd=d.type==='RCBO'?[d.id]:rcdsReaching(out,row.phase);
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
 if(assigned.filter(v=>v>0).length>1&&max>=3000&&max>2*Math.max(min,1))issues.push({severity:'info',title:'Nierównomierne obciążenie faz',text:`L1 ${res.balance.L1} W · L2 ${res.balance.L2} W · L3 ${res.balance.L3} W (moc zainstalowana z listy obwodów). Najbardziej obciążona faza ma ponad 2× więcej niż najmniej obciążona. To wskazówka projektowa, nie wymóg normy.`});
 return res;
}
const api={edges,busbarLinks,underBusbar,analyze};
if(typeof module!=='undefined')module.exports=api;root.DINTopology=api;
})(typeof window!=='undefined'?window:globalThis);
