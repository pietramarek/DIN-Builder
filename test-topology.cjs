const assert=require('node:assert/strict');
const {TYPES,parse,validate}=require('./dist/model.js');
const {analyze,busbarLinks}=require('./dist/topology.js');
const dev=(id,type,row,slot,on=true)=>({id,type,row,slot,label:id,rating:TYPES[type].rating,on});
let n=0;const wire=(a,ap,b,bp,role='L1')=>({id:'w'+(++n),a:{device:a,port:ap},b:{device:b,port:bp},role,gauge:2.5});
const titles=r=>r.issues.map(i=>i.title);
const errors=r=>r.issues.filter(i=>i.severity==='error');

// Reference board: main switch -> 4P RCD -> 3P comb busbar under six MCBs, RCD N -> N bar.
function board(){return{version:1,name:'T',rows:4,modules:18,
 components:[dev('Q0','MAIN',0,0),dev('N0','N',0,10),dev('PE','PE',0,14),dev('RCD1','RCD',1,0),...[1,2,3,4,5,6].map(i=>dev('F'+i,'MCB',1,3+i)),dev('N1','N',1,12),dev('RCD2','RCD',2,0),dev('N2','N',2,10),dev('F7','MCB',2,5)],
 wires:[wire('Q0','b0','RCD1','t0'),wire('Q0','b1','RCD1','t1','L2'),wire('Q0','b2','RCD1','t2','L3'),wire('Q0','b3','RCD1','t3','N'),
  wire('RCD1','b0','F1','t0'),wire('RCD1','b1','F2','t0','L2'),wire('RCD1','b2','F3','t0','L3'),wire('RCD1','b3','N1','t0','N'),
  wire('Q0','b0','RCD2','t0'),wire('Q0','b3','RCD2','t3','N'),wire('RCD2','b0','F7','t0'),wire('RCD2','b3','N2','t0','N'),
  wire('Q0','b3','N0','t0','N')],
 busbars:[{id:'SZ1',type:'3P',side:'t',row:1,from:4,to:9}],
 circuits:[{id:'c1',name:'Kuchnia',device:'F1',power:2000,cable:'3x2,5',nBar:'N1'},{id:'c4',name:'Pralka',device:'F4',power:1500,cable:'3x2,5',nBar:'N1'},
  {id:'c2',name:'Salon',device:'F2',power:500,cable:'3x2,5',nBar:'N1'},{id:'c6',name:'Piekarnik',device:'F6',power:3000,cable:'3x2,5',nBar:'N1'},
  {id:'c7',name:'Łazienka',device:'F7',power:2000,cable:'3x2,5',nBar:'N2'}]};}

// 3P comb: pins repeat every 3 modules
const links=busbarLinks(board(),board().busbars[0]);
assert.deepEqual(links.map(l=>[l.device,l.pin]),[['F1',0],['F2',1],['F3',2],['F4',0],['F5',1],['F6',2]],'3P comb pin sequence');

// Correct board: phases propagate through RCD and comb busbar, no errors
let r=analyze(board());
assert.deepEqual(errors(r),[],'reference board has no errors: '+titles(r));
const ph=id=>r.circuits.find(c=>c.id===id).phase;
assert.equal(ph('c1'),'L1');assert.equal(ph('c4'),'L1','fed by comb pin shared with F1');assert.equal(ph('c2'),'L2');assert.equal(ph('c6'),'L3');
assert.deepEqual(r.circuits.find(c=>c.id==='c1').rcd,['RCD1'],'circuit protected by its RCD');
assert.deepEqual({L1:r.balance.L1,L2:r.balance.L2,L3:r.balance.L3},{L1:5500,L2:500,L3:3000},'phase balance sums installed power');
assert.ok(titles(r).includes('Nierównomierne obciążenie faz'),'imbalance reported as information');
assert.equal(r.issues.find(i=>i.title==='Nierównomierne obciążenie faz').severity,'info');

// Device switched off breaks the path
let s=board();s.components.find(c=>c.id==='RCD1').on=false;r=analyze(s);
assert.equal(r.circuits.find(c=>c.id==='c1').status,'unpowered','downstream of open RCD has no supply');

// Short circuit: L1 wired onto a terminal fed with L2
s=board();s.wires.push(wire('RCD1','b0','F2','t0'));r=analyze(s);
assert.ok(errors(r).some(i=>i.title.startsWith('Zwarcie')),'L1-L2 short detected');

// Live PE
s=board();s.wires.push(wire('RCD1','b0','PE','t0','PE'));r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='PE pod napięciem w modelu'));

// RCD bypass: L1 taken before the RCD straight to an MCB behind it
s=board();s.wires.push(wire('Q0','b0','F1','t0'));r=analyze(s);
assert.ok(errors(r).some(i=>i.title.startsWith('Obejście')),'bypass detected');
assert.ok(titles(r).some(t=>t.startsWith('Obwód bez ochrony RCD: Kuchnia')),'bypassed circuit not RCD protected');

// Shared N between two RCD groups
s=board();s.wires.push(wire('RCD2','b3','N1','t1','N'));r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='Wspólny N dla dwóch grup RCD'));

// Circuit N returned to a bar outside its RCD group
s=board();s.circuits[0].nBar='N0';r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='N obwodu spoza grupy RCD: Kuchnia'));
s=board();s.circuits[0].nBar='N2';r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='N obwodu spoza grupy RCD: Kuchnia'),'N of another RCD group');

