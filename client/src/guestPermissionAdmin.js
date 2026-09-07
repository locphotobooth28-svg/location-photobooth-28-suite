function adminGalleryEventId(){
  const path=location.pathname.replace(/\/+$/,'');
  const patterns=[
    /^\/admin\/memories\/([^/]+)$/i,
    /^\/admin\/galleries\/([^/]+)$/i,
    /^\/admin\/gallery\/([^/]+)$/i,
    /^\/galleries\/([^/]+)$/i,
    /^\/gallery\/([^/]+)$/i
  ];
  for(const pattern of patterns){const match=path.match(pattern);if(match)return decodeURIComponent(match[1]);}
  const luma=[...document.querySelectorAll('input')].find(el=>String(el.value||'').includes('/api/lumabooth/event/'));
  const match=String(luma?.value||'').match(/\/api\/lumabooth\/event\/([^/?#]+)/i);
  return match?decodeURIComponent(match[1]):null;
}

function findSecurityPanel(){
  const marker=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,div')].find(el=>(el.textContent||'').trim()==='🔐 Sécurité de la galerie'||(el.textContent||'').trim()==='Sécurité de la galerie');
  if(marker){
    let node=marker;
    for(let i=0;i<6&&node;i++,node=node.parentElement){
      const text=(node.textContent||'');
      if(text.includes('Verrouiller les invités')&&text.includes('Verrouiller toute la galerie'))return node;
    }
  }
  const lockButton=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Verrouiller les invités'));
  if(lockButton){
    let node=lockButton.parentElement;
    for(let i=0;i<5&&node;i++,node=node.parentElement){
      const text=(node.textContent||'');
      if(text.includes('Sécurité de la galerie')&&text.includes('Verrouiller toute la galerie'))return node;
    }
  }
  return null;
}

function makeButton(label,enabled,onClick){
  const b=document.createElement('button');
  b.type='button';
  b.textContent=`${enabled?'🟢':'🔴'} ${label} : ${enabled?'Autorisé':'Interdit'}`;
  b.style.marginRight='8px';b.style.marginTop='8px';b.addEventListener('click',onClick);return b;
}
async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Opération impossible.');return d;}
async function mountControls(){
  if(document.getElementById('lp28-guest-rights'))return;
  const panel=findSecurityPanel();if(!panel)return;
  const eventId=adminGalleryEventId();if(!eventId)return;
  const box=document.createElement('div');box.id='lp28-guest-rights';box.style.marginTop='14px';box.style.paddingTop='12px';box.style.borderTop='1px solid rgba(128,128,128,.25)';
  box.innerHTML='<strong>🔐 Droits des invités</strong><div class="muted" style="margin-top:4px">Choisis ce que les invités peuvent faire dans la galerie de cet événement.</div><div id="lp28-guest-rights-buttons"></div>';
  panel.appendChild(box);const buttons=box.querySelector('#lp28-guest-rights-buttons');
  try{
    const data=await api(`/api/r2/admin-guest-permissions/${encodeURIComponent(eventId)}`);
    const render=()=>{buttons.innerHTML='';
      const download=makeButton('Téléchargement',!!data.download,async()=>{download.disabled=true;try{const d=await api(`/api/r2/admin-guest-permissions/${encodeURIComponent(eventId)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestDownloadEnabled:!data.download})});data.download=d.download;data.delete=d.delete;render();}catch(e){alert(e.message);download.disabled=false;}});
      const del=makeButton('Suppression',!!data.delete,async()=>{const next=!data.delete;if(next&&!confirm('Autoriser les invités à supprimer définitivement des photos de cet événement ?'))return;del.disabled=true;try{const d=await api(`/api/r2/admin-guest-permissions/${encodeURIComponent(eventId)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestDeleteEnabled:next})});data.download=d.download;data.delete=d.delete;render();}catch(e){alert(e.message);del.disabled=false;}});
      buttons.append(download,del);
    };render();
  }catch(e){buttons.innerHTML=`<span class="muted">⚠️ ${e.message}</span>`;}
}
export function installGuestPermissionAdmin(){
  let scheduled=false;
  const run=()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mountControls();},50);};
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',run);window.addEventListener('popstate',run);document.addEventListener('click',()=>setTimeout(run,100));setTimeout(run,0);
}
