const LP28_DOC_STYLE_ID = "lp28-organizer-doc-enhancer-style";

function ensureStyles(){
  if(document.getElementById(LP28_DOC_STYLE_ID)) return;
  const style=document.createElement("style");
  style.id=LP28_DOC_STYLE_ID;
  style.textContent=`
    @keyframes lp28DocPulse{
      0%,100%{box-shadow:0 0 0 0 rgba(242,209,109,0);border-color:rgba(217,182,75,.65)}
      50%{box-shadow:0 0 0 4px rgba(242,209,109,.14),0 0 18px rgba(242,209,109,.55);border-color:#f2d16d}
    }
    .lp28-doc-nav-enhanced{position:relative!important;padding-right:66px!important}
    .lp28-doc-nav-enhanced.lp28-doc-unread{animation:lp28DocPulse 1.45s ease-in-out infinite}
    .lp28-doc-count-badge,.lp28-doc-new-badge{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 7px;border-radius:999px;font-size:12px;font-weight:900;line-height:1;white-space:nowrap}
    .lp28-doc-count-badge{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:#d9b64b;color:#111;border:1px solid #f2d16d}
    .lp28-doc-new-badge{position:absolute;right:42px;top:50%;transform:translateY(-50%);background:#fff4bf;color:#6b4f00;border:1px solid #f2d16d}
    .lp28-payment-status{display:inline-flex;align-items:center;gap:6px;margin:4px 0 8px;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid rgba(217,182,75,.45);background:rgba(217,182,75,.08);color:#f2d16d}
    .lp28-payment-status.is-paid{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.10);color:#bbf7d0}
    .lp28-payment-status.is-info{border-color:rgba(96,165,250,.42);background:rgba(59,130,246,.10);color:#bfdbfe}
  `;
  document.head.appendChild(style);
}

function getOrganizerToken(){
  const path=window.location.pathname;
  const m=path.match(/^\/organisateur\/[^/]+\/([^/]+)$/) || path.match(/^\/portal\/([^/]+)$/);
  return m?.[1]||null;
}
function normalizeText(v){return String(v||"").replace(/\s+/g," ").trim();}
function findDocumentsNav(){
  const nodes=[...document.querySelectorAll("a,button,[role='button']")];
  return nodes.find(el=>/Documents/i.test(normalizeText(el.textContent)))||null;
}
function visibleClientDocuments(data){
  const docs=data?.documents?.files || data?.documents?.invoices || [];
  return Array.isArray(docs)?docs:[];
}
function documentIdentity(doc,index){return String(doc?.id||doc?.url||doc?.webViewLink||doc?.name||doc?.displayName||index);}
function seenKey(token){return `lp28.organizer.documents.seen.${token}`;}
function readSeen(token){try{const raw=JSON.parse(localStorage.getItem(seenKey(token))||"[]");return new Set(Array.isArray(raw)?raw:[]);}catch{return new Set();}}
function writeSeen(token,ids){try{localStorage.setItem(seenKey(token),JSON.stringify([...ids]));}catch{}}

function addBadge(nav,total,unread){
  if(!nav)return;
  nav.classList.add("lp28-doc-nav-enhanced");
  nav.classList.toggle("lp28-doc-unread",unread>0);
  let count=nav.querySelector(":scope > .lp28-doc-count-badge");
  if(!count){count=document.createElement("span");count.className="lp28-doc-count-badge";count.setAttribute("aria-label","Nombre de documents disponibles");nav.appendChild(count);}
  const totalText=String(total);
  if(count.textContent!==totalText)count.textContent=totalText;
  let fresh=nav.querySelector(":scope > .lp28-doc-new-badge");
  if(unread>0){
    if(!fresh){fresh=document.createElement("span");fresh.className="lp28-doc-new-badge";fresh.setAttribute("aria-label","Nouveaux documents");nav.appendChild(fresh);}
    const unreadText=`+${unread}`;
    if(fresh.textContent!==unreadText)fresh.textContent=unreadText;
  }else if(fresh){fresh.remove();}
}

