// Project documents without DOM: bill of materials (with cable lengths and CSV), door label strips, measurement protocol.
// Pure functions so they run in the browser and in node tests.
(function(root){
const M=root.DIN||require('./model.js');
const {TYPES,BUSBARS,CIRCUIT_DEVICES,exampleName,dims}=M;
const RESERVE=0.10; // cable reserve added to lengths from the circuit list
const pl=n=>String(Math.round(n*10)/10).replace('.',',');
const normCable=t=>String(t||'').trim().replace(/\s+/g,' ').replace(/(\d)\s*[xX×]\s*(\d)/g,'$1 × $2');

// ---------- Bill of materials
function materialRows(s){
 const rows=[],net=s.network||{},order=Object.keys(TYPES);
 const groups=new Map();
 for(const c of s.components){if(TYPES[c.type].entry)continue;const k=c.type+'|'+c.rating+'|'+(c.cores||'');if(!groups.has(k))groups.set(k,{type:c.type,rating:c.rating,cores:c.cores,labels:[]});groups.get(k).labels.push(c.label)}
 for(const g of [...groups.values()].sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type)))rows.push({qty:g.labels.length,unit:'szt.',name:`${TYPES[g.type].name} (${TYPES[g.type].width} mod.)`,params:g.rating+(g.cores?`, ${g.cores} żył`:''),where:g.labels.join(', '),example:exampleName(g.type)});
 const bb=new Map();for(const b of s.busbars||[]){const k=b.type+'|'+(b.to-b.from+1);if(!bb.has(k))bb.set(k,{type:b.type,len:b.to-b.from+1,where:[]});bb.get(k).where.push(`rząd ${b.row+1}, mod. ${b.from+1}–${b.to+1}`)}
 for(const g of bb.values())rows.push({qty:g.where.length,unit:'szt.',name:BUSBARS[g.type].name,params:`${g.len} mod. (do przycięcia)`,where:g.where.join('; '),example:''});
 const hasWlz=s.components.some(c=>TYPES[c.type].entry)||net.wlz?.cable;
 if(hasWlz){const w=net.wlz||{};rows.push({qty:w.length>0?Math.ceil(w.length*(1+RESERVE)):'',unit:'m',name:'Przewód WLZ',params:[w.cable||'przewód: brak danych',w.material,w.cores?w.cores+' żył':''].filter(Boolean).join(', '),where:w.length>0?`${pl(w.length)} m z projektu + ${RESERVE*100}% zapasu`:'długość: brak danych',example:''})}
 const cables=new Map();
 for(const c of s.circuits){const k=normCable(c.cable)||'przewód: brak danych';if(!cables.has(k))cables.set(k,{sum:0,names:[],missing:[]});const g=cables.get(k);if(c.length>0){g.sum+=c.length;g.names.push(c.name)}else g.missing.push(c.name)}
 for(const[k,g]of cables){
  if(g.names.length)rows.push({qty:Math.ceil(g.sum*(1+RESERVE)),unit:'m',name:'Przewód obwodów',params:k,where:`${g.names.length} obw. (${pl(g.sum)} m + ${RESERVE*100}% zapasu): ${g.names.join(', ')}`,example:''});
  if(g.missing.length)rows.push({qty:'',unit:'m',name:'Przewód obwodów',params:k,where:`brak długości w ${g.missing.length} obw.: ${g.missing.join(', ')}`,example:''});
 }
 const wires=new Map();for(const w of s.wires){const k=w.role+'|'+w.gauge;wires.set(k,(wires.get(k)||0)+1)}
 for(const[k,n]of wires){const[role,g]=k.split('|');rows.push({qty:n,unit:'odc.',name:'Przewód w rozdzielnicy (linka)',params:`${role} ${String(g).replace('.',',')} mm²`,where:'odcinki między aparatami',example:'długość wg obudowy'})}
 return rows;
}
// Semicolon-separated CSV with a UTF-8 BOM, as Excel in Polish locale expects.
function toCsv(rows){
 const q=v=>{const t=String(v??'');return /[;"\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
 const head=['Ilość','Jednostka','Element','Parametry','Oznaczenia / uwagi','Przykład handlowy'];
 return '﻿'+[head,...rows.map(r=>[typeof r.qty==='number'?String(r.qty).replace('.',','):r.qty,r.unit,r.name,r.params,r.where,r.example])].map(r=>r.map(q).join(';')).join('\r\n')+'\r\n';
}

// ---------- Door label strips
// Each rail becomes one or more strips of at most maxModules (to fit the page), cut only between devices.
function labelText(s,c){
 const names=s.circuits.filter(x=>x.device===c.id).map(x=>x.name);
 const t=TYPES[c.type],rated=CIRCUIT_DEVICES.includes(c.type)||['MAIN','MAIN2','RCD','RCD2'].includes(c.type);
 return{title:c.label+(rated&&c.rating?' · '+c.rating:''),text:names.length?names.join(', '):t.name};
}
function labelSegments(s,maxModules=15){
 const d=dims(s),out=[];
 for(let row=0;row<d.rows;row++){
  const comps=s.components.filter(c=>c.row===row).sort((a,b)=>a.slot-b.slot);if(!comps.length)continue;
  let from=0;
  while(from<d.modules){
   let to=Math.min(from+maxModules,d.modules);
   const cut=comps.find(c=>c.slot<to&&c.slot+TYPES[c.type].width>to);if(cut&&cut.slot>from)to=cut.slot;
   const cells=comps.filter(c=>c.slot>=from&&c.slot<to).map(c=>({id:c.id,offset:c.slot-from,width:TYPES[c.type].width,...labelText(s,c)}));
   if(cells.length)out.push({row,from,to,cells});
   from=to;
  }
 }
 return out;
}

// ---------- Measurement protocol
// Loop impedance: Zs × Ia ≤ U0 (PN-HD 60364-4-41, 411.4.4), Ia = instantaneous trip current of the MCB curve
// (B 5·In, C 10·In, D 20·In). Insulation ≥ 1 MΩ at 500 V DC (PN-HD 60364-6, tab. 6.1).
// RCD (general type): trip time at IΔn ≤ 300 ms; trip current between 0.5 and 1.0 IΔn.
const U0=230,CURVE_K={B:5,C:10,D:20},RISO_MIN=1,RCD_T_MAX=300;
function breakerData(rating){const m=String(rating||'').match(/\b([BCD])\s*(\d+(?:[.,]\d+)?)/);return m?{curve:m[1],In:Number(m[2].replace(',','.'))}:null}
const idnOf=rating=>{const m=String(rating||'').match(/(\d+(?:[.,]\d+)?)\s*mA/);return m?Number(m[1].replace(',','.')):null};
const verdict=(v,ok)=>v==null?null:ok;
function protocolRows(s){
 const p=s.protocol||{},byId=new Map(s.components.map(c=>[c.id,c]));
 const circuits=s.circuits.map((c,i)=>{const dev=byId.get(c.device),b=dev&&CIRCUIT_DEVICES.includes(dev.type)?breakerData(dev.rating):null,Ia=b?CURVE_K[b.curve]*b.In:null,zsMax=Ia?U0/Ia:null,m=p.circuits?.[c.id]||{};
  return{id:c.id,nr:i+1,name:c.name,device:dev?dev.label:'',rating:dev?dev.rating:'',Ia,zsMax,zs:m.zs??null,riso:m.riso??null,zsOk:verdict(m.zs,zsMax!=null?m.zs<=zsMax:null),risoOk:verdict(m.riso,m.riso>=RISO_MIN)}});
 const rcds=s.components.filter(c=>['RCD','RCD2','RCBO'].includes(c.type)).sort((a,b)=>a.row-b.row||a.slot-b.slot).map(c=>{const idn=idnOf(c.rating),m=p.rcd?.[c.id]||{};
  return{id:c.id,label:c.label,rating:c.rating,idn,t:m.t??null,i:m.i??null,tOk:verdict(m.t,m.t<=RCD_T_MAX),iOk:verdict(m.i,idn!=null?m.i>=0.5*idn&&m.i<=idn:null)}});
 const marks=[...circuits.flatMap(r=>[r.zsOk,r.risoOk]),...rcds.flatMap(r=>[r.tOk,r.iOk])];
 return{circuits,rcds,summary:{measured:marks.filter(v=>v!==null).length,failed:marks.filter(v=>v===false).length,total:marks.length}};
}

// Enclosure size: modules taken by rail devices and the smallest common enclosure with the reserve below.
// The 20 % spare space is a practical recommendation (later extensions, heat), not a normative value.
const SPARE=0.2,SIZES=[];for(let r=1;r<=8;r++)for(const m of [12,18,24])SIZES.push({rows:r,modules:m});SIZES.sort((a,b)=>a.rows*a.modules-b.rows*b.modules||a.rows-b.rows);
function enclosureAdvice(s){
 const d=dims(s),rail=s.components.filter(c=>c.row>=0),used=rail.reduce((n,c)=>n+TYPES[c.type].width,0),capacity=d.rows*d.modules,widest=Math.max(0,...rail.map(c=>TYPES[c.type].width)),need=Math.ceil(used*(1+SPARE));
 const suggest=used?SIZES.find(z=>z.rows*z.modules>=need&&z.modules>=widest)||null:null,freePct=capacity?Math.round(100*(capacity-used)/capacity):0,issues=[];
 if(used&&capacity-used<used*SPARE)issues.push({severity:'info',title:'Mała rezerwa miejsca w obudowie',text:`Wolne ${capacity-used} z ${capacity} modułów (${freePct}%). Zaleca się około ${Math.round(SPARE*100)}% rezerwy na rozbudowę i odprowadzanie ciepła${suggest?` – np. obudowa ${suggest.rows} × ${suggest.modules} mod.`:''}. To zalecenie praktyczne, nie wymóg normy.`});
 return{used,capacity,freePct,need,suggest,issues};
}
const api={enclosureAdvice,RESERVE,U0,CURVE_K,RISO_MIN,RCD_T_MAX,normCable,materialRows,toCsv,labelSegments,breakerData,protocolRows};
if(typeof module!=='undefined')module.exports=api;root.DINDocs=api;
})(typeof window!=='undefined'?window:globalThis);
