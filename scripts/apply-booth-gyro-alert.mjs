import fs from "node:fs";

const file="client/src/App.jsx";
let s=fs.readFileSync(file,"utf8");

function replaceOnce(before,after,label){
  if(s.includes(after)) return;
  const count=s.split(before).length-1;
  if(count!==1) throw new Error(label+": expected 1 occurrence, found "+count);
  s=s.replace(before,after);
}

replaceOnce(
  '    .lp28-printer-error{color:#dc2626;font-weight:700;}\n',
  '    .lp28-printer-error{color:#dc2626;font-weight:700;}\n'+
  '    @keyframes lp28BoothGyro{0%,100%{transform:scale(1);filter:drop-shadow(0 0 2px rgba(239,68,68,.45))}50%{transform:scale(1.18);filter:drop-shadow(0 0 10px rgba(239,68,68,1))}}\n'+
  '    .lp28-booth-gyro{display:inline-block;animation:lp28BoothGyro .8s ease-in-out infinite;transform-origin:center;}\n'+
  '    .booth-live-pill.alert{background:rgba(127,29,29,.72)!important;color:#fecaca!important;border-color:#ef4444!important;box-shadow:0 0 14px rgba(239,68,68,.5)!important;}\n',
  'booth gyro styles'
);

replaceOnce(
  '  const boothOnlineCount=Math.min(3,opsBooths.filter(b=>b.online).length);\n',
  '  const boothOnlineCount=Math.min(3,opsBooths.filter(b=>b.online).length);\n'+
  '  const boothProblems=opsBooths.filter(b=>{\n'+
  '    if(!b?.online)return false;\n'+
  '    const severity=String(b?.printer?.statusSeverity||"").toUpperCase();\n'+
  '    return ["WARNING","ERROR","OFFLINE"].includes(severity) || b?.printer?.statusFresh===false || b?.lumaActive===false;\n'+
  '  });\n'+
  '  const boothProblemCount=boothProblems.length;\n'+
  '  const boothProblemTitle=boothProblems.map(b=>String(b.boothName||"Borne").toUpperCase()+" : "+(b?.printer?.statusLabel||(!b?.lumaActive?"LumaBooth inactif":"anomalie détectée"))).join(" · ");\n',
  'booth problem state'
);

replaceOnce(
  '          <span className="nav-main-label">{m.icon} {m.label}</span>\n'+
  '          {m.id==="booths"&&isAdmin&&<span className={`booth-live-pill ${boothOnlineCount?"online":"offline"}`}>● LIVE {boothOnlineCount}/3</span>}\n',
  '          <span className="nav-main-label">{m.id==="booths"&&isAdmin&&boothProblemCount>0?<span className="lp28-booth-gyro" title={boothProblemTitle||"Anomalie détectée sur une borne"}>🚨</span>:m.icon} {m.label}</span>\n'+
  '          {m.id==="booths"&&isAdmin&&<span title={boothProblemTitle||undefined} className={`booth-live-pill ${boothProblemCount>0?"alert":boothOnlineCount?"online":"offline"}`}>{boothProblemCount>0?`● ALERTE ${boothProblemCount}`:`● LIVE ${boothOnlineCount}/3`}</span>}\n',
  'booth nav alert'
);

fs.writeFileSync(file,s,"utf8");
console.log("LP28 booth gyro alert patch applied.");
