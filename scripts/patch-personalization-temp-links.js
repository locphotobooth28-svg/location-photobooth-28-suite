const fs=require("fs");

const appPath="client/src/App.jsx";
const serverPath="server.js";

function replaceOnce(source,from,to,label){
  if(!source.includes(from))throw new Error(`[personalization-temp-links] ${label}: bloc introuvable`);
  return source.replace(from,to);
}

let app=fs.readFileSync(appPath,"utf8");

const start=app.indexOf("function LP28PersonalizationCatalog(");
const end=app.indexOf("function PortalPage({token}){");
if(start<0||end<0||end<=start)throw new Error("[personalization-temp-links] composant catalogue introuvable");

const component=`function LP28PersonalizationCatalog({token,permissions={}}){
  const access=permissions.personalizationAccess===true;
  const templatesAllowed=access && permissions.personalizationTemplatesBooth!==false;
  const boothWidgetAllowed=access && permissions.personalizationBoothWidget!==false;
  const [view,setView]=useState("");
  const [copyState,setCopyState]=useState({templates:"",boothwidget:""});

  async function copyTemporaryLink(catalog){
    setCopyState(s=>({...s,[catalog]:"Création du lien…"}));
    try{
      const r=await fetch("/api/guest/"+encodeURIComponent(token)+"/personalization-link/"+catalog,{method:"POST"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||"Impossible de créer le lien temporaire.");
      const text=d.url;
      if(navigator.clipboard&&navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }else{
        const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
      }
      setCopyState(s=>({...s,[catalog]:d.activated&&d.expiresAt?"✅ Lien copié · actif jusqu’au "+new Date(d.expiresAt).toLocaleDateString("fr-FR"):"✅ Lien copié · 7 jours à partir du 1er clic"}));
    }catch(err){setCopyState(s=>({...s,[catalog]:"⚠️ "+(err.message||"Lien indisponible")}));}
  }

  useEffect(()=>{
    if(!templatesAllowed)return;
    const allowedOrigin="https://templatesbooth.com";
    function onTemplatesBoothMessage(event){
      const iframe=document.getElementById("tb-widget-embed-7a50d83a1e");
      if(!iframe||event.source!==iframe.contentWindow)return;
      if(event.origin!==allowedOrigin)return;
      const data=event.data||{};
      if(data.type!=="TB_WIDGET_REDIRECT"||!data.url)return;
      window.location.href=data.url;
    }
    window.addEventListener("message",onTemplatesBoothMessage);
    return()=>window.removeEventListener("message",onTemplatesBoothMessage);
  },[templatesAllowed]);

  const examples=[
    ["/personalization-examples/guillaume.svg","Exemple – Anniversaire"],
    ["/personalization-examples/birthday18.svg","Exemple – Anniversaire"],
    ["/personalization-examples/bandelette.svg","Exemple – Personnalisé"]
  ];

  const buttonBox={display:"flex",flexDirection:"column",gap:7,alignItems:"stretch",minWidth:260};
  const copyStyle={fontSize:12,padding:"8px 10px",opacity:.92};

  return <section className="portal-section" style={{marginTop:22}}>
    <div className="portal-document-card" style={{padding:20,overflow:"hidden"}}>
      <div style={{display:"flex",gap:14,alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 520px"}}>
          <div className="eyebrow">PERSONNALISATION PHOTO</div>
          <h2 style={{margin:"4px 0 8px"}}>🎨 Personnalisez votre photobooth</h2>
          <p style={{margin:"0 0 8px",lineHeight:1.55}}>Envie d’un cadre photo qui correspond parfaitement à votre événement ? Découvrez nos catalogues de personnalisation avec des milliers de modèles pour votre mariage, anniversaire, soirée ou événement professionnel. 📸✨</p>
        </div>
        <div style={{flex:"0 1 300px",padding:"14px 16px",borderRadius:16,border:"1px solid rgba(214,185,79,.35)",background:"rgba(214,185,79,.08)"}}>
          <strong>🏷️ Accès aux catalogues de personnalisation</strong>
          <div style={{fontSize:34,fontWeight:950,margin:"6px 0"}}>25 €</div>
          <div className="muted">Pour obtenir l’accès, merci de valider l’option directement avec <strong>Johan – Location Photobooth 28</strong>.</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,alignItems:"end",marginTop:18}}>
        {examples.map(([src,label])=><figure key={src} style={{margin:0,textAlign:"center"}}>
          <div style={{background:"#fff",borderRadius:14,padding:8,boxShadow:"0 8px 24px rgba(0,0,0,.15)",minHeight:190,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img src={src} alt={label} style={{maxWidth:"100%",maxHeight:310,objectFit:"contain",borderRadius:8}}/>
          </div>
          <figcaption style={{marginTop:8,fontWeight:800}}>{label}</figcaption>
        </figure>)}
      </div>

      <div style={{marginTop:18,padding:"14px 16px",borderRadius:14,border:access?"1px solid rgba(34,197,94,.35)":"1px solid rgba(96,165,250,.35)",background:access?"rgba(34,197,94,.08)":"rgba(59,130,246,.08)"}}>
        <strong>{access?"✅ Accès aux catalogues activé":"🔒 Accès aux catalogues non activé"}</strong>
        {!access&&<p className="muted" style={{margin:"6px 0 0"}}>Si vous souhaitez accéder à nos catalogues de personnalisation, merci de valider l’option avec Johan (25 € l’accès).</p>}
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
        <div style={buttonBox}>
          <button type="button" className={templatesAllowed?"portal-action primary":"portal-action disabled"} disabled={!templatesAllowed} onClick={()=>setView(view==="templates"?"":"templates")}>🎨 Catalogue TemplatesBooth</button>
          <button type="button" disabled={!templatesAllowed} onClick={()=>copyTemporaryLink("templates")} style={copyStyle}>🔗 Copier le lien pour tablette / PC</button>
          {copyState.templates&&<small className="muted">{copyState.templates}</small>}
        </div>
        <div style={buttonBox}>
          <button type="button" className={boothWidgetAllowed?"portal-action primary":"portal-action disabled"} disabled={!boothWidgetAllowed} onClick={()=>setView(view==="boothwidget"?"":"boothwidget")}>🖼️ Catalogue BoothWidget</button>
          <button type="button" disabled={!boothWidgetAllowed} onClick={()=>copyTemporaryLink("boothwidget")} style={copyStyle}>🔗 Copier le lien pour tablette / PC</button>
          {copyState.boothwidget&&<small className="muted">{copyState.boothwidget}</small>}
        </div>
      </div>

      {view==="templates"&&templatesAllowed&&<div style={{marginTop:18,borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:18}}>
        <iframe id="tb-widget-embed-7a50d83a1e" title="Catalogue TemplatesBooth Location Photobooth 28" srcDoc="Loading..." onLoad={e=>e.currentTarget.removeAttribute("srcdoc")} src="https://templatesbooth.com/widget-embed/?key=NDc4MQ%3D%3D" scrolling="yes" width="100%" height="2200px" frameBorder="0" style={{width:"100%",minHeight:900,border:"none",borderRadius:14,background:"#fff"}}></iframe>
      </div>}

      {view==="boothwidget"&&boothWidgetAllowed&&<div style={{marginTop:18,borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:18}}>
        <iframe title="Catalogue BoothWidget Location Photobooth 28" src="https://locphotobooth28.boothwidget.com" style={{width:"100%",height:"100vh",minHeight:650,border:"none",borderRadius:14,background:"#fff"}} scrolling="yes"></iframe>
      </div>}
    </div>
  </section>;
}

`;
app=app.slice(0,start)+component+app.slice(end);

