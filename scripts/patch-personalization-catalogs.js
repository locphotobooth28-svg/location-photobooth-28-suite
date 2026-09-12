const fs=require("fs");

const appPath="client/src/App.jsx";
const serverPath="server.js";

function replaceOnce(source,from,to,label){
  if(!source.includes(from)){
    throw new Error(`[personalization-catalogs] ${label}: bloc introuvable`);
  }
  return source.replace(from,to);
}

let app=fs.readFileSync(appPath,"utf8");

if(!app.includes("personalizationAccess:saved.personalizationAccess")){
  app=replaceOnce(
    app,
    'return {organizerContract:saved.organizerContract!==false,organizerDocuments:saved.organizerDocuments!==false,organizerShare:saved.organizerShare!==false,organizerMathis:saved.organizerMathis!==false,guestGallery:saved.guestGallery!==false,guestMathis:saved.guestMathis!==false};',
    'return {organizerContract:saved.organizerContract!==false,organizerDocuments:saved.organizerDocuments!==false,organizerShare:saved.organizerShare!==false,organizerMathis:saved.organizerMathis!==false,guestGallery:saved.guestGallery!==false,guestMathis:saved.guestMathis!==false,personalizationAccess:saved.personalizationAccess===true,personalizationTemplatesBooth:saved.personalizationTemplatesBooth!==false,personalizationBoothWidget:saved.personalizationBoothWidget!==false};',
    "état des permissions portail"
  );
}

if(!app.includes("Organisateur : catalogues personnalisation")){
  const adminMarker='<label className="switch-line"><input type="checkbox" checked={portalPermissions.organizerMathis} onChange={e=>setPortalPermissions(p=>({...p,organizerMathis:e.target.checked}))}/> Organisateur : assistance Mathis</label>';
  const adminBlock=adminMarker+'\n              <label className="switch-line" style={{border:"1px solid rgba(214,185,79,.35)",borderRadius:10,padding:"10px 12px"}}><input type="checkbox" checked={portalPermissions.personalizationAccess===true} onChange={e=>setPortalPermissions(p=>({...p,personalizationAccess:e.target.checked}))}/> <strong>Organisateur : catalogues personnalisation (25 €)</strong></label>\n              <label className="switch-line"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationTemplatesBooth!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationTemplatesBooth:e.target.checked}))}/> Catalogue TemplatesBooth</label>\n              <label className="switch-line"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationBoothWidget!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationBoothWidget:e.target.checked}))}/> Catalogue BoothWidget</label>';
  app=replaceOnce(app,adminMarker,adminBlock,"commandes Admin des catalogues");
}

