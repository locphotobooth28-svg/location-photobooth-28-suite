const fs=require('fs');
const path=require('path');

const appPath=path.join(process.cwd(),'client','src','App.jsx');
const serverPath=path.join(process.cwd(),'server.js');
let app=fs.readFileSync(appPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let changes=0;

// --- FRONTEND : badge visuel incident résolu sur le bouton historique ---
if(!app.includes('const [printerIncidentBadges,setPrinterIncidentBadges]')){
  const oldState='  const [historyBooth,setHistoryBooth]=useState(null),[history,setHistory]=useState([]),[historyBusy,setHistoryBusy]=useState(false);';
  const newState=oldState+'\n  const [printerIncidentBadges,setPrinterIncidentBadges]=useState({});';
  if(!app.includes(oldState))throw new Error('[LP28] Etat historique imprimante introuvable.');
  app=app.replace(oldState,newState);changes++;
}

if(!app.includes('async function refreshPrinterIncidentBadges')){
  const marker='  async function openHistory(name){';
  if(!app.includes(marker))throw new Error('[LP28] openHistory introuvable.');
  const helper=`  async function refreshPrinterIncidentBadges(boothList){\n    try{\n      const entries=await Promise.all((boothList||[]).map(async b=>{\n        const name=String(b.boothName||\"\").toUpperCase();\n        if(!name)return [name,null];\n        const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(name)}/printer-history\`);\n        const d=await r.json().catch(()=>({}));\n        if(!r.ok)return [name,null];\n        const incidents=(d.history||[]).flatMap(h=>(h.incidents||[]).map(i=>({...i,eventName:h.eventName||\"\",historyId:h.id})));\n        incidents.sort((a,b)=>new Date(b.resolvedAt||b.at||0)-new Date(a.resolvedAt||a.at||0));\n        const latest=incidents.find(i=>i.resolvedAt);\n        if(!latest)return [name,null];\n        const seen=Number(localStorage.getItem(\`lp28.printerIncidentSeen.\${name}\`)||0);\n        const ts=new Date(latest.resolvedAt).getTime();\n        return [name,ts>seen?latest:null];\n      }));\n      setPrinterIncidentBadges(Object.fromEntries(entries));\n    }catch{}\n  }\n`;
  app=app.replace(marker,helper+marker);changes++;
}

if(!app.includes('lp28.printerIncidentSeen.')){
  throw new Error('[LP28] Badge incident non injecté.');
}

// enrichit load() pour récupérer les badges après la liste des bornes
const loadOld='setBooths(d.booths||[]);setError(\"\")';
const loadNew='setBooths(d.booths||[]);setError(\"\");refreshPrinterIncidentBadges(d.booths||[])';
if(app.includes(loadOld)&&!app.includes(loadNew)){app=app.replace(loadOld,loadNew);changes++;}

// marque le badge comme vu lorsqu'on ouvre l'historique
const openOld='async function openHistory(name){setHistoryBooth(name);setHistoryBusy(true);';
const openNew='async function openHistory(name){const badge=printerIncidentBadges[String(name||\"\").toUpperCase()];if(badge?.resolvedAt){localStorage.setItem(`lp28.printerIncidentSeen.${String(name||\"\").toUpperCase()}`,String(new Date(badge.resolvedAt).getTime()));setPrinterIncidentBadges(v=>({...v,[String(name||\"\").toUpperCase()]:null}));}setHistoryBooth(name);setHistoryBusy(true);';
if(app.includes(openOld)&&!app.includes(openNew)){app=app.replace(openOld,openNew);changes++;}

const btnOld='<button className="ghost" style={{marginTop:10}} onClick={()=>openHistory(b.boothName)}>🧾 Historique imprimante</button>';
const btnNew='<button className="ghost" style={{marginTop:10,position:"relative"}} onClick={()=>openHistory(b.boothName)}>🧾 Historique imprimante{printerIncidentBadges[String(b.boothName||"").toUpperCase()]&&<span title="Un incident imprimante a été résolu" style={{marginLeft:8,display:"inline-flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:999,background:"#166534",color:"#dcfce7",fontSize:11,fontWeight:900}}>✓ incident résolu</span>}</button>';
if(app.includes(btnOld)&&!app.includes('title="Un incident imprimante a été résolu"')){app=app.replace(btnOld,btnNew);changes++;}

if(app.includes('Version 8.5.88')){app=app.split('Version 8.5.88').join('Version 8.5.89');changes++;}

// --- BACKEND : suivi défaut persistant 15 min + création N1 automatique ---
if(!server.includes('async function processPrinterFaultWatch(')){
  const heartbeatMarker='app.post("/api/booth-agent/heartbeat",boothAgentOnly,async(req,res)=>{';
  if(!server.includes(heartbeatMarker))throw new Error('[LP28] Route heartbeat introuvable.');
  const helper=`function printerFaultWatchKey(boothName){return \`booth.printer-fault-watch.\${String(boothName||\"\").toUpperCase()}\`;}\nasync function readPrinterFaultWatch(boothName){try{const row=await prisma.appSetting.findUnique({where:{key:printerFaultWatchKey(boothName)}});return row?.value?JSON.parse(row.value):null}catch{return null}}\nasync function writePrinterFaultWatch(boothName,value){const key=printerFaultWatchKey(boothName);if(!value){await prisma.appSetting.delete({where:{key}}).catch(()=>{});return;}await prisma.appSetting.upsert({where:{key},update:{value:JSON.stringify(value)},create:{key,value:JSON.stringify(value)}});}\nasync function markPrinterHistoryResolved(boothName,code,resolvedAt){\n  try{\n    const history=await readBoothPrinterHistory(boothName);\n    let changed=false;\n    for(const h of history){\n      const list=Array.isArray(h.incidents)?h.incidents:[];\n      for(let i=list.length-1;i>=0;i--){\n        const inc=list[i];\n        if(String(inc.code||\"\")===String(code||\"\")&&!inc.resolvedAt){inc.resolvedAt=resolvedAt;changed=true;break;}\n      }\n      if(changed)break;\n    }\n    if(changed)await writeBoothPrinterHistory(boothName,history);\n  }catch(err){console.error(\"PRINTER HISTORY RESOLVE ERROR :\",err.message);}\n}\nasync function processPrinterFaultWatch(boothName,payload){\n  const p=payload?.printer||{};\n  const raw=String(p.rawStatus||\"\").trim();\n  const severity=String(p.statusSeverity||\"\").toUpperCase();\n  const label=String(p.statusLabel||p.printerStatus||raw||\"Défaut imprimante\");\n  const normal=!raw||raw===\"00000\"||raw===\"00001\"||severity===\"OK\"||severity===\"PRINTING\"||severity===\"INFO\";\n  const now=new Date();\n  const previous=await readPrinterFaultWatch(boothName);\n  if(normal){\n    if(previous?.code){\n      const resolvedAt=now.toISOString();\n      await markPrinterHistoryResolved(boothName,previous.code,resolvedAt);\n      if(previous.incidentId){\n        await prisma.mathisIncident.update({where:{id:previous.incidentId},data:{status:\"RESOLVED\",resolvedAt:now,diagnostic:\`\${previous.label||previous.code} — défaut revenu à la normale automatiquement.\`}}).catch(()=>{});\n      }\n      await writePrinterFaultWatch(boothName,null);\n    }\n    return;\n  }\n  let state=previous;\n  if(!state||String(state.code)!==raw){\n    state={code:raw,label,firstSeenAt:now.toISOString(),eventId:payload?.eventId||null,n1CreatedAt:null,incidentId:null};\n    await writePrinterFaultWatch(boothName,state);\n    return;\n  }\n  const first=new Date(state.firstSeenAt||now).getTime();\n  if(state.n1CreatedAt||Date.now()-first<15*60*1000)return;\n  if(!payload?.eventId)return;\n  const incident=await prisma.mathisIncident.create({data:{\n    eventId:payload.eventId,portalRole:\"AGENT_AUTO\",level:1,booth:String(boothName||\"\").slice(0,120),\n    printer:String(p.model||\"Imprimante\").slice(0,120),issue:label.slice(0,160),\n    diagnostic:\`Défaut imprimante persistant depuis 15 minutes. Code \${raw}.\`.slice(0,500),\n    led:raw.slice(0,180),contactFirstName:\"Mathis\",contactPhone:\"\",photosAvailable:false,\n    printsAvailable:Number(p.mediaRemaining||0)>0,status:\"REQUESTED\"\n  }});\n  await addNotification({title:\`🖨️ N1 automatique — \${boothName}\`,message:\`\${label} (code \${raw}) persiste depuis 15 minutes sur \${boothName}. Assistance N1 créée automatiquement.\`,type:\"WARNING\",source:\"MATHIS\",audience:\"ADMIN\",eventId:payload.eventId});\n  state={...state,n1CreatedAt:now.toISOString(),incidentId:incident.id};\n  await writePrinterFaultWatch(boothName,state);\n}\n\n`;
  server=server.replace(heartbeatMarker,helper+heartbeatMarker);changes++;
}

const callOld='await updateBoothPrinterHistory(boothName,payload,previousPayload).catch(err=>console.error("PRINTER HISTORY ERROR :",err));';
const callNew=callOld+'\n      await processPrinterFaultWatch(boothName,payload).catch(err=>console.error("PRINTER FAULT WATCH ERROR :",err));';
if(server.includes(callOld)&&!server.includes('PRINTER FAULT WATCH ERROR')){server=server.replace(callOld,callNew);changes++;}

fs.writeFileSync(appPath,app,'utf8');
fs.writeFileSync(serverPath,server,'utf8');
console.log(`[LP28] printer incident watch : ${changes} correction(s) appliquée(s).`);
