const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let s=fs.readFileSync(serverPath,'utf8'),a=fs.readFileSync(appPath,'utf8'),changes=0;

// Dernier filet de securite du build : readBoothControl DOIT conserver schedules + manualOverride.
const readRe=/lockScreen:\{enabled:Boolean\(p\?\.lockScreen\?\.enabled\),lockAt:String\(p\?\.lockScreen\?\.lockAt\|\|""\),unlockAt:String\(p\?\.lockScreen\?\.unlockAt\|\|""\),(?:schedules:Array\.isArray\(p\?\.lockScreen\?\.schedules\)\?p\.lockScreen\.schedules:\[\],)?pin:\/\^\\d\{4\}\$\/\.test\(String\(p\?\.lockScreen\?\.pin\|\|""\)\)\?String\(p\.lockScreen\.pin\):"2828",locked:Boolean\(p\?\.lockScreen\?\.locked\),(?:manualOverride:\["LOCK","UNLOCK"\]\.includes\(String\(p\?\.lockScreen\?\.manualOverride\|\|""\)\.toUpperCase\(\)\)\?String\(p\.lockScreen\.manualOverride\)\.toUpperCase\(\):null,)?updatedAt:p\?\.lockScreen\?\.updatedAt\|\|null\}/;
const readSafe='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[],pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),manualOverride:["LOCK","UNLOCK"].includes(String(p?.lockScreen?.manualOverride||"").toUpperCase())?String(p.lockScreen.manualOverride).toUpperCase():null,updatedAt:p?.lockScreen?.updatedAt||null}';
if(readRe.test(s)){s=s.replace(readRe,readSafe);changes++;}
if(!s.includes('schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[]'))throw new Error('[lock-sync-runtime] readBoothControl ne projette pas schedules');

const agentStart='app.get("/api/booth-agent/control",boothAgentOnly,';
const agentEnd='app.post("/api/booth-agent/control/ack",boothAgentOnly,';
const ai=s.indexOf(agentStart),aj=s.indexOf(agentEnd,ai+agentStart.length);
if(ai<0||aj<0||aj<=ai)throw new Error('[lock-sync-runtime] bornes endpoint Agent control introuvables');
const agentSafe='app.get("/api/booth-agent/control",boothAgentOnly,async(req,res)=>{const boothName=String(req.query?.boothName||"").trim().toUpperCase();if(!["LOLA","NINA","GABIN"].includes(boothName))return res.status(400).json({ok:false,message:"Borne invalide."});const control=await readBoothControl(boothName);const ls=control.lockScreen||{};const lockScreen={enabled:Boolean(ls.enabled),lockAt:String(ls.lockAt||""),unlockAt:String(ls.unlockAt||""),schedules:Array.isArray(ls.schedules)?ls.schedules:[],pin:/^\\d{4}$/.test(String(ls.pin||""))?String(ls.pin):"2828",locked:Boolean(ls.locked),manualOverride:["LOCK","UNLOCK"].includes(String(ls.manualOverride||"").toUpperCase())?String(ls.manualOverride).toUpperCase():null,updatedAt:ls.updatedAt||null};res.json({ok:true,...control,lockScreen});});\n';
s=s.slice(0,ai)+agentSafe+s.slice(aj);changes++;

const historyHelpers='\nfunction lp28LockHistoryKey(boothName){return `boothLockHistory:${String(boothName||"").trim().toUpperCase()}`;}\nasync function lp28AddLockHistory(boothName,type,details={}){try{const key=lp28LockHistoryKey(boothName);const row=await prisma.appSetting.findUnique({where:{key}}).catch(()=>null);let history=[];try{history=JSON.parse(row?.value||"[]")}catch{};if(!Array.isArray(history))history=[];history.push({id:crypto.randomUUID(),at:new Date().toISOString(),type,...details});history=history.slice(-100);await prisma.appSetting.upsert({where:{key},update:{value:JSON.stringify(history)},create:{key,value:JSON.stringify(history)}});}catch(err){console.warn("LOCK HISTORY:",err.message);}}\n';
if(!s.includes('function lp28LockHistoryKey(')){
 const anchor='function boothControlKey(boothName){';const i=s.indexOf(anchor);if(i<0)throw new Error('[lock-sync-runtime] boothControlKey introuvable');s=s.slice(0,i)+historyHelpers+s.slice(i);changes++;
}

const saveNeedle='await writeBoothControl(boothName,control);\n  return res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,schedules:control.lockScreen.schedules,locked:Boolean(control.lockScreen.locked),pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt}});';
const saveReplacement='await writeBoothControl(boothName,control);\n  await lp28AddLockHistory(boothName,"SCHEDULE_SAVED",{scheduleCount:schedules.length,schedules:schedules.map(x=>x.kind==="once"?{kind:"once",startAt:x.startAt,endAt:x.endAt||null}:{kind:"weekly",days:x.days,startTime:x.startTime,endTime:x.endTime}),pinUpdated:Boolean(pin)});\n  console.log(`LOCK CONFIG SAVED : ${boothName} / schedules=${schedules.length} / pinUpdated=${Boolean(pin)} / updatedAt=${control.lockScreen.updatedAt}`);\n  return res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,schedules:control.lockScreen.schedules,locked:Boolean(control.lockScreen.locked),pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt}});';
if(s.includes(saveNeedle)){s=s.replace(saveNeedle,saveReplacement);changes++;}else if(!s.includes('"SCHEDULE_SAVED"'))throw new Error('[lock-sync-runtime] sauvegarde V2 introuvable');