if(!app.includes("function LP28PersonalizationCatalog")){
  const component=`
function LP28PersonalizationCatalog({token,permissions={}}){
  const access=permissions.personalizationAccess===true;
  const templatesAllowed=access && permissions.personalizationTemplatesBooth!==false;
  const boothWidgetAllowed=access && permissions.personalizationBoothWidget!==false;
  const [view,setView]=useState("");
  const [search,setSearch]=useState("");
  const [layout,setLayout]=useState("");
  const [page,setPage]=useState(1);
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [catalogError,setCatalogError]=useState("");

  async function loadTemplates(nextPage=1){
    if(!templatesAllowed)return;
    setLoading(true);setCatalogError("");
    try{
      const params=new URLSearchParams({page:String(nextPage),per_page:"24",type:"static"});
      if(search.trim())params.set("search",search.trim());
      if(layout)params.set("layout",layout);
      const r=await fetch("/api/guest/"+encodeURIComponent(token)+"/personalization/templates?"+params.toString());
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||"Catalogue TemplatesBooth indisponible.");
      setResult(d);setPage(Number(d.page||nextPage));
    }catch(err){setCatalogError(err.message||"Catalogue indisponible.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{
    if(view==="templates"&&templatesAllowed&&!result)loadTemplates(1);
  },[view,templatesAllowed]);

  const examples=[
    ["/personalization-examples/guillaume.svg","Exemple – Anniversaire"],
    ["/personalization-examples/birthday18.svg","Exemple – Anniversaire"],
    ["/personalization-examples/bandelette.svg","Exemple – Personnalisé"]
  ];

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
        <button type="button" className={templatesAllowed?"portal-action primary":"portal-action disabled"} disabled={!templatesAllowed} onClick={()=>setView(view==="templates"?"":"templates")}>🎨 Catalogue TemplatesBooth</button>
        <button type="button" className={boothWidgetAllowed?"portal-action primary":"portal-action disabled"} disabled={!boothWidgetAllowed} onClick={()=>setView(view==="boothwidget"?"":"boothwidget")}>🖼️ Catalogue BoothWidget</button>
      </div>

      {view==="templates"&&templatesAllowed&&<div style={{marginTop:18,borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:18}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"end"}}>
          <label style={{flex:"1 1 220px"}}>Recherche<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mariage, anniversaire, fleurs…"/></label>
          <label style={{flex:"0 1 220px"}}>Format<select value={layout} onChange={e=>setLayout(e.target.value)}><option value="">Tous les formats</option><option value="26strip">2×6 bandelette</option><option value="26horizontal">2×6 horizontal</option><option value="46postcard-p">4×6 portrait</option><option value="46postcard-l">4×6 paysage</option><option value="46postcard-h">4×6 half & half</option><option value="square">Carré</option></select></label>
          <button type="button" className="portal-action primary" onClick={()=>loadTemplates(1)} disabled={loading}>{loading?"Recherche…":"🔎 Rechercher"}</button>
        </div>
        {catalogError&&<div className="alert" style={{marginTop:12}}>{catalogError}</div>}
        {result&&<>
          <div className="muted" style={{margin:"12px 0"}}>{Number(result.total||0).toLocaleString("fr-FR")} modèle(s) disponible(s)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
            {(result.data||[]).map((item,index)=><a key={(item.post_url||"")+index} href={item.post_url||"#"} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",color:"inherit",border:"1px solid rgba(255,255,255,.12)",borderRadius:12,overflow:"hidden",background:"rgba(255,255,255,.035)"}}>
              {(item.src||item.poster)?<img src={item.src||item.poster} alt="Modèle TemplatesBooth" loading="lazy" style={{display:"block",width:"100%",aspectRatio:"4 / 5",objectFit:"cover",background:"#fff"}}/>:<div style={{aspectRatio:"4 / 5",display:"grid",placeItems:"center"}}>🎨</div>}
              <div style={{padding:9,fontSize:12,fontWeight:800}}>Voir le modèle ↗</div>
            </a>)}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:14}}>
            <button type="button" disabled={loading||page<=1} onClick={()=>loadTemplates(page-1)}>← Précédent</button>
            <span style={{alignSelf:"center"}}>Page {page} / {Math.max(Number(result.total_pages||1),1)}</span>
            <button type="button" disabled={loading||page>=Number(result.total_pages||1)} onClick={()=>loadTemplates(page+1)}>Suivant →</button>
          </div>
        </>}
      </div>}

      {view==="boothwidget"&&boothWidgetAllowed&&<div style={{marginTop:18,borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:18}}>
        <iframe title="Catalogue BoothWidget Location Photobooth 28" src="https://locphotobooth28.boothwidget.com" style={{width:"100%",height:"100vh",minHeight:650,border:"none",borderRadius:14,background:"#fff"}} scrolling="yes"></iframe>
      </div>}
    </div>
  </section>;
}
`;
  app=replaceOnce(app,"function PortalPage({token}){",component+"\nfunction PortalPage({token}){","composant catalogue organisateur");
}

if(!app.includes("<LP28PersonalizationCatalog token={token}")){
  app=replaceOnce(
    app,
    '    {organizer&&<div className="portal-role">🔐 Espace organisateur</div>}',
    '    {organizer&&<div className="portal-role">🔐 Espace organisateur</div>}\n    {organizer&&<LP28PersonalizationCatalog token={token} permissions={portalPermissions}/>} ',
    "affichage catalogue dans l’espace organisateur"
  );
}