function paymentLabelFor(doc,data){
  const name=normalizeText(doc?.displayName||doc?.name||doc?.type||"").toLowerCase();
  const type=String(doc?.type||"").toUpperCase();
  const payments=data?.event?.payments||{};
  const eventType=normalizeText(data?.event?.type).toLowerCase();
  const delayed=/entreprise|administration|collectivit|mairie|association/.test(eventType);
  if(type==="DEPOSIT_INVOICE"||name.includes("acompte"))return payments.depositPaid?{text:"🟢 Acompte reçu",cls:"is-paid"}:{text:"🟡 Acompte à venir",cls:""};
  if(type==="INVOICE"||name.includes("facture")){
    if(payments.balancePaid)return {text:"🟢 Règlement reçu",cls:"is-paid"};
    if(delayed)return {text:"🏢 Règlement selon échéance",cls:"is-info"};
    if(payments.depositPaid)return {text:"🟡 Solde à venir",cls:""};
    return {text:"🟡 Règlement à venir",cls:""};
  }
  return {text:"⚪ Document disponible",cls:"is-info"};
}

function decorateDocumentLinks(data){
  const docs=visibleClientDocuments(data);if(!docs.length)return;
  const links=[...document.querySelectorAll("a.portal-action,a[href]")];
  docs.forEach(doc=>{
    const label=normalizeText(doc?.displayName||doc?.name||"");const href=doc?.url||doc?.webViewLink||"";
    const link=links.find(a=>(href&&a.getAttribute("href")===href)||(label&&normalizeText(a.textContent).includes(label)));
    if(!link||link.dataset.lp28PaymentDecorated==="1")return;
    const status=paymentLabelFor(doc,data);const badge=document.createElement("span");badge.className=`lp28-payment-status ${status.cls}`.trim();badge.textContent=status.text;
    link.insertAdjacentElement("afterend",badge);link.dataset.lp28PaymentDecorated="1";
  });
}

async function loadPortalData(token){
  try{const r=await fetch(`/api/guest/${encodeURIComponent(token)}/portal`,{credentials:"include"});if(!r.ok)return null;return await r.json();}catch{return null;}
}

export function initOrganizerDocumentEnhancer(){
  const token=getOrganizerToken();if(!token)return;ensureStyles();
  let data=null,ids=[],unread=0,refreshQueued=false;
  const refreshDom=()=>{
    if(!data||refreshQueued)return;
    refreshQueued=true;
    requestAnimationFrame(()=>{
      refreshQueued=false;
      const nav=findDocumentsNav();addBadge(nav,ids.length,unread);decorateDocumentLinks(data);
      if(nav&&nav.dataset.lp28DocBound!=="1"){
        nav.dataset.lp28DocBound="1";
        nav.addEventListener("click",()=>{writeSeen(token,new Set(ids));unread=0;setTimeout(refreshDom,0);});
      }
    });
  };
  const observer=new MutationObserver(()=>refreshDom());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  loadPortalData(token).then(portal=>{
    if(!portal||portal.role!=="ORGANIZER")return;
    data=portal;const docs=visibleClientDocuments(portal);ids=docs.map(documentIdentity);
    const hasStored=localStorage.getItem(seenKey(token))!==null;const seen=readSeen(token);
    if(!hasStored){writeSeen(token,new Set(ids));unread=0;}else{unread=ids.filter(id=>!seen.has(id)).length;}
    refreshDom();
  });
  window.addEventListener("focus",async()=>{
    const portal=await loadPortalData(token);if(!portal||portal.role!=="ORGANIZER")return;
    data=portal;const docs=visibleClientDocuments(portal);ids=docs.map(documentIdentity);const seen=readSeen(token);unread=ids.filter(id=>!seen.has(id)).length;refreshDom();
  });
}
