// Circuit checks: protective device vs cable ampacity (In <= Iz) and voltage drop of the final circuit.
// Scope and assumptions are reported with every result; missing input is reported as missing, never assumed.
(function(root){
const M=root.DIN||require('./model.js');
const {TYPES}=M;

// PN-HD 60364-5-52, tab. B.52.2: copper, PVC insulation (70 °C), two loaded conductors, ambient 30 °C, values in A.
// No correction for ambient temperature, grouping or thermal insulation is applied.
const IZ={A1:{1.5:14.5,2.5:19.5,4:26,6:34,10:46,16:61},A2:{1.5:14,2.5:18.5,4:25,6:32,10:43,16:57},B1:{1.5:17.5,2.5:24,4:32,6:41,10:57,16:76},B2:{1.5:16.5,2.5:23,4:30,6:38,10:52,16:69},C:{1.5:19.5,2.5:27,4:36,6:46,10:63,16:85}};
// PN-HD 60364-5-52, tab. B.52.4: as above but three loaded conductors.
const IZ3={A1:{1.5:13.5,2.5:18,4:24,6:31,10:42,16:56},A2:{1.5:13,2.5:17.5,4:23,6:29,10:39,16:52},B1:{1.5:15.5,2.5:21,4:28,6:36,10:50,16:68},B2:{1.5:15,2.5:20,4:27,6:34,10:46,16:62},C:{1.5:17.5,2.5:24,4:32,6:41,10:57,16:76}};
const METHODS={A1:'A1 – przewody jednożyłowe w rurce w ścianie izolacyjnej',A2:'A2 – przewód wielożyłowy w rurce w ścianie izolacyjnej',B1:'B1 – przewody jednożyłowe w rurce na ścianie / w tynku',B2:'B2 – przewód wielożyłowy w rurce na ścianie',C:'C – przewód na ścianie lub pod tynkiem (bezpośrednio)'};
const KINDS={light:'oświetlenie',other:'gniazda / inne'};
// Recommended maximum voltage drop for installations supplied from a public LV network: PN-HD 60364-5-52, annex G (informative).
const LIMIT={light:3,other:5};
const GAMMA_CU=56,UN=230,UL=400; // m/(Ω·mm²) at 20 °C; nominal phase voltage

const num=s=>Number(String(s).replace(',','.'));
function ratedCurrent(rating){const m=String(rating||'').match(/\b[BCDKZ]\s*(\d+(?:[.,]\d+)?)\b/i)||String(rating||'').match(/(\d+(?:[.,]\d+)?)\s*A\b/);return m?num(m[1]):null}
function crossSection(cable){const m=String(cable||'').match(/[x×]\s*(\d+(?:[.,]\d+)?)/i);return m?num(m[1]):null}
const fmt=(v,d=1)=>v.toLocaleString('pl-PL',{maximumFractionDigits:d,minimumFractionDigits:d});

function fuseAmps(text){const m=String(text||'').match(/(\d+(?:[.,]\d+)?)\s*A\b/);return m?num(m[1]):null}
// Internal supply line (WLZ) from the meter to the board. Its voltage drop is computed from the total installed power
// (no diversity factor; 3-phase assumes balanced phases) and added to each circuit, so limits apply from the origin.
// Overload: gG fuses need 1.6·In ≤ 1.45·Iz (PN-HD 60364-4-43, conventional fusing current I2 = 1.6·In); otherwise In ≤ Iz.
function wlzCheck(s){
 const n=s.network||{},w=n.wlz||{},three=n.supply!=='1F',out={S:crossSection(w.cable),length:w.length,method:w.method||'',In:fuseAmps(n.mainFuse),gG:/\bgG\b/i.test(n.mainFuse||''),Iz:null,dU:null,issues:[]};
 const missing=[];if(out.S==null)missing.push('przekrój przewodu (np. YKY 5 × 10)');if(!(w.length>0))missing.push('długość');if(!w.method)missing.push('sposób ułożenia');
 if(missing.length&&s.circuits.some(c=>c.device))out.issues.push({severity:'info',title:'Brak danych: WLZ',text:'Spadek napięcia obwodów jest liczony tylko od rozdzielnicy, a obciążalność WLZ nie została sprawdzona. Uzupełnij w parametrach sieci: '+missing.join(', ')+'.'});
 if(out.S!=null&&w.method){out.Iz=(three?IZ3:IZ)[w.method]?.[out.S]??null;
  if(out.Iz==null)out.issues.push({severity:'info',title:'Brak danych: obciążalność WLZ',text:`Tabela w programie obejmuje przekroje 1,5–16 mm² Cu; ${fmt(out.S,1)} mm² nie jest w niej ujęty.`});
  else if(out.In==null)out.issues.push({severity:'info',title:'Brak danych: zabezpieczenie przedlicznikowe',text:'Podaj prąd zabezpieczenia przedlicznikowego (np. 3 × 25 A gG), aby sprawdzić obciążalność WLZ.'});
  else{const ok=out.gG?1.6*out.In<=1.45*out.Iz:out.In<=out.Iz;if(!ok)out.issues.push({severity:'error',title:'WLZ za słaba dla zabezpieczenia przedlicznikowego',text:out.gG?`1,6 × ${fmt(out.In,0)} A = ${fmt(1.6*out.In,1)} A > 1,45 × Iz = ${fmt(1.45*out.Iz,1)} A (Cu ${fmt(out.S,1)} mm², ułożenie ${w.method}, ${three?'trzy':'dwie'} żyły obciążone, 30 °C – PN-HD 60364-4-43 i 60364-5-52). Zwiększ przekrój WLZ.`:`In = ${fmt(out.In,0)} A > Iz = ${fmt(out.Iz,1)} A (Cu ${fmt(out.S,1)} mm², ułożenie ${w.method}). Zwiększ przekrój WLZ.`})}}
 const P=s.circuits.reduce((a,c)=>a+(Number(c.power)||0),0);
 if(out.S!=null&&w.length>0&&P>0)out.dU=three?100*P*w.length/(GAMMA_CU*out.S*UL*UL):200*P*w.length/(GAMMA_CU*out.S*UN*UN);
 return out;
}
function checkCircuit(s,c,wlz){
 const dev=s.components.find(x=>x.id===c.device),r={id:c.id,In:null,S:null,Iz:null,dU:null,limit:null,missing:[],issues:[]};
 const name=c.name;
 if(!dev){r.missing.push('aparat');return r}
 r.In=ratedCurrent(dev.rating);r.S=crossSection(c.cable);r.poles=M.ports(dev).filter(p=>p.side==='t'&&p.role==='L').length;
 const table=r.poles>=2?IZ3:IZ,tableRef=r.poles>=2?'tab. B.52.4, trzy żyły obciążone':'tab. B.52.2, dwie żyły obciążone';
 if(r.In==null)r.missing.push('prąd znamionowy w opisie aparatu (np. B16)');
 if(r.S==null)r.missing.push('przekrój w opisie przewodu (np. 3 × 2,5)');
 if(!c.method)r.missing.push('sposób ułożenia');
 if(!(c.length>0))r.missing.push('długość');
 if(!c.kind)r.missing.push('rodzaj obwodu');
 if(r.S!=null&&c.method){
  r.Iz=table[c.method]?.[r.S]??null;
  if(r.Iz==null)r.issues.push({severity:'info',device:dev.id,title:'Brak danych: obciążalność '+name,text:`Tabela w programie obejmuje przekroje 1,5–16 mm² Cu; ${fmt(r.S,1)} mm² nie jest w niej ujęty.`});
  else if(r.In!=null&&r.In>r.Iz)r.issues.push({severity:'error',device:dev.id,title:'Zabezpieczenie za duże dla przewodu: '+name,text:`In = ${fmt(r.In,0)} A > Iz = ${fmt(r.Iz,1)} A (Cu ${fmt(r.S,1)} mm², ułożenie ${c.method}, PVC, 30 °C, bez współczynników grupowania – PN-HD 60364-5-52 ${tableRef}). Zmniejsz zabezpieczenie lub zwiększ przekrój.`});
 }
 if(r.S!=null&&c.length>0&&c.power>0){
  // 3 poles: symmetrical 3-phase load at 400 V. 2 poles: two 230 V halves with N, each carrying half the power.
  r.dU=r.poles>=3?100*c.power*c.length/(GAMMA_CU*r.S*UL*UL):r.poles===2?200*(c.power/2)*c.length/(GAMMA_CU*r.S*UN*UN):200*c.power*c.length/(GAMMA_CU*r.S*UN*UN);
  r.dUw=wlz?.dU??null;r.dUtotal=r.dU+(r.dUw||0);
  if(c.kind){r.limit=LIMIT[c.kind];if(r.dUtotal>r.limit)r.issues.push({severity:'warn',device:dev.id,title:'Duży spadek napięcia: '+name,text:`ΔU ≈ ${fmt(r.dUtotal,2)}%${r.dUw!=null?` (obwód ${fmt(r.dU,2)}% + WLZ ${fmt(r.dUw,2)}%)`:''} przy ${c.power} W i ${fmt(c.length,0)} m (${fmt(r.S,1)} mm² Cu). Zalecane maks. ${r.limit}% dla obwodu „${KINDS[c.kind]}” liczone od złącza (PN-HD 60364-5-52 zał. G, informacyjny)${r.dUw!=null?'.':' – bez danych WLZ wynik dotyczy tylko odcinka od rozdzielnicy.'}`})}
 }
 if(r.missing.length&&!(r.missing.length===1&&r.missing[0]==='aparat'))r.issues.push({severity:'info',calcMissing:true,device:dev.id,title:'Brak danych do obliczeń: '+name,text:'Uzupełnij: '+r.missing.join(', ')+'.'});
 return r;
}
function analyzeCircuits(s){const wlz=wlzCheck(s),results=s.circuits.map(c=>checkCircuit(s,c,wlz));return{results,wlz,issues:[...wlz.issues,...results.flatMap(r=>r.issues)]}}
const api={wlzCheck,fuseAmps,IZ3,IZ,METHODS,KINDS,LIMIT,ratedCurrent,crossSection,checkCircuit,analyzeCircuits};
if(typeof module!=='undefined')module.exports=api;root.DINCalc=api;
})(typeof window!=='undefined'?window:globalThis);
