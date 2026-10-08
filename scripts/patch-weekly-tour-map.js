const fs=require('fs');
const p='client/src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('LP28_WEEKLY_TOUR_MAP_V1')){console.log('[weekly-tour-map] deja applique');process.exit(0);}

const importMarker='import React, { useEffect, useMemo, useRef, useState } from "react";';
if(!s.includes(importMarker))throw new Error('[weekly-tour-map] import React introuvable');
s=s.replace(importMarker,`${importMarker}\nimport WeeklyTourMap from "./WeeklyTourMap.jsx"; // LP28_WEEKLY_TOUR_MAP_V1`);

const safeMarker='    {id:"planning",label:"Planning",icon:"🗓️"},';
if(!s.includes(safeMarker))throw new Error('[weekly-tour-map] SAFE_MODULES planning introuvable');
s=s.replace(safeMarker,`${safeMarker}\n    {id:"tournee",label:"Tournée semaine",icon:"🗺️"},`);

const navMarker='    {id:"planning",label:"Planning",icon:"🗓️",locked:true},';
if(!s.includes(navMarker))throw new Error('[weekly-tour-map] NAV_DEFAULT planning introuvable');
s=s.replace(navMarker,`${navMarker}\n    {id:"tournee",label:"Tournée semaine",icon:"🗺️",locked:true},`);

const titleOld='const currentViewTitle = view==="events"?"Mes événements":view==="planning"?"Planning":view==="materialPlanning"?"Planning matériel"';
const titleNew='const currentViewTitle = view==="events"?"Mes événements":view==="planning"?"Planning":view==="tournee"?"Tournée semaine":view==="materialPlanning"?"Planning matériel"';
if(!s.includes(titleOld))throw new Error('[weekly-tour-map] titre vue introuvable');
s=s.replace(titleOld,titleNew);

const renderOld='</> : view==="inventory" ? <AdminInventory/> : view==="materialPlanning" ? <MaterialPlanning/>';
const renderNew='</> : view==="tournee" ? <WeeklyTourMap events={events}/> : view==="inventory" ? <AdminInventory/> : view==="materialPlanning" ? <MaterialPlanning/>';
if(!s.includes(renderOld))throw new Error('[weekly-tour-map] point insertion rendu introuvable');
s=s.replace(renderOld,renderNew);

fs.writeFileSync(p,s,'utf8');
console.log('[weekly-tour-map] OK V1');
