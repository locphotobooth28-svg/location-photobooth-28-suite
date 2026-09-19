const fs=require("fs");

function replaceOnce(file,from,to,label){
  const src=fs.readFileSync(file,"utf8");
  if(src.includes(to)){console.log("[dnp-00900] already applied:",label);return;}
  if(!src.includes(from))throw new Error("[dnp-00900] anchor missing: "+label);
  fs.writeFileSync(file,src.replace(from,to),"utf8");
  console.log("[dnp-00900] OK:",label);
}

// 00900 is retained in telemetry/history but is not treated as a confirmed fault.
// It must not create/maintain an automatic Mathis N1 by itself.
replaceOnce("server.js",
`  const normal=!raw||raw==="00000"||raw==="00001"||severity==="OK"||severity==="PRINTING"||severity==="INFO";`,
`  const watchOnly=raw==="00900";
  const normal=watchOnly||!raw||raw==="00000"||raw==="00001"||severity==="OK"||severity==="PRINTING"||severity==="INFO";`,
"server escalation suppression");

// Admin printer card: amber, no blinking, explicit watch-only label.
replaceOnce("client/src/App.jsx",
`  const severity=String(p.statusSeverity||"").toUpperCase();
  const raw=String(p.rawStatus||"").toUpperCase();
  if(severity==="ERROR")return {dot:"🔴",blink:true,tone:"error",label:p.statusLabel||"Erreur imprimante",showCode:true};`,
`  const severity=String(p.statusSeverity||"").toUpperCase();
  const raw=String(p.rawStatus||"").toUpperCase();
  if(raw==="00900")return {dot:"🟠",blink:false,tone:"warning",label:"DNP 00900 — à surveiller",showCode:true};
  if(severity==="ERROR")return {dot:"🔴",blink:true,tone:"error",label:p.statusLabel||"Erreur imprimante",showCode:true};`,
"admin printer state");

// Do not count 00900 alone as a red/global booth problem.
replaceOnce("client/src/App.jsx",
`    const severity=String(b?.printer?.statusSeverity||"").toUpperCase();
    return ["WARNING","ERROR","OFFLINE"].includes(severity) || b?.printer?.statusFresh===false || b?.lumaActive===false;`,
`    const severity=String(b?.printer?.statusSeverity||"").toUpperCase();
    const raw=String(b?.printer?.rawStatus||"").toUpperCase();
    const printerProblem=raw!=="00900"&&(["WARNING","ERROR","OFFLINE"].includes(severity)||b?.printer?.statusFresh===false);
    return printerProblem || b?.lumaActive===false;`,
"global booth problem banner");

// Mathis diagnostic may show 00900 in telemetry/history, but not as a confirmed live red fault.
replaceOnce("client/src/App.jsx",
`    const liveFault=Boolean(livePrinterStatus?.present)&&Boolean(liveRaw)&&!["00000","00001"].includes(liveRaw)&&!["OK","INFO","PRINTING"].includes(liveSeverity);`,
`    const liveFault=Boolean(livePrinterStatus?.present)&&Boolean(liveRaw)&&!["00000","00001","00900"].includes(liveRaw)&&!["OK","INFO","PRINTING"].includes(liveSeverity);`,
"Mathis live fault exclusion");

console.log("[dnp-00900] completed");
