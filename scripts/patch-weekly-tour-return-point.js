const fs=require('fs');
const p='client/src/WeeklyTourMap.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('LP28_WEEKLY_TOUR_RETURN_POINT_V1')){console.log('[weekly-tour-return-point] deja applique');process.exit(0);}

const baseConst='const DEFAULT_BASE = "Thivars, 28630, France";';
if(!s.includes(baseConst))throw new Error('[weekly-tour-return-point] constante départ introuvable');
s=s.replace(baseConst,`${baseConst}\nconst DEFAULT_RETURN = "20 rue des Catalpas, 28630 Thivars, France"; // LP28_WEEKLY_TOUR_RETURN_POINT_V1`);

const mapsOld=`function googleMapsUrl(baseAddress,tasks){\n  const addresses=tasks.map(t=>t.address).filter(Boolean); if(!addresses.length)return "";\n  const dest=addresses[addresses.length-1]; const waypoints=addresses.slice(0,-1).join("|");\n  const params=new URLSearchParams({api:"1",origin:baseAddress,destination:dest,travelmode:"driving"}); if(waypoints)params.set("waypoints",waypoints);\n  return \`https://www.google.com/maps/dir/?\${params.toString()}\`;\n}`;
const mapsNew=`function googleMapsUrl(baseAddress,returnAddress,tasks){\n  const addresses=tasks.map(t=>t.address).filter(Boolean); if(!addresses.length)return "";\n  const params=new URLSearchParams({api:"1",origin:baseAddress,destination:returnAddress||baseAddress,travelmode:"driving"});\n  if(addresses.length)params.set("waypoints",addresses.join("|"));\n  return \`https://www.google.com/maps/dir/?\${params.toString()}\`;\n}`;
if(!s.includes(mapsOld))throw new Error('[weekly-tour-return-point] googleMapsUrl introuvable');
s=s.replace(mapsOld,mapsNew);

const stateOld='  const [baseAddress,setBaseAddress]=useState(()=>localStorage.getItem("lp28.tour.base")||DEFAULT_BASE);';
const stateNew=`${stateOld}\n  const [returnAddress,setReturnAddress]=useState(()=>localStorage.getItem("lp28.tour.return")||DEFAULT_RETURN);`;
if(!s.includes(stateOld))throw new Error('[weekly-tour-return-point] état départ introuvable');
s=s.replace(stateOld,stateNew);

const storageOld='      localStorage.setItem("lp28.tour.base",baseAddress);';
const storageNew=`${storageOld}\n      localStorage.setItem("lp28.tour.return",returnAddress);`;
if(!s.includes(storageOld))throw new Error('[weekly-tour-return-point] stockage départ introuvable');
s=s.replace(storageOld,storageNew);

const uniqueOld='const unique=[baseAddress,...new Set(dayTasks.map(t=>t.address))]; const points={};';
const uniqueNew='const unique=[...new Set([baseAddress,...dayTasks.map(t=>t.address),returnAddress].filter(Boolean))]; const points={};';
if(!s.includes(uniqueOld))throw new Error('[weekly-tour-return-point] liste géocodage introuvable');
s=s.replace(uniqueOld,uniqueNew);

const routeOld='      const routePoints=[points[baseAddress],...planned.map(t=>t.point)];';
const routeNew='      const routePoints=[points[baseAddress],...planned.map(t=>t.point),points[returnAddress]].filter(Boolean);';
if(!s.includes(routeOld))throw new Error('[weekly-tour-return-point] routePoints introuvable');
s=s.replace(routeOld,routeNew);

const baseMapOld='    const base=data.points[baseAddress]; if(base)L.marker([base.lat,base.lon]).bindPopup(`<b>🏠 Départ LP28</b><br>${baseAddress}`).addTo(group);';
const baseMapNew=`${baseMapOld}\n    const retour=data.points[returnAddress]; if(retour)L.marker([retour.lat,retour.lon]).bindPopup(\`<b>🏁 Retour LP28</b><br>\${returnAddress}\`).addTo(group);`;
if(!s.includes(baseMapOld))throw new Error('[weekly-tour-return-point] marqueur départ introuvable');
s=s.replace(baseMapOld,baseMapNew);

const boundsOld='    const bounds=[]; if(base)bounds.push([base.lat,base.lon]); data.rows.forEach(r=>r.point&&bounds.push([r.point.lat,r.point.lon]));';
const boundsNew='    const bounds=[]; if(base)bounds.push([base.lat,base.lon]); data.rows.forEach(r=>r.point&&bounds.push([r.point.lat,r.point.lon])); if(retour)bounds.push([retour.lat,retour.lon]);';
if(!s.includes(boundsOld))throw new Error('[weekly-tour-return-point] bounds introuvable');
s=s.replace(boundsOld,boundsNew);

const mapsUseOld='  const mapsUrl=result?googleMapsUrl(baseAddress,result.rows):"";';
const mapsUseNew='  const mapsUrl=result?googleMapsUrl(baseAddress,returnAddress,result.rows):"";';
if(!s.includes(mapsUseOld))throw new Error('[weekly-tour-return-point] usage maps introuvable');
s=s.replace(mapsUseOld,mapsUseNew);

const inputOld='<label>Point de départ<input value={baseAddress} onChange={e=>setBaseAddress(e.target.value)} placeholder="Thivars, 28630, France"/></label>';
const inputNew=`${inputOld}\n      <label>Point de retour<input value={returnAddress} onChange={e=>setReturnAddress(e.target.value)} placeholder="20 rue des Catalpas, 28630 Thivars"/></label>`;
if(!s.includes(inputOld))throw new Error('[weekly-tour-return-point] champ départ introuvable');
s=s.replace(inputOld,inputNew);

s=s.replace('de conduite</b></>}','de conduite</b> · <b>retour inclus</b></>}');

fs.writeFileSync(p,s,'utf8');
console.log('[weekly-tour-return-point] OK V1');
