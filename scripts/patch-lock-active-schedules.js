const fs=require('fs'),path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let s=fs.readFileSync(serverPath,'utf8'),a=fs.readFileSync(appPath,'utf8');

const anchor='function lp28LockHistoryKey(boothName){';
if(!s.includes(anchor))throw new Error('[lock-active] historique verrouillage introuvable');

const helpers=`function lp28ParisLocalNowString(){
  const parts=new Intl.DateTimeFormat("fr-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const get=t=>parts.find(p=>p.type===t)?.value||"00";
  return \`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}\`;
}
function lp28ActiveLockSchedules(rows){
  const now=lp28ParisLocalNowString();
  return (Array.isArray(rows)?rows:[]).filter(x=>{
    if(String(x?.kind||"")==="once"){
      const start=String(x?.startAt||"");
      const end=String(x?.endAt||"");
      if(!start)return false;
      if(end)return end>now;
      return true;
    }
    if(String(x?.kind||"")==="weekly")return true;
    return false;
  });
}
`;
if(!s.includes('function lp28ActiveLockSchedules('))s=s.replace(anchor,helpers+anchor);

const oldAgent='const ls=control.lockScreen||{};const lockScreen={enabled:Boolean(ls.enabled),lockAt:String(ls.lockAt||""),unlockAt:String(ls.unlockAt||""),schedules:Array.isArray(ls.schedules)?ls.schedules:[],pin:';
const newAgent='const ls=control.lockScreen||{};const activeSchedules=lp28ActiveLockSchedules(ls.schedules);const lockScreen={enabled:activeSchedules.length>0,lockAt:String(ls.lockAt||""),unlockAt:String(ls.unlockAt||""),schedules:activeSchedules,pin:';
if(s.includes(oldAgent))s=s.replace(oldAgent,newAgent);
else if(!s.includes('const activeSchedules=lp28ActiveLockSchedules(ls.schedules)'))throw new Error('[lock-active] endpoint Agent non reconnu');

const oldAdmin='lockScreen:{enabled:Boolean(p?.lockScreen?.enabled),lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:Array.isArray(p?.lockScreen?.schedules)?p.lockScreen.schedules:[]';
const newAdmin='lockScreen:{enabled:lp28ActiveLockSchedules(p?.lockScreen?.schedules).length>0,lockAt:String(p?.lockScreen?.lockAt||""),unlockAt:String(p?.lockScreen?.unlockAt||""),schedules:lp28ActiveLockSchedules(p?.lockScreen?.schedules)';
if(s.includes(oldAdmin))s=s.replace(oldAdmin,newAdmin);
else if(!s.includes('enabled:lp28ActiveLockSchedules(p?.lockScreen?.schedules).length>0'))throw new Error('[lock-active] projection Admin non reconnue');

fs.writeFileSync(serverPath,s,'utf8');
fs.writeFileSync(appPath,a,'utf8');
console.log('[LP28] créneaux actifs : les créneaux ponctuels expirés ne sont plus actifs ni envoyés à l Agent.');
