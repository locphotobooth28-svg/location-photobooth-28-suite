import React, {useCallback,useEffect,useMemo,useState} from "react";

// LP28 — Publication de disponibilités de matériel (proposition commerciale),
// ou dates confirmées personnellement, selon un filtre explicite.
// Toujours tenir compte des événements, devis, options, blocages et indisponibilités.
// La publication générée impose une confirmation des horaires / de l'intervention.
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
  const [publicationMode,setPublicationMode]=useState("material");
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
      // Une option immobilise sa borne, un devis la rend provisoirement indisponible
      // dans les propositions publiques, mais pas les autres bornes.
      const confirmed=matches.some(e=>HOLD.has(String(e.bookingStatus||"CONFIRMED").toUpperCase())||e.status==="IN_PROGRESS");
      const pending=matches.some(e=>PENDING.has(String(e.bookingStatus||"").toUpperCase()));
      return {...c,confirmed,pending,available:!confirmed&&!pending};
    });
    const availableCameras=cameras.filter(c=>c.available);
    const occupied=matched.some(e=>HOLD.has(String(e.bookingStatus||"CONFIRMED").toUpperCase())||e.status==="IN_PROGRESS");
    const pending=matched.some(e=>PENDING.has(String(e.bookingStatus||"").toUpperCase()));
    // Une prestation sans borne identifiée est à vérifier : on ne peut pas
    // calculer quel appareil physique elle mobilise.
    const unspecified=matched.some(e=>!CAMERAS.some(c=>involvedMaterial(e).includes(c.material)));
    const countLabel=availableCameras.length+" borne"+(availableCameras.length>1?"s":"")+" libre"+(availableCameras.length>1?"s":"")+" sur 3";
    const names=availableCameras.map(c=>c.name).join(", ");
    let kind="UNKNOWN",reason=countLabel+" ("+names+") · disponibilité personnelle à confirmer";
    if(familyBlock){kind="BLOCKED";reason="Non réservable (planning familial) · "+countLabel;}
    else if(personal==="UNAVAILABLE"){kind="BLOCKED";reason="Indisponibilité personnelle · "+countLabel;}
    else if(availableCameras.length===0){kind="FULL";reason="Toutes les bornes sont réservées, en option ou concernées par un devis";}
    else if(unspecified){kind="REVIEW";reason=countLabel+" ("+names+") · prestation sans borne identifiée : vérification nécessaire";}
    else if(personal!=="AVAILABLE"){}
    else{kind="FREE";reason=countLabel+" ("+names+") · horaires de livraison et reprise à confirmer";}
    return {date,personal,familyBlock,cameras,availableCameras,kind,reason,occupied,pending,unspecified};
  }),[days,entries,blocks,events]);

  const counts=useMemo(()=>records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{FREE:0,REVIEW:0,BLOCKED:0,UNKNOWN:0,FULL:0}),[records]);
  // Mode matériel : une disponibilité personnelle non renseignée ne doit pas bloquer
  // la communication sur une borne libre. Une indisponibilité personnelle
  // explicitement déclarée continue en revanche de bloquer la date.
  const materialDates=records.filter(r=>
    r.availableCameras.length>0 && !r.familyBlock &&
    r.personal!=="UNAVAILABLE" && !r.unspecified
  );
  const publishable=materialDates.filter(r=>
    (publicationMode==="material" || r.personal==="AVAILABLE") &&
    (!weekendOnly||weekendsOnlyDate(r.date))
  );
  const publishedDates=publishable.slice(0,10);
  const generated=useMemo(()=>{
    if(!loaded||!publishedDates.length)return "";
    const labels=publishedDates.map(r=>{
      const n=r.availableCameras.length;
      const label=n===3?"3 bornes disponibles":n+" borne"+(n>1?"s":"")+" disponible"+(n>1?"s":"");
      return "📅 "+fullDate(r.date)+" — "+label+" : "+r.availableCameras.map(c=>c.name).join(", ");
    }).join("\n");
    const more=publishable.length>10?"\n... et d'autres dates sur demande.":"";
    const flashTitle=publishable.length===1
      ?"🚨 FLASH INFO – UNE DATE ENCORE DISPONIBLE ! 📸"
      :"🚨 FLASH INFO – DISPONIBILITÉS PHOTOBOOTH ! 📸";
    if(channel==="story")return flashTitle+"\n\nLOCATION PHOTOBOOTH 28\n\n"+monthLabel(month).toUpperCase()+
      "\n\n"+labels+more+
      "\n\n💌 Contactez-nous pour votre devis\n📞 07 56 83 21 85\n🌐 www.locationphotobooth28.fr"+
      "\n\n*Équipe, livraison et installation à confirmer.*";
    return flashTitle+
      "\n\n🎉 Vous organisez un mariage, un anniversaire, une soirée ou un événement professionnel ?"+
      "\n\n📅 Nos bornes encore disponibles en "+monthLabel(month)+" :\n"+labels+more+
      "\n\n✨ Offrez à vos invités des souvenirs inoubliables !"+
      "\n\n📩 Contactez-nous pour vérifier les horaires et recevoir votre devis personnalisé."+
      "\n📞 07 56 83 21 85\n🌐 www.locationphotobooth28.fr"+
      (channel==="instagram"?"\n\n#Photobooth28 #EureEtLoir #Photobooth #Mariage #Anniversaire #FlashInfo":"")+
      "\n\n*Disponibilité des bornes sous réserve de confirmation de notre équipe, des horaires de livraison/installation et de reprise. Dates susceptibles d'évoluer.*";
  },[loaded,publishable,month,channel,publicationMode]);
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

  return <section className="panel" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",alignItems:"stretch",width:"100%",minWidth:0,gap:13,marginBottom:16,border:"1px solid rgba(214,185,79,.55)"}}>
    <div style={{...flex,justifyContent:"space-between"}}>
      <div><div className="eyebrow">ADMIN LP28 · CONFIDENTIEL</div><h2 style={{margin:"4px 0"}}>📣 Publications et disponibilités personnelles</h2><p className="muted" style={{margin:0}}>LP28 vérifie Lola, Nina et Gabin séparément et tient compte des réservations, devis et blocages. Tu peux annoncer les bornes encore libres sans renseigner tous tes jours personnels ; la disponibilité de l'équipe reste à confirmer avant réservation.</p></div>
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
      <p style={muted}>Le planning affiche les disponibilités du matériel, même si tes disponibilités personnelles ne sont pas renseignées. Enregistre tes véritables indisponibilités pour exclure automatiquement ces dates. Une journée seulement partiellement libre doit rester à confirmer.</p>
      <div style={{...flex,marginBottom:10}}>
        <div style={{...P,flex:1,minWidth:130}}><strong>📸 {materialDates.length}</strong><div style={muted}>Jours avec au moins 1 borne libre</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>✅ {counts.FREE}</strong><div style={muted}>Jours disponibles personnellement confirmés</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>🟠 {counts.REVIEW}</strong><div style={muted}>À confirmer</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>🚫 {counts.FULL}</strong><div style={muted}>3 bornes occupées / devis</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>⛔ {counts.BLOCKED}</strong><div style={muted}>Dates bloquées</div></div>
        <div style={{...P,flex:1,minWidth:130}}><strong>❔ {counts.UNKNOWN}</strong><div style={muted}>Perso. à confirmer (matériel visible)</div></div>
      </div>
      {loaded&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:7}}>
        {records.map(r=><button type="button" key={r.date} onClick={()=>setSelected(r.date)} title={r.reason}
          style={{textAlign:"left",background:selected===r.date?"rgba(214,185,79,.24)":"rgba(128,128,128,.06)",
          border:"1px solid "+(selected===r.date?"#d6b94f":"rgba(128,128,128,.24)"),
          borderRadius:10,padding:"9px 11px",color:"inherit"}}>
          <strong style={{display:"block"}}>{fmt(r.date)}</strong>
          <small style={{display:"block",marginTop:3}}>{r.availableCameras.length}/3 borne{r.availableCameras.length>1?"s":""} libre{r.availableCameras.length>1?"s":""}{r.availableCameras.length? " : "+r.availableCameras.map(c=>c.name).join(", "):""}</small>
          <small style={{display:"block",marginTop:2}}>{r.kind==="FREE"?"✅ Publiable":r.kind==="REVIEW"?"🟠 Réservation à vérifier":r.kind==="BLOCKED"?"⛔ Date bloquée":r.kind==="FULL"?"🚫 Plus de borne libre":"❔ Dispo. perso. à confirmer"}</small>
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
        <button type="button" className="primary" onClick={saveDay} disabled={saveBusy||!loaded}>{saveBusy?"Enregistrement…":"💾 Enregistrer ce jour"}</button>
      </div>
      {loaded&&(status!==(entries[selected]?.status||"UNKNOWN")||note!==(entries[selected]?.note||""))&&<p style={{color:"#eabf58",margin:"7px 0"}}>⚠️ Ce choix personnel n'est pas encore enregistré. Clique sur « Enregistrer ce jour » si tu souhaites conserver cette information.</p>}
      {records.find(r=>r.date===selected)&&(()=>{
        const r=records.find(x=>x.date===selected);
        return <div style={{marginTop:12}}>
          <p style={{...muted,marginBottom:8}}><strong>Analyse LP28 :</strong> {r.reason}.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
            {r.cameras.map(c=><div key={c.name} style={{border:"1px solid rgba(128,128,128,.3)",borderRadius:10,padding:10,minWidth:0}}>
              <strong>{c.icon} {c.name}</strong>
              <div style={{fontSize:12,marginTop:5}}>{c.confirmed?"🔴 Réservée / option":c.pending?"🟠 Devis en cours":"✅ Matériel libre"}</div>
            </div>)}
          </div>
          <p style={{...muted,fontSize:12,marginBottom:0}}>Disponibilité du matériel et disponibilité personnelle sont deux contrôles distincts. Vérifie la possibilité de livraison, installation et reprise même si une borne est libre.</p>
        </div>;
      })()}
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
      <div style={{...flex,margin:"6px 0 8px"}}>
        <label style={{display:"flex",gap:8,alignItems:"flex-start",minWidth:240}}>
          <input type="radio" name="lp28-publication-mode" checked={publicationMode==="material"} onChange={()=>{setPublicationMode("material");setManualEdit(false)}}/>
          <span><strong>📸 Bornes disponibles</strong><small style={{display:"block",...muted}}>Recommandé : proposition commerciale, intervention à confirmer</small></span>
        </label>
        <label style={{display:"flex",gap:8,alignItems:"flex-start",minWidth:240}}>
          <input type="radio" name="lp28-publication-mode" checked={publicationMode==="personal"} onChange={()=>{setPublicationMode("personal");setManualEdit(false)}}/>
          <span><strong>✅ Mes jours confirmés</strong><small style={{display:"block",...muted}}>N'utilise que les journées enregistrées comme personnellement disponibles</small></span>
        </label>
      </div>
      {loaded&&<p style={muted}>{publishable.length} date(s) compatibles avec le filtre, dont {publishedDates.length} affichée(s) dans le message. Les clients, devis et motifs personnels ne sont jamais publiés.</p>}
      {loaded&&publishable.length===0?<p style={muted}><strong>Aucune date correspondant aux filtres.</strong> {publicationMode==="personal"?"Choisis « Bornes disponibles » pour générer sans renseigner chaque jour personnel.":"Vérifie les blocages, devis, réservations et le filtre week-ends uniquement."}</p>:null}
      <textarea aria-label="Publication modifiable" value={draft} onChange={e=>{setDraft(e.target.value);setManualEdit(true)}} disabled={!loaded||!publishable.length}
        placeholder="Les dates vérifiées et le texte de publication apparaîtront ici."
        style={{boxSizing:"border-box",width:"100%",minHeight:225,padding:12,borderRadius:10,resize:"vertical"}}/>
      <div style={{...flex,marginTop:9}}>
        <button type="button" className="primary" disabled={!loaded||!publishable.length||!draft.trim()} onClick={copyText}>📋 Copier la publication</button>
        <button type="button" onClick={()=>{setDraft(generated);setManualEdit(false)}} disabled={!loaded}>↺ Régénérer</button>
        <small style={muted}>Publication manuelle uniquement. Ce message indique le stock, pas une promesse de livraison : confirme la disponibilité de ton équipe avant réservation.</small>
      </div>
    </div>
  </section>;
}
