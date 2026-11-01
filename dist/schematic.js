// Single-line diagram derived from the topology: which protective device feeds which, and the circuits below.
// The feed relation uses conductive paths between devices (wires, comb busbars, terminal bars), not screen position.
// Symbols, numbering and the title block follow common single-line drawing practice referencing the switchgear/
// protective-device symbol family of IEC 60617-7 (PN-EN 60617-7 is its Polish adoption). The exact graphics of
// that withdrawn, paywalled standard text were not available to verify directly — see SCHEMATIC-SYMBOLS.md for
// what each symbol represents and what is and is not confirmed against the standard itself.
(function(root){
const M=root.DIN||require('./model.js'),T=root.DINTopology||require('./topology.js');
const {TYPES,ports}=M;
const PROTECTIVE=['MAIN','MAIN2','RCD','RCD2','MCB','MCB2','MCB3','MCB4','RCBO','SPD','SPD12','METER1','METER3','KM2','KM4','RB','ZEG'];
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
  const cands=devs.filter(p=>p.id!==d.id&&!TYPES[p.type].noThrough&&[...bottom.get(p.id)].some(x=>top.get(d.id).has(x)));
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

const W=118,H=128,BOX_W=92,BOX_H=54,FOOT_H=160;
function layout(n,depth,x0,out){
 const own=Math.max(1,n.circuits.length);
 let width=0;const kids=[];
 for(const k of n.children){const w=layout(k,depth+1,x0+width,out);kids.push(k);width+=w}
 const leafSpan=n.children.length?0:own;width=Math.max(width,leafSpan,1);
 n.x=(x0+width/2)*W;n.y=depth*H;n.span=width;n.depth=depth;out.push(n);return width;
}
// Live poles (L/L1/L2/L3) and whether N is switched, read from the device's own pole list (model.js TYPES), not guessed.
function polesLabel(t){const p=TYPES[t].poles||[];const live=p.filter(r=>r==='L'||/^L[123]$/.test(r)).length,hasN=p.includes('N');if(!live)return hasN?'N':'';return hasN?`${live}P+N`:`${live}P`}
// Simplified single-line symbol: a diagonal switch-contact tick on the conductor, a small square for an automatic
// thermal-magnetic release, and a circle for a residual-current (toroidal) sensor. SPD gets its own arrester symbol.
function symbol(d){
 const t=d.type;
 if(TYPES[t].meter)return'<path d="M0,-16 V-11 M0,11 V16" class="sym"/><circle r="11" class="sym thin"/><text y="3" text-anchor="middle" font-size="7" font-weight="700">kWh</text>';
 if(TYPES[t].spd)return'<rect x="-7" y="-13" width="14" height="24" class="sym"/><path d="M-4,-8 L4,8 M4,-8 L0,0 M-4,8 L0,0" class="sym thin"/>';
 const hasTrip=!['RCD','RCD2'].includes(t)&&!TYPES[t].switching,hasRCD=['RCD','RCD2','RCBO'].includes(t);
 let g='<path d="M0,-16 V-6 L9,7" class="sym"/><path d="M9,7 V16" class="sym"/><circle cx="0" cy="-16" r="1.6" class="dot"/><circle cx="9" cy="16" r="1.6" class="dot"/>';
 if(hasTrip)g+='<rect x="12" y="-2" width="8" height="8" class="sym thin"/>';
 if(hasRCD)g+='<circle cx="2" cy="-3" r="13" class="sym thin"/>';
 return g;
}
const SYMBOL_GROUPS=[
 {test:t=>['RCD','RCD2','RCBO'].includes(t),key:'rcd',label:'Wyłącznik różnicowoprądowy (łącznik + czujnik toroidalny)'},
 {test:t=>['MAIN','MAIN2','MCB','MCB2','MCB3','MCB4'].includes(t),key:'mcb',label:'Wyłącznik nadprądowy / główny (łącznik + wyzwalacz termiczno-magnetyczny)'},
 {test:t=>!!TYPES[t].spd,key:'spd',label:'Ogranicznik przepięć (SPD)'},
 {test:t=>!!TYPES[t].switching,key:'sw',label:'Łącznik sterowany (stycznik, przekaźnik, zegar) – styk bez wyzwalacza'},
 {test:t=>!!TYPES[t].meter,key:'kwh',label:'Licznik energii'},
];
function svg(s){
 const t=tree(s),topo=T.analyze(s),phaseOf=new Map(topo.circuits.map(c=>[c.id,c.phase])),circuitNo=new Map(s.circuits.map((c,i)=>[c.id,i+1]));
 const nodes=[];let x=0;const groups=[...t.roots,...t.orphans];
 for(const r of groups)x+=layout(r,1,x,nodes);
 // Drawing numbers follow reading order (top row left-to-right, then the next row), not the internal feed-tree order.
 [...nodes].sort((a,b)=>a.depth-b.depth||a.x-b.x).forEach((n,i)=>n.num=i+1);
 const maxDepth=nodes.reduce((m,n)=>Math.max(m,n.depth+(n.circuits.length&&!n.children.length?1:0)),1);
 const width=Math.max(x,3)*W+300,height=(maxDepth+1)*H+150+FOOT_H;
 const footY=height-FOOT_H;
 const net=s.network||{},supply=[net.supply==='1F'?'1~ 230 V':net.supply==='3F'?'3~ 400/230 V':'zasilanie: brak danych',net.system||'układ: brak danych',net.mainFuse?'zabezp. '+net.mainFuse:'zabezp. przedlicznikowe: brak danych',net.wlz?.cable?'WLZ '+net.wlz.cable+(net.wlz.material?' '+net.wlz.material:'')+(net.wlz.cores?', '+net.wlz.cores+' żył':'')+(net.wlz.length?', '+net.wlz.length+' m':''):'WLZ: brak danych'].join(' · ');
 let g='';
 const rootXs=t.roots.map(r=>r.x);
 if(rootXs.length){g+=`<text x="${rootXs[0]+20}" y="22" class="sup">${esc(supply)}</text><path d="M${rootXs[0]+20},30 V${H-BOX_H/2}" class="line"/>`;g+=t.roots.length>1?`<path d="M${Math.min(...rootXs)+20},${H-BOX_H/2-14} H${Math.max(...rootXs)+20}" class="line"/>`:''}
 for(const n of nodes){
  const cx=n.x+20,cy=n.y,d=n.device,orphan=t.orphans.some(o=>o===n),pl=polesLabel(d.type);
  if(n.children.length){const xs=n.children.map(k=>k.x+20),busY=cy+BOX_H/2+22;g+=`<path d="M${cx},${cy+BOX_H/2} V${busY}" class="line"/><path d="M${Math.min(...xs,cx)},${busY} H${Math.max(...xs,cx)}" class="line"/>`;for(const kx of xs)g+=`<path d="M${kx},${busY} V${busY+H-BOX_H-22}" class="line"/>`}
  g+=`<g transform="translate(${cx},${cy})"><rect x="${-BOX_W/2}" y="${-BOX_H/2}" width="${BOX_W}" height="${BOX_H}" rx="4" class="box ${orphan?'orphan':''}"/><circle cx="${-BOX_W/2+9}" cy="${-BOX_H/2+9}" r="8" class="num"/><text x="${-BOX_W/2+9}" y="${-BOX_H/2+12}" class="numt">${n.num}</text><g transform="translate(${-BOX_W/2+16},0)">${symbol(d)}</g><text x="${-BOX_W/2+36}" y="-8" class="lbl">${esc(d.label)}</text><text x="${-BOX_W/2+36}" y="6" class="sub">${esc(TYPES[d.type].short)}${pl?' · '+pl:''}</text><text x="${-BOX_W/2+36}" y="19" class="sub">${esc(d.rating).slice(0,16)}</text></g>`;
  if(!n.children.length&&n.circuits.length){
   const n1=n.circuits.length;
   n.circuits.forEach((c,i)=>{const lx=n.x+20+(i-(n1-1)/2)*W,ly=cy+BOX_H/2;g+=`<path d="M${cx},${ly} V${ly+14} H${lx} V${ly+34}" class="line"/><path d="M${lx-5},${ly+30} l5,8 l5,-8" class="line"/><text x="${lx}" y="${ly+54}" class="cn">${circuitNo.get(c.id)}. ${esc(c.name).slice(0,20)}</text><text x="${lx}" y="${ly+67}" class="cs">${esc(phaseOf.get(c.id)||'faza ?')} · ${c.power} W</text><text x="${lx}" y="${ly+79}" class="cs">${esc(c.cable)}${c.length?' · '+c.length+' m':''}</text>`});
  }
 }
 if(t.orphans.length)g+=`<text x="20" y="${footY-26}" class="warn">Aparaty bez połączenia z wyłącznikiem głównym: ${esc(t.orphans.map(o=>o.device.label).join(', '))}</text>`;
 if(!groups.length)g+=`<text x="20" y="40" class="warn">Brak wyłącznika głównego i aparatów zabezpieczających – nie ma czego narysować.</text>`;
 g+=legend(s.components,footY,width)+titleBlock(s,footY,width);
 return `<svg xmlns="http://www.w3.org/2000/svg" class="sld" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Schemat jednokreskowy"><style>.line{stroke:#1d2b31;stroke-width:1.4;fill:none}.box{fill:#fff;stroke:#1d2b31;stroke-width:1.2}.box.orphan{stroke:#b0453a;stroke-dasharray:4 3}.sym{stroke:#1d2b31;stroke-width:1.6;fill:none}.sym.thin{stroke-width:1.1}.dot{fill:#1d2b31}.num{fill:#eef3f4;stroke:#8b9ba1;stroke-width:1}.numt{font:700 9px system-ui,sans-serif;fill:#51636b;text-anchor:middle}.lbl{font:700 12px system-ui,sans-serif;fill:#132a36}.sub{font:10px system-ui,sans-serif;fill:#51636b}.cn{font:600 10px system-ui,sans-serif;fill:#132a36;text-anchor:middle}.cs{font:9px system-ui,sans-serif;fill:#51636b;text-anchor:middle}.sup{font:11px system-ui,sans-serif;fill:#132a36}.warn{font:11px system-ui,sans-serif;fill:#b0453a}.lg{font:700 10px system-ui,sans-serif;fill:#132a36}.lgt{font:9px system-ui,sans-serif;fill:#51636b}.tb{font:9px system-ui,sans-serif;fill:#51636b}.tbv{font:700 10px system-ui,sans-serif;fill:#132a36}.tbline{stroke:#c8d2d5;stroke-width:1}</style>${g}</svg>`;
}
// Legend of only the symbol families actually used in this diagram (keeps it short on simple boards).
function legend(components,footY,width){
 const types=new Set(components.map(c=>c.type)),used=SYMBOL_GROUPS.filter(gr=>[...types].some(gr.test));
 if(!used.length)return'';
 const x=20,y=footY+16;
 let out=`<text x="${x}" y="${y}" class="lg">Legenda symboli (schemat poglądowy wg IEC 60617-7 / PN-EN 60617-7 – zob. SCHEMATIC-SYMBOLS.md)</text>`;
 used.forEach((gr,i)=>{const ly=y+26+i*22;out+=`<g transform="translate(${x+14},${ly})">${symbol({type:{rcd:'RCD',spd:'SPD',sw:'KM2',kwh:'METER1'}[gr.key]||'MCB'})}</g><text x="${x+40}" y="${ly+4}" class="lgt">${esc(gr.label)}</text>`});
 return out;
}
// Simplified drawing title block (PN-EN ISO 7200 style fields), not a substitute for formal project documentation.
function titleBlock(s,footY,width){
 const w=260,h=96,x=width-w-20,y=footY+16,row=h/4,net=s.network||{};
 const field=(ry,label,value)=>`<text x="${x+6}" y="${y+ry+row-6}" class="tb">${esc(label)}</text><text x="${x+w-6}" y="${y+ry+row-6}" class="tbv" text-anchor="end">${esc(value)}</text>${ry?`<path d="M${x},${y+ry} H${x+w}" class="tbline"/>`:''}`;
 return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" class="box"/>${field(0,'Projekt',s.name)}${field(row,'Treść rysunku','Schemat jednokreskowy (poglądowy)')}${field(row*2,'Data',new Date().toLocaleDateString('pl-PL'))}${field(row*3,'Układ / zasilanie',[net.system,net.supply].filter(Boolean).join(' · ')||'brak danych')}</g>`;
}
const api={tree,svg};
if(typeof module!=='undefined')module.exports=api;root.DINSchematic=api;
})(typeof window!=='undefined'?window:globalThis);
