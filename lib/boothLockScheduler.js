const { DateTime } = require("luxon");

const ZONE = "Europe/Paris";
const DEFAULT_PIN = "2828";

function parseLocal(value){
  const dt=DateTime.fromISO(String(value||""),{zone:ZONE});
  return dt.isValid?dt:null;
}
function hhmm(value){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value||""));}
function validPin(value){return /^\d{4}$/.test(String(value||""));}
function normalizeSchedules(input){
  const out=[];
  for(const raw of Array.isArray(input)?input:[]){
    const kind=String(raw?.kind||"").toLowerCase();
    if(kind==="once"){
      const start=parseLocal(raw.startAt);
      const rawEnd=String(raw?.endAt||"").trim();
      const end=rawEnd?parseLocal(rawEnd):null;
      if(!start||(rawEnd&&(!end||end<=start)))continue;
      out.push({id:String(raw.id||""),kind:"once",startAt:start.toISO(),endAt:end?end.toISO():null});
    }else if(kind==="weekly"){
      const days=[...new Set((Array.isArray(raw.days)?raw.days:[]).map(Number).filter(d=>d>=1&&d<=7))].sort();
      if(!days.length||!hhmm(raw.startTime)||!hhmm(raw.endTime))continue;
      out.push({id:String(raw.id||""),kind:"weekly",days,startTime:String(raw.startTime),endTime:String(raw.endTime)});
    }
  }
  return out.slice(0,30);
}
function normalizeLockConfig(input={},previous={}){
  const requestedPin=String(input?.pin||"").trim();
  const previousPin=validPin(previous?.pin)?String(previous.pin):DEFAULT_PIN;
  if(requestedPin&&!validPin(requestedPin))throw new Error("Le PIN doit contenir exactement 4 chiffres.");
  const schedules=normalizeSchedules(input?.schedules!==undefined?input.schedules:previous?.schedules);
  return {
    enabled:input?.enabled!==undefined?Boolean(input.enabled):Boolean(previous?.enabled||schedules.length),
    schedules,
    pin:requestedPin||previousPin,
    locked:input?.locked!==undefined?Boolean(input.locked):Boolean(previous?.locked),
    manualOverride:["LOCK","UNLOCK"].includes(String(input?.manualOverride||previous?.manualOverride||"").toUpperCase())?String(input?.manualOverride||previous?.manualOverride).toUpperCase():null,
    updatedAt:input?.updatedAt||previous?.updatedAt||null
  };
}
function agentLockConfig(input={}){
  const config=normalizeLockConfig(input,input);
  return {enabled:config.enabled,schedules:config.schedules,pin:config.pin,locked:config.locked,manualOverride:config.manualOverride,updatedAt:config.updatedAt};
}
function weeklyIntervals(schedule,now){
  const intervals=[];
  for(let offset=-1;offset<=14;offset++){
    const day=now.startOf("day").plus({days:offset});
    if(!schedule.days.includes(day.weekday))continue;
    const [sh,sm]=schedule.startTime.split(":").map(Number);
    const [eh,em]=schedule.endTime.split(":").map(Number);
    const start=day.set({hour:sh,minute:sm,second:0,millisecond:0});
    let end=day.set({hour:eh,minute:em,second:0,millisecond:0});
    if(end<=start)end=end.plus({days:1});
    intervals.push({start,end,openEnded:false});
  }
  return intervals;
}
function allIntervals(schedules,now){
  const intervals=[];
  for(const s of schedules){
    if(s.kind==="once")intervals.push({start:parseLocal(s.startAt),end:s.endAt?parseLocal(s.endAt):null,openEnded:!s.endAt});
    else intervals.push(...weeklyIntervals(s,now));
  }
  return intervals.filter(x=>x.start&&(x.openEnded||x.end)).sort((a,b)=>a.start.toMillis()-b.start.toMillis());
}
function evaluateBoothLock({schedules,manualOverride=null,nowISO=null}){
  const now=nowISO?parseLocal(nowISO):DateTime.now().setZone(ZONE);
  if(!now)throw new Error("Date courante invalide");
  if(manualOverride==="LOCK")return {state:"MANUAL_LOCK",locked:true,nextOpenAt:null,currentCloseAt:null};
  if(manualOverride==="UNLOCK")return {state:"MANUAL_UNLOCK",locked:false,nextOpenAt:null,currentCloseAt:null};
  const normalized=normalizeSchedules(schedules);
  if(!normalized.length)return {state:"OPEN",locked:false,nextOpenAt:null,currentCloseAt:null};
  const intervals=allIntervals(normalized,now);
  const active=intervals.find(x=>x.start<=now&&(x.openEnded||now<x.end));
  if(active)return {state:"OPEN",locked:false,nextOpenAt:null,currentCloseAt:active.end?active.end.toISO():null};
  const next=intervals.find(x=>x.start>now);
  if(next)return {state:"WAITING",locked:true,nextOpenAt:next.start.toISO(),currentCloseAt:null};
  const recurring=normalized.some(x=>x.kind==="weekly");
  if(recurring)return {state:"WAITING",locked:true,nextOpenAt:null,currentCloseAt:null};
  return {state:"ENDED",locked:true,nextOpenAt:null,currentCloseAt:null};
}

module.exports={ZONE,DEFAULT_PIN,validPin,normalizeSchedules,normalizeLockConfig,agentLockConfig,evaluateBoothLock};
