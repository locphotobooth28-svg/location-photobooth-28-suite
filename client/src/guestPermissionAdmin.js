let currentGalleryState=null;

function findSecurityPanel(){
  const buttons=[...document.querySelectorAll('button')];
  const guestLock=buttons.find(b=>(b.textContent||'').trim().includes('Verrouiller les invités'));
  const fullLock=buttons.find(b=>(b.textContent||'').trim().includes('Verrouiller toute la galerie'));
  if(guestLock&&fullLock){
    let node=guestLock.parentElement;
    for(let i=0;i<8&&node;i++,node=node.parentElement){if(node.contains(fullLock))return node;}
  }
  return null;
}
function currentOrganizerToken(){
  const input=[...document.querySelectorAll('input')].find(el=>String(el.value||'').includes('/api/lumabooth/event/'));
  const match=String(input?.value||'').match(/\/api\/lumabooth\/event\/([^/?#]+)/i);
  return match?decodeURIComponent(match[1]):'';
}
function makeButton(label,enabled,onClick){const b=document.createElement('button');b.type='button';b.textContent=`${enabled?'🟢':'🔴'} ${label} : ${enabled?'Autorisé':'Interdit'}`;b.style.marginRight='8px';b.style.marginTop='8px';b.addEventListener('click',onClick);return b;}
async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Opération impossible.');return d;}
async function resolveCurrentGallery(){
  const organizerToken=currentOrganizerToken();
  if(!organizerToken)throw new Error('Jeton organisateur introuvable.');
  const list=await api('/api/admin/galleries');
  const gallery=(list.galleries||[]).find(g=>String(g.organizerToken||'')===organizerToken);
  if(!gallery)throw new Error('Galerie liée à ce portail introuvable.');
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
  const box=document.createElement('div');box.id='lp28-guest-rights';box.style.marginTop='14px';box.style.paddingTop='12px';box.style.borderTop='1px solid rgba(128,128,128,.25)';box.style.width='100%';
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
  const panel=findSecurityPanel();if(!panel)return;
  const loading=document.createElement('div');loading.id='lp28-guest-rights';loading.style.marginTop='14px';loading.style.paddingTop='12px';loading.style.borderTop='1px solid rgba(128,128,128,.25)';loading.style.width='100%';loading.innerHTML='<strong>🔐 Droits des invités</strong><div class="muted" style="margin-top:4px">Chargement…</div>';panel.appendChild(loading);
  try{currentGalleryState=await resolveCurrentGallery();mountControls();}catch(e){const box=document.getElementById('lp28-guest-rights');if(box)box.innerHTML=`<strong>🔐 Droits des invités</strong><div class="muted" style="margin-top:4px">⚠️ ${e.message}</div>`;}
}
export function installGuestPermissionAdmin(){let scheduled=false;const run=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;ensureMounted();},80);};new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',run);document.addEventListener('click',()=>setTimeout(run,120));setTimeout(run,0);}
