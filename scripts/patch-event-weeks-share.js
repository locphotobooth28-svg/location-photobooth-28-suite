const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');
let changes=0;

function replaceOnce(oldValue,newValue,label){
  if(!src.includes(oldValue)){
    console.error(`[event-weeks-share] pattern missing: ${label}`);
    process.exit(1);
  }
  src=src.replace(oldValue,newValue);
  changes++;
  console.log(`[event-weeks-share] OK: ${label}`);
}

// Libellés des 5 périodes.
replaceOnce('label:`📅 ÉVÉNEMENTS DE LA SEMAINE — ${formatLp28WeekRange(', 'label:`📅 ÉVÉNEMENTS CETTE SEMAINE — ${formatLp28WeekRange(', 'current week label');
replaceOnce('label:`📅 SEMAINE +1 — ${formatLp28WeekRange(', 'label:`📅 ÉVÉNEMENTS SEMAINE PROCHAINE — ${formatLp28WeekRange(', 'next week label');
replaceOnce('label:`📅 SEMAINE +2 — ${formatLp28WeekRange(', 'label:`📅 ÉVÉNEMENTS DANS 2 SEMAINES — ${formatLp28WeekRange(', 'week +2 label');
replaceOnce('label:`📅 SEMAINE +3 — ${formatLp28WeekRange(', 'label:`📅 ÉVÉNEMENTS DANS 3 SEMAINES — ${formatLp28WeekRange(', 'week +3 label');
replaceOnce('label:`📁 ÉVÉNEMENTS À VENIR — À PARTIR DU ${formatLp28ShortDate(', 'label:`📁 ÉVÉNEMENTS À VENIR — À PARTIR DU ${formatLp28ShortDate(', 'future label');

// Vue "À venir" en colonnes hebdomadaires, avec défilement horizontal si l'écran est trop petit.
replaceOnce(
'        <div className="events-list">\n          {filtered.length===0 && <div className="empty-state">',
'        <div className={eventTab==="upcoming"?"events-list lp28-week-columns":"events-list"}>\n          {filtered.length===0 && <div className="empty-state">',
'weekly columns container'
);

const cssNeedle='      @media(max-width:760px){.booth-live-pill{font-size:.62rem;padding:2px 6px}.lp28-ops-banner{height:38px;border-radius:9px;font-size:.78rem}.event-list-section-title{font-size:.74rem}}';
const cssAdd=`      .lp28-week-columns{display:grid!important;grid-template-columns:repeat(5,minmax(330px,1fr))!important;gap:14px!important;align-items:start;overflow-x:auto;padding-bottom:10px;scrollbar-width:thin;}
      .lp28-week-columns .event-list-section-title{grid-row:1;margin-top:0;position:sticky;top:0;z-index:2;min-height:46px;display:flex;align-items:center;}
      .lp28-week-columns .event-list-section-title.week-current,.lp28-week-columns .event-week-card.week-current{grid-column:1;}
      .lp28-week-columns .event-list-section-title.week-1,.lp28-week-columns .event-week-card.week-1{grid-column:2;}
      .lp28-week-columns .event-list-section-title.week-2,.lp28-week-columns .event-week-card.week-2{grid-column:3;}
      .lp28-week-columns .event-list-section-title.week-3,.lp28-week-columns .event-week-card.week-3{grid-column:4;}
      .lp28-week-columns .event-list-section-title.week-later,.lp28-week-columns .event-week-card.week-later{grid-column:5;}
      .lp28-week-columns .event-card{grid-template-columns:1fr!important;min-width:0;}
      .lp28-week-columns .event-date{border-right:0!important;border-bottom:1px solid rgba(148,163,184,.18);}
      .lp28-week-columns .event-content{min-width:0;}
      .lp28-week-columns .event-actions{display:flex;flex-wrap:wrap;gap:7px;}
      .lp28-week-columns .event-actions button,.lp28-week-columns .event-actions summary{font-size:.76rem;}
      @media(max-width:1250px){.lp28-week-columns{grid-template-columns:repeat(5,minmax(310px,310px))!important;}}
${cssNeedle}`;
replaceOnce(cssNeedle,cssAdd,'weekly columns CSS');

