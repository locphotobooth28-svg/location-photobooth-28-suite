const fs=require('fs');
const path=require('path');
const serverPath=path.join(process.cwd(),'server.js');
const appPath=path.join(process.cwd(),'client','src','App.jsx');
let server=fs.readFileSync(serverPath,'utf8');
let app=fs.readFileSync(appPath,'utf8');
let changes=0;

function replaceOnce(src,oldValue,newValue,label){
  if(src.includes(newValue)) return src;
  if(!src.includes(oldValue)) throw new Error('[documents-web] motif introuvable: '+label);
  changes++; return src.replace(oldValue,newValue);
}

// Autoriser les documents usuels, jamais les exécutables.
const oldFilter=`  fileFilter:(req,file,cb)=>{\n    const isPdf =\n      file.mimetype==="application/pdf" ||\n      /\\.pdf$/i.test(file.originalname||"");\n\n    cb(\n      isPdf ? null : new Error("Seuls les fichiers PDF sont autorisés."),\n      isPdf\n    );\n  }`;
const newFilter=`  fileFilter:(req,file,cb)=>{\n    const name=String(file.originalname||"").toLowerCase();\n    const mime=String(file.mimetype||"").toLowerCase();\n    const okExt=/\\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/i.test(name);\n    const okMime=[\n      "application/pdf",\n      "application/msword",\n      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",\n      "application/vnd.ms-excel",\n      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",\n      "image/jpeg","image/png"\n    ].includes(mime);\n    const ok=okExt||okMime;\n    cb(ok?null:new Error("Formats autorisés : PDF, Word, Excel, JPG et PNG."),ok);\n  }`;
if(server.includes(oldFilter)){server=server.replace(oldFilter,newFilter);changes++;}

// Stockage des liens web dans preparation.documentLinks, sans migration Prisma.
if(!server.includes('function lp28DocumentLinksFromPrep')){
  const marker='app.get("/api/events/:id/documents", adminOnly';
  const pos=server.indexOf(marker);
  if(pos<0) throw new Error('[documents-web] route documents GET introuvable');
  const helpers=`function lp28DocumentLinksFromPrep(prep){\n  let p=prep; if(typeof p==="string"){try{p=JSON.parse(p)}catch{p={}}}\n  return Array.isArray(p?.documentLinks)?p.documentLinks:[];\n}\nfunction lp28DocumentLinkView(link){\n  const id=String(link.id||"");\n  return {id:"web-"+id,source:"WEB",name:link.displayName||documentTypeLabel(link.type),displayName:link.displayName||documentTypeLabel(link.type),type:link.type||"OTHER",typeLabel:documentTypeLabel(link.type||"OTHER"),visibleClient:link.visibleClient!==false,url:link.url,webViewLink:link.url,mimeType:"text/uri-list",createdTime:link.createdAt||null};\n}\nasync function lp28ReadDocumentLinks(eventId){\n  const e=await prisma.event.findUnique({where:{id:eventId},select:{preparation:true}});\n  return lp28DocumentLinksFromPrep(e?.preparation);\n}\nasync function lp28WriteDocumentLinks(eventId,links){\n  const e=await prisma.event.findUnique({where:{id:eventId},select:{preparation:true}});\n  let p=e?.preparation; if(typeof p==="string"){try{p=JSON.parse(p)}catch{p={}}} if(!p||typeof p!=="object"||Array.isArray(p))p={};\n  p.documentLinks=links; await prisma.event.update({where:{id:eventId},data:{preparation:p}});\n}\nasync function lp28WebDocuments(eventId){return (await lp28ReadDocumentLinks(eventId)).map(lp28DocumentLinkView);}\n\n`;
  server=server.slice(0,pos)+helpers+server.slice(pos); changes++;
}

