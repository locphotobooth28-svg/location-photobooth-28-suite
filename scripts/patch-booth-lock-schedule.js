const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let changes=0;
let s=fs.readFileSync(serverPath,'utf8');
let a=fs.readFileSync(appPath,'utf8');

// LP28 V2: programmation par créneaux datés. Le patch reste compatible avec
// l'ancienne structure lockAt/unlockAt déjà déployée.
const oldDefault='lockScreen:{enabled:false,lockAt:"",unlockAt:"",pin:"2828",locked:false,updatedAt:null}';
const newDefault='lockScreen:{enabled:false,lockAt:"",unlockAt:"",slots:[],pin:"2828",locked:false,updatedAt:null}';
if(s.includes(oldDefault)){s=s.replaceAll(oldDefault,newDefault);changes++;}

const oldRead='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null},';
const newRead='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),slots:Array.isArray(p?.lockScreen?.slots)?p.lockScreen.slots:[],pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null},';
if(s.includes(oldRead)){s=s.replace(oldRead,newRead);changes++;}

const oldAdmin='lockScreen:{enabled:controls[name].lockScreen.enabled,lockAt:controls[name].lockScreen.lockAt,unlockAt:controls[name].lockScreen.unlockAt,locked:controls[name].lockScreen.locked,pinConfigured:Boolean(controls[name].lockScreen.pin),updatedAt:controls[name].lockScreen.updatedAt}';
const newAdmin='lockScreen:{enabled:controls[name].lockScreen.enabled,lockAt:controls[name].lockScreen.lockAt,unlockAt:controls[name].lockScreen.unlockAt,slots:Array.isArray(controls[name].lockScreen.slots)?controls[name].lockScreen.slots:[],locked:controls[name].lockScreen.locked,pinConfigured:Boolean(controls[name].lockScreen.pin),updatedAt:controls[name].lockScreen.updatedAt}';
if(s.includes(oldAdmin)){s=s.replace(oldAdmin,newAdmin);changes++;}

// Remplace l'ancien endpoint lock par une version créneaux + compatibilité Agent.
const endpointStart='app.post("/api/admin/booths/:boothName/lock",adminOnly,async(req,res)=>{';
const endpointEnd='app.post("/api/admin/booths/:boothName/display",adminOnly';
const ei=s.indexOf(endpointStart), ej=s.indexOf(endpointEnd,ei);
if(ei>=0&&ej>ei){
const endpoint=`app.post("/api/admin/booths/:boothName/lock",adminOnly,async(req,res)=>{
  const boothName=String(req.params.boothName||"").trim().toUpperCase();
  if(!/^[A-Z0-9_-]{2,40}$/.test(boothName))return res.status(400).json({ok:false,message:"Nom de borne invalide."});
  const control=await readBoothControl(boothName);
  control.lockScreen=control.lockScreen||{enabled:false,lockAt:"",unlockAt:"",slots:[],pin:"2828",locked:false,updatedAt:null};
  const action=String(req.body?.action||"SETTINGS").toUpperCase();
  if(action==="SETTINGS"){
    const pin=String(req.body?.pin||"").trim();
    if(pin&&!/^\\d{4}$/.test(pin))return res.status(400).json({ok:false,message:"Le PIN doit contenir exactement 4 chiffres."});
    const input=Array.isArray(req.body?.slots)?req.body.slots:[];
    if(input.length>20)return res.status(400).json({ok:false,message:"20 créneaux maximum par borne."});
    const slots=[];
    for(const row of input){
      const startAt=String(row?.startAt||"").trim(),endAt=String(row?.endAt||"").trim();
      const start=new Date(startAt),end=new Date(endAt);
      if(!startAt||!endAt||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start)return res.status(400).json({ok:false,message:"Chaque créneau doit avoir une date/heure de début et de fin valides."});
      slots.push({id:String(row?.id||crypto.randomUUID()).slice(0,80),startAt:start.toISOString(),endAt:end.toISOString()});
    }
    slots.sort((x,y)=>new Date(x.startAt)-new Date(y.startAt));
    for(let i=1;i<slots.length;i++)if(new Date(slots[i].startAt)<new Date(slots[i-1].endAt))return res.status(400).json({ok:false,message:"Deux créneaux ne peuvent pas se chevaucher."});
    control.lockScreen={...control.lockScreen,enabled:slots.length>0,slots,lockAt:"",unlockAt:"",...(pin?{pin}:{}),updatedAt:new Date().toISOString()};
  }else if(action==="LOCK_NOW"||action==="UNLOCK_NOW"){
    const locked=action==="LOCK_NOW";
    control.lockScreen={...control.lockScreen,locked,updatedAt:new Date().toISOString()};
    control.command={id:crypto.randomUUID(),type:action,status:"PENDING",createdAt:new Date().toISOString()};
  }else return res.status(400).json({ok:false,message:"Action invalide."});
  await writeBoothControl(boothName,control);
  res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,slots:control.lockScreen.slots||[],locked:control.lockScreen.locked,pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt},command:control.command||null});
});

`;
s=s.slice(0,ei)+endpoint+s.slice(ej);changes++;
}
fs.writeFileSync(serverPath,s,'utf8');

