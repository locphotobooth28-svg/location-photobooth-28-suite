const fs=require("fs");
const path="client/src/App.jsx";
let app=fs.readFileSync(path,"utf8");

const old=`  async function previewPortal(event,role){
    try{
      const r=await fetch(\`/api/events/\${event.id}/share\`); const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||"Aperçu indisponible.");
      const url=role==="ORGANIZER"?d.organizerUrl:d.guestUrl;
      if(!url)throw new Error("Lien de portail indisponible.");
      window.open(url,"_blank","noopener,noreferrer");
    }catch(err){alert(err.message||"Impossible d’ouvrir l’aperçu.");}
  }`;

const replacement=`  async function previewPortal(event,role){
    // Ouvre l'onglet immédiatement pendant le clic utilisateur afin d'éviter
    // que Chrome/Edge bloque la fenêtre après l'attente du fetch.
    const previewWindow=window.open("about:blank","_blank");
    if(!previewWindow){
      alert("Le navigateur bloque l'ouverture du portail. Autorise les fenêtres pop-up pour LP28 puis réessaie.");
      return;
    }
    try{
      previewWindow.document.title="Ouverture du portail LP28…";
      const r=await fetch(\`/api/events/\${event.id}/share\`);
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||"Aperçu indisponible.");
      const url=role==="ORGANIZER"?d.organizerUrl:d.guestUrl;
      if(!url)throw new Error("Lien de portail indisponible.");
      previewWindow.location.replace(url);
    }catch(err){
      try{previewWindow.close();}catch{}
      alert(err.message||"Impossible d’ouvrir l’aperçu.");
    }
  }`;

if(app.includes(replacement)){
  console.log("[preview-portal-popup] déjà appliqué");
  process.exit(0);
}
if(!app.includes(old)){
  throw new Error("[preview-portal-popup] fonction previewPortal introuvable");
}
app=app.replace(old,replacement);
fs.writeFileSync(path,app,"utf8");
console.log("[preview-portal-popup] OK");
