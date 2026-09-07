function mediaIdFromCard(card){
  const media=card?.querySelector("img[src*='/memories/'],video[src*='/memories/']");
  const src=media?.getAttribute("src")||"";
  const match=src.match(/\/memories\/([^/?#]+)\/(?:file|thumbnail)/);
  return match?decodeURIComponent(match[1]):null;
}

export function installZipDownloads(){
  document.addEventListener("click",async event=>{
    const button=event.target.closest("button");
    if(!button||!button.textContent.includes("Télécharger la sélection"))return;
    const portal=location.pathname.match(/^\/portal\/([^/]+)$/);
    if(!portal)return;
    const selectedCards=[...document.querySelectorAll(".memory-card.selected")];
    const ids=[...new Set(selectedCards.map(mediaIdFromCard).filter(Boolean))];
    if(!ids.length)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const oldText=button.textContent;
    button.disabled=true;
    button.textContent=`📦 Préparation du ZIP (${ids.length})…`;
    try{
      const response=await fetch(`/api/r2/portal-zip/${encodeURIComponent(portal[1])}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ids})
      });
      if(!response.ok){
        const d=await response.json().catch(()=>({}));
        throw new Error(d.message||"Création du ZIP impossible.");
      }
      const blob=await response.blob();
      const disposition=response.headers.get("Content-Disposition")||"";
      const match=disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename=match?.[1]||"LP28-photos.zip";
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(err){
      alert(err.message||"Téléchargement ZIP impossible.");
    }finally{
      button.disabled=false;
      button.textContent=oldText;
    }
  },true);
}
