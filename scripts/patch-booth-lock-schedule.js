const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let changes=0;
let s=fs.readFileSync(serverPath,'utf8');
let a=fs.readFileSync(appPath,'utf8');

// Compatibilité du modèle de verrouillage avec les créneaux.
const defaultOld='lockScreen:{enabled:false,lockAt:"",unlockAt:"",pin:"2828",locked:false,updatedAt:null}';
const defaultNew='lockScreen:{enabled:false,lockAt:"",unlockAt:"",schedules:[],pin:"2828",locked:false,updatedAt:null}';
if(s.includes(defaultOld)){s=s.replaceAll(defaultOld,defaultNew);changes++;}

const readOld='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null}';
const readNew='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[],pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null}';
if(s.includes(readOld)){s=s.replaceAll(readOld,readNew);changes++;}

// Confirmation de sécurité avant les commandes manuelles.
// Aucun effet sur le démarrage de l'Agent ni sur LumaBooth.
const lockOld='<button onClick={()=>lockScreenAction(b.boothName,"LOCK_NOW")}>🔒 Verrouiller maintenant</button>';
const lockNew='<button onClick={()=>{if(window.confirm(`Verrouiller la borne ${b.boothName} maintenant ?\\n\\nL’écran d’attente LP28 va s’afficher immédiatement.`))lockScreenAction(b.boothName,"LOCK_NOW")}}>🔒 Verrouiller maintenant</button>';
if(a.includes(lockOld)){a=a.replaceAll(lockOld,lockNew);changes++;}

const unlockOld='<button className="ghost" onClick={()=>lockScreenAction(b.boothName,"UNLOCK_NOW")}>🔓 Déverrouiller maintenant</button>';
const unlockNew='<button className="ghost" onClick={()=>{if(window.confirm(`Déverrouiller la borne ${b.boothName} maintenant ?`))lockScreenAction(b.boothName,"UNLOCK_NOW")}}>🔓 Déverrouiller maintenant</button>';
if(a.includes(unlockOld)){a=a.replaceAll(unlockOld,unlockNew);changes++;}

fs.writeFileSync(serverPath,s,'utf8');
fs.writeFileSync(appPath,a,'utf8');
console.log(`[LP28] patch-booth-lock-schedule : ${changes} modification(s) appliquée(s).`);
