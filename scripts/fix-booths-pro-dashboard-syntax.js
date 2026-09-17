const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'scripts','patch-booths-pro-dashboard.js');
let s=fs.readFileSync(file,'utf8');
let n=0;
const fixes=[
  ["current.lumaVersion?`v${String(current.lumaVersion).replace(/^v/i,'')}`:''","current.lumaVersion?'v'+String(current.lumaVersion).replace(/^v/i,''):''"],
  ["current.agentVersion?`v${String(current.agentVersion).replace(/^v/i,'')}`:''","current.agentVersion?'v'+String(current.agentVersion).replace(/^v/i,''):''"],
  ["current.printer?.mediaCapacity?` / ${current.printer.mediaCapacity}`:''","current.printer?.mediaCapacity?' / '+current.printer.mediaCapacity:''"],
  ["id={`lp28-power-${current.boothName}`}","id={'lp28-power-'+current.boothName}"],
  ["id={`lp28-lock-at-${current.boothName}`}","id={'lp28-lock-at-'+current.boothName}"],
  ["id={`lp28-unlock-at-${current.boothName}`}","id={'lp28-unlock-at-'+current.boothName}"],
  ["id={`lp28-lock-pin-${current.boothName}`}","id={'lp28-lock-pin-'+current.boothName}"]
];
for(const [a,b] of fixes){if(s.includes(a)){s=s.split(a).join(b);n++;}}

// Le contenu exact de printerIncidentBadges peut évoluer avec les patches précédents.
// Le dashboard Pro doit retrouver l'état par son nom et non par une ligne figée.
const oldState=`const stateAnchor='  const [printerIncidentBadges,setPrinterIncidentBadges]=useState({});';\nif(!seg.includes(stateAnchor))throw new Error('[booths-pro] état incident introuvable');\nseg=seg.replace(stateAnchor,stateAnchor+'\\n  const [selectedBooth,setSelectedBooth]=useState(\"NINA\"),[boothTab,setBoothTab]=useState(\"STATUS\");');`;
const newState=`const stateRe=/^(\\s*)const \\[printerIncidentBadges\\s*,\\s*setPrinterIncidentBadges\\]\\s*=\\s*useState\\([^\\n;]*\\);/m;\nconst stateMatch=seg.match(stateRe);\nif(!stateMatch)throw new Error('[booths-pro] état incident introuvable');\nseg=seg.replace(stateRe,m=>m+'\\n'+stateMatch[1]+'const [selectedBooth,setSelectedBooth]=useState(\"NINA\"),[boothTab,setBoothTab]=useState(\"STATUS\");');`;
if(s.includes(oldState)){s=s.replace(oldState,newState);n++;}

fs.writeFileSync(file,s,'utf8');
console.log(`[booths-pro-syntax] ${n} correction(s) appliquée(s)`);
