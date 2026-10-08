const fs=require('fs');
const p='client/src/WeeklyTourMap.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('LP28_WEEKLY_TOUR_DAY_SPLIT_V2')){console.log('[weekly-tour-day-split] deja applique');process.exit(0);}

const tasksMarker='  const tasks=useMemo(()=>buildTasks(events,weekStart,weekEnd,mode),[events,weekStart,weekEnd,mode]);';
if(!s.includes(tasksMarker))throw new Error('[weekly-tour-day-split] tasks introuvable');
s=s.replace(tasksMarker,`${tasksMarker}\n  const [selectedDay,setSelectedDay]=useState(\"\"); // LP28_WEEKLY_TOUR_DAY_SPLIT_V2\n  const taskDays=useMemo(()=>[...new Set(tasks.map(t=>ymd(t.when)))],[tasks]);\n  const activeDay=taskDays.includes(selectedDay)?selectedDay:(taskDays[0]||\"\");\n  const dayTasks=useMemo(()=>tasks.filter(t=>ymd(t.when)===activeDay),[tasks,activeDay]);`);

const resetOld='  useEffect(()=>{ setResult(null); setError(\"\"); },[weekOffset,mode,events]);';
const resetNew='  useEffect(()=>{ setResult(null); setError(\"\"); if(layerRef.current){try{layerRef.current.remove();}catch{} layerRef.current=null;} },[weekOffset,mode,events,selectedDay]);\n  useEffect(()=>{ if(taskDays.length&&!taskDays.includes(selectedDay))setSelectedDay(taskDays[0]); if(!taskDays.length&&selectedDay)setSelectedDay(\"\"); },[taskDays.join(\"|\")]);';
if(!s.includes(resetOld))throw new Error('[weekly-tour-day-split] reset effect introuvable');
s=s.replace(resetOld,resetNew);

s=s.replace('const unique=[baseAddress,...new Set(tasks.map(t=>t.address))]; const points={};','const unique=[baseAddress,...new Set(dayTasks.map(t=>t.address))]; const points={};');
s=s.replace('const planned=scheduleInstall(tasks,points[baseAddress],points);','const planned=scheduleInstall(dayTasks,points[baseAddress],points);');
s=s.replace('disabled={busy||!tasks.length}','disabled={busy||!dayTasks.length}');

const modeBlock='    <div className="lp28-tour-mode"><button className={mode==="install"?"active":""} onClick={()=>setMode("install")}>📦 Installations — 45 min</button><button className={mode==="pickup"?"active":""} onClick={()=>setMode("pickup")}>↩️ Reprises — 20 min</button></div>';
const modeNew=`${modeBlock}\n    {taskDays.length>0&&<div className=\"lp28-tour-mode\" style={{flexWrap:\"wrap\"}}>{taskDays.map(day=>{const d=parseLocalDateTime(day,\"12:00\");const count=tasks.filter(t=>ymd(t.when)===day).length;return <button key={day} className={activeDay===day?\"active\":\"\"} onClick={()=>setSelectedDay(day)}>📅 {formatDate(d)} · {count} étape{count>1?\"s\":\"\"}</button>})}</div>}`;
if(!s.includes(modeBlock))throw new Error('[weekly-tour-day-split] bloc mode introuvable');
s=s.replace(modeBlock,modeNew);

s=s.replace('<strong>{tasks.length} étape{tasks.length>1?"s":""}</strong>','<strong>{dayTasks.length} étape{dayTasks.length>1?"s":""} — {activeDay?formatDate(parseLocalDateTime(activeDay,"12:00")):""}</strong>');
s=s.replace('(result?.rows||tasks).map((task,i)=>','(result?.rows||dayTasks).map((task,i)=>');

fs.writeFileSync(p,s,'utf8');
console.log('[weekly-tour-day-split] OK V2');
