const fs=require("fs");
const path=require("path");
let changes=0;

// ===== Backend : commandes Power client =====
const serverPath=path.join(process.cwd(),"server.js");
let server=fs.readFileSync(serverPath,"utf8");

const oldDefault='function defaultBoothControl(){return {display:{enabled:false,locked:false,opacity:80},command:null};}';
const newDefault='function defaultBoothControl(){return {display:{enabled:false,locked:false,opacity:80},powerClient:{enabled:false,powerAt:null,visible:false,updatedAt:null},command:null};}';
if(server.includes(oldDefault)){server=server.replace(oldDefault,newDefault);changes++;}

const oldRead='try{const p=JSON.parse(row.value||"{}");return {display:{enabled:Boolean(p?.display?.enabled),locked:Boolean(p?.display?.locked),opacity:Math.max(20,Math.min(100,Number(p?.display?.opacity)||80))},command:p?.command||null};}catch{return defaultBoothControl()}';
const newRead='try{const p=JSON.parse(row.value||"{}");return {display:{enabled:Boolean(p?.display?.enabled),locked:Boolean(p?.display?.locked),opacity:Math.max(20,Math.min(100,Number(p?.display?.opacity)||80))},powerClient:{enabled:Boolean(p?.powerClient?.enabled),powerAt:p?.powerClient?.powerAt||null,visible:Boolean(p?.powerClient?.visible),updatedAt:p?.powerClient?.updatedAt||null},command:p?.command||null};}catch{return defaultBoothControl()}';
if(server.includes(oldRead)){server=server.replace(oldRead,newRead);changes++;}

const oldCommand='app.post("/api/admin/booths/:boothName/command",adminOnly,async(req,res)=>{const boothName=String(req.params.boothName||"").trim().toUpperCase();const command=String(req.body?.command||"").trim().toUpperCase();if(!["LOLA","NINA","GABIN"].includes(boothName))return res.status(400).json({ok:false,message:"Borne invalide."});if(!["RESTART","SHUTDOWN"].includes(command))return res.status(400).json({ok:false,message:"Commande invalide."});const control=await readBoothControl(boothName);control.command={id:crypto.randomUUID(),type:command,status:"PENDING",createdAt:new Date().toISOString()};await writeBoothControl(boothName,control);res.json({ok:true,command:control.command});});';
const newCommand='app.post("/api/admin/booths/:boothName/command",adminOnly,async(req,res)=>{const boothName=String(req.params.boothName||"").trim().toUpperCase();const command=String(req.body?.command||"").trim().toUpperCase();if(!["LOLA","NINA","GABIN"].includes(boothName))return res.status(400).json({ok:false,message:"Borne invalide."});if(!["RESTART","SHUTDOWN","POWER_SCHEDULE","POWER_SHOW","POWER_HIDE"].includes(command))return res.status(400).json({ok:false,message:"Commande invalide."});const control=await readBoothControl(boothName);let powerAt=null;if(command==="POWER_SCHEDULE"){const parsed=new Date(String(req.body?.powerAt||""));if(Number.isNaN(parsed.getTime()))return res.status(400).json({ok:false,message:"Date/heure Power invalide."});powerAt=parsed.toISOString();control.powerClient={enabled:true,powerAt,visible:false,updatedAt:new Date().toISOString()};}else if(command==="POWER_SHOW"){control.powerClient={...(control.powerClient||{}),enabled:true,visible:true,updatedAt:new Date().toISOString()};}else if(command==="POWER_HIDE"){control.powerClient={enabled:false,powerAt:null,visible:false,updatedAt:new Date().toISOString()};}control.command={id:crypto.randomUUID(),type:command,status:"PENDING",createdAt:new Date().toISOString(),...(powerAt?{powerAt}:{})};await writeBoothControl(boothName,control);res.json({ok:true,command:control.command,powerClient:control.powerClient||null});});';
if(server.includes(oldCommand)){server=server.replace(oldCommand,newCommand);changes++;}

const oldConfigured='return {...s,display:controls[name].display,lastCommand:controls[name].command};';
const newConfigured='return {...s,display:controls[name].display,powerClient:controls[name].powerClient,lastCommand:controls[name].command};';
if(server.includes(oldConfigured)){server=server.replace(oldConfigured,newConfigured);changes++;}

fs.writeFileSync(serverPath,server,"utf8");

