const fs=require("fs");

const appPath="client/src/App.jsx";
let app=fs.readFileSync(appPath,"utf8");

function once(from,to,label){
  if(!app.includes(from)) throw new Error(`[portal-admin-design] ${label}: bloc introuvable`);
  app=app.replace(from,to);
}

if(!app.includes("LP28_PORTAL_ADMIN_DESIGN_V1")){
  const style=`
<style>{\`
/* LP28_PORTAL_ADMIN_DESIGN_V1 */
.lp28-portal-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-bottom:14px}.lp28-portal-info,.lp28-portal-tip{border-radius:14px;padding:14px 16px;border:1px solid rgba(74,144,226,.35);background:linear-gradient(145deg,rgba(31,68,123,.22),rgba(13,22,37,.7));box-shadow:0 8px 24px rgba(0,0,0,.14)}.lp28-portal-tip{border-color:rgba(230,190,70,.35);background:linear-gradient(145deg,rgba(92,72,18,.18),rgba(13,22,37,.7))}.lp28-portal-info strong,.lp28-portal-tip strong{display:block;font-size:14px;margin-bottom:5px}.lp28-portal-info p,.lp28-portal-tip p{margin:0;color:#b8c0cc;font-size:12px;line-height:1.5}
.lp28-portal-pro{padding:18px!important;border:1px solid rgba(79,120,190,.28)!important;border-radius:16px!important;background:linear-gradient(180deg,rgba(15,28,47,.88),rgba(10,17,29,.92))!important;box-shadow:0 16px 38px rgba(0,0,0,.18)}.lp28-portal-pro>.lp28-portal-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}.lp28-portal-pro>.lp28-portal-title strong{font-size:16px}.lp28-portal-status{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.35);color:#7ce7bb}.lp28-portal-status.off{background:rgba(148,163,184,.10);border-color:rgba(148,163,184,.25);color:#b9c2ce}
.lp28-portal-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin-top:0!important}.lp28-portal-grid .switch-line{position:relative;display:flex!important;align-items:center!important;gap:12px!important;min-height:70px;padding:13px 14px!important;margin:0!important;border:1px solid rgba(82,128,199,.28);border-radius:14px;background:linear-gradient(145deg,rgba(24,45,73,.72),rgba(12,22,37,.78));font-weight:800;transition:.18s ease;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}.lp28-portal-grid .switch-line:hover{border-color:rgba(91,155,255,.58);transform:translateY(-1px)}.lp28-portal-grid .switch-line input[type="checkbox"]{width:24px!important;height:24px!important;min-width:24px;accent-color:#2f8cff;margin:0!important}.lp28-portal-grid .switch-line:has(input:checked){border-color:rgba(47,140,255,.45);background:linear-gradient(145deg,rgba(31,69,116,.78),rgba(13,27,47,.84))}.lp28-portal-grid .switch-line:has(input:disabled){opacity:.58}
.lp28-personal-master{grid-column:1/-1!important;min-height:auto!important;border-color:rgba(178,70,255,.55)!important;background:linear-gradient(135deg,rgba(99,39,143,.23),rgba(18,24,45,.88))!important}.lp28-personal-master strong{font-size:14px}.lp28-catalog-card{border-color:rgba(170,76,255,.30)!important}.lp28-catalog-card:has(input:checked){border-color:rgba(178,70,255,.62)!important;background:linear-gradient(145deg,rgba(77,35,117,.32),rgba(17,27,47,.9))!important}.lp28-catalog-card:nth-of-type(even):has(input:checked){border-color:rgba(0,155,255,.58)!important;background:linear-gradient(145deg,rgba(21,67,107,.36),rgba(17,27,47,.9))!important}
.lp28-token-row{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin-top:2px!important}.lp28-token-row button{min-height:42px;border-radius:11px!important;font-weight:800!important;border:1px solid rgba(158,84,255,.42)!important;background:linear-gradient(135deg,rgba(116,42,190,.34),rgba(30,54,95,.42))!important}.lp28-token-row button:hover:not(:disabled){border-color:rgba(183,105,255,.8)!important;transform:translateY(-1px)}.lp28-token-row .muted{grid-column:1/-1;font-size:12px}
@media(max-width:760px){.lp28-portal-intro{grid-template-columns:1fr}.lp28-portal-grid{grid-template-columns:1fr!important}.lp28-personal-master,.lp28-token-row{grid-column:1!important}.lp28-token-row{grid-template-columns:1fr!important}.lp28-portal-pro{padding:14px!important}}
\`}</style>
`;
  const anchor='function EventForm({event,onClose,onSaved}) {';
  if(!app.includes(anchor)) throw new Error("[portal-admin-design] EventForm introuvable");
  app=app.replace(anchor,style+'\n'+anchor);
}

const oldOpen='<div className="wide" style={{padding:"12px",border:"1px solid rgba(214,185,79,.25)",borderRadius:12}}><strong>🔐 Visibilité des portails</strong><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:8,marginTop:10}}>';
if(app.includes(oldOpen)){
  const newOpen='<div className="wide lp28-portal-intro"><div className="lp28-portal-info"><strong>ℹ️ Information</strong><p>Cochez les éléments que l’organisateur pourra voir et utiliser sur son portail événement.</p></div><div className="lp28-portal-tip"><strong>💡 Bon à savoir</strong><p>Vous pouvez modifier ces accès à tout moment et renouveler les jetons de catalogue si nécessaire.</p></div></div><div className="wide lp28-portal-pro"><div className="lp28-portal-title"><strong>🔐 Visibilité des portails</strong><span className={form.portalEnabled?"lp28-portal-status":"lp28-portal-status off"}>{form.portalEnabled?"● Activé":"● Désactivé"}</span></div><div className="lp28-portal-grid">';
  app=app.replace(oldOpen,newOpen);
}

const repl=[
['<label className="switch-line" style={{border:"1px solid rgba(214,185,79,.35)",borderRadius:10,padding:"10px 12px"}}><input type="checkbox" checked={portalPermissions.personalizationAccess===true}','<label className="switch-line lp28-personal-master"><input type="checkbox" checked={portalPermissions.personalizationAccess===true}'],
['<label className="switch-line"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationTemplatesBooth!==false}','<label className="switch-line lp28-catalog-card"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationTemplatesBooth!==false}'],
['<label className="switch-line"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationBoothWidget!==false}','<label className="switch-line lp28-catalog-card"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationBoothWidget!==false}'],
['<div style={{gridColumn:"1 / -1",display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>','<div className="lp28-token-row">']
];
for(const [a,b] of repl){ if(app.includes(a)) app=app.replace(a,b); }

fs.writeFileSync(appPath,app,"utf8");
console.log("[portal-admin-design] OK: portail événement redesign professionnel");
