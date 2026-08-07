
import React, { useEffect, useMemo, useState } from "react";

const SITE = "https://www.locationphotobooth28.fr";
const FACEBOOK = "https://www.facebook.com/location.photobooth.28/";

const MATERIALS = [
  {group:"Bornes & photo", icon:"🪞", name:"Borne Photobooth Miroir Lola"},
  {group:"Bornes & photo", icon:"📸", name:"Borne Photobooth Nina"},
  {group:"Bornes & photo", icon:"✨", name:"Borne Photobooth Gabin"},
  {group:"Bornes & photo", icon:"📷", name:"Appareil photo Reflex Nikon D7200"},
  {group:"Bornes & photo", icon:"💡", name:"Flash + parapluie"},
  {group:"Impressions", icon:"🚫", name:"Forfait sans aucune impression"},
  {group:"Impressions", icon:"🖨️", name:"Forfait 100 impressions"},
  {group:"Impressions", icon:"🖨️", name:"Forfait 200 impressions"},
  {group:"Impressions", icon:"🖨️", name:"Forfait 300 impressions"},
  {group:"Impressions", icon:"🖨️", name:"Forfait 400 impressions"},
  {group:"Impressions", icon:"🖨️", name:"Forfait 700 impressions"},
  {group:"Options", icon:"☎️", name:"Location livre d'or audio"},
  {group:"Options", icon:"🍹", name:"Location Fontaine + 1 ou 2 contenant de 30L"},
  {group:"Options", icon:"🔊", name:"Location enceinte LG 1000w + 2 micros"},
  {group:"Options", icon:"🎤", name:"Location 2 micros JBL"},
  {group:"Options", icon:"🎶", name:"Location Écran Karaoké"},
  {group:"Options", icon:"🎶", name:"Location Écran Karaoké + enceinte + 2 micros"},
  {group:"Options", icon:"✨", name:"Location Kit Jet d'étincelle"},
  {group:"Options", icon:"🎗️", name:"6 Poteaux + corde"},
  {group:"Options", icon:"🔴", name:"6 Poteaux + corde avec tapis rouge de cérémonie"}
];

const EMPTY_EVENT = {
  name:"", type:"Mariage", date:"", time:"", address:"", guestCount:"",
  organizerName:"", organizerPhone:"", organizerEmail:"",
  materials:[], notes:"",
  payments:{depositPaid:false,balancePaid:false,cautionReceived:false,cautionReturned:false}
};

function Login({ onLogin }) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  async function submit(e){
    e.preventDefault(); setError("");
    const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const d=await r.json();
    if(!r.ok) return setError(d.message||"Connexion impossible.");
    onLogin();
  }
  return <div className="login-shell"><div className="login-card">
    <img className="login-logo" src="/logo.jpg" alt="Location Photobooth 28"/>
    <div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div><h1>Administration</h1>
    <p className="muted">Connecte-toi pour gérer tes événements.</p>
    {error&&<div className="alert">{error}</div>}
    <form onSubmit={submit}><label>Adresse e-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <label>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
    <button className="primary">Se connecter</button></form>
    <div className="login-links"><a href={SITE} target="_blank">🌐 Site internet</a><a href={FACEBOOK} target="_blank">ⓕ Facebook</a></div>
  </div></div>
}

