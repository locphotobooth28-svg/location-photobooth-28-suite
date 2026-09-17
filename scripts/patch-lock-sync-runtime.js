const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let s=fs.readFileSync(serverPath,'utf8'),a=fs.readFileSync(appPath,'utf8'),changes=0;

// Dernier filet de securite du build : readBoothControl DOIT conserver schedules + manualOverride.
const readRe=/lockScreen:\{enabled:Boolean\(p\?\.lockScreen\?\.enabled\),lockAt:String\(p\?\.lockScreen\?\.lockAt\|\|""\),unlockAt:String\(p\?\.lockScreen\?\.unlockAt\|\|""\),(?:schedules:Array\.isArray\(p\?\.lockScreen\?\.schedules\)\?p\.lockScreen\.schedules:\[\],)?pin:\/\^\\d\{4\}\$\/\.test\(String\(p\?\.lockScreen\?\.pin\|\|""\)\)\?String\(p\.lockScreen\.pin\):"2828",locked:Boolean\(p\?\.lockScreen\?\.locked\),(?:manualOverride:\["LOCK","UNLOCK"\]\.includes\(String\(p\?\.lockScreen\?\.manualOverride\|\|""\)\.toUpperCase\(\)\)\?String\(p\.lockScreen\.manualOverride\)\.toUpperCase\(\):null,)?updatedAt:p\?\.lockScreen\?\.updatedAt\|\|null\}/;
const readSafe='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[],pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),manualOverride:["LOCK","UNLOCK"].includes(String(p?.lockScreen?.manualOverride||"").toUpperCase())?String(p.lockScreen.manualOverride).toUpperCase():null,updatedAt:p?.lockScreen?.updatedAt||null}';
if(readRe.test(s)){s=s.replace(readRe,readSafe);changes++;}
if(!s.includes('schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[]'))throw new Error('[lock-sync-runtime] readBoothControl ne projette pas schedules');

// L'endpoint Agent renvoie explicitement le contrat de verrouillage.
// IMPORTANT : remplacement par bornes exactes pour ne jamais laisser le corps de l'ancien endpoint derriere le nouveau.
const agentStart='app.get("/api/booth-agent/control",boothAgentOnly,';
const agentEnd='app.post("/api/booth-agent/control/ack",boothAgentOnly,';
const ai=s.indexOf(agentStart),aj=s.indexOf(agentEnd,ai+agentStart.length);
if(ai<0||aj<0||aj<=ai)throw new Error('[lock-sync-runtime] bornes endpoint Agent control introuvables');
const agentSafe='app.get("/api/booth-agent/control",boothAgentOnly,async(req,res)=>{const boothName=String(req.query?.boothName||"").trim().toUpperCase();if(!["LOLA","NINA","GABIN"].includes(boothName))return res.status(400).json({ok:false,message:"Borne invalide."});const control=await readBoothControl(boothName);const ls=control.lockScreen||{};const lockScreen={enabled:Boolean(ls.enabled),lockAt:String(ls.lockAt||""),unlockAt:String(ls.unlockAt||""),schedules:Array.isArray(ls.schedules)?ls.schedules:[],pin:/^\\d{4}$/.test(String(ls.pin||""))?String(ls.pin):"2828",locked:Boolean(ls.locked),manualOverride:["LOCK","UNLOCK"].includes(String(ls.manualOverride||"").toUpperCase())?String(ls.manualOverride).toUpperCase():null,updatedAt:ls.updatedAt||null};res.json({ok:true,...control,lockScreen});});\n';
s=s.slice(0,ai)+agentSafe+s.slice(aj);changes++;

// Historique persistant, sans jamais stocker le PIN.
const historyHelpers='\nfunction lp28LockHistoryKey(boothName){return `boothLockHistory:${String(boothName||"").trim().toUpperCase()}`;}\nasync function lp28AddLockHistory(boothName,type,details={}){try{const key=lp28LockHistoryKey(boothName);const row=await prisma.appSetting.findUnique({where:{key}}).catch(()=>null);let history=[];try{history=JSON.parse(row?.value||"[]")}catch{};if(!Array.isArray(history))history=[];history.push({id:crypto.randomUUID(),at:new Date().toISOString(),type,...details});history=history.slice(-100);await prisma.appSetting.upsert({where:{key},update:{value:JSON.stringify(history)},create:{key,value:JSON.stringify(history)}});}catch(err){console.warn("LOCK HISTORY:",err.message);}}\n';
if(!s.includes('function lp28LockHistoryKey(')){
 const anchor='function boothControlKey(boothName){';const i=s.indexOf(anchor);if(i<0)throw new Error('[lock-sync-runtime] boothControlKey introuvable');s=s.slice(0,i)+historyHelpers+s.slice(i);changes++;
}