const manualNeedle='control.command={id:crypto.randomUUID(),type:action,status:"PENDING",createdAt:now};';
if(s.includes(manualNeedle)&&!s.includes('MANUAL_LOCK_REQUESTED')){s=s.replace(manualNeedle,manualNeedle+'\n      await lp28AddLockHistory(boothName,locked?"MANUAL_LOCK_REQUESTED":"MANUAL_UNLOCK_REQUESTED",{});');changes++;}

if(!s.includes('app.get("/api/admin/booths/:boothName/lock-history"')){
 const endpoint='\napp.get("/api/admin/booths/:boothName/lock-history",adminOnly,async(req,res)=>{try{const boothName=String(req.params.boothName||"").trim().toUpperCase();const row=await prisma.appSetting.findUnique({where:{key:lp28LockHistoryKey(boothName)}}).catch(()=>null);let history=[];try{history=JSON.parse(row?.value||"[]")}catch{};res.json({ok:true,history:Array.isArray(history)?history.slice(-100).reverse():[]});}catch(err){res.status(500).json({ok:false,message:"Historique indisponible."});}});\n';
 const anchor='app.post("/api/admin/booths/:boothName/display",adminOnly';const i=s.indexOf(anchor);if(i<0)throw new Error('[lock-sync-runtime] ancrage display introuvable');s=s.slice(0,i)+endpoint+s.slice(i);changes++;
}

// V3 : pour un événement ponctuel, seule l'ouverture est obligatoire. La fermeture est facultative.
const filterLine="const schedules=rows.filter(x=>x.kind==='once'?(x.startAt&&x.endAt):(Array.isArray(x.days)&&x.days.length&&x.startTime&&x.endTime));";
const validation="if(pin&&!/^\\d{4}$/.test(pin)){alert('Le PIN doit contenir exactement 4 chiffres.');return;} const schedules=[];for(let i=0;i<rows.length;i++){const x=rows[i];if(x.kind==='once'){const any=Boolean(x.startAt||x.endAt);if(!any)continue;if(!x.startAt){alert('Renseigne l’ouverture du créneau '+(i+1)+'.');return;}if(x.endAt&&x.endAt<=x.startAt){alert('La fermeture du créneau '+(i+1)+' doit être après l’ouverture.');return;}schedules.push({...x,endAt:x.endAt||null});}else{const any=Boolean((x.days||[]).length||x.startTime||x.endTime);if(!any)continue;if(!(Array.isArray(x.days)&&x.days.length&&x.startTime&&x.endTime)){alert('Complète les jours, l’ouverture et la fermeture du créneau '+(i+1)+'.');return;}schedules.push(x);}}";
if(a.includes(filterLine)){a=a.replace(filterLine,validation);changes++;}
else if(a.includes("Renseigne l’ouverture et la fermeture du créneau")){
 const old="if(pin&&!/^\\d{4}$/.test(pin)){alert('Le PIN doit contenir exactement 4 chiffres.');return;} const schedules=[];for(let i=0;i<rows.length;i++){const x=rows[i];if(x.kind==='once'){const any=Boolean(x.startAt||x.endAt);if(!any)continue;if(!x.startAt||!x.endAt){alert('Renseigne l’ouverture et la fermeture du créneau '+(i+1)+'.');return;}if(x.endAt<=x.startAt){alert('La fermeture du créneau '+(i+1)+' doit être après l’ouverture.');return;}schedules.push(x);}else{const any=Boolean((x.days||[]).length||x.startTime||x.endTime);if(!any)continue;if(!(Array.isArray(x.days)&&x.days.length&&x.startTime&&x.endTime)){alert('Complète les jours, l’ouverture et la fermeture du créneau '+(i+1)+'.');return;}schedules.push(x);}}";
 if(!a.includes(old))throw new Error('[lock-sync-runtime] validation V2 inattendue');a=a.replace(old,validation);changes++;
}
if(!a.includes("Renseigne l’ouverture du créneau"))throw new Error('[lock-sync-runtime] validation V3 non injectee');

// API V3 : autorise endAt vide/null pour les créneaux ponctuels.
const oldServer='if(!localDateTime.test(startAt)||!localDateTime.test(endAt)||endAt<=startAt)return res.status(400).json({ok:false,message:"Créneau ponctuel invalide : la fin doit être après le début."});\\n    schedules.push({id:String(x?.id||crypto.randomUUID()),kind:"once",startAt,endAt});';
const newServer='if(!localDateTime.test(startAt)||(endAt&&(!localDateTime.test(endAt)||endAt<=startAt)))return res.status(400).json({ok:false,message:"Créneau ponctuel invalide : ouverture obligatoire, fermeture facultative mais postérieure à l’ouverture."});\\n    schedules.push({id:String(x?.id||crypto.randomUUID()),kind:"once",startAt,endAt:endAt||null});';
if(s.includes(oldServer)){s=s.replace(oldServer,newServer);changes++;}

// Libellé explicite côté Admin.
a=a.replaceAll('<label>Fermeture<input type="datetime-local"','<label>Fermeture automatique (facultative)<input type="datetime-local"');

fs.writeFileSync(serverPath,s,'utf8');fs.writeFileSync(appPath,a,'utf8');
console.log('[LP28] lock sync runtime V3 : '+changes+' correction(s).');