// Missing data stays explicit
s=board();delete s.circuits[0].nBar;r=analyze(s);
assert.ok(r.issues.some(i=>i.severity==='info'&&i.title==='Brak danych: listwa N obwodu Kuchnia'));
s=board();s.components=s.components.filter(c=>c.id!=='Q0');s.wires=s.wires.filter(w=>w.a.device!=='Q0');r=analyze(s);
assert.ok(r.issues.some(i=>i.title.startsWith('Brak punktu zasilania')),'no supply point reported');
assert.equal(r.circuits[0].status,'nodata');

// Busbar placement rules
s=board();s.busbars.push({id:'SZ2',type:'1P',side:'t',row:1,from:2,to:4});r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='Szyna kończy się w połowie aparatu'),'busbar ending inside RCD');
assert.ok(errors(r).some(i=>i.title==='Nakładające się szyny'));
s=board();s.busbars=[{id:'SZ1',type:'1P',side:'t',row:1,from:0,to:3}];r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='Aparat nie pasuje do szyny grzebieniowej'),'RCD under comb busbar');

// GSU (main earthing bar) joins all its PE terminals and is checked like any protective conductor
s=board();s.components.push(dev('GSU1','GSU',3,0));s.wires.push(wire('PE','t0','GSU1','t0','PE'));r=analyze(s);
assert.deepEqual(errors(r),[],'GSU bonded to PE bar is fine');
s.wires.push(wire('RCD1','b0','GSU1','b3','PE'));r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='PE pod napięciem w modelu'),'live conductor on GSU detected through its internal bar');
assert.equal(parse({...board(),components:[...board().components,dev('GSU1','GSU',3,0)]}).components.at(-1).type,'GSU');

// Network parameters: unknown values are reported as missing data
r=analyze(board());
assert.ok(r.issues.some(i=>i.title==='Brak danych: liczba faz zasilania'));
assert.ok(r.issues.some(i=>i.title==='Brak danych: układ sieci'));
s={...board(),network:{system:'TN-S',supply:'3F',mainFuse:'C25'}};r=analyze(s);
assert.ok(!r.issues.some(i=>i.title.startsWith('Brak danych: liczba')||i.title.startsWith('Brak danych: układ')),'known network removes missing-data notes');

// 1-phase supply: only L1 and N are live, circuits on L2/L3 lose supply
s={...board(),network:{system:'TN-C-S',supply:'1F'}};r=analyze(s);
assert.equal(r.circuits.find(c=>c.id==='c1').phase,'L1');
assert.equal(r.circuits.find(c=>c.id==='c2').status,'unpowered','L2 dead on 1-phase supply');
assert.ok(r.issues.some(i=>i.title==='Zasilanie 1-fazowe'));

// 1P+N main switch feeds L1
s={version:1,name:'1F',rows:2,modules:12,network:{system:'TN-S',supply:'1F'},components:[dev('Q','MAIN2',0,0),dev('F','MCB',0,3)],wires:[wire('Q','b0','F','t0','L')],circuits:[{id:'c',name:'Gniazda',device:'F',power:1000,cable:'3x2,5'}]};
r=analyze(s);assert.equal(r.circuits[0].phase,'L1','MAIN2 L terminal is the L1 source');assert.equal(r.balance.L1,1000);

// PEN split: N joined to PE before the RCD
const pen=sys=>{const b=board();b.network={system:sys,supply:'3F'};b.wires.push(wire('N0','b0','PE','b0','PEN'));return analyze(b)};
r=pen('TN-C-S');assert.deepEqual(errors(r),[],'PEN split in TN-C-S is not an error');assert.ok(r.issues.some(i=>i.title==='Rozdział PEN w rozdzielnicy (TN-C-S)'));
r=pen('TN-S');assert.ok(errors(r).some(i=>i.title==='Połączenie N z PE w układzie TN-S'));
r=pen('TT');assert.ok(errors(r).some(i=>i.title==='Połączenie N z PE w układzie TT'));
r=pen('');assert.ok(r.issues.some(i=>i.severity==='warn'&&i.title==='Połączenie N z PE – sprawdź układ sieci'));
// N joined to PE behind an RCD is always wrong
s=board();s.network={system:'TN-C-S',supply:'3F'};s.wires.push(wire('N1','b0','PE','b0','PEN'));r=analyze(s);
assert.ok(errors(r).some(i=>i.title==='N połączony z PE za RCD1'));
// PEN conductor between other terminal functions is rejected by the model rules
assert.ok(validate({...board(),wires:[wire('RCD1','b0','PE','t0','PEN')]}).some(i=>i.title==='Żyła PEN poza punktem rozdziału'));
assert.equal(validate({...board(),wires:[wire('N0','b0','PE','b0','PEN')]}).filter(i=>i.severity==='error').length,0,'PEN between N and PE is a valid conductor');
assert.equal(parse({...board(),network:{system:'TN-C-S',supply:'1F',mainFuse:'25 A gG'}}).network.system,'TN-C-S');
assert.throws(()=>parse({...board(),network:{system:'IT'}}),/sieci/);

// Import validation for busbars and circuit N bar
assert.equal(parse(board()).busbars.length,1);
assert.throws(()=>parse({...board(),busbars:[{id:'x',type:'2P',side:'t',row:0,from:0,to:1}]}),/szyna/);
assert.throws(()=>parse({...board(),busbars:[{id:'x',type:'1P',side:'t',row:0,from:5,to:18}]}),/szyna/);
assert.throws(()=>parse({...board(),circuits:[{...board().circuits[0],nBar:'F1'}]}),/obwód/);
console.log('Topology checks passed: comb busbars, phase propagation, open devices, shorts, live PE, RCD bypass, shared N, N outside RCD group, missing data, busbar placement, phase balance.');