const eventMarker='function EventForm({event,onClose,onSaved}) {\n  const [form,setForm]=useState(event ? JSON.parse(JSON.stringify(event)) : JSON.parse(JSON.stringify(EMPTY_EVENT)));\n  const [busy,setBusy]=useState(false);';
if(app.includes(eventMarker)&&!app.includes("renewPersonalizationLink(catalog)")){
  app=replaceOnce(app,eventMarker,eventMarker+'\n  const [personalizationRenewMsg,setPersonalizationRenewMsg]=useState("");\n  async function renewPersonalizationLink(catalog){\n    if(!form?.id){setPersonalizationRenewMsg("Enregistre d’abord l’événement.");return;}\n    setPersonalizationRenewMsg("Renouvellement…");\n    try{\n      const r=await fetch("/api/events/"+encodeURIComponent(form.id)+"/personalization-renew/"+catalog,{method:"POST"});\n      const d=await r.json().catch(()=>({}));\n      if(!r.ok)throw new Error(d.message||"Renouvellement impossible.");\n      setPersonalizationRenewMsg("✅ Nouveau jeton créé. Les anciens liens de ce catalogue sont invalidés.");\n    }catch(err){setPersonalizationRenewMsg("⚠️ "+(err.message||"Renouvellement impossible."));}\n  }',"fonction renouvellement Admin");
}

