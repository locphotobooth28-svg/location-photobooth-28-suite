const fs=require('fs');
const p='client/src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const MARK='LP28_VENUE_DIRECTORY_V2';
if(s.includes(MARK)){console.log('[venue-directory] deja applique V2');process.exit(0);}

const importNeedle='import React, { useEffect, useMemo, useRef, useState } from "react";';
if(!s.includes(importNeedle))throw new Error('[venue-directory] import React introuvable');
s=s.replace(importNeedle,importNeedle+'\nimport { searchLp28Venues } from "./data/lp28Venues.js"; // '+MARK);

const stateNeedle='const [addressLoading,setAddressLoading]=useState(false);';
if(!s.includes(stateNeedle))throw new Error('[venue-directory] state adresse introuvable');
s=s.replace(stateNeedle,stateNeedle+'\nconst [venueSuggestions,setVenueSuggestions]=useState([]);');

const changeNeedle='  searchAddress(value);\n}}\n  placeholder="Commence à saisir une adresse..."';
if(!s.includes(changeNeedle))throw new Error('[venue-directory] saisie adresse introuvable');
s=s.replace(changeNeedle,'  setVenueSuggestions(searchLp28Venues(value));\n  searchAddress(value);\n}}\n  placeholder="Nom du domaine, salle, commune ou adresse..."');

const loadingNeedle='  {addressLoading && (\n    <p className="muted">Recherche de l\'adresse...</p>\n  )}';
if(!s.includes(loadingNeedle))throw new Error('[venue-directory] zone suggestions introuvable');
const venueBlock=`  {venueSuggestions.length>0 && (\n    <div className="address-suggestions" style={{marginBottom:8}}>\n      {venueSuggestions.map((v,index)=>(\n        <button type="button" key={\`venue-\${index}\`} onClick={()=>{\n          const locationLabel=[v.name,v.address].filter(Boolean).join(" — ");\n          set("address",locationLabel);\n          setVenueSuggestions([]);\n          setAddressSuggestions([]);\n        }}>\n          🏛️ <strong>{v.name}</strong> · {v.city} ({v.department}) <small>— {v.type}</small>\n        </button>\n      ))}\n    </div>\n  )}\n\n${loadingNeedle}`;
s=s.replace(loadingNeedle,venueBlock);

// Quand une adresse GéoPF est choisie, fermer aussi les propositions LP28.
s=s.replace('            set("address",label);\n            setAddressSuggestions([]);','            set("address",label);\n            setAddressSuggestions([]);\n            setVenueSuggestions([]);');

fs.writeFileSync(p,s,'utf8');
console.log('[venue-directory] OK V2 : nom du lieu conserve avec adresse de prestation');
