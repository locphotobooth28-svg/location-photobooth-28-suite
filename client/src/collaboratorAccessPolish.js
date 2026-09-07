function text(el){return String(el?.textContent||"").replace(/\s+/g," ").trim();}

function addStyle(){
  if(document.getElementById("lp28-collab-polish-style")) return;
  const style=document.createElement("style");
  style.id="lp28-collab-polish-style";
  style.textContent=`
    .lp28-collab-polished{
      --cp-bg:#151518;
      --cp-soft:#1d1e22;
      --cp-border:rgba(214,185,79,.38);
      --cp-text:#f5f5f6;
      --cp-muted:#b9bbc2;
      --cp-accent:#d6b94f;
      --cp-info-bg:#1a2130;
      --cp-info-border:#33445f;
    }
    html[data-lp28-theme="light"] .lp28-collab-polished{
      --cp-bg:#fff;
      --cp-soft:#f7f5ef;
      --cp-border:#d9c98a;
      --cp-text:#181818;
      --cp-muted:#666;
      --cp-accent:#9a7300;
      --cp-info-bg:#eef5ff;
      --cp-info-border:#b9d2f5;
    }
    .lp28-collab-polished{background:var(--cp-bg)!important;color:var(--cp-text)!important;}
    .lp28-collab-polished > .eyebrow,
    .lp28-collab-polished > h3{display:none!important;}
    .lp28-collab-polished > p.muted{margin:0 0 14px!important;color:var(--cp-muted)!important;}
    .lp28-collab-head{
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(280px,390px);
      gap:18px;
      align-items:start;
      margin-bottom:12px;
    }
    .lp28-collab-titlebox{display:flex;gap:12px;align-items:flex-start;min-width:0;}
    .lp28-collab-icon{font-size:32px;line-height:1;filter:saturate(.95);}
    .lp28-collab-titlebox h3{margin:0!important;font-size:24px!important;line-height:1.05;color:var(--cp-text)!important;}
    .lp28-collab-subtitle{margin-top:4px;color:var(--cp-accent);font-size:16px;font-weight:900;}
    .lp28-collab-note{
      display:flex;
      gap:10px;
      align-items:flex-start;
      background:var(--cp-info-bg);
      border:1px solid var(--cp-info-border);
      border-radius:12px;
      padding:12px 14px;
      color:var(--cp-text);
      font-size:12px;
      line-height:1.45;
      box-shadow:0 4px 14px rgba(0,0,0,.12);
    }
    .lp28-collab-note-icon{font-size:16px;line-height:1.2;}
    @media(max-width:760px){
      .lp28-collab-head{grid-template-columns:1fr;gap:10px;}
      .lp28-collab-titlebox h3{font-size:20px!important;}
      .lp28-collab-subtitle{font-size:14px;}
      .lp28-collab-icon{font-size:28px;}
      .lp28-collab-note{font-size:12px;padding:11px 12px;}
    }
  `;
  document.head.appendChild(style);
}

function enhance(){
  addStyle();
  const eyebrow=[...document.querySelectorAll(".eyebrow")].find(el=>text(el).toUpperCase()==="ACCÈS COLLABORATEUR");
  const card=eyebrow?.closest(".card");
  if(!card || card.querySelector(".lp28-collab-head")) return;

  card.classList.add("lp28-collab-polished");
  const head=document.createElement("div");
  head.className="lp28-collab-head";
  head.innerHTML=`
    <div class="lp28-collab-titlebox">
      <div class="lp28-collab-icon" aria-hidden="true">👥</div>
      <div>
        <h3>Accès collaborateur</h3>
        <div class="lp28-collab-subtitle">Informations autorisées</div>
      </div>
    </div>
    <div class="lp28-collab-note">
      <span class="lp28-collab-note-icon" aria-hidden="true">ℹ️</span>
      <span>Un collaborateur ne peut consulter que les informations autorisées ci-dessous. Les données sensibles restent protégées.</span>
    </div>`;
  card.insertBefore(head, card.firstChild);
}

export function installCollaboratorAccessPolish(){
  if(window.__lp28CollaboratorAccessPolishInstalled) return;
  window.__lp28CollaboratorAccessPolishInstalled=true;
  enhance();
  let tries=0;
  const timer=setInterval(()=>{
    enhance();
    if(++tries>=45) clearInterval(timer);
  },800);
  document.addEventListener("click",()=>setTimeout(enhance,80),true);
}
