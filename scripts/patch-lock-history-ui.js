const fs=require('fs'),path=require('path');
const file=path.join(process.cwd(),'client','src','App.jsx');
let s=fs.readFileSync(file,'utf8');
const SENTINEL='LP28_LOCK_HISTORY_UI_V1';
if(s.includes(SENTINEL)){console.log('[lock-history-ui] déjà appliqué');process.exit(0);}

const stateAnchor='  const [selectedBooth,setSelectedBooth]=useState("NINA"),[boothTab,setBoothTab]=useState("STATUS");';
if(!s.includes(stateAnchor))throw new Error('[lock-history-ui] état AdminBooths introuvable');
s=s.replace(stateAnchor,stateAnchor+'\n  const [lockHistory,setLockHistory]=useState([]),[lockHistoryLoading,setLockHistoryLoading]=useState(false),[lockHistoryError,setLockHistoryError]=useState("");');

const logicAnchor='  /* LP28_BOOTH_PRO_DASHBOARD_V1 */';
if(!s.includes(logicAnchor))throw new Error('[lock-history-ui] dashboard pro introuvable');
const helpers=`  /* ${SENTINEL} */\n  async function loadLockHistory(boothName){\n    const name=String(boothName||selectedBooth||'').toUpperCase();\n    if(!name)return;\n    setLockHistoryLoading(true);setLockHistoryError('');\n    try{\n      const r=await fetch('/api/admin/booths/'+encodeURIComponent(name)+'/lock-history');\n      const d=await r.json().catch(()=>({}));\n      if(!r.ok)throw new Error(d.message||'Historique indisponible.');\n      setLockHistory(Array.isArray(d.history)?d.history:[]);\n    }catch(err){setLockHistory([]);setLockHistoryError(err.message||'Historique indisponible.');}\n    finally{setLockHistoryLoading(false);}\n  }\n  function lockHistoryLabel(h){\n    const type=String(h?.type||'');\n    if(type==='SCHEDULE_SAVED')return '🕒 Programmation enregistrée';\n    if(type==='MANUAL_LOCK_REQUESTED')return '🔒 Verrouillage manuel demandé';\n    if(type==='MANUAL_UNLOCK_REQUESTED')return '🔓 Déverrouillage manuel demandé';\n    if(type==='PIN_UPDATED')return '🔑 PIN Admin modifié';\n    if(type==='PIN_SYNC_CONFIRMED')return '✅ PIN synchronisé avec la borne';\n    if(type==='AUTO_OPEN')return '🟢 Ouverture automatique';\n    if(type==='AUTO_CLOSE')return '🔒 Fermeture automatique';\n    if(type==='POWER_END')return '⏻ Fin de prestation par bouton Power';\n    return type||'Action de verrouillage';\n  }\n  function lockHistoryDetails(h){\n    if(h?.type==='SCHEDULE_SAVED'){\n      const rows=Array.isArray(h.schedules)?h.schedules:[];\n      if(!rows.length)return 'Aucun créneau actif';\n      return rows.map(x=>x.kind==='once'?('Ouverture '+(x.startAt||'—')+(x.endAt?' · fermeture '+x.endAt:' · sans fermeture automatique')):('Hebdomadaire · '+(x.startTime||'—')+' → '+(x.endTime||'—'))).join(' | ');\n    }\n    return '';\n  }\n\n${logicAnchor}`;
s=s.replace(logicAnchor,helpers);

const oldButton=`<button className="ghost" onClick={()=>openHistory(current.boothName)}>🧾 Historique imprimante{printerIncidentBadges[String(current.boothName||'').toUpperCase()]&&' · ✓ incident résolu'}</button>`;
const newButton=`<button className="ghost" onClick={()=>{setBoothTab('LOCK');loadLockHistory(current.boothName)}}>🕒 Historique verrouillage</button>`;
if(!s.includes(oldButton))throw new Error('[lock-history-ui] bouton historique imprimante introuvable');
s=s.replace(oldButton,newButton);

const lockStatusNeedle=`<div className="bp-status-ok"`;
const lockStatusPos=s.indexOf(lockStatusNeedle);
if(lockStatusPos<0)throw new Error('[lock-history-ui] statut verrouillage introuvable');
const lockClose=s.indexOf('</div></div>}',lockStatusPos);
if(lockClose<0)throw new Error('[lock-history-ui] fin onglet verrouillage introuvable');
const historyPanel=`<div className="bp-card" style={{marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}><div><h4 style={{margin:0}}>🕒 Historique de verrouillage</h4><div className="muted" style={{marginTop:5}}>Programmations, verrouillages, déverrouillages et synchronisation du PIN. Le code PIN n'est jamais affiché.</div></div><button className="ghost" onClick={()=>loadLockHistory(current.boothName)}>↻ Actualiser</button></div>{lockHistoryLoading?<div className="muted" style={{marginTop:14}}>Chargement…</div>:lockHistoryError?<div className="notice error" style={{marginTop:14}}>{lockHistoryError}</div>:lockHistory.length===0?<div className="muted" style={{marginTop:14}}>Aucun historique de verrouillage.</div>:<div style={{marginTop:12}}>{lockHistory.map(h=><div key={h.id||h.at} className="bp-row" style={{alignItems:'flex-start'}}><div><b>{lockHistoryLabel(h)}</b>{lockHistoryDetails(h)&&<div className="muted" style={{fontSize:12,marginTop:3}}>{lockHistoryDetails(h)}</div>}</div><span className="muted" style={{whiteSpace:'nowrap'}}>{h.at?new Date(h.at).toLocaleString('fr-FR'):'—'}</span></div>)}</div>}</div>`;
s=s.slice(0,lockClose)+historyPanel+s.slice(lockClose);

fs.writeFileSync(file,s,'utf8');
console.log('[lock-history-ui] OK : historique imprimante retiré, historique verrouillage ajouté');
