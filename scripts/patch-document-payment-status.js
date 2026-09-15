const fs=require('fs');
const path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
const enhancerPath=path.join(process.cwd(),'client','src','organizerDocumentEnhancer.js');
let server=fs.readFileSync(serverPath,'utf8');
let app=fs.readFileSync(appPath,'utf8');
let enhancer=fs.existsSync(enhancerPath)?fs.readFileSync(enhancerPath,'utf8'):'';
let changes=0;

// Backend : exposer et enregistrer paymentStatus pour les liens web.
const viewOld='visibleClient:link.visibleClient!==false,url:link.url,webViewLink:link.url,mimeType:"text/uri-list",createdTime:link.createdAt||null';
const viewNew='visibleClient:link.visibleClient!==false,paymentStatus:String(link.paymentStatus||"NONE"),url:link.url,webViewLink:link.url,mimeType:"text/uri-list",createdTime:link.createdAt||null';
if(server.includes(viewOld)){server=server.replace(viewOld,viewNew);changes++;}

const createOld='visibleClient:req.body?.visibleClient!==false,createdAt:new Date().toISOString()';
const createNew='visibleClient:req.body?.visibleClient!==false,paymentStatus:["NONE","UPCOMING","PAID","PARTIAL","OVERDUE"].includes(String(req.body?.paymentStatus||""))?String(req.body.paymentStatus):"NONE",createdAt:new Date().toISOString()';
if(server.includes(createOld)){server=server.replace(createOld,createNew);changes++;}

const patchOld='if(req.body?.type)links[i].type=String(req.body.type); if(req.body?.displayName!=null)links[i].displayName=String(req.body.displayName).trim()||documentTypeLabel(links[i].type); if(req.body?.visibleClient!=null)links[i].visibleClient=Boolean(req.body.visibleClient);';
const patchNew='if(req.body?.type)links[i].type=String(req.body.type); if(req.body?.displayName!=null)links[i].displayName=String(req.body.displayName).trim()||documentTypeLabel(links[i].type); if(req.body?.visibleClient!=null)links[i].visibleClient=Boolean(req.body.visibleClient); if(req.body?.paymentStatus!=null && ["NONE","UPCOMING","PAID","PARTIAL","OVERDUE"].includes(String(req.body.paymentStatus)))links[i].paymentStatus=String(req.body.paymentStatus);';
if(server.includes(patchOld)){server=server.replace(patchOld,patchNew);changes++;}

// Frontend Admin : état du statut et envoi lors de la création d'un lien web.
const stateMarker='  const [webUrl,setWebUrl]=useState("");';
if(app.includes(stateMarker)&&!app.includes('setPaymentStatus')){app=app.replace(stateMarker,stateMarker+'\n  const [paymentStatus,setPaymentStatus]=useState("NONE");');changes++;}
app=app.replace('body:JSON.stringify({url,type,displayName,visibleClient})','body:JSON.stringify({url,type,displayName,visibleClient,paymentStatus})');

// Ajouter le choix de statut dans le formulaire des liens web.
const webInput='{documentSource==="WEB"&&<input value={webUrl} onChange={e=>setWebUrl(e.target.value)} placeholder="https://..." inputMode="url" style={{marginBottom:10}}/>}';
if(app.includes(webInput)&&!app.includes('Statut du règlement')){
  const controls=webInput+'\n            {documentSource==="WEB"&&(["INVOICE","DEPOSIT_INVOICE"].includes(type))&&<>\n              <label>Statut du règlement</label>\n              <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} style={{marginBottom:10}}>\n                <option value="NONE">⚪ Aucun statut</option>\n                <option value="UPCOMING">🟡 Règlement à venir</option>\n                <option value="PAID">🟢 Facture acquittée</option>\n                <option value="PARTIAL">🟠 Règlement partiel</option>\n                <option value="OVERDUE">🔴 Règlement en retard</option>\n              </select>\n            </>}';
  app=app.replace(webInput,controls);changes++;
}

// Ajouter un sélecteur directement sur chaque document web de type facture.
const visibleBtn='<button className="btn-secondary" onClick={()=>toggleVisible(doc)}>{doc.visibleClient?"🔒 Masquer au client":"👤 Rendre visible client"}</button>';
if(app.includes(visibleBtn)&&!app.includes('updatePaymentStatus(doc')){
  const injected=visibleBtn+'\n                  {doc.source==="WEB"&&["INVOICE","DEPOSIT_INVOICE"].includes(doc.type)&&<select aria-label="Statut du règlement" value={doc.paymentStatus||"NONE"} onChange={async e=>{const paymentStatus=e.target.value;try{const r=await fetch(`/api/events/${event.id}/documents/${encodeURIComponent(doc.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentStatus})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Impossible de modifier le statut.");await load();}catch(err){alert(err.message)}}}>\n                    <option value="NONE">⚪ Aucun statut</option><option value="UPCOMING">🟡 Règlement à venir</option><option value="PAID">🟢 Facture acquittée</option><option value="PARTIAL">🟠 Règlement partiel</option><option value="OVERDUE">🔴 Règlement en retard</option>\n                  </select>}';
  app=app.replace(visibleBtn,injected);changes++;
}

// Portail organisateur : le statut manuel est prioritaire sur toute déduction automatique.
if(enhancer){
  const marker='function paymentLabelFor(doc,data){\n  const name=';
  if(enhancer.includes(marker)&&!enhancer.includes('manualPaymentStatus')){
    const replacement='function paymentLabelFor(doc,data){\n  const manualPaymentStatus=String(doc?.paymentStatus||"NONE").toUpperCase();\n  const manualLabels={UPCOMING:{text:"🟡 Règlement à venir",cls:""},PAID:{text:"🟢 Facture acquittée",cls:"is-paid"},PARTIAL:{text:"🟠 Règlement partiel",cls:""},OVERDUE:{text:"🔴 Règlement en retard",cls:""}};\n  if(manualLabels[manualPaymentStatus]) return manualLabels[manualPaymentStatus];\n  const name=';
    enhancer=enhancer.replace(marker,replacement);changes++;
  }
}

fs.writeFileSync(serverPath,server,'utf8');
fs.writeFileSync(appPath,app,'utf8');
if(enhancer)fs.writeFileSync(enhancerPath,enhancer,'utf8');
console.log(`[document-payment-status] ${changes} modification(s) appliquée(s).`);
