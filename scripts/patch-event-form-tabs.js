const fs=require("fs");
const appPath="client/src/App.jsx";
let app=fs.readFileSync(appPath,"utf8");

function replaceOnce(from,to,label){
  if(!app.includes(from)) throw new Error(`[event-form-tabs] ${label}: bloc introuvable`);
  app=app.replace(from,to);
}

if(!app.includes('const [eventTab,setEventTab]=useState("event")')){
  replaceOnce(
    '  const [busy,setBusy]=useState(false);',
    '  const [busy,setBusy]=useState(false);\n  const [eventTab,setEventTab]=useState("event");',
    'state onglets'
  );
}

if(!app.includes('LP28_EVENT_FORM_TABS_V1')){
  const effect=`
  useEffect(()=>{
    const formEl=document.querySelector(".event-modal form");
    if(!formEl)return;
    const children=[...formEl.children];
    const tabBar=formEl.querySelector(".lp28-event-tabs");
    const classify=(text)=>{
      const t=String(text||"").toLowerCase();
      if(t.includes("organisateur")||t.includes("client"))return "client";
      if(t.includes("équipe")||t.includes("equipe")||t.includes("collaborateur"))return "team";
      if(t.includes("frais")||t.includes("déplacement")||t.includes("deplacement")||t.includes("commercial")||t.includes("acompte")||t.includes("solde")||t.includes("tarif")||t.includes("paiement")||t.includes("payé")||t.includes("paye")||t.includes("caution")||t.includes("règlement")||t.includes("reglement"))return "finance";
      if(t.includes("portail"))return "portal";
      if(t.includes("préparation")||t.includes("preparation")||t.includes("check")||t.includes("chargé")||t.includes("charge")||t.includes("départ")||t.includes("depart")||t.includes("retour"))return "prep";
      if(t.includes("matériel")||t.includes("materiel")||t.includes("impression")||t.includes("borne")||t.includes("jet")||t.includes("étincelle")||t.includes("etincelle")||t.includes("option"))return "material";
      if(t.includes("google")||t.includes("agenda")||t.includes("cadre photo")||t.includes("notes")||t.includes("note")||t.includes("technique"))return "tech";
      return "event";
    };
    let group="event";
    children.forEach((el,index)=>{
      if(el===tabBar){el.style.display="";return;}
      const tag=el.tagName;
      if(tag==="H3") group=classify(el.textContent);
      else if(tag==="DETAILS"){
        const summary=el.querySelector(":scope > summary");
        group=classify(summary?.textContent||el.textContent);
      }
      const txt=(el.textContent||"").trim();
      const always=/enregistrer|annuler/i.test(txt) && el.querySelector("button");
      if(always || index===children.length-1){el.style.display="";return;}
      el.style.display=group===eventTab?"":"none";
    });
  },[eventTab]);
`;
  replaceOnce('  const groups=[...new Set(MATERIALS.map(m=>m.group))];',effect+'\n  const groups=[...new Set(MATERIALS.map(m=>m.group))];','effet filtrage onglets');

  const tabs=`
      <style>{\`
        /* LP28_EVENT_FORM_TABS_V1 */
        .lp28-event-tabs{position:sticky;top:0;z-index:12;display:flex;gap:7px;overflow-x:auto;padding:10px 0 12px;margin:0 0 14px;background:linear-gradient(180deg,rgba(17,17,19,.98),rgba(17,17,19,.94) 78%,rgba(17,17,19,0));scrollbar-width:thin}
        .lp28-event-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.13)!important;background:#17181c!important;color:#d7d9df!important;border-radius:11px!important;padding:9px 12px!important;font-size:12px!important;font-weight:800!important;white-space:nowrap;transition:.16s ease}
        .lp28-event-tab:hover{border-color:rgba(70,140,255,.55)!important;transform:translateY(-1px)}
        .lp28-event-tab.active{background:linear-gradient(135deg,rgba(35,111,220,.38),rgba(25,62,123,.35))!important;border-color:#3b82f6!important;color:#fff!important;box-shadow:0 0 0 1px rgba(59,130,246,.12) inset}
        .event-modal form>h3{margin-top:8px}
        @media(max-width:700px){.lp28-event-tabs{margin-left:-4px;margin-right:-4px;padding-left:4px;padding-right:4px}.lp28-event-tab{padding:8px 10px!important;font-size:11px!important}}
      \`}</style>
      <div className="lp28-event-tabs" role="tablist" aria-label="Sections de l’événement">
        {[
          ["event","📅 Événement"],
          ["client","👤 Client"],
          ["team","👷 Équipe"],
          ["finance","💰 Finances"],
          ["material","📦 Matériel"],
          ["portal","🌐 Portail"],
          ["prep","✅ Préparation"],
          ["tech","⚙️ Technique & notes"]
        ].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={eventTab===key} className={eventTab===key?"lp28-event-tab active":"lp28-event-tab"} onClick={()=>setEventTab(key)}>{label}</button>)}
      </div>`;
  replaceOnce('    <form onSubmit={save}>','    <form onSubmit={save}>'+tabs,'barre onglets');
}

fs.writeFileSync(appPath,app,"utf8");
console.log("[event-form-tabs] OK: formulaire événement organisé par onglets");
