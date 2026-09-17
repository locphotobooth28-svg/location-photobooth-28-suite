const fs=require('fs'),path=require('path');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let a=fs.readFileSync(appPath,'utf8'),changes=0;

// IMPORTANT : après sauvegarde, l'API V2 renvoie elle-même les créneaux réellement persistés.
// On garde cette réponse comme source de vérité et on ne relance pas load() immédiatement :
// l'ancien endpoint Mes Bornes peut encore ne pas projeter schedules et effacer visuellement
// les champs alors que la sauvegarde serveur a réussi.
const oldSave="setBusy(true);try{const r=await fetch('/api/admin/booths/'+encodeURIComponent(current.boothName)+'/lock-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedules,pin})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Enregistrement impossible.');await load();}catch(e){alert(e.message)}finally{setBusy(false)}";
const previousSave="setBusy(true);try{const r=await fetch('/api/admin/booths/'+encodeURIComponent(current.boothName)+'/lock-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedules,pin})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Enregistrement impossible.');if(Array.isArray(d.lockScreen?.schedules))setRows(d.lockScreen.schedules);alert('✅ Créneaux enregistrés avec succès pour '+current.boothName+'.');await load();}catch(e){alert(e.message||'Enregistrement impossible.')}finally{setBusy(false)}";
const newSave="setBusy(true);try{const r=await fetch('/api/admin/booths/'+encodeURIComponent(current.boothName)+'/lock-schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedules,pin})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Enregistrement impossible.');if(!Array.isArray(d.lockScreen?.schedules))throw new Error('Le serveur n’a pas confirmé les créneaux enregistrés.');setRows(d.lockScreen.schedules);alert('✅ Créneaux enregistrés avec succès pour '+current.boothName+'.');}catch(e){alert(e.message||'Enregistrement impossible.')}finally{setBusy(false)}";
if(a.includes(previousSave)){a=a.replace(previousSave,newSave);changes++;}
else if(a.includes(oldSave)){a=a.replace(oldSave,newSave);changes++;}
if(!a.includes("Le serveur n’a pas confirmé les créneaux enregistrés."))throw new Error('[lock-save-confirm] sauvegarde V2 non injectée');
if(!a.includes("Créneaux enregistrés avec succès pour "))throw new Error('[lock-save-confirm] confirmation sauvegarde non injectée');

fs.writeFileSync(appPath,a,'utf8');
console.log('[LP28] lock schedule save confirmation : '+changes+' correction(s).');