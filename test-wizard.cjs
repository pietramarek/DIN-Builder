const assert=require('node:assert/strict');
const {validate}=require('./dist/model.js');
const {analyze}=require('./dist/topology.js');
const {analyzeCircuits}=require('./dist/calc.js');
const {tree}=require('./dist/schematic.js');
const {generate,protection,SAMPLE,validateInput}=require('./dist/wizard.js');
const base={name:'Dom',supply:'3F',system:'TN-C-S',mainFuse:'3 × 25 A gG',groupSize:6,method:'C',spd:true,modules:18,circuits:SAMPLE};
const errs=s=>[...validate(s),...analyze(s).issues,...analyzeCircuits(s).issues].filter(i=>i.severity==='error');

// Protection choice
assert.deepEqual(protection({kind:'light',phases:1,power:400},'C'),{In:10,S:1.5});
assert.deepEqual(protection({kind:'socket',phases:1,power:2000},'A1'),{In:16,S:2.5},'sockets on 2.5 mm² even when A1');
assert.deepEqual(protection({kind:'other',phases:1,power:3500},'C'),{In:16,S:2.5},'15.2 A -> B16, min. 2.5 mm² for appliances');
assert.deepEqual(protection({kind:'other',phases:1,power:6000},'A1'),{In:32,S:6},'26 A -> B32; A1 needs 6 mm² (34 A)');
assert.deepEqual(protection({kind:'other',phases:3,power:7400},'C'),{In:13,S:2.5},'10.7 A three-phase');
assert.ok(protection({kind:'other',phases:1,power:20000},'C').error,'over 40 A is refused');

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

// Input validation and limits
assert.ok(validateInput({...base,circuits:[]}).length);
assert.ok(generate({...base,supply:'1F'}).errors.some(e=>e.includes('3-fazowy')));
assert.ok(generate({...base,groupSize:1,circuits:[...SAMPLE,...SAMPLE]}).errors[0].includes('Za dużo grup'));
assert.ok(generate({...base,circuits:[{name:'X',power:-5,phases:1,kind:'light'}]}).errors.length);
console.log('Wizard checks passed: protection choice, 3F and 1F boards valid, RCD on every circuit, phase balance, PEN split, schematic, input limits.');
