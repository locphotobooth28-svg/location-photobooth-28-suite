
import React, { useEffect, useMemo, useRef, useState } from "react";

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
  {group:"Impressions", icon:"⚙️", name:"Forfait impressions personnalisé"},
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
  name:"", type:"Mariage", date:"", time:"", pickupDate:"", pickupTime:"", address:"", guestCount:"",
  organizerName:"", organizerPhone:"", organizerEmail:"",

responsibleCollaboratorId:"",
installerCollaboratorId:"",
pickupCollaboratorId:"",

materials:[], bookingStatus:"CONFIRMED", optionUntil:"", sceneJets:{enabled:false,boxes:4,color:"OR",height:"2M",duration:"20S",theme:"MARIAGE"}, portalEnabled:true, guestUploadEnabled:true, guestVideoEnabled:false, guestUploadModerated:false, portalExpiresAt:"", portalPassword:"", fotoshareUrl:"", frameSource:"NONE", frameStatus:"NOT_REQUIRED", preparation:{materialChecked:false,paperChecked:false,cablesChecked:false,powerChecked:false,qrChecked:false,contractChecked:false,frameChecked:false,loaded:false,departed:false,returned:false}, notes:"", googleCalendarId:"",totalPrice:"",
deposit:"",
balance:"",
  customPrintCount:"",
customPrintPrice:"",payments:{depositPaid:false,balancePaid:false,cautionReceived:false,cautionReturned:false}
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
  const [googleStatus,setGoogleStatus]=useState(null);
  const [googleCalendars,setGoogleCalendars]=useState([]);
const [addressSuggestions,setAddressSuggestions]=useState([]);
const [addressLoading,setAddressLoading]=useState(false);

const [collaboratorPermissions,setCollaboratorPermissions]=useState({
  canSeeClient:true,
  canSeeContract:true,
  canSeeInvoice:false,
  canSeeBalance:true,
  canManageCaution:true,
  canSeeInstructions:true
});

  const [collaborators,setCollaborators]=useState([]);

useEffect(()=>{
  fetch("/api/collaborators",{credentials:"include"})
    .then(r=>r.json())
    .then(d=>{
      const list=d.collaborators||[];
      setCollaborators(list);

      if(!event){
        const def=list.find(c=>c.isDefault);

        if(def){
          setForm(f=>({
            ...f,
            responsibleCollaboratorId:
              f.responsibleCollaboratorId||def.id,
            installerCollaboratorId:
              f.installerCollaboratorId||def.id,
            pickupCollaboratorId:
              f.pickupCollaboratorId||def.id
          }));
        }
      }
    })
    .catch(console.error);
},[]);
  useEffect(()=>{
    let cancelled=false;

    async function loadGoogle(){
      try{
        const statusResponse=await fetch("/api/google/status");

        if(!statusResponse.ok){
          if(!cancelled){
            setGoogleStatus(null);
            setGoogleCalendars([]);
          }

          return;
        }

        const status=await statusResponse.json();
        if(cancelled)return;

        setGoogleStatus(status);

        if(status.connected){
          const calendarsResponse=await fetch("/api/google/calendars");
          if(calendarsResponse.ok){
            const data=await calendarsResponse.json();
            if(!cancelled){
              setGoogleCalendars(data.calendars||[]);

              if(!event && !form.googleCalendarId && status.defaultCalendarId){
                setForm(f=>({...f,googleCalendarId:status.defaultCalendarId}));
              }
            }
          }
        }
      }catch(err){
        console.warn("Google indisponible dans le formulaire :",err);
        if(!cancelled){
          setGoogleStatus(null);
          setGoogleCalendars([]);
        }
      }
    }

    loadGoogle();
    return ()=>{cancelled=true};
  },[]);

  const set=(key,val)=>setForm(f=>({...f,[key]:val}));

  async function searchAddress(value){
  if(value.trim().length < 3){
    setAddressSuggestions([]);
    return;
  }

  setAddressLoading(true);

  try{
    const url =
      `https://data.geopf.fr/geocodage/completion/?text=${encodeURIComponent(value)}&type=StreetAddress&maximumResponses=6`;

    const r = await fetch(url);

    console.log("ADRESSE STATUS =", r.status);

    const d = await r.json();

    console.log("ADRESSE REPONSE =", d);

    const results =
      Array.isArray(d.results) ? d.results :
      Array.isArray(d.features) ? d.features :
      Array.isArray(d) ? d :
      [];

    setAddressSuggestions(results);

  }catch(err){
    console.error("ERREUR ADRESSE =",err);
    setAddressSuggestions([]);
  }finally{
    setAddressLoading(false);
  }
}
const PRINT_PACKS = {
  "Forfait sans aucune impression": {
    lola: 200,
    other: 150
  },
  "Forfait 100 impressions": {
    lola: 250,
    other: 200
  },
  "Forfait 200 impressions": {
    lola: 300,
    other: 250
  },
  "Forfait 300 impressions": {
    lola: 350,
    other: 300
  },
  "Forfait 400 impressions": {
    lola: 400,
    other: 350
  },
  "Forfait 700 impressions": {
    lola: 550,
    other: 500
  }
};

const PRINT_MATERIALS = [
  "Forfait sans aucune impression",
  "Forfait 100 impressions",
  "Forfait 200 impressions",
  "Forfait 300 impressions",
  "Forfait 400 impressions",
  "Forfait 700 impressions",
  "Forfait impressions personnalisé"
];

const toggleMaterial = (name) => {
  setForm(f => {
    const alreadySelected = f.materials.includes(name);

    let materials = [...f.materials];

    const isPrintPack = PRINT_MATERIALS.includes(name);

    if (isPrintPack) {
      materials = materials.filter(
        x => !PRINT_MATERIALS.includes(x)
      );

      if (!alreadySelected) {
        materials.push(name);
      }
    } else {
      if (alreadySelected) {
        materials = materials.filter(x => x !== name);
      } else {
        materials.push(name);
      }
    }

    let totalPrice = f.totalPrice;
    let balance = f.balance;

    const hasLola = materials.includes(
      "Borne Photobooth Miroir Lola"
    );

    const hasNinaOrGabin =
      materials.includes("Borne Photobooth Nina") ||
      materials.includes("Borne Photobooth Gabin");
const selectedPrintPack = materials.find(
  x => PRINT_PACKS[x]
);
    if (
      isPrintPack &&
      name !== "Forfait impressions personnalisé" &&
      !alreadySelected
    ) {
      const pack = PRINT_PACKS[name];

      if (pack) {
        const price = hasLola
          ? pack.lola
          : hasNinaOrGabin
            ? pack.other
            : pack.lola;

        totalPrice = String(price);

        balance = Math.max(
          Number(price) - Number(f.deposit || 0),
          0
        ).toFixed(2);
      }
    }
const isBoothChange =
  name === "Borne Photobooth Miroir Lola" ||
  name === "Borne Photobooth Nina" ||
  name === "Borne Photobooth Gabin";

if (
  isBoothChange &&
  selectedPrintPack
) {
  const pack = PRINT_PACKS[selectedPrintPack];

  if (pack) {
    const price = hasLola
      ? pack.lola
      : hasNinaOrGabin
        ? pack.other
        : pack.lola;

    totalPrice = String(price);

    balance = Math.max(
      Number(price) - Number(f.deposit || 0),
      0
    ).toFixed(2);
  }
}
    return {
      ...f,
      materials,
      totalPrice,
      balance
    };
  });
};
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
        body:JSON.stringify({...form,materials:[...new Set(form.materials||[])]})
      });

      let d = {};
      try { d = await r.json(); } catch {}

      if(!r.ok) {
        if (d.error === "material_conflict" && d.conflicts?.length) {

  const reasonLabels = {
  MAINTENANCE: "Maintenance",
  REPAIR: "Réparation",
  BREAKDOWN: "Panne",
  CHECK: "Contrôle / vérification",
  CLEANING: "Nettoyage / entretien",
  VACATION: "Vacances / indisponibilité",
  LOAN: "Matériel prêté / hors site",
  WAITING_PART: "En attente de pièce",
  OTHER: "Autre"
};

  const formatDate = value => {
    if(!value) return "?";
    return new Date(value).toLocaleDateString("fr-FR");
  };

  const details = d.conflicts.map(c => {

    if(c.unavailable && c.unavailabilities?.length){

      return c.unavailabilities.map(u => {
        const reason = reasonLabels[u.reason] || u.reason;

        const period =
          `${formatDate(u.startAt)} au ${formatDate(u.endAt)}`;

        const comment =
          u.notes
            ? `\n   💬 ${u.notes}`
            : "";

        return (
          `🔴 ${c.material} indisponible\n` +
          `   ${reason} — du ${period}${comment}`
        );
      }).join("\n");
    }

    if(c.reservations?.length){
      const reservations = c.reservations
        .map(r => `   • ${r.eventName}`)
        .join("\n");

      return (
        `⚠️ ${c.material} déjà réservé\n` +
        reservations
      );
    }

    return `⚠️ ${c.material} indisponible`;
  }).join("\n\n");

  alert(
    `⚠️ Matériel indisponible\n\n${details}`
  );

  return;
}
        alert(d.message || `Erreur serveur (${r.status})`);
        return;
      }

      if (d.google?.connected && d.google?.warnings?.length) {
        alert(`Événement enregistré ✅\n\nGoogle :\n${d.google.warnings.join("\n")}`);
      }
      onSaved(d.event);
    } catch (err) {
      console.error(err);
      alert("Impossible de joindre le serveur. Vérifie que npm start fonctionne.");
    } finally {
      setBusy(false);
    }
  }
async function sendCollaboratorMission(collaboratorId){
  if(!event?.id){
    return alert(
      "Enregistre d'abord l'événement avant d'envoyer la mission."
    );
  }

  const collaborator=collaborators.find(
    c=>c.id===collaboratorId
  );

  if(!collaborator){
    return alert("Collaborateur introuvable.");
  }

  if(!collaborator.phone){
    return alert(
      `${collaborator.firstName} n'a pas de numéro de téléphone renseigné.`
    );
  }

  try{
    const r=await fetch(
      `/api/events/${event.id}/collaborator-access`,
      {
        method:"POST",
        credentials:"include",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
  collaboratorId,

  canSeeClient:collaboratorPermissions.canSeeClient,
  canSeeContract:collaboratorPermissions.canSeeContract,
  canSeeInvoice:collaboratorPermissions.canSeeInvoice,
  canSeeBalance:collaboratorPermissions.canSeeBalance,
  canManageCaution:collaboratorPermissions.canManageCaution,
  canSeeInstructions:collaboratorPermissions.canSeeInstructions,

  missionNotes:form.notes||""
})
      }
    );

    const d=await r.json();

    if(!r.ok){
      return alert(
        d.message||
        "Impossible de créer l'accès collaborateur."
      );
    }

    const roles=[];

    if(form.responsibleCollaboratorId===collaboratorId){
      roles.push("Responsable de la prestation");
    }

    if(form.installerCollaboratorId===collaboratorId){
      roles.push("Installation");
    }

    if(form.pickupCollaboratorId===collaboratorId){
      roles.push("Récupération");
    }

    const formattedDate=form.date
      ? new Date(form.date+"T12:00:00")
          .toLocaleDateString("fr-FR",{
            weekday:"long",
            day:"numeric",
            month:"long",
            year:"numeric"
          })
      : "";

    let message=
`Bonjour ${collaborator.firstName} 👋

Une prestation Location Photobooth 28 t'a été attribuée.

📸 ${form.name}
📅 ${formattedDate}`;

    if(roles.length){
      message+=`\n👷 Mission : ${roles.join(" / ")}`;
    }

    if(form.time){
      message+=`\n🚚 Installation : ${form.time}`;
    }

    if(form.pickupDate){
      const pickupDate=new Date(
        form.pickupDate+"T12:00:00"
      ).toLocaleDateString("fr-FR");

      message+=`\n↩️ Récupération : ${pickupDate}`;

      if(form.pickupTime){
        message+=` à ${form.pickupTime}`;
      }
    }

    if(form.address){
      message+=`\n📍 ${form.address}`;
    }

    if(form.materials?.length){
      message+=`\n📦 Matériel : ${form.materials.join(", ")}`;
    }

    message+=`

🔐 Voici ta fiche de prestation :
${d.accessUrl}

Merci ${collaborator.firstName} 👍
Johan — Location Photobooth 28`;

    let phone=String(collaborator.phone)
      .replace(/\D/g,"");

    if(phone.startsWith("0")){
      phone="33"+phone.substring(1);
    }

    const whatsapp=
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(
      whatsapp,
      "_blank",
      "noopener,noreferrer"
    );

  }catch(err){
    console.error(err);
    alert("Impossible de joindre le serveur.");
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
        <div><label>Heure d'installation</label><input type="time" value={form.time} onChange={e=>set("time",e.target.value)}/></div>
        <div><label>Date de reprise</label><input type="date" value={form.pickupDate||form.date||""} onChange={e=>set("pickupDate",e.target.value)}/></div>
        <div><label>Heure de reprise</label><input type="time" value={form.pickupTime||""} onChange={e=>set("pickupTime",e.target.value)}/></div>
        <div className="wide">
  <label>📍 Adresse de la prestation</label>

  <input
  value={form.address || ""}
  onChange={e=>{
  const value=e.target.value;

  setForm(f=>({
    ...f,
    address:value
  }));

  searchAddress(value);
}}
  placeholder="Commence à saisir une adresse..."
  autoComplete="off"
/>

  {addressLoading && (
    <p className="muted">Recherche de l'adresse...</p>
  )}

  {addressSuggestions.length>0 && (
    <div className="address-suggestions">
      {addressSuggestions.map((a,index)=>(
        <button
          type="button"
          key={index}
          onClick={()=>{
            const label=a.fulltext || a.label || a.text || "";
            set("address",label);
            setAddressSuggestions([]);
          }}
        >
          📍 {a.fulltext || a.label || a.text}
        </button>
      ))}
    </div>
  )}

  {form.address && (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
      <a
        className="primary"
        href={`https://waze.com/ul?q=${encodeURIComponent(form.address)}&navigate=yes`}
        target="_blank"
        rel="noopener noreferrer"
      >
        🚗 Waze
      </a>

      <a
        className="primary"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        🗺️ Google Maps
      </a>
    </div>
  )}
</div>
        <div><label>Nombre d'invités</label><input type="number" min="0" value={form.guestCount} onChange={e=>set("guestCount",e.target.value)}/></div>
      </div>

      <h3>Organisateur</h3>
      <div className="form-grid">
        <div><label>Nom / prénom</label><input value={form.organizerName} onChange={e=>set("organizerName",e.target.value)}/></div>
        <div><label>Téléphone</label><input value={form.organizerPhone} onChange={e=>set("organizerPhone",e.target.value)}/></div>
        <div><label>E-mail</label><input type="email" value={form.organizerEmail} onChange={e=>set("organizerEmail",e.target.value)}/></div>
      </div>
<h3>👷 Équipe affectée</h3>

<div className="form-grid">
  <label>
    Responsable de la prestation
    <select
      value={form.responsibleCollaboratorId||""}
      onChange={e=>set("responsibleCollaboratorId",e.target.value)}
    >
      <option value="">Aucun</option>
      {collaborators
        .filter(c=>c.active && c.canManage)
        .map(c=>(
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName||""}
            {c.isDefault ? " ⭐" : ""}
          </option>
        ))}
    </select>
  </label>

  <label>
    🚚 Installation
    <select
      value={form.installerCollaboratorId||""}
      onChange={e=>set("installerCollaboratorId",e.target.value)}
    >
      <option value="">Aucun / à définir</option>
      {collaborators
        .filter(c=>c.active && c.canInstall)
        .map(c=>(
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName||""}
            {c.isDefault ? " ⭐" : ""}
          </option>
        ))}
    </select>
  </label>

  <label>
    ↩️ Récupération
    <select
      value={form.pickupCollaboratorId||""}
      onChange={e=>set("pickupCollaboratorId",e.target.value)}
    >
      <option value="">Aucun / à définir</option>
      {collaborators
        .filter(c=>c.active && c.canPickup)
        .map(c=>(
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName||""}
            {c.isDefault ? " ⭐" : ""}
          </option>
        ))}
    </select>
  </label>
