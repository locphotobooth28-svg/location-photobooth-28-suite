const prisma=require("../lib/prisma");
const r2=require("./r2Service");
const {buildZip}=require("./zipService");
const fs=require("fs");
const path=require("path");
function install(){
 const expressPath=require.resolve("express"),original=require(expressPath);
 if(original.__lp28ZipWrapped)return;
 function wrappedExpress(...args){
  const app=original(...args);
  app.post("/api/r2/portal-zip/:token",original.json({limit:"256kb"}),async(req,res)=>{
   try{
    const token=String(req.params.token||"");
    const event=await prisma.event.findFirst({where:{organizerToken:token}});
    if(!event)return res.status(403).json({ok:false,message:"Accès organisateur requis."});
    const ids=Array.isArray(req.body?.ids)?[...new Set(req.body.ids.map(String))].slice(0,500):[];
    if(!ids.length)return res.status(400).json({ok:false,message:"Aucune photo sélectionnée."});
    const media=await prisma.memoryMedia.findMany({where:{id:{in:ids},eventId:event.id,deletedAt:null}});
    if(!media.length)return res.status(404).json({ok:false,message:"Photos introuvables."});
    const ordered=ids.map(id=>media.find(m=>m.id===id)).filter(Boolean);
    const zip=await buildZip(ordered,async item=>{
     const key=r2.fromFileId(item.driveFileId);
     if(key)return r2.getBuffer(key);
     const local=item.fileName?path.join(__dirname,"..","uploads","memories",item.fileName):null;
     if(local&&fs.existsSync(local))return fs.promises.readFile(local);
     throw new Error(`Le fichier ${item.originalName||item.id} n'est pas disponible dans R2.`);
    });
    const eventName=String(event.name||"evenement").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"evenement";
    res.setHeader("Content-Type","application/zip");
    res.setHeader("Content-Disposition",`attachment; filename=\"LP28-${eventName}-photos.zip\"`);
    res.setHeader("Cache-Control","no-store");
    zip.on("error",err=>{console.error("LP28 ZIP :",err);if(!res.headersSent)res.status(500).end();else res.destroy(err);});
    zip.pipe(res);
   }catch(err){console.error("LP28 ZIP route :",err);if(!res.headersSent)res.status(500).json({ok:false,message:"Création du ZIP impossible."});}
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
    let deleted=0;
    for(const item of media){
     await prisma.memoryMedia.delete({where:{id:item.id}});
     deleted++;
    }
    console.log(`LP28 R2 BULK DELETE OK : ${deleted} média(s) / ${event.id}`);
    return res.json({ok:true,deleted});
   }catch(err){
    console.error("LP28 R2 bulk delete :",err);
    if(!res.headersSent)return res.status(500).json({ok:false,message:"Suppression impossible."});
   }
  });
  return app;
 }
 Object.assign(wrappedExpress,original);wrappedExpress.__lp28ZipWrapped=true;require.cache[expressPath].exports=wrappedExpress;
}
module.exports={install};
