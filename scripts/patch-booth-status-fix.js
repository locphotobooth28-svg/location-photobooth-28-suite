const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "client", "src", "App.jsx");
let source = fs.readFileSync(appPath, "utf8");
let changes = 0;

// 1) Statut dynamique des bornes.
const oldCode = 'const live=opsBooths.find(b=>String(b?.booth||b?.name||"").toUpperCase().includes(row.id));';
const newCode = 'const live=opsBooths.find(b=>Object.values(b||{}).some(v=>typeof v==="string"&&v.toUpperCase().includes(row.id)));';
if (source.includes(oldCode)) {
  source = source.replace(oldCode, newCode);
  changes++;
}

// 2) Les prestations offertes gardent leur valeur commerciale totalPrice.
if (source.includes('giftAmount:0')) {
  source = source.replace('giftAmount:0','giftAmount:sumTotal(giftedEvents)');
  changes++;
}
const oldSummary='const summarize=(items,period)=>{const billed=items.filter(event=>!event?.preparation?.gifted);const gifted=items.filter(event=>!!event?.preparation?.gifted);let giftAmount=0;if(period!=="week"){giftAmount=gifted.reduce((sum,event)=>{const d=parseDate(event);if(period==="month"&&d&&d>=monday&&d<weekEnd)return sum;return sum+Math.max(Number(event?.totalPrice||0),0);},0);}return {billedCount:billed.length,billedAmount:billed.reduce((sum,event)=>sum+remaining(event),0),giftCount:gifted.length,giftAmount};};';
const newSummary='const summarize=(items,period)=>{const billed=items.filter(event=>!event?.preparation?.gifted);const gifted=items.filter(event=>!!event?.preparation?.gifted);const giftAmount=gifted.reduce((sum,event)=>sum+Math.max(Number(event?.totalPrice||0),0),0);return {billedCount:billed.length,billedAmount:billed.reduce((sum,event)=>sum+remaining(event),0),giftCount:gifted.length,giftAmount};};';
if(source.includes(oldSummary)){
  source=source.replace(oldSummary,newSummary);
  changes++;
}
const oldPeriod='giftAmount:gifted.reduce((sum,event)=>{const d=parseEventDate(event);const ref=new Date();const monday=new Date(ref);const day=(monday.getDay()+6)%7;monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-day);const weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);const amount=d&&d>=monday&&d<weekEnd?0:Math.max(Number(event?.totalPrice||0),0);return sum+amount;},0)';
const newPeriod='giftAmount:gifted.reduce((sum,event)=>sum+Math.max(Number(event?.totalPrice||0),0),0)';
if(source.includes(oldPeriod)){
  source=source.replace(oldPeriod,newPeriod);
  changes++;
}

// 3) Historique imprimante dans le vrai frontend client/src/App.jsx.
const stateOld='  const [booths,setBooths]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState("");';
const stateNew=stateOld+'\n  const [historyBooth,setHistoryBooth]=useState(null),[history,setHistory]=useState([]),[historyBusy,setHistoryBusy]=useState(false);';
if(!source.includes('const [historyBooth,setHistoryBooth]')){
  if(!source.includes(stateOld))throw new Error('[LP28] Etat AdminBooths introuvable.');
  source=source.replace(stateOld,stateNew);
  changes++;
}

const agoLine='  const ago=s=>s==null?"Jamais":s<60?`il y a ${s} s`:s<3600?`il y a ${Math.floor(s/60)} min`:`il y a ${Math.floor(s/3600)} h`;';
const helpers=`  const ago=s=>s==null?"Jamais":s<60?\`il y a \${s} s\`:s<3600?\`il y a \${Math.floor(s/60)} min\`:\`il y a \${Math.floor(s/3600)} h\`;\n  const frDate=v=>v?new Date(v).toLocaleDateString("fr-FR"):"—";\n  const frTime=v=>v?new Date(v).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"—";\n  async function openHistory(name){setHistoryBooth(name);setHistoryBusy(true);try{const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(name)}/printer-history\`);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Historique indisponible.");setHistory(d.history||[])}catch(e){alert(e.message)}finally{setHistoryBusy(false)}}\n  function historyText(h){return \`LP28 — Historique imprimante\\nBorne : \${h.boothName||historyBooth}\\nÉvénement : \${h.eventName||"—"}\\nDate événement : \${frDate(h.eventDate)}\\nHoraire événement : \${h.eventTime||"—"}\${h.pickupTime?\` → \${h.pickupTime}\`:""}\\nImprimante : \${h.printerModel||"—"}\${h.serialNumber?\` · S/N \${h.serialNumber}\`:""}\\nImprimante active : \${frTime(h.startedAt)} → \${frTime(h.endedAt)}\\nPapier départ : \${h.startRemaining??"—"}\\nPapier fin : \${h.endRemaining??"—"}\\nTirages consommés : \${h.used??0}\\nIncidents : \${h.incidents?.length?h.incidents.map(i=>\`\${i.code} \${i.label||""}\`).join(", "):"Aucun"}\`; }\n  async function copyHistory(h){try{await navigator.clipboard.writeText(historyText(h));alert("Historique copié.")}catch{alert("Copie impossible sur ce navigateur.")}}\n  async function shareHistory(h){const text=historyText(h);if(navigator.share){try{await navigator.share({title:\`LP28 - \${h.eventName||"Historique imprimante"}\`,text});return}catch(e){if(e?.name==="AbortError")return}}try{await navigator.clipboard.writeText(text);alert("Partage non disponible : historique copié.")}catch{alert("Partage indisponible.")}}\n  async function deleteHistory(id){if(!confirm("Supprimer définitivement cet historique imprimante ?"))return;const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(historyBooth)}/printer-history/\${encodeURIComponent(id)}\`,{method:"DELETE"});const d=await r.json().catch(()=>({}));if(!r.ok)return alert(d.message||"Suppression impossible.");openHistory(historyBooth)}\n  async function clearHistory(){if(!confirm(\`Effacer TOUT l'historique imprimante de \${historyBooth} ? Cette action est définitive.\`))return;const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(historyBooth)}/printer-history\`,{method:"DELETE"});const d=await r.json().catch(()=>({}));if(!r.ok)return alert(d.message||"Suppression impossible.");setHistory([])}\n`;
if(!source.includes('async function openHistory(name)')){
  if(!source.includes(agoLine))throw new Error('[LP28] Helper ago AdminBooths introuvable.');
  source=source.replace(agoLine,helpers);
  changes++;
}

