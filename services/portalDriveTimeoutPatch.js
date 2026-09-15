// LP28 - Protection du portail contre un blocage Google Drive.
// Le portail doit rester disponible même si OAuth/Drive est lent, expiré ou indisponible.
const googleService = require("./googleService");

const originalListEventDocuments = googleService.listEventDocuments;
const TIMEOUT_MS = 4000;

function timeout(ms){
  return new Promise((_, reject)=>{
    const err = new Error(`Google Drive indisponible après ${ms} ms`);
    err.code = "LP28_DRIVE_TIMEOUT";
    setTimeout(()=>reject(err), ms);
  });
}

if(typeof originalListEventDocuments === "function"){
  googleService.listEventDocuments = async function safeListEventDocuments(req,eventId){
    try{
      return await Promise.race([
        originalListEventDocuments(req,eventId),
        timeout(TIMEOUT_MS)
      ]);
    }catch(err){
      console.warn("LP28 portail : Drive ignoré pour préserver l'accès organisateur :", err?.message || err);
      return {
        connected:false,
        documents:[],
        degraded:true,
        reason:String(err?.code || err?.message || "DRIVE_UNAVAILABLE")
      };
    }
  };
}

module.exports = googleService;
