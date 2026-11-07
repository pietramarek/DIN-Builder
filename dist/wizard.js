// Board generator: from a list of circuits to a complete, wired project. Deterministic; every rule is listed in
// NOTES and returned with the result so the user sees what was assumed. The output is a proposal to review.
(function(root){
const M=root.DIN||require('./model.js'),C=root.DINCalc||require('./calc.js');
const {TYPES,parse}=M;
const KINDS={light:'oświetlenie',socket:'gniazda',motor:'silnik / sprężarka (charakt. C)',other:'inne'};
const STD_IN=[6,10,13,16,20,25,32,40];
const SECTIONS=[1.5,2.5,4,6,10,16];
// Standard commercially available ratings for modular main switches and RCDs (not a normative table).
const PROT_IN=[25,32,40,50,63,80,100];
const RCD_TYPES=['','AC','A','F','B'];
// Built-in board templates: circuit list plus wizard options. Powers and lengths are typical examples to edit.
const T=(name,power,phases,kind,length)=>({name,power,phases,kind,length});
const HOUSE=[T('Oświetlenie parter',400,1,'light',25),T('Oświetlenie piętro',300,1,'light',30),T('Oświetlenie zewnętrzne',200,1,'light',35),T('Gniazda salon',2000,1,'socket',20),T('Gniazda kuchnia blat',2000,1,'socket',15),T('Lodówka',300,1,'socket',12),T('Zmywarka',2200,1,'other',14),T('Pralka',2200,1,'other',18),T('Łazienka parter',2000,1,'socket',16),T('Łazienka piętro',2000,1,'socket',24),T('Gniazda pokoje parter',2000,1,'socket',22),T('Gniazda pokoje piętro',2000,1,'socket',28),T('Piekarnik',3500,1,'other',14),T('Płyta indukcyjna',7400,3,'other',14),T('Garaż – gniazda',2000,1,'socket',25),T('Brama i furtka',500,1,'other',40)];
const TEMPLATES=[
 {id:'flat',name:'Mieszkanie 1-fazowe',note:'Typowe mieszkanie w bloku, zasilanie 1-fazowe.',opts:{supply:'1F',system:'TN-C-S',groupSize:5,rcdMode:'groups'},circuits:[T('Oświetlenie pokoje',300,1,'light',18),T('Oświetlenie kuchnia, łazienka, przedpokój',200,1,'light',15),T('Gniazda pokój dzienny',2000,1,'socket',14),T('Gniazda sypialnia',2000,1,'socket',16),T('Gniazda kuchnia blat',2000,1,'socket',10),T('Lodówka',300,1,'socket',9),T('Zmywarka',2200,1,'other',10),T('Pralka',2200,1,'other',8),T('Łazienka',2000,1,'socket',8),T('Płyta indukcyjna (1-faz.)',3600,1,'other',10),T('Piekarnik',3500,1,'other',10)]},
 {id:'house',name:'Dom jednorodzinny 3-fazowy',note:'Dom parterowy z poddaszem, kuchnia z płytą 3-fazową, garaż i brama.',opts:{supply:'3F',system:'TN-C-S',groupSize:6,rcdMode:'groups'},circuits:HOUSE},
 {id:'heatpump',name:'Dom z pompą ciepła',note:'Jak dom 3-fazowy oraz pompa ciepła (charakterystyka C) i grzałka zasobnika CWU. Sprawdź w instrukcji pompy wymagany typ RCD i zabezpieczenie.',opts:{supply:'3F',system:'TN-C-S',groupSize:6,rcdMode:'groups',rcdType:'A'},circuits:[...HOUSE,T('Pompa ciepła – sprężarka',6000,3,'motor',10),T('Pompa ciepła – jednostka wewnętrzna, sterowanie',300,1,'other',8),T('Grzałka zasobnika CWU',3000,1,'other',8)]},
 {id:'pv',name:'Dom z fotowoltaiką',note:'Jak dom 3-fazowy oraz obwód falownika PV. Zabezpieczenie falownika dobierz do jego prądu wyjściowego, a wymaganie RCD i jego typ sprawdź w instrukcji falownika – kreator traktuje falownik jak zwykły obwód 3-fazowy.',opts:{supply:'3F',system:'TN-C-S',groupSize:6,rcdMode:'groups'},circuits:[...HOUSE,T('Falownik PV',10000,3,'other',15)]}
];
const NOTES=[
 'Oświetlenie: B10 i 1,5 mm²; gniazda: B16 i 2,5 mm² (typowe przyjęcie dla mieszkań).',
 'Inne obwody: najmniejszy znormalizowany prąd wyłącznika ≥ prądu z mocy (cos φ = 1, 230 V lub 3 × 400 V), charakterystyka B, przewód min. 2,5 mm².',
 'Silniki i sprężarki (pompa ciepła, klimatyzacja): oznacz je jako „silnik / sprężarka” – kreator dobiera charakterystykę C zamiast B. To nadal nie uwzględnia prądu rozruchu ani zaleceń producenta.',
 'Przekrój: najmniejszy, dla którego In ≤ Iz przy wybranym ułożeniu (Cu, PVC, 30 °C, bez współczynników grupowania).',
 'Każdy obwód za wyłącznikiem różnicowoprądowym 30 mA; grupy RCD po maksymalnie wskazanej liczbie obwodów. Typ RCD (AC/A/F/B) z wyboru w kreatorze trafia do opisu parametrów – kreator nie sprawdza, czy to właściwy typ dla danego odbioru.',
 'TN-C-S: złączka rozdziału PEN w pierwszym rzędzie (PEN → mostek → N do wyłącznika głównego, PE do listwy PE). Za złączką N i PE nie mogą się ponownie łączyć.',
 'Fazy obwodów 1-fazowych dobrane tak, by wyrównać moc zainstalowaną; o fazie decyduje pin szyny grzebieniowej 3P.',
 'Tryb „RCBO”: każdy obwód 1-fazowy ma własny wyłącznik różnicowo-nadprądowy 1P+N (2 mod.) zasilany z szyny grzebieniowej; obwody 3-fazowe pozostają w grupie z RCD 4P. N każdego RCBO jest podłączony przewodem z listwy N w rzędzie. W modelu szyna ma pin co moduł – rzeczywista szyna dla aparatów 1P+N ma podziałkę dopasowaną do aparatu.',
 `Prąd znamionowy wyłącznika głównego i każdego RCD dobierany z listy ${PROT_IN.join('/')} A wg sumy prądów obwodów na najbardziej obciążonej fazie w danej grupie (bez współczynnika jednoczesności – to zawyża dobór, nie zaniża). Sprawdź go mimo to wobec zabezpieczenia przedlicznikowego i rzeczywistego obciążenia.`,
];
const uidGen=()=>{let n=0;return p=>p+'-'+(++n)};

function validateInput(inp){
 const errs=[];
 if(!inp||!Array.isArray(inp.circuits)||!inp.circuits.length)errs.push('Dodaj co najmniej jeden obwód.');
 if(inp&&!['1F','3F'].includes(inp.supply))errs.push('Wybierz zasilanie 1- lub 3-fazowe.');
 (inp?.circuits||[]).forEach((c,i)=>{
  const n=`Obwód ${i+1}`;
  if(typeof c.name!=='string'||!c.name.trim()||c.name.length>120)errs.push(`${n}: podaj nazwę.`);
  if(!Number.isFinite(c.power)||c.power<=0||c.power>100000)errs.push(`${n}: moc musi być w zakresie 1–100 000 W.`);
  if(![1,3].includes(c.phases))errs.push(`${n}: liczba faz 1 lub 3.`);
  if(!Object.hasOwn(KINDS,c.kind))errs.push(`${n}: wybierz rodzaj.`);
  if(c.phases===3&&inp.supply==='1F')errs.push(`${n}: obwód 3-fazowy przy zasilaniu 1-fazowym.`);
  if(c.length!==undefined&&!(Number.isFinite(c.length)&&c.length>=0&&c.length<=1000))errs.push(`${n}: długość 0–1000 m.`);
 });
 const g=inp?.groupSize;if(!Number.isInteger(g)||g<1||g>12)errs.push('Liczba obwodów na RCD: 1–12.');
 if(inp&&!Object.hasOwn(C.METHODS,inp.method))errs.push('Wybierz sposób ułożenia przewodów.');
 if(inp&&inp.rcdType!==undefined&&!RCD_TYPES.includes(inp.rcdType))errs.push('Nieznany typ RCD.');
 if(inp&&inp.rcdMode!==undefined&&!['groups','rcbo'].includes(inp.rcdMode))errs.push('Nieznany sposób ochrony różnicowoprądowej.');
 return errs;
}
function protection(c,method){
 const three=c.phases===3,table=three?C.IZ3:C.IZ,curve=c.kind==='motor'?'C':'B';
 let In,minS;
 if(c.kind==='light'){In=10;minS=1.5}
 else if(c.kind==='socket'){In=16;minS=2.5}
 else{const Ib=three?c.power/(Math.sqrt(3)*400):c.power/230;In=STD_IN.find(v=>v>=Ib);minS=2.5}
 if(In===undefined)return{error:`${c.name}: prąd ${Math.round(three?c.power/(Math.sqrt(3)*400):c.power/230)} A przekracza 40 A – za duży na obwód z wyłącznikiem modułowym w kreatorze.`};
 const S=SECTIONS.find(s=>s>=minS&&table[method][s]>=In);
 if(S===undefined)return{error:`${c.name}: brak przekroju do 16 mm² dla In ${In} A przy ułożeniu ${method}.`};
 return{In,S,curve};
}
// Worst-case per-phase current of a set of circuits (no diversity factor): 1-phase circuits add to their assigned
// pin, 3-phase circuits add their line current to all three. Used to size the RCD/main switch, not a load study.
function phaseCurrents(circuits){
 const L=[0,0,0];
 for(const c of circuits){
  if(c.phases===3){const i=c.power/(Math.sqrt(3)*400);L[0]+=i;L[1]+=i;L[2]+=i}
  else L[c.pin||0]+=c.power/230;
 }
 return L;
}
const pickRating=amps=>PROT_IN.find(v=>v>=amps);
// Greedy balancing: largest single-phase loads first onto the least loaded phase; 3-phase loads spread evenly.
// Within each RCD group the phases get equal counts (±1) so breakers sit on consecutive comb pins without gaps;
// among the allowed phases the one with the lowest board-wide load is chosen.
function assignPhases(groups,supply){
 const load=[0,0,0];
 for(const c of groups.flat())if(c.phases===3)for(let k=0;k<3;k++)load[k]+=c.power/3;
 for(const g of groups){
  const count=[0,0,0];
  for(const c of g.filter(c=>c.phases===1).sort((a,b)=>b.power-a.power)){
   if(supply==='1F'){c.pin=0;load[0]+=c.power;continue}
   const min=Math.min(...count),ok=[0,1,2].filter(k=>count[k]===min),k=ok.reduce((a,b)=>load[b]<load[a]?b:a);
   c.pin=k;count[k]++;load[k]+=c.power;
  }
 }
 return load;
}
// Places breakers along a 3P comb so that a 1-pole breaker sits on the pin of its phase (offset % 3).
function sequence(group,three){
 const out=[];let off=0;
 if(!three){group.forEach((c,i)=>out.push({c,off:i}));return{items:out,len:group.length}} // 1P comb: side by side
 for(const c of group.filter(c=>c.phases===3)){while(off%3)off++;out.push({c,off});off+=3}
 const q=[0,1,2].map(k=>group.filter(c=>c.phases===1&&c.pin===k));
 while(q.some(x=>x.length)){const k=off%3;if(q[k].length){out.push({c:q[k].shift(),off});}off++}
 return{items:out,len:off};
}
function generate(inp){
 const errs=validateInput(inp);if(errs.length)return{errors:errs};
 const id=uidGen(),three=inp.supply==='3F',method=inp.method;
 const circuits=inp.circuits.map((c,i)=>({...c,name:c.name.trim(),idx:i}));
 for(const c of circuits){const p=protection(c,method);if(p.error)return{errors:[p.error]};Object.assign(c,p)}
 // Groups: keep the circuit order, but never more than groupSize per RCD. In RCBO mode only 3-phase circuits use RCD groups.
 const rcbo=inp.rcdMode==='rcbo',grouped=rcbo?circuits.filter(c=>c.phases===3):circuits,singles=rcbo?circuits.filter(c=>c.phases===1):[];
 const groups=[];for(let i=0;i<grouped.length;i+=inp.groupSize)groups.push(grouped.slice(i,i+inp.groupSize));
 const load=assignPhases(groups,inp.supply);
 // RCBO rows: position p sits at module offset 2·(p mod R), i.e. on comb pin (2·(p mod R)) mod 3 – cycle L1, L3, L2.
 // Largest loads first take a free position on the currently least loaded phase.
 const perRow=Math.max(1,Math.min(inp.groupSize,7)),rcboRows=Math.ceil(singles.length/perRow);
 {const free=[[],[],[]];for(let p=0;p<singles.length;p++){const off=2*(p%perRow);free[three?off%3:0].push({row:Math.floor(p/perRow),off})}
  for(const c of [...singles].sort((a,b)=>b.power-a.power)){const k=three?[0,1,2].filter(k=>free[k].length).reduce((a,b)=>load[b]<load[a]?b:a):0;const pos=free[k].shift();c.pin=k;c.rrow=pos.row;c.roff=pos.off;load[k]+=c.power}}
 if(groups.length+rcboRows+1>M.LIMITS.rows[1])return{errors:[`Za dużo rzędów (${groups.length+rcboRows+1}) na ${M.LIMITS.rows[1]} szyn – zwiększ liczbę obwodów na RCD lub na rząd.`]};
 // Size the main switch and every RCD from the worst-case per-phase current of what they carry (no diversity factor).
 const groupAmps=groups.map(g=>{const L=phaseCurrents(g);return three?Math.max(...L):L[0]});
 const rcdRatings=groupAmps.map(pickRating);
 if(rcdRatings.some(v=>v===undefined))return{errors:[`Prąd w jednej z grup RCD przekracza ${PROT_IN.at(-1)} A – zmniejsz liczbę obwodów na RCD lub ich moc.`]};
 const mainAmps=(()=>{const L=phaseCurrents(circuits);return three?Math.max(...L):L[0]})();
 const mainRating=pickRating(mainAmps);
 if(mainRating===undefined)return{errors:[`Całkowity prąd (ok. ${Math.round(mainAmps)} A, bez współczynnika jednoczesności) przekracza ${PROT_IN.at(-1)} A – za duże obciążenie dla wyłącznika modułowego w kreatorze.`]};
 const fuseA=C.fuseAmps(inp.mainFuse);
 const warnings=[];
 if(fuseA!=null&&mainAmps>fuseA)warnings.push(`Obliczony prąd obciążenia (ok. ${Math.round(mainAmps)} A, bez współczynnika jednoczesności) przekracza podane zabezpieczenie przedlicznikowe (${fuseA} A). Sprawdź zamówioną moc u operatora sieci albo zmniejsz obciążenie.`);
 const comps=[],wires=[],busbars=[],outCircuits=[];
 const add=(type,label,row,slot,rating)=>{const c={id:id('d'),type,label,row,slot,rating:rating??TYPES[type].rating,on:true};comps.push(c);return c};
 const w=(a,ap,b,bp,role,gauge=10)=>wires.push({id:id('w'),a:{device:a.id,port:ap},b:{device:b.id,port:bp},role,gauge});
 const rcdType=three?'RCD':'RCD2',rcdW=TYPES[rcdType].width,poles=three?['L1','L2','L3']:['L'];
 const seqs=groups.map(g=>sequence(g,three));
 const stripFor=n=>n<=6?'NB7':n<=10?'NB11':'NB15';
 const need=Math.max(0,...seqs.map((sq,i)=>rcdW+sq.len+1+TYPES[stripFor(groups[i].length+1)].width),(three?4:2)+(inp.spd&&three?5:0)+(inp.system==='TN-C-S'?3:0)+TYPES.PEB15.width+1,rcboRows?2*perRow+1+TYPES[stripFor(perRow+1)].width:0);
 const modules=Math.min(M.LIMITS.modules[1],Math.max(inp.modules||18,need));
 if(need>modules)return{errors:['Grupa nie mieści się na szynie 36 modułów – zmniejsz liczbę obwodów na RCD.']};
 // Row 1: main switch, surge protection, PE bar (and the PEN split in TN-C-S)
 const main=add(three?'MAIN':'MAIN2','Q0',0,0,mainRating+' A');
 const pe=add(circuits.length+2<=7?'PEB7':circuits.length+2<=11?'PEB11':'PEB15','PE1',0,0);pe.slot=modules-TYPES[pe.type].width;
 if(inp.spd&&three){const spd=add('SPD','SPD1',0,5);['b0','b1','b2','b3'].forEach((p,i)=>w(main,p,spd,'t'+i,['L1','L2','L3','N'][i],6));w(spd,'b0',pe,'t0','PE',6)}
 // TN-C-S: PEN split terminal in the first row; the supply PEN reaches its N side, its PE side feeds the PE bar.
 if(inp.system==='TN-C-S'){const px=add('PENX','X1',0,(three?4:2)+(inp.spd&&three?5:0)+1);w(main,three?'t3':'t1',px,'t1','N',10);w(px,'b0',pe,'b0','PE',10)}
 groups.forEach((g,gi)=>{
  const row=gi+1,sq=seqs[gi],rcd=add(rcdType,'RCD'+(gi+1),row,0,`${rcdRatings[gi]} A / 30 mA${inp.rcdType?' / typ '+inp.rcdType:''}`);
  (three?['b0','b1','b2','b3']:['b0','b1']).forEach((p,i)=>w(main,p,rcd,'t'+i,three?['L1','L2','L3','N'][i]:['L','N'][i]));
  const start=rcdW;let firstAt=[null,null,null];
  for(const{c,off}of sq.items){
   const dt=c.phases===3?'MCB3':'MCB',dev=add(dt,'F'+(outCircuits.length+1),row,start+off,c.curve+c.In);
   for(let k=0;k<(c.phases===3?3:1);k++){const pin=(off+k)%3;if(!firstAt[pin])firstAt[pin]={dev,port:'t'+k}}
   c.dev=dev;c.row=row;outCircuits.push(c);
  }
  const last=sq.items.reduce((m,{c,off})=>Math.max(m,off+(c.phases===3?3:1)),0);
  busbars.push({id:id('b'),type:three?'3P':'1P',side:'t',row,from:start,to:start+last-1});
  firstAt.forEach((f,k)=>{if(f&&(three||k===0))w(rcd,'b'+k,f.dev,f.port,three?poles[k]:'L')});
  const strip=add(stripFor(g.length+1),'N'+(gi+1),row,start+last+1);
  w(rcd,three?'b3':'b1',strip,'t0','N');
  for(const c of g)c.nBar=strip.id;
 });
 for(let r=0;r<rcboRows;r++){
  const row=groups.length+1+r,items=singles.filter(c=>c.rrow===r).sort((a,b)=>a.roff-b.roff),firstAt=[null,null,null];
  for(const c of items){const dev=add('RCBO','F'+(outCircuits.length+1),row,c.roff,`${c.curve}${c.In} / 30 mA${inp.rcdType?' / typ '+inp.rcdType:''}`);c.dev=dev;outCircuits.push(c);const pin=three?c.roff%3:0;if(!firstAt[pin])firstAt[pin]=dev}
  const last=Math.max(...items.map(c=>c.roff))+2; // RCBO is 2 modules wide
  busbars.push({id:id('b'),type:three?'3P':'1P',side:'t',row,from:0,to:last-1});
  firstAt.forEach((dev,k)=>{if(dev)w(main,'b'+k,dev,'t0',three?poles[k]:'L')});
  const st=stripFor(items.length+1),strip=add(st,'N'+(groups.length+r+1),row,last+1),sp=M.ports(strip);
  w(main,three?'b3':'b1',strip,sp[0].key,'N');items.forEach((c,i)=>w(strip,sp[i+1].key,c.dev,'t1','N',2.5));
 }
 const cable=c=>`${c.phases===3?5:3} × ${String(c.S).replace('.',',')}`;
 const state={version:1,name:(inp.name||'Rozdzielnia z kreatora').slice(0,120),rows:groups.length+rcboRows+1,modules,
  network:{system:inp.system||'',supply:inp.supply,mainFuse:inp.mainFuse||''},components:comps,wires,busbars,
  circuits:circuits.sort((a,b)=>a.idx-b.idx).map(c=>({id:id('c'),name:c.name,device:c.dev.id,power:c.power,cable:cable(c),...(c.nBar?{nBar:c.nBar}:{}),method,kind:c.kind==='light'?'light':'other',...(c.length!==undefined?{length:c.length}:{})}))};
 const parsed=parse(state);
 return{state:parsed,load,notes:NOTES,groups:groups.length,rcbo:singles.length,warnings};
}
const SAMPLE=[['Oświetlenie parter',400,1,'light'],['Oświetlenie piętro',300,1,'light'],['Gniazda salon',2000,1,'socket'],['Gniazda kuchnia blat',2000,1,'socket'],['Zmywarka',2200,1,'other'],['Lodówka',300,1,'socket'],['Pralka',2200,1,'other'],['Gniazda pokoje',2000,1,'socket'],['Łazienka',2000,1,'socket'],['Płyta indukcyjna',7400,3,'other'],['Piekarnik',3500,1,'other'],['Pompa ciepła',6000,3,'other']].map(([name,power,phases,kind])=>({name,power,phases,kind}));
const api={KINDS,NOTES,SAMPLE,TEMPLATES,RCD_TYPES,PROT_IN,validateInput,protection,generate};
if(typeof module!=='undefined')module.exports=api;root.DINWizard=api;
})(typeof window!=='undefined'?window:globalThis);
