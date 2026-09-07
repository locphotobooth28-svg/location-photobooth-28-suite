function mediaIdFromCard(card){
  const media=card?.querySelector("img[src*='/memories/'],video[src*='/memories/']");
  const src=media?.getAttribute("src")||"";
  const match=src.match(/\/memories\/([^/?#]+)\/(?:file|thumbnail)/);
  return match?decodeURIComponent(match[1]):null;
}
function selectedIds(){
  return [...new Set([...document.querySelectorAll(".memory-card.selected")].map(mediaIdFromCard).filter(Boolean))];
}
function portalToken(){
  const portal=location.pathname.match(/^\/portal\/([^/]+)$/);
  return portal?portal[1]:null;
}
function ensureDeleteButton(){
  const token=portalToken();
  if(!token)return;
  const download=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Télécharger la sélection"));
  if(!download||document.getElementById("lp28-delete-selected"))return;
  const button=document.createElement("button");
  button.id="lp28-delete-selected";
  button.type="button";
  button.className=download.className;
  button.textContent="🗑️ Supprimer la sélection";
  button.style.marginLeft="8px";
  download.insertAdjacentElement("afterend",button);
}
function retryImage(img){
  if(!img||img.tagName!=="IMG")return;
  const src=img.getAttribute("src")||"";
  if(!src.includes("/memories/"))return;
  const attempts=Number(img.dataset.lp28Retry||0);
  if(attempts>=3)return;
  img.dataset.lp28Retry=String(attempts+1);
  const delay=350+(attempts*650);
  setTimeout(()=>{
    if(!img.isConnected)return;
    const current=img.getAttribute("src")||src;
    const u=new URL(current,location.href);
    u.searchParams.set("lp28retry",`${Date.now()}-${attempts+1}`);
    img.src=u.pathname+u.search+u.hash;
  },delay);
}
function prepareGalleryImages(root=document){
  root.querySelectorAll?.("img[src*='/memories/']").forEach(img=>{
    if(img.dataset.lp28RetryReady)return;
    img.dataset.lp28RetryReady="1";
    img.addEventListener("error",()=>retryImage(img));
    if(img.complete&&img.naturalWidth===0)retryImage(img);
  });
}
export function installZipDownloads(){
  const observer=new MutationObserver(mutations=>{
    ensureDeleteButton();
    for(const mutation of mutations){for(const node of mutation.addedNodes){if(node.nodeType===1){prepareGalleryImages(node);if(node.matches?.("img[src*='/memories/']"))prepareGalleryImages(node.parentElement||document);}}}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("load",()=>{ensureDeleteButton();prepareGalleryImages();});
  prepareGalleryImages();
  document.addEventListener("error",event=>{if(event.target?.tagName==="IMG")retryImage(event.target);},true);
  document.addEventListener("click",async event=>{
    const button=event.target.closest("button");
    if(!button)return;
    const token=portalToken();
    if(!token)return;
    if(button.id==="lp28-delete-selected"){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      const ids=selectedIds();
      if(!ids.length){alert("Sélectionne au moins une photo.");return;}
      if(!confirm(`Supprimer définitivement ${ids.length} photo${ids.length>1?"s":""} ?\n\nCette action est irréversible.`))return;
      const oldText=button.textContent;button.disabled=true;button.textContent=`🗑️ Suppression (${ids.length})…`;
      try{
        const response=await fetch(`/api/r2/portal-delete/${encodeURIComponent(token)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.message||"Suppression impossible.");
        location.reload();
      }catch(err){alert(err.message||"Suppression impossible.");button.disabled=false;button.textContent=oldText;}
      return;
    }
    if(!button.textContent.includes("Télécharger la sélection"))return;
    const ids=selectedIds();
    if(!ids.length)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const oldText=button.textContent;
    button.disabled=true;
    button.textContent=`📦 Préparation du ZIP (${ids.length})…`;
    try{
      const response=await fetch(`/api/r2/portal-zip/${encodeURIComponent(token)}`,{
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