// Remplace la fenêtre Partager par une version fiche événement + copie / WhatsApp / Messenger / SMS.
const shareStart=src.indexOf('function ShareModal({event,onClose}) {');
const shareEnd=src.indexOf('\n\nfunction AdminPlanningCalendar',shareStart);
if(shareStart<0||shareEnd<0){
  console.error('[event-weeks-share] ShareModal boundaries missing');
  process.exit(1);
}
const newShare=`function ShareModal({event,onClose}) {
  const [share,setShare]=useState(null);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{fetch(\`/api/events/\${event.id}/share\`).then(r=>r.json()).then(setShare)},[event.id]);
  if(!share) return <div className="modal-backdrop"><div className="share-modal">Chargement…</div></div>;

  const eventDate=event.date?new Date(event.date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):"Date non renseignée";
  const ficheUrl=share.organizerUrl||share.guestUrl||window.location.href;
  const ficheText=[
    \`📸 Location Photobooth 28\`,
    \`📅 \${event.name}\`,
    \`Date : \${eventDate}\`,
    event.time?\`Heure : \${event.time}\`:null,
    event.address?\`Lieu : \${event.address}\`:null,
    \`Fiche événement : \${ficheUrl}\`
  ].filter(Boolean).join("\\n");
  const whatsapp=\`https://wa.me/?text=\${encodeURIComponent(ficheText)}\`;
  const sms=\`sms:?&body=\${encodeURIComponent(ficheText)}\`;
  const messenger=\`fb-messenger://share/?link=\${encodeURIComponent(ficheUrl)}\`;
  async function copyFiche(){
    try{await navigator.clipboard.writeText(ficheText);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{alert("Copie impossible sur cet appareil.");}
  }

  return <div className="modal-backdrop"><div className="share-modal">
    <div className="modal-head"><div><div className="eyebrow">PARTAGER LA FICHE ÉVÉNEMENT</div><h2>{event.name}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>
    <div className="card" style={{marginBottom:14}}>
      <strong>{eventDate}</strong>
      {event.address&&<div className="muted" style={{marginTop:5}}>📍 {event.address}</div>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
      <button type="button" className="secondary-btn" onClick={copyFiche}>{copied?"✅ Fiche copiée":"🔗 Copier la fiche"}</button>
      <a className="primary whatsapp-link" href={whatsapp} target="_blank" rel="noreferrer">💬 WhatsApp</a>
      <a className="secondary-btn" href={messenger}>💜 Messenger</a>
      <a className="secondary-btn" href={sms}>💬 SMS</a>
    </div>
    <details style={{marginTop:16}}>
      <summary style={{cursor:"pointer",fontWeight:800}}>Liens LP28</summary>
      <div style={{marginTop:10}}>
        <label>Lien invités</label><div className="copy-row"><input readOnly value={share.guestUrl||""}/><button className="secondary-btn" onClick={()=>navigator.clipboard.writeText(share.guestUrl||"")}>Copier</button></div>
        <label>Lien organisateur</label><div className="copy-row"><input readOnly value={share.organizerUrl||""}/><button className="secondary-btn" onClick={()=>navigator.clipboard.writeText(share.organizerUrl||"")}>Copier</button></div>
      </div>
    </details>
  </div></div>;
}`;
src=src.slice(0,shareStart)+newShare+src.slice(shareEnd);
changes++;
console.log('[event-weeks-share] OK: enhanced ShareModal');

// Ajoute le partage directement depuis "Voir l'événement".
replaceOnce(
'function EventConsultationModal({event,onClose,onEdit,onDocuments,isAdmin=false,canEventAction=()=>false}) {',
'function EventConsultationModal({event,onClose,onEdit,onDocuments,onShare,isAdmin=false,canEventAction=()=>false}) {',
'EventConsultationModal onShare prop'
);
replaceOnce(
'          {(isAdmin||canEventAction("documents"))&&<button type="button" onClick={()=>onDocuments(event)}>📁 Documents</button>}',
'          {(isAdmin||canEventAction("share"))&&<button type="button" onClick={()=>onShare&&onShare(event)}>📤 Partager la fiche</button>}\n          {(isAdmin||canEventAction("documents"))&&<button type="button" onClick={()=>onDocuments(event)}>📁 Documents</button>}',
'share button in consultation modal'
);
replaceOnce(
'        onDocuments={event=>{\n          setDocumentEvent(event);\n          setViewEvent(null);\n        }}\n        isAdmin={isAdmin}',
'        onDocuments={event=>{\n          setDocumentEvent(event);\n          setViewEvent(null);\n        }}\n        onShare={event=>{\n          setShareEvent(event);\n          setViewEvent(null);\n        }}\n        isAdmin={isAdmin}',
'wire consultation share action'
);

fs.writeFileSync(file,src,'utf8');
console.log(`[event-weeks-share] completed: ${changes} changes`);
