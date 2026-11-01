// Single-line diagram derived from the topology: which protective device feeds which, and the circuits below.
// The feed relation uses conductive paths between devices (wires, comb busbars, terminal bars), not screen position.
(function(root){
const M=root.DIN||require('./model.js'),T=root.DINTopology||require('./topology.js');
const {TYPES,ports}=M;
const PROTECTIVE=['MAIN','MAIN2','RCD','MCB','MCB2','MCB3','MCB4','RCBO','SPD'];
const isLive=r=>r==='L'||/^L[123]$/.test(r);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function tree(s){
 const E=T.edges(s).filter(e=>e.kind!=='device'),comp=T.components(E);
 const devs=s.components.filter(c=>PROTECTIVE.includes(c.type));
 const side=(c,sd)=>new Set(ports(c).filter(p=>p.side===sd&&isLive(p.role)).map(p=>comp.get(c.id+':'+p.key)).filter(v=>v!==undefined));
 const top=new Map(devs.map(c=>[c.id,side(c,'t')])),bottom=new Map(devs.map(c=>[c.id,side(c,'b')]));
 const parent=new Map();
 for(const d of devs){
  if(d.type==='MAIN'||d.type==='MAIN2')continue;
  const cands=devs.filter(p=>p.id!==d.id&&p.type!=='SPD'&&[...bottom.get(p.id)].some(x=>top.get(d.id).has(x)));
  // An RCD feeding a breaker is the closer parent than the main switch feeding both through the same conductor.
  const pick=cands.find(c=>c.type!=='MAIN'&&c.type!=='MAIN2')||cands[0];
  if(pick)parent.set(d.id,pick.id);
 }
 const children=id=>devs.filter(d=>parent.get(d.id)===id);
 const byDevice=new Map();for(const c of s.circuits)if(c.device){if(!byDevice.has(c.device))byDevice.set(c.device,[]);byDevice.get(c.device).push(c)}
 // seen guards against feed loops created by unusual wiring
 const node=(d,seen=new Set())=>{if(seen.has(d.id))return{device:d,circuits:[],children:[],loop:true};seen.add(d.id);return{device:d,circuits:byDevice.get(d.id)||[],children:children(d.id).map(k=>node(k,new Set(seen)))}};
 const roots=devs.filter(d=>d.type==='MAIN'||d.type==='MAIN2').map(d=>node(d));
 const reached=new Set();const walk=n=>{reached.add(n.device.id);n.children.forEach(walk)};roots.forEach(walk);
 const orphans=devs.filter(d=>!reached.has(d.id)&&!parent.has(d.id)).map(d=>node(d));
 return{roots,orphans,unassigned:s.circuits.filter(c=>!c.device)};
}

const W=118,H=128,BOX_W=92,BOX_H=54;
function layout(n,depth,x0,out){
 const own=Math.max(1,n.circuits.length);
 let width=0;const kids=[];
 for(const k of n.children){const w=layout(k,depth+1,x0+width,out);kids.push(k);width+=w}
 const leafSpan=n.children.length?0:own;width=Math.max(width,leafSpan,1);
 n.x=(x0+width/2)*W;n.y=depth*H;n.span=width;n.depth=depth;out.push(n);return width;
}
function symbol(d){const t=d.type;if(t==='MAIN'||t==='MAIN2')return'<path d="M-10,-12 L10,4 M-10,8 h20" class="sym"/>';if(t==='RCD'||t==='RCBO')return'<ellipse cx="0" cy="0" rx="12" ry="6" class="sym"/><path d="M-12,8 h24" class="sym"/>';if(t==='SPD')return'<path d="M-8,-10 v14 l8,6 l8,-6 v-14 z" class="sym"/>';return'<path d="M-8,-8 L8,8 M8,-8 L-8,8" class="sym"/>'}
function svg(s){
 const t=tree(s),topo=T.analyze(s),phaseOf=new Map(topo.circuits.map(c=>[c.id,c.phase]));
 const nodes=[];let x=0;const groups=[...t.roots,...t.orphans];
 for(const r of groups)x+=layout(r,1,x,nodes);
 const maxDepth=nodes.reduce((m,n)=>Math.max(m,n.depth+(n.circuits.length&&!n.children.length?1:0)),1);
 const width=Math.max(x,3)*W+300,height=(maxDepth+1)*H+150;
 const net=s.network||{},supply=[net.supply==='1F'?'1~ 230 V':net.supply==='3F'?'3~ 400/230 V':'zasilanie: brak danych',net.system||'układ: brak danych',net.mainFuse?'zabezp. '+net.mainFuse:'zabezp. przedlicznikowe: brak danych'].join(' · ');
 let g='';
 const rootXs=t.roots.map(r=>r.x);
 if(rootXs.length){g+=`<text x="${rootXs[0]+20}" y="22" class="sup">${esc(supply)}</text><path d="M${rootXs[0]+20},30 V${H-BOX_H/2}" class="line"/>`;g+=t.roots.length>1?`<path d="M${Math.min(...rootXs)+20},${H-BOX_H/2-14} H${Math.max(...rootXs)+20}" class="line"/>`:''}
 for(const n of nodes){
  const cx=n.x+20,cy=n.y,d=n.device,orphan=t.orphans.some(o=>o===n);
  if(n.children.length){const xs=n.children.map(k=>k.x+20),busY=cy+BOX_H/2+22;g+=`<path d="M${cx},${cy+BOX_H/2} V${busY}" class="line"/><path d="M${Math.min(...xs,cx)},${busY} H${Math.max(...xs,cx)}" class="line"/>`;for(const kx of xs)g+=`<path d="M${kx},${busY} V${busY+H-BOX_H-22}" class="line"/>`}
  g+=`<g transform="translate(${cx},${cy})"><rect x="${-BOX_W/2}" y="${-BOX_H/2}" width="${BOX_W}" height="${BOX_H}" rx="4" class="box ${orphan?'orphan':''}"/><g transform="translate(${-BOX_W/2+16},0)">${symbol(d)}</g><text x="${-BOX_W/2+32}" y="-8" class="lbl">${esc(d.label)}</text><text x="${-BOX_W/2+32}" y="6" class="sub">${esc(TYPES[d.type].short)}</text><text x="${-BOX_W/2+32}" y="19" class="sub">${esc(d.rating).slice(0,16)}</text></g>`;
  if(!n.children.length&&n.circuits.length){
   const n1=n.circuits.length;
   n.circuits.forEach((c,i)=>{const lx=n.x+20+(i-(n1-1)/2)*W,ly=cy+BOX_H/2;g+=`<path d="M${cx},${ly} V${ly+14} H${lx} V${ly+34}" class="line"/><path d="M${lx-5},${ly+30} l5,8 l5,-8" class="line"/><text x="${lx}" y="${ly+54}" class="cn">${esc(c.name).slice(0,22)}</text><text x="${lx}" y="${ly+67}" class="cs">${esc(phaseOf.get(c.id)||'faza ?')} · ${c.power} W</text><text x="${lx}" y="${ly+79}" class="cs">${esc(c.cable)}${c.length?' · '+c.length+' m':''}</text>`});
  }
 }
 if(t.orphans.length)g+=`<text x="20" y="${height-14}" class="warn">Aparaty bez połączenia z wyłącznikiem głównym: ${esc(t.orphans.map(o=>o.device.label).join(', '))}</text>`;
 if(!groups.length)g+=`<text x="20" y="40" class="warn">Brak wyłącznika głównego i aparatów zabezpieczających – nie ma czego narysować.</text>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" class="sld" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Schemat jednokreskowy"><style>.line{stroke:#1d2b31;stroke-width:1.4;fill:none}.box{fill:#fff;stroke:#1d2b31;stroke-width:1.2}.box.orphan{stroke:#b0453a;stroke-dasharray:4 3}.sym{stroke:#1d2b31;stroke-width:1.6;fill:none}.lbl{font:700 12px system-ui,sans-serif;fill:#132a36}.sub{font:10px system-ui,sans-serif;fill:#51636b}.cn{font:600 10px system-ui,sans-serif;fill:#132a36;text-anchor:middle}.cs{font:9px system-ui,sans-serif;fill:#51636b;text-anchor:middle}.sup{font:11px system-ui,sans-serif;fill:#132a36}.warn{font:11px system-ui,sans-serif;fill:#b0453a}</style>${g}</svg>`;
}
const api={tree,svg};
if(typeof module!=='undefined')module.exports=api;root.DINSchematic=api;
})(typeof window!=='undefined'?window:globalThis);
