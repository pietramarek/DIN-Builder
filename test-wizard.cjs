const assert=require('node:assert/strict');
const {validate}=require('./dist/model.js');
const {analyze}=require('./dist/topology.js');
const {analyzeCircuits}=require('./dist/calc.js');
const {tree}=require('./dist/schematic.js');
const {generate,protection,SAMPLE,validateInput}=require('./dist/wizard.js');
const base={name:'Dom',supply:'3F',system:'TN-C-S',mainFuse:'3 × 25 A gG',groupSize:6,method:'C',spd:true,modules:18,circuits:SAMPLE};
const errs=s=>[...validate(s),...analyze(s).issues,...analyzeCircuits(s).issues].filter(i=>i.severity==='error');

// Protection choice
assert.deepEqual(protection({kind:'light',phases:1,power:400},'C'),{In:10,S:1.5,curve:'B'});
assert.deepEqual(protection({kind:'socket',phases:1,power:2000},'A1'),{In:16,S:2.5,curve:'B'},'sockets on 2.5 mm² even when A1');
assert.deepEqual(protection({kind:'other',phases:1,power:3500},'C'),{In:16,S:2.5,curve:'B'},'15.2 A -> B16, min. 2.5 mm² for appliances');
assert.deepEqual(protection({kind:'other',phases:1,power:6000},'A1'),{In:32,S:6,curve:'B'},'26 A -> B32; A1 needs 6 mm² (34 A)');
assert.deepEqual(protection({kind:'other',phases:3,power:7400},'C'),{In:13,S:2.5,curve:'B'},'10.7 A three-phase');
assert.ok(protection({kind:'other',phases:1,power:20000},'C').error,'over 40 A is refused');
// Motor/compressor circuits get curve C with the same current/section selection as other appliances
assert.deepEqual(protection({kind:'motor',phases:1,power:3500},'C'),{In:16,S:2.5,curve:'C'},'motor circuits use curve C');
assert.deepEqual(protection({kind:'motor',phases:3,power:7400},'C'),{In:13,S:2.5,curve:'C'});

// Full 3-phase house: valid, every circuit protected, balanced, no errors anywhere
let r=generate(base);
assert.ok(r.state,'generated: '+(r.errors||[]).join(' '));
const s=r.state,t=analyze(s);
assert.deepEqual(errs(s),[],'generated board has no errors: '+errs(s).map(i=>i.title).join(' | '));
assert.equal(t.circuits.length,SAMPLE.length);
assert.ok(t.circuits.every(c=>c.status==='ok'&&c.rcd.length),'every circuit powered and behind an RCD');
assert.equal(t.circuits.find((c,i)=>s.circuits[i].name==='Pompa ciepła').phases.length,3);
const b=t.balance,spread=Math.max(b.L1,b.L2,b.L3)-Math.min(b.L1,b.L2,b.L3),biggest1F=Math.max(...SAMPLE.filter(c=>c.phases===1).map(c=>c.power));
assert.ok(spread<=biggest1F,`phases balanced within one load: ${b.L1}/${b.L2}/${b.L3}`);
assert.equal(r.groups,2,'12 circuits / 6 per RCD');
for(const row of [1,2]){const slots=s.components.filter(c=>c.row===row&&c.type.startsWith('MCB')).flatMap(c=>Array.from({length:c.type==='MCB3'?3:1},(_,k)=>c.slot+k)).sort((a,b)=>a-b);assert.equal(slots.at(-1)-slots[0]+1,slots.length,`row ${row+1}: breakers without gaps`)}
assert.equal(s.modules,18,'fits the default 18-module rails');
assert.ok(t.issues.some(i=>i.title==='Rozdział PEN w rozdzielnicy (TN-C-S)'),'PEN split drawn for TN-C-S');
assert.equal(s.components.filter(c=>c.type==='PENX').length,1,'PEN split terminal used in TN-C-S');
assert.ok(!t.issues.some(i=>i.title.startsWith('Brak danych: listwa N')),'every 1P circuit has its N strip');
const tr=tree(s);assert.equal(tr.roots[0].children.filter(k=>k.device.type==='RCD').length,2,'schematic: two RCD groups under main');
assert.equal(tr.orphans.length,0);

// 1-phase house: 2-pole RCDs, 1P comb, everything on L1
r=generate({...base,supply:'1F',system:'TN-S',circuits:SAMPLE.filter(c=>c.phases===1),groupSize:4});
assert.ok(r.state,(r.errors||[]).join(' '));
assert.deepEqual(errs(r.state),[],'1F board has no errors: '+errs(r.state).map(i=>i.title).join(' | '));
assert.ok(analyze(r.state).circuits.every(c=>c.phase==='L1'));
assert.ok(r.state.components.some(c=>c.type==='RCD2')&&r.state.components.some(c=>c.type==='MAIN2'));
assert.ok(!r.state.wires.some(w=>w.role==='PEN'),'no PEN split in TN-S');

