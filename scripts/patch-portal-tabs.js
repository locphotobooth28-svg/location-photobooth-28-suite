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
  '  const [guestAccessBusy,setGuestAccessBusy]=useState(false);\n  const [portalTab,setPortalTab]=useState("home");\n  const [portalMenuOpen,setPortalMenuOpen]=useState(false); // '+MARKER,
  'état onglet portail'
);

const accessAnchor='  const guestQrGalleryOpen=portalPermissions.guestQrGalleryOpen!==false;';
replaceOnce(
  accessAnchor,
  accessAnchor+'\n  const portalTabs=organizer\n    ? [\n        ["home","🏠","Accueil"],\n        ["documents","📄","Documents"],\n        ["personalization","🎨","Personnalisation"],\n        ["qr","📱","QR invités"],\n        ["photos","📸","Accès photos"],\n        ["gallery","🖼️","Galerie QR"],\n        ["support","🆘","Assistance"]\n      ]\n    : [\n        ["home","🏠","Accueil"],\n        ["photos","📸","Accès photos"],\n        ["gallery","🖼️","Galerie"],\n        ["support","🆘","Assistance"]\n      ];\n  const activePortalTab=portalTabs.find(([key])=>key===portalTab)||portalTabs[0];',
  'liste des onglets'
);

const roleAndCatalog='{organizer&&<div className="portal-role">🔐 Espace organisateur</div>}\n    {organizer&&<LP28PersonalizationCatalog token={token} permissions={portalPermissions}/>} ';
const tabsUi=`{organizer&&<div className="portal-role">🔐 Espace organisateur</div>}\n\n    <style>{\`\n      .lp28-portal-topbar{position:fixed;top:0;left:0;right:0;z-index:70;height:54px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 14px;border-bottom:1px solid rgba(214,185,79,.25);background:rgba(8,10,13,.97);box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(14px)}\n      .lp28-portal-topbar-left{min-width:0;display:flex;align-items:center;gap:10px}.lp28-portal-topbar-brand{font-size:11px;font-weight:950;letter-spacing:.12em;color:#d9bd4b;white-space:nowrap}.lp28-portal-topbar-current{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:850;color:#f4f4f5}\n      .lp28-menu-pin{flex:0 0 auto;height:38px;min-width:92px;padding:0 13px;border-radius:10px;border:1px solid rgba(214,185,79,.45);background:rgba(214,185,79,.08);color:#f5d95d;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}\n      .lp28-menu-pin:hover,.lp28-menu-pin.open{background:rgba(214,185,79,.16);border-color:#d9bd4b}\n      .lp28-topbar-spacer{height:58px}\n      .lp28-portal-tabs{position:fixed;right:12px;top:62px;z-index:69;width:220px;display:flex;flex-direction:column;gap:7px;padding:10px;border:1px solid rgba(214,185,79,.28);border-radius:14px;background:rgba(8,10,13,.98);box-shadow:0 16px 36px rgba(0,0,0,.42);backdrop-filter:blur(12px);opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .16s ease,transform .16s ease,visibility .16s ease}\n      .lp28-portal-tabs.open{opacity:1;visibility:visible;transform:translateY(0)}\n      .lp28-portal-tab{display:flex;align-items:center;gap:9px;width:100%;min-height:42px;padding:9px 11px;border-radius:11px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:#e8e8ea;font-weight:850;font-size:12px;text-align:left;cursor:pointer}\n      .lp28-portal-tab:hover{border-color:rgba(214,185,79,.45);background:rgba(214,185,79,.08)}\n      .lp28-portal-tab.active{border-color:#d9bd4b;background:linear-gradient(135deg,rgba(217,189,75,.24),rgba(217,189,75,.10));color:#f5d95d;box-shadow:inset 3px 0 0 #e0c34f}\n      .lp28-portal-tab .ico{font-size:16px;line-height:1}.lp28-portal-tab .label{white-space:nowrap}\n      .lp28-tab-home{margin:14px 0;padding:15px 16px;border:1px solid rgba(214,185,79,.22);border-radius:14px;background:rgba(214,185,79,.055)}\n      .lp28-tab-home h2{margin:0 0 5px;font-size:16px}.lp28-tab-home p{margin:0;line-height:1.5;font-size:12px;color:#b9bac0}\n      @media(max-width:600px){\n        .lp28-portal-topbar{height:50px;padding:0 10px}.lp28-topbar-spacer{height:54px}.lp28-portal-topbar-brand{display:none}.lp28-portal-topbar-current{font-size:12px}.lp28-menu-pin{height:36px;min-width:82px;padding:0 11px;font-size:12px}.lp28-portal-tabs{right:8px;top:57px;width:min(250px,calc(100vw - 16px));max-height:calc(100vh - 68px);overflow-y:auto}\n      }\n    \`}</style>\n    <div className="lp28-portal-topbar">\n      <div className="lp28-portal-topbar-left"><span className="lp28-portal-topbar-brand">LP28</span><span className="lp28-portal-topbar-current">{activePortalTab?.[1]} {activePortalTab?.[2]}</span></div>\n      <button type="button" className={\`lp28-menu-pin \${portalMenuOpen?"open":""}\`} onClick={()=>setPortalMenuOpen(v=>!v)} aria-label={portalMenuOpen?"Fermer le menu":"Ouvrir le menu"} aria-expanded={portalMenuOpen}>☰ <span>Menu</span></button>\n    </div>\n    <div className="lp28-topbar-spacer" aria-hidden="true"></div>\n    <nav className={\`lp28-portal-tabs \${portalMenuOpen?"open":""}\`} aria-label="Navigation du portail">\n      {portalTabs.map(([key,icon,label])=><button key={key} type="button" className={\`lp28-portal-tab \${portalTab===key?"active":""}\`} onClick={()=>{setPortalTab(key);setPortalMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"})}}><span className="ico">{icon}</span><span className="label">{label}</span></button>)}\n    </nav>\n\n    {portalTab==="home"&&<section className="lp28-tab-home">\n      <h2>{organizer?"Bienvenue dans votre espace organisateur 👋":"Bienvenue sur l’espace invités 👋"}</h2>\n      <p>{organizer?"Utilisez le bouton Menu pour accéder rapidement à vos documents, à la personnalisation, au QR Code invités, aux accès photos, aux galeries et à l’assistance.":"Utilisez le bouton Menu pour accéder rapidement aux photos, à la galerie de l’événement et à l’assistance."}</p>\n    </section>}\n\n    {organizer&&portalTab==="personalization"&&<LP28PersonalizationCatalog token={token} permissions={portalPermissions}/>} `;
replaceOnce(roleAndCatalog,tabsUi,'navigation et onglet personnalisation');

