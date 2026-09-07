import { buildBrowserZip } from "./clientZip";

function token(){const m=location.pathname.match(/^\/portal\/([^/]+)$/);return m?decodeURIComponent(m[1]):"";}
function mediaId(card){const el=card?.querySelector("img[src*='/memories/'],video[src*='/memories/']");const src=el?.getAttribute("src")||"";const m=src.match(/\/memories\/([^/?#]+)\/(?:file|thumbnail)/);return m?decodeURIComponent(m[1]):"";}
async function json(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Opération impossible.");return d;}
function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name||"LP28-photos.zip";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}

export function installGuestPortalRights(){
  const state={ready:false,guest:false,download:false,delete:false,select:false,selected:new Set(),busy:false};
  let checking=false;

  async function identify(){
    if(state.ready||checking)return;
    const heading=document.querySelector("#photos-partagees .memories-heading");
    const t=token();
    if(!heading||!t)return;
    checking=true;
    try{const d=await json(`/api/r2/guest-permissions/${encodeURIComponent(t)}`);state.guest=true;state.download=d.download===true;state.delete=d.delete===true;}
    catch{state.guest=false;}
    finally{state.ready=true;checking=false;render();}
  }

  function cards(){return [...document.querySelectorAll("#photos-partagees .memory-card")].filter(c=>mediaId(c));}
  function syncCards(){
    for(const card of cards()){
      const id=mediaId(card);card.classList.toggle("selected",state.selected.has(id));
      let b=card.querySelector(".lp28-guest-check");
      if(state.select){
        if(!b){b=document.createElement("button");b.type="button";b.className="memory-select-check lp28-guest-check";b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();state.selected.has(id)?state.selected.delete(id):state.selected.add(id);syncCards();renderBar();},true);card.prepend(b);}
        b.textContent=state.selected.has(id)?"✓":"";
      }else b?.remove();
    }
  }

  async function download(btn){
    const ids=[...state.selected],t=token();if(!ids.length||!t||state.busy)return;
    state.busy=true;const old=btn.textContent;btn.disabled=true;
    try{btn.textContent=`📦 Préparation (${ids.length})…`;const d=await json(`/api/r2/guest-zip-links/${encodeURIComponent(t)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});const blob=await buildBrowserZip(d.files,(n,total)=>btn.textContent=`☁️ Téléchargement ${n}/${total}…`);btn.textContent="📦 Création du ZIP…";save(blob,d.filename);}
    catch(e){alert(e.message||"Téléchargement impossible.");}
    finally{state.busy=false;btn.disabled=false;btn.textContent=old;}
  }

  async function remove(btn){
    const ids=[...state.selected],t=token();if(!ids.length||!t||state.busy)return;
    if(!confirm(`Supprimer définitivement ${ids.length} photo${ids.length>1?'s':''} ?\n\nCette action est irréversible.`))return;
    state.busy=true;btn.disabled=true;
    try{await json(`/api/r2/guest-delete/${encodeURIComponent(t)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});location.reload();}
    catch(e){alert(e.message||"Suppression impossible.");state.busy=false;btn.disabled=false;}
  }

  function renderBar(){
    document.getElementById("lp28-guest-rights-bar")?.remove();if(!state.select)return;
    const heading=document.querySelector("#photos-partagees .memories-heading");if(!heading)return;
    const ids=cards().map(mediaId).filter(Boolean);const bar=document.createElement("div");bar.id="lp28-guest-rights-bar";bar.className="memory-selection-bar";
    const count=document.createElement("strong");count.textContent=`${state.selected.size} sélectionnée${state.selected.size>1?'s':''} sur ${ids.length}`;
    const actions=document.createElement("div");actions.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end";
    const all=document.createElement("button");all.type="button";all.textContent="☑ Tout sélectionner";all.disabled=!ids.length||state.selected.size===ids.length;all.onclick=()=>{ids.forEach(id=>state.selected.add(id));syncCards();renderBar();};
    const none=document.createElement("button");none.type="button";none.textContent="⬜ Tout désélectionner";none.disabled=!state.selected.size;none.onclick=()=>{state.selected.clear();syncCards();renderBar();};actions.append(all,none);
    if(state.download){const b=document.createElement("button");b.type="button";b.textContent="⬇️ Télécharger la sélection";b.disabled=!state.selected.size;b.onclick=()=>download(b);actions.appendChild(b);}
    if(state.delete){const b=document.createElement("button");b.type="button";b.className="danger";b.textContent="🗑️ Supprimer la sélection";b.disabled=!state.selected.size;b.onclick=()=>remove(b);actions.appendChild(b);}
    bar.append(count,actions);heading.insertAdjacentElement("afterend",bar);
  }

  function render(){
    if(!state.ready||!state.guest)return;
    const heading=document.querySelector("#photos-partagees .memories-heading");if(!heading)return;
    let b=document.getElementById("lp28-guest-rights-toggle");
    if(!(state.download||state.delete)){b?.remove();document.getElementById("lp28-guest-rights-bar")?.remove();return;}
    if(!b){b=document.createElement("button");b.id="lp28-guest-rights-toggle";b.type="button";b.className="memory-select-toggle";b.onclick=()=>{state.select=!state.select;state.selected.clear();render();syncCards();renderBar();};heading.appendChild(b);}
    b.textContent=state.select?"Annuler":"☑ Sélectionner";syncCards();renderBar();
  }

  setInterval(()=>{if(!document.querySelector("#photos-partagees .memories-heading")){state.ready=false;state.guest=false;state.select=false;state.selected.clear();return;}identify();if(state.ready)render();},700);
}
