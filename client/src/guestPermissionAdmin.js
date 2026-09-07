let currentGalleryState=null;

function findSecurityPanel(){
  const marker=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,div')].find(el=>['🔐 Sécurité de la galerie','Sécurité de la galerie'].includes((el.textContent||'').trim()));
  if(marker){let node=marker;for(let i=0;i<6&&node;i++,node=node.parentElement){const text=node.textContent||'';if(text.includes('Verrouiller les invités')&&text.includes('Verrouiller toute la galerie'))return node;}}
  return null;
}
function currentGalleryName(){
  const h=[...document.querySelectorAll('h1,h2,h3')].map(x=>(x.textContent||'').trim()).filter(Boolean);
  return h.find(x=>!x.includes('Sécurité de la galerie')&&!x.includes('Droits des invités')&&!x.includes('LumaBooth'))||'';
}
function makeButton(label,enabled,onClick){const b=document.createElement('button');b.type='button';b.textContent=`${enabled?'🟢':'🔴'} ${label} : ${enabled?'Autorisé':'Interdit'}`;b.style.marginRight='8px';b.style.marginTop='8px';b.addEventListener('click',onClick);return b;}
async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Opération impossible.');return d;}
async function resolveCurrentGallery(){
  const name=currentGalleryName();if(!name)return null;
  const list=await api('/api/admin/galleries');
  const gallery=(list.galleries||[]).find(g=>String(g.name||'').trim()===name);
  if(!gallery)return null;
  const detail=await api(`/api/admin/galleries/${encodeURIComponent(gallery.id)}`);
  const event=detail.event||{};
  const preparation=event.preparation&&typeof event.preparation==='object'?event.preparation:{};
  return {eventId:event.id||gallery.id,preparation,download:preparation.guestDownloadEnabled!==false,delete:preparation.guestDeleteEnabled===true};
}
async function savePermission(state,changes){
  const preparation={...state.preparation,...changes};
  await api(`/api/events/${encodeURIComponent(state.eventId)}/preparation`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({preparation})});
  state.preparation=preparation;state.download=preparation.guestDownloadEnabled!==false;state.delete=preparation.guestDeleteEnabled===true;
}
function mountControls(){
  const panel=findSecurityPanel();if(!panel||!currentGalleryState)return;
  const old=document.getElementById('lp28-guest-rights');if(old)old.remove();
  const state=currentGalleryState;
  const box=document.createElement('div');box.id='lp28-guest-rights';box.style.marginTop='14px';box.style.paddingTop='12px';box.style.borderTop='1px solid rgba(128,128,128,.25)';
  box.innerHTML='<strong>🔐 Droits des invités</strong><div class="muted" style="margin-top:4px">Choisis ce que les invités peuvent faire dans la galerie de cet événement.</div><div id="lp28-guest-rights-buttons"></div>';
  panel.appendChild(box);const buttons=box.querySelector('#lp28-guest-rights-buttons');
  const render=()=>{buttons.innerHTML='';
    const download=makeButton('Téléchargement',state.download,async()=>{download.disabled=true;try{await savePermission(state,{guestDownloadEnabled:!state.download});render();}catch(e){alert(e.message);download.disabled=false;}});
    const del=makeButton('Suppression',state.delete,async()=>{const next=!state.delete;if(next&&!confirm('Autoriser les invités à supprimer définitivement des photos de cet événement ?'))return;del.disabled=true;try{await savePermission(state,{guestDeleteEnabled:next});render();}catch(e){alert(e.message);del.disabled=false;}});
    buttons.append(download,del);
  };render();
}
async function ensureMounted(){
  if(document.getElementById('lp28-guest-rights'))return;
  if(!findSecurityPanel())return;
  try{currentGalleryState=await resolveCurrentGallery();if(currentGalleryState)mountControls();}catch{}
}
export function installGuestPermissionAdmin(){
  let scheduled=false;
  const run=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;ensureMounted();},80);};
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',run);window.addEventListener('popstate',run);document.addEventListener('click',()=>setTimeout(run,120));setTimeout(run,0);
}
