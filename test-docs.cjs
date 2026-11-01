const assert=require('node:assert/strict');
const {TYPES,parse}=require('./dist/model.js');
const D=require('./dist/docs.js');
const W=require('./dist/wizard.js');
const {analyze}=require('./dist/topology.js');
const dev=(id,type,row,slot,rating)=>({id,type,row,slot,label:id,rating:rating??TYPES[type].rating,on:true});
const board=()=>({version:1,name:'D',rows:2,modules:18,network:{system:'TN-C-S',supply:'3F',wlz:{cable:'YKY 5 × 10',length:20,material:'Cu',cores:5}},
 components:[dev('Q0','MAIN',0,0),dev('RCD1','RCD',0,4,'40 A / 30 mA'),dev('F1','MCB',0,8,'B16'),dev('F2','MCB',0,9,'C10'),dev('F3','MCB3',1,0,'B20'),dev('N1','N',0,15),{...dev('W1','WLZ',-1,0),cores:5}],
 wires:[],busbars:[{id:'b1',type:'3P',side:'t',row:0,from:8,to:9}],
 circuits:[{id:'c1',name:'Gniazda kuchnia',device:'F1',power:2000,cable:'3x2,5',length:20},{id:'c2',name:'Pralka',device:'F1',power:2200,cable:'3 × 2,5',length:10},{id:'c3',name:'Oświetlenie',device:'F2',power:300,cable:'3 × 1,5'},{id:'c4',name:'Płyta',device:'F3',power:7400,cable:'5 × 2,5',length:12}]});

// Bill of materials: cables summed per type with reserve, WLZ listed, entry cable not counted as a device
let rows=D.materialRows(board());
const cab=rows.find(r=>r.name==='Przewód obwodów'&&r.params==='3 × 2,5'&&r.qty!=='');
assert.equal(cab.qty,Math.ceil(30*1.1),'3x2,5 and 3 × 2,5 are one cable type, 30 m + 10%');
assert.ok(rows.some(r=>r.params==='3 × 1,5'&&r.qty===''&&r.where.includes('Oświetlenie')),'missing length reported, not guessed');
assert.equal(rows.find(r=>r.name==='Przewód WLZ').qty,22);
assert.ok(!rows.some(r=>r.name.startsWith('Przewód zasilający WLZ')),'WLZ entry is not a device line');
assert.equal(rows.find(r=>r.name.startsWith('Wyłącznik nadprądowy (')&&r.params==='B16').qty,1);

// CSV: BOM, semicolons, quoting, decimal comma
const csv=D.toCsv([{qty:1.5,unit:'m',name:'A;B',params:'x "y"',where:'',example:''}]);
assert.ok(csv.startsWith('﻿Ilość;Jednostka;'));assert.ok(csv.includes('1,5;m;"A;B";"x ""y""";;'));

// Door labels: one strip per rail, split only between devices, circuit names on the label
let segs=D.labelSegments(board(),15);
assert.deepEqual(segs.map(g=>[g.row,g.from,g.to]),[[0,0,15],[0,15,18],[1,0,15]]);
const f1=segs[0].cells.find(c=>c.id==='F1');assert.equal(f1.title,'F1 · B16');assert.equal(f1.text,'Gniazda kuchnia, Pralka');assert.equal(f1.offset,8);
segs=D.labelSegments(board(),9);assert.ok(segs.every(g=>g.cells.every(c=>c.offset+c.width<=g.to-g.from)),'no device cut by a strip end');
assert.ok(!segs.some(g=>g.cells.some(c=>c.id==='W1')),'WLZ cable has no door label');

// Measurement protocol limits and verdicts
const s=board();s.protocol={circuits:{c1:{zs:2.5,riso:250},c3:{zs:2.4,riso:0.4}},rcd:{RCD1:{t:28,i:22}}};
const P=D.protocolRows(s),c1=P.circuits.find(r=>r.id==='c1'),c3=P.circuits.find(r=>r.id==='c3');
assert.equal(c1.Ia,80);assert.ok(Math.abs(c1.zsMax-230/80)<1e-9);assert.equal(c1.zsOk,true);assert.equal(c1.risoOk,true);
assert.equal(c3.Ia,100,'C10 -> 10·In');assert.equal(c3.zsOk,false,'2,4 Ω > 2,3 Ω');assert.equal(c3.risoOk,false);
assert.equal(P.circuits.find(r=>r.id==='c4').zsOk,null,'not measured');
const r1=P.rcds[0];assert.equal(r1.idn,30);assert.equal(r1.tOk,true);assert.equal(r1.iOk,true);
s.protocol.rcd.RCD1={t:320,i:12};const P2=D.protocolRows(s);assert.equal(P2.rcds[0].tOk,false);assert.equal(P2.rcds[0].iOk,false,'below 0.5 IΔn');
assert.deepEqual(P.summary,{measured:6,failed:2,total:10});

// Protocol import validation
assert.equal(parse(s).protocol.circuits.c1.zs,2.5);
assert.throws(()=>parse({...board(),protocol:{circuits:{c1:{zs:-1}}}}),/protokół/);
assert.throws(()=>parse({...board(),protocol:{circuits:{c1:{zs:1,foo:2}}}}),/protokół/);
assert.throws(()=>parse({...board(),protocol:{object:'x'.repeat(121)}}),/protokół/);

// Enclosure advice: 20 % spare space, smallest common size
let ea=D.enclosureAdvice(board());assert.equal(ea.used,4+4+1+1+3+3);assert.equal(ea.capacity,36);assert.deepEqual(ea.issues,[]);assert.deepEqual(ea.suggest,{rows:1,modules:24},'16 mod. + 20% = 20 -> 1 × 24');
const full=board();full.rows=1;full.modules=18;full.components=full.components.filter(c=>c.row<=0);full.components.push(dev('F9','MCB3',0,10));ea=D.enclosureAdvice(full);assert.equal(ea.used,16);assert.ok(ea.issues.some(i=>i.title==='Mała rezerwa miejsca w obudowie'));assert.deepEqual(ea.suggest,{rows:1,modules:24});

// Built-in templates produce boards without topology errors
for(const t of W.TEMPLATES){const r=W.generate({name:t.name,circuits:t.circuits,modules:18,method:'C',spd:true,...t.opts});assert.ok(!r.errors,t.id+': '+(r.errors||[]).join());assert.deepEqual(analyze(r.state).issues.filter(i=>i.severity==='error'),[],t.id)}
console.log('Document checks passed: materials with cable lengths, CSV, door labels, measurement protocol, templates.');
