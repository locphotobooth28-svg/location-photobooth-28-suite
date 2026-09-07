const prisma=require("../lib/prisma");
const r2=require("./r2Service");
function install(){
 const expressPath=require.resolve("express"),original=require(expressPath);
 if(original.__lp28ZipWrapped)return;
 function wrappedExpress(...args){
  const app=original(...args);
  app.post("/api/r2/portal-zip-links/:token",original.json({limit:"256kb"}),async(req,res)=>{
   try{
    const token=String(req.params.token||"");
    const event=await prisma.event.findFirst({where:{organizerToken:token}});
    if(!event)return res.status(403).json({ok:false,message:"Accès organisateur requis."});
    const ids=Array.isArray(req.body?.ids)?[...new Set(req.body.ids.map(String))].slice(0,500):[];
    if(!ids.length)return res.status(400).json({ok:false,message:"Aucune photo sélectionnée."});
    const media=await prisma.memoryMedia.findMany({where:{id:{in:ids},eventId:event.id,deletedAt:null}});
    const ordered=ids.map(id=>media.find(m=>m.id===id)).filter(Boolean);
    if(!ordered.length)return res.status(404).json({ok:false,message:"Photos introuvables."});
    const files=[];
    for(const item of ordered){const key=r2.fromFileId(item.driveFileId);if(!key)return res.status(409).json({ok:false,message:"Une ancienne photo n'est pas encore disponible pour ce mode de téléchargement."});files.push({id:item.id,name:item.originalName||item.fileName||`${item.id}.jpg`,url:r2.presignGet(key,900)});}
    const eventName=String(event.name||"evenement").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"evenement";
    res.setHeader("Cache-Control","no-store");
    return res.json({ok:true,filename:`LP28-${eventName}-photos.zip`,files});
   }catch(err){console.error("LP28 ZIP links :",err);return res.status(500).json({ok:false,message:"Préparation du téléchargement impossible."});}
  });
  app.post("/api/r2/portal-delete/:token",original.json({limit:"256kb"}),async(req,res)=>{
   try{
    const token=String(req.params.token||"");
    const event=await prisma.event.findFirst({where:{organizerToken:token}});
    if(!event)return res.status(403).json({ok:false,message:"Accès organisateur requis."});
    const ids=Array.isArray(req.body?.ids)?[...new Set(req.body.ids.map(String))].slice(0,500):[];
    if(!ids.length)return res.status(400).json({ok:false,message:"Aucune photo sélectionnée."});
    const media=await prisma.memoryMedia.findMany({where:{id:{in:ids},eventId:event.id,deletedAt:null}});
    if(!media.length)return res.status(404).json({ok:false,message:"Photos introuvables."});
    let deleted=0;for(const item of media){await prisma.memoryMedia.delete({where:{id:item.id}});deleted++;}
    console.log(`LP28 R2 BULK DELETE OK : ${deleted} média(s) / ${event.id}`);
    return res.json({ok:true,deleted});
   }catch(err){console.error("LP28 R2 bulk delete :",err);if(!res.headersSent)return res.status(500).json({ok:false,message:"Suppression impossible."});}
  });
  return app;
 }
 Object.assign(wrappedExpress,original);wrappedExpress.__lp28ZipWrapped=true;require.cache[expressPath].exports=wrappedExpress;
}
module.exports={install};