// RCBO mode: every 1-phase circuit on its own RCBO, 3-phase circuits keep an RCD group
for(const sup of ['3F','1F']){
 const rr=generate({...base,supply:sup,rcdMode:'rcbo',circuits:sup==='3F'?SAMPLE:SAMPLE.filter(c=>c.phases===1)});
 assert.ok(rr.state,(rr.errors||[]).join(' '));
 assert.deepEqual(errs(rr.state),[],sup+' RCBO board has no errors: '+errs(rr.state).map(i=>i.title).join(' | '));
 const tt=analyze(rr.state);
 assert.ok(tt.circuits.every(c=>c.status==='ok'&&c.rcd.length),sup+': every circuit powered and residual-current protected');
 assert.equal(rr.state.components.filter(c=>c.type==='RCBO').length,SAMPLE.filter(c=>c.phases===1).length);
 if(sup==='3F'){assert.equal(rr.state.components.filter(c=>c.type==='RCD').length,1,'3-phase circuits in one RCD group');const bb=tt.balance;assert.ok(Math.max(bb.L1,bb.L2,bb.L3)-Math.min(bb.L1,bb.L2,bb.L3)<=2200,'RCBO phases balanced')}
}
assert.ok(validateInput({...base,rcdMode:'x'}).some(e=>e.includes('ochrony')));

// Input validation and limits
assert.ok(validateInput({...base,circuits:[]}).length);
assert.ok(generate({...base,supply:'1F'}).errors.some(e=>e.includes('3-fazowy')));
assert.ok(generate({...base,groupSize:1,circuits:[...SAMPLE,...SAMPLE]}).errors[0].includes('Za dużo rzędów'));
assert.ok(generate({...base,circuits:[{name:'X',power:-5,phases:1,kind:'light'}]}).errors.length);

// RCD type reaches the device's rating text; motor circuits get curve C on their breaker
r=generate({...base,rcdType:'A'});
assert.ok(r.state.components.filter(c=>c.type==='RCD').every(c=>c.rating.includes('typ A')));
assert.ok(validateInput({...base,rcdType:'X'}).some(e=>e.includes('RCD')),'unknown RCD type rejected');
r=generate({...base,circuits:[{name:'Pompa',power:1500,phases:1,kind:'motor'},{name:'Oświetlenie',power:400,phases:1,kind:'light'}],groupSize:6});
assert.ok(r.state,(r.errors||[]).join(' '));
const motorDev=r.state.components.find(c=>c.label==='F1');
assert.ok(motorDev.rating.startsWith('C'),'motor circuit uses curve C: '+motorDev.rating);

// Main switch and RCD ratings are picked from the standard list, not fixed at 40 A
r=generate({...base,supply:'1F',system:'TN-S',circuits:[{name:'Oświetlenie',power:400,phases:1,kind:'light'}],groupSize:4});
const mainDev=r.state.components.find(c=>c.type==='MAIN2');
assert.equal(mainDev.rating,'25 A','small load picks the smallest standard rating, not a fixed 40 A');

// Three single-phase circuits near 40 A each, forced onto the same phase (1F supply has none other): the group
// and the main switch both exceed the largest standard rating (100 A) and generation is refused, not silently capped.
const heavy=[0,1,2].map(i=>({name:'Piec '+i,power:9000,phases:1,kind:'other'}));
let hv=generate({...base,supply:'1F',system:'TN-S',circuits:heavy,groupSize:3,mainFuse:''});
assert.ok(hv.errors&&hv.errors.some(e=>e.includes('RCD')&&e.includes('100 A')),'overloaded RCD group is refused: '+(hv.errors||[]).join(' '));

// A load within standard ratings but above the stated incoming fuse is still generated, with a non-blocking warning
r=generate({...base,supply:'1F',system:'TN-S',circuits:SAMPLE.filter(c=>c.phases===1),groupSize:4,mainFuse:'1 × 16 A gG'});
assert.ok(r.state,(r.errors||[]).join(' '));
assert.ok(r.warnings.some(w=>w.includes('16 A')),'load above the stated incoming fuse is warned, not silently accepted: '+JSON.stringify(r.warnings));
r=generate({...base,mainFuse:''});
assert.deepEqual(r.warnings,[],'no incoming fuse stated -> no fabricated warning');
console.log('Wizard checks passed: protection choice, 3F and 1F boards valid, RCD on every circuit, phase balance, PEN split, schematic, input limits, RCD type, motor curve, main/RCD sizing.');