const commOld='          <div>🕐 Dernière communication : {ago(b.ageSeconds)}</div>\n        </div>';
const commNew='          <div>🕐 Dernière communication : {ago(b.ageSeconds)}</div>\n          <button className="ghost" style={{marginTop:10}} onClick={()=>openHistory(b.boothName)}>🧾 Historique imprimante</button>\n        </div>';
if(!source.includes('>🧾 Historique imprimante</button>')){
  if(!source.includes(commOld))throw new Error('[LP28] Zone communication borne introuvable.');
  source=source.replace(commOld,commNew);
  changes++;
}

if(!source.includes('{historyBooth&&<div className="modal-backdrop"')){
  const fnStart=source.indexOf('function AdminBooths(){');
  const fnEnd=source.indexOf('\nfunction AdminGalleries(){',fnStart);
  if(fnStart<0||fnEnd<0)throw new Error('[LP28] Limites AdminBooths introuvables.');
  const segment=source.slice(fnStart,fnEnd);
  const close='    </div>\n  </section>;\n}\n';
  const pos=segment.lastIndexOf(close);
  if(pos<0)throw new Error('[LP28] Fermeture AdminBooths introuvable.');
  const modal=`    </div>\n    {historyBooth&&<div className="modal-backdrop" onMouseDown={()=>setHistoryBooth(null)}><div className="modal-card" style={{maxWidth:1050,width:"94vw"}} onMouseDown={e=>e.stopPropagation()}>\n      <div className="calendar-toolbar"><div><div className="eyebrow">{historyBooth}</div><h2>🧾 Historique imprimante</h2></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="danger" onClick={clearHistory}>🗑️ Tout supprimer</button><button className="ghost" onClick={()=>setHistoryBooth(null)}>✕ Fermer</button></div></div>\n      {historyBusy?<p>Chargement…</p>:history.length===0?<div className="notice">Aucun historique enregistré pour cette borne.</div>:<div style={{display:"grid",gap:12,maxHeight:"68vh",overflow:"auto"}}>{history.map(h=><article className="stat-card" key={h.id} style={{textAlign:"left"}}>\n        <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong>{h.eventName||"Sans événement"}</strong><div className="muted">📅 {frDate(h.eventDate)} · 🕒 {h.eventTime||"Horaire non renseigné"}{h.pickupTime?` → ${h.pickupTime}`:""}</div></div><span>{h.open?"🟢 En cours":"⚪ Terminé"}</span></div>\n        <div style={{marginTop:8}}>🖨️ {h.printerModel||"Imprimante"}{h.serialNumber?` · S/N ${h.serialNumber}`:""}</div>\n        <div>⏱️ Activité imprimante : {frTime(h.startedAt)} → {frTime(h.endedAt)}</div>\n        <div>📄 Papier : <b>{h.startRemaining??"—"}</b> → <b>{h.endRemaining??"—"}</b> · consommé : <b>{h.used??0}</b></div>\n        <div>⚠️ Incidents : {h.incidents?.length?h.incidents.map(i=>`${i.code} ${i.label||""}`).join(", "):"Aucun"}</div>\n        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><button className="ghost" onClick={()=>copyHistory(h)}>📋 Copier</button><button className="ghost" onClick={()=>shareHistory(h)}>📤 Partager</button><button className="danger" onClick={()=>deleteHistory(h.id)}>🗑️ Supprimer</button></div>\n      </article>)}</div>}\n    </div></div>}\n  </section>;\n}\n`;
  const patched=segment.slice(0,pos)+modal+segment.slice(pos+close.length);
  source=source.slice(0,fnStart)+patched+source.slice(fnEnd);
  changes++;
}

if(source.includes('Version 8.5.87')){
  source=source.split('Version 8.5.87').join('Version 8.5.88');
  changes++;
}

fs.writeFileSync(appPath, source, "utf8");
console.log(`[LP28] patch-booth-status-fix : ${changes} correction(s) appliquée(s).`);
