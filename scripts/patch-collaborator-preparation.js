const fs=require("fs");
const appPath="client/src/App.jsx";
const serverPath="server.js";
let app=fs.readFileSync(appPath,"utf8");
let server=fs.readFileSync(serverPath,"utf8");

function replaceOnce(text,from,to,label){
  if(!text.includes(from)) throw new Error(`[collaborator-preparation] ${label}: bloc introuvable`);
  return text.replace(from,to);
}

if(!server.includes("LP28_COLLAB_PREPARATION_V1")){
  const clientOld=`    client: effectivePermissions.canSeeClient
      ? {
          name: event.organizerName,
          phone: event.organizerPhone,
          email: event.organizerEmail
        }
      : null,`;
  const clientNew=`    client: effectivePermissions.canSeeClient
      ? {
          name: event.organizerName,
          firstName: collaboratorPrep.clientFirstName || event.client?.firstName || null,
          phone: event.organizerPhone,
          email: event.organizerEmail
        }
      : null,

    preparation: {
      checklist: collaboratorPrep.checklist && typeof collaboratorPrep.checklist === "object"
        ? collaboratorPrep.checklist
        : {}
    },`;

  server=replaceOnce(
    server,
    `  const event = access.event;\n  const effectivePermissions=effectiveCollaboratorPermissions(event,access);\n  const canSeeOperationalBalance=effectivePermissions.canSeeBalance;`,
    `  const event = access.event;\n  const effectivePermissions=effectiveCollaboratorPermissions(event,access);\n  const canSeeOperationalBalance=effectivePermissions.canSeeBalance;\n  /* LP28_COLLAB_PREPARATION_V1 */\n  let collaboratorPrep=event?.preparation;\n  if(typeof collaboratorPrep==="string"){try{collaboratorPrep=JSON.parse(collaboratorPrep)}catch{collaboratorPrep={}}}\n  if(!collaboratorPrep||typeof collaboratorPrep!=="object"||Array.isArray(collaboratorPrep))collaboratorPrep={};`,
    "lecture préparation collaborateur"
  );
  server=replaceOnce(server,clientOld,clientNew,"prénom client + checklist API");

  const routeMarker=`app.get(\n  "/api/collaborator-portal/:token/contract.pdf",`;
  const checklistRoute=`app.post("/api/collaborator-portal/:token/preparation-checklist", async (req,res)=>{
  try{
    const access=await prisma.collaboratorAccess.findUnique({
      where:{token:req.params.token},
      include:{event:true}
    });
    if(!access||!access.active||!access.event){
      return res.status(404).json({ok:false,message:"Accès invalide ou expiré."});
    }
    const incoming=req.body?.checklist;
    if(!incoming||typeof incoming!=="object"||Array.isArray(incoming)){
      return res.status(400).json({ok:false,message:"Check-list invalide."});
    }
    let preparation=access.event.preparation;
    if(typeof preparation==="string"){try{preparation=JSON.parse(preparation)}catch{preparation={}}}
    if(!preparation||typeof preparation!=="object"||Array.isArray(preparation))preparation={};
    const safeChecklist={};
    for(const [rawKey,rawValue] of Object.entries(incoming).slice(0,120)){
      const key=String(rawKey||"").trim().slice(0,180);
      if(key)safeChecklist[key]=rawValue===true;
    }
    const nextPreparation={...preparation,checklist:safeChecklist};
    await prisma.event.update({
      where:{id:access.eventId},
      data:{preparation:nextPreparation}
    });
    return res.json({ok:true,checklist:safeChecklist});
  }catch(err){
    console.error("Checklist préparation collaborateur :",err);
    return res.status(500).json({ok:false,message:"Impossible d'enregistrer la préparation."});
  }
});

`;
  server=replaceOnce(server,routeMarker,checklistRoute+routeMarker,"route sauvegarde checklist");
}

