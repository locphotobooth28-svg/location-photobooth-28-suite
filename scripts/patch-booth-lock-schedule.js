const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let changes=0;
let s=fs.readFileSync(serverPath,'utf8');
let a=fs.readFileSync(appPath,'utf8');

// This patch runs after patch-booth-power-client.js. Keep it idempotent and
// avoid depending on one exact serialized readBoothControl string.
if(s.includes('/api/admin/booths/:boothName/lock') && a.includes('lp28-lock-schedule-admin')){
  console.log('[LP28] patch-booth-lock-schedule : déjà appliqué, aucune modification nécessaire.');
  process.exit(0);
}

if(!s.includes('lockScreen:{enabled:false,lockAt:"",unlockAt:"",pin:"2828"')){
  const oldDefault='function defaultBoothControl(){return {display:{enabled:false,locked:false,opacity:80},powerClient:{enabled:false,powerAt:null,visible:false,locked:false,opacity:90,updatedAt:null},command:null};}';
  const newDefault='function defaultBoothControl(){return {display:{enabled:false,locked:false,opacity:80},powerClient:{enabled:false,powerAt:null,visible:false,locked:false,opacity:90,updatedAt:null},lockScreen:{enabled:false,lockAt:"",unlockAt:"",pin:"2828",locked:false,updatedAt:null},command:null};}';
  if(!s.includes(oldDefault)) throw new Error('defaultBoothControl anchor missing after power patch');
  s=s.replace(oldDefault,newDefault);changes++;
}

if(!s.includes('lockScreen:{enabled:Boolean(p?.lockScreen?.enabled)')){
  const commandAnchor='command:p?.command||null';
  const lockRead='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null},';
  const idx=s.indexOf(commandAnchor);
  if(idx<0) throw new Error('readBoothControl command anchor missing');
  s=s.slice(0,idx)+lockRead+s.slice(idx);changes++;
}

if(!s.includes('lockScreen:{enabled:controls[name].lockScreen.enabled')){
  const configuredOld='return {...s,display:controls[name].display,powerClient:controls[name].powerClient,lastCommand:controls[name].command};';
  const configuredNew='return {...s,display:controls[name].display,powerClient:controls[name].powerClient,lockScreen:{enabled:controls[name].lockScreen.enabled,lockAt:controls[name].lockScreen.lockAt,unlockAt:controls[name].lockScreen.unlockAt,locked:controls[name].lockScreen.locked,pinConfigured:Boolean(controls[name].lockScreen.pin),updatedAt:controls[name].lockScreen.updatedAt},lastCommand:controls[name].command};';
  if(!s.includes(configuredOld)) throw new Error('admin booths configured anchor missing');
  s=s.replace(configuredOld,configuredNew);changes++;
}

if(!s.includes('/api/admin/booths/:boothName/lock')){
  const endpoint=`\napp.post("/api/admin/booths/:boothName/lock",adminOnly,async(req,res)=>{\n  const boothName=String(req.params.boothName||"").trim().toUpperCase();\n  if(!["LOLA","NINA","GABIN"].includes(boothName))return res.status(400).json({ok:false,message:"Borne invalide."});\n  const control=await readBoothControl(boothName);\n  control.lockScreen=control.lockScreen||{enabled:false,lockAt:"",unlockAt:"",pin:"2828",locked:false,updatedAt:null};\n  const action=String(req.body?.action||"SETTINGS").toUpperCase();\n  const validTime=v=>v===""||/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(v);\n  if(action==="SETTINGS"){\n    const lockAt=String(req.body?.lockAt||"").trim(),unlockAt=String(req.body?.unlockAt||"").trim(),pin=String(req.body?.pin||"").trim();\n    if(!validTime(lockAt)||!validTime(unlockAt))return res.status(400).json({ok:false,message:"Horaire invalide (HH:mm)."});\n    if(pin&&!/^\\d{4}$/.test(pin))return res.status(400).json({ok:false,message:"Le PIN doit contenir exactement 4 chiffres."});\n    control.lockScreen={...control.lockScreen,enabled:Boolean(lockAt||unlockAt),lockAt,unlockAt,...(pin?{pin}:{}),updatedAt:new Date().toISOString()};\n  }else if(action==="LOCK_NOW"||action==="UNLOCK_NOW"){\n    const locked=action==="LOCK_NOW";\n    control.lockScreen={...control.lockScreen,locked,updatedAt:new Date().toISOString()};\n    control.command={id:crypto.randomUUID(),type:action,status:"PENDING",createdAt:new Date().toISOString()};\n  }else return res.status(400).json({ok:false,message:"Action invalide."});\n  await writeBoothControl(boothName,control);\n  res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,lockAt:control.lockScreen.lockAt,unlockAt:control.lockScreen.unlockAt,locked:control.lockScreen.locked,pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt},command:control.command||null});\n});\n`;
  const anchor='app.post("/api/admin/booths/:boothName/display",adminOnly';
  const i=s.indexOf(anchor);if(i<0)throw new Error('display endpoint anchor missing');
  s=s.slice(0,i)+endpoint+s.slice(i);changes++;
}
fs.writeFileSync(serverPath,s,'utf8');