fs.writeFileSync(appPath,app,"utf8");
console.log("[personalization-catalogs] OK: interface Admin + vitrine + TemplatesBooth + BoothWidget");

let server=fs.readFileSync(serverPath,"utf8");

if(!server.includes("personalizationAccess:savedPortal.personalizationAccess")){
  server=replaceOnce(
    server,
    'const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false};',
    'const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false,personalizationAccess:savedPortal.personalizationAccess===true,personalizationTemplatesBooth:savedPortal.personalizationTemplatesBooth!==false,personalizationBoothWidget:savedPortal.personalizationBoothWidget!==false};',
    "permissions catalogue côté serveur"
  );
}

if(!server.includes("LP28_TEMPLATES_CACHE")){
  const route=`
const LP28_TEMPLATES_CACHE=new Map();
app.get("/api/guest/:token/personalization/templates",async(req,res)=>{
  try{
    const access=await portalAccess(req.params.token);
    if(!access?.event || access.role!=="ORGANIZER" || !access.event.portalEnabled){
      return res.status(403).json({ok:false,message:"Accès réservé à l’organisateur."});
    }
    let prep=access.event.preparation;
    if(typeof prep==="string"){try{prep=JSON.parse(prep)}catch{prep={}}}
    const permissions=prep?.portalPermissions&&typeof prep.portalPermissions==="object"?prep.portalPermissions:{};
    if(permissions.personalizationAccess!==true || permissions.personalizationTemplatesBooth===false){
      return res.status(403).json({ok:false,message:"L’accès au catalogue de personnalisation n’a pas encore été validé par Johan."});
    }
    const apiKey=String(process.env.TEMPLATESBOOTH_API_KEY||"").trim();
    if(!apiKey){
      return res.status(503).json({ok:false,message:"Le catalogue TemplatesBooth est autorisé mais sa clé API n’est pas encore configurée sur LP28."});
    }
    const url=new URL("https://templatesbooth.com/wp-json/tb/v1/templates");
    const allow=["page","per_page","layout","image_type","no_of_images","tag","tags","search","type","text_display"];
    for(const key of allow){
      const value=String(req.query?.[key]??"").trim();
      if(value)url.searchParams.set(key,value.slice(0,180));
    }
    const perPage=Math.min(Math.max(Number(url.searchParams.get("per_page")||24),1),48);
    url.searchParams.set("per_page",String(perPage));
    if(!url.searchParams.get("type"))url.searchParams.set("type","static");
    const cacheKey=url.toString();
    const cached=LP28_TEMPLATES_CACHE.get(cacheKey);
    if(cached && Date.now()-cached.at<300000){
      res.setHeader("Cache-Control","private, max-age=120");
      return res.json(cached.data);
    }
    const upstream=await fetch(url,{headers:{"X-API-Key":apiKey,"Accept":"application/json"}});
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      const retryAfter=upstream.headers.get("retry-after");
      if(retryAfter)res.setHeader("Retry-After",retryAfter);
      return res.status(upstream.status).json({ok:false,message:data?.message||"TemplatesBooth est momentanément indisponible."});
    }
    LP28_TEMPLATES_CACHE.set(cacheKey,{at:Date.now(),data});
    if(LP28_TEMPLATES_CACHE.size>80){
      const first=LP28_TEMPLATES_CACHE.keys().next().value;
      LP28_TEMPLATES_CACHE.delete(first);
    }
    res.setHeader("Cache-Control","private, max-age=120");
    return res.json(data);
  }catch(err){
    console.error("Catalogue TemplatesBooth :",err);
    return res.status(500).json({ok:false,message:"Impossible de charger le catalogue TemplatesBooth."});
  }
});
`;
  server=replaceOnce(server,'app.post("/api/guest/:token/gallery-originals-visibility", async (req,res)=>{',route+'\napp.post("/api/guest/:token/gallery-originals-visibility", async (req,res)=>{',"proxy sécurisé TemplatesBooth");
}

fs.writeFileSync(serverPath,server,"utf8");
console.log("[personalization-catalogs] OK: proxy TemplatesBooth protégé par validation Admin");
