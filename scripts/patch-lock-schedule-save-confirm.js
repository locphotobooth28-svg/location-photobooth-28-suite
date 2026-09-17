const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let s=fs.readFileSync(serverPath,'utf8'),a=fs.readFileSync(appPath,'utf8'),changes=0;

// Mes Bornes doit restituer les schedules après un save/reload.
// Le dashboard Pro peut reformater cette projection : on détecte donc la projection lockScreen
// contenant pinConfigured, puis on injecte schedules si nécessaire sans dépendre d'une chaîne exacte.
const projection=/lockScreen:\{[^{}]*pinConfigured:Boolean\(controls\[name\]\.lockScreen\?\.pin\)[^{}]*\},/g;
const matches=[...s.matchAll(projection)];
for(const m of matches.reverse()){
  if(m[0].includes('lockScreen.schedules'))continue;
  const insert='schedules:Array.isArray(controls[name].lockScreen?.schedules)?controls[name].lockScreen.schedules:[],';
  const pos=m.index+m[0].indexOf('locked:');
  if(pos>=m.index){s=s.slice(0,pos)+insert+s.slice(pos);changes++;}
}
const hasAdminSchedules=/lockScreen:\{[^{}]*schedules:Array\.isArray\(controls\[name\]\.lockScreen\?\.schedules\)\?controls\[name\]\.lockScreen\.schedules:\[\][^{}]*pinConfigured:Boolean\(controls\[name\]\.lockScreen\?\.pin\)[^{}]*\},/.test(s);
if(!hasAdminSchedules)throw new Error('[lock-save-confirm] schedules absents de la réponse Admin Mes Bornes');

// Après succès : conserve immédiatement les valeurs affichées + confirmation utilisateur.
const oldSave="setBusy(true);try{const r=await fetch('/api/admin/booths/'+encodeURIComponent(current.boothName)+'/lock-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedules,pin})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Enregistrement impossible.');await load();}catch(e){alert(e.message)}finally{setBusy(false)}";
const newSave="setBusy(true);try{const r=await fetch('/api/admin/booths/'+encodeURIComponent(current.boothName)+'/lock-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedules,pin})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Enregistrement impossible.');if(Array.isArray(d.lockScreen?.schedules))setRows(d.lockScreen.schedules);alert('✅ Créneaux enregistrés avec succès pour '+current.boothName+'.');await load();}catch(e){alert(e.message||'Enregistrement impossible.')}finally{setBusy(false)}";
if(a.includes(oldSave)){a=a.replace(oldSave,newSave);changes++;}
if(!a.includes("Créneaux enregistrés avec succès pour "))throw new Error('[lock-save-confirm] confirmation sauvegarde non injectée');

fs.writeFileSync(serverPath,s,'utf8');fs.writeFileSync(appPath,a,'utf8');
console.log('[LP28] lock schedule save confirmation : '+changes+' correction(s).');