if(!a.includes('async function saveLockSchedule(boothName)')){
  const helperAnchor='  async function updateDisplay(boothName,patch){';
  const helper=`  async function lockScreenAction(boothName,action,payload={}){\n    try{const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(boothName)}/lock\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Réglage verrouillage impossible.");await load();return d}catch(e){alert(e.message||"Réglage verrouillage impossible.");return null}\n  }\n  async function saveLockSchedule(boothName){const lockAt=document.getElementById(\`lp28-lock-at-\${boothName}\`)?.value||"";const unlockAt=document.getElementById(\`lp28-unlock-at-\${boothName}\`)?.value||"";const pin=document.getElementById(\`lp28-lock-pin-\${boothName}\`)?.value||"";const d=await lockScreenAction(boothName,"SETTINGS",{lockAt,unlockAt,pin});if(d)alert("🔒 Programmation enregistrée pour "+boothName+".")}\n`;
  if(!a.includes(helperAnchor))throw new Error('AdminBooths helper anchor missing');
  a=a.replace(helperAnchor,helper+helperAnchor);changes++;
}

if(!a.includes('lp28-lock-schedule-admin')){
  const uiAnchor='<div className="booth-display-settings">';
  const ui=`<div className="lp28-lock-schedule-admin" style={{marginTop:14,padding:12,border:"1px solid #5b4b22",borderRadius:12}}>\n            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:18,color:"#f5d45c"}}>🔒 Verrouillage événement</strong><span className="muted">{b.lockScreen?.locked?"🔒 Verrouillée":b.lockScreen?.enabled?"🕐 Programmée":"⚪ Désactivée"}</span></div>\n            <div className="muted" style={{fontSize:12,marginTop:5}}>Affiche l’écran « Votre événement va bientôt commencer » jusqu’au déverrouillage.</div>\n            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10}}>\n              <label><span className="muted">Verrouillage</span><input id={\`lp28-lock-at-\${b.boothName}\`} type="time" defaultValue={b.lockScreen?.lockAt||""} style={{width:"100%"}}/></label>\n              <label><span className="muted">Déverrouillage</span><input id={\`lp28-unlock-at-\${b.boothName}\`} type="time" defaultValue={b.lockScreen?.unlockAt||""} style={{width:"100%"}}/></label>\n              <label><span className="muted">PIN Admin (4 chiffres)</span><input id={\`lp28-lock-pin-\${b.boothName}\`} type="password" inputMode="numeric" maxLength="4" placeholder={b.lockScreen?.pinConfigured?"••••":"2828"} style={{width:"100%"}}/></label>\n            </div>\n            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}><button className="primary" onClick={()=>saveLockSchedule(b.boothName)}>💾 Enregistrer</button><button onClick={()=>lockScreenAction(b.boothName,"LOCK_NOW")}>🔒 Verrouiller maintenant</button><button className="ghost" onClick={()=>lockScreenAction(b.boothName,"UNLOCK_NOW")}>🔓 Déverrouiller maintenant</button></div>\n            <div className="muted" style={{fontSize:12,marginTop:7}}>Les deux horaires sont facultatifs. Laisse un champ vide si tu ne veux programmer que le verrouillage ou que le déverrouillage.</div>\n          </div>\n          `;
  if(!a.includes(uiAnchor))throw new Error('UI anchor missing');
  a=a.replace(uiAnchor,ui+uiAnchor);changes++;
}
fs.writeFileSync(appPath,a,'utf8');
console.log(`[LP28] patch-booth-lock-schedule : ${changes} modification(s) appliquée(s).`);
