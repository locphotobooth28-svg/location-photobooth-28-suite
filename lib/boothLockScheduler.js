const { DateTime } = require("luxon");

const ZONE = "Europe/Paris";

function parseLocal(value){
  const dt=DateTime.fromISO(String(value||""),{zone:ZONE});
  return dt.isValid?dt:null;
}
function hhmm(value){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value||""));}
function normalizeSchedules(input){
  const out=[];
  for(const raw of Array.isArray(input)?input:[]){
    const kind=String(raw?.kind||"").toLowerCase();
    if(kind==="once"){
      const start=parseLocal(raw.startAt),end=parseLocal(raw.endAt);
      if(!start||!end||end<=start)continue;
      out.push({id:String(raw.id||""),kind:"once",startAt:start.toISO(),endAt:end.toISO()});
    }else if(kind==="weekly"){
      const days=[...new Set((Array.isArray(raw.days)?raw.days:[]).map(Number).filter(d=>d>=1&&d<=7))].sort();
      if(!days.length||!hhmm(raw.startTime)||!hhmm(raw.endTime))continue;
      out.push({id:String(raw.id||""),kind:"weekly",days,startTime:String(raw.startTime),endTime:String(raw.endTime)});
    }
  }
  return out.slice(0,30);
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
    intervals.push({start,end});
  }
  return intervals;
}
function allIntervals(schedules,now){
  const intervals=[];
  for(const s of schedules){
    if(s.kind==="once")intervals.push({start:parseLocal(s.startAt),end:parseLocal(s.endAt)});
    else intervals.push(...weeklyIntervals(s,now));
  }
  return intervals.filter(x=>x.start&&x.end).sort((a,b)=>a.start.toMillis()-b.start.toMillis());
}
function evaluateBoothLock({schedules,manualOverride=null,nowISO=null}){
  const now=nowISO?parseLocal(nowISO):DateTime.now().setZone(ZONE);
  if(!now)throw new Error("Date courante invalide");
  if(manualOverride==="LOCK")return {state:"MANUAL_LOCK",locked:true,nextOpenAt:null,currentCloseAt:null};
  if(manualOverride==="UNLOCK")return {state:"MANUAL_UNLOCK",locked:false,nextOpenAt:null,currentCloseAt:null};
  const normalized=normalizeSchedules(schedules);
  if(!normalized.length)return {state:"OPEN",locked:false,nextOpenAt:null,currentCloseAt:null};
  const intervals=allIntervals(normalized,now);
  const active=intervals.find(x=>x.start<=now&&now<x.end);
  if(active)return {state:"OPEN",locked:false,nextOpenAt:null,currentCloseAt:active.end.toISO()};
  const next=intervals.find(x=>x.start>now);
  if(next)return {state:"WAITING",locked:true,nextOpenAt:next.start.toISO(),currentCloseAt:null};
  const recurring=normalized.some(x=>x.kind==="weekly");
  if(recurring)return {state:"WAITING",locked:true,nextOpenAt:null,currentCloseAt:null};
  return {state:"ENDED",locked:true,nextOpenAt:null,currentCloseAt:null};
}

module.exports={ZONE,normalizeSchedules,evaluateBoothLock};
