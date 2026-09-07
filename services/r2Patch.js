const r2 = require("./r2Service");
const googleService = require("./googleService");

const originalUpload = googleService.uploadMemoryToDrive.bind(googleService);
const originalGet = googleService.getMemoryFromDrive.bind(googleService);
const originalDelete = googleService.deleteMemoryFromDrive.bind(googleService);
const originalThumbnail = typeof googleService.getMemoryThumbnailLink === "function"
  ? googleService.getMemoryThumbnailLink.bind(googleService)
  : null;

function keyFromFileId(fileId){
  return r2.fromFileId(fileId);
}

function redirectStream(url){
  return {
    on(){ return this; },
    pipe(res){
      return res.redirect(302,url);
    }
  };
}

googleService.uploadMemoryToDrive = async function patchedUploadMemoryToDrive(req,event,file){
  if(!r2.configured()){
    return originalUpload(req,event,file);
  }

  const uploaded = await r2.uploadFile(event,file);
  return {
    id:uploaded.fileId,
    webViewLink:null,
    webContentLink:null
  };
};

googleService.getMemoryFromDrive = async function patchedGetMemoryFromDrive(req,fileId){
  const key=keyFromFileId(fileId);
  if(!key){
    return originalGet(req,fileId);
  }

  // server.js appelle ensuite stream.pipe(res). Pour R2, on transforme ce pipe
  // en redirection vers une URL S3 signée : les octets ne passent plus par Render.
  return redirectStream(r2.presignGet(key,900));
};

googleService.deleteMemoryFromDrive = async function patchedDeleteMemoryFromDrive(req,fileId){
  const key=keyFromFileId(fileId);
  if(!key){
    return originalDelete(req,fileId);
  }
  await r2.deleteFile(key);
};

googleService.getMemoryThumbnailLink = async function patchedGetMemoryThumbnailLink(req,fileId){
  const key=keyFromFileId(fileId);
  if(key){
    return r2.presignGet(key,900);
  }
  if(originalThumbnail){
    return originalThumbnail(req,fileId);
  }
  return null;
};

if(r2.configured()){
  console.log("LP28 R2 : stockage galerie Cloudflare R2 activé.");
}else{
  console.warn("LP28 R2 : variables absentes, conservation du stockage Google Drive.");
}