// Remplace les helpers Admin de l'ancien écran horaire.
const helperStart='  async function lockScreenAction(boothName,action,payload={}){';
const helperEnd='  async function updateDisplay(boothName,patch){';
const hi=a.indexOf(helperStart), hj=a.indexOf(helperEnd,hi);
if(hi>=0&&hj>hi){
const helper=`  async function lockScreenAction(boothName,action,payload={}){
    try{const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(boothName)}/lock\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Réglage verrouillage impossible.");await load();return d}catch(e){alert(e.message||"Réglage verrouillage impossible.");return null}
  }
  function boothSlotRows(boothName){return [...document.querySelectorAll(\`[data-lp28-slot="\${CSS.escape(boothName)}"]\`)].map(el=>({id:el.dataset.id||crypto.randomUUID?.()||String(Date.now()),startAt:el.querySelector('[data-start]')?.value||"",endAt:el.querySelector('[data-end]')?.value||""}));}
  async function saveLockSchedule(boothName){
    const pin=document.getElementById(\`lp28-lock-pin-\${boothName}\`)?.value||"";
    const slots=boothSlotRows(boothName).filter(x=>x.startAt||x.endAt).map(x=>({id:x.id,startAt:x.startAt?new Date(x.startAt).toISOString():"",endAt:x.endAt?new Date(x.endAt).toISOString():""}));
    const d=await lockScreenAction(boothName,"SETTINGS",{slots,pin});if(d)alert("🗓️ Créneaux enregistrés pour "+boothName+".");
  }
  function addLockSlot(boothName){setBooths(list=>list.map(x=>x.boothName===boothName?{...x,lockScreen:{...(x.lockScreen||{}),slots:[...(x.lockScreen?.slots||[]),{id:String(Date.now()),startAt:"",endAt:""}]}}:x));}
  function removeLockSlot(boothName,id){setBooths(list=>list.map(x=>x.boothName===boothName?{...x,lockScreen:{...(x.lockScreen||{}),slots:(x.lockScreen?.slots||[]).filter(s=>s.id!==id)}}:x));}
  function localDateTime(v){if(!v)return "";const d=new Date(v);if(Number.isNaN(d.getTime()))return "";const p=n=>String(n).padStart(2,"0");return \`\${d.getFullYear()}-\${p(d.getMonth()+1)}-\${p(d.getDate())}T\${p(d.getHours())}:\${p(d.getMinutes())}\`;}
  function lockStatus(lock){const now=Date.now(),slots=(lock?.slots||[]).map(s=>({...s,a:new Date(s.startAt).getTime(),z:new Date(s.endAt).getTime()})).filter(s=>Number.isFinite(s.a)&&Number.isFinite(s.z)).sort((x,y)=>x.a-y.a);const active=slots.find(s=>now>=s.a&&now<s.z);if(active)return \`🟢 Ouverte — fermeture prévue le \${new Date(active.z).toLocaleDateString("fr-FR")} à \${new Date(active.z).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}\`;const next=slots.find(s=>s.a>now);if(next)return \`🔒 Verrouillée jusqu'au \${new Date(next.a).toLocaleDateString("fr-FR")} à \${new Date(next.a).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}\`;return slots.length?"🔒 Verrouillée — programmation terminée":"⚪ Aucune programmation";}
`;
a=a.slice(0,hi)+helper+a.slice(hj);changes++;
}

