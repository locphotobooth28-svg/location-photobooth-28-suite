import React, { useEffect, useMemo, useRef, useState } from "react";

const INSTALL_MINUTES = 45;
const PICKUP_MINUTES = 20;
const DEFAULT_BASE = "Thivars, 28630, France";
const LEAFLET_CSS_ID = "lp28-leaflet-css";
const LEAFLET_SCRIPT_ID = "lp28-leaflet-script";

function atLocalMidnight(date){
  const d=new Date(date); d.setHours(0,0,0,0); return d;
}
function mondayOf(date){
  const d=atLocalMidnight(date); const day=d.getDay()||7; d.setDate(d.getDate()-day+1); return d;
}
function addDays(date,days){ const d=new Date(date); d.setDate(d.getDate()+days); return d; }
function ymd(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function parseLocalDateTime(date,time="00:00"){
  if(!date) return null;
  const [y,m,d]=String(date).slice(0,10).split("-").map(Number);
  const [hh,mm]=String(time||"00:00").split(":").map(Number);
  if(!y||!m||!d) return null;
  return new Date(y,m-1,d,hh||0,mm||0,0,0);
}
function formatDate(date){ return new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit"}).format(date); }
function formatTime(date){ return date ? new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(date) : "—"; }
function minsLabel(value){ const m=Math.max(0,Math.round(value||0)); const h=Math.floor(m/60), r=m%60; return h?`${h} h ${String(r).padStart(2,"0")}`:`${r} min`; }
function compactName(event){ return event?.organizerName || event?.name || "Événement"; }
function boothName(event){
  const hay=(event?.materials||[]).map(x=>typeof x==="string"?x:(x?.name||"")).join(" ").toLowerCase();
  if(hay.includes("lola"))return "LOLA";
  if(hay.includes("nina"))return "NINA";
  if(hay.includes("gabin"))return "GABIN";
  return "BORNE";
}
function addressOf(event){ return String(event?.address||"").trim(); }
function cacheKey(address){ return `lp28.tour.geocode.${address.toLowerCase()}`; }

async function ensureLeaflet(){
  if(window.L) return window.L;
  if(!document.getElementById(LEAFLET_CSS_ID)){
    const link=document.createElement("link"); link.id=LEAFLET_CSS_ID; link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; link.crossOrigin=""; document.head.appendChild(link);
  }
  const existing=document.getElementById(LEAFLET_SCRIPT_ID);
  if(existing){ await new Promise((resolve,reject)=>{ if(window.L)return resolve(); existing.addEventListener("load",resolve,{once:true}); existing.addEventListener("error",reject,{once:true}); }); return window.L; }
  await new Promise((resolve,reject)=>{
    const s=document.createElement("script"); s.id=LEAFLET_SCRIPT_ID; s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.crossOrigin=""; s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
  });
  return window.L;
}

async function geocode(address){
  const key=cacheKey(address);
  try{ const cached=JSON.parse(localStorage.getItem(key)||"null"); if(cached?.lat&&cached?.lon)return cached; }catch{}
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr&q=${encodeURIComponent(address)}`;
  const r=await fetch(url,{headers:{Accept:"application/json"}}); if(!r.ok)throw new Error(`Géocodage impossible (${r.status})`);
  const data=await r.json(); if(!data?.[0])throw new Error(`Adresse introuvable : ${address}`);
  const value={lat:Number(data[0].lat),lon:Number(data[0].lon),displayName:data[0].display_name};
  localStorage.setItem(key,JSON.stringify(value)); return value;
}
async function osrmRoute(points){
  if(points.length<2)return {minutes:0,km:0,geometry:null,legs:[]};
  const coords=points.map(p=>`${p.lon},${p.lat}`).join(";");
  const url=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const r=await fetch(url); if(!r.ok)throw new Error(`Calcul routier impossible (${r.status})`);
  const data=await r.json(); const route=data?.routes?.[0]; if(!route)throw new Error("Aucun itinéraire routier trouvé.");
  return {minutes:route.duration/60,km:route.distance/1000,geometry:route.geometry,legs:route.legs||[]};
}

function buildTasks(events,weekStart,weekEnd,type){
  const out=[];
  for(const event of events||[]){
    const address=addressOf(event); if(!address)continue;
    if(type==="install"){
      const due=parseLocalDateTime(event?.date,event?.time||"18:00");
      if(due&&due>=weekStart&&due<weekEnd)out.push({id:`install-${event.id}`,event,type,address,when:due,service:INSTALL_MINUTES});
    }else{
      const when=parseLocalDateTime(event?.pickupDate||event?.date,event?.pickupTime||"09:00");
      if(when&&when>=weekStart&&when<weekEnd)out.push({id:`pickup-${event.id}`,event,type,address,when,service:PICKUP_MINUTES});
    }
  }
  return out.sort((a,b)=>a.when-b.when || compactName(a.event).localeCompare(compactName(b.event),"fr"));
}

function scheduleInstall(tasks,basePoint,pointByAddress){
  if(!tasks.length)return [];
  return tasks.map((task,index)=>({ ...task, index, point:pointByAddress[task.address] })).filter(x=>x.point);
}
function googleMapsUrl(baseAddress,tasks){
  const addresses=tasks.map(t=>t.address).filter(Boolean); if(!addresses.length)return "";
  const dest=addresses[addresses.length-1]; const waypoints=addresses.slice(0,-1).join("|");
  const params=new URLSearchParams({api:"1",origin:baseAddress,destination:dest,travelmode:"driving"}); if(waypoints)params.set("waypoints",waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function WeeklyTourMap({events=[]}){
  const [weekOffset,setWeekOffset]=useState(0);
  const [mode,setMode]=useState("install");
  const [baseAddress,setBaseAddress]=useState(()=>localStorage.getItem("lp28.tour.base")||DEFAULT_BASE);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState(null);
  const mapHost=useRef(null),mapRef=useRef(null),layerRef=useRef(null);
  const weekStart=useMemo(()=>addDays(mondayOf(new Date()),weekOffset*7),[weekOffset]);
  const weekEnd=useMemo(()=>addDays(weekStart,7),[weekStart]);
  const tasks=useMemo(()=>buildTasks(events,weekStart,weekEnd,mode),[events,weekStart,weekEnd,mode]);

  useEffect(()=>{ setResult(null); setError(""); },[weekOffset,mode,events]);
  useEffect(()=>()=>{ try{mapRef.current?.remove();}catch{} mapRef.current=null; },[]);

  async function calculate(){
    setBusy(true); setError(""); setResult(null);
    try{
      localStorage.setItem("lp28.tour.base",baseAddress);
      const unique=[baseAddress,...new Set(tasks.map(t=>t.address))]; const points={};
      for(const address of unique){ points[address]=await geocode(address); await new Promise(r=>setTimeout(r,180)); }
      const planned=scheduleInstall(tasks,points[baseAddress],points);
      const routePoints=[points[baseAddress],...planned.map(t=>t.point)];
      const route=await osrmRoute(routePoints);
      const legs=route.legs||[];
      let cursor=null; const rows=[];
      if(mode==="install"){
        for(let i=planned.length-1;i>=0;i--){
          const task=planned[i]; const travelAfter=i<planned.length-1 ? (legs[i+1]?.duration||0)/60 : 0;
          const finishBy=i===planned.length-1 ? task.when : new Date(Math.min(task.when.getTime(),cursor.getTime()-travelAfter*60000));
          const start=new Date(finishBy.getTime()-task.service*60000);
          rows.unshift({...task,start,finish:finishBy,travelFromPrev:(legs[i]?.duration||0)/60,travelKm:(legs[i]?.distance||0)/1000}); cursor=start;
        }
        if(rows[0]) rows[0].homeDeparture=new Date(rows[0].start.getTime()-rows[0].travelFromPrev*60000);
      }else{
        let departure=null;
        for(let i=0;i<planned.length;i++){
          const task=planned[i]; const travel=(legs[i]?.duration||0)/60;
          let arrival;
          if(i===0){ arrival=task.when; departure=new Date(arrival.getTime()-travel*60000); }
          else arrival=new Date(Math.max(task.when.getTime(),rows[i-1].finish.getTime()+travel*60000));
          const finish=new Date(arrival.getTime()+task.service*60000);
          rows.push({...task,start:arrival,finish,travelFromPrev:travel,travelKm:(legs[i]?.distance||0)/1000,homeDeparture:i===0?departure:null});
        }
      }
      setResult({rows,points,route,totalMinutes:route.minutes,totalKm:route.km});
      await drawMap({rows,points,route});
    }catch(e){ setError(e?.message||"Impossible de calculer la tournée."); }
    finally{ setBusy(false); }
  }

  async function drawMap(data){
    const L=await ensureLeaflet(); if(!mapHost.current)return;
    if(!mapRef.current){ mapRef.current=L.map(mapHost.current,{scrollWheelZoom:true}); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(mapRef.current); }
    if(layerRef.current){ layerRef.current.remove(); }
    const group=L.layerGroup().addTo(mapRef.current); layerRef.current=group;
    const base=data.points[baseAddress]; if(base)L.marker([base.lat,base.lon]).bindPopup(`<b>🏠 Départ LP28</b><br>${baseAddress}`).addTo(group);
    data.rows.forEach((row,i)=>{ const p=row.point; if(!p)return; const icon=L.divIcon({className:"lp28-tour-marker",html:`<span>${i+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]}); L.marker([p.lat,p.lon],{icon}).bindPopup(`<b>${i+1}. ${boothName(row.event)} — ${compactName(row.event)}</b><br>${row.address}<br>${mode==="install"?"Installation":"Reprise"} : ${formatTime(row.start)} → ${formatTime(row.finish)}`).addTo(group); });
    if(data.route?.geometry?.coordinates){ const latlngs=data.route.geometry.coordinates.map(([lon,lat])=>[lat,lon]); L.polyline(latlngs,{weight:5,opacity:.8}).addTo(group); }
    const bounds=[]; if(base)bounds.push([base.lat,base.lon]); data.rows.forEach(r=>r.point&&bounds.push([r.point.lat,r.point.lon]));
    if(bounds.length)mapRef.current.fitBounds(bounds,{padding:[28,28]}); setTimeout(()=>mapRef.current?.invalidateSize(),120);
  }

  const mapsUrl=result?googleMapsUrl(baseAddress,result.rows):"";
  return <section className="lp28-tour-page">
    <style>{`
      .lp28-tour-page{display:grid;gap:14px}.lp28-tour-toolbar,.lp28-tour-summary,.lp28-tour-card{background:rgba(17,17,20,.92);border:1px solid rgba(148,163,184,.24);border-radius:16px;padding:14px}.lp28-tour-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.lp28-tour-toolbar label{display:grid;gap:5px;font-size:.82rem}.lp28-tour-toolbar input{min-width:240px}.lp28-tour-week{font-weight:900;flex:1;min-width:240px}.lp28-tour-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:14px}.lp28-tour-map{height:520px;border-radius:16px;overflow:hidden;border:1px solid rgba(148,163,184,.24);background:#0f172a}.lp28-tour-list{display:grid;gap:9px;align-content:start}.lp28-tour-card{padding:12px}.lp28-tour-card strong{display:block}.lp28-tour-card small{display:block;color:#94a3b8;margin-top:4px}.lp28-tour-card .times{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-weight:800}.lp28-tour-marker{background:transparent;border:0}.lp28-tour-marker span{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:#2563eb;color:white;border:2px solid white;font-weight:900;box-shadow:0 4px 12px rgba(0,0,0,.4)}.lp28-tour-alert{padding:12px;border-radius:12px;background:rgba(127,29,29,.35);border:1px solid #ef4444}.lp28-tour-empty{padding:28px;text-align:center;border:1px dashed rgba(148,163,184,.35);border-radius:16px;color:#94a3b8}.lp28-tour-mode{display:flex;gap:8px}.lp28-tour-mode button.active{background:#d4ad2d!important;color:#111827!important;border-color:#f4c542!important;font-weight:900}@media(max-width:900px){.lp28-tour-grid{grid-template-columns:1fr}.lp28-tour-map{height:390px}.lp28-tour-toolbar input{min-width:100%}}
    `}</style>
    <div className="lp28-tour-toolbar">
      <div className="lp28-tour-week">🗺️ Tournée LP28<br/><span className="muted">Semaine du {formatDate(weekStart)} au {formatDate(addDays(weekEnd,-1))}</span></div>
      <button onClick={()=>setWeekOffset(v=>v-1)}>← Semaine précédente</button><button onClick={()=>setWeekOffset(0)}>Cette semaine</button><button onClick={()=>setWeekOffset(v=>v+1)}>Semaine suivante →</button>
      <label>Point de départ<input value={baseAddress} onChange={e=>setBaseAddress(e.target.value)} placeholder="Thivars, 28630, France"/></label>
      <button className="primary" onClick={calculate} disabled={busy||!tasks.length}>{busy?"Calcul…":"🚚 Calculer la tournée"}</button>
    </div>
    <div className="lp28-tour-mode"><button className={mode==="install"?"active":""} onClick={()=>setMode("install")}>📦 Installations — 45 min</button><button className={mode==="pickup"?"active":""} onClick={()=>setMode("pickup")}>↩️ Reprises — 20 min</button></div>
    {error&&<div className="lp28-tour-alert">⚠️ {error}</div>}
    {!tasks.length?<div className="lp28-tour-empty">Aucune {mode==="install"?"installation":"reprise"} avec adresse sur cette semaine.</div>:<>
      <div className="lp28-tour-summary"><strong>{tasks.length} étape{tasks.length>1?"s":""}</strong> · {mode==="install"?`${INSTALL_MINUTES} min d'installation par borne`:`${PICKUP_MINUTES} min de démontage par borne`}{result&&<> · <b>{result.totalKm.toFixed(1)} km</b> · <b>{minsLabel(result.totalMinutes)} de conduite</b></>}</div>
      <div className="lp28-tour-grid"><div ref={mapHost} className="lp28-tour-map"/><div className="lp28-tour-list">
        {(result?.rows||tasks).map((task,i)=><article className="lp28-tour-card" key={task.id}><strong>{i+1}. {boothName(task.event)} — {compactName(task.event)}</strong><small>📍 {task.address}</small><small>📅 {formatDate(task.when)} · horaire client {formatTime(task.when)}</small>{task.start&&<div className="times"><span>🕒 Sur place {formatTime(task.start)} → {formatTime(task.finish)}</span>{i===0&&task.homeDeparture&&<span>🚗 Départ conseillé {formatTime(task.homeDeparture)}</span>}</div>}{task.travelFromPrev!=null&&<small>Trajet depuis l'étape précédente : {minsLabel(task.travelFromPrev)} · {task.travelKm?.toFixed(1)} km</small>}</article>)}
        {mapsUrl&&<a className="primary" href={mapsUrl} target="_blank" rel="noreferrer" style={{textAlign:"center",textDecoration:"none"}}>📍 Ouvrir toute la tournée dans Google Maps</a>}
      </div></div>
    </>}
    <p className="muted" style={{margin:0}}>Le calcul routier et le géocodage utilisent OpenStreetMap/Nominatim et OSRM uniquement quand tu cliques sur « Calculer la tournée ». Les horaires LP28 réservent automatiquement 45 min pour l'installation et 20 min pour la reprise.</p>
  </section>;
}