// Fusionner les liens web à la liste Admin des documents.
if(!server.includes('.concat(await lp28WebDocuments(event.id))')){
  const routePos=server.indexOf('app.get("/api/events/:id/documents", adminOnly');
  const nextPos=server.indexOf('app.post(',routePos);
  const seg=server.slice(routePos,nextPos);
  const mapPos=seg.indexOf('.map(normalizeDriveDocument)');
  if(mapPos<0) throw new Error('[documents-web] map documents Admin introuvable');
  const global=routePos+mapPos+'.map(normalizeDriveDocument)'.length;
  server=server.slice(0,global)+'.concat(await lp28WebDocuments(event.id))'+server.slice(global); changes++;
}

// Route création d'un lien web.
if(!server.includes('/api/events/:id/documents/link')){
  const marker='app.patch(\n  "/api/events/:id/documents/:fileId"';
  const pos=server.indexOf(marker);
  if(pos<0) throw new Error('[documents-web] route PATCH document introuvable');
  const route=`app.post("/api/events/:id/documents/link",adminOnly,async(req,res)=>{\n  try{\n    const raw=String(req.body?.url||"").trim(); let u; try{u=new URL(raw)}catch{return res.status(400).json({ok:false,message:"Lien web invalide."})}\n    if(!["http:","https:"].includes(u.protocol))return res.status(400).json({ok:false,message:"Seuls les liens http/https sont autorisés."});\n    const allowed=["QUOTE","DEPOSIT_INVOICE","INVOICE","PURCHASE_ORDER","OTHER"]; const type=allowed.includes(String(req.body?.type||""))?String(req.body.type):"OTHER";\n    const links=await lp28ReadDocumentLinks(req.params.id); const item={id:crypto.randomUUID(),url:u.toString(),type,displayName:String(req.body?.displayName||"").trim()||documentTypeLabel(type),visibleClient:req.body?.visibleClient!==false,createdAt:new Date().toISOString()};\n    links.unshift(item); await lp28WriteDocumentLinks(req.params.id,links.slice(0,100)); res.json({ok:true,document:lp28DocumentLinkView(item)});\n  }catch(err){console.error("Document link create",err);res.status(500).json({ok:false,message:"Impossible d'ajouter le lien web."});}\n});\n\n`;
  server=server.slice(0,pos)+route+server.slice(pos); changes++;
}

function injectRoute(marker,code,label){
  if(server.includes(code.trim().split('\n')[0])) return;
  const start=server.indexOf(marker); if(start<0)throw new Error('[documents-web] '+label+' introuvable');
  const tryPos=server.indexOf('try{',start); if(tryPos<0)throw new Error('[documents-web] try '+label+' introuvable');
  server=server.slice(0,tryPos+4)+'\n'+code+server.slice(tryPos+4); changes++;
}

injectRoute('app.patch(\n  "/api/events/:id/documents/:fileId"',`      if(String(req.params.fileId||"").startsWith("web-")){\n        const id=String(req.params.fileId).slice(4),links=await lp28ReadDocumentLinks(req.params.id),i=links.findIndex(x=>String(x.id)===id);\n        if(i<0)return res.status(404).json({ok:false,message:"Lien introuvable."});\n        if(req.body?.type)links[i].type=String(req.body.type); if(req.body?.displayName!=null)links[i].displayName=String(req.body.displayName).trim()||documentTypeLabel(links[i].type); if(req.body?.visibleClient!=null)links[i].visibleClient=Boolean(req.body.visibleClient);\n        await lp28WriteDocumentLinks(req.params.id,links); return res.json({ok:true,document:lp28DocumentLinkView(links[i])});\n      }\n`,'PATCH lien');
injectRoute('app.delete(\n  "/api/events/:id/documents/:fileId"',`      if(String(req.params.fileId||"").startsWith("web-")){\n        const id=String(req.params.fileId).slice(4),links=(await lp28ReadDocumentLinks(req.params.id)).filter(x=>String(x.id)!==id); await lp28WriteDocumentLinks(req.params.id,links); return res.json({ok:true});\n      }\n`,'DELETE lien');
injectRoute('app.get(\n  "/api/events/:id/documents/:fileId/file"',`      if(String(req.params.fileId||"").startsWith("web-")){\n        const id=String(req.params.fileId).slice(4),link=(await lp28ReadDocumentLinks(req.params.id)).find(x=>String(x.id)===id); if(!link)return res.status(404).end(); return res.redirect(302,link.url);\n      }\n`,'FILE lien');

