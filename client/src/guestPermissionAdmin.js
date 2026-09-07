let currentGalleryState=null;

function findSecurityPanel(){
  const marker=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,div')].find(el=>['🔐 Sécurité de la galerie','Sécurité de la galerie'].includes((el.textContent||'').trim()));
  if(marker){let node=marker;for(let i=0;i<6&&node;i++,node=node.parentElement){const text=node.textContent||'';if(text.includes('Verrouiller les invités')&&text.includes('Verrouiller toute la galerie'))return node;}}
  return null;
}
function makeButton(label,enabled,onClick){const b=document.createElement('button');b.type='button';b.textContent=`${enabled?'🟢':'🔴'} ${label} : ${enabled?'Autorisé':'Interdit'}`;b.style.marginRight='8px';b.style.marginTop='8px';b.addEventListener('click',onClick);return b;}
async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Opération impossible.');return d;}
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
function captureGalleryResponse(url,response){
  const match=String(url||'').match(/\/api\/admin\/galleries\/([^/?#]+)(?:[?#]|$)/i);if(!match||!response?.ok)return;
  response.clone().json().then(data=>{
    const event=data?.event;if(!event)return;
    const preparation=event.preparation&&typeof event.preparation==='object'?event.preparation:{};
    currentGalleryState={eventId:event.id||decodeURIComponent(match[1]),preparation,download:preparation.guestDownloadEnabled!==false,delete:preparation.guestDeleteEnabled===true};
    setTimeout(mountControls,0);
  }).catch(()=>{});
}
export function installGuestPermissionAdmin(){
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){const response=await originalFetch(input,init);const url=typeof input==='string'?input:input?.url;captureGalleryResponse(url,response);return response;};
  let scheduled=false;const run=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;if(currentGalleryState&&!document.getElementById('lp28-guest-rights'))mountControls();},50);};
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',run);setTimeout(run,0);
}
