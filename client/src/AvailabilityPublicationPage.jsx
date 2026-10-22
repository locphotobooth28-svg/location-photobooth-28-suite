import React, {useCallback,useEffect,useMemo,useState} from "react";

// LP28 — Les dates "libres" ne sont jamais déduites de l'absence de réservation.
// Publication uniquement après validation explicite de la disponibilité personnelle
// ET après contrôle des réservations, options, devis et blocages du planning.
const CAMERAS = [
  {name:"Lola",material:"Borne Photobooth Miroir Lola",icon:"🪞"},
  {name:"Nina",material:"Borne Photobooth Nina",icon:"📸"},
  {name:"Gabin",material:"Borne Photobooth Gabin",icon:"✨"}
];
const HOLD = new Set(["CONFIRMED","OPTION"]);
const PENDING = new Set(["QUOTE_SENT","QUOTE_DRAFT"]);
const SKIP = new Set(["DECLINED","CANCELLED","COMPLETED"]);
const todayIso=()=>{
  const d=new Date(),pad=n=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
};
const dateRange=month=>{
  if(!/^\d{4}-\d{2}$/.test(month))return [];
  const [y,m]=month.split("-").map(Number);
  if(y<2025||y>2040||m<1||m>12)return [];
  return Array.from({length:new Date(y,m,0).getDate()},(_,i)=>month+"-"+String(i+1).padStart(2,"0"));
};
const fmt=date=>new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"}).format(new Date(date+"T12:00:00"));
const fullDate=date=>new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date(date+"T12:00:00"));
const monthLabel=month=>new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric"}).format(new Date(month+"-01T12:00:00"));
const inRange=(date,from,to)=>Boolean(from)&&date>=String(from).slice(0,10)&&date<=String(to||from).slice(0,10);
const weekendsOnlyDate=date=>[0,6].includes(new Date(date+"T12:00:00").getDay());
const involvedMaterial=e=>{
  const materials=Array.isArray(e?.materials)?e.materials:[];
  return materials.map(m=>typeof m==="string"?m:String(m?.name||m?.material?.name||""));
};
const P={border:"1px solid rgba(214,185,79,.28)",borderRadius:15,padding:15,background:"rgba(120,120,120,.045)"};
const muted={opacity:.79,lineHeight:1.45};
const flex={display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"};
const btnSmall={padding:"7px 11px",borderRadius:10,minHeight:36};

export default function AvailabilityPublicationPage(){
  const [month,setMonth]=useState(()=>todayIso().slice(0,7));
  const [selected,setSelected]=useState(()=>todayIso());
  const [entries,setEntries]=useState({});
  const [events,setEvents]=useState([]);
  const [blocks,setBlocks]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [saveBusy,setSaveBusy]=useState(false);
  const [status,setStatus]=useState("UNKNOWN");
  const [note,setNote]=useState("");
  const [weekendOnly,setWeekendOnly]=useState(true);
  const [channel,setChannel]=useState("facebook");
  const [draft,setDraft]=useState("");
  const [manualEdit,setManualEdit]=useState(false);

  const reload=useCallback(async()=>{
    setLoading(true);setError("");setLoaded(false);
    try{
      const endpoints=["/api/events","/api/account/family-planning/blocks","/api/admin/personal-availability"];
      const result=await Promise.all(endpoints.map(async url=>{
        const r=await fetch(url,{credentials:"same-origin",cache:"no-store"});
        const d=await r.json().catch(()=>({}));
        if(!r.ok||d.ok===false)throw new Error(d.message||"Données indisponibles.");
        return d;
      }));
      if(!Array.isArray(result[0].events)||!Array.isArray(result[1].blocks)||!result[2].entries)
        throw new Error("Le planning ne renvoie pas toutes les données nécessaires.");
      setEvents(result[0].events);setBlocks(result[1].blocks);setEntries(result[2].entries);setLoaded(true);
    }catch(e){setError(e.message||"Impossible de vérifier le planning.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{reload()},[reload]);
  useEffect(()=>{
    setStatus(entries[selected]?.status||"UNKNOWN");
    setNote(entries[selected]?.note||"");
  },[entries,selected]);

  const days=useMemo(()=>dateRange(month).filter(d=>d>=todayIso()),[month]);
  const records=useMemo(()=>days.map(date=>{
    const personal=entries[date]?.status||"UNKNOWN";
    const familyBlock=blocks.some(b=>inRange(date,b.startAt,b.endAt));
    const matched=events.filter(e=>{
      const code=String(e.bookingStatus||"CONFIRMED").toUpperCase();
      return !e.archived&&!SKIP.has(code)&&inRange(date,e.date,e.pickupDate);
    });
    const cameras=CAMERAS.map(c=>{
      const matches=matched.filter(e=>involvedMaterial(e).includes(c.material));
      return {...c,
        confirmed:matches.some(e=>HOLD.has(e.bookingStatus)||e.status==="IN_PROGRESS"),
        pending:matches.some(e=>PENDING.has(e.bookingStatus))
      };
    });
    const occupied=matched.some(e=>HOLD.has(e.bookingStatus)||e.status==="IN_PROGRESS");
    const pending=matched.some(e=>PENDING.has(e.bookingStatus));
    let kind="UNKNOWN",reason="Disponibilité personnelle non renseignée";
    if(familyBlock){kind="BLOCKED";reason="Date non réservable (planning familial)";}
    else if(personal==="UNAVAILABLE"){kind="BLOCKED";reason="Indisponibilité personnelle";}
    else if(personal!=="AVAILABLE"){}
    else if(occupied){kind="REVIEW";reason="Réservation / option : vérifier installations et reprises";}
    else if(pending){kind="REVIEW";reason="Devis en cours : date à confirmer";}
    else if(cameras.every(c=>c.confirmed||c.pending)){kind="BLOCKED";reason="Aucune borne libre";}
    else{kind="FREE";reason="Disponible personnellement, aucune occupation signalée";}
    return {date,personal,familyBlock,cameras,kind,reason,occupied,pending};
  }),[days,entries,blocks,events]);

  const counts=useMemo(()=>records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{FREE:0,REVIEW:0,BLOCKED:0,UNKNOWN:0}),[records]);
  const publishable=records.filter(r=>r.kind==="FREE"&&(!weekendOnly||weekendsOnlyDate(r.date)));
  const publishedDates=publishable.slice(0,10);
  const generated=useMemo(()=>{
    if(!loaded||!publishedDates.length)return "";
    const labels=publishedDates.map(r=>"📅 "+fullDate(r.date)).join("\n");
    const more=publishable.length>10?"\n... et d'autres dates sur demande.":"";
    if(channel==="story")return "📸 LOCATION PHOTOBOOTH 28\n\nDATES ENCORE DISPONIBLES\n"+monthLabel(month).toUpperCase()+"\n\n"+labels+more+"\n\n💌 Demandez votre devis\nwww.locationphotobooth28.fr\n\nSous réserve de validation de la prestation.";
    const preface=channel==="instagram"?"📸 Des souvenirs inoubliables avec Location Photobooth 28 !":"📸 Vos prochains événements se préparent avec Location Photobooth 28 !";
    return preface+"\n\nQuelques dates disponibles en "+monthLabel(month)+" :\n"+labels+more+
      "\n\n🪞 Borne miroir Lola · 📸 Nina · ✨ Gabin\nMariages, anniversaires, soirées et événements professionnels.\n\n"+
      "📩 Contactez-nous pour confirmer le matériel, les horaires et obtenir votre devis personnalisé.\n🌐 www.locationphotobooth28.fr\n"+
      (channel==="instagram"?"\n#Photobooth28 #EureEtLoir #Photobooth #Mariage #Anniversaire":"")+
      "\n\n*Dates susceptibles d'évoluer selon les réservations.*";
  },[loaded,publishable,month,channel]);
  useEffect(()=>{if(!manualEdit)setDraft(generated)},[generated,manualEdit]);

  async function saveDay(){
    if(!selected||saveBusy)return;
    setSaveBusy(true);setError("");
    try{
      const r=await fetch("/api/admin/personal-availability",{
        method:"PUT",headers:{"Content-Type":"application/json"},credentials:"same-origin",
        body:JSON.stringify({date:selected,status,note})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw new Error(d.message||"Sauvegarde impossible.");
      setEntries(d.entries);setManualEdit(false);
    }catch(e){setError(e.message||"Erreur de sauvegarde.");}
    finally{setSaveBusy(false);}
  }

  async function copyText(){
    if(!generated||!draft.trim()||!publishable.length)return;
    try{await navigator.clipboard.writeText(draft);alert("Publication copiée. Vérifie toujours les dates avant de publier.");}
    catch{window.prompt("Copier la publication :",draft);}
  }

  return <section className="panel" style={{display:"grid",gap:13,marginBottom:16,border:"1px solid rgba(214,185,79,.55)"}}>
    <div style={{...flex,justifyContent:"space-between"}}>
      <div><div className="eyebrow">ADMIN LP28 · CONFIDENTIEL</div><h2 style={{margin:"4px 0"}}>📣 Publications et disponibilités personnelles</h2><p className="muted" style={{margin:0}}>Une date n'est publiable que si tu t'es déclaré disponible et que le planning n'affiche aucune réservation, option, devis ou période bloquée.</p></div>
      <button type="button" onClick={reload} disabled={loading} style={btnSmall}>{loading?"Actualisation…":"🔄 Actualiser planning et devis"}</button>
    </div>
    {error&&<div className="alert" role="alert">{error}</div>}
    {!loaded&&<p style={muted}>{loading?"Chargement des données du planning…":"Analyse indisponible : aucune date ne peut être annoncée."}</p>}
    <div style={P}>
      <div style={flex}>
        <label style={{display:"grid",gap:5,flex:"0 1 220px"}}>Mois étudié
          <input type="month" min={todayIso().slice(0,7)} max="2040-12" value={month} onChange={e=>{setMonth(e.target.value);setSelected(e.target.value+"-01");setManualEdit(false)}}/>
        </label>
        <label style={{...flex,marginLeft:"auto",fontWeight:700}}>
          <input type="checkbox" checked={weekendOnly} onChange={e=>{setWeekendOnly(e.target.checked);setManualEdit(false)}}/>
          Publications : week-ends uniquement
        </label>
      </div>
      <p style={muted}>Statut personnel enregistré sur le serveur LP28. À renseigner selon tes jours VINCI, ta vie familiale et tes possibilités réelles de livraison / animation. Une journée partiellement libre doit rester « à confirmer ».</p>
      <div style={{...flex,marginBottom:10}}>
        <div style={{...P,flex:1,minWidth:130}}><strong>✅ {counts.FREE}</strong><div style={muted}>Jours potentiellement libres</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>🟠 {counts.REVIEW}</strong><div style={muted}>À confirmer</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>🚫 {counts.BLOCKED}</strong><div style={muted}>Indisponibles</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>❔ {counts.UNKNOWN}</strong><div style={muted}>Perso. non renseignée</div></div>
      </div>
      {loaded&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:7}}>
        {records.map(r=><button type="button" key={r.date} onClick={()=>setSelected(r.date)} title={r.reason}
          style={{textAlign:"left",background:selected===r.date?"rgba(214,185,79,.24)":"rgba(128,128,128,.06)",
          border:"1px solid "+(selected===r.date?"#d6b94f":"rgba(128,128,128,.24)"),
          borderRadius:10,padding:"9px 11px",color:"inherit"}}>
          <strong style={{display:"block"}}>{fmt(r.date)}</strong>
          <small>{r.kind==="FREE"?"✅ Libre":r.kind==="REVIEW"?"🟠 À confirmer":r.kind==="BLOCKED"?"🚫 Indisponible":"❔ Perso. inconnue"}</small>
        </button>)}
      </div>}
    </div>
    <div style={P}>
      <h3 style={{marginTop:0}}>🗓️ Ma disponibilité — {fullDate(selected)}</h3>
      <div style={flex}>
        <label style={{display:"grid",gap:5,flex:"1 1 250px"}}>Disponibilité personnelle
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="UNKNOWN">❔ Non renseignée / à confirmer</option>
            <option value="AVAILABLE">✅ Disponible personnellement, toute la journée</option>
            <option value="UNAVAILABLE">🚫 Indisponible personnellement</option>
          </select>
        </label>
        <label style={{display:"grid",gap:5,flex:"1 1 250px"}}>Note privée (non publiée)
          <input value={note} maxLength={180} onChange={e=>setNote(e.target.value)} placeholder="Travail VINCI, repos, famille…"/>
        </label>
        <button type="button" className="primary" onClick={saveDay} disabled={saveBusy||!loaded}>{saveBusy?"Enregistrement…":"💾 Enregistrer"}</button>
      </div>
      {records.find(r=>r.date===selected)&&<p style={{...muted,marginBottom:0}}><strong>Analyse LP28 :</strong> {records.find(r=>r.date===selected).reason}.</p>}
    </div>
    <div style={P}>
      <div style={{...flex,justifyContent:"space-between"}}>
        <h3 style={{margin:"0 0 8px"}}>✍️ Générer un message pour les réseaux</h3>
        <label style={{display:"grid",gap:5}}>Format
          <select value={channel} onChange={e=>{setChannel(e.target.value);setManualEdit(false)}}>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="story">Story</option>
          </select>
        </label>
      </div>
      {loaded&&<p style={muted}>{publishable.length} date(s) remplissant les critères, dont {publishedDates.length} affichée(s) dans le message. Les noms des clients, devis et motifs personnels ne sont jamais intégrés à la publication.</p>}
      {loaded&&publishable.length===0?<p style={muted}><strong>Aucune date publiable avec certitude.</strong> Renseigne d'abord tes disponibilités personnelles, puis actualise les devis. Aucune disponibilité n'est inventée.</p>:null}
      <textarea aria-label="Publication modifiable" value={draft} onChange={e=>{setDraft(e.target.value);setManualEdit(true)}} disabled={!loaded||!publishable.length}
        placeholder="Les dates vérifiées et le texte de publication apparaîtront ici."
        style={{boxSizing:"border-box",width:"100%",minHeight:225,padding:12,borderRadius:10,resize:"vertical"}}/>
      <div style={{...flex,marginTop:9}}>
        <button type="button" className="primary" disabled={!loaded||!publishable.length||!draft.trim()} onClick={copyText}>📋 Copier la publication</button>
        <button type="button" onClick={()=>{setDraft(generated);setManualEdit(false)}} disabled={!loaded}>↺ Régénérer</button>
        <small style={muted}>Publication manuelle uniquement. Revalider les horaires et l'inventaire avant de confirmer au client.</small>
      </div>
    </div>
  </section>;
}