if(!app.includes("Nouveau jeton TemplatesBooth")){
  const adminNeedle='<label className="switch-line"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationBoothWidget!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationBoothWidget:e.target.checked}))}/> Catalogue BoothWidget</label>';
  const adminExtra=adminNeedle+'\n              <div style={{gridColumn:"1 / -1",display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>\n                <button type="button" disabled={!form?.id||portalPermissions.personalizationAccess!==true} onClick={()=>renewPersonalizationLink("templates")}>🔄 Nouveau jeton TemplatesBooth</button>\n                <button type="button" disabled={!form?.id||portalPermissions.personalizationAccess!==true} onClick={()=>renewPersonalizationLink("boothwidget")}>🔄 Nouveau jeton BoothWidget</button>\n                {personalizationRenewMsg&&<span className="muted" style={{alignSelf:"center"}}>{personalizationRenewMsg}</span>}\n              </div>';
  app=replaceOnce(app,adminNeedle,adminExtra,"boutons renouvellement Admin");
}

fs.writeFileSync(appPath,app,"utf8");
console.log("[personalization-temp-links] OK: boutons copie + renouvellement Admin");

let server=fs.readFileSync(serverPath,"utf8");
if(!server.includes("LP28_PERSONALIZATION_LINKS_V1")){
  const marker='app.post("/api/guest/:token/gallery-originals-visibility", async (req,res)=>{';
  const block=`
// LP28_PERSONALIZATION_LINKS_V1
function lp28PersonalizationSecret(){return String(process.env.SESSION_SECRET||process.env.ADMIN_PASSWORD||"lp28-personalization");}
function lp28EncodePersonalizationToken(payload){
  const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig=crypto.createHmac("sha256",lp28PersonalizationSecret()).update(body).digest("base64url");
  return body+"."+sig;
}
function lp28DecodePersonalizationToken(token){
  try{
    const parts=String(token||"").split(".");if(parts.length!==2)return null;
    const expected=crypto.createHmac("sha256",lp28PersonalizationSecret()).update(parts[0]).digest("base64url");
    const a=Buffer.from(parts[1]),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
    const p=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
    if(!p?.eventId||!["templates","boothwidget"].includes(p.catalog)||!p.nonce)return null;
    return p;
  }catch{return null;}
}
function lp28Prep(event){let prep=event?.preparation;if(typeof prep==="string"){try{prep=JSON.parse(prep)}catch{prep={}}}return prep&&typeof prep==="object"&&!Array.isArray(prep)?prep:{};}
function lp28PersonalizationPermission(prep,catalog){
  const p=prep?.portalPermissions&&typeof prep.portalPermissions==="object"?prep.portalPermissions:{};
  if(p.personalizationAccess!==true)return false;
  if(catalog==="templates"&&p.personalizationTemplatesBooth===false)return false;
  if(catalog==="boothwidget"&&p.personalizationBoothWidget===false)return false;
  return true;
}
function lp28CatalogLabel(catalog){return catalog==="templates"?"TemplatesBooth":"BoothWidget";}
function lp28CatalogUrl(catalog){return catalog==="templates"?"https://templatesbooth.com/widget-embed/?key=NDc4MQ%3D%3D":"https://locphotobooth28.boothwidget.com";}
function lp28HtmlPage(title,body){return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{margin:0;background:#0b0b0d;color:#f7f7f7;font-family:Arial,sans-serif}.wrap{max-width:1100px;margin:auto;padding:24px}.card{background:#151518;border:1px solid #343438;border-radius:18px;padding:24px}.gold{color:#e6c84f}button{background:#e6c84f;color:#111;border:0;border-radius:12px;padding:13px 18px;font-weight:800;font-size:16px;cursor:pointer}.muted{color:#bbb;line-height:1.55}iframe{width:100%;border:0;background:#fff;border-radius:14px}</style></head><body><div class="wrap">'+body+'</div></body></html>';}

app.post("/api/guest/:token/personalization-link/:catalog",async(req,res)=>{
  try{
    const catalog=String(req.params.catalog||"").toLowerCase();
    if(!["templates","boothwidget"].includes(catalog))return res.status(400).json({ok:false,message:"Catalogue inconnu."});
    const access=await portalAccess(req.params.token);
    if(!access?.event||access.role!=="ORGANIZER"||!access.event.portalEnabled)return res.status(403).json({ok:false,message:"Accès réservé à l’organisateur."});
    const prep=lp28Prep(access.event);
    if(!lp28PersonalizationPermission(prep,catalog))return res.status(403).json({ok:false,message:"L’accès au catalogue n’a pas été validé par Johan."});
    prep.personalizationLinks=prep.personalizationLinks&&typeof prep.personalizationLinks==="object"?prep.personalizationLinks:{};
    let state=prep.personalizationLinks[catalog];
    if(!state||!state.nonce){
      state={nonce:randomToken(18),createdAt:new Date().toISOString(),firstUsedAt:null,expiresAt:null};
      prep.personalizationLinks[catalog]=state;
      await prisma.event.update({where:{id:access.event.id},data:{preparation:prep}});
    }
    if(state.expiresAt&&Date.now()>=new Date(state.expiresAt).getTime())return res.status(410).json({ok:false,message:"Ce lien a expiré. Merci de demander son renouvellement à Location Photobooth 28."});
    const signed=lp28EncodePersonalizationToken({eventId:access.event.id,catalog,nonce:state.nonce});
    const url=req.protocol+"://"+req.get("host")+"/personalization/"+encodeURIComponent(signed);
    res.json({ok:true,url,activated:Boolean(state.firstUsedAt),firstUsedAt:state.firstUsedAt||null,expiresAt:state.expiresAt||null});
  }catch(err){console.error("Lien personnalisation :",err);res.status(500).json({ok:false,message:"Impossible de créer le lien temporaire."});}
});

app.post("/api/events/:id/personalization-renew/:catalog",adminOnly,async(req,res)=>{
  try{
    const catalog=String(req.params.catalog||"").toLowerCase();
    if(!["templates","boothwidget"].includes(catalog))return res.status(400).json({ok:false,message:"Catalogue inconnu."});
    const event=await prisma.event.findUnique({where:{id:req.params.id}});if(!event)return res.status(404).json({ok:false,message:"Événement introuvable."});
    const prep=lp28Prep(event);prep.personalizationLinks=prep.personalizationLinks&&typeof prep.personalizationLinks==="object"?prep.personalizationLinks:{};
    prep.personalizationLinks[catalog]={nonce:randomToken(18),createdAt:new Date().toISOString(),firstUsedAt:null,expiresAt:null};
    await prisma.event.update({where:{id:event.id},data:{preparation:prep}});
    res.json({ok:true,message:"Nouveau jeton créé.",catalog});
  }catch(err){console.error("Renouvellement personnalisation :",err);res.status(500).json({ok:false,message:"Renouvellement impossible."});}
});

app.post("/api/personalization/:signed/activate",async(req,res)=>{
  try{
    const payload=lp28DecodePersonalizationToken(req.params.signed);if(!payload)return res.status(403).json({ok:false,message:"Lien invalide."});
    const event=await prisma.event.findUnique({where:{id:payload.eventId}});if(!event)return res.status(404).json({ok:false,message:"Événement introuvable."});
    const prep=lp28Prep(event);if(!lp28PersonalizationPermission(prep,payload.catalog))return res.status(403).json({ok:false,message:"Accès désactivé."});
    const state=prep?.personalizationLinks?.[payload.catalog];if(!state||state.nonce!==payload.nonce)return res.status(403).json({ok:false,message:"Ce lien a été remplacé. Merci d’utiliser le nouveau lien."});
    if(state.expiresAt&&Date.now()>=new Date(state.expiresAt).getTime())return res.status(410).json({ok:false,message:"Ce lien a expiré. Merci de demander son renouvellement."});
    if(!state.firstUsedAt){
      const now=new Date(),expires=new Date(now.getTime()+7*24*60*60*1000);state.firstUsedAt=now.toISOString();state.expiresAt=expires.toISOString();
      prep.personalizationLinks[payload.catalog]=state;await prisma.event.update({where:{id:event.id},data:{preparation:prep}});
    }
    res.json({ok:true,expiresAt:state.expiresAt});
  }catch(err){console.error("Activation personnalisation :",err);res.status(500).json({ok:false,message:"Activation impossible."});}
});

app.get("/personalization/:signed",async(req,res)=>{
  try{
    res.setHeader("Cache-Control","no-store");
    const payload=lp28DecodePersonalizationToken(req.params.signed);
    if(!payload)return res.status(403).send(lp28HtmlPage("Lien invalide",'<div class="card"><h1>🔒 Lien invalide</h1><p class="muted">Ce lien de personnalisation n’est plus valide.</p></div>'));
    const event=await prisma.event.findUnique({where:{id:payload.eventId}});if(!event)return res.status(404).send(lp28HtmlPage("Lien introuvable",'<div class="card"><h1>🔒 Lien introuvable</h1></div>'));
    const prep=lp28Prep(event);if(!lp28PersonalizationPermission(prep,payload.catalog))return res.status(403).send(lp28HtmlPage("Accès désactivé",'<div class="card"><h1>🔒 Accès désactivé</h1><p class="muted">Merci de contacter Location Photobooth 28.</p></div>'));
    const state=prep?.personalizationLinks?.[payload.catalog];if(!state||state.nonce!==payload.nonce)return res.status(403).send(lp28HtmlPage("Lien remplacé",'<div class="card"><h1>🔒 Ce lien a été remplacé</h1><p class="muted">Merci d’utiliser le nouveau lien transmis par Location Photobooth 28.</p></div>'));
    if(state.expiresAt&&Date.now()>=new Date(state.expiresAt).getTime())return res.status(410).send(lp28HtmlPage("Lien expiré",'<div class="card"><h1>⏳ Accès expiré</h1><p class="muted">Votre accès de 7 jours est terminé. En cas de besoin, merci de demander le renouvellement à Location Photobooth 28.</p></div>'));
    if(!state.firstUsedAt){
      const safeToken=JSON.stringify(String(req.params.signed));
      const body='<div class="card"><div class="gold">LOCATION PHOTOBOOTH 28</div><h1>🔐 Activation de votre accès '+lp28CatalogLabel(payload.catalog)+'</h1><p class="muted">À partir de votre première activation, votre accès au catalogue sera valable pendant <strong>7 jours</strong>. En cas de besoin après ce délai, merci de demander le renouvellement de votre accès à Location Photobooth 28.</p><button id="activate">Activer mon accès pendant 7 jours</button><p id="msg" class="muted"></p></div><script>document.getElementById("activate").onclick=async function(){this.disabled=true;document.getElementById("msg").textContent="Activation…";try{var r=await fetch("/api/personalization/"+encodeURIComponent('+safeToken+')+"/activate",{method:"POST"});var d=await r.json();if(!r.ok)throw new Error(d.message||"Activation impossible");location.reload();}catch(e){document.getElementById("msg").textContent=e.message;this.disabled=false;}};</script>';
      return res.send(lp28HtmlPage("Activation catalogue",body));
    }
    const expiresText=new Date(state.expiresAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
    let extra='';
    if(payload.catalog==="templates")extra='<script>window.addEventListener("message",function(event){var iframe=document.getElementById("tbtemp");if(!iframe||event.source!==iframe.contentWindow)return;if(event.origin!=="https://templatesbooth.com")return;var data=event.data||{};if(data.type!=="TB_WIDGET_REDIRECT"||!data.url)return;window.location.href=data.url;});</script>';
    const body='<div class="card" style="margin-bottom:16px"><div class="gold">LOCATION PHOTOBOOTH 28</div><h2>🎨 '+lp28CatalogLabel(payload.catalog)+'</h2><p class="muted">Votre accès temporaire est actif jusqu’au <strong>'+expiresText+'</strong>.</p></div><iframe id="'+(payload.catalog==="templates"?'tbtemp':'bwtemp')+'" src="'+lp28CatalogUrl(payload.catalog)+'" scrolling="yes" style="height:'+(payload.catalog==="templates"?'2200px':'100vh')+';min-height:650px"></iframe>'+extra;
    return res.send(lp28HtmlPage("Catalogue "+lp28CatalogLabel(payload.catalog),body));
  }catch(err){console.error("Affichage personnalisation :",err);return res.status(500).send(lp28HtmlPage("Erreur",'<div class="card"><h1>Erreur</h1><p class="muted">Impossible d’ouvrir ce catalogue.</p></div>'));}
});

`;
  server=replaceOnce(server,marker,block+marker,"routes liens temporaires");
}

fs.writeFileSync(serverPath,server,"utf8");
console.log("[personalization-temp-links] OK: jetons temporaires 7 jours + renouvellement");