</div>
{event?.id && (
  <div className="google-actions">

    {[...new Set([
      form.responsibleCollaboratorId,
      form.installerCollaboratorId,
      form.pickupCollaboratorId
    ].filter(Boolean))].map(collaboratorId=>{

      const c=collaborators.find(
        x=>x.id===collaboratorId
      );

      if(!c)return null;

      return (
        <button
          key={collaboratorId}
          type="button"
          className="primary"
          onClick={()=>
            sendCollaboratorMission(collaboratorId)
          }
        >
          📲 Envoyer la mission à {c.firstName}
        </button>
      );
    })}

  </div>
)}
{event?.id && (
  <div className="card" style={{marginTop:16}}>
    <div className="eyebrow">ACCÈS COLLABORATEUR</div>

    <h3>🔐 Informations autorisées</h3>

    <p className="muted">
      Choisis ce que le collaborateur pourra consulter
      dans sa fiche de prestation.
    </p>

    <div className="check-grid">

      <label>
        <input
          type="checkbox"
          checked={collaboratorPermissions.canSeeClient}
          onChange={e=>setCollaboratorPermissions(p=>({
            ...p,
            canSeeClient:e.target.checked
          }))}
        />
        👤 Coordonnées du client
      </label>

      <label>
        <input
          type="checkbox"
          checked={collaboratorPermissions.canSeeContract}
          onChange={e=>setCollaboratorPermissions(p=>({
            ...p,
            canSeeContract:e.target.checked
          }))}
        />
        📑 Contrat
      </label>

      <label>
        <input
          type="checkbox"
          checked={collaboratorPermissions.canSeeInvoice}
          onChange={e=>setCollaboratorPermissions(p=>({
            ...p,
            canSeeInvoice:e.target.checked
          }))}
        />
        🧾 Facture
      </label>

      <label>
        <input
          type="checkbox"
          checked={collaboratorPermissions.canSeeBalance}
          onChange={e=>setCollaboratorPermissions(p=>({
            ...p,
            canSeeBalance:e.target.checked
          }))}
        />
        💶 Reste à régler
      </label>

      <label>
        <input
          type="checkbox"
          checked={collaboratorPermissions.canManageCaution}
          onChange={e=>setCollaboratorPermissions(p=>({
            ...p,
            canManageCaution:e.target.checked
          }))}
        />
        🛡️ Gestion de la caution
      </label>

      <label>
        <input
          type="checkbox"
          checked={collaboratorPermissions.canSeeInstructions}
          onChange={e=>setCollaboratorPermissions(p=>({
            ...p,
            canSeeInstructions:e.target.checked
          }))}
        />
        📝 Consignes de prestation
      </label>

    </div>
  </div>
)}
      {googleStatus?.connected && (
        <>
          <h3>Google Agenda</h3>
          <div className="form-grid">
            <div className="wide">
              <label>Agenda Google pour cet événement</label>
              <select value={form.googleCalendarId||""} onChange={e=>set("googleCalendarId",e.target.value)}>
                <option value="">Agenda par défaut</option>
                {googleCalendars.map(c=><option key={c.id} value={c.id}>{c.primary?"★ ":""}{c.summary}</option>)}
              </select>
              <small className="muted">Toujours privé/confidentiel et Occupé.</small>
            </div>
          </div>
        </>
      )}

      <h3>📋 Statut commercial</h3>
      <div className="form-grid">
        <div>
          <label>Statut</label>
          <select value={form.bookingStatus||"CONFIRMED"} onChange={e=>set("bookingStatus",e.target.value)}>
            <option value="QUOTE_DRAFT">📝 Devis en préparation</option>
            <option value="QUOTE_SENT">📤 Devis envoyé</option>
            <option value="OPTION">🟠 Option / en attente client</option>
            <option value="CONFIRMED">🟢 Réservation confirmée</option>
            <option value="DECLINED">⚪ Devis refusé / sans suite</option>
            <option value="CANCELLED">🔴 Annulée</option>
            <option value="COMPLETED">🔵 Terminée</option>
          </select>
        </div>
        {form.bookingStatus==="OPTION" && <div>
          <label>Maintenir l'option jusqu'au</label>
          <input type="date" value={form.optionUntil||""} onChange={e=>set("optionUntil",e.target.value)}/>
        </div>}
      </div>

      <h3>Matériel et options</h3>
      {groups.map(group=><div key={group} className="material-group"><h4>{group}</h4><div className="materials-grid">
        {MATERIALS.filter(m=>m.group===group).map(m=><button type="button" key={m.name} className={`material-card ${form.materials.includes(m.name)?"selected":""}`} onClick={()=>toggleMaterial(m.name)}>
          <span className="material-icon">{m.icon}</span><span>{m.name}</span><b>{form.materials.includes(m.name)?"✓":"+"}</b>
        </button>)}
      </div></div>)}