// Remplace uniquement le bloc UI du verrouillage, avant les réglages compteur.
const uiStart='<div className="lp28-lock-schedule-admin"';
const uiEnd='<div className="booth-display-settings">';
const uiI=a.indexOf(uiStart),uiJ=a.indexOf(uiEnd,uiI);
if(uiI>=0&&uiJ>uiI){
const ui=`<div className="lp28-lock-schedule-admin" style={{marginTop:14,padding:12,border:"1px solid #5b4b22",borderRadius:12}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:18,color:"#f5d45c"}}>🗓️ Ouverture / fermeture du stand</strong><span className="muted">{lockStatus(b.lockScreen)}</span></div>
            <div className="muted" style={{fontSize:12,marginTop:5}}>La borne est ouverte uniquement pendant les créneaux ci-dessous. En dehors de ces créneaux, elle reste verrouillée.</div>
            <div style={{display:"grid",gap:9,marginTop:10}}>
              {(b.lockScreen?.slots||[]).map((slot,index)=><div key={slot.id||index} data-lp28-slot={b.boothName} data-id={slot.id||String(index)} style={{display:"grid",gridTemplateColumns:"minmax(190px,1fr) minmax(190px,1fr) auto",gap:8,alignItems:"end",padding:9,border:"1px solid rgba(245,212,92,.22)",borderRadius:10}}>
                <label><span className="muted">▶️ Début du créneau</span><input data-start type="datetime-local" defaultValue={localDateTime(slot.startAt)} style={{width:"100%"}}/></label>
                <label><span className="muted">⏹️ Fin du créneau</span><input data-end type="datetime-local" defaultValue={localDateTime(slot.endAt)} style={{width:"100%"}}/></label>
                <button className="danger" title="Supprimer ce créneau" onClick={()=>removeLockSlot(b.boothName,slot.id)}>🗑️</button>
              </div>)}
              {!(b.lockScreen?.slots||[]).length&&<div className="notice">Aucun créneau : la programmation automatique est désactivée.</div>}
            </div>
            <button className="ghost" style={{marginTop:9}} onClick={()=>addLockSlot(b.boothName)}>＋ Ajouter un créneau</button>
            <div style={{display:"grid",gridTemplateColumns:"minmax(170px,260px) 1fr",gap:8,alignItems:"end",marginTop:12}}><label><span className="muted">PIN Admin (4 chiffres)</span><input id={\`lp28-lock-pin-\${b.boothName}\`} type="password" inputMode="numeric" maxLength="4" placeholder={b.lockScreen?.pinConfigured?"••••":"2828"} style={{width:"100%"}}/></label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><button className="primary" onClick={()=>saveLockSchedule(b.boothName)}>💾 Enregistrer</button><button onClick={()=>lockScreenAction(b.boothName,"LOCK_NOW")}>🔒 Verrouiller maintenant</button><button className="ghost" onClick={()=>lockScreenAction(b.boothName,"UNLOCK_NOW")}>🔓 Déverrouiller maintenant</button></div></div>
          </div>
          `;
a=a.slice(0,uiI)+ui+a.slice(uiJ);changes++;
}
fs.writeFileSync(appPath,a,'utf8');
console.log(`[LP28] patch-booth-lock-schedule V2 : ${changes} modification(s) appliquée(s).`);