replaceOnce('{organizer&&(portalPermissions.organizerContract!==false||portalPermissions.organizerDocuments!==false)&&(','{organizer&&portalTab==="documents"&&(portalPermissions.organizerContract!==false||portalPermissions.organizerDocuments!==false)&&(','onglet documents');
replaceOnce('{organizer&&portalPermissions.organizerShare!==false&&guestShare&&(','{organizer&&portalTab==="qr"&&portalPermissions.organizerShare!==false&&guestShare&&(','onglet QR invités');
const photoActionsStart='    <div className="portal-photo-actions">';
replaceOnce(photoActionsStart,'    {portalTab==="photos"&&<>\n'+photoActionsStart,'début onglet photobooth');
const photoActionsEnd='    {organizer&&<div className="portal-note" style={{marginTop:8}}>Les deux accès sont ouverts par défaut. Le verrouillage concerne uniquement les invités ; votre accès organisateur reste disponible.</div>}';
replaceOnce(photoActionsEnd,photoActionsEnd+'\n    </>}','fin onglet photobooth');
if(app.includes('{canQrGallery&&<section className="portal-section" id="photos-partagees">')){
  replaceOnce('{canQrGallery&&<section className="portal-section" id="photos-partagees">','{portalTab==="gallery"&&canQrGallery&&<section className="portal-section" id="photos-partagees">','onglet galerie QR');
}else{
  replaceOnce('{(organizer||(portalPermissions.guestGallery!==false&&guestQrGalleryOpen))&&<section className="portal-section" id="photos-partagees">','{portalTab==="gallery"&&(organizer||(portalPermissions.guestGallery!==false&&guestQrGalleryOpen))&&<section className="portal-section" id="photos-partagees">','onglet galerie QR');
}
replaceOnce('{support.googleReviewUrl&&<a className="portal-action" href={support.googleReviewUrl} target="_blank" rel="noreferrer">⭐ Donner un avis Google</a>}','{portalTab==="home"&&support.googleReviewUrl&&<a className="portal-action" href={support.googleReviewUrl} target="_blank" rel="noreferrer">⭐ Donner un avis Google</a>}','avis Google sur accueil');
replaceOnce('{canPortalMathis&&<section className="portal-section">','{portalTab==="support"&&canPortalMathis&&<section className="portal-section">','onglet assistance Mathis');

fs.writeFileSync(appPath,app,'utf8');
console.log(`[portal-tabs] OK : ${changes} modification(s) appliquée(s)`);