{form.materials.includes("Forfait impressions personnalisé") && (
  <div className="card" style={{marginTop:16}}>
    <div className="eyebrow">FORFAIT PERSONNALISÉ</div>

    <div className="form-grid">
      <div>
        <label>🖨️ Nombre d'impressions</label>
        <input
          type="number"
          min="1"
          step="1"
          value={form.customPrintCount||""}
          onChange={e=>set("customPrintCount",e.target.value)}
          placeholder="Ex : 4200"
        />
      </div>

      <div>
        <label>💶 Prix convenu TTC</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.customPrintPrice||""}
          onChange={e=>{
            const price=e.target.value;

            setForm(f=>({
              ...f,
              customPrintPrice:price,
              totalPrice:price,
              balance:price
                ? Math.max(
                    Number(price)-Number(f.deposit||0),
                    0
                  ).toFixed(2)
                : ""
            }));
          }}
          placeholder="Ex : 2500"
        />
      </div>
    </div>
  </div>
)}

      <h3>🎨 Cadre photo</h3>
      <div className="form-grid">
        <div>
          <label>Origine</label>
          <div className="choice-row">
            <button type="button" className={form.frameSource==="NONE"?"selected":""} onClick={()=>{set("frameSource","NONE");set("frameStatus","NOT_REQUIRED")}}>Pas de cadre</button>
            <button type="button" className={form.frameSource==="CLIENT"?"selected":""} onClick={()=>{set("frameSource","CLIENT"); if(form.frameStatus==="NOT_REQUIRED") set("frameStatus","TO_DO")}}>Client</button>
            <button type="button" className={form.frameSource==="LP28"?"selected":""} onClick={()=>{set("frameSource","LP28"); if(form.frameStatus==="NOT_REQUIRED") set("frameStatus","TO_DO")}}>LP28</button>
          </div>
        </div>
        {form.frameSource!=="NONE" && <div>
          <label>Statut</label>
          <div className="choice-row">
            <button type="button" className={form.frameStatus==="TO_DO"?"selected":""} onClick={()=>set("frameStatus","TO_DO")}>🔴 À faire</button>
            <button type="button" className={form.frameStatus==="IN_PROGRESS"?"selected":""} onClick={()=>set("frameStatus","IN_PROGRESS")}>🟡 En cours</button>
            <button type="button" className={form.frameStatus==="DONE"?"selected":""} onClick={()=>set("frameStatus","DONE")}>🟢 Terminé</button>
          </div>
        </div>}
      </div>

      <details className="accordion-block">
        <summary><span>🎆 Jets de scène</span><small>{form.sceneJets?.enabled ? `${form.sceneJets.boxes||1} boîtier(s) · ${form.sceneJets.color==="OR"?"Or":"Argent"} · ${form.sceneJets.height==="3M"?"3 m":"2 m"} · ${form.sceneJets.duration==="60S"?"60 s":form.sceneJets.duration==="30S"?"30 s":"20 s"}` : "Non activé"}</small></summary>
        <div className="accordion-content">
          <label className="switch-line"><input type="checkbox" checked={Boolean(form.sceneJets?.enabled)} onChange={e=>setForm(f=>({...f,sceneJets:{...(f.sceneJets||{}),enabled:e.target.checked}}))}/> Activer les jets de scène</label>
          {form.sceneJets?.enabled && <div className="form-grid scene-jets-grid">
            <div><label>Nombre de boîtiers</label><select value={form.sceneJets?.boxes||4} onChange={e=>setForm(f=>({...f,sceneJets:{...f.sceneJets,boxes:Number(e.target.value)}}))}>{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></div>
            <div><label>Couleur</label><select value={form.sceneJets?.color||"OR"} onChange={e=>setForm(f=>({...f,sceneJets:{...f.sceneJets,color:e.target.value}}))}><option value="OR">Or</option><option value="ARGENT">Argent</option></select></div>
            <div><label>Hauteur</label><select value={form.sceneJets?.height||"2M"} onChange={e=>setForm(f=>({...f,sceneJets:{...f.sceneJets,height:e.target.value}}))}><option value="2M">2 mètres</option><option value="3M">3 mètres</option></select></div>
            <div><label>Durée</label><select value={form.sceneJets?.duration||"20S"} onChange={e=>setForm(f=>({...f,sceneJets:{...f.sceneJets,duration:e.target.value}}))}><option value="20S">20 secondes</option><option value="30S">30 secondes</option><option value="60S">60 secondes</option></select></div>
            <div className="wide"><label>Thème</label><select value={form.sceneJets?.theme||"MARIAGE"} onChange={e=>setForm(f=>({...f,sceneJets:{...f.sceneJets,theme:e.target.value}}))}><option value="MARIAGE">Mariage</option><option value="BABY_SHOWER">Baby Shower</option><option value="GENDER_REVEAL">Gender Reveal</option><option value="ANNIVERSAIRE">Anniversaire</option><option value="ENTREPRISE">Entreprise</option><option value="AUTRE">Autre</option></select></div>
          </div>}
        </div>
      </details>

      <details className="accordion-block">
        <summary><span>📸 Portail événement</span><small>{form.portalEnabled?"Activé":"Désactivé"}</small></summary>
        <div className="accordion-content"><div className="form-grid">
          <label className="switch-line"><input type="checkbox" checked={Boolean(form.portalEnabled)} onChange={e=>set("portalEnabled",e.target.checked)}/> Activer le portail</label>
          {form.portalEnabled && <>
            <label className="switch-line"><input type="checkbox" checked={Boolean(form.guestUploadEnabled)} onChange={e=>set("guestUploadEnabled",e.target.checked)}/> Autoriser les photos invités</label>
            <label className="switch-line"><input type="checkbox" checked={Boolean(form.guestVideoEnabled)} onChange={e=>set("guestVideoEnabled",e.target.checked)}/> Autoriser les vidéos invités</label>
            <label className="switch-line"><input type="checkbox" checked={form.guestUploadModerated!==false} onChange={e=>set("guestUploadModerated",e.target.checked)}/> Modération avant publication (optionnelle)</label>
            <div><label>Expiration</label><input type="date" value={form.portalExpiresAt||""} onChange={e=>set("portalExpiresAt",e.target.value)}/></div>
            <div><label>Mot de passe (facultatif)</label><input value={form.portalPassword||""} onChange={e=>set("portalPassword",e.target.value)}/></div>
            <div className="wide"><label>Lien FotoShare (secours)</label><input placeholder="https://fotoshare.co/..." value={form.fotoshareUrl||""} onChange={e=>set("fotoshareUrl",e.target.value)}/></div>
          </>}
        </div></div>
      </details>

      <h3>Paiement et caution</h3><div className="form-grid">

  <div>
    <label>💰 Montant total de la prestation</label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={form.totalPrice||""}
      onChange={e=>{
        const total=e.target.value;
        const deposit=form.deposit||0;

        setForm(f=>({
          ...f,
          totalPrice:total,
          balance:total
            ? Math.max(
                Number(total)-Number(deposit||0),
                0
              ).toFixed(2)
            : ""
        }));
      }}
      placeholder="Ex : 350"
    />
  </div>

  <div>
    <label>💳 Montant de l'acompte</label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={form.deposit||""}
      onChange={e=>{
        const deposit=e.target.value;
        const total=form.totalPrice||0;

        setForm(f=>({
          ...f,
          deposit,
          balance:form.totalPrice
            ? Math.max(
                Number(total)-Number(deposit||0),
                0
              ).toFixed(2)
            : ""
        }));
      }}
      placeholder="Ex : 100"
    />
  </div>

  <div>
    <label>💶 Reste à régler</label>
    <input
      type="number"
      value={form.balance||""}
      readOnly
    />
  </div>

</div>
      <div className="checks-grid">
        {[["depositPaid","Acompte reçu"],["balancePaid","Prestation réglée"],["cautionReceived","Caution reçue"],["cautionReturned","Caution rendue"]].map(([key,label])=>
          <label className={`status-check ${form.payments[key]?"checked":""}`} key={key}><input type="checkbox" checked={form.payments[key]} onChange={()=>togglePayment(key)}/><span>{form.payments[key]?"✓":"○"} {label}</span></label>
        )}
      </div>
{event?.collaboratorActions?.length>0 && (
  <div className="card" style={{marginTop:16}}>
    <div className="eyebrow">HISTORIQUE TERRAIN</div>
    <h3>🕒 Actions collaborateur</h3>

    {event.collaboratorActions
      .filter(a=>
  a.action==="CAUTION_RECEIVED" ||
  a.action==="CAUTION_RETURNED" ||
  a.action==="PAYMENT_RECEIVED"
)
      .map(a=>(
        <p key={a.id}>
          {a.action==="CAUTION_RECEIVED"
  ? "🛡️ Caution reçue"
  : a.action==="CAUTION_RETURNED"
    ? "✅ Caution rendue"
    : "💶 Paiement récupéré"}
          {" — "}
          {new Date(a.createdAt).toLocaleString("fr-FR")}
          {a.collaborator && (
            <>
              {" — "}
              <strong>
                {a.collaborator.firstName} {a.collaborator.lastName||""}
              </strong>
            </>
          )}
        </p>
      ))}
  </div>
)}
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


function GooglePanel() {
  const [status,setStatus] = useState(null);
  const [calendars,setCalendars] = useState([]);
  const [folders,setFolders] = useState([]);
  const [settings,setSettings] = useState({
    defaultCalendarId:"",
    defaultCalendarSummary:"",
    driveRootFolderId:""
  });
  const [busy,setBusy] = useState(false);

  async function load(){
    try{
      const sr = await fetch("/api/google/status", {
        credentials:"include"
      });

      if(sr.status === 401){
        setStatus({
          unauthorized:true,
          configured:true,
          connected:false,
          calendarConnected:false,
          driveConnected:false
        });
        return;
      }

      const st = await sr.json();
      setStatus(st);

      let calendarList = [];
      let folderList = [];

      if(st.calendarConnected){
        const cr = await fetch("/api/google/calendars", {
          credentials:"include"
        });

        if(cr.ok){
          const cd = await cr.json();
          calendarList = cd.calendars || [];
        }
      }

      if(st.driveConnected){
        const fr = await fetch(
          "/api/google/drive-folders?parentId=root",
          {credentials:"include"}
        );

        if(fr.ok){
          const fd = await fr.json();
          folderList = fd.folders || [];
        }
      }

      setCalendars(calendarList);
      setFolders(folderList);

      setSettings({
        defaultCalendarId:
          st.defaultCalendarId || "primary",
        defaultCalendarSummary:
          st.defaultCalendarSummary || "",
        driveRootFolderId:
          st.driveRootFolderId || ""
      });

    }catch(e){
      setStatus({
        configured:false,
        connected:false,
        calendarConnected:false,
        driveConnected:false,
        error:e.message
      });
    }
  }

  useEffect(()=>{
  load();
},[]);
  async function save(){
    setBusy(true);

    try{
      const cal = calendars.find(
        c => c.id === settings.defaultCalendarId
      );

      const r = await fetch("/api/google/settings", {
        method:"POST",
        credentials:"include",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          ...settings,
          defaultCalendarSummary:cal?.summary || ""
        })
      });

      const d = await r.json();

      if(!r.ok){
        alert(d.message || "Erreur Google.");
        return;
      }

      alert("Parametres Google enregistres.");
      await load();

    }finally{
      setBusy(false);
    }
  }

  async function disconnect(kind){
    const label =
      kind === "calendar"
        ? "Google Calendar"
        : "Google Drive";

    if(!confirm(`Deconnecter ${label} ?`)){
      return;
    }

    const r = await fetch(
      `/api/google/disconnect/${kind}`,
      {
        method:"POST",
        credentials:"include"
      }
    );

    if(!r.ok){
      alert(`Impossible de deconnecter ${label}.`);
      return;
    }

    await load();
  }

  if(!status){
    return <div>Chargement...</div>;
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GOOGLE WORKSPACE</span>
          <h2>Connexion et structure</h2>
          <p className="muted">
            Calendar et Drive peuvent utiliser deux comptes Google differents.
          </p>
        </div>
      </div>

      {status.unauthorized ? (
        <div className="alert">
          Session LP28 non reconnue. Deconnecte-toi puis reconnecte-toi a LP28.
        </div>
      ) : !status.configured ? (
        <div className="alert">
          Configuration Google absente du serveur.
        </div>
      ) : (
        <>
          <div className="google-settings-grid">

            <article className="google-setting-card">
              <div className="google-setting-icon">📅</div>

              <h3>Google Calendar</h3>

              {status.calendarConnected ? (
                <>
                  <div className="google-account-line">
                    <div>
                      <span className="muted">Compte Calendar</span>
                      <strong>
                        {status.calendarEmail || "Google Calendar"}
                      </strong>
                    </div>

                    <span className="privacy-pill">
                      ✓ Connecte
                    </span>
                  </div>

                  <h4>Agenda par defaut</h4>

                  <select
                    value={settings.defaultCalendarId}
                    onChange={e=>
                      setSettings(v=>({
                        ...v,
                        defaultCalendarId:e.target.value
                      }))
                    }
                  >
                    {calendars.map(c=>(
                      <option key={c.id} value={c.id}>
                        {c.primary ? "★ " : ""}
                        {c.summary}
                      </option>
                    ))}
                  </select>

                  <small>
                    {calendars.length} agenda(s) detecte(s)
                  </small>

                  <div className="google-actions">
                    <button
                      className="secondary-btn"
                      onClick={()=>disconnect("calendar")}
                    >
                      Deconnecter Calendar
                    </button>
                  </div>
                </>
              ) : (
                <div className="google-connect-box">
                  <div className="google-big-icon">G</div>

                  <div>
                    <h3>Connecter Calendar</h3>
                    <p className="muted">
                      Choisis le compte qui possede ton agenda LP28.
                    </p>
                  </div>

                  <a
                    className="primary"
                    href="/auth/google/start/calendar"
                  >
                    Connecter Calendar
                  </a>
                </div>
              )}
            </article>


            <article className="google-setting-card">
              <div className="google-setting-icon">📁</div>

              <h3>Google Drive</h3>

              {status.driveConnected ? (
                <>
                  <div className="google-account-line">
                    <div>
                      <span className="muted">Compte Drive</span>
                      <strong>
                        {status.driveEmail || "Google Drive"}
                      </strong>
                    </div>

                    <span className="privacy-pill">
                      ✓ Connecte
                    </span>
                  </div>

                  <h4>Dossier Drive racine</h4>

                  <select
                    value={settings.driveRootFolderId}
                    onChange={e=>
                      setSettings(v=>({
                        ...v,
                        driveRootFolderId:e.target.value
                      }))
                    }
                  >
                    <option value="">
                      Creer/utiliser "Location Photobooth 28"
                    </option>

                    {folders.map(f=>(
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <small>
                    {folders.length} dossier(s) detecte(s)
                  </small>

                  <div className="google-actions">
                    <button
                      className="secondary-btn"
                      onClick={()=>disconnect("drive")}
                    >
                      Deconnecter Drive
                    </button>
                  </div>
                </>
              ) : (
                <div className="google-connect-box">
                  <div className="google-big-icon">G</div>

                  <div>
                    <h3>Connecter Drive</h3>
                    <p className="muted">
                      Choisis le compte qui stockera les fichiers LP28.
                    </p>
                  </div>

                  <a
                    className="primary"
                    href="/auth/google/start/drive"
                  >
                    Connecter Drive
                  </a>
                </div>
              )}
            </article>

          </div>

          {(status.calendarConnected || status.driveConnected) && (
            <div className="google-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={save}
              >
                {busy
                  ? "Enregistrement..."
                  : "Enregistrer mes choix"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}



function LongRangePlanning() {
  const [data,setData]=useState(null);
  const [startYear,setStartYear]=useState(new Date().getFullYear());

  useEffect(()=>{
    fetch(`/api/planning-24-months?start=${startYear}-01`)
      .then(r=>r.json())
      .then(setData)
      .catch(()=>setData({months:[]}));
  },[startYear]);

  if(!data)return <div className="empty-state"><span>📅</span><p>Chargement du planning 24 mois…</p></div>;

  return <section className="long-planning">
    <div className="calendar-toolbar">
      <div>
        <div className="eyebrow">VISION LONG TERME</div>
        <h2>24 mois</h2>
        <p className="muted">Vue compacte pour anticiper les réservations jusqu'à 2 ans.</p>
      </div>
      <div className="planning-controls">
        <select value={startYear} onChange={e=>setStartYear(Number(e.target.value))}>
          {[new Date().getFullYear()-1,new Date().getFullYear(),new Date().getFullYear()+1,new Date().getFullYear()+2].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
    <div className="months-grid">
      {(data.months||[]).map(m=>{
        const load=m.total===0?"low":m.total<=2?"medium":"high";
        const label=new Date(`${m.key}-01T12:00:00`).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
        return <article key={m.key} className={`month-card load-${load}`}>
          <div className="month-title">{label}</div>
          <strong>{m.total}</strong>
          <span>{m.total<=1?"événement":"événements"}</span>
          <small>🟢 {m.confirmed} confirmé(s) · 🟠 {m.options} option(s)</small>
        </article>
      })}
    </div>
  </section>;
}

function MaterialPlanning({onOpenEvent}) {
  const [data,setData]=useState(null);
  const [start,setStart]=useState(()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });
  const [days,setDays]=useState(7);

  async function load(){
    const r=await fetch(`/api/material-planning?start=${start}&days=${days}`);
    const d=await r.json();
    setData(d);
  }

  useEffect(()=>{load()},[start,days]);

  const dates=useMemo(()=>{
    const out=[];
    const d=new Date(`${start}T12:00:00`);
    for(let i=0;i<days;i++){
      const x=new Date(d);
      x.setDate(x.getDate()+i);
      out.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`);
    }
    return out;
  },[start,days]);

  function eventUsesDate(event,date){
    const startD=new Date(`${event.date}T${event.time||"00:00"}:00`);
    let endD=new Date(`${event.pickupDate||event.date}T${event.pickupTime||"23:59"}:00`);
    if(endD<startD)endD.setDate(endD.getDate()+1);
    const cellStart=new Date(`${date}T00:00:00`);
    const cellEnd=new Date(`${date}T23:59:59`);
    return startD<=cellEnd && endD>=cellStart;
  }

  if(!data)return <div className="empty-state"><span>📦</span><p>Chargement du planning matériel…</p></div>;

  const materials=(data.materials||[]).filter(m=>m.category!=="Impressions");

  const reasonLabels = {
  MAINTENANCE: "Maintenance",
  REPAIR: "Réparation",
  BREAKDOWN: "Panne",
  CHECK: "Contrôle / vérification",
  CLEANING: "Nettoyage / entretien",
  VACATION: "Vacances / indisponibilité",
  LOAN: "Matériel prêté / hors site",
  WAITING_PART: "En attente de pièce",
  OTHER: "Autre"
};

  return <section className="material-planning">
    <div className="calendar-toolbar">
      <div><div className="eyebrow">PLANNING MATÉRIEL</div><h2>Disponibilités</h2></div>
      <div className="planning-controls">
        <input type="date" value={start} onChange={e=>setStart(e.target.value)}/>
        <select value={days} onChange={e=>setDays(Number(e.target.value))}>
          <option value={7}>7 jours</option>
          <option value={14}>14 jours</option>
        </select>
      </div>
    </div>
    <div className="resource-table-wrap">
      <table className="resource-table">
        <thead><tr><th>Matériel</th>{dates.map(date=><th key={date}>{new Date(date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit"})}</th>)}</tr></thead>
        <tbody>
          {materials.map(material=><tr key={material.id}>
            <th>{material.name}</th>
            {dates.map(date=>{
              const matches=(data.events||[]).filter(
  e=>e.materials?.includes(material.name)&&eventUsesDate(e,date)
);

const unavailable=(data.unavailabilities||[]).filter(u=>{
  if(u.materialId!==material.id) return false;

  const startD=new Date(u.startAt);
  const endD=new Date(u.endAt);

  const cellStart=new Date(`${date}T00:00:00`);
  const cellEnd=new Date(`${date}T23:59:59`);

  return startD<=cellEnd && endD>=cellStart;
});
              return (
  <td
    key={date}
    className={
      unavailable.length
        ? "busy-cell"
        : matches.length
          ? "busy-cell"
          : "free-cell"
    }
  >
    {unavailable.length ? (
      unavailable.map(u=>(
        <div key={u.id} className="resource-event">
          🔴 {reasonLabels[u.reason] || u.reason}
          {u.notes ? ` · ${u.notes}` : ""}
        </div>
      ))
    ) : matches.length ? (
      matches.map(e=>(
        <button
          key={e.id}
          onClick={()=>onOpenEvent(e)}
          className="resource-event"
        >
          ❌ {e.name}
        </button>
      ))
    ) : (
      <span>✅ Libre</span>
    )}
  </td>
);
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}


function AdminInventory(){
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);

  const [selectedMaterialId,setSelectedMaterialId]=useState("");
  const [unavailabilities,setUnavailabilities]=useState([]);
  const [allUnavailabilities,setAllUnavailabilities]=useState([]);
  const [unavailabilityForm,setUnavailabilityForm]=useState({
    startAt:"",
    endAt:"",
    reason:"MAINTENANCE",
    notes:""
  });

  const reasonLabels={
    MAINTENANCE:"Maintenance",
    REPAIR:"Réparation",
    BREAKDOWN:"Panne",
    CHECK:"Contrôle / vérification",
    CLEANING:"Nettoyage / entretien",
    VACATION:"Vacances / indisponibilité",
    LOAN:"Matériel prêté / hors site",
    WAITING_PART:"En attente de pièce",
    OTHER:"Autre"
  };

  async function load(){
    const r=await fetch("/api/admin/inventory");
    const d=await r.json();
    setData(d);
  }

  useEffect(()=>{
  load();
  loadAllUnavailabilities();
},[]);
  async function loadAllUnavailabilities(){
  const r=await fetch("/api/material-unavailabilities");
  const d=await r.json();

  if(r.ok){
    setAllUnavailabilities(d.unavailabilities||[]);
  }
}

async function loadUnavailabilities(materialId){
  if(!materialId){
    setUnavailabilities([]);
    return;
  }

  const r=await fetch(
    `/api/materials/${materialId}/unavailabilities`
  );

  const d=await r.json();

  if(!r.ok){
    alert(
      d.message ||
      "Impossible de charger les indisponibilités."
    );
    return;
  }

  setUnavailabilities(
    d.unavailabilities || []
  );
}
  async function chooseMaterial(materialId){
    setSelectedMaterialId(materialId);
    await loadUnavailabilities(materialId);
  }

  async function addUnavailability(){
    if(!selectedMaterialId){
      return alert("Sélectionne d'abord un matériel.");
    }

    if(!unavailabilityForm.startAt || !unavailabilityForm.endAt){
      return alert("Les dates de début et de fin sont obligatoires.");
    }

    if(
      unavailabilityForm.reason==="OTHER" &&
      !unavailabilityForm.notes.trim()
    ){
      return alert(
        "Le commentaire est obligatoire lorsque le motif est Autre."
      );
    }

    setBusy(true);

    try{
      const r=await fetch(
        `/api/materials/${selectedMaterialId}/unavailabilities`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            startAt:`${unavailabilityForm.startAt}T00:00:00`,
            endAt:`${unavailabilityForm.endAt}T23:59:59`,
            reason:unavailabilityForm.reason,
            notes:unavailabilityForm.notes
          })
        }
      );

      const d=await r.json();

      if(!r.ok){
        return alert(
          d.message||"Impossible d'enregistrer l'indisponibilité."
        );
      }

      if(d.conflicts?.length){
        const names=d.conflicts
          .map(e=>`• ${e.name}`)
          .join("\n");

        alert(
          `⚠️ Indisponibilité enregistrée.\n\n` +
          `Événement(s) déjà en conflit :\n${names}`
        );
      }else{
        alert("✅ Indisponibilité enregistrée.");
      }

      setUnavailabilityForm({
        startAt:"",
        endAt:"",
        reason:"MAINTENANCE",
        notes:""
      });

      await loadUnavailabilities(selectedMaterialId);

    }finally{
      setBusy(false);
    }
  }

  async function completeUnavailability(id){
    const r=await fetch(
      `/api/material-unavailabilities/${id}`,
      {
        method:"PATCH",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          status:"COMPLETED"
        })
      }
    );

    const d=await r.json();

    if(!r.ok){
      return alert(
        d.message||"Impossible de terminer l'indisponibilité."
      );
    }

    await loadUnavailabilities(selectedMaterialId);
  }

  async function deleteUnavailability(id){
    if(!confirm("Supprimer cette indisponibilité ?")){
      return;
    }

    const r=await fetch(
      `/api/material-unavailabilities/${id}`,
      {
        method:"DELETE"
      }
    );

    const d=await r.json();

    if(!r.ok){
      return alert(
        d.message||"Impossible de supprimer l'indisponibilité."
      );
    }

    await loadUnavailabilities(selectedMaterialId);
  }

  async function reloadPrinter(printer){
    const raw=prompt(
      `Nouveau nombre de tirages installé dans ${printer.name} :`,
      String(printer.loadedCapacity||400)
    );

    if(raw===null)return;

    const capacity=Number(raw);

    if(!capacity){
      return alert("Valeur incorrecte.");
    }

    setBusy(true);

    const r=await fetch(
      `/api/admin/printers/${printer.id}/reload`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({capacity})
      }
    );

    setBusy(false);

    if(!r.ok){
      return alert(
        "Impossible de mettre à jour l'imprimante."
      );
    }

    load();
  }

  async function registerUse(printer){
    const raw=prompt(
      `Combien d'impressions ont réellement été utilisées sur ${printer.name} ?`
    );

    if(raw===null)return;

    const used=Number(raw);

    if(!used){
      return alert("Valeur incorrecte.");
    }

    setBusy(true);

    const r=await fetch(
      `/api/admin/printers/${printer.id}/use`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({used})
      }
    );

    setBusy(false);

    if(!r.ok){
      return alert(
        "Impossible d'enregistrer l'utilisation."
      );
    }

    load();
  }

  if(!data){
    return (
      <div className="empty-state">
        <span>📦</span>
        <p>Chargement de l'inventaire...</p>
      </div>
    );
  }

  const groups=(data.materials||[]).reduce((acc,m)=>{
    (acc[m.category||"Autres"] ||= []).push(m);
    return acc;
  },{});

  const selectedMaterial=(data.materials||[])
    .find(m=>m.id===selectedMaterialId);

  const activeUnavailabilities=unavailabilities.filter(
    u=>u.status==="ACTIVE"
  );

  const historyUnavailabilities=unavailabilities.filter(
    u=>u.status!=="ACTIVE"
  );

  const formatDate=value=>
    new Date(value).toLocaleDateString("fr-FR");

  return (
    <section className="admin-inventory">
      <div className="calendar-toolbar">
        <div>
          <div className="eyebrow">
            ADMINISTRATEUR UNIQUEMENT
          </div>

          <h2>Inventaire & consommables</h2>

          <p className="muted">
            Ces informations ne sont jamais visibles par les clients.
          </p>
        </div>
      </div>


      <h3>🔧 Indisponibilités matériel</h3>

      <div className="panel">
        <div className="form-grid">

          <div>
            <label>Matériel</label>

            <select
  value={selectedMaterialId}
  onChange={e=>chooseMaterial(e.target.value)}
>
  <option value="">
    Sélectionner un matériel
  </option>

  {(data.materials||[]).map(m=>(
    <option key={m.id} value={m.id}>
      {m.name}
    </option>
  ))}
</select>
          </div>

          <div>
            <label>Du</label>
            <input
              type="date"
              value={unavailabilityForm.startAt}
              onChange={e=>
                setUnavailabilityForm(v=>({
                  ...v,
                  startAt:e.target.value
                }))
              }
            />
          </div>

          <div>
            <label>Au</label>
            <input
              type="date"
              value={unavailabilityForm.endAt}
              onChange={e=>
                setUnavailabilityForm(v=>({
                  ...v,
                  endAt:e.target.value
                }))
              }
            />
          </div>

          <div>
            <label>Motif</label>

            <select
              value={unavailabilityForm.reason}
              onChange={e=>
                setUnavailabilityForm(v=>({
                  ...v,
                  reason:e.target.value
                }))
              }
            >
              {Object.entries(reasonLabels).map(([value,label])=>(
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="wide">
            <label>
              Commentaire
              {unavailabilityForm.reason==="OTHER"
                ? " *"
                : ""}
            </label>

            <textarea
              rows="3"
              value={unavailabilityForm.notes}
              onChange={e=>
                setUnavailabilityForm(v=>({
                  ...v,
                  notes:e.target.value
                }))
              }
              placeholder={
                unavailabilityForm.reason==="OTHER"
                  ? "Précise obligatoirement la raison..."
                  : "Ex : écran tactile envoyé en SAV..."
              }
            />
          </div>
        </div>

        <div className="google-actions">
          <button
            className="danger-btn"
            disabled={busy || !selectedMaterialId}
            onClick={addUnavailability}
          >
            🔴 Mettre indisponible
          </button>
        </div>
      </div>


      {selectedMaterial && (
        <>
          <h3>
            📅 Indisponibilités de {selectedMaterial.name}
          </h3>

          <div className="events-list">

            {activeUnavailabilities.map(u=>(
              <article
                key={u.id}
                className="event-card"
              >
                <div className="event-main">
                  <h3>
                    🔴 {reasonLabels[u.reason]||u.reason}
                  </h3>

                  <p>
                    Du {formatDate(u.startAt)}
                    {" "}au{" "}
                    {formatDate(u.endAt)}
                  </p>

                  {u.notes && (
                    <p className="muted">
                      💬 {u.notes}
                    </p>
                  )}

                  <div className="event-actions">
                    <button
                      onClick={()=>completeUnavailability(u.id)}
                    >
                      ✅ Terminer
                    </button>

                    <button
                      className="danger-btn"
                      onClick={()=>deleteUnavailability(u.id)}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!activeUnavailabilities.length && (
              <div className="empty-state">
                <span>✅</span>
                <p>Aucune indisponibilité active.</p>
              </div>
            )}
                    </div>
        </>
      )}

      <>
        <h3>📚 Historique des indisponibilités</h3>

        <div className="events-list">
          {allUnavailabilities
            .filter(u=>u.status!=="ACTIVE")
            .map(u=>(
              <article
                key={u.id}
                className="event-card archived"
              >
                <div className="event-main">
                  <h3>
                    📦 {u.material?.name || "Matériel"}
                  </h3>

                  <strong>
                    {reasonLabels[u.reason] || u.reason}
                  </strong>

                  <p>
                    {formatDate(u.startAt)}
                    {" → "}
                    {formatDate(u.endAt)}
                  </p>

                  {u.notes && (
                    <p className="muted">
                      💬 {u.notes}
                    </p>
                  )}

                  <span className="badge">
                    {u.status==="COMPLETED"
                      ? "✅ Terminé"
                      : "Annulé"}
                  </span>
                </div>
              </article>
            ))}

          {!allUnavailabilities.some(u=>u.status!=="ACTIVE") && (
            <div className="empty-state">
              <span>📚</span>
              <p>Aucun historique pour le moment.</p>
            </div>
          )}
        </div>
      </>


      <h3>🖨️ Imprimantes mutualisées</h3>

      <div className="printer-grid">
        {(data.printers||[]).map(p=>{
          const pct=p.loadedCapacity
            ? Math.round(
                (p.remainingPrints/p.loadedCapacity)*100
              )
            : 0;

          const low=p.remainingPrints<=p.warningAt;

          return (
            <article
              className={`printer-card ${low?"printer-low":""}`}
              key={p.id}
            >
              <div className="printer-head">
                <strong>{p.name}</strong>
                <span>
                  {low?"🔴 Papier faible":"🟢 OK"}
                </span>
              </div>

              <div className="printer-number">
                {p.remainingPrints}
              </div>

              <p>
                tirages restants / {p.loadedCapacity} installés
              </p>

              <div className="stock-bar">
                <i
                  style={{
                    width:
                      `${Math.max(0,Math.min(100,pct))}%`
                  }}
                />
              </div>

              <p>
                Total réalisé : {p.totalPrints} tirages
              </p>

              <div className="event-actions">
                <button
                  disabled={busy}
                  onClick={()=>registerUse(p)}
                >
                  − Enregistrer utilisation
                </button>

                <button
                  disabled={busy}
                  onClick={()=>reloadPrinter(p)}
                >
                  ↻ Nouveau papier
                </button>
              </div>
            </article>
          );
        })}
      </div>


      <h3>📦 Ressources</h3>

      {Object.entries(groups).map(([category,items])=>(
        <div key={category} className="material-group">
          <h4>{category}</h4>

          <div className="materials-grid">
            {items.map(m=>(
              <article
                key={m.id}
                className="material-card"
              >
                <span>{m.name}</span>
                <b>×{m.capacity}</b>
                <small>
                  {m.blocksPlanning
                    ? "Planning"
                    : "Interne"}
                  {" · "}
                  {m.resourceKind}
                </small>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}


function AssistanceCenter(){
  const [data,setData]=useState(null),[title,setTitle]=useState(""),[url,setUrl]=useState("");
  const [settings,setSettings]=useState({});
  async function load(){
    const r=await fetch("/api/admin/assistance");
    const d=await r.json();
    setData(d);setSettings(d.settings||{});
  }
  useEffect(()=>{load()},[]);
  async function addVideo(){
    if(!title.trim()||!url.trim())return alert("Titre et lien obligatoires.");
    const r=await fetch("/api/admin/assistance/videos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,url})});
    if(!r.ok)return alert("Impossible d'ajouter la vidéo.");
    setTitle("");setUrl("");load();
  }
  async function removeVideo(id){
    if(!confirm("Supprimer cette vidéo ?"))return;
    await fetch(`/api/admin/assistance/videos/${id}`,{method:"DELETE"});load();
  }
  async function saveSettings(){
    const r=await fetch("/api/admin/assistance/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
    if(!r.ok)return alert("Impossible d'enregistrer les paramètres.");
    alert("✅ Paramètres d'assistance enregistrés.");load();
  }
  if(!data)return <div className="empty-state"><span>🆘</span><p>Chargement…</p></div>;
  const quick=[["🚀","FotoShare Copilot",settings.copilotUrl],["🖥️","Chrome Remote Desktop",settings.remoteDesktopUrl],["⚙️","LumaBooth Dashboard",settings.lumaboothDashboardUrl],["☁️","Google Drive",settings.googleDriveUrl],["📅","Google Agenda",settings.googleCalendarUrl]];
  return <section className="assistance-center">
    <div className="calendar-toolbar"><div><div className="eyebrow">ADMINISTRATEUR UNIQUEMENT</div><h2>🆘 Assistance & pilotage</h2><p className="muted">Tes outils de contrôle et l'assistance que tu mets à disposition des organisateurs.</p></div></div>
    <div className="assistance-links">{quick.map(([i,l,h])=><a key={l} className="assist-link-card" href={h||"#"} target="_blank" rel="noreferrer"><span>{i}</span><strong>{l}</strong><small>Ouvrir ↗</small></a>)}</div>

    <div className="assist-video-admin">
      <h3>👰 Assistance organisateur</h3>
      <p className="muted">Ces coordonnées et vidéos sont les seules informations d'assistance accessibles depuis le portail événement.</p>
      <div className="form-grid">
        <div><label>Téléphone assistance</label><input value={settings.supportPhone||""} onChange={e=>setSettings(x=>({...x,supportPhone:e.target.value}))} placeholder="07 ..."/></div>
        <div><label>Lien WhatsApp</label><input value={settings.whatsappUrl||""} onChange={e=>setSettings(x=>({...x,whatsappUrl:e.target.value}))} placeholder="https://wa.me/..."/></div>
        <div className="wide"><label>Lien Avis Google</label><input value={settings.googleReviewUrl||""} onChange={e=>setSettings(x=>({...x,googleReviewUrl:e.target.value}))} placeholder="https://..."/></div>
      </div>
      <button className="secondary-btn" onClick={saveSettings}>Enregistrer les coordonnées</button>
    </div>

    <div className="assist-video-admin">
      <h3>🎥 Vidéos de dépannage organisateur</h3>
      <div className="form-grid"><div><label>Titre</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Changer le papier"/></div><div><label>Lien vidéo</label><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></div></div>
      <button className="primary" onClick={addVideo}>Ajouter la vidéo</button>
      <div className="assist-video-list">{(data.videos||[]).map(v=><div className="assist-video-row" key={v.id}><div><strong>▶️ {v.title}</strong><small>{v.url}</small></div><div className="assist-video-actions"><a href={v.url} target="_blank" rel="noreferrer">Voir</a><button onClick={()=>removeVideo(v.id)}>Supprimer</button></div></div>)}{!data.videos?.length&&<p className="muted">Aucune vidéo pour le moment.</p>}</div>
    </div>
  </section>;
}

function PortalPage({token}){
  const [data,setData]=useState(null),[error,setError]=useState(""),[media,setMedia]=useState([]),[busy,setBusy]=useState(false);
  const [deleteItem,setDeleteItem]=useState(null),[deleteText,setDeleteText]=useState("");
  const [lightbox,setLightbox]=useState(null),[visibleCount,setVisibleCount]=useState(80);
  const [selectMode,setSelectMode]=useState(false),[selected,setSelected]=useState([]);
  const touchStart=useRef(null);

  async function loadMemories(){
    const r=await fetch(`/api/guest/${token}/memories`);
    if(r.ok){
      const d=await r.json();
      setMedia(d.media||[]);
      setData(old=>old
        ? {...old,event:{...old.event,showOriginalsToGuests:Boolean(d.showOriginalsToGuests)}}
        : old
      );
    }
  }

  useEffect(()=>{
    fetch(`/api/guest/${token}/portal`)
      .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Portail indisponible.");return d})
      .then(async d=>{setData(d);await loadMemories()})
      .catch(e=>setError(e.message));
  },[token]);

  const organizer=data?.role==="ORGANIZER";
  const organizerDocuments=data?.documents||null;
const contract=organizerDocuments?.contract||null;
const clientDocuments=organizerDocuments?.files||organizerDocuments?.invoices||[];
  const galleryMedia=organizer ? media : media.filter(m=>m.status==="VISIBLE");
  const photoMedia=galleryMedia.filter(m=>m.mediaType==="PHOTO");

  function moveLightbox(delta){
    if(!lightbox||!photoMedia.length)return;
    const idx=photoMedia.findIndex(x=>x.id===lightbox.id);
    if(idx<0)return;
    setLightbox(photoMedia[(idx+delta+photoMedia.length)%photoMedia.length]);
  }

  useEffect(()=>{
    function onKey(e){
      if(!lightbox)return;
      if(e.key==="Escape")setLightbox(null);
      else if(e.key==="ArrowLeft")moveLightbox(-1);
      else if(e.key==="ArrowRight")moveLightbox(1);
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[lightbox,photoMedia.length]);

  async function toggleOriginalsVisibility(){
    if(!organizer)return;

    const next=!Boolean(data?.event?.showOriginalsToGuests);

    const r=await fetch(
      `/api/guest/${token}/gallery-originals-visibility`,
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({show:next})
      }
    );

    const d=await r.json().catch(()=>({}));

    if(!r.ok){
      return alert(d.message||"Modification impossible.");
    }

    setData(old=>({
      ...old,
      event:{
        ...old.event,
        showOriginalsToGuests:Boolean(d.showOriginalsToGuests)
      }
    }));
  }

  async function upload(ev){
    const files=[...ev.target.files];
    if(!files.length)return;
    setBusy(true);
    const fd=new FormData();
    files.forEach(f=>fd.append("files",f));
    const r=await fetch(`/api/guest/${token}/memories/upload`,{method:"POST",body:fd});
    setBusy(false);
    ev.target.value="";
    if(!r.ok){const d=await r.json().catch(()=>({}));return alert(d.message||"Envoi impossible.")}
    await loadMemories();
  }

  async function action(id,act){
    const r=await fetch(`/api/guest/${token}/memories/${id}/${act}`,{method:"POST"});
    if(!r.ok)return alert("Action impossible.");
    await loadMemories();
    if(lightbox?.id===id){
      setLightbox(old=>old?{...old,status:act==="hide"?"HIDDEN":"VISIBLE"}:old);
    }
  }

  function toggleSelected(id){
    setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  }

  function selectAllMemories(){
    setSelected(galleryMedia.map(m=>m.id));
  }

  function clearSelectedMemories(){
    setSelected([]);
  }

  async function downloadSelectedMemories(){
    if(!selected.length)return;

    const items=galleryMedia.filter(m=>selected.includes(m.id));
    if(!items.length)return;

    if(items.length>50){
      const ok=window.confirm(
        `Vous allez télécharger ${items.length} fichiers originaux.\n\n` +
        `Le navigateur peut demander l’autorisation pour plusieurs téléchargements. Continuer ?`
      );
      if(!ok)return;
    }

    for(let i=0;i<items.length;i++){
      const m=items[i];
      const a=document.createElement("a");
      a.href=m.url;
      a.download=m.originalName||`souvenir-${i+1}`;
      a.style.display="none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise(resolve=>setTimeout(resolve,180));
    }
  }

  async function hideSelected(){
    if(!selected.length)return;
    for(const id of selected){
      await fetch(`/api/guest/${token}/memories/${id}/hide`,{method:"POST"});
    }
    setSelected([]);setSelectMode(false);await loadMemories();
  }

  async function confirmDelete(){
    if(deleteText!=="DELETE")return;
    const r=await fetch(`/api/guest/${token}/memories/${deleteItem.id}`,{
      method:"DELETE",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({confirmation:deleteText})
    });
    if(!r.ok){const d=await r.json().catch(()=>({}));return alert(d.message||"Suppression impossible.")}
    if(lightbox?.id===deleteItem.id)setLightbox(null);
    setDeleteItem(null);setDeleteText("");await loadMemories();
  }

  if(error){
    const maintenance=/maintenance temporaire|momentanément verrouillé/i.test(error);
    return <div className="portal-shell"><div className="portal-card">
      <img
        src="/logo.jpg"
        alt="Location Photobooth 28"
        style={{
          display:"block",
          width:maintenance?"min(220px, 55vw)":"min(320px, 75vw)",
          maxWidth:maintenance?220:320,
          height:"auto",
          objectFit:"contain",
          margin:"0 auto 20px"
        }}
      />
      <h1>{maintenance?"🔒 Galerie temporairement indisponible":"Portail indisponible"}</h1>
      <p>{error}</p>
    </div></div>;
  }
  if(!data)return <div className="portal-shell"><div className="portal-card"><p>Chargement…</p></div></div>;

  const e=data.event,support=data.support||{};
  const paged=galleryMedia.slice(0,visibleCount);
  const originalsMedia=paged.filter(m=>m.sourceGroup==="ORIGINAL");
  const partyMedia=paged.filter(m=>m.sourceGroup!=="ORIGINAL");
  const guestShare=data?.guestShare||null;

  const eventDisplayName=String(e.name||"")
    .replace(/^mariage\s+/i,"")
    .trim() || e.name || "Votre événement";

  const eventDateLabel=e.date
    ? new Date(e.date+"T12:00:00").toLocaleDateString(
        "fr-FR",
        {day:"2-digit",month:"2-digit",year:"numeric"}
      )
    : "";

  const qrPrintMessage=
    e.type==="MARIAGE"
      ? "Partagez vos plus beaux moments avec les mariés ! Scannez ce QR Code pour ajouter vos photos et découvrir les souvenirs partagés."
      : e.type==="ANNIVERSAIRE"
        ? "Partagez vos plus beaux moments de cet anniversaire ! Scannez ce QR Code pour ajouter vos photos et découvrir les souvenirs partagés."
        : "";

  const guestWhatsappUrl=guestShare?.guestUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        `📸 ${eventDisplayName}\n\n` +
        `La galerie photo de notre événement est connectée !\n` +
        `Scannez le QR Code ou utilisez ce lien pour ajouter vos photos et découvrir les souvenirs :\n` +
        `${guestShare.guestUrl}\n\n` +
        `Location Photobooth 28`
      )}`
    : "";

  function printGuestQr(){
    if(!guestShare?.qrDataUrl)return;

    const safeTitle=String(eventDisplayName)
      .replace(/[<>&"]/g,ch=>({
        "<":"&lt;",
        ">":"&gt;",
        "&":"&amp;",
        '"':"&quot;"
      }[ch]));

    const safeDate=String(eventDateLabel)
      .replace(/[<>&"]/g,ch=>({
        "<":"&lt;",
        ">":"&gt;",
        "&":"&amp;",
        '"':"&quot;"
      }[ch]));

    const card=`
      <section class="qr-card">
        <div class="brand">LOCATION PHOTOBOOTH 28</div>
        <h1>${safeTitle}</h1>
        ${safeDate ? `<div class="date">${safeDate}</div>` : ""}
        <img src="${guestShare.qrDataUrl}" alt="QR Code invités" />
        <h2>📸 Scannez-moi !</h2>
        ${qrPrintMessage ? `<p>${qrPrintMessage}</p>` : ""}
        <div class="connected">🟢 Galerie photo connectée</div>
      </section>
    `;

    const w=window.open("","_blank","width=900,height=1000");

    if(!w){
      alert("Le navigateur a bloqué la fenêtre d'impression.");
      return;
    }

    w.document.write(`
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>QR Code - ${safeTitle}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #fff;
            }
            .sheet {
              width: 100%;
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr;
              gap: 6mm;
              min-height: 281mm;
            }
            .qr-card {
              border: 2px solid #111827;
              border-radius: 12px;
              padding: 8mm 6mm;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .brand {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1.4px;
              margin-bottom: 4px;
            }
            h1 {
              font-size: 23px;
              margin: 4px 0;
            }
            .date {
              font-size: 13px;
              margin-bottom: 4px;
            }
            img {
              width: 48mm;
              height: 48mm;
              object-fit: contain;
              margin: 4mm 0 2mm;
            }
            h2 {
              margin: 2px 0 6px;
              font-size: 18px;
            }
            p {
              max-width: 75mm;
              margin: 0 0 8px;
              font-size: 12px;
              line-height: 1.35;
            }
            .connected {
              display: inline-block;
              padding: 5px 9px;
              border-radius: 999px;
              background: #dcfce7;
              color: #166534;
              font-size: 11px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            ${card}${card}${card}${card}
          </main>
          <script>
            window.addEventListener("load", function(){
              setTimeout(function(){
                window.focus();
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `);

    w.document.close();
  }

  return <div className="portal-shell"><main className="portal-card">
    <img className="portal-logo" src="/logo.jpg"/>
    <div className="eyebrow">LOCATION PHOTOBOOTH 28</div>
    <h1>{e.name}</h1>
    <p className="portal-date">
  {new Date(e.date+"T12:00:00").toLocaleDateString("fr-FR")}
  {e.type ? ` • ${e.type}` : ""}
</p>

{organizer&&(
  <section className="portal-section">

    <h2>📄 Mes documents</h2>

    <div style={{
      display:"grid",
      gap:14
    }}>

      <div className="portal-document-card">

        <h3>📄 Contrat</h3>

        {contract?.signed ? (
          <>
            <p>
              ✅ <strong>Contrat signé</strong>
            </p>

            {contract.signerName&&(
              <p className="muted">
                Signataire : {contract.signerName}
              </p>
            )}

            {contract.signedAt&&(
              <p className="muted">
                Signé le{" "}
                {new Date(contract.signedAt)
                  .toLocaleString("fr-FR")}
              </p>
            )}

            {contract.pdfUrl&&(
              <a
                className="portal-action"
                href={contract.pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                📄 Voir le contrat
              </a>
            )}
          </>
        ) : (
          <>
            <p>
              ⏳ Contrat en attente de signature
            </p>

            {contract?.pdfUrl&&(
              <a
                className="portal-action"
                href={contract.pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                📄 Lire le contrat
              </a>
            )}

            {contract?.signatureUrl&&(
              <a
                className="portal-action primary"
                href={contract.signatureUrl}
              >
                ✍️ Signer le contrat
              </a>
            )}
          </>
        )}

      </div>

      <div className="portal-document-card">

        <h3>📁 Documents</h3>

        {clientDocuments.length ? (
          <div style={{
            display:"grid",
            gap:10
          }}>
            {clientDocuments.map((document,index)=>(
              <a
                key={document.id}
                className="portal-action"
                href={document.url}
                target="_blank"
                rel="noreferrer"
              >
                {document.type==="QUOTE"
                  ? "📄"
                  : document.type==="DEPOSIT_INVOICE"
                    ? "💶"
                    : document.type==="INVOICE"
                      ? "🧾"
                      : document.type==="PURCHASE_ORDER"
                        ? "📦"
                        : "📎"}{" "}
                {document.displayName || document.name || `Document ${index+1}`}
              </a>
            ))}
          </div>
        ) : (
          <p className="muted">
            Aucun document disponible pour le moment.
          </p>
        )}

      </div>

    </div>

  </section>
)}
    {organizer&&<div className="portal-role">🔐 Espace organisateur</div>}

    {organizer&&guestShare&&(
      <section className="portal-section">
        <h2>📱 QR Code invités</h2>

        <div
          className="portal-document-card"
          style={{
            textAlign:"center",
            display:"grid",
            gap:12,
            justifyItems:"center"
          }}
        >
          <div>
            <h3 style={{marginBottom:4}}>
              {eventDisplayName}
            </h3>

            {eventDateLabel&&(
              <p className="muted" style={{marginTop:0}}>
                {eventDateLabel}
              </p>
            )}
          </div>

          <img
            src={guestShare.qrDataUrl}
            alt={`QR Code invités ${eventDisplayName}`}
            style={{
              width:"min(280px,80vw)",
              height:"auto",
              borderRadius:12,
              background:"#fff",
              padding:8
            }}
          />

          <div>
            <strong>🟢 Galerie photo connectée</strong>
            <p className="muted" style={{marginBottom:0}}>
              Les invités peuvent scanner ce QR Code pour ajouter leurs photos
              et consulter les souvenirs de l'événement.
            </p>
          </div>

          <div
            style={{
              display:"flex",
              gap:10,
              flexWrap:"wrap",
              justifyContent:"center"
            }}
          >
            <button
              type="button"
              className="portal-action"
              onClick={printGuestQr}
            >
              🖨️ Imprimer 4 QR Code sur A4
            </button>

            {guestWhatsappUrl&&(
              <a
                className="portal-action primary"
                href={guestWhatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                💬 Partager sur WhatsApp
              </a>
            )}
          </div>

          <div
            style={{
              width:"100%",
              display:"flex",
              gap:8
            }}
          >
            <input
              readOnly
              value={guestShare.guestUrl}
              style={{flex:1,minWidth:0}}
            />

            <button
              type="button"
              className="secondary-btn"
              onClick={async ()=>{
                try{
                  await navigator.clipboard.writeText(
                    guestShare.guestUrl
                  );
                  alert("✅ Lien invités copié.");
                }catch{
                  prompt(
                    "Copie le lien invités :",
                    guestShare.guestUrl
                  );
                }
              }}
            >
              Copier
            </button>
          </div>
        </div>
      </section>
    )}

    {e.fotoshareUrl&&<a className="portal-action primary" href={e.fotoshareUrl} target="_blank" rel="noreferrer">📸 Photos de la borne</a>}

    {organizer&&(
      <section className="portal-section">
        <div className="portal-document-card" style={{display:"flex",gap:16,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
          <div>
            <h3 style={{margin:"0 0 4px"}}>📸 Originaux visibles aux invités</h3>
            <p className="muted" style={{margin:0}}>
              Les originaux restent toujours visibles dans votre espace organisateur.
            </p>
          </div>
          <button
            type="button"
            className={e.showOriginalsToGuests?"primary":"secondary-btn"}
            onClick={toggleOriginalsVisibility}
          >
            {e.showOriginalsToGuests?"🟢 Affichés aux invités":"⚪ Masqués aux invités"}
          </button>
        </div>
      </section>
    )}

    <section className="portal-section">
      <div className="memories-heading">
        <div><h2>📸 LP28 Memories</h2><p className="muted">{galleryMedia.length} souvenir{galleryMedia.length>1?"s":""}</p></div>
        {organizer&&galleryMedia.length>0&&<button className="memory-select-toggle" onClick={()=>{setSelectMode(v=>!v);setSelected([])}}>{selectMode?"Annuler":"☑ Sélectionner"}</button>}
      </div>

      <label className={`portal-upload ${busy?"disabled":""}`}>
        📷 {busy?"Envoi en cours…":"Ajouter des photos"}
        <input
          type="file"
          multiple
          accept={[
            "image/jpeg,image/png,image/webp,image/heic,image/heif",
            e.guestVideoEnabled
              ? "video/mp4,video/quicktime"
              : ""
          ].filter(Boolean).join(",")}
          onChange={upload}
          disabled={busy}
        />
      </label>

      {e.guestUploadModerated&&<p className="portal-note">Modération avant publication activée pour cet événement.</p>}

      {selectMode&&organizer&&<div className="memory-selection-bar">
        <strong>{selected.length} sélectionnée{selected.length>1?"s":""} sur {galleryMedia.length}</strong>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button
            type="button"
            onClick={selectAllMemories}
            disabled={!galleryMedia.length || selected.length===galleryMedia.length}
          >
            ☑ Tout sélectionner
          </button>
          <button
            type="button"
            onClick={clearSelectedMemories}
            disabled={!selected.length}
          >
            ⬜ Tout désélectionner
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={downloadSelectedMemories}
          >
            ⬇️ Télécharger la sélection
          </button>
          <button disabled={!selected.length} onClick={hideSelected}>👁️ Masquer la sélection</button>
        </div>
      </div>}

      {partyMedia.length>0&&<>
        <h3 style={{marginTop:18}}>🎉 Tirages & invités <span className="muted">({partyMedia.length})</span></h3>
        <div className="memories-grid">
          {partyMedia.map(m=><article key={m.id} className={`memory-card ${m.status.toLowerCase()} ${selected.includes(m.id)?"selected":""}`}>
          {selectMode&&organizer&&<button className="memory-select-check" onClick={()=>toggleSelected(m.id)}>{selected.includes(m.id)?"✓":""}</button>}

          {m.mediaType==="VIDEO"
            ? <video src={m.url} controls preload="metadata"/>
            : <button className="memory-photo-button" onClick={()=>selectMode&&organizer?toggleSelected(m.id):setLightbox(m)}>
                <img src={m.thumbnailUrl||m.url} loading="lazy" decoding="async"/>
              </button>}

          {organizer&&<div className="memory-status">{m.status==="VISIBLE"?"Visible":m.status==="HIDDEN"?"Masquée":"À valider"}</div>}
          {organizer&&!selectMode&&<div className="memory-actions">
            {m.status==="VISIBLE"&&<button onClick={()=>action(m.id,"hide")}>👁️ Masquer</button>}
            {m.status==="HIDDEN"&&<button onClick={()=>action(m.id,"show")}>↩️ Réafficher</button>}
            {m.status==="PENDING"&&<><button onClick={()=>action(m.id,"approve")}>✅ Publier</button><button onClick={()=>action(m.id,"hide")}>👁️ Masquer</button></>}
            <button className="danger" onClick={()=>{setDeleteItem(m);setDeleteText("")}}>🗑️ Supprimer</button>
          </div>}
        </article>)}
        </div>
      </>}

      {originalsMedia.length>0&&<>
        <h3 style={{marginTop:28}}>📸 Originaux <span className="muted">({originalsMedia.length})</span></h3>
        <div className="memories-grid">
          {originalsMedia.map(m=><article key={m.id} className={`memory-card ${m.status.toLowerCase()} ${selected.includes(m.id)?"selected":""}`}>
          {selectMode&&organizer&&<button className="memory-select-check" onClick={()=>toggleSelected(m.id)}>{selected.includes(m.id)?"✓":""}</button>}

          {m.mediaType==="VIDEO"
            ? <video src={m.url} controls preload="metadata"/>
            : <button className="memory-photo-button" onClick={()=>selectMode&&organizer?toggleSelected(m.id):setLightbox(m)}>
                <img src={m.thumbnailUrl||m.url} loading="lazy" decoding="async"/>
              </button>}

          {organizer&&<div className="memory-status">{m.status==="VISIBLE"?"Visible":m.status==="HIDDEN"?"Masquée":"À valider"}</div>}
          {organizer&&!selectMode&&<div className="memory-actions">
            {m.status==="VISIBLE"&&<button onClick={()=>action(m.id,"hide")}>👁️ Masquer</button>}
            {m.status==="HIDDEN"&&<button onClick={()=>action(m.id,"show")}>↩️ Réafficher</button>}
            {m.status==="PENDING"&&<><button onClick={()=>action(m.id,"approve")}>✅ Publier</button><button onClick={()=>action(m.id,"hide")}>👁️ Masquer</button></>}
            <button className="danger" onClick={()=>{setDeleteItem(m);setDeleteText("")}}>🗑️ Supprimer</button>
          </div>}
        </article>)}
        </div>
      </>}

      {!galleryMedia.length&&<p className="muted">Aucun souvenir ajouté pour le moment.</p>}
      {visibleCount<galleryMedia.length&&<button className="memory-load-more" onClick={()=>setVisibleCount(v=>v+80)}>Afficher 80 photos de plus</button>}
    </section>

    <section className="portal-section">
      <h2>🆘 Besoin d'aide ?</h2>
      {(data.assistanceVideos||[]).length>0
        ? <div className="portal-videos">{data.assistanceVideos.map(v=><a key={v.id} href={v.url} target="_blank" rel="noreferrer">▶️ <span>{v.title}</span></a>)}</div>
        : <p className="muted">Aucune vidéo d'assistance disponible.</p>}
      <div className="portal-contact-actions">
        {support.phone&&<a href={`tel:${support.phone.replace(/\s/g,"")}`}>📞 Appeler l'assistance</a>}
        {support.whatsappUrl&&<a href={support.whatsappUrl} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
      </div>
    </section>

    {support.googleReviewUrl&&<a className="portal-action" href={support.googleReviewUrl} target="_blank" rel="noreferrer">⭐ Donner un avis Google</a>}
    <footer>Location Photobooth 28</footer>

    {lightbox&&<div className="memory-lightbox"
      onTouchStart={e=>touchStart.current=e.touches[0].clientX}
      onTouchEnd={e=>{
        if(touchStart.current===null)return;
        const delta=e.changedTouches[0].clientX-touchStart.current;
        if(Math.abs(delta)>50)moveLightbox(delta>0?-1:1);
        touchStart.current=null;
      }}>
      <button className="lightbox-close" onClick={()=>setLightbox(null)}>✕</button>
      <button className="lightbox-nav prev" onClick={()=>moveLightbox(-1)}>‹</button>
      <div className="lightbox-content">
        <img src={lightbox.url}/>
        {organizer&&<div className="lightbox-admin">
          <span>{lightbox.status==="VISIBLE"?"Visible":lightbox.status==="HIDDEN"?"Masquée":"À valider"}</span>
          {lightbox.status==="VISIBLE"&&<button onClick={()=>action(lightbox.id,"hide")}>👁️ Masquer</button>}
          {lightbox.status==="HIDDEN"&&<button onClick={()=>action(lightbox.id,"show")}>↩️ Réafficher</button>}
          {lightbox.status==="PENDING"&&<button onClick={()=>action(lightbox.id,"approve")}>✅ Publier</button>}
          <button className="danger" onClick={()=>{setDeleteItem(lightbox);setDeleteText("")}}>🗑️ Supprimer</button>
        </div>}
      </div>
      <button className="lightbox-nav next" onClick={()=>moveLightbox(1)}>›</button>
    </div>}

    {deleteItem&&<div className="memory-modal"><div className="memory-modal-card">
      <h2>⚠️ Suppression définitive</h2>
      <p>Cette action supprimera définitivement cette photo. Pour confirmer volontairement, saisissez <strong>DELETE</strong> en majuscules.</p>
      <input autoFocus value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"/>
      <div className="memory-modal-actions">
        <button onClick={()=>{setDeleteItem(null);setDeleteText("")}}>Annuler</button>
        <button className="danger" disabled={deleteText!=="DELETE"} onClick={confirmDelete}>Supprimer définitivement</button>
      </div>
    </div></div>}
  </main></div>;
}


function AdminGalleries(){
  const [galleries,setGalleries]=useState([]),[current,setCurrent]=useState(null),[detail,setDetail]=useState(null);
  const [deleteItem,setDeleteItem]=useState(null),[deleteText,setDeleteText]=useState("");
  const [lightbox,setLightbox]=useState(null),[filter,setFilter]=useState("ALL");
  const [selectMode,setSelectMode]=useState(false),[selected,setSelected]=useState([]);
  const [bulkDeleteOpen,setBulkDeleteOpen]=useState(false),[bulkDeleteText,setBulkDeleteText]=useState(""),[bulkBusy,setBulkBusy]=useState(false);

  async function load(){
    const r=await fetch("/api/admin/galleries");const d=await r.json();
    setGalleries(d.galleries||[]);
  }
  async function openGallery(id){
    const r=await fetch(`/api/admin/galleries/${id}`);const d=await r.json();
    if(!r.ok)return alert(d.message||"Galerie indisponible.");
    setCurrent(id);setDetail(d);setLightbox(null);setSelected([]);setSelectMode(false);
  }
  useEffect(()=>{load()},[]);

  async function action(id,act){
    const r=await fetch(`/api/admin/galleries/media/${id}/${act}`,{method:"POST"});
    if(!r.ok)return alert("Action impossible.");
    await openGallery(current);await load();
  }
  async function remove(){
    if(deleteText!=="DELETE")return;
    const r=await fetch(`/api/admin/galleries/media/${deleteItem.id}`,{
      method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmation:deleteText})
    });
    if(!r.ok)return alert("Suppression impossible.");
    setDeleteItem(null);setDeleteText("");setLightbox(null);await openGallery(current);await load();
  }
  async function expiration(value){
    await fetch(`/api/admin/galleries/${current}/expiration`,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({portalExpiresAt:value})
    });
    await openGallery(current);await load();
  }

  async function setPortalAccessMode(mode){
    if(!current)return;
    const labels={
      OPEN:"rouvrir la galerie",
      GUEST_LOCKED:"verrouiller l’accès des invités",
      ALL_LOCKED:"verrouiller l’accès des invités et de l’organisateur"
    };
    const ok=window.confirm(`Confirmer : ${labels[mode]} ?`);
    if(!ok)return;

    const r=await fetch(`/api/admin/galleries/${current}/access-mode`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return alert(d.message||"Modification impossible.");
    await openGallery(current);await load();
  }

  function toggleAdminSelected(id){
    setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }

  async function downloadAdminSelected(){
    if(!selected.length||!detail)return;
    const items=(detail.media||[]).filter(m=>selected.includes(m.id));
    if(!items.length)return;

    if(items.length>50){
      const ok=window.confirm(
        `Vous allez télécharger ${items.length} fichiers originaux.\n\n`+
        `Le navigateur peut demander l’autorisation pour plusieurs téléchargements. Continuer ?`
      );
      if(!ok)return;
    }

    for(let i=0;i<items.length;i++){
      const m=items[i];
      const a=document.createElement("a");
      a.href=m.url;
      a.download=m.originalName||`souvenir-${i+1}`;
      a.style.display="none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise(resolve=>setTimeout(resolve,180));
    }
  }

  async function removeSelected(){
    if(bulkDeleteText!=="DELETE"||!selected.length||bulkBusy)return;
    setBulkBusy(true);
    try{
      const ids=[...selected];
      const r=await fetch("/api/admin/galleries/media/bulk-delete",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ids,confirmation:bulkDeleteText})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok&&!d.deleted?.length){
        return alert(d.message||"Suppression en lot impossible.");
      }

      setBulkDeleteOpen(false);
      setBulkDeleteText("");
      setSelected([]);
      setSelectMode(false);
      setLightbox(null);
      await openGallery(current);
      await load();

      if(d.failed?.length){
        alert(`${d.deleted?.length||0} fichier(s) supprimé(s). ${d.failed.length} échec(s) : les fichiers en erreur ont été conservés dans LP28.`);
      }else{
        alert(`${d.deleted?.length||ids.length} fichier(s) supprimé(s) de LP28 et Google Drive.`);
      }
    }finally{
      setBulkBusy(false);
    }
  }

  if(detail){
    const list=(detail.media||[]).filter(m=>filter==="ALL"||m.status===filter);
    const originalList=list.filter(m=>m.sourceGroup==="ORIGINAL");
    const partyList=list.filter(m=>m.sourceGroup!=="ORIGINAL");
    const base=window.location.origin;
    const org=detail.event.organizerToken?`${base}/portal/${detail.event.organizerToken}`:"";
    const guest=detail.event.guestToken?`${base}/portal/${detail.event.guestToken}`:"";
    return <section className="admin-gallery">
      <div className="calendar-toolbar">
        <div><button className="ghost" onClick={()=>{setDetail(null);setCurrent(null)}}>← Galeries</button><div className="eyebrow">LP28 MEMORIES</div><h2>📸 {detail.event.name}</h2></div>
      </div>

      <div className="gallery-admin-tools">
        <div><label>Expiration de la galerie</label><input type="date" value={detail.event.portalExpiresAt||""} onChange={e=>expiration(e.target.value)}/></div>
        {detail.event.fotoshareUrl&&<a href={detail.event.fotoshareUrl} target="_blank" rel="noreferrer">📷 Ouvrir FotoShare</a>}
        {org&&<a href={org} target="_blank" rel="noreferrer">🔐 Portail organisateur</a>}
        {guest&&<a href={guest} target="_blank" rel="noreferrer">👥 Portail invité</a>}
      </div>

      <div className="qr-panel" style={{marginBottom:16,border:(detail.event.portalAccessMode||"OPEN")!=="OPEN"?"2px solid #d5b13f":undefined}}>
        <div style={{minWidth:0,flex:1}}>
          <strong>🔒 Sécurité de la galerie</strong>
          <p className="muted" style={{marginTop:6}}>
            {(detail.event.portalAccessMode||"OPEN")==="OPEN"
              ? "La galerie est accessible normalement."
              :(detail.event.portalAccessMode||"OPEN")==="GUEST_LOCKED"
                ? "Les invités sont temporairement bloqués. L’organisateur conserve son accès."
                : "Les invités et l’organisateur sont temporairement bloqués. L’Admin conserve son accès complet."}
          </p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
            <button
              type="button"
              onClick={()=>setPortalAccessMode("OPEN")}
              disabled={(detail.event.portalAccessMode||"OPEN")==="OPEN"}
            >🟢 Accès ouvert</button>
            <button
              type="button"
              onClick={()=>setPortalAccessMode("GUEST_LOCKED")}
              disabled={detail.event.portalAccessMode==="GUEST_LOCKED"}
            >🟠 Verrouiller les invités</button>
            <button
              type="button"
              className="danger"
              onClick={()=>setPortalAccessMode("ALL_LOCKED")}
              disabled={detail.event.portalAccessMode==="ALL_LOCKED"}
            >🔴 Verrouiller toute la galerie</button>
          </div>
          {(detail.event.portalAccessMode||"OPEN")!=="OPEN"&&<p style={{marginTop:10}}>
            Message affiché : <em>« Suite à une maintenance temporaire, l’accès à cette galerie est momentanément verrouillé. Merci de réessayer ultérieurement. »</em>
          </p>}
        </div>
      </div>

      {detail.event.lumaboothWebhookPath&&<div className="qr-panel" style={{marginBottom:16}}>
        <div style={{minWidth:0,flex:1}}>
          <strong>🔌 LumaBooth — {detail.event.name}</strong>
          <p>Lien unique de cette prestation à mettre dans LumaBooth → Déclencheurs → URL.</p>
          <input
            readOnly
            value={`${base}${detail.event.lumaboothWebhookPath}`}
            onFocus={e=>e.target.select()}
            style={{width:"100%",marginTop:8}}
          />
          <div style={{marginTop:10}}>
            <button onClick={async()=>{
              const url=`${base}${detail.event.lumaboothWebhookPath}`;
              try{
                await navigator.clipboard.writeText(url);
                alert("Lien LumaBooth copié.");
              }catch{
                window.prompt("Copiez le lien LumaBooth :",url);
              }
            }}>📋 Copier le lien LumaBooth</button>
          </div>
        </div>
      </div>}

      <div className="qr-panel">
        <div><strong>QR Code invité</strong><p>Le QR Code ouvre directement la galerie de cet événement.</p></div>
        {guest&&<img alt="QR Code invité" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(guest)}`}/>}
      </div>

      <div className="gallery-filters">
        {["ALL","VISIBLE","HIDDEN","PENDING"].map(x=><button key={x} className={filter===x?"active":""} onClick={()=>{setFilter(x);setSelected([])}}>{x==="ALL"?"Tout":x==="VISIBLE"?"Visibles":x==="HIDDEN"?"Masquées":"En attente"}</button>)}
      </div>

      {list.length>0&&<div className="memories-heading" style={{marginTop:14}}>
        <div><strong>Gestion des photos</strong><p className="muted">{list.length} élément{list.length>1?"s":""} dans ce filtre</p></div>
        <button className="memory-select-toggle" onClick={()=>{setSelectMode(v=>!v);setSelected([])}}>{selectMode?"Annuler":"☑ Sélectionner"}</button>
      </div>}

      {selectMode&&<div className="memory-selection-bar">
        <strong>{selected.length} sélectionnée{selected.length>1?"s":""} sur {list.length}</strong>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button type="button" onClick={()=>setSelected(list.map(m=>m.id))} disabled={!list.length||selected.length===list.length}>☑ Tout sélectionner</button>
          <button type="button" onClick={()=>setSelected([])} disabled={!selected.length}>⬜ Tout désélectionner</button>
          <button type="button" onClick={downloadAdminSelected} disabled={!selected.length}>⬇️ Télécharger la sélection</button>
          <button type="button" className="danger" onClick={()=>{setBulkDeleteText("");setBulkDeleteOpen(true)}} disabled={!selected.length}>🗑️ Supprimer la sélection</button>
        </div>
      </div>}

      {partyList.length>0&&<>
        <h3 style={{marginTop:18}}>🎉 Tirages & invités <span className="muted">({partyList.length})</span></h3>
        <div className="memories-grid">{partyList.map(m=><article className={`memory-card ${m.status.toLowerCase()} ${selected.includes(m.id)?"selected":""}`} key={m.id}>
          {selectMode&&<button className="memory-select-check" onClick={()=>toggleAdminSelected(m.id)}>{selected.includes(m.id)?"✓":""}</button>}
          {m.mediaType==="VIDEO"?<video src={m.url} controls preload="metadata"/>:<button className="memory-photo-button" onClick={()=>selectMode?toggleAdminSelected(m.id):setLightbox(m)}><img src={m.url} loading="lazy" decoding="async"/></button>}
          <div className="memory-status">{m.status==="VISIBLE"?"Visible":m.status==="HIDDEN"?"Masquée":"En attente"} · {m.mediaType==="VIDEO"?"Vidéo":"Photo"}</div>
          {!selectMode&&<div className="memory-actions">
            {m.status==="VISIBLE"?<button onClick={()=>action(m.id,"hide")}>👁️ Masquer</button>:<button onClick={()=>action(m.id,"show")}>↩️ Réafficher</button>}
            <button className="danger" onClick={()=>{setDeleteItem(m);setDeleteText("")}}>🗑️ Supprimer</button>
          </div>}
        </article>)}</div>
      </>}

      {originalList.length>0&&<>
        <h3 style={{marginTop:28}}>📸 Originaux <span className="muted">({originalList.length})</span></h3>
        <div className="memories-grid">{originalList.map(m=><article className={`memory-card ${m.status.toLowerCase()} ${selected.includes(m.id)?"selected":""}`} key={m.id}>
          {selectMode&&<button className="memory-select-check" onClick={()=>toggleAdminSelected(m.id)}>{selected.includes(m.id)?"✓":""}</button>}
          {m.mediaType==="VIDEO"?<video src={m.url} controls preload="metadata"/>:<button className="memory-photo-button" onClick={()=>selectMode?toggleAdminSelected(m.id):setLightbox(m)}><img src={m.url} loading="lazy" decoding="async"/></button>}
          <div className="memory-status">{m.status==="VISIBLE"?"Visible":m.status==="HIDDEN"?"Masquée":"En attente"} · {m.mediaType==="VIDEO"?"Vidéo":"Photo"}</div>
          {!selectMode&&<div className="memory-actions">
            {m.status==="VISIBLE"?<button onClick={()=>action(m.id,"hide")}>👁️ Masquer</button>:<button onClick={()=>action(m.id,"show")}>↩️ Réafficher</button>}
            <button className="danger" onClick={()=>{setDeleteItem(m);setDeleteText("")}}>🗑️ Supprimer</button>
          </div>}
        </article>)}</div>
      </>}

      {lightbox&&<div className="memory-lightbox admin-lightbox">
        <button className="lightbox-close" onClick={()=>setLightbox(null)}>✕</button>
        <div className="lightbox-content"><img src={lightbox.url}/><div className="lightbox-admin">
          <span>{lightbox.status}</span>
          {lightbox.status==="VISIBLE"?<button onClick={()=>action(lightbox.id,"hide")}>👁️ Masquer</button>:<button onClick={()=>action(lightbox.id,"show")}>↩️ Réafficher</button>}
          <button className="danger" onClick={()=>{setDeleteItem(lightbox);setDeleteText("")}}>🗑️ Supprimer</button>
        </div></div>
      </div>}

      {bulkDeleteOpen&&<div className="memory-modal"><div className="memory-modal-card">
        <h2>⚠️ Suppression définitive en lot</h2>
        <p>Vous allez supprimer <strong>{selected.length} fichier{selected.length>1?"s":""}</strong> de LP28 <strong>et de Google Drive</strong>.</p>
        <p>Saisissez <strong>DELETE</strong> pour confirmer.</p>
        <input autoFocus value={bulkDeleteText} onChange={e=>setBulkDeleteText(e.target.value)} placeholder="DELETE"/>
        <div className="memory-modal-actions">
          <button disabled={bulkBusy} onClick={()=>{setBulkDeleteOpen(false);setBulkDeleteText("")}}>Annuler</button>
          <button className="danger" disabled={bulkDeleteText!=="DELETE"||bulkBusy} onClick={removeSelected}>{bulkBusy?"Suppression…":"Supprimer définitivement"}</button>
        </div>
      </div></div>}

      {deleteItem&&<div className="memory-modal"><div className="memory-modal-card">
        <h2>⚠️ Suppression définitive</h2><p>Saisissez <strong>DELETE</strong> pour confirmer.</p>
        <input autoFocus value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"/>
        <div className="memory-modal-actions"><button onClick={()=>setDeleteItem(null)}>Annuler</button><button className="danger" disabled={deleteText!=="DELETE"} onClick={remove}>Supprimer définitivement</button></div>
      </div></div>}
    </section>;
  }

  return <section className="admin-gallery">
    <div className="calendar-toolbar"><div><div className="eyebrow">ADMINISTRATEUR</div><h2>📸 Galeries</h2><p className="muted">Supervision complète de LP28 Memories.</p></div></div>
    <div className="gallery-list">
      {galleries.map(g=><button className="gallery-list-card" key={g.id} onClick={()=>openGallery(g.id)}>
        <div><strong>{g.name}</strong><small>{new Date(g.date+"T12:00:00").toLocaleDateString("fr-FR")}</small></div>
        <div className="gallery-stats"><span>📷 {g.photos}</span><span>🎥 {g.videos}</span><span>🙈 {g.hidden}</span></div>
        <span className="gallery-open">Ouvrir →</span>
      </button>)}
      {!galleries.length&&<div className="empty-state"><span>📸</span><p>Aucune galerie active.</p></div>}
    </div>
  </section>;
}

function CollaboratorsPanel(){
  const [collaborators,setCollaborators]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(null);

  const emptyForm={
    firstName:"",
    lastName:"",
    phone:"",
    email:"",
    active:true,
    isDefault:false,
    canManage:true,
    canInstall:true,
    canPickup:true
  };

  const [form,setForm]=useState(emptyForm);

  async function load(){
    try{
      const r=await fetch("/api/collaborators",{
        credentials:"include"
      });

      const d=await r.json();

      if(!r.ok){
        alert(d.message||"Impossible de charger les collaborateurs.");
        return;
      }

      setCollaborators(d.collaborators||[]);
    }catch(e){
      console.error(e);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    load();
  },[]);

  function resetForm(){
    setEditing(null);
    setForm(emptyForm);
  }

  function editCollaborator(c){
    setEditing(c);

    setForm({
      firstName:c.firstName||"",
      lastName:c.lastName||"",
      phone:c.phone||"",
      email:c.email||"",
      active:c.active!==false,
      isDefault:Boolean(c.isDefault),
      canManage:c.canManage!==false,
      canInstall:c.canInstall!==false,
      canPickup:c.canPickup!==false
    });
  }

  async function saveCollaborator(){
    if(!form.firstName.trim()){
      return alert("Le prénom est obligatoire.");
    }

    setBusy(true);

    try{
      const r=await fetch(
        editing
          ? `/api/collaborators/${editing.id}`
          : "/api/collaborators",
        {
          method:editing ? "PATCH" : "POST",
          credentials:"include",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify(form)
        }
      );

      const d=await r.json();

      if(!r.ok){
        return alert(
          d.message||
          "Impossible d'enregistrer le collaborateur."
        );
      }

      resetForm();
      await load();

    }catch(e){
      console.error(e);
      alert("Impossible de joindre le serveur.");
    }finally{
      setBusy(false);
    }
  }

  if(loading){
    return (
      <div className="empty-state">
        <span>👷</span>
        <p>Chargement des collaborateurs...</p>
      </div>
    );
  }

  return (
    <section>
      <div className="calendar-toolbar">
        <div>
          <div className="eyebrow">
            GESTION DE L'ÉQUIPE
          </div>

          <h2>👷 Collaborateurs</h2>

          <p className="muted">
            Gère les personnes qui peuvent assurer les prestations,
            installations et récupérations.
          </p>
        </div>
      </div>

      <div className="panel">
        <h3>
          {editing
            ? `✏️ Modifier ${editing.firstName}`
            : "＋ Ajouter un collaborateur"}
        </h3>

        <div className="form-grid">

          <div>
            <label>Prénom *</label>
            <input
              value={form.firstName}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  firstName:e.target.value
                }))
              }
            />
          </div>

          <div>
            <label>Nom</label>
            <input
              value={form.lastName}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  lastName:e.target.value
                }))
              }
            />
          </div>

          <div>
            <label>Téléphone</label>
            <input
              value={form.phone}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  phone:e.target.value
                }))
              }
              placeholder="06 ..."
            />
          </div>

          <div>
            <label>E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  email:e.target.value
                }))
              }
            />
          </div>

        </div>

        <div className="check-grid">

          <label>
            <input
              type="checkbox"
              checked={form.canManage}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  canManage:e.target.checked
                }))
              }
            />
            ✅ Peut gérer la prestation
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.canInstall}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  canInstall:e.target.checked
                }))
              }
            />
            🚚 Peut installer
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.canPickup}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  canPickup:e.target.checked
                }))
              }
            />
            ↩️ Peut récupérer
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  active:e.target.checked
                }))
              }
            />
            🟢 Collaborateur actif
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={e=>
                setForm(v=>({
                  ...v,
                  isDefault:e.target.checked
                }))
              }
            />
            ⭐ Collaborateur par défaut
          </label>

        </div>

        <div className="google-actions">

          <button
            className="primary"
            disabled={busy}
            onClick={saveCollaborator}
          >
            {busy
              ? "Enregistrement..."
              : editing
                ? "Enregistrer les modifications"
                : "Ajouter le collaborateur"}
          </button>

          {editing && (
            <button
              className="secondary-btn"
              onClick={resetForm}
            >
              Annuler
            </button>
          )}

        </div>
      </div>

      <h3>👥 Équipe</h3>

      <div className="events-list">

        {collaborators.map(c=>(
          <article
            className="event-card"
            key={c.id}
          >
            <div className="event-main">

              <div className="event-title-row">

                <h3>
                  👤 {c.firstName} {c.lastName||""}
                </h3>

                {c.isDefault && (
                  <span className="booking-status status-confirmed">
                    ⭐ Par défaut
                  </span>
                )}

              </div>

              <div className="event-meta">

                {c.phone && (
                  <span>📞 {c.phone}</span>
                )}

                {c.email && (
                  <span>✉️ {c.email}</span>
                )}

              </div>

              <div className="event-meta">

                {c.canManage && (
                  <span>✅ Prestation</span>
                )}

                {c.canInstall && (
                  <span>🚚 Installation</span>
                )}

                {c.canPickup && (
                  <span>↩️ Récupération</span>
                )}

              </div>

              <div className="event-actions">

                <button
                  onClick={()=>editCollaborator(c)}
                >
                  ✏️ Modifier
                </button>

              </div>

            </div>
          </article>
        ))}

        {!collaborators.length && (
          <div className="empty-state">
            <span>👷</span>
            <p>Aucun collaborateur.</p>
          </div>
        )}

      </div>
    </section>
  );
}

