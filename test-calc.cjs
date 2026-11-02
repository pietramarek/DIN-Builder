const assert=require('node:assert/strict');
const {TYPES,parse}=require('./dist/model.js');
const {ratedCurrent,crossSection,checkCircuit,analyzeCircuits,IZ}=require('./dist/calc.js');
const dev=(id,type,rating)=>({id,type,row:0,slot:0,label:id,rating:rating??TYPES[type].rating,on:true});
const board=(rating,circuit)=>({version:1,name:'C',components:[dev('F','MCB',rating)],wires:[],circuits:[{id:'c',name:'Obwód',device:'F',power:2000,cable:'3 × 2,5',length:20,method:'C',kind:'other',...circuit}]});

// Parsing of existing free-text fields
assert.equal(ratedCurrent('B16'),16);assert.equal(ratedCurrent('C 10'),10);assert.equal(ratedCurrent('40 A / 30 mA'),40);assert.equal(ratedCurrent('Model ogólny'),null);
assert.equal(crossSection('3 × 2,5'),2.5);assert.equal(crossSection('YDYp 3x1,5'),1.5);assert.equal(crossSection('5 × 4'),4);assert.equal(crossSection('?'),null);

// Reference values from the ampacity table
assert.equal(IZ.C[2.5],27);assert.equal(IZ.A1[1.5],14.5);assert.equal(IZ.B1[4],32);

// Correct: B16 on 2.5 mm² method C (Iz 27 A), short run
let r=checkCircuit(board('B16'),board('B16').circuits[0]);
assert.equal(r.Iz,27);assert.equal(r.issues.filter(i=>i.severity!=='info').length,0,'B16 on 2.5 mm² is fine');
assert.ok(Math.abs(r.dU-200*2000*20/(56*2.5*230*230))<1e-9,'voltage drop formula');

// Error: B20 on 1.5 mm² method A1 (Iz 14.5 A)
let s=board('B20',{cable:'3 × 1,5',method:'A1'});r=checkCircuit(s,s.circuits[0]);
assert.ok(r.issues.some(i=>i.severity==='error'&&i.title.startsWith('Zabezpieczenie za duże')),'In > Iz detected');

// Voltage drop limits: 3 % lighting, 5 % other
s=board('B10',{cable:'3 × 1,5',length:60,power:1500,kind:'light'});r=checkCircuit(s,s.circuits[0]);
assert.ok(r.dU>3);assert.equal(r.limit,3);assert.ok(r.issues.some(i=>i.title.startsWith('Duży spadek')),'lighting over 3 %');
s.circuits[0].kind='other';r=checkCircuit(s,s.circuits[0]);
assert.ok(r.dU<5&&!r.issues.some(i=>i.title.startsWith('Duży spadek')),'same circuit within 5 % as other use');

// Multi-pole circuits: 3P uses the 400 V formula and the three-loaded-conductor table
s={...board('B16',{power:9000,length:30,cable:'5 × 2,5',method:'C'}),components:[dev('F','MCB3','B16')]};r=checkCircuit(s,s.circuits[0]);
assert.equal(r.poles,3);assert.equal(r.Iz,24,'Iz from tab. B.52.4');
assert.ok(Math.abs(r.dU-100*9000*30/(56*2.5*400*400))<1e-9,'3-phase voltage drop formula');
s={...board('B20',{power:7000,length:10,cable:'4 × 2,5',method:'C'}),components:[dev('F','MCB2','B20')]};r=checkCircuit(s,s.circuits[0]);
assert.equal(r.poles,2);assert.ok(Math.abs(r.dU-200*3500*10/(56*2.5*230*230))<1e-9,'2P as two halves');
s={...board('B25',{cable:'5 × 2,5',method:'C'}),components:[dev('F','MCB3','B25')]};r=checkCircuit(s,s.circuits[0]);
assert.ok(r.issues.some(i=>i.severity==='error'&&i.text.includes('B.52.4')),'B25 > 24 A for 3P on 2.5 mm²');

// WLZ: overload check against the pre-meter fuse and voltage drop added to every circuit
const {wlzCheck}=require('./dist/calc.js');
let w3={version:1,name:'W',network:{system:'TN-C-S',supply:'3F',mainFuse:'3 × 32 A gG',wlz:{cable:'YKY 5 × 10',length:20,method:'C',material:'Cu'}},components:[dev('F','MCB','B16')],wires:[],circuits:[{id:'c',name:'Gniazda',device:'F',power:9000,cable:'3 × 2,5',length:20,method:'C',kind:'other'}]};
let wr=wlzCheck(w3);assert.equal(wr.Iz,57,'10 mm² C three loaded');assert.deepEqual(wr.issues,[],'1.6×32=51.2 <= 1.45×57=82.7');
assert.ok(Math.abs(wr.dU-100*9000*20/(56*10*400*400))<1e-9,'WLZ drop at installed power');
w3.network.mainFuse='3 × 40 A gG';w3.network.wlz.cable='YKY 5 × 4';w3.network.wlz.method='A1';wr=wlzCheck(w3);
assert.ok(wr.issues.some(i=>i.severity==='error'&&i.title.startsWith('WLZ za słaba')),'1.6×40=64 > 1.45×24');
w3.network.wlz={cable:'YAKY 4 × 16',length:20,method:'C',material:'Al'};wr=wlzCheck(w3);
assert.ok(Math.abs(wr.dU-100*9000*20/(34*16*400*400))<1e-9,'Al drop uses gamma 34');assert.ok(wr.issues.some(i=>i.title==='Brak danych: obciążalność WLZ aluminiowego'),'no Al ampacity table');
w3.network.wlz={cable:'YKY 5 × 10',length:40,method:'C',material:'Cu'};w3.network.mainFuse='3 × 32 A gG';
const ac=analyzeCircuits(w3),cr=ac.results[0];assert.ok(cr.dUw>0&&Math.abs(cr.dUtotal-(cr.dU+cr.dUw))<1e-12,'circuit drop includes WLZ');
assert.ok(analyzeCircuits({...w3,network:{supply:'3F'}}).issues.some(i=>i.title==='Brak danych: WLZ'),'missing WLZ reported');
assert.throws(()=>parse({...w3,network:{...w3.network,wlz:{method:'Z'}}}),/sieci/);

