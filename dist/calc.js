// Circuit checks: protective device vs cable ampacity (In <= Iz) and voltage drop of the final circuit.
// Scope and assumptions are reported with every result; missing input is reported as missing, never assumed.
(function(root){
const M=root.DIN||require('./model.js');
const {TYPES}=M;

// PN-HD 60364-5-52, tab. B.52.2: copper, PVC insulation (70 °C), two loaded conductors, ambient 30 °C, values in A.
// No correction for ambient temperature, grouping or thermal insulation is applied.
const IZ={A1:{1.5:14.5,2.5:19.5,4:26,6:34,10:46,16:61},A2:{1.5:14,2.5:18.5,4:25,6:32,10:43,16:57},B1:{1.5:17.5,2.5:24,4:32,6:41,10:57,16:76},B2:{1.5:16.5,2.5:23,4:30,6:38,10:52,16:69},C:{1.5:19.5,2.5:27,4:36,6:46,10:63,16:85}};
const METHODS={A1:'A1 – przewody jednożyłowe w rurce w ścianie izolacyjnej',A2:'A2 – przewód wielożyłowy w rurce w ścianie izolacyjnej',B1:'B1 – przewody jednożyłowe w rurce na ścianie / w tynku',B2:'B2 – przewód wielożyłowy w rurce na ścianie',C:'C – przewód na ścianie lub pod tynkiem (bezpośrednio)'};
const KINDS={light:'oświetlenie',other:'gniazda / inne'};
// Recommended maximum voltage drop for installations supplied from a public LV network: PN-HD 60364-5-52, annex G (informative).
const LIMIT={light:3,other:5};
const GAMMA_CU=56,UN=230; // m/(Ω·mm²) at 20 °C; nominal phase voltage

const num=s=>Number(String(s).replace(',','.'));
function ratedCurrent(rating){const m=String(rating||'').match(/\b[BCDKZ]\s*(\d+(?:[.,]\d+)?)\b/i)||String(rating||'').match(/(\d+(?:[.,]\d+)?)\s*A\b/);return m?num(m[1]):null}
function crossSection(cable){const m=String(cable||'').match(/[x×]\s*(\d+(?:[.,]\d+)?)/i);return m?num(m[1]):null}
const fmt=(v,d=1)=>v.toLocaleString('pl-PL',{maximumFractionDigits:d,minimumFractionDigits:d});

function checkCircuit(s,c){
 const dev=s.components.find(x=>x.id===c.device),r={id:c.id,In:null,S:null,Iz:null,dU:null,limit:null,missing:[],issues:[]};
 const name=c.name;
 if(!dev){r.missing.push('aparat');return r}
 r.In=ratedCurrent(dev.rating);r.S=crossSection(c.cable);
 if(r.In==null)r.missing.push('prąd znamionowy w opisie aparatu (np. B16)');
 if(r.S==null)r.missing.push('przekrój w opisie przewodu (np. 3 × 2,5)');
 if(!c.method)r.missing.push('sposób ułożenia');
 if(!(c.length>0))r.missing.push('długość');
 if(!c.kind)r.missing.push('rodzaj obwodu');
 if(r.S!=null&&c.method){
  r.Iz=IZ[c.method]?.[r.S]??null;
  if(r.Iz==null)r.issues.push({severity:'info',device:dev.id,title:'Brak danych: obciążalność '+name,text:`Tabela w programie obejmuje przekroje 1,5–16 mm² Cu; ${fmt(r.S,1)} mm² nie jest w niej ujęty.`});
  else if(r.In!=null&&r.In>r.Iz)r.issues.push({severity:'error',device:dev.id,title:'Zabezpieczenie za duże dla przewodu: '+name,text:`In = ${fmt(r.In,0)} A > Iz = ${fmt(r.Iz,1)} A (Cu ${fmt(r.S,1)} mm², ułożenie ${c.method}, PVC, 30 °C, bez współczynników grupowania – PN-HD 60364-5-52 tab. B.52.2). Zmniejsz zabezpieczenie lub zwiększ przekrój.`});
 }
 if(r.S!=null&&c.length>0&&c.power>0){
  r.dU=200*c.power*c.length/(GAMMA_CU*r.S*UN*UN);
  if(c.kind){r.limit=LIMIT[c.kind];if(r.dU>r.limit)r.issues.push({severity:'warn',device:dev.id,title:'Duży spadek napięcia: '+name,text:`ΔU ≈ ${fmt(r.dU,2)}% przy ${c.power} W i ${fmt(c.length,0)} m (${fmt(r.S,1)} mm² Cu). Zalecane maks. ${r.limit}% dla obwodu „${KINDS[c.kind]}” liczone od złącza (PN-HD 60364-5-52 zał. G, informacyjny) – wynik dotyczy tylko odcinka od rozdzielnicy.`})}
 }
 if(r.missing.length&&!(r.missing.length===1&&r.missing[0]==='aparat'))r.issues.push({severity:'info',calcMissing:true,device:dev.id,title:'Brak danych do obliczeń: '+name,text:'Uzupełnij: '+r.missing.join(', ')+'.'});
 return r;
}
function analyzeCircuits(s){const results=s.circuits.map(c=>checkCircuit(s,c));return{results,issues:results.flatMap(r=>r.issues)}}
const api={IZ,METHODS,KINDS,LIMIT,ratedCurrent,crossSection,checkCircuit,analyzeCircuits};
if(typeof module!=='undefined')module.exports=api;root.DINCalc=api;
})(typeof window!=='undefined'?window:globalThis);