if(!app.includes("LP28_COLLAB_PREPARATION_V1")){
  const stateOld=`function CollaboratorPortalPage({token}){
  const [data,setData]=useState(null);
  const [error,setError]=useState("");`;
  const stateNew=`function CollaboratorPortalPage({token}){
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const [prepSaving,setPrepSaving]=useState(false);

  /* LP28_COLLAB_PREPARATION_V1 */
  const collabMaterialNames=(data?.mission?.materials||[]).map(m=>String(m?.name||m||"")).filter(Boolean);
  const collabBooths=collabMaterialNames.filter(m=>/borne photobooth/i.test(m));
  const collabHasPrint=collabMaterialNames.some(m=>/forfait (100|200|300|400|700)|impressions personnalisé/i.test(m));
  const collabPrepItems=[];
  collabBooths.forEach(b=>collabPrepItems.push({id:"booth-"+b,label:b,icon:"📸"}));
  if(collabBooths.length){
    collabPrepItems.push({id:"camera",label:"Appareil photo",icon:"📷"});
    collabPrepItems.push({id:"umbrella",label:"Parapluie pour flash",icon:"☂️"});
    collabPrepItems.push({id:"flash-ms300",label:"Flash Godox MS300",icon:"💡"});
    collabPrepItems.push({id:"extension",label:"Rallonge électrique",icon:"🔌"});
    collabPrepItems.push({id:"support",label:"Mange-debout ou tonneau",icon:"🪵"});
  }
  if(collabHasPrint){
    collabPrepItems.push({id:"printer",label:"Imprimante",icon:"🖨️"});
    collabPrepItems.push({id:"paper",label:"Papier photo / consommables",icon:"🧻"});
  }
  collabMaterialNames
    .filter(m=>/livre d.or|karaok|enceinte|micro|fontaine|jet d.|poteaux|toile|clé usb/i.test(m))
    .forEach((m,i)=>collabPrepItems.push({
      id:"option-"+(String(m).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||i),
      label:m,
      icon:/livre d.or/i.test(m)?"☎️":/karaok/i.test(m)?"🎤":/enceinte|micro/i.test(m)?"🔊":/fontaine/i.test(m)?"🍹":/jet d./i.test(m)?"✨":"📦"
    }));
  const collabPrepChecks=(data?.preparation?.checklist&&typeof data.preparation.checklist==="object")?data.preparation.checklist:{};
  const collabPrepDone=collabPrepItems.filter(i=>collabPrepChecks[i.id]===true).length;
  const collabPrepTotal=collabPrepItems.length;
  const collabPrepPercent=collabPrepTotal?Math.round(collabPrepDone*100/collabPrepTotal):0;
  async function saveCollabPrep(id,checked){
    const previous={...collabPrepChecks};
    const next={...previous,[id]:checked};
    setData(d=>({...d,preparation:{...(d?.preparation||{}),checklist:next}}));
    setPrepSaving(true);
    try{
      const r=await fetch(\`/api/collaborator-portal/\${encodeURIComponent(token)}/preparation-checklist\`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({checklist:next})
      });
      const result=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(result.message||"Enregistrement impossible.");
      setData(d=>({...d,preparation:{...(d?.preparation||{}),checklist:result.checklist||next}}));
    }catch(err){
      setData(d=>({...d,preparation:{...(d?.preparation||{}),checklist:previous}}));
      alert(err.message||"Impossible d'enregistrer la préparation.");
    }finally{setPrepSaving(false);}
  }`;
  app=replaceOnce(app,stateOld,stateNew,"logique checklist collaborateur");

  const contactMarker=`        {data.client && (
          <section className="portal-section">
            <h2>👤 Contact client</h2>`;
  const prepSection=`        <section className="portal-section" id="preparation-collaborateur">
          <style>{\`
            .collab-prep-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.collab-prep-badge{padding:6px 10px;border-radius:999px;border:1px solid rgba(34,201,139,.35);background:rgba(34,201,139,.09);color:#8df0cb;font-size:12px;font-weight:900}.collab-prep-progress{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:10px 0 14px}.collab-prep-progress span{display:block;height:100%;background:linear-gradient(90deg,#2e8cff,#22c98b);border-radius:inherit}.collab-prep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.collab-prep-item{display:flex!important;align-items:center;gap:9px;padding:11px 12px;margin:0!important;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:rgba(255,255,255,.025);cursor:pointer}.collab-prep-item.done{border-color:rgba(34,201,139,.35);background:rgba(34,201,139,.08)}.collab-prep-item input{width:21px!important;height:21px!important;margin:0!important;accent-color:#22c98b}.collab-prep-ready{margin-top:12px;padding:10px 12px;border:1px solid rgba(34,201,139,.38);border-radius:11px;background:rgba(34,201,139,.1);color:#91f2d0;font-weight:900;text-align:center}.collab-prep-empty{color:#aeb8c7;font-size:13px;padding:10px 0}@media(max-width:700px){.collab-prep-grid{grid-template-columns:1fr}}
          \`}</style>
          <div className="collab-prep-head"><h2 style={{margin:0}}>✅ Préparation</h2><span className="collab-prep-badge">{collabPrepDone}/{collabPrepTotal} · {collabPrepPercent}%{prepSaving?" · sauvegarde…":""}</span></div>
          <div className="collab-prep-progress"><span style={{width:collabPrepPercent+"%"}}/></div>
          {collabPrepTotal>0?<div className="collab-prep-grid">{collabPrepItems.map(item=><label key={item.id} className={collabPrepChecks[item.id]?"collab-prep-item done":"collab-prep-item"}><input type="checkbox" checked={collabPrepChecks[item.id]===true} onChange={e=>saveCollabPrep(item.id,e.target.checked)}/><span>{item.icon}</span><strong>{item.label}</strong></label>)}</div>:<div className="collab-prep-empty">Aucun matériel de préparation détecté pour cette prestation.</div>}
          {collabPrepTotal>0&&collabPrepDone===collabPrepTotal&&<div className="collab-prep-ready">✅ Matériel prêt pour l’événement</div>}
        </section>

`;
  app=replaceOnce(app,contactMarker,prepSection+contactMarker,"affichage checklist collaborateur");

  app=replaceOnce(
    app,
    `<p><strong>{data.client.name}</strong></p>`,
    `<p><strong>{[data.client.name,data.client.firstName].filter(Boolean).join(" ")}</strong></p>`,
    "prénom après nom client"
  );
}

fs.writeFileSync(appPath,app,"utf8");
fs.writeFileSync(serverPath,server,"utf8");
console.log("[collaborator-preparation] OK: prénom client + checklist collaborateur synchronisée");
