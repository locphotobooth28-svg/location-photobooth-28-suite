const fs=require('fs');
const path=require('path');

const appPath=path.join(process.cwd(),'client','src','App.jsx');
const serverPath=path.join(process.cwd(),'server.js');
let app=fs.readFileSync(appPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let changes=0;

const APP_MARKER='LP28_ORGANIZER_GALLERY_LOCKS_V1';
const SERVER_MARKER='LP28_ORGANIZER_GALLERY_LOCKS_API_V1';

if(!server.includes(SERVER_MARKER)){
  const permissionsOld='const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false};';
  const permissionsNew='const organizerGuestAccess=prep?.organizerGuestAccess&&typeof prep.organizerGuestAccess==="object"?prep.organizerGuestAccess:{};\n    const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false,guestPhotoboothOpen:organizerGuestAccess.photoboothOpen!==false,guestQrGalleryOpen:organizerGuestAccess.qrGalleryOpen!==false};';
  if(!server.includes(permissionsOld))throw new Error('[gallery-locks] portalPermissions serveur introuvable');
  server=server.split(permissionsOld).join(permissionsNew);

  const apiAnchor='app.post("/api/guest/:token/gallery-originals-visibility", async (req,res)=>{';
  if(!server.includes(apiAnchor))throw new Error('[gallery-locks] point insertion API organisateur introuvable');
  const apiBlock=`// ${SERVER_MARKER}\napp.post("/api/guest/:token/guest-gallery-access", async (req,res)=>{\n  try{\n    const access=await portalAccessRaw(req.params.token);\n    if(!access||access.role!=="ORGANIZER"||!access.event?.portalEnabled){\n      return res.status(403).json({ok:false,message:"Accès organisateur requis."});\n    }\n    const section=String(req.body?.section||"").toUpperCase();\n    if(!["PHOTOBOOTH","QR"].includes(section)){\n      return res.status(400).json({ok:false,message:"Section invalide."});\n    }\n    let prep=access.event.preparation;\n    if(typeof prep==="string"){try{prep=JSON.parse(prep)}catch{prep={}}}\n    if(!prep||typeof prep!=="object"||Array.isArray(prep))prep={};\n    const guestAccess=prep.organizerGuestAccess&&typeof prep.organizerGuestAccess==="object"?{...prep.organizerGuestAccess}:{};\n    const open=req.body?.open!==false;\n    if(section==="PHOTOBOOTH")guestAccess.photoboothOpen=open;\n    if(section==="QR")guestAccess.qrGalleryOpen=open;\n    const preparation={...prep,organizerGuestAccess:guestAccess};\n    await prisma.event.update({where:{id:access.event.id},data:{preparation}});\n    res.json({ok:true,guestPhotoboothOpen:guestAccess.photoboothOpen!==false,guestQrGalleryOpen:guestAccess.qrGalleryOpen!==false});\n  }catch(err){\n    console.error("Mise à jour accès galeries organisateur :",err);\n    res.status(500).json({ok:false,message:"Impossible de modifier l’accès des invités."});\n  }\n});\n\n${apiAnchor}`;
  server=server.replace(apiAnchor,apiBlock);
  fs.writeFileSync(serverPath,server,'utf8');
  changes++;
}

if(!app.includes(APP_MARKER)){
  const stateAnchor='  const [selectMode,setSelectMode]=useState(false),[selected,setSelected]=useState([]);';
  if(!app.includes(stateAnchor))throw new Error('[gallery-locks] état PortalPage introuvable');
  app=app.replace(stateAnchor,stateAnchor+'\n  const [guestAccessBusy,setGuestAccessBusy]=useState(false);');

  const organizerAnchor='  const organizer=data?.role==="ORGANIZER";\n  const portalPermissions=data?.portalPermissions||{};';
  if(!app.includes(organizerAnchor))throw new Error('[gallery-locks] rôle organisateur introuvable');
  const organizerReplacement=`  /* ${APP_MARKER} */\n  async function setGuestGalleryAccess(section,open){\n    try{\n      setGuestAccessBusy(true);\n      const r=await fetch(\`/api/guest/\${token}/guest-gallery-access\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({section,open})});\n      const d=await r.json().catch(()=>({}));\n      if(!r.ok)throw new Error(d.message||"Impossible de modifier l’accès.");\n      setData(prev=>prev?{...prev,portalPermissions:{...(prev.portalPermissions||{}),guestPhotoboothOpen:d.guestPhotoboothOpen!==false,guestQrGalleryOpen:d.guestQrGalleryOpen!==false}}:prev);\n    }catch(err){alert(err.message||"Impossible de modifier l’accès des invités.");}\n    finally{setGuestAccessBusy(false);}\n  }\n\n  const organizer=data?.role==="ORGANIZER";\n  const portalPermissions=data?.portalPermissions||{};\n  const guestPhotoboothOpen=portalPermissions.guestPhotoboothOpen!==false;\n  const guestQrGalleryOpen=portalPermissions.guestQrGalleryOpen!==false;`;
  app=app.replace(organizerAnchor,organizerReplacement);

  const actionOld=`    <div className="portal-photo-actions">\n      {e.fotoshareUrl\n        ? <a className="portal-action primary" href={e.fotoshareUrl} target="_blank" rel="noreferrer">📸 Photos du Photobooth</a>\n        : <div className="portal-action disabled" aria-disabled="true">📸 Photos du Photobooth — lien bientôt disponible</div>}\n      <a className="portal-action" href="#photos-partagees">📱 Galerie photos QR Code</a>\n    </div>`;
  if(!app.includes(actionOld))throw new Error('[gallery-locks] boutons galeries portail introuvables');
  const actionNew=`    <div className="portal-photo-actions">\n      {e.fotoshareUrl\n        ? (organizer||guestPhotoboothOpen\n            ? <a className="portal-action primary" href={e.fotoshareUrl} target="_blank" rel="noreferrer">📸 Photos du Photobooth</a>\n            : <div className="portal-action disabled" aria-disabled="true">🔒 Photos du Photobooth verrouillées par l’organisateur</div>)\n        : <div className="portal-action disabled" aria-disabled="true">📸 Photos du Photobooth — lien bientôt disponible</div>}\n      {organizer||guestQrGalleryOpen\n        ? <a className="portal-action" href="#photos-partagees">📱 Galerie photos QR Code</a>\n        : <div className="portal-action disabled" aria-disabled="true">🔒 Galerie photos QR Code verrouillée par l’organisateur</div>}\n    </div>\n    {organizer&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:12}}>\n      <button type="button" disabled={guestAccessBusy} onClick={()=>setGuestGalleryAccess("PHOTOBOOTH",!guestPhotoboothOpen)} style={{padding:"11px 12px",borderRadius:12,fontWeight:900,border:guestPhotoboothOpen?"1px solid rgba(34,197,94,.55)":"1px solid rgba(239,68,68,.6)",background:guestPhotoboothOpen?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)"}}>📸 Accès invités Photobooth : {guestPhotoboothOpen?"🟢 OUVERT":"🔴 VERROUILLÉ"}</button>\n      <button type="button" disabled={guestAccessBusy} onClick={()=>setGuestGalleryAccess("QR",!guestQrGalleryOpen)} style={{padding:"11px 12px",borderRadius:12,fontWeight:900,border:guestQrGalleryOpen?"1px solid rgba(34,197,94,.55)":"1px solid rgba(239,68,68,.6)",background:guestQrGalleryOpen?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)"}}>📱 Accès invités QR Code : {guestQrGalleryOpen?"🟢 OUVERT":"🔴 VERROUILLÉ"}</button>\n    </div>}\n    {organizer&&<div className="portal-note" style={{marginTop:8}}>Les deux accès sont ouverts par défaut. Le verrouillage concerne uniquement les invités ; votre accès organisateur reste disponible.</div>}`;
  app=app.replace(actionOld,actionNew);

  const sectionOld='{(organizer||portalPermissions.guestGallery!==false)&&<section className="portal-section" id="photos-partagees">';
  const sectionNew='{(organizer||(portalPermissions.guestGallery!==false&&guestQrGalleryOpen))&&<section className="portal-section" id="photos-partagees">';
  if(!app.includes(sectionOld))throw new Error('[gallery-locks] condition galerie QR introuvable');
  app=app.split(sectionOld).join(sectionNew);

  fs.writeFileSync(appPath,app,'utf8');
  changes++;
}

console.log(`[gallery-locks] OK : ${changes} fichier(s) patché(s)`);
