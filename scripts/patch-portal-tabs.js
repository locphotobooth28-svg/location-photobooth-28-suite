const fs=require('fs');
const path=require('path');

const appPath=path.join(process.cwd(),'client','src','App.jsx');
let app=fs.readFileSync(appPath,'utf8');
let changes=0;

const MARKER='LP28_PORTAL_TABS_V1';
if(app.includes(MARKER)){
  console.log('[portal-tabs] déjà appliqué');
  process.exit(0);
}

function replaceOnce(from,to,label){
  if(!app.includes(from))throw new Error(`[portal-tabs] ${label}: bloc introuvable`);
  app=app.replace(from,to);
  changes++;
}

replaceOnce(
  '  const [guestAccessBusy,setGuestAccessBusy]=useState(false);',
  '  const [guestAccessBusy,setGuestAccessBusy]=useState(false);\n  const [portalTab,setPortalTab]=useState("home"); // '+MARKER,
  'état onglet portail'
);

const accessAnchor='  const guestQrGalleryOpen=portalPermissions.guestQrGalleryOpen!==false;';
replaceOnce(
  accessAnchor,
  accessAnchor+'\n  const portalTabs=organizer\n    ? [\n        ["home","🏠","Accueil"],\n        ["documents","📄","Documents"],\n        ["personalization","🎨","Personnalisation"],\n        ["qr","📱","QR invités"],\n        ["photos","📸","Photobooth"],\n        ["gallery","🖼️","Galerie QR"],\n        ["support","🆘","Assistance"]\n      ]\n    : [\n        ["home","🏠","Accueil"],\n        ["photos","📸","Photobooth"],\n        ["gallery","🖼️","Galerie"],\n        ["support","🆘","Assistance"]\n      ];',
  'liste des onglets'
);

const roleAndCatalog='{organizer&&<div className="portal-role">🔐 Espace organisateur</div>}\n    {organizer&&<LP28PersonalizationCatalog token={token} permissions={portalPermissions}/>} ';
const tabsUi=`{organizer&&<div className="portal-role">🔐 Espace organisateur</div>}\n\n    <style>{\`\n      .lp28-portal-tabs{position:fixed;left:14px;top:110px;z-index:40;width:178px;display:flex;flex-direction:column;gap:7px;padding:10px;border:1px solid rgba(214,185,79,.28);border-radius:16px;background:rgba(8,10,13,.94);box-shadow:0 14px 34px rgba(0,0,0,.32);backdrop-filter:blur(12px)}\n      .lp28-portal-tab{display:flex;align-items:center;gap:9px;width:100%;min-height:42px;padding:9px 11px;border-radius:11px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:#e8e8ea;font-weight:850;font-size:12px;text-align:left;cursor:pointer}\n      .lp28-portal-tab:hover{border-color:rgba(214,185,79,.45);background:rgba(214,185,79,.08)}\n      .lp28-portal-tab.active{border-color:#d9bd4b;background:linear-gradient(135deg,rgba(217,189,75,.24),rgba(217,189,75,.10));color:#f5d95d;box-shadow:inset 3px 0 0 #e0c34f}\n      .lp28-portal-tab .ico{font-size:16px;line-height:1}.lp28-portal-tab .label{white-space:nowrap}\n      .lp28-tab-home{margin:14px 0;padding:15px 16px;border:1px solid rgba(214,185,79,.22);border-radius:14px;background:rgba(214,185,79,.055)}\n      .lp28-tab-home h2{margin:0 0 5px;font-size:16px}.lp28-tab-home p{margin:0;line-height:1.5;font-size:12px;color:#b9bac0}\n      @media(max-width:980px){\n        .lp28-portal-tabs{position:sticky;left:auto;top:0;width:auto;margin:10px -2px 14px;padding:8px;display:flex;flex-direction:row;overflow-x:auto;gap:6px;border-radius:13px;z-index:50;scrollbar-width:thin}\n        .lp28-portal-tab{width:auto;min-width:max-content;min-height:38px;padding:8px 10px;font-size:11px}\n        .lp28-portal-tab.active{box-shadow:inset 0 -3px 0 #e0c34f}\n      }\n    \`}</style>\n    <nav className="lp28-portal-tabs" aria-label="Navigation du portail">\n      {portalTabs.map(([key,icon,label])=><button key={key} type="button" className={\`lp28-portal-tab \${portalTab===key?"active":""}\`} onClick={()=>{setPortalTab(key);window.scrollTo({top:0,behavior:"smooth"})}}><span className="ico">{icon}</span><span className="label">{label}</span></button>)}\n    </nav>\n\n    {portalTab==="home"&&<section className="lp28-tab-home">\n      <h2>{organizer?"Bienvenue dans votre espace organisateur 👋":"Bienvenue sur l’espace invités 👋"}</h2>\n      <p>{organizer?"Utilisez les onglets pour accéder rapidement à vos documents, à la personnalisation, au QR Code invités, aux galeries photos et à l’assistance.":"Utilisez les onglets pour accéder rapidement aux photos, à la galerie de l’événement et à l’assistance."}</p>\n    </section>}\n\n    {organizer&&portalTab==="personalization"&&<LP28PersonalizationCatalog token={token} permissions={portalPermissions}/>} `;
replaceOnce(roleAndCatalog,tabsUi,'navigation et onglet personnalisation');

replaceOnce(
  '{organizer&&(portalPermissions.organizerContract!==false||portalPermissions.organizerDocuments!==false)&&(',
  '{organizer&&portalTab==="documents"&&(portalPermissions.organizerContract!==false||portalPermissions.organizerDocuments!==false)&&(',
  'onglet documents'
);

replaceOnce(
  '{organizer&&portalPermissions.organizerShare!==false&&guestShare&&(',
  '{organizer&&portalTab==="qr"&&portalPermissions.organizerShare!==false&&guestShare&&(',
  'onglet QR invités'
);

const photoActionsStart='    <div className="portal-photo-actions">';
replaceOnce(photoActionsStart,'    {portalTab==="photos"&&<>\n'+photoActionsStart,'début onglet photobooth');

const photoActionsEnd='    {organizer&&<div className="portal-note" style={{marginTop:8}}>Les deux accès sont ouverts par défaut. Le verrouillage concerne uniquement les invités ; votre accès organisateur reste disponible.</div>}';
replaceOnce(photoActionsEnd,photoActionsEnd+'\n    </>}','fin onglet photobooth');

replaceOnce(
  '{(organizer||(portalPermissions.guestGallery!==false&&guestQrGalleryOpen))&&<section className="portal-section" id="photos-partagees">',
  '{portalTab==="gallery"&&(organizer||(portalPermissions.guestGallery!==false&&guestQrGalleryOpen))&&<section className="portal-section" id="photos-partagees">',
  'onglet galerie QR'
);

replaceOnce(
  '{support.googleReviewUrl&&<a className="portal-action" href={support.googleReviewUrl} target="_blank" rel="noreferrer">⭐ Donner un avis Google</a>}',
  '{portalTab==="home"&&support.googleReviewUrl&&<a className="portal-action" href={support.googleReviewUrl} target="_blank" rel="noreferrer">⭐ Donner un avis Google</a>}',
  'avis Google sur accueil'
);

replaceOnce(
  '{canPortalMathis&&<section className="portal-section">',
  '{portalTab==="support"&&canPortalMathis&&<section className="portal-section">',
  'onglet assistance Mathis'
);

fs.writeFileSync(appPath,app,'utf8');
console.log(`[portal-tabs] OK : ${changes} modification(s) appliquée(s)`);
