const fs=require('fs');

function replaceOnce(text,from,to,label){
  if(text.includes(to))return text;
  const count=text.split(from).length-1;
  if(count!==1)throw new Error(`[Mathis printer reader] ${label}: expected 1 anchor, got ${count}`);
  return text.replace(from,to);
}

// IMPORTANT: this patch intentionally does not touch agent/.
const appPath='client/src/App.jsx';
let app=fs.readFileSync(appPath,'utf8');

app=replaceOnce(app,
'  const [supportPhotoConsent,setSupportPhotoConsent]=useState(false);',
`  const [supportPhotoConsent,setSupportPhotoConsent]=useState(false);\n  const [livePrinterStatus,setLivePrinterStatus]=useState(null);`,
'add live printer state');

app=replaceOnce(app,
`  const printerInfo=MATHIS_PRINTERS[printer];\n\n  useEffect(()=>{\n    if(!isEventUser||!portalToken)return;`,
`  const printerInfo=MATHIS_PRINTERS[printer];\n\n  useEffect(()=>{\n    if(issue!=="printer"||!booth||!portalToken){setLivePrinterStatus(null);return;}\n    let alive=true;\n    const loadPrinterFault=async()=>{\n      try{\n        const boothName=String(boothInfo?.name||booth||"").toUpperCase();\n        const r=await fetch(\`/api/guest/\${encodeURIComponent(portalToken)}/mathis/printer-status/\${encodeURIComponent(boothName)}\`);\n        if(!r.ok)return;\n        const d=await r.json();\n        if(alive)setLivePrinterStatus(d.printer||null);\n      }catch(e){}\n    };\n    loadPrinterFault();\n    const timer=setInterval(loadPrinterFault,5000);\n    return()=>{alive=false;clearInterval(timer)};\n  },[issue,booth,portalToken,boothInfo?.name]);\n\n  useEffect(()=>{\n    if(!isEventUser||!portalToken)return;`,
'poll LP28 Admin printer status');

app=replaceOnce(app,
`  function PrinterDiagnostic(){\n    if(printerStage==="led-first") return <>`,
`  function PrinterDiagnostic(){\n    const liveRaw=String(livePrinterStatus?.rawStatus||"").trim();\n    const liveSeverity=String(livePrinterStatus?.statusSeverity||"").toUpperCase();\n    const liveLabel=String(livePrinterStatus?.statusLabel||"").trim();\n    const liveFault=Boolean(livePrinterStatus?.present)&&Boolean(liveRaw)&&!["00000","00001"].includes(liveRaw)&&!["OK","INFO","PRINTING"].includes(liveSeverity);\n    const useLiveFault=()=>{\n      const text=(liveLabel+" "+liveRaw).toLowerCase();\n      const symptom=text.includes("bourrage")||text.includes("jam")?"jam":text.includes("papier")||text.includes("paper")?"paper":text.includes("ruban")||text.includes("ribbon")?"ribbon":text.includes("hors ligne")||text.includes("offline")?"offline":"error";\n      setPrinterSymptom(symptom);setPrinterStage("action");\n    };\n    const liveFaultBanner=liveFault?<div className="mathis-bubble mathis-bubble-bot" style={{border:"2px solid #ef4444"}}><b>🔴 Défaut lu automatiquement dans LP28 Admin</b><br/><b>Borne :</b> {boothInfo?.name||"—"}<br/><b>Code défaut :</b> {liveRaw}<br/><b>Référence LP28 :</b> {liveLabel||"Défaut imprimante"}<br/><small>Mathis utilise la remontée déjà enregistrée dans LP28 Admin. Aucune modification du LP28 Agent n'est effectuée.</small><div className="mathis-actions" style={{marginTop:10}}><button onClick={useLiveFault}>🤖 Analyser ce défaut avec Mathis</button></div></div>:null;\n    if(printerStage==="led-first") return <>{liveFaultBanner}`,
'show live Admin fault first');

app=replaceOnce(app,
`    if(printerStage==="symptom") return <>\n      <div className="mathis-bubble mathis-bubble-bot"><b>Très bien. Je dépanne`,
`    if(printerStage==="symptom") return <>{liveFaultBanner}\n      <div className="mathis-bubble mathis-bubble-bot"><b>Très bien. Je dépanne`,
'show fault banner on symptom screen');

fs.writeFileSync(appPath,app);

const serverPath='server.js';
let server=fs.readFileSync(serverPath,'utf8');
const serverAnchor='app.get("/api/guest/:token/mathis/incidents/active", async (req,res)=>{';
const endpoint=`app.get("/api/guest/:token/mathis/printer-status/:boothName", async (req,res)=>{\n  try{\n    const access=await portalAccess(req.params.token);\n    if(!access?.event)return res.status(404).json({ok:false});\n    const boothName=String(req.params.boothName||"").trim().toUpperCase();\n    if(!["LOLA","NINA","GABIN"].includes(boothName))return res.status(400).json({ok:false,message:"Borne invalide."});\n    const row=await prisma.appSetting.findUnique({where:{key:boothStatusKey(boothName)}}).catch(()=>null);\n    let payload={};\n    try{payload=row?.value&&typeof row.value==="object"?row.value:JSON.parse(String(row?.value||"{}"));}catch{payload={};}\n    const p=payload?.printer||{};\n    res.json({ok:true,printer:{\n      present:Boolean(p.present),model:String(p.model||"").slice(0,100)||null,rawStatus:String(p.rawStatus||"").slice(0,100)||null,\n      statusSeverity:String(p.statusSeverity||"").slice(0,20)||null,statusLabel:String(p.statusLabel||"").slice(0,160)||null,\n      statusFresh:p.statusFresh===null||typeof p.statusFresh==="undefined"?null:Boolean(p.statusFresh),statusAgeSeconds:Number.isFinite(Number(p.statusAgeSeconds))?Math.max(0,Number(p.statusAgeSeconds)):null\n    }});\n  }catch(err){console.error("Mathis printer status",err);res.status(500).json({ok:false,message:"Statut imprimante indisponible."});}\n});\n`;
if(!server.includes('/mathis/printer-status/:boothName')){
  const count=server.split(serverAnchor).length-1;
  if(count!==1)throw new Error(`[Mathis printer reader] server endpoint anchor: expected 1, got ${count}`);
  server=server.replace(serverAnchor,endpoint+serverAnchor);
}
fs.writeFileSync(serverPath,server);
console.log('[Mathis printer reader] OK — client Mathis + guest-safe status endpoint patched; agent untouched.');
