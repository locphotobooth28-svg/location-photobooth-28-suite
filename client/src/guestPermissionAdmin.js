function adminGalleryEventId(){
  const match=location.pathname.match(/^\/admin\/memories\/([^/]+)\/?$/);
  return match?decodeURIComponent(match[1]):null;
}

function findSecurityPanel(){
  const candidates=[...document.querySelectorAll("section,.panel,.card,div")];
  return candidates.find(el=>{
    const text=(el.textContent||"").trim();
    return text.includes("Sécurité de la galerie")&&text.includes("Verrouiller les invités")&&text.length<1200;
  })||null;
}

function makeButton(label,enabled,onClick){
  const b=document.createElement("button");
  b.type="button";
  b.textContent=`${enabled?"🟢":"🔴"} ${label} : ${enabled?"Autorisé":"Interdit"}`;
  b.style.marginRight="8px";
  b.style.marginTop="8px";
  b.addEventListener("click",onClick);
  return b;
}

async function api(url,options){
  const r=await fetch(url,options);
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||"Opération impossible.");
  return d;
}

async function mountControls(){
  const eventId=adminGalleryEventId();
  if(!eventId||document.getElementById("lp28-guest-rights"))return;
  const panel=findSecurityPanel();
  if(!panel)return;
  const box=document.createElement("div");
  box.id="lp28-guest-rights";
  box.style.marginTop="14px";
  box.style.paddingTop="12px";
  box.style.borderTop="1px solid rgba(128,128,128,.25)";
  box.innerHTML='<strong>🔐 Droits des invités</strong><div class="muted" style="margin-top:4px">Choisis ce que les invités peuvent faire dans la galerie de cet événement.</div><div id="lp28-guest-rights-buttons"></div>';
  panel.appendChild(box);
  const buttons=box.querySelector("#lp28-guest-rights-buttons");
  try{
    const data=await api(`/api/r2/admin-guest-permissions/${encodeURIComponent(eventId)}`);
    const render=()=>{
      buttons.innerHTML="";
      const download=makeButton("Téléchargement",!!data.download,async()=>{
        download.disabled=true;
        try{const d=await api(`/api/r2/admin-guest-permissions/${encodeURIComponent(eventId)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guestDownloadEnabled:!data.download})});data.download=d.download;data.delete=d.delete;render();}catch(e){alert(e.message);download.disabled=false;}
      });
      const del=makeButton("Suppression",!!data.delete,async()=>{
        const next=!data.delete;
        if(next&&!confirm("Autoriser les invités à supprimer définitivement des photos de cet événement ?"))return;
        del.disabled=true;
        try{const d=await api(`/api/r2/admin-guest-permissions/${encodeURIComponent(eventId)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guestDeleteEnabled:next})});data.download=d.download;data.delete=d.delete;render();}catch(e){alert(e.message);del.disabled=false;}
      });
      buttons.append(download,del);
    };
    render();
  }catch(e){buttons.innerHTML=`<span class="muted">⚠️ ${e.message}</span>`;}
}

export function installGuestPermissionAdmin(){
  let last=location.pathname;
  const run=()=>{if(last!==location.pathname)last=location.pathname;mountControls();};
  const observer=new MutationObserver(run);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("load",run);
  setTimeout(run,0);
}
