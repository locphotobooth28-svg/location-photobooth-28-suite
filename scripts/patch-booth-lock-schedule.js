const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let changes=0;
let s=fs.readFileSync(serverPath,'utf8');
let a=fs.readFileSync(appPath,'utf8');

// Modèle lockScreen : compatible ancien écran + futurs créneaux.
const oldDefault='function defaultBoothControl(){return {display:{enabled:false,locked:false,opacity:80},powerClient:{enabled:false,powerAt:null,visible:false,locked:false,opacity:90,updatedAt:null},command:null};}';
const newDefault='function defaultBoothControl(){return {display:{enabled:false,locked:false,opacity:80},powerClient:{enabled:false,powerAt:null,visible:false,locked:false,opacity:90,updatedAt:null},lockScreen:{enabled:false,lockAt:"",unlockAt:"",schedules:[],pin:"2828",locked:false,updatedAt:null},command:null};}';
if(s.includes(oldDefault)){s=s.replace(oldDefault,newDefault);changes++;}

// Lecture persistée du verrouillage.
if(!s.includes('lockScreen:{enabled:Boolean(p?.lockScreen?.enabled)')){
  const anchor='command:p?.command||null';
  const value='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[],pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null},';
  const i=s.indexOf(anchor);if(i>=0){s=s.slice(0,i)+value+s.slice(i);changes++;}
}

// Expose l'état dans Mes Bornes sans dépendre d'un ancrage exact.
if(!s.includes('pinConfigured:Boolean(controls[name].lockScreen.pin)')){
  const marker='lastCommand:controls[name].command';
  const i=s.indexOf(marker);
  if(i>=0){s=s.slice(0,i)+'lockScreen:{enabled:controls[name].lockScreen?.enabled||false,lockAt:controls[name].lockScreen?.lockAt||"",unlockAt:controls[name].lockScreen?.unlockAt||"",locked:controls[name].lockScreen?.locked||false,pinConfigured:Boolean(controls[name].lockScreen?.pin),updatedAt:controls[name].lockScreen?.updatedAt||null},'+s.slice(i);changes++;}
}

// API de commande : c'est elle qui manquait au bouton LOCK_NOW / UNLOCK_NOW.
if(!s.includes('app.post("/api/admin/booths/:boothName/lock"')){
  const endpoint=`\napp.post("/api/admin/booths/:boothName/lock",adminOnly,async(req,res)=>{\n  try{\n    const boothName=String(req.params.boothName||"").trim().toUpperCase();\n    if(!boothName)return res.status(400).json({ok:false,message:"Borne invalide."});\n    const control=await readBoothControl(boothName);\n    control.lockScreen=control.lockScreen||{enabled:false,lockAt:"",unlockAt:"",schedules:[],pin:"2828",locked:false,updatedAt:null};\n    const action=String(req.body?.action||"SETTINGS").toUpperCase();\n    const now=new Date().toISOString();\n    if(action==="LOCK_NOW"||action==="UNLOCK_NOW"){\n      const locked=action==="LOCK_NOW";\n      control.lockScreen={...control.lockScreen,locked,updatedAt:now};\n      control.command={id:crypto.randomUUID(),type:action,status:"PENDING",createdAt:now};\n    }else if(action==="SETTINGS"){\n      const lockAt=String(req.body?.lockAt||"").trim();\n      const unlockAt=String(req.body?.unlockAt||"").trim();\n      const pin=String(req.body?.pin||"").trim();\n      const validTime=v=>v===""||/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(v);\n      if(!validTime(lockAt)||!validTime(unlockAt))return res.status(400).json({ok:false,message:"Horaire invalide (HH:mm)."});\n      if(pin&&!/^\\d{4}$/.test(pin))return res.status(400).json({ok:false,message:"Le PIN doit contenir exactement 4 chiffres."});\n      control.lockScreen={...control.lockScreen,enabled:Boolean(lockAt||unlockAt),lockAt,unlockAt,...(pin?{pin}:{}),updatedAt:now};\n    }else return res.status(400).json({ok:false,message:"Action invalide."});\n    await writeBoothControl(boothName,control);\n    return res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,lockAt:control.lockScreen.lockAt,unlockAt:control.lockScreen.unlockAt,locked:control.lockScreen.locked,pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt},command:control.command||null});\n  }catch(err){console.error("LP28 lock command:",err);return res.status(500).json({ok:false,message:err.message||"Commande de verrouillage impossible."});}\n});\n`;
  const anchor='app.post("/api/admin/booths/:boothName/display",adminOnly';
  const i=s.indexOf(anchor);if(i>=0){s=s.slice(0,i)+endpoint+s.slice(i);changes++;}
}

// Helper Admin si absent.
if(!a.includes('async function lockScreenAction(boothName,action')){
  const anchor='  async function updateDisplay(boothName,patch){';
  const helper=`  async function lockScreenAction(boothName,action,payload={}){\n    try{\n      const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(boothName)}/lock\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});\n      const d=await r.json().catch(()=>({}));\n      if(!r.ok)throw new Error(d.message||"Commande de verrouillage impossible.");\n      await load();return d;\n    }catch(e){alert(e.message||"Commande de verrouillage impossible.");return null}\n  }\n`;
  if(a.includes(anchor)){a=a.replace(anchor,helper+anchor);changes++;}
}

// Confirmation avant action manuelle, sans toucher au démarrage Agent/LumaBooth.
const lockOld='<button onClick={()=>lockScreenAction(b.boothName,"LOCK_NOW")}>🔒 Verrouiller maintenant</button>';
const lockNew='<button onClick={()=>{if(window.confirm(`Verrouiller la borne ${b.boothName} maintenant ?\\n\\nL’écran d’attente LP28 va s’afficher immédiatement.`))lockScreenAction(b.boothName,"LOCK_NOW")}}>🔒 Verrouiller maintenant</button>';
if(a.includes(lockOld)){a=a.replaceAll(lockOld,lockNew);changes++;}
const unlockOld='<button className="ghost" onClick={()=>lockScreenAction(b.boothName,"UNLOCK_NOW")}>🔓 Déverrouiller maintenant</button>';
const unlockNew='<button className="ghost" onClick={()=>{if(window.confirm(`Déverrouiller la borne ${b.boothName} maintenant ?`))lockScreenAction(b.boothName,"UNLOCK_NOW")}}>🔓 Déverrouiller maintenant</button>';
if(a.includes(unlockOld)){a=a.replaceAll(unlockOld,unlockNew);changes++;}

fs.writeFileSync(serverPath,s,'utf8');
fs.writeFileSync(appPath,a,'utf8');
console.log(`[LP28] patch-booth-lock-schedule command restore : ${changes} modification(s) appliquée(s).`);