// Sub-board: the drop at its origin comes from the parent feeder circuit and is added to every circuit
{const sb={version:1,name:'RP',feed:{project:'p1',circuit:'c9'},network:{supply:'3F'},components:[dev('F','MCB','B16')],wires:[],circuits:[{id:'x',name:'Gniazda',device:'F',power:2000,cable:'3 × 2,5',length:20,method:'C',kind:'other'}]};
 let a=analyzeCircuits(sb,{upstream:{dU:1.5,label:'RG / Zasilanie RP'}});assert.equal(a.wlz.fed,true);assert.ok(Math.abs(a.results[0].dUtotal-(a.results[0].dU+1.5))<1e-12);assert.ok(!a.issues.some(i=>i.title==='Brak danych: WLZ'),'own WLZ not required');
 a=analyzeCircuits(sb,{upstream:{dU:null,why:'test'}});assert.ok(a.issues.some(i=>i.title==='Brak danych: spadek napięcia do podrozdzielnicy'));assert.equal(a.results[0].dUw,null);
 assert.equal(parse(sb).feed.circuit,'c9');assert.throws(()=>parse({...sb,feed:{project:'a b'}}),/podrozdzielnicy/)}

// Audit: gG fuses use I2 = 1.6 In (1.9 In below 16 A) against 1.45 Iz
{const f=(rating,cable,method)=>({version:1,name:'F',components:[{id:'F',type:'FUSE1',row:0,slot:0,label:'F',rating,on:true}],wires:[],circuits:[{id:'c',name:'Bojler',device:'F',power:2000,cable,length:10,method,kind:'other'}]});
 let s=f('gG 16 A','3 × 1,5','A1');let r=checkCircuit(s,s.circuits[0]);assert.ok(r.issues.some(i=>i.title.startsWith('Wkładka topikowa za duża')),'16 A gG on 1,5 mm² A1: 25,6 A > 21 A');
 s=f('gG 16 A','3 × 2,5','C');r=checkCircuit(s,s.circuits[0]);assert.ok(!r.issues.some(i=>i.severity==='error'),'16 A gG on 2,5 mm² is fine');
 s=f('gG 10 A','3 × 1,5','A1');r=checkCircuit(s,s.circuits[0]);assert.ok(!r.issues.some(i=>i.severity==='error'),'10 A gG on 1,5 mm² A1: 1,9 × 10 = 19 A ≤ 1,45 × 14,5 = 21 A');
 s=f('gG 13 A','3 × 1,5','A1');r=checkCircuit(s,s.circuits[0]);assert.ok(r.issues.some(i=>i.title.startsWith('Wkładka topikowa za duża')),'13 A gG on 1,5 mm² A1: 24,7 A > 21 A although In < Iz');}

// Missing data stays explicit
s=board('B16',{length:undefined,method:'',kind:''});r=checkCircuit(s,s.circuits[0]);
assert.deepEqual(r.missing,['sposób ułożenia','długość','rodzaj obwodu']);
assert.ok(r.issues.some(i=>i.title.startsWith('Brak danych do obliczeń')));
s=board('Model ogólny',{cable:'przewód'});r=checkCircuit(s,s.circuits[0]);
assert.ok(r.missing.some(m=>m.startsWith('prąd'))&&r.missing.some(m=>m.startsWith('przekrój')));
s=board('B16',{cable:'3 × 25'});r=checkCircuit(s,s.circuits[0]);
assert.ok(r.issues.some(i=>i.title.startsWith('Brak danych: obciążalność')),'cross-section outside table');
assert.equal(analyzeCircuits({...board('B16'),circuits:[{id:'x',name:'Bez aparatu',device:'',power:0,cable:''}]}).issues.length,0,'unassigned circuit adds no calc noise');

// Import validation of the new optional fields
assert.equal(parse(board('B16')).circuits[0].method,'C');
assert.throws(()=>parse(board('B16',{method:'Z9'})),/obwód/);
assert.throws(()=>parse(board('B16',{length:-3})),/obwód/);
assert.throws(()=>parse(board('B16',{kind:'garaż'})),/obwód/);
console.log('Calculation checks passed: parsing, ampacity In<=Iz, voltage drop limits, missing data, import validation.');