// ===== Frontend : Mes bornes =====
const appPath=path.join(process.cwd(),"client","src","App.jsx");
let app=fs.readFileSync(appPath,"utf8");

if(!app.includes('async function powerClientCommand(name,command,powerAt=null)')){
  const anchor='  const frDate=v=>v?new Date(v).toLocaleDateString("fr-FR"):"—";';
  const helpers=`  async function powerClientCommand(name,command,powerAt=null){\n    try{\n      const r=await fetch(\`/api/admin/booths/\${encodeURIComponent(name)}/command\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command,...(powerAt?{powerAt}:{})})});\n      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.message||"Commande Power impossible.");\n      alert(command==="POWER_SCHEDULE"?"Bouton Power programmé sur "+name+".":command==="POWER_SHOW"?"Bouton Power demandé immédiatement sur "+name+".":"Bouton Power masqué et désactivé sur "+name+".");\n      window.location.reload();\n    }catch(e){alert(e.message||"Commande Power impossible.")}\n  }\n  function schedulePowerClient(name){const el=document.getElementById(\`lp28-power-\${name}\`);if(!el?.value)return alert("Choisis une date et une heure.");const d=new Date(el.value);if(Number.isNaN(d.getTime()))return alert("Date/heure invalide.");powerClientCommand(name,"POWER_SCHEDULE",d.toISOString())}\n  const powerLocalValue=v=>{if(!v)return "";const d=new Date(v);if(Number.isNaN(d.getTime()))return "";const z=n=>String(n).padStart(2,"0");return \`\${d.getFullYear()}-\${z(d.getMonth()+1)}-\${z(d.getDate())}T\${z(d.getHours())}:\${z(d.getMinutes())}\`};\n`;
  if(!app.includes(anchor))throw new Error('[LP28] Ancre helpers AdminBooths introuvable.');
  app=app.replace(anchor,anchor+'\n'+helpers); changes++;
}

if(!app.includes('className="lp28-power-client-admin"')){
  const anchor='<button className="ghost" style={{marginTop:10}} onClick={()=>openHistory(b.boothName)}>🧾 Historique imprimante</button>';
  const ui=`<button className="ghost" style={{marginTop:10}} onClick={()=>openHistory(b.boothName)}>🧾 Historique imprimante</button>\n          <div className="lp28-power-client-admin" style={{marginTop:10,padding:12,border:"1px solid var(--border)",borderRadius:12}}>\n            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong>⏻ Arrêt client</strong><span className="muted">{b.powerClient?.visible?"🟡 Bouton affiché":b.powerClient?.enabled?"🟢 Programmé":"⚪ Désactivé"}</span></div>\n            {b.powerClient?.powerAt&&<div className="muted" style={{marginTop:5}}>Disponible à partir du {new Date(b.powerClient.powerAt).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</div>}\n            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:9,alignItems:"center"}}>\n              <input id={\`lp28-power-\${b.boothName}\`} type="datetime-local" defaultValue={powerLocalValue(b.powerClient?.powerAt)} style={{minWidth:190}}/>\n              <button className="primary" onClick={()=>schedulePowerClient(b.boothName)}>💾 Programmer</button>\n              <button className="ghost" onClick={()=>powerClientCommand(b.boothName,"POWER_SHOW")}>👁 Afficher maintenant</button>\n              <button className="ghost" onClick={()=>powerClientCommand(b.boothName,"POWER_HIDE")}>🚫 Masquer</button>\n            </div>\n            <div className="muted" style={{marginTop:6,fontSize:12}}>Aucun arrêt automatique : le client choisit quand éteindre la borne.</div>\n          </div>`;
  if(!app.includes(anchor))throw new Error('[LP28] Bouton historique imprimante introuvable après patch précédent.');
  app=app.replace(anchor,ui); changes++;
}

if(app.includes('Version 8.5.90')){app=app.split('Version 8.5.90').join('Version 8.5.91');changes++;}
if(app.includes('Version 8.5.89')){app=app.split('Version 8.5.89').join('Version 8.5.91');changes++;}
if(app.includes('Version 8.5.88')){app=app.split('Version 8.5.88').join('Version 8.5.91');changes++;}
fs.writeFileSync(appPath,app,"utf8");
console.log(`[LP28] patch-booth-power-client : ${changes} modification(s) appliquée(s).`);