function EventForm({event,onClose,onSaved}) {
  const [form,setForm]=useState(event ? JSON.parse(JSON.stringify(event)) : JSON.parse(JSON.stringify(EMPTY_EVENT)));
  const [busy,setBusy]=useState(false);
  const set=(key,val)=>setForm(f=>({...f,[key]:val}));
  const toggleMaterial=(name)=>setForm(f=>({...f,materials:f.materials.includes(name)?f.materials.filter(x=>x!==name):[...f.materials,name]}));
  const togglePayment=(key)=>setForm(f=>({...f,payments:{...f.payments,[key]:!f.payments[key]}}));

  async function save(e){
    e.preventDefault();
    setBusy(true);
    try {
      const method=event?"PUT":"POST";
      const url=event?`/api/events/${event.id}`:"/api/events";
      const r=await fetch(url,{
        method,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(form)
      });

      let d = {};
      try { d = await r.json(); } catch {}

      if(!r.ok) {
        if (d.error === "material_conflict" && d.conflicts?.length) {
          const details = d.conflicts.map(c => `• ${c.material} — déjà réservée pour ${c.eventName}`).join("\n");
          alert(`⚠️ Conflit de réservation\n\n${details}`);
          return;
        }
        alert(d.message || `Erreur serveur (${r.status})`);
        return;
      }

      onSaved(d.event);
    } catch (err) {
      console.error(err);
      alert("Impossible de joindre le serveur. Vérifie que npm start fonctionne.");
    } finally {
      setBusy(false);
    }
  }

  const groups=[...new Set(MATERIALS.map(m=>m.group))];
  return <div className="modal-backdrop"><div className="event-modal">
    <div className="modal-head"><div><div className="eyebrow">{event?"MODIFIER":"NOUVEL"} ÉVÉNEMENT</div><h2>{event?"Modifier l'événement":"Créer un événement"}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>
    <form onSubmit={save}>
      <h3>Informations générales</h3>
      <div className="form-grid">
        <div><label>Nom de l'événement *</label><input value={form.name} onChange={e=>set("name",e.target.value)} required/></div>
        <div><label>Type</label><select value={form.type} onChange={e=>set("type",e.target.value)}><option>Mariage</option><option>Anniversaire</option><option>Baptême</option><option>Entreprise</option><option>Association</option><option>Autre</option></select></div>
        <div><label>Date *</label><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} required/></div>
        <div><label>Heure</label><input type="time" value={form.time} onChange={e=>set("time",e.target.value)}/></div>
        <div className="wide"><label>Adresse</label><input value={form.address} onChange={e=>set("address",e.target.value)}/></div>
        <div><label>Nombre d'invités</label><input type="number" min="0" value={form.guestCount} onChange={e=>set("guestCount",e.target.value)}/></div>
      </div>

      <h3>Organisateur</h3>
      <div className="form-grid">
        <div><label>Nom / prénom</label><input value={form.organizerName} onChange={e=>set("organizerName",e.target.value)}/></div>
        <div><label>Téléphone</label><input value={form.organizerPhone} onChange={e=>set("organizerPhone",e.target.value)}/></div>
        <div><label>E-mail</label><input type="email" value={form.organizerEmail} onChange={e=>set("organizerEmail",e.target.value)}/></div>
      </div>

      <h3>Matériel et options</h3>
      {groups.map(group=><div key={group} className="material-group"><h4>{group}</h4><div className="materials-grid">
        {MATERIALS.filter(m=>m.group===group).map(m=><button type="button" key={m.name} className={`material-card ${form.materials.includes(m.name)?"selected":""}`} onClick={()=>toggleMaterial(m.name)}>
          <span className="material-icon">{m.icon}</span><span>{m.name}</span><b>{form.materials.includes(m.name)?"✓":"+"}</b>
        </button>)}
      </div></div>)}

      <h3>Paiement et caution</h3>
      <div className="checks-grid">
        {[["depositPaid","Acompte reçu"],["balancePaid","Solde payé"],["cautionReceived","Caution reçue"],["cautionReturned","Caution rendue"]].map(([key,label])=>
          <label className={`status-check ${form.payments[key]?"checked":""}`} key={key}><input type="checkbox" checked={form.payments[key]} onChange={()=>togglePayment(key)}/><span>{form.payments[key]?"✓":"○"} {label}</span></label>
        )}
      </div>

      <label>Notes privées</label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Visible uniquement par l'administrateur..."/>

      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>{busy?"Enregistrement...":event?"Enregistrer":"Créer l'événement"}</button></div>
    </form>
  </div></div>
}

function ShareModal({event,onClose}) {
  const [share,setShare]=useState(null);
  useEffect(()=>{fetch(`/api/events/${event.id}/share`).then(r=>r.json()).then(setShare)},[event.id]);
  if(!share) return <div className="modal-backdrop"><div className="share-modal">Chargement…</div></div>
  const whatsapp=`https://wa.me/?text=${encodeURIComponent(`📸 Bonjour !\n\nVoici le lien pour partager vos photos et consulter la galerie :\n${share.guestUrl}\n\nLocation Photobooth 28`)}`;
  return <div className="modal-backdrop"><div className="share-modal">
    <div className="modal-head"><div><div className="eyebrow">PARTAGE</div><h2>{event.name}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>
    <img className="qr-large" src={share.qrDataUrl}/>
    <label>Lien invités</label><div className="copy-row"><input readOnly value={share.guestUrl}/><button className="secondary-btn" onClick={()=>navigator.clipboard.writeText(share.guestUrl)}>Copier</button></div>
    <label>Lien organisateur</label><div className="copy-row"><input readOnly value={share.organizerUrl}/><button className="secondary-btn" onClick={()=>navigator.clipboard.writeText(share.organizerUrl)}>Copier</button></div>
    <a className="primary whatsapp-link" href={whatsapp} target="_blank">💬 Partager sur WhatsApp</a>
  </div></div>
}