// Ajouter les liens visibles dans l'espace organisateur.
if(!server.includes('clientDocuments=clientDocuments.concat((await lp28WebDocuments(event.id)).filter(d=>d.visibleClient!==false))')){
  let from=0;
  while(true){
    const cp=server.indexOf('      let clientDocuments=[];',from); if(cp<0)break;
    const op=server.indexOf('      organizerDocuments={',cp); if(op<0)break;
    const insert='      clientDocuments=clientDocuments.concat((await lp28WebDocuments(event.id)).filter(d=>d.visibleClient!==false));\n\n';
    server=server.slice(0,op)+insert+server.slice(op); from=op+insert.length+10; changes++;
  }
}

// Frontend : choix Lien web / Fichier.
const stateOld='  const [visibleClient,setVisibleClient]=useState(true);';
const stateNew=stateOld+'\n  const [documentSource,setDocumentSource]=useState("FILE");\n  const [webUrl,setWebUrl]=useState("");';
if(app.includes(stateOld)&&!app.includes('setDocumentSource')){app=app.replace(stateOld,stateNew);changes++;}

const prevent='    ev.preventDefault();\n\n    if(!file){';
if(app.includes(prevent)&&!app.includes('documents/link')){
  const branch=`    ev.preventDefault();\n\n    if(documentSource==="WEB"){\n      const url=webUrl.trim(); if(!/^https?:\\/\\//i.test(url))return alert("Saisis un lien web commençant par http:// ou https://");\n      setBusy(true);\n      try{const r=await fetch(\`/api/events/\${event.id}/documents/link\`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url,type,displayName,visibleClient})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Impossible d'ajouter le lien web.");setWebUrl("");setDisplayName("");await load();}catch(err){alert(err.message)}finally{setBusy(false)}\n      return;\n    }\n\n    if(!file){`;
  app=app.replace(prevent,branch);changes++;
}

const label='            <label>Fichier PDF</label>';
if(app.includes(label)&&!app.includes('Source du document')){
  const controls=`            <label>Source du document</label>\n            <select value={documentSource} onChange={e=>setDocumentSource(e.target.value)} style={{marginBottom:10}}>\n              <option value="FILE">📎 Fichier</option>\n              <option value="WEB">🔗 Lien web</option>\n            </select>\n            {documentSource==="WEB"&&<input value={webUrl} onChange={e=>setWebUrl(e.target.value)} placeholder="https://..." inputMode="url" style={{marginBottom:10}}/>}\n            <label>{documentSource==="WEB"?"Lien web":"Fichier (PDF, Word, Excel, JPG ou PNG)"}</label>`;
  app=app.replace(label,controls);changes++;
}
app=app.replace('accept="application/pdf,.pdf"','accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,image/jpeg,image/png"');
app=app.replace('type="file"\n              accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,image/jpeg,image/png"','type="file"\n              disabled={documentSource==="WEB"}\n              accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,image/jpeg,image/png"');
if(app.includes('Choisis un fichier PDF.'))app=app.replace('Choisis un fichier PDF.','Choisis un fichier (PDF, Word, Excel, JPG ou PNG).');
if(app.includes('Version 8.5.89'))app=app.split('Version 8.5.89').join('Version 8.5.90');

fs.writeFileSync(serverPath,server,'utf8');
fs.writeFileSync(appPath,app,'utf8');
console.log(`[documents-web] ${changes} modification(s) appliquée(s).`);