// Confirme la sauvegarde cote serveur et historise programmation/PIN sans valeur sensible.
const saveNeedle='await writeBoothControl(boothName,control);\n  return res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,schedules:control.lockScreen.schedules,locked:Boolean(control.lockScreen.locked),pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt}});';
const saveReplacement='await writeBoothControl(boothName,control);\n  await lp28AddLockHistory(boothName,"SCHEDULE_SAVED",{scheduleCount:schedules.length,pinUpdated:Boolean(pin)});\n  console.log(`LOCK CONFIG SAVED : ${boothName} / schedules=${schedules.length} / pinUpdated=${Boolean(pin)} / updatedAt=${control.lockScreen.updatedAt}`);\n  return res.json({ok:true,lockScreen:{enabled:control.lockScreen.enabled,schedules:control.lockScreen.schedules,locked:Boolean(control.lockScreen.locked),pinConfigured:Boolean(control.lockScreen.pin),updatedAt:control.lockScreen.updatedAt}});';
if(s.includes(saveNeedle)){s=s.replace(saveNeedle,saveReplacement);changes++;}else throw new Error('[lock-sync-runtime] sauvegarde V2 introuvable');

// Historique des commandes manuelles = commande demandee, pas execution pretendue.
const manualNeedle='control.command={id:crypto.randomUUID(),type:action,status:"PENDING",createdAt:now};';
if(s.includes(manualNeedle)&&!s.includes('MANUAL_LOCK_REQUESTED')){s=s.replace(manualNeedle,manualNeedle+'\n      await lp28AddLockHistory(boothName,locked?"MANUAL_LOCK_REQUESTED":"MANUAL_UNLOCK_REQUESTED",{});');changes++;}

// API Admin historique.
if(!s.includes('app.get("/api/admin/booths/:boothName/lock-history"')){
 const endpoint='\napp.get("/api/admin/booths/:boothName/lock-history",adminOnly,async(req,res)=>{try{const boothName=String(req.params.boothName||"").trim().toUpperCase();const row=await prisma.appSetting.findUnique({where:{key:lp28LockHistoryKey(boothName)}}).catch(()=>null);let history=[];try{history=JSON.parse(row?.value||"[]")}catch{};res.json({ok:true,history:Array.isArray(history)?history.slice(-100).reverse():[]});}catch(err){res.status(500).json({ok:false,message:"Historique indisponible."});}});\n';
 const anchor='app.post("/api/admin/booths/:boothName/display",adminOnly';const i=s.indexOf(anchor);if(i<0)throw new Error('[lock-sync-runtime] ancrage display introuvable');s=s.slice(0,i)+endpoint+s.slice(i);changes++;
}

// Validation client : aucune ligne partiellement remplie ne doit etre supprimee silencieusement.
const filterLine="const schedules=rows.filter(x=>x.kind==='once'?(x.startAt&&x.endAt):(Array.isArray(x.days)&&x.days.length&&x.startTime&&x.endTime));";
const validation="if(pin&&!/^\\d{4}$/.test(pin)){alert('Le PIN doit contenir exactement 4 chiffres.');return;} const schedules=[];for(let i=0;i<rows.length;i++){const x=rows[i];if(x.kind==='once'){const any=Boolean(x.startAt||x.endAt);if(!any)continue;if(!x.startAt||!x.endAt){alert('Renseigne l’ouverture et la fermeture du créneau '+(i+1)+'.');return;}if(x.endAt<=x.startAt){alert('La fermeture du créneau '+(i+1)+' doit être après l’ouverture.');return;}schedules.push(x);}else{const any=Boolean((x.days||[]).length||x.startTime||x.endTime);if(!any)continue;if(!(Array.isArray(x.days)&&x.days.length&&x.startTime&&x.endTime)){alert('Complète les jours, l’ouverture et la fermeture du créneau '+(i+1)+'.');return;}schedules.push(x);}}";
if(a.includes(filterLine)){a=a.replace(filterLine,validation);changes++;}
if(!a.includes("Renseigne l’ouverture et la fermeture du créneau"))throw new Error('[lock-sync-runtime] validation client non injectee');

fs.writeFileSync(serverPath,s,'utf8');fs.writeFileSync(appPath,a,'utf8');
console.log('[LP28] lock sync runtime + history : '+changes+' correction(s).');
