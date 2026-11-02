// Multi-line schematic: every pole of every device and every conductor of the model, drawn as SVG.
// Devices are placed in levels by distance from the supply (number of devices passed), wires are drawn as they are
// in the model (no simplification), comb busbars as bars with drops. It is a drawing of the model, not a design check.
(function(root){
const M=root.DIN||require('./model.js'),T=root.DINTopology||require('./topology.js');
const {TYPES,ports,MAIN_TYPES,BUSBARS,BUSBAR_DEVICES}=M;
const COLORS={L:'#7b523c',L1:'#7b523c',L2:'#303e46',L3:'#d23a2f',N:'#2f8cc6',PE:'#3c9a3e',PEN:'#2f7f6a'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PITCH=18,BOX_H=56,LEVEL_H=170,GAP=34,MARGIN=36,HEAD=46;

// Level = devices passed from the supply (all devices treated as closed, so the drawing does not depend on lever state).
function levels(s){
 const closed={...s,components:s.components.map(c=>({...c,on:true}))},E=T.edges(closed),adj=new Map();
 const add=(a,b,w)=>{if(!adj.has(a))adj.set(a,[]);adj.get(a).push([b,w])};
 for(const e of E){const w=e.kind==='device'?1:0;add(e.a,e.b,w);add(e.b,e.a,w)}
 const svc=s.components.filter(c=>c.type==='SUPPLY'),entry=svc.length?svc:s.components.filter(c=>TYPES[c.type].entry);
 const src=entry.length?entry.flatMap(c=>ports(c).map(p=>c.id+':'+p.key)):s.components.filter(c=>MAIN_TYPES.includes(c.type)).flatMap(c=>ports(c).filter(p=>p.side==='t').map(p=>c.id+':'+p.key));
 const dist=new Map(),dq=[];for(const k of src){dist.set(k,0);dq.push(k)}
 while(dq.length){const n=dq.shift(),d=dist.get(n);for(const[m,w]of adj.get(n)||[]){const nd=d+w;if(!dist.has(m)||nd<dist.get(m)){dist.set(m,nd);if(w)dq.push(m);else dq.unshift(m)}}}
 const lv=new Map();
 for(const c of s.components){if(entry.includes(c)){lv.set(c.id,0);continue}const ds=ports(c).map(p=>dist.get(c.id+':'+p.key)).filter(v=>v!==undefined);lv.set(c.id,ds.length?1+Math.min(...ds):null)}
 return lv;
}
const columns=c=>{const t=TYPES[c.type];if(t.grid)return t.grid.poles.length;const ps=ports(c);return Math.max(1,ps.filter(p=>p.side==='t').length,ps.filter(p=>p.side==='b').length)};

function layout(s){
 const raw=levels(s),used=[...raw.values()].filter(v=>v!=null),min=used.length?Math.min(...used):0,lv=new Map([...raw].map(([k,v])=>[k,v==null?null:v-min])),max=Math.max(0,...used.map(v=>v-min)),orphanLevel=max+1,rows=new Map(); // no empty first level when there is no WLZ
 for(const c of s.components){const l=lv.get(c.id)??orphanLevel;if(!rows.has(l))rows.set(l,[]);rows.get(l).push(c)}
 const box=new Map();let width=0;
 for(const[l,cs]of [...rows].sort((a,b)=>a[0]-b[0])){
  cs.sort((a,b)=>(a.row-b.row)||(a.slot-b.slot));let x=MARGIN;
  for(const c of cs){const w=Math.max(64,columns(c)*PITCH+20);box.set(c.id,{x,y:MARGIN+HEAD+l*LEVEL_H,w,h:BOX_H,level:l});x+=w+GAP}
  width=Math.max(width,x);
 }
 return{box,width:Math.max(width,520),height:MARGIN+HEAD+(Math.max(0,...[...rows.keys()])+1)*LEVEL_H,orphanLevel:rows.has(orphanLevel)?orphanLevel:null};
}
// Terminal anchor in drawing coordinates; dir = +1 when the conductor leaves downward, -1 upward.
function anchor(s,L,dev,portKey){
 const c=s.components.find(x=>x.id===dev),b=L.box.get(dev);if(!c||!b)return null;const t=TYPES[c.type],p=ports(c).find(x=>x.key===portKey);if(!p)return null;
 if(p.side==='g'){const n=t.grid.poles.length;return{x:b.x+10+(p.row+.5)*(b.w-20)/n,y:b.y,dir:-1,role:p.role}}
 const n=p.count,x=b.x+10+(p.i+.5)*(b.w-20)/n;
 if(t.entry||t.boxEntry)return{x,y:b.y+b.h,dir:1,role:p.role};
 return p.side==='t'?{x,y:b.y,dir:-1,role:p.role}:{x,y:b.y+b.h,dir:1,role:p.role};
}
function route(a,b,i){
 const off=((i%7)-3)*4;let mid;
 if(a.dir<0&&b.dir<0)mid=Math.min(a.y,b.y)-18-Math.abs(off);
 else if(a.dir>0&&b.dir>0)mid=Math.max(a.y,b.y)+18+Math.abs(off);
 else{const lo=a.dir>0?a:b,hi=a.dir>0?b:a;mid=hi.y>lo.y?(lo.y+hi.y)/2+off:lo.y+22+Math.abs(off)}
 return`M ${a.x} ${a.y} V ${mid} H ${b.x} V ${b.y}`;
}
// Device symbol drawn inside its box: per pole a conductor with the contact (switching devices), trip square (MCB),
// residual-current sensor (RCD), arrester (SPD), meter, lamps, socket, or a bar for terminal strips.
function symbol(s,L,c){
 const t=TYPES[c.type],b=L.box.get(c.id),ps=ports(c),top=ps.filter(p=>p.side==='t'),bot=ps.filter(p=>p.side==='b'),mid=b.y+b.h/2;let g='';
 const X=(p)=>anchor(s,L,c.id,p.key).x;
 if(t.entry||t.boxEntry){g+=`<rect x="${b.x+b.w/2-10}" y="${b.y-6}" width="20" height="${b.h-14}" rx="4" class="ml-sheath"/>`;for(const p of ps){const x=X(p);g+=`<path d="M ${b.x+b.w/2} ${b.y+b.h-20} L ${x} ${b.y+b.h}" stroke="${COLORS[p.role]||'#444'}" class="ml-core"/>`}return g}
 if(t.grid||t.bar){const roles=t.grid?t.grid.poles:[...new Set(ps.map(p=>p.role))];roles.forEach((r,k)=>{const y=b.y+14+k*Math.min(12,(b.h-24)/Math.max(1,roles.length-1));g+=`<line x1="${b.x+6}" x2="${b.x+b.w-6}" y1="${y}" y2="${y}" stroke="${COLORS[r]||'#444'}" class="ml-bar"/>`});
  for(const p of ps){if(p.side==='g')continue;const a=anchor(s,L,c.id,p.key),k=roles.indexOf(p.role),y=b.y+14+k*Math.min(12,(b.h-24)/Math.max(1,roles.length-1));g+=`<line x1="${a.x}" x2="${a.x}" y1="${a.y}" y2="${y}" stroke="${COLORS[p.role]||'#444'}" class="ml-thin"/>`}
  if(t.penBridge)g+=`<text x="${b.x+b.w/2}" y="${b.y+b.h-4}" class="ml-note" text-anchor="middle">mostek PE–N</text>`;return g}
 if(t.spd){for(const p of top){const x=X(p);g+=`<line x1="${x}" x2="${x}" y1="${b.y}" y2="${mid-8}" class="ml-cond"/><rect x="${x-4}" y="${mid-8}" width="8" height="14" class="ml-sym"/><line x1="${x}" x2="${x}" y1="${mid+6}" y2="${mid+14}" class="ml-cond"/>`}
  const xs=top.map(X);g+=`<line x1="${Math.min(...xs)}" x2="${Math.max(...xs)}" y1="${mid+14}" y2="${mid+14}" class="ml-cond"/>`;for(const p of bot){const x=X(p);g+=`<line x1="${x}" x2="${x}" y1="${mid+14}" y2="${b.y+b.h}" class="ml-cond"/>`}return g}
 if(t.noThrough){for(const p of top){const x=X(p);g+=`<line x1="${x}" x2="${x}" y1="${b.y}" y2="${mid-6}" class="ml-cond"/>`;g+=t.socket?'':`<circle cx="${x}" cy="${mid}" r="6" class="ml-sym"/><path d="M ${x-4} ${mid-4} L ${x+4} ${mid+4} M ${x+4} ${mid-4} L ${x-4} ${mid+4}" class="ml-thin"/>`}
  if(t.socket)g+=`<path d="M ${b.x+b.w/2-12} ${mid+4} a 12 12 0 0 1 24 0" class="ml-sym"/><line x1="${X(top[0])}" x2="${b.x+b.w/2-6}" y1="${mid-6}" y2="${mid+4}" class="ml-thin"/><line x1="${X(top[1])}" x2="${b.x+b.w/2+6}" y1="${mid-6}" y2="${mid+4}" class="ml-thin"/>`;
  for(const p of bot){const x=X(p);g+=`<line x1="${x}" x2="${x}" y1="${b.y+b.h}" y2="${mid+6}" class="ml-cond"/>`}return g}
 if(t.meterBottom){for(let k=0;k+1<bot.length;k+=2){const xa=X(bot[k]),xb=X(bot[k+1]);g+=`<path d="M ${xa} ${b.y+b.h} V ${mid-10} H ${xb} V ${b.y+b.h}" class="ml-cond"/>`}return g+`<rect x="${b.x+6}" y="${b.y+6}" width="${b.w-12}" height="14" class="ml-sym ml-fill"/><text x="${b.x+b.w/2}" y="${b.y+17}" text-anchor="middle" class="ml-note">kWh</text>`}
 if(t.changeover){top.forEach((p,i)=>{const x=X(p),xa=anchor(s,L,c.id,'b'+2*i).x,xb=anchor(s,L,c.id,'b'+(2*i+1)).x,on=c.pos===1?xa:c.pos===2?xb:null;g+=`<line x1="${x}" x2="${x}" y1="${b.y}" y2="${mid-6}" class="ml-cond"/><line x1="${xa}" x2="${xa}" y1="${mid+8}" y2="${b.y+b.h}" class="ml-cond"/><line x1="${xb}" x2="${xb}" y1="${mid+8}" y2="${b.y+b.h}" class="ml-cond"/>`+(on!=null?`<line x1="${x}" x2="${on}" y1="${mid-6}" y2="${mid+8}" class="ml-cond"/>`:`<line x1="${x}" x2="${x+6}" y1="${mid-6}" y2="${mid+3}" class="ml-cond"/>`)});return g+`<text x="${b.x+b.w-4}" y="${b.y+12}" text-anchor="end" class="ml-note">${['0','I','II'][c.pos||0]}</text>`}
 if(t.fuse){for(const p of top){const x=X(p);g+=`<line x1="${x}" x2="${x}" y1="${b.y}" y2="${b.y+b.h}" class="ml-cond"/><rect x="${x-4}" y="${mid-10}" width="8" height="20" class="ml-sym ml-fill"/>`}return g}
 const switching=!t.passive,trip=['MAIN','MAIN2','MCB','MCB2','MCB3','MCB4','MCB1N','MPCB','RCBO'].includes(c.type)&&!/^MAIN/.test(c.type),rcd=['RCD','RCD2','RCBO'].includes(c.type);
 for(const p of top){const x=X(p);
  if(t.meter){g+=`<line x1="${x}" x2="${x}" y1="${b.y}" y2="${b.y+b.h}" class="ml-cond"/>`;continue}
  g+=`<line x1="${x}" x2="${x}" y1="${b.y}" y2="${mid-9}" class="ml-cond"/><line x1="${x}" x2="${x+8}" y1="${mid-9}" y2="${mid+5}" class="ml-cond"/><line x1="${x}" x2="${x}" y1="${mid+5}" y2="${b.y+b.h}" class="ml-cond"/>`;
  if(trip&&p.role!=='N')g+=`<rect x="${x-11}" y="${mid+8}" width="7" height="7" class="ml-sym"/>`}
 if(t.meter)g+=`<rect x="${b.x+6}" y="${mid-9}" width="${b.w-12}" height="18" class="ml-sym ml-fill"/><text x="${b.x+b.w/2}" y="${mid+4}" text-anchor="middle" class="ml-note">kWh</text>`;
 if(switching&&top.length>1&&!t.meter){const xs=top.map(X);g+=`<line x1="${Math.min(...xs)+4}" x2="${Math.max(...xs)+4}" y1="${mid-2}" y2="${mid-2}" class="ml-link"/>`}
 if(rcd){const xs=top.map(X);g+=`<ellipse cx="${(Math.min(...xs)+Math.max(...xs))/2}" cy="${mid+18}" rx="${(Math.max(...xs)-Math.min(...xs))/2+10}" ry="5" class="ml-sym"/>`}
 return g;
}
function svg(s){
 const L=layout(s),byId=new Map(s.components.map(c=>[c.id,c]));let g='',w='';
 // level captions
 if(L.orphanLevel!=null)g+=`<text x="${MARGIN}" y="${MARGIN+HEAD+L.orphanLevel*LEVEL_H-26}" class="ml-cap">Bez połączenia z zasilaniem w modelu</text>`;
 for(const c of s.components){const b=L.box.get(c.id),t=TYPES[c.type],names=s.circuits.filter(x=>x.device===c.id).map(x=>x.name);
  g+=`<g class="ml-dev"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4" class="ml-box ${t.entry?'ml-entry':''}"/>${symbol(s,L,c)}`;
  g+=`<text x="${b.x}" y="${b.y-6}" class="ml-label">${esc(c.label)} <tspan class="ml-rating">${esc(t.source2?c.rating:t.entry?(s.network?.wlz?.cable||'WLZ'):c.rating)}</tspan></text>`;
  if(names.length)g+=`<text x="${b.x+b.w/2}" y="${b.y+b.h+30}" text-anchor="middle" class="ml-circ">→ ${esc(names.join(', ').slice(0,40))}${names.join(', ').length>40?'…':''}</text>`;
  g+='</g>'}
 // comb busbars
 for(const bb of s.busbars||[]){const links=T.busbarLinks(s,bb).map(l=>{const[d,p]=l.port.split(':');return anchor(s,L,d,p)}).filter(Boolean);if(!links.length)continue;const y=Math.min(...links.map(a=>a.y))-10,xs=links.map(a=>a.x);
  w+=`<line x1="${Math.min(...xs)-4}" x2="${Math.max(...xs)+4}" y1="${y}" y2="${y}" class="ml-comb"/>`+links.map(a=>`<line x1="${a.x}" x2="${a.x}" y1="${y}" y2="${a.y}" class="ml-combdrop"/>`).join('')+`<text x="${Math.max(...xs)+8}" y="${y+3}" class="ml-note">szyna ${esc(BUSBARS[bb.type].short)}</text>`}
 // wires, exactly as in the model
 s.wires.forEach((x,i)=>{const a=anchor(s,L,x.a.device,x.a.port),b=anchor(s,L,x.b.device,x.b.port);if(!a||!b)return;
  w+=`<path d="${route(a,b,i)}" stroke="${COLORS[x.role]||'#444'}" class="ml-wire ${x.role==='PE'?'pe':x.role==='PEN'?'pen':''}"><title>${esc(x.role)} ${String(x.gauge).replace('.',',')} mm² · ${esc(byId.get(x.a.device)?.label)} → ${esc(byId.get(x.b.device)?.label)}</title></path>`});
 const legend=['L1','L2','L3','N','PE','PEN'].map((r,i)=>`<line x1="${MARGIN+i*70}" x2="${MARGIN+i*70+22}" y1="${MARGIN}" y2="${MARGIN}" stroke="${COLORS[r]}" class="ml-leg ml-wire ${r==='PE'?'pe':r==='PEN'?'pen':''}"/><text x="${MARGIN+i*70+27}" y="${MARGIN+4}" class="ml-note">${r}</text>`).join('');
 return`<svg class="mlsvg" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" role="img" aria-label="Schemat wielokreskowy"><style>.ml-box{fill:#fff;stroke:#7d8a8f;stroke-width:1}.ml-entry{fill:#eef0f1;stroke-dasharray:4 3}.ml-cond{stroke:#243b45;stroke-width:1.6;fill:none}.ml-thin{stroke:#243b45;stroke-width:1;fill:none}.ml-sym{stroke:#243b45;stroke-width:1.2;fill:none}.ml-fill{fill:#f3f6f6}.ml-link{stroke:#243b45;stroke-width:1;stroke-dasharray:3 2}.ml-bar{stroke-width:4}.ml-core{stroke-width:2.4;fill:none}.ml-sheath{fill:#2b3236}.ml-wire{fill:none;stroke-width:2;stroke-linejoin:round}.ml-wire.pe{stroke-dasharray:8 3}.ml-wire.pen{stroke-dasharray:3 2}.ml-comb{stroke:#55606a;stroke-width:5;stroke-linecap:round}.ml-combdrop{stroke:#55606a;stroke-width:2}.ml-label{font:700 11px sans-serif;fill:#243b45}.ml-rating{font-weight:400;fill:#6b7b81}.ml-note{font:9px sans-serif;fill:#51636b}.ml-circ{font:10px sans-serif;fill:#047b77}.ml-cap{font:700 11px sans-serif;fill:#b03a2e}</style>${legend}${w}${g}</svg>`;
}
const api={levels,layout,anchor,svg};
if(typeof module!=='undefined')module.exports=api;root.DINMultiline=api;
})(typeof window!=='undefined'?window:globalThis);
