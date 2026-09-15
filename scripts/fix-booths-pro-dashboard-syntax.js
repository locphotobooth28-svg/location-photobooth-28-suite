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
fs.writeFileSync(file,s,'utf8');
console.log(`[booths-pro-syntax] ${n} correction(s) appliquée(s)`);
