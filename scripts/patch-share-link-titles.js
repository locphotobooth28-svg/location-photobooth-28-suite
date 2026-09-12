const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'server.js');
let src=fs.readFileSync(file,'utf8');
const anchor='app.use(express.static(distDir));\napp.get("*", (req, res) => {';
if(!src.includes(anchor)){console.error('[share-link-titles] server fallback anchor missing');process.exit(1);}
const block=`app.use(express.static(distDir));

// LP28 — titres dédiés pour les aperçus WhatsApp / Messenger / SMS.
// Les routes SPA restent inchangées : seul le HTML initial reçoit les métadonnées adaptées.
app.get(["/signature/:token","/portal/:token","/guest/:token"], (req,res,next)=>{
  try{
    const indexPath=path.join(distDir,"index.html");
    if(!fs.existsSync(indexPath))return next();
    const pathname=String(req.path||"");
    let title="Location Photobooth 28";
    let description="Application Location Photobooth 28";
    if(pathname.startsWith("/signature/")){
      title="Location Photobooth 28 – Signature du contrat";
      description="Consultez et signez votre contrat Location Photobooth 28.";
    }else if(pathname.startsWith("/portal/")){
      title="Location Photobooth 28 – Espace Organisateur";
      description="Accédez à votre espace Organisateur Location Photobooth 28.";
    }else if(pathname.startsWith("/guest/")){
      title="Location Photobooth 28 – Espace Invités";
      description="Accédez à l’espace Invités Location Photobooth 28 et aux souvenirs de l’événement.";
    }
    const esc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const absoluteUrl=(req.protocol+"://"+req.get("host")+req.originalUrl);
    let html=fs.readFileSync(indexPath,"utf8");
    html=html.replace(/<title>[\\s\\S]*?<\\/title>/i,"<title>"+esc(title)+"</title>");
    html=html.replace("</head>",
      '<meta name="description" content="'+esc(description)+'" />'+
      '<meta property="og:type" content="website" />'+
      '<meta property="og:site_name" content="Location Photobooth 28" />'+
      '<meta property="og:title" content="'+esc(title)+'" />'+
      '<meta property="og:description" content="'+esc(description)+'" />'+
      '<meta property="og:url" content="'+esc(absoluteUrl)+'" />'+
      '<meta property="og:image" content="'+esc(req.protocol+"://"+req.get("host")+"/icons/lp28-192.png")+'" />'+
      '<meta name="twitter:card" content="summary" />'+
      '<meta name="twitter:title" content="'+esc(title)+'" />'+
      '<meta name="twitter:description" content="'+esc(description)+'" />'+
      '</head>');
    res.type("html").set("Cache-Control","no-cache").send(html);
  }catch(err){
    console.error("Aperçu lien LP28 :",err.message);
    next();
  }
});

app.get("*", (req, res) => {`;
src=src.replace(anchor,block);
fs.writeFileSync(file,src,'utf8');
console.log('[share-link-titles] OK: Signature / Organisateur / Invités identified in social previews');