function CalendarView({ events, onOpenEvent }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // lundi = 0
  const cells = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = useMemo(() => {
    const map = {};
    for (const event of events.filter(e => !e.archived)) {
      (map[event.date] ||= []).push(event);
    }
    return map;
  }, [events]);

  function previousMonth() {
    setCursor(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCursor(new Date(year, month + 1, 1));
  }
  function today() {
    const d = new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const typeClass = type => {
    const t = String(type || "").toLowerCase();
    if (t.includes("mariage")) return "event-marriage";
    if (t.includes("anniversaire")) return "event-birthday";
    if (t.includes("entreprise")) return "event-company";
    if (t.includes("bapt")) return "event-baptism";
    return "event-other";
  };

  return <section className="calendar-shell">
    <div className="calendar-toolbar">
      <div>
        <div className="eyebrow">PLANNING</div>
        <h2>{monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}</h2>
      </div>
      <div className="calendar-nav">
        <button className="secondary-btn" onClick={previousMonth}>←</button>
        <button className="secondary-btn" onClick={today}>Aujourd'hui</button>
        <button className="secondary-btn" onClick={nextMonth}>→</button>
      </div>
    </div>

    <div className="calendar-weekdays">
      {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => <div key={d}>{d}</div>)}
    </div>

    <div className="calendar-grid">
      {cells.map((date, idx) => {
        if (!date) return <div className="calendar-cell muted-cell" key={`empty-${idx}`} />;
        const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
        const dayEvents = byDate[iso] || [];
        const now = new Date();
        const isToday = iso === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

        return <div className={`calendar-cell ${isToday ? "today-cell" : ""}`} key={iso}>
          <div className="calendar-day-number">{date.getDate()}</div>
          <div className="calendar-events">
            {dayEvents.slice(0,4).map(event =>
              <button
                key={event.id}
                className={`calendar-event ${typeClass(event.type)}`}
                onClick={() => onOpenEvent(event)}
                title={`${event.name}${event.time ? ` — ${event.time}` : ""}`}
              >
                <strong>{event.time || "•"}</strong>
                <span>{event.name}</span>
              </button>
            )}
            {dayEvents.length > 4 && <small className="more-events">+ {dayEvents.length-4} autre(s)</small>}
          </div>
        </div>
      })}
    </div>
  </section>;
}

function Dashboard({onLogout}) {
  const [view,setView]=useState("dashboard");
  const [events,setEvents]=useState([]);
  const [stats,setStats]=useState({events:0,upcoming:0,signedContracts:0,activeGalleries:0});
  const [formEvent,setFormEvent]=useState(undefined);
  const [showForm,setShowForm]=useState(false);
  const [shareEvent,setShareEvent]=useState(null);
  const [search,setSearch]=useState("");

  async function load(){
    const [e,d]=await Promise.all([fetch("/api/events").then(r=>r.json()),fetch("/api/dashboard").then(r=>r.json())]);
    setEvents(e.events||[]); setStats(d.stats||stats);
  }
  useEffect(()=>{load()},[]);

  async function remove(event){
    if(!confirm(`Supprimer définitivement "${event.name}" ?`)) return;
    await fetch(`/api/events/${event.id}`,{method:"DELETE"}); load();
  }
  async function archive(event){
    await fetch(`/api/events/${event.id}/archive`,{method:"POST"}); load();
  }
  function saved(){setShowForm(false);setFormEvent(undefined);load();}

  const filtered=useMemo(()=>events.filter(e=>(e.name+" "+e.organizerName+" "+e.type).toLowerCase().includes(search.toLowerCase())),[events,search]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/logo.jpg"/><div><strong>LP28 Suite</strong><span>Version 6.3.1</span></div></div>
      <nav>
        <button className={`nav-item ${view==="dashboard"?"active":""}`} onClick={()=>setView("dashboard")}>🏠 Tableau de bord</button>
        <button className={`nav-item ${view==="events"?"active":""}`} onClick={()=>setView("events")}>📅 Événements</button>
        <button className={`nav-item ${view==="planning"?"active":""}`} onClick={()=>setView("planning")}>🗓️ Planning</button>
        <button className="nav-item disabled">📸 Galeries <small>bientôt</small></button>
        <button className="nav-item disabled">📄 Documents <small>bientôt</small></button>
        <button className="nav-item disabled">☁️ Google Drive <small>bientôt</small></button>
      </nav>
      <div className="sidebar-footer"><a href={SITE} target="_blank">www.locationphotobooth28.fr</a><button className="logout" onClick={onLogout}>Déconnexion</button></div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div><div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div><h1>{view==="events"?"Mes événements":view==="planning"?"Planning":"Tableau de bord"}</h1><p className="muted">Simple, rapide, efficace.</p></div>
        <button className="primary" onClick={()=>{setFormEvent(undefined);setShowForm(true)}}>＋ Nouvel événement</button>
      </header>

      {view==="dashboard" ? <>
        <section className="stats-grid">
          <article className="stat-card"><span>Événements</span><strong>{stats.events}</strong></article>
          <article className="stat-card"><span>À venir</span><strong>{stats.upcoming}</strong></article>
          <article className="stat-card"><span>Galeries actives</span><strong>{stats.activeGalleries}</strong></article>
          <article className="stat-card"><span>Contrats signés</span><strong>{stats.signedContracts}</strong></article>
        </section>
        <section className="panel dashboard-panel"><div><div className="panel-kicker">GESTION DES ÉVÉNEMENTS</div><h2>Prépare tes prestations en quelques clics</h2><p>Crée un événement, sélectionne le matériel réservé et récupère immédiatement les liens organisateur et invités ainsi que le QR Code.</p><button className="primary" onClick={()=>setView("events")}>Voir mes événements</button></div><img src="/logo.jpg"/></section>
      </> : view==="events" ? <>
        <div className="events-toolbar"><input placeholder="🔎 Rechercher un événement..." value={search} onChange={e=>setSearch(e.target.value)}/><span>{filtered.length} événement(s)</span></div>
        <div className="events-list">
          {filtered.length===0 && <div className="empty-state"><span>📅</span><h2>Aucun événement</h2><p>Crée ton premier événement.</p></div>}
          {filtered.map(event=><article className={`event-card ${event.archived?"archived":""}`} key={event.id}>
            <div className="event-date"><strong>{event.date?.slice(8,10)||"--"}</strong><span>{new Date(event.date+"T12:00:00").toLocaleDateString("fr-FR",{month:"short"})}</span></div>
            <div className="event-main"><div className="event-title-row"><div><h3>{event.name}</h3><p>{event.type}{event.organizerName?` · ${event.organizerName}`:""}</p></div>{event.archived&&<span className="badge">Archivé</span>}</div>
              <div className="event-meta"><span>📍 {event.address||"Adresse non renseignée"}</span><span>📦 {event.materials?.length||0} sélection(s)</span><span>👥 {event.guestCount||0} invité(s)</span></div>
              <div className="event-actions"><button onClick={()=>setShareEvent(event)}>📱 Partager</button><button onClick={()=>{setFormEvent(event);setShowForm(true)}}>✏️ Modifier</button><button onClick={()=>archive(event)}>{event.archived?"♻️ Réactiver":"📦 Archiver"}</button><button className="danger-btn" onClick={()=>remove(event)}>🗑️ Supprimer</button></div>
            </div>
          </article>)}
        </div>
      </> : <>
        <CalendarView
          events={events}
          onOpenEvent={(event)=>{setFormEvent(event);setShowForm(true)}}
        />
        <section className="planning-legend">
          <span><i className="dot dot-marriage"></i>Mariage</span>
          <span><i className="dot dot-birthday"></i>Anniversaire</span>
          <span><i className="dot dot-company"></i>Entreprise</span>
          <span><i className="dot dot-baptism"></i>Baptême</span>
          <span><i className="dot dot-other"></i>Autre</span>
        </section>
      </>}
    </main>

    {showForm&&<EventForm event={formEvent} onClose={()=>setShowForm(false)} onSaved={saved}/>}
    {shareEvent&&<ShareModal event={shareEvent} onClose={()=>setShareEvent(null)}/>}
  </div>
}

export default function App(){
  const [loading,setLoading]=useState(true),[auth,setAuth]=useState(false);
  useEffect(()=>{fetch("/api/session").then(r=>r.json()).then(d=>setAuth(!!d.authenticated)).finally(()=>setLoading(false))},[]);
  async function logout(){await fetch("/api/logout",{method:"POST"});setAuth(false)}
  if(loading)return <div className="loading">Chargement…</div>;
  return auth?<Dashboard onLogout={logout}/>:<Login onLogin={()=>setAuth(true)}/>;
}
