const fs=require("fs");
const path=require("path");
const appPath=path.join(process.cwd(),"client","src","App.jsx");
const serverPath=path.join(process.cwd(),"server.js");
let app=fs.readFileSync(appPath,"utf8");
let server=fs.readFileSync(serverPath,"utf8");
let changes=0;
const MARK="LP28_PORTAL_MASTER_PHOTO_ACCESS_V1";

if(!server.includes(MARK)){
  const pNeedle='personalizationBoothWidget:savedPortal.personalizationBoothWidget!==false};';
  if(!server.includes(pNeedle))throw new Error("[portal-master] permissions serveur introuvables");
  server=server.replace(pNeedle,'personalizationBoothWidget:savedPortal.personalizationBoothWidget!==false,organizerPhotobooth:savedPortal.organizerPhotobooth!==false,organizerQrGallery:savedPortal.organizerQrGallery!==false,guestPhotobooth:savedPortal.guestPhotobooth!==false,guestQrGallery:savedPortal.guestQrGallery!==false};');

  const fotoNeedle='fotoshareUrl:\n          event.fotoshareUrl';
  if(!server.includes(fotoNeedle))throw new Error("[portal-master] fotoshareUrl portail introuvable");
  server=server.replace(fotoNeedle,'fotoshareUrl:\n          ((access.role==="ORGANIZER"&&portalPermissions.organizerPhotobooth!==false)||(access.role!=="ORGANIZER"&&portalPermissions.guestPhotobooth!==false&&portalPermissions.guestPhotoboothOpen!==false)) ? event.fotoshareUrl : null');

  const memAnchor='// ---------------- V8.2.2 : LP28 Memories ----------------';
  if(!server.includes(memAnchor))throw new Error("[portal-master] ancre Memories introuvable");
  const helper=`// ${MARK}
function lp28PortalQrGalleryAllowed(access){
  if(!access?.event)return false;
  let prep=access.event.preparation;
  if(typeof prep==="string"){try{prep=JSON.parse(prep)}catch{prep={}}}
  if(!prep||typeof prep!=="object"||Array.isArray(prep))prep={};
  const p=prep.portalPermissions&&typeof prep.portalPermissions==="object"?prep.portalPermissions:{};
  const guest=prep.organizerGuestAccess&&typeof prep.organizerGuestAccess==="object"?prep.organizerGuestAccess:{};
  return access.role==="ORGANIZER"
    ? p.organizerQrGallery!==false
    : (p.guestQrGallery!==false && p.guestGallery!==false && guest.qrGalleryOpen!==false);
}
`;
  server=server.replace(memAnchor,helper+"\n"+memAnchor);

  const getMem='if(!access?.event?.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});\n\n  const showOriginalsToGuests=';
  if(!server.includes(getMem))throw new Error("[portal-master] GET memories introuvable");
  server=server.replace(getMem,'if(!access?.event?.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});\n  if(!lp28PortalQrGalleryAllowed(access))return res.status(403).json({ok:false,message:"Galerie photos verrouillée."});\n\n  const showOriginalsToGuests=');

  const portal404='if(!access?.event?.portalEnabled)return res.status(404).end();';
  server=server.replace(portal404,portal404+'\n    if(!lp28PortalQrGalleryAllowed(access))return res.status(403).end();');

  const filePortal='if(!access?.event?.portalEnabled){\n      return res.status(404).end();\n    }';
  server=server.replace(filePortal,filePortal+'\n    if(!lp28PortalQrGalleryAllowed(access))return res.status(403).end();');

  const uploadPortal='if(!access?.event?.portalEnabled){\n      for(const f of req.files||[]){';
  if(!server.includes(uploadPortal))throw new Error("[portal-master] upload memories introuvable");
  server=server.replace(uploadPortal,'if(!lp28PortalQrGalleryAllowed(access)){\n      for(const f of req.files||[])fs.unlink(f.path,()=>{});\n      return res.status(403).json({ok:false,message:"Galerie photos verrouillée."});\n    }\n\n    '+uploadPortal);

  fs.writeFileSync(serverPath,server,"utf8"); changes++;
}

if(!app.includes(MARK)){
  const stateNeedle='organizerMathis:saved.organizerMathis!==false,guestGallery:saved.guestGallery!==false,guestMathis:saved.guestMathis!==false';
  if(!app.includes(stateNeedle))throw new Error("[portal-master] état permissions introuvable");
  app=app.replace(stateNeedle,stateNeedle+',organizerPhotobooth:saved.organizerPhotobooth!==false,organizerQrGallery:saved.organizerQrGallery!==false,guestPhotobooth:saved.guestPhotobooth!==false,guestQrGallery:saved.guestQrGallery!==false');

  const uiAnchor='<label className="switch-line"><input type="checkbox" checked={portalPermissions.organizerContract}';
  if(!app.includes(uiAnchor))throw new Error("[portal-master] UI permissions introuvable");
  const ui=`{/* ${MARK} */}
              <label className="switch-line"><input type="checkbox" checked={portalPermissions.organizerPhotobooth} onChange={e=>setPortalPermissions(p=>({...p,organizerPhotobooth:e.target.checked}))}/> Organisateur : Photos Borne (FotoShare)</label>
              <label className="switch-line"><input type="checkbox" checked={portalPermissions.organizerQrGallery} onChange={e=>setPortalPermissions(p=>({...p,organizerQrGallery:e.target.checked}))}/> Organisateur : Photos QR Code</label>
              <label className="switch-line"><input type="checkbox" checked={portalPermissions.guestPhotobooth} onChange={e=>setPortalPermissions(p=>({...p,guestPhotobooth:e.target.checked}))}/> Invité : Photos Borne (FotoShare)</label>
              <label className="switch-line"><input type="checkbox" checked={portalPermissions.guestQrGallery} onChange={e=>setPortalPermissions(p=>({...p,guestQrGallery:e.target.checked}))}/> Invité : Photos QR Code</label>
              `;
  app=app.replace(uiAnchor,ui+uiAnchor);

  const roleNeedle='const canPortalMathis=organizer?portalPermissions.organizerMathis!==false:portalPermissions.guestMathis!==false;';
  if(!app.includes(roleNeedle))throw new Error("[portal-master] rôle portail introuvable");
  app=app.replace(roleNeedle,roleNeedle+'\n  const canQrGallery=organizer?portalPermissions.organizerQrGallery!==false:(portalPermissions.guestQrGallery!==false&&portalPermissions.guestGallery!==false&&portalPermissions.guestQrGalleryOpen!==false);');

  app=app.replace('{(organizer||(portalPermissions.guestGallery!==false&&guestQrGalleryOpen))&&<section className="portal-section" id="photos-partagees">','{canQrGallery&&<section className="portal-section" id="photos-partagees">');
  app=app.replace('{(organizer||portalPermissions.guestGallery!==false)&&<section className="portal-section" id="photos-partagees">','{canQrGallery&&<section className="portal-section" id="photos-partagees">');

  fs.writeFileSync(appPath,app,"utf8"); changes++;
}
console.log("[portal-master] OK : "+changes+" fichier(s) patché(s)");