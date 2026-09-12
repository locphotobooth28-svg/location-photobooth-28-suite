const fs=require("fs");

const appPath="client/src/App.jsx";
const serverPath="server.js";

let app=fs.readFileSync(appPath,"utf8");

const start=app.indexOf("function LP28PersonalizationCatalog(");
const end=app.indexOf("function PortalPage({token}){");

if(start<0||end<0||end<=start){
  throw new Error("[personalization-widget] composant LP28PersonalizationCatalog introuvable");
}

const component=`function LP28PersonalizationCatalog({token,permissions={}}){
  const access=permissions.personalizationAccess===true;
  const templatesAllowed=access && permissions.personalizationTemplatesBooth!==false;
  const boothWidgetAllowed=access && permissions.personalizationBoothWidget!==false;
  const [view,setView]=useState("");

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
        <iframe
          id="tb-widget-embed-7a50d83a1e"
          title="Catalogue TemplatesBooth Location Photobooth 28"
          srcDoc="Loading..."
          onLoad={e=>e.currentTarget.removeAttribute("srcdoc")}
          src="https://templatesbooth.com/widget-embed/?key=NDc4MQ%3D%3D"
          scrolling="yes"
          width="100%"
          height="2200px"
          frameBorder="0"
          style={{width:"100%",minHeight:900,border:"none",borderRadius:14,background:"#fff"}}
        ></iframe>
      </div>}

      {view==="boothwidget"&&boothWidgetAllowed&&<div style={{marginTop:18,borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:18}}>
        <iframe title="Catalogue BoothWidget Location Photobooth 28" src="https://locphotobooth28.boothwidget.com" style={{width:"100%",height:"100vh",minHeight:650,border:"none",borderRadius:14,background:"#fff"}} scrolling="yes"></iframe>
      </div>}
    </div>
  </section>;
}

`;

app=app.slice(0,start)+component+app.slice(end);
fs.writeFileSync(appPath,app,"utf8");
console.log("[personalization-widget] OK: TemplatesBooth utilise désormais le widget officiel");

let server=fs.readFileSync(serverPath,"utf8");
const apiStart=server.indexOf("const LP28_TEMPLATES_CACHE=new Map();");
const apiEndMarker='app.post("/api/guest/:token/gallery-originals-visibility", async (req,res)=>{';
const apiEnd=server.indexOf(apiEndMarker);
if(apiStart>=0&&apiEnd>apiStart){
  server=server.slice(0,apiStart)+server.slice(apiEnd);
  fs.writeFileSync(serverPath,server,"utf8");
  console.log("[personalization-widget] OK: proxy API TemplatesBooth retiré");
}else{
  console.log("[personalization-widget] INFO: aucun proxy API TemplatesBooth à retirer");
}
