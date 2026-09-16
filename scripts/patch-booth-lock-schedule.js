const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let changes=0;
let s=fs.readFileSync(serverPath,'utf8');
let a=fs.readFileSync(appPath,'utf8');

// Étape 1 : compatibilité du modèle de verrouillage avec les créneaux.
// Ce patch reste volontairement tolérant si les anciens patchs sont déjà présents.
const defaultOld='lockScreen:{enabled:false,lockAt:"",unlockAt:"",pin:"2828",locked:false,updatedAt:null}';
const defaultNew='lockScreen:{enabled:false,lockAt:"",unlockAt:"",schedules:[],pin:"2828",locked:false,updatedAt:null}';
if(s.includes(defaultOld)){s=s.replaceAll(defaultOld,defaultNew);changes++;}

const readOld='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null}';
const readNew='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[],pin:/^\\d{4}$/.test(String(p?.lockScreen?.pin||""))?String(p.lockScreen.pin):"2828",locked:Boolean(p?.lockScreen?.locked),updatedAt:p?.lockScreen?.updatedAt||null}';
if(s.includes(readOld)){s=s.replaceAll(readOld,readNew);changes++;}

// Ne jamais casser le build si la forme exacte a déjà évolué.
fs.writeFileSync(serverPath,s,'utf8');
fs.writeFileSync(appPath,a,'utf8');
console.log(`[LP28] patch-booth-lock-schedule schedules-storage : ${changes} modification(s) appliquée(s).`);