const LP28_DOCUMENT_TYPES=[
  {value:"QUOTE",label:"📄 Devis"},
  {value:"DEPOSIT_INVOICE",label:"💶 Facture d'acompte"},
  {value:"INVOICE",label:"🧾 Facture"},
  {value:"PURCHASE_ORDER",label:"📦 Bon de commande"},
  {value:"OTHER",label:"📎 Autre document"}
];

function DocumentManager({event,onClose}){
  const [documents,setDocuments]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [file,setFile]=useState(null);
  const [type,setType]=useState("INVOICE");
  const [displayName,setDisplayName]=useState("");
  const [visibleClient,setVisibleClient]=useState(true);

  async function load(){
    setLoading(true);

    try{
      const r=await fetch(
        `/api/events/${event.id}/documents`,
        {credentials:"include"}
      );

      const d=await r.json().catch(()=>({}));

      if(!r.ok){
        throw new Error(
          d.message || "Impossible de charger les documents."
        );
      }

      setDocuments(d.documents||[]);
    }catch(err){
      alert(err.message);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    load();
  },[event.id]);

  async function uploadDocument(ev){
    ev.preventDefault();

    if(!file){
      return alert("Choisis un fichier PDF.");
    }

    setBusy(true);

    try{
      const fd=new FormData();

      fd.append("file",file);
      fd.append("type",type);
      fd.append(
        "displayName",
        displayName.trim() ||
        LP28_DOCUMENT_TYPES.find(x=>x.value===type)?.label
          ?.replace(/^[^\p{L}\p{N}]+/u,"")
          || "Document"
      );
      fd.append(
        "visibleClient",
        visibleClient ? "true" : "false"
      );

      const r=await fetch(
        `/api/events/${event.id}/documents`,
        {
          method:"POST",
          credentials:"include",
          body:fd
        }
      );

      const d=await r.json().catch(()=>({}));

      if(!r.ok){
        throw new Error(
          d.message || "Impossible d'ajouter le document."
        );
      }

      setFile(null);
      setDisplayName("");

      const input=document.getElementById(
        `lp28-document-file-${event.id}`
      );

      if(input){
        input.value="";
      }

      await load();

    }catch(err){
      alert(err.message);
    }finally{
      setBusy(false);
    }
  }

  async function removeDocument(document){
    if(
      !confirm(
        `Supprimer définitivement "${document.displayName||document.name}" ?`
      )
    ){
      return;
    }

    const r=await fetch(
      `/api/events/${event.id}/documents/${document.id}`,
      {
        method:"DELETE",
        credentials:"include"
      }
    );

    const d=await r.json().catch(()=>({}));

    if(!r.ok){
      return alert(
        d.message || "Suppression impossible."
      );
    }

    await load();
  }

  async function toggleVisibility(document){
    const r=await fetch(
      `/api/events/${event.id}/documents/${document.id}`,
      {
        method:"PATCH",
        credentials:"include",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          type:document.type,
          displayName:document.displayName,
          visibleClient:!document.visibleClient
        })
      }
    );

    const d=await r.json().catch(()=>({}));

    if(!r.ok){
      return alert(
        d.message || "Modification impossible."
      );
    }

    await load();
  }

  return (
    <div className="modal-backdrop">
      <div
        className="share-modal"
        style={{
          width:"min(760px,94vw)",
          maxHeight:"90vh",
          overflow:"auto"
        }}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              DOSSIER CLIENT
            </div>
            <h2>📁 Documents — {event.name}</h2>
          </div>

          <button
            className="icon-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={uploadDocument}
          style={{
            display:"grid",
            gap:12,
            marginBottom:20
          }}
        >
          <div className="form-grid">
            <div>
              <label>Type de document</label>

              <select
                value={type}
                onChange={e=>setType(e.target.value)}
              >
                {LP28_DOCUMENT_TYPES.map(x=>(
                  <option
                    key={x.value}
                    value={x.value}
                  >
                    {x.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Nom affiché</label>

              <input
                value={displayName}
                onChange={e=>
                  setDisplayName(e.target.value)
                }
                placeholder="Ex : Facture d'acompte 2026-042"
              />
            </div>
          </div>

          <div>
            <label>Fichier PDF</label>

            <input
              id={`lp28-document-file-${event.id}`}
              type="file"
              accept="application/pdf,.pdf"
              onChange={e=>
                setFile(
                  e.target.files?.[0] || null
                )
              }
            />
          </div>

          <label
            style={{
              display:"flex",
              alignItems:"center",
              gap:8
            }}
          >
            <input
              type="checkbox"
              checked={visibleClient}
              onChange={e=>
                setVisibleClient(e.target.checked)
              }
            />

            👤 Visible dans l'espace organisateur
          </label>

          <button
            className="primary"
            disabled={busy}
          >
            {busy
              ? "Envoi en cours..."
              : "📤 Ajouter le document"}
          </button>
        </form>

        <hr/>

        <h3>Documents du dossier</h3>

        {loading ? (
          <p className="muted">
            Chargement...
          </p>
        ) : documents.length ? (
          <div
            style={{
              display:"grid",
              gap:10
            }}
          >
            {documents.map(document=>(
              <div
                key={document.id}
                className="portal-document-card"
                style={{
                  display:"grid",
                  gap:8
                }}
              >
                <div
                  style={{
                    display:"flex",
                    justifyContent:"space-between",
                    gap:12,
                    flexWrap:"wrap"
                  }}
                >
                  <div>
                    <strong>
                      {document.typeLabel}
                    </strong>

                    <div>
                      {document.displayName || document.name}
                    </div>
                  </div>

                  <span
                    style={{
                      padding:"4px 8px",
                      borderRadius:999,
                      fontSize:12,
                      fontWeight:700,
                      background:document.visibleClient
                        ? "#dcfce7"
                        : "#f3f4f6",
                      color:document.visibleClient
                        ? "#166534"
                        : "#4b5563"
                    }}
                  >
                    {document.visibleClient
                      ? "👤 Visible client"
                      : "🔒 Admin uniquement"}
                  </span>
                </div>

                <div
                  style={{
                    display:"flex",
                    gap:8,
                    flexWrap:"wrap"
                  }}
                >
                  <a
                    className="portal-action"
                    href={document.adminUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    👁️ Voir
                  </a>

                  <button
                    type="button"
                    onClick={()=>
                      toggleVisibility(document)
                    }
                  >
                    {document.visibleClient
                      ? "🔒 Masquer au client"
                      : "👤 Rendre visible"}
                  </button>

                  <button
                    type="button"
                    className="danger-btn"
                    onClick={()=>
                      removeDocument(document)
                    }
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Aucun document déposé.
          </p>
        )}
      </div>
    </div>
  );
}

function AdminDocuments({events,onOpen}){
  const [search,setSearch]=useState("");

  const filtered=events.filter(event=>
    (
      `${event.name} ${event.organizerName||""} ${event.type||""}`
    )
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section>
      <div className="calendar-toolbar">
        <div>
          <div className="eyebrow">
            DOSSIERS CLIENTS
          </div>

          <h2>📄 Documents</h2>

          <p className="muted">
            Devis, factures d'acompte, factures,
            bons de commande et autres PDF.
          </p>
        </div>
      </div>

      <div className="events-toolbar">
        <input
          placeholder="🔎 Rechercher un client ou événement..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />

        <span>
          {filtered.length} dossier(s)
        </span>
      </div>

      <div className="events-list">
        {filtered.map(event=>(
          <article
            className="event-card"
            key={event.id}
          >
            <div className="event-date">
              <strong>
                {event.date?.slice(8,10)||"--"}
              </strong>

              <span>
                {new Date(
                  event.date+"T12:00:00"
                ).toLocaleDateString(
                  "fr-FR",
                  {month:"short"}
                )}
              </span>
            </div>

            <div className="event-content">
              <strong>{event.name}</strong>

              <div className="event-meta">
                {event.organizerName&&(
                  <span>
                    👤 {event.organizerName}
                  </span>
                )}

                <span>
                  {event.type}
                </span>

                {event.contractStatus==="SIGNED"&&(
                  <span>
                    🟢 Contrat signé
                  </span>
                )}
              </div>

              <div className="event-actions">
                <button
                  onClick={()=>onOpen(event)}
                >
                  📁 Gérer les documents
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Dashboard({onLogout}) {
  const [view,setView]=useState("dashboard");
  const [events,setEvents]=useState([]);
  const [stats,setStats]=useState({events:0,upcoming:0,signedContracts:0,activeGalleries:0});
  const [formEvent,setFormEvent]=useState(undefined);
  const [showForm,setShowForm]=useState(false);
  const [shareEvent,setShareEvent]=useState(null);
  const [documentEvent,setDocumentEvent]=useState(null);
  const [search,setSearch]=useState("");

  async function load(){
    const [e,d]=await Promise.all([
      fetch("/api/events").then(r=>r.json()),
      fetch("/api/dashboard").then(r=>r.json())
    ]);
    setEvents(e.events||[]);
    setStats(d.stats||{events:0,upcoming:0,signedContracts:0,activeGalleries:0});
  }

  useEffect(()=>{load()},[]);

  async function completeEvent(event){
    if(!confirm(`Confirmer que la prestation "${event.name}" est terminée ?`)) return;
    const r=await fetch(`/api/events/${event.id}/complete`,{method:"PATCH"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) return alert(d.message||"Impossible de terminer la prestation.");
    await load();
  }

  async function cancelContractSignature(event){
    if(
      !confirm(
        `Annuler la signature du contrat de "${event.name}" ?\n\n` +
        "La signature et l'horodatage seront retirés du contrat actif. " +
        "Une trace de l'annulation sera conservée dans l'administration."
      )
    ){
      return;
    }

    const r=await fetch(
      `/api/events/${event.id}/contract-signature/cancel`,
      {
        method:"POST",
        credentials:"include"
      }
    );

    const d=await r.json().catch(()=>({}));

    if(!r.ok){
      return alert(
        d.message || "Impossible d'annuler la signature."
      );
    }

    alert(
      "✅ Signature annulée. Le contrat peut être signé à nouveau."
    );

    await load();
  }

  async function syncGoogle(event){
    const r=await fetch(`/api/events/${event.id}/google-sync`,{method:"POST"});
    let d={};
    try{d=await r.json()}catch{}
    if(!r.ok) return alert(d.message||"Synchronisation Google impossible.");
    if(d.warnings?.length) return alert(`Synchronisation partielle :\n${d.warnings.join("\n")}`);
    alert("✅ Google Calendar et Google Drive synchronisés.");
    load();
  }

  async function remove(event){
    if(!confirm(`Supprimer définitivement "${event.name}" ?`)) return;
    await fetch(`/api/events/${event.id}`,{method:"DELETE"});
    load();
  }

  async function archive(event){
    await fetch(`/api/events/${event.id}/archive`,{method:"POST"});
    load();
  }

  function saved(){setShowForm(false);setFormEvent(undefined);load();}

  const filtered=useMemo(
    ()=>events.filter(e=>(e.name+" "+e.organizerName+" "+e.type).toLowerCase().includes(search.toLowerCase())),
    [events,search]
  );

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/logo.jpg"/><div><strong>LP28 Suite</strong><span>Version 8.3.0</span></div></div>
      <nav>
        <button className={`nav-item ${view==="dashboard"?"active":""}`} onClick={()=>setView("dashboard")}>🏠 Tableau de bord</button>
        <button className={`nav-item ${view==="events"?"active":""}`} onClick={()=>setView("events")}>📅 Événements</button>
        <button className={`nav-item ${view==="planning"?"active":""}`} onClick={()=>setView("planning")}>🗓️ Planning</button>
        <button className={`nav-item ${view==="materialPlanning"?"active":""}`} onClick={()=>setView("materialPlanning")}>📦 Planning matériel</button>
        <button className={`nav-item ${view==="inventory"?"active":""}`} onClick={()=>setView("inventory")}>🔐 Inventaire admin</button>
        <button className={`nav-item ${view==="longPlanning"?"active":""}`} onClick={()=>setView("longPlanning")}>🗓️ Planning 24 mois</button>
        <button className={`nav-item ${view==="documents"?"active":""}`} onClick={()=>setView("documents")}>📄 Documents</button>
        <button className={`nav-item ${view==="galleries"?"active":""}`} onClick={()=>setView("galleries")}>📸 Galeries</button>
        <button className={`nav-item ${view==="collaborators"?"active":""}`} onClick={()=>setView("collaborators")}>👷 Collaborateurs</button>
        <button className={`nav-item ${view==="google"?"active":""}`} onClick={()=>setView("google")}>☁️ Google</button>
        <button className={`nav-item ${view==="assistance"?"active":""}`} onClick={()=>setView("assistance")}>🆘 Assistance</button>
      </nav>
      <div className="sidebar-footer"><a href={SITE} target="_blank">www.locationphotobooth28.fr</a><button className="logout" onClick={onLogout}>Déconnexion</button></div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div><div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div><h1>{view==="events"?"Mes événements":view==="planning"?"Planning":view==="materialPlanning"?"Planning matériel":view==="inventory"?"Inventaire administrateur":view==="longPlanning"?"Planning 24 mois":view==="documents"?"Documents":view==="galleries"?"Galeries":view==="assistance"?"Assistance":view==="collaborators"?"Collaborateurs":view==="google"?"Google Workspace":"Tableau de bord"}</h1><p className="muted">Simple, rapide, efficace.</p></div>
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
            <div className="event-content">
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <strong>{event.name}</strong>
                {event.contractStatus==="SIGNED"&&<span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dcfce7",color:"#166534",fontSize:12,fontWeight:700}}>🟢 Contrat signé</span>}
                {event.status==="COMPLETED"&&<span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dcfce7",color:"#166534",fontSize:12,fontWeight:700}}>✅ Prestation terminée</span>}
                <span className={`booking-status status-${(event.bookingStatus||"CONFIRMED").toLowerCase()}`}>
                  {event.bookingStatus==="OPTION"?"🟠 Option":event.bookingStatus==="QUOTE_SENT"?"📤 Devis envoyé":event.bookingStatus==="QUOTE_DRAFT"?"📝 Devis":event.bookingStatus==="CONFIRMED"?"🟢 Confirmé":event.bookingStatus==="COMPLETED"?"🔵 Terminé":event.bookingStatus==="DECLINED"?"⚪ Refusé":event.bookingStatus==="CANCELLED"?"🔴 Annulé":"Statut"}
                </span>
              </div>
              <div className="event-meta">
                <span>{event.type}{event.organizerName?` · ${event.organizerName}`:""}{event.archived?" · Archivé":""}</span>
                <span>📍 {event.address||"Adresse non renseignée"}</span>
                <span>📦 {event.materials?.length||0} sélection(s)</span>
                {event.printer&&<span>🖨️ {event.printer.name} · {event.printer.remainingPrints} restants</span>}
                <span>👥 {event.guestCount||0} invité(s)</span>
                {event.pickupDate&&<span>↩️ Reprise {new Date(event.pickupDate+"T12:00:00").toLocaleDateString("fr-FR")}{event.pickupTime?` ${event.pickupTime}`:""}</span>}
                {event.frameSource&&event.frameSource!=="NONE"&&<span className={`frame-badge frame-${event.frameStatus?.toLowerCase()}`}>🎨 {event.frameSource==="CLIENT"?"Client":"LP28"} · {event.frameStatus==="DONE"?"Terminé":event.frameStatus==="IN_PROGRESS"?"En cours":"À faire"}</span>}
                {event.googleCalendarEventId&&<span>📅 Agenda ✓</span>}
                {event.googleDriveFolderId&&<span>☁️ Drive ✓</span>}
              </div>
              <div className="event-actions">
                <button onClick={()=>syncGoogle(event)}>☁️ Sync Google</button>
                <button onClick={()=>setShareEvent(event)}>📱 Partager</button>
                <button onClick={()=>window.open(`/api/events/${event.id}/contract.pdf`,"_blank","noopener,noreferrer")}>📄 Voir le contrat</button>
                <button onClick={()=>setDocumentEvent(event)}>📁 Documents</button>
                {event.contractStatus==="SIGNED" ? (
                  <button
                    className="danger-btn"
                    onClick={()=>cancelContractSignature(event)}
                  >
                    ↩️ Annuler la signature
                  </button>
                ) : (
                  <button onClick={async()=>{
                    try{
                      const r=await fetch(`/api/events/${event.id}/contract-signature-link`,{method:"POST"});
                      const d=await r.json().catch(()=>({}));
                      if(!r.ok)return alert(d.message||"Impossible de préparer le contrat à signer.");
                      try{await navigator.clipboard.writeText(d.signatureUrl);alert(`✅ Lien de signature créé et copié !\n\n${d.signatureUrl}`)}
                      catch{prompt("Copie ce lien et envoie-le au client :",d.signatureUrl)}
                    }catch(err){console.error(err);alert("Erreur lors de la création du lien de signature.")}
                  }}>✍️ Faire signer</button>
                )}
                {event.status!=="COMPLETED"&&<button onClick={()=>completeEvent(event)}>✅ Prestation terminée</button>}
                <button onClick={()=>{setFormEvent(event);setShowForm(true)}}>✏️ Modifier</button>
                <button onClick={()=>archive(event)}>{event.archived?"♻️ Réactiver":"📦 Archiver"}</button>
                <button className="danger-btn" onClick={()=>remove(event)}>🗑️ Supprimer</button>
              </div>
            </div>
          </article>)}
        </div>
      </> : view==="planning" ? <>
        <CalendarView events={events} onOpenEvent={event=>{setFormEvent(event);setShowForm(true)}}/>
        <section className="planning-legend"><span><i className="dot dot-marriage"></i>Mariage</span><span><i className="dot dot-anniversaire"></i>Anniversaire</span><span><i className="dot dot-entreprise"></i>Entreprise</span><span><i className="dot dot-bapteme"></i>Baptême</span><span><i className="dot dot-autre"></i>Autre</span></section>
      </> : view==="inventory" ? <AdminInventory/> : view==="materialPlanning" ? <MaterialPlanning/> : view==="longPlanning" ? <LongRangePlanning/> : view==="galleries" ? <AdminGalleries/> : view==="collaborators" ? <CollaboratorsPanel/> : view==="google" ? <GooglePanel/> : view==="assistance" ? <AssistanceCenter/> : view==="documents" ? <AdminDocuments events={events} onOpen={setDocumentEvent}/> : null}
    </main>

    {showForm&&<EventForm event={formEvent} onClose={()=>{setShowForm(false);setFormEvent(undefined)}} onSaved={saved}/>}
    {shareEvent&&<ShareModal event={shareEvent} onClose={()=>setShareEvent(null)}/>}
    {documentEvent&&<DocumentManager event={documentEvent} onClose={()=>setDocumentEvent(null)}/>}
  </div>;
}

function CollaboratorPortalPage({token}){
  const [data,setData]=useState(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch(`/api/collaborator-portal/${encodeURIComponent(token)}`)
      .then(async r=>{
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.message||"Accès collaborateur indisponible.");
        return d;
      })
      .then(setData)
      .catch(e=>setError(e.message));
  },[token]);

  if(error)return <div className="portal-page"><div className="portal-card"><h1>Accès indisponible</h1><p>{error}</p></div></div>;
  if(!data)return <div className="portal-page"><div className="portal-card"><p>Chargement…</p></div></div>;

  const c=data.collaborator;
  const m=data.mission;

  const date=m.date
    ? new Date(m.date+"T12:00:00").toLocaleDateString(
        "fr-FR",
        {
          weekday:"long",
          day:"numeric",
          month:"long",
          year:"numeric"
        }
      )
    : "";

  const pickupDate=m.pickupDate
    ? new Date(m.pickupDate+"T12:00:00").toLocaleDateString(
        "fr-FR",
        {
          weekday:"long",
          day:"numeric",
          month:"long",
          year:"numeric"
        }
      )
    : null;

  return (
    <div className="portal-page">
      <div className="portal-card">

        <div className="eyebrow">LOCATION PHOTOBOOTH 28</div>

        <h1>Bonjour {c.firstName} 👋</h1>

        <div className="portal-role">
          👷 Espace collaborateur
        </div>

        <section className="portal-section">
          <h2>📸 Ta prestation</h2>

          <h3>{m.name}</h3>

          {m.type && <p><strong>Type :</strong> {m.type}</p>}

          <p>
            📅 <strong>{date}</strong>
          </p>

          {m.installTime && (
            <p>
              🚚 Installation : <strong>{m.installTime}</strong>
            </p>
          )}

          {pickupDate && (
            <p>
              ↩️ Reprise : <strong>{pickupDate}</strong>
              {m.pickupTime ? ` à ${m.pickupTime}` : ""}
            </p>
          )}

          {m.address && (
  <div style={{marginTop:12}}>
    <p>
      📍 {m.address}
    </p>

    <div
      style={{
        display:"flex",
        gap:8,
        flexWrap:"wrap",
        marginTop:8
      }}
    >
      <a
        className="primary"
        href={`https://waze.com/ul?q=${encodeURIComponent(m.address)}&navigate=yes`}
        target="_blank"
        rel="noopener noreferrer"
      >
        🚗 Waze
      </a>

      <a
        className="primary"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        🗺️ Google Maps
      </a>
    </div>
  </div>
)}
        </section>

        {m.materials?.length>0 && (
          <section className="portal-section">
            <h2>📦 Matériel</h2>

            {m.materials.map((material,index)=>(
              <p key={index}>
                ✓ {material.name}
                {material.quantity>1
                  ? ` × ${material.quantity}`
                  : ""}
              </p>
            ))}
          </section>
        )}

        {data.client && (
          <section className="portal-section">
            <h2>👤 Contact client</h2>

            {data.client.name && (
              <p><strong>{data.client.name}</strong></p>
            )}

            {data.client.phone && (
              <p>
                📞{" "}
                <a href={`tel:${data.client.phone}`}>
                  {data.client.phone}
                </a>
              </p>
            )}

            {data.client.email && (
              <p>
                ✉️{" "}
                <a href={`mailto:${data.client.email}`}>
                  {data.client.email}
                </a>
              </p>
            )}
          </section>
        )}

       {data.permissions.balance && (
  <section className="portal-section">
    <h2>💶 Règlement</h2>

    {data.balancePaid ? (
      <p>
        ✅ <strong>Prestation réglée</strong>
      </p>
    ) : (
      <>
        <p>
          Reste à régler :{" "}
          <strong>
            {data.balance != null
              ? `${data.balance} €`
              : "Non renseigné"}
          </strong>
        </p>

        {data.balance != null && Number(data.balance) > 0 && (
          <button
            className="primary"
            onClick={async () => {
              const ok = confirm(
                `Confirmer avoir récupéré le règlement de ${data.balance} € ?`
              );

              if (!ok) return;

              const r = await fetch(
                `/api/collaborator-portal/${encodeURIComponent(token)}/payment-received`,
                {
                  method: "POST"
                }
              );

              const d = await r.json();

              if (!r.ok) {
                return alert(
                  d.message ||
                  "Impossible d'enregistrer le règlement."
                );
              }

              window.location.reload();
            }}
          >
            ✅ Confirmer le règlement reçu
          </button>
        )}
      </>
    )}

    {data.actions
      ?.filter(a => a.action === "PAYMENT_RECEIVED")
      .map((a, index) => (
        <p key={index} className="muted">
          🕒 Paiement confirmé le{" "}
          {new Date(a.createdAt).toLocaleString("fr-FR")}
        </p>
      ))}
  </section>
)}

{data.caution && (
  <section className="portal-section">
    <h2>🛡️ Caution</h2>

    {!data.caution.received ? (
      <button
        className="primary"
        onClick={async () => {
          if (!confirm("Confirmer la réception de la caution ?")) {
            return;
          }

          const r = await fetch(
            `/api/collaborator-portal/${encodeURIComponent(token)}/caution-received`,
            {
              method: "POST"
            }
          );

          const d = await r.json();

          if (!r.ok) {
            return alert(
              d.message ||
              "Impossible d'enregistrer la réception de la caution."
            );
          }

          window.location.reload();
        }}
      >
        🛡️ Confirmer la réception de la caution
      </button>
    ) : (
      <p>
        ✅ <strong>Caution reçue</strong>
      </p>
    )}

    {data.caution.received && !data.caution.returned && (
      <button
        className="primary"
        onClick={async () => {
          if (!confirm("Confirmer la restitution de la caution ?")) {
            return;
          }

          const r = await fetch(
            `/api/collaborator-portal/${encodeURIComponent(token)}/caution-returned`,
            {
              method: "POST"
            }
          );

          const d = await r.json();

          if (!r.ok) {
            return alert(
              d.message ||
              "Impossible d'enregistrer la restitution de la caution."
            );
          }

          window.location.reload();
        }}
      >
        ✅ Confirmer la restitution de la caution
      </button>
    )}

    {data.caution.returned && (
      <p>
        ✅ <strong>Caution rendue</strong>
      </p>
    )}

    {data.actions?.length > 0 && (
      <div style={{ marginTop: 16 }}>
        <h3>🕒 Historique</h3>

        {data.actions
          .filter(a =>
            a.action === "CAUTION_RECEIVED" ||
            a.action === "CAUTION_RETURNED"
          )
          .map((a, index) => (
            <p key={index}>
              {a.action === "CAUTION_RECEIVED"
                ? "🛡️ Caution reçue"
                : "✅ Caution rendue"}
              {" — "}
              {new Date(a.createdAt).toLocaleString("fr-FR")}
            </p>
          ))}
      </div>
    )}
  </section>
)}

        {data.instructions && (
  <section className="portal-section">
    <h2>📝 Consignes</h2>
    <p>{data.instructions}</p>
  </section>
)}

{(data.permissions.contract || data.permissions.invoice) && (
  <section className="portal-section">
    <h2>📄 Documents</h2>

    {data.permissions.contract && (
      <div style={{marginBottom:12}}>
        {data.documents?.contract ? (
          <>
            {data.documents.contract.signed ? (
              <div
                style={{
                  marginBottom:10,
                  padding:"10px 12px",
                  borderRadius:10,
                  background:"#dcfce7",
                  color:"#166534",
                  fontWeight:700
                }}
              >
                🟢 Contrat signé
                {data.documents.contract.signerName
                  ? ` par ${data.documents.contract.signerName}`
                  : ""}
                {data.documents.contract.signedAt && (
                  <div style={{fontSize:12,marginTop:4}}>
                    Signé le{" "}
                    {new Date(
                      data.documents.contract.signedAt
                    ).toLocaleString("fr-FR")}
                  </div>
                )}
              </div>
            ) : (
              <p className="muted">
                ⏳ Contrat en attente de signature
              </p>
            )}

            <a
              className="primary"
              href={data.documents.contract.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.documents.contract.signed
                ? "📑 Voir le contrat signé"
                : "📑 Voir le contrat"}
            </a>
          </>
        ) : (
          <p className="muted">
            📑 Contrat autorisé — document non disponible
          </p>
        )}
      </div>
    )}

    {data.permissions.invoice && (
      <div style={{marginBottom:12}}>
        {data.documents?.invoice ? (
          <a
            className="primary"
            href={data.documents.invoice.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            🧾 Voir la facture
          </a>
        ) : (
          <p className="muted">
            🧾 Facture autorisée — document non disponible
          </p>
        )}
      </div>
    )}
  </section>
)}

<section className="portal-section">
  <p className="muted">
    🔐 Cet espace est personnel et réservé au collaborateur affecté à cette prestation.
  </p>
</section>

      </div>
        </div>
  );
}
function ContractSignaturePage({token}){
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const [signerName,setSignerName]=useState("");
  const [signerEmail,setSignerEmail]=useState("");
  const [accepted,setAccepted]=useState(false);
  const [sending,setSending]=useState(false);
  const [signed,setSigned]=useState(false);

  const canvasRef=useRef(null);
  const drawingRef=useRef(false);
  const hasSignatureRef=useRef(false);

  useEffect(()=>{
    fetch(`/api/contract-signature/${encodeURIComponent(token)}`)
      .then(async r=>{
        const d=await r.json().catch(()=>({}));
        if(!r.ok){
          throw new Error(
            d.message || "Contrat indisponible."
          );
        }
        return d;
      })
      .then(d=>{
        setData(d);

        setSignerName(
          d.signerName ||
          d.event?.organizerName ||
          ""
        );

        setSignerEmail(
          d.event?.organizerEmail ||
          ""
        );

        if(d.status==="SIGNED"){
          setSigned(true);
        }
      })
      .catch(err=>setError(err.message));
  },[token]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;

    function resizeCanvas(){
      const rect=canvas.getBoundingClientRect();

      if(!rect.width)return;

      const ratio=window.devicePixelRatio || 1;

      canvas.width=Math.floor(rect.width*ratio);
      canvas.height=Math.floor(220*ratio);

      const ctx=canvas.getContext("2d");

      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.lineWidth=3;
      ctx.lineCap="round";
      ctx.lineJoin="round";
      ctx.strokeStyle="#111";
    }

    resizeCanvas();

    window.addEventListener("resize",resizeCanvas);

    return ()=>{
      window.removeEventListener("resize",resizeCanvas);
    };
  },[data,signed]);

  function pointFromEvent(e){
    const canvas=canvasRef.current;
    const rect=canvas.getBoundingClientRect();

    return {
      x:e.clientX-rect.left,
      y:e.clientY-rect.top
    };
  }

  function startDrawing(e){
    if(signed)return;

    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const p=pointFromEvent(e);

    drawingRef.current=true;

    try{
      canvas.setPointerCapture(e.pointerId);
    }catch{}

    ctx.beginPath();
    ctx.moveTo(p.x,p.y);
  }

  function draw(e){
    if(!drawingRef.current || signed)return;

    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const p=pointFromEvent(e);

    ctx.lineTo(p.x,p.y);
    ctx.stroke();

    hasSignatureRef.current=true;
  }

  function stopDrawing(e){
    drawingRef.current=false;

    try{
      canvasRef.current?.releasePointerCapture(e.pointerId);
    }catch{}
  }

  function clearSignature(){
    const canvas=canvasRef.current;
    if(!canvas)return;

    const ctx=canvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    hasSignatureRef.current=false;
  }

  async function signContract(){
    if(!signerName.trim()){
      return alert(
        "Merci d'indiquer le nom du signataire."
      );
    }

    if(!accepted){
      return alert(
        "Vous devez accepter le contrat avant de le signer."
      );
    }

    if(!hasSignatureRef.current){
      return alert(
        "Merci de signer dans le cadre prévu."
      );
    }

    const canvas=canvasRef.current;

    const signatureData=
      canvas.toDataURL("image/png");

    setSending(true);

    try{
      const r=await fetch(
        `/api/contract-signature/${encodeURIComponent(token)}/sign`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            signerName:signerName.trim(),
            signerEmail:signerEmail.trim(),
            signatureData
          })
        }
      );

      const d=await r.json().catch(()=>({}));

      if(!r.ok){
        return alert(
          d.message ||
          "Impossible d'enregistrer la signature."
        );
      }

      setSigned(true);

      alert(
        "✅ Contrat signé avec succès."
      );

    }catch(err){
      console.error(err);

      alert(
        "Erreur lors de l'enregistrement de la signature."
      );

    }finally{
      setSending(false);
    }
  }

  if(error){
    return (
      <div className="portal-shell">
        <main className="portal-card">
          <img
            className="portal-logo"
            src="/logo.jpg"
            alt="Location Photobooth 28"
          />

          <h1>Contrat indisponible</h1>

          <p>{error}</p>
        </main>
      </div>
    );
  }

  if(!data){
    return (
      <div className="portal-shell">
        <main className="portal-card">
          <p>Chargement de votre contrat…</p>
        </main>
      </div>
    );
  }

  const event=data.event || {};

  if(signed || data.status==="SIGNED"){
    return (
      <div className="portal-shell">
        <main className="portal-card">

          <img
            className="portal-logo"
            src="/logo.jpg"
            alt="Location Photobooth 28"
          />

          <div className="eyebrow">
            LOCATION PHOTOBOOTH 28
          </div>

          <h1>✅ Contrat signé</h1>

          <p>
            Merci {data.signerName || signerName || ""}.
          </p>

          <p>
            Votre contrat a bien été enregistré.
          </p>

          {data.signedAt && (
            <p className="muted">
              Signature enregistrée le{" "}
              {new Date(data.signedAt)
                .toLocaleString("fr-FR")}
            </p>
          )}

        </main>
      </div>
    );
  }

  return (
    <div className="portal-shell">
      <main
        className="portal-card"
        style={{maxWidth:760}}
      >

        <img
          className="portal-logo"
          src="/logo.jpg"
          alt="Location Photobooth 28"
        />

        <div className="eyebrow">
          LOCATION PHOTOBOOTH 28
        </div>

        <h1>✍️ Signature du contrat</h1>

        <section className="portal-section">

          <h2>{event.name}</h2>

          {event.type && (
            <p>
              <strong>Type :</strong>{" "}
              {event.type}
            </p>
          )}

          {event.date && (
            <p>
              📅{" "}
              {new Date(event.date)
                .toLocaleDateString(
                  "fr-FR",
                  {
                    day:"2-digit",
                    month:"2-digit",
                    year:"numeric"
                  }
                )}
            </p>
          )}

          {event.address && (
            <p>
              📍 {event.address}
            </p>
          )}

          {event.totalPrice != null && (
            <p>
              💶 Montant de la prestation :{" "}
              <strong>
                {Number(event.totalPrice)
                  .toFixed(2)
                  .replace(".",",")} €
              </strong>
            </p>
          )}

        </section>

        <section className="portal-section">

          <h2>📄 Votre contrat</h2>

          <p>
            Consultez le contrat complet avant de signer.
          </p>

          <a
            className="portal-action primary"
            href={data.contractPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            📄 Lire le contrat PDF
          </a>

        </section>

        <section className="portal-section">

          <h2>👤 Signataire</h2>

          <label>
            Nom et prénom
          </label>

          <input
            value={signerName}
            onChange={e=>
              setSignerName(e.target.value)
            }
            placeholder="Nom et prénom"
          />

          <label>
            Adresse e-mail
          </label>

          <input
            type="email"
            value={signerEmail}
            onChange={e=>
              setSignerEmail(e.target.value)
            }
            placeholder="adresse@email.fr"
          />

        </section>

        <section className="portal-section">

          <h2>✍️ Signature</h2>

          <p className="muted">
            Signez dans le cadre ci-dessous avec votre doigt
            ou votre souris.
          </p>

          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
            style={{
              display:"block",
              width:"100%",
              height:220,
              background:"#fff",
              border:"2px solid #ccc",
              borderRadius:12,
              touchAction:"none",
              cursor:"crosshair"
            }}
          />

          <button
            type="button"
            onClick={clearSignature}
            style={{marginTop:10}}
          >
            🧽 Effacer la signature
          </button>

        </section>

        <section className="portal-section">

          <label
            style={{
              display:"flex",
              alignItems:"flex-start",
              gap:10
            }}
          >

            <input
              type="checkbox"
              checked={accepted}
              onChange={e=>
                setAccepted(e.target.checked)
              }
            />

            <span>
              Je reconnais avoir pris connaissance du
              contrat et j'accepte ses conditions.
            </span>

          </label>

        </section>

        <button
          className="primary"
          disabled={sending}
          onClick={signContract}
          style={{
            width:"100%",
            padding:"16px",
            fontSize:"17px"
          }}
        >
          {sending
            ? "Enregistrement…"
            : "✍️ Signer définitivement le contrat"}
        </button>

        <p
          className="muted"
          style={{
            textAlign:"center",
            marginTop:14
          }}
        >
          La date et l'heure de signature sont
          enregistrées automatiquement par le serveur.
        </p>

      </main>
    </div>
  );
}

export default function App(){
  const path=window.location.pathname;

  const signatureMatch =
  path.match(/^\/signature\/([^/]+)$/);

if(signatureMatch){
  return (
    <ContractSignaturePage
      token={signatureMatch[1]}
    />
  );
}

  const collaboratorMatch=
    path.match(/^\/collaborateur\/([^/]+)$/);

  if(collaboratorMatch){
    return (
      <CollaboratorPortalPage
        token={collaboratorMatch[1]}
      />
    );
  }

  const portalMatch =
  path.match(/^\/portal\/([^/]+)$/) ||
  path.match(/^\/(?:invites|organisateur)\/[^/]+\/([^/]+)$/);

  if(portalMatch){
    return <PortalPage token={portalMatch[1]}/>;
  }

  const [loading,setLoading]=useState(true),[auth,setAuth]=useState(false);
  useEffect(()=>{fetch("/api/session").then(r=>r.json()).then(d=>setAuth(!!d.authenticated)).finally(()=>setLoading(false))},[]);
  async function logout(){await fetch("/api/logout",{method:"POST"});setAuth(false)}
  if(loading)return <div className="loading">Chargement…</div>;
  return auth?<Dashboard onLogout={logout}/>:<Login onLogin={()=>setAuth(true)}/>;
}

