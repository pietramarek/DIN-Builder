const assert=require('node:assert/strict');
const {TYPES}=require('./dist/model.js');
const {tree,svg}=require('./dist/schematic.js');
const ML=require('./dist/multiline.js');
const dev=(id,type,row,slot)=>({id,type,row,slot,label:id,rating:TYPES[type].rating,on:true});
let n=0;const wire=(a,ap,b,bp,role='L1')=>({id:'w'+(++n),a:{device:a,port:ap},b:{device:b,port:bp},role,gauge:2.5});
const board=()=>({version:1,name:'S',rows:3,modules:18,network:{system:'TN-C-S',supply:'3F',mainFuse:'3 × 25 A gG'},
 components:[dev('Q0','MAIN',0,0),dev('RCD1','RCD',1,0),dev('F1','MCB',1,4),dev('F2','MCB',1,5),dev('F3','MCB3',1,6),dev('F4','RCBO',2,0),dev('SPD','SPD',0,5),dev('X','MCB',2,6)],
 wires:[wire('Q0','b0','RCD1','t0'),wire('Q0','b1','RCD1','t1','L2'),wire('Q0','b2','RCD1','t2','L3'),wire('Q0','b3','RCD1','t3','N'),
  wire('RCD1','b0','F1','t0'),wire('RCD1','b2','F3','t0','L3'),wire('Q0','b0','F4','t0'),wire('Q0','b0','SPD','t0')],
 busbars:[{id:'SZ',type:'1P',side:'t',row:1,from:4,to:5}],
 circuits:[{id:'a',name:'Gniazda',device:'F1',power:1500,cable:'3 × 2,5'},{id:'b',name:'Pralka',device:'F2',power:2200,cable:'3 × 2,5'},{id:'c',name:'Pompa',device:'F3',power:6000,cable:'5 × 2,5'},{id:'d',name:'Łazienka',device:'F4',power:2000,cable:'3 × 2,5'},{id:'e',name:'Bez aparatu',device:'',power:100,cable:''}]});

const t=tree(board());
const ids=n=>n.children.map(k=>k.device.id).sort();
assert.equal(t.roots.length,1);assert.equal(t.roots[0].device.id,'Q0');
assert.deepEqual(ids(t.roots[0]),['F4','RCD1','SPD'],'main switch feeds RCD, RCBO and SPD');
const rcd=t.roots[0].children.find(k=>k.device.id==='RCD1');
assert.deepEqual(ids(rcd),['F1','F2','F3'],'RCD feeds MCBs directly and through the comb busbar');
assert.deepEqual(rcd.children.find(k=>k.device.id==='F2').circuits.map(c=>c.name),['Pralka'],'circuits hang under their breaker');
assert.deepEqual(t.orphans.map(o=>o.device.id),['X'],'unconnected breaker reported separately');
assert.deepEqual(t.unassigned.map(c=>c.id),['e']);

// Feed loop does not recurse forever
const loop=board();loop.wires.push(wire('F1','b0','RCD1','t0'));
assert.doesNotThrow(()=>tree(loop));

const out=svg(board());
assert.ok(out.startsWith('<svg')&&out.includes('Gniazda')&&out.includes('TN-C-S')&&out.includes('Aparaty bez połączenia'),'SVG contains circuits, network and orphan note');
assert.ok(!svg({...board(),name:'<b>x</b>',circuits:[{id:'z',name:'<script>',device:'F1',power:1,cable:''}]}).includes('<script>'),'text is escaped');
assert.ok(svg({version:1,name:'E',components:[],wires:[],circuits:[]}).includes('nie ma czego narysować'));
// Multi-line schematic: every device and every wire drawn, levels follow the supply, no NaN coordinates
{const s=board(),out=ML.svg(s),L=ML.layout(s),lv=ML.levels(s);
 assert.ok(!/NaN|undefined/.test(out),'no broken coordinates');assert.equal((out.match(/class="ml-wire /g)||[]).length,s.wires.length,'one path per wire');
 assert.equal((out.match(/class="ml-dev"/g)||[]).length,s.components.length,'every device drawn');
 const mains=s.components.filter(c=>c.type==='MAIN');assert.ok(mains.every(m=>lv.get(m.id)===1),'main switch on the first level');
 const deeper=s.components.filter(c=>['MCB','MCB2','MCB3','MCB4'].includes(c.type)&&lv.get(c.id)!=null);assert.ok(deeper.every(c=>lv.get(c.id)>1),'breakers below the main switch');
 assert.ok([...L.box.values()].every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=L.width),'boxes inside the drawing')}
console.log('Schematic checks passed: feed tree, comb busbar, RCD grouping, orphans, loop guard, escaping.');
