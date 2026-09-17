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

// Le dashboard Pro ne doit pas dépendre obligatoirement de l'état d'incident imprimante.
// S'il existe dans AdminBooths on conserve sa valeur. Sinon on crée un état local vide,
// ce qui garde l'historique imprimante fonctionnel sans bloquer le build.
const oldExact=`const stateAnchor='  const [printerIncidentBadges,setPrinterIncidentBadges]=useState({});';\nif(!seg.includes(stateAnchor))throw new Error('[booths-pro] état incident introuvable');\nseg=seg.replace(stateAnchor,stateAnchor+'\\n  const [selectedBooth,setSelectedBooth]=useState(\"NINA\"),[boothTab,setBoothTab]=useState(\"STATUS\");');`;
const oldRegex=`const stateRe=/^(\\s*)const \\[printerIncidentBadges\\s*,\\s*setPrinterIncidentBadges\\]\\s*=\\s*useState\\([^\\n;]*\\);/m;\nconst stateMatch=seg.match(stateRe);\nif(!stateMatch)throw new Error('[booths-pro] état incident introuvable');\nseg=seg.replace(stateRe,m=>m+'\\n'+stateMatch[1]+'const [selectedBooth,setSelectedBooth]=useState(\"NINA\"),[boothTab,setBoothTab]=useState(\"STATUS\");');`;
const tolerant=`const stateRe=/^(\\s*)const \\[printerIncidentBadges\\s*,\\s*setPrinterIncidentBadges\\]\\s*=\\s*useState\\([^\\n;]*\\);/m;\nconst stateMatch=seg.match(stateRe);\nif(stateMatch){\n  seg=seg.replace(stateRe,m=>m+'\\n'+stateMatch[1]+'const [selectedBooth,setSelectedBooth]=useState(\"NINA\"),[boothTab,setBoothTab]=useState(\"STATUS\");');\n}else{\n  const firstState=/^(\\s*)const \\[[^\\n]+?\\]\\s*=\\s*useState\\([^\\n;]*\\);/m;\n  const firstMatch=seg.match(firstState);\n  if(!firstMatch)throw new Error('[booths-pro] aucun état React utilisable dans AdminBooths');\n  seg=seg.replace(firstState,m=>m+'\\n'+firstMatch[1]+'const [printerIncidentBadges]=useState({});\\n'+firstMatch[1]+'const [selectedBooth,setSelectedBooth]=useState(\"NINA\"),[boothTab,setBoothTab]=useState(\"STATUS\");');\n}`;
if(s.includes(oldRegex)){s=s.replace(oldRegex,tolerant);n++;}
else if(s.includes(oldExact)){s=s.replace(oldExact,tolerant);n++;}

fs.writeFileSync(file,s,'utf8');
console.log(`[booths-pro-syntax] ${n} correction(s) appliquée(s)`);
