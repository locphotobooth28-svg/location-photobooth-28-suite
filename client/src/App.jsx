
import React, { useEffect, useMemo, useRef, useState } from "react";

const SITE = "https://www.locationphotobooth28.fr";
const FACEBOOK = "https://www.facebook.com/location.photobooth.28/";

const DEFAULT_APPEARANCE={mode:"dark",lightStart:"07:00",darkStart:"19:00"};

function normalizeAppearance(value){
  const v=value&&typeof value==="object"?value:{};
  return {
    mode:["light","dark","auto"].includes(v.mode)?v.mode:"dark",
    lightStart:/^\d{2}:\d{2}$/.test(v.lightStart||"")?v.lightStart:"07:00",
    darkStart:/^\d{2}:\d{2}$/.test(v.darkStart||"")?v.darkStart:"19:00"
  };
}

function timeToMinutes(v){
  const [h,m]=String(v||"00:00").split(":").map(Number);
  return (h||0)*60+(m||0);
}

function resolveAppearanceMode(pref,date=new Date()){
  const p=normalizeAppearance(pref);
  if(p.mode!=="auto")return p.mode;
  const now=date.getHours()*60+date.getMinutes();
  const light=timeToMinutes(p.lightStart),dark=timeToMinutes(p.darkStart);
  const isLight=light<dark ? now>=light&&now<dark : now>=light||now<dark;
  return isLight?"light":"dark";
}

function applyAppearance(pref){
  const p=normalizeAppearance(pref);
  const resolved=resolveAppearanceMode(p);
  document.documentElement.dataset.lp28Theme=resolved;
  document.documentElement.dataset.lp28ThemeMode=p.mode;
  localStorage.setItem("lp28.appearance",JSON.stringify(p));
  return resolved;
}

function LP28ThemeStyles(){
  return <style>{`
    html[data-lp28-theme="light"],html[data-lp28-theme="light"] body,
    html[data-lp28-theme="light"] #root{background:#f5f3ee !important;color:#151515 !important;}
    html[data-lp28-theme="light"] .app-shell,
    html[data-lp28-theme="light"] .content,
    html[data-lp28-theme="light"] main{background:#f5f3ee !important;color:#151515 !important;}
    html[data-lp28-theme="light"] .sidebar{background:#fff !important;color:#171717 !important;border-right:1px solid #ddd6c8 !important;}
    html[data-lp28-theme="light"] .sidebar .nav-item{color:#202020 !important;background:transparent !important;}
    html[data-lp28-theme="light"] .sidebar .nav-item.active{background:#f2ead0 !important;color:#6d5200 !important;}
    html[data-lp28-theme="light"] .sidebar-footer,
    html[data-lp28-theme="light"] .sidebar-footer a{color:#333 !important;}
    html[data-lp28-theme="light"] .topbar,
    html[data-lp28-theme="light"] .calendar-toolbar{background:transparent !important;color:#151515 !important;}
    html[data-lp28-theme="light"] .panel,
    html[data-lp28-theme="light"] .card,
    html[data-lp28-theme="light"] .stat-card,
    html[data-lp28-theme="light"] .login-card,
    html[data-lp28-theme="light"] .account-admin-card,
    html[data-lp28-theme="light"] .trusted-owner-block,
    html[data-lp28-theme="light"] .module-order-panel,
    html[data-lp28-theme="light"] .module-order-help{background:#fff !important;color:#171717 !important;border-color:#d8cda8 !important;box-shadow:0 6px 20px rgba(0,0,0,.05) !important;}
    html[data-lp28-theme="light"] .muted{color:#5f6368 !important;}
    html[data-lp28-theme="light"] input,
    html[data-lp28-theme="light"] select,
    html[data-lp28-theme="light"] textarea{background:#fff !important;color:#171717 !important;border-color:#cfc8ba !important;}
    html[data-lp28-theme="light"] input::placeholder,
    html[data-lp28-theme="light"] textarea::placeholder{color:#777 !important;}
    html[data-lp28-theme="light"] button:not(.primary):not(.nav-item){background:#fff !important;color:#171717 !important;border-color:#cfc8ba !important;}
    html[data-lp28-theme="light"] .settings-tabs button{background:#f3f1ec !important;color:#333 !important;border-color:#d8d2c8 !important;}
    html[data-lp28-theme="light"] .settings-tabs button.active{background:#fff7dc !important;color:#735600 !important;}
    html[data-lp28-theme="light"] .lp28-mobile-topbar{background:rgba(255,255,255,.97) !important;border-bottom-color:#ddd6c8 !important;}
    html[data-lp28-theme="light"] .lp28-mobile-title strong{color:#171717 !important;}
    html[data-lp28-theme="light"] table,
    html[data-lp28-theme="light"] th,
    html[data-lp28-theme="light"] td{color:#171717 !important;border-color:#e2ddd3 !important;}
    html[data-lp28-theme="light"] a{color:#7a5b00;}
    html[data-lp28-theme="light"] .eyebrow{color:#997300 !important;}
    html[data-lp28-theme="light"] .alert{background:#fff8dc !important;color:#402f00 !important;border-color:#e3c34b !important;}
    html[data-lp28-theme="dark"]{color-scheme:dark;}
    html[data-lp28-theme="light"]{color-scheme:light;}
  
    /* v8.5.59 : la fenêtre événement reste sombre, même avec le thème clair. */
    html[data-lp28-theme="light"] .event-modal{color:#f4f4f5 !important;}
    html[data-lp28-theme="light"] .event-modal h1,
    html[data-lp28-theme="light"] .event-modal h2,
    html[data-lp28-theme="light"] .event-modal h3,
    html[data-lp28-theme="light"] .event-modal h4,
    html[data-lp28-theme="light"] .event-modal label{color:#f4f4f5 !important;}
    html[data-lp28-theme="light"] .event-modal .muted{color:#b8b8bd !important;}
    html[data-lp28-theme="light"] .event-modal input,
    html[data-lp28-theme="light"] .event-modal select,
    html[data-lp28-theme="light"] .event-modal textarea{
      background:#fff !important;color:#171719 !important;border-color:#d6d3d1 !important;
    }
    html[data-lp28-theme="light"] .event-modal input::placeholder,
    html[data-lp28-theme="light"] .event-modal textarea::placeholder{color:#777 !important;opacity:1;}
    html[data-lp28-theme="light"] .event-modal .gift-toggle,
    html[data-lp28-theme="light"] .event-modal .gift-box{color:#f4f4f5 !important;}
`}</style>;
}

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
  {group:"Options", icon:"💾", name:"Clé USB - support photos / audio"},
  {group:"Options", icon:"🔊", name:"Enceinte LG 1000W"},
  {group:"Options", icon:"🔊", name:"Location enceinte LG 1000w + 2 micros"},
  {group:"Options", icon:"🎤", name:"2x micros sans fil JBL"},
  {group:"Options", icon:"🎬", name:"Support de fond + toile noire / verte"},
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

materials:[], bookingStatus:"CONFIRMED", optionUntil:"", sceneJets:{enabled:false,boxes:4,color:"OR",height:"2M",duration:"20S",theme:"MARIAGE"}, portalEnabled:true, guestUploadEnabled:true, guestVideoEnabled:false, guestUploadModerated:false, portalExpiresAt:"", portalPassword:"", fotoshareUrl:"", frameSource:"NONE", frameStatus:"NOT_REQUIRED", preparation:{materialChecked:false,paperChecked:false,cablesChecked:false,powerChecked:false,qrChecked:false,contractChecked:false,frameChecked:false,loaded:false,departed:false,returned:false,gifted:false}, notes:"", googleCalendarId:"",totalPrice:"",
deposit:"",
balance:"",
  customPrintCount:"",
customPrintPrice:"",payments:{depositPaid:false,balancePaid:false,cautionReceived:false,cautionReturned:false}
};

function Login({ onLogin }) {
  const [login,setLogin]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [twoFactor,setTwoFactor]=useState(false);
  const [code,setCode]=useState("");
  const [trustDevice,setTrustDevice]=useState(true);
  const [deviceLabel,setDeviceLabel]=useState("");
  async function submit(e){
    e.preventDefault(); setError("");
    const endpoint=twoFactor?"/api/login/2fa":"/api/login";
    const body=twoFactor?{code,trustDevice,deviceLabel:deviceLabel.trim()}:{login,password};
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) return setError(d.message||"Connexion impossible.");
    if(d.requires2fa){setTwoFactor(true);setCode("");return;}
    onLogin(d.user||null);
  }
  return <div className="login-shell"><div className="login-card">
    <img className="login-logo" src="/logo.jpg" alt="Location Photobooth 28"/>
    <div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div><h1>{twoFactor?"🔐 Vérification 2FA":"Administration"}</h1>
    <p className="muted">{twoFactor?"Saisis le code à 6 chiffres de ton application Authenticator.":"Connecte-toi avec ton identifiant, e-mail ou téléphone."}</p>
    {error&&<div className="alert">{error}</div>}
    <form onSubmit={submit}>
      {!twoFactor?<><label>Identifiant / e-mail / téléphone</label><input value={login} onChange={e=>setLogin(e.target.value)} autoComplete="username" required/><label>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></>:<><label>Code Authenticator</label><input inputMode="numeric" pattern="[0-9A-Za-z-]*" value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" autoFocus required/><label style={{display:"flex",gap:8,alignItems:"center",margin:"12px 0"}}><input type="checkbox" checked={trustDevice} onChange={e=>setTrustDevice(e.target.checked)} style={{width:"auto"}}/> Faire confiance à cet appareil pendant 30 jours</label>{trustDevice&&<><label>Nom de cet appareil *</label><input value={deviceLabel} onChange={e=>setDeviceLabel(e.target.value)} placeholder="Ex. PC Johan, Samsung S26 Ultra, Tablette Johan" maxLength={80} required/><p className="muted" style={{marginTop:4}}>Ce nom sert uniquement à reconnaître l'appareil dans LP28.</p></>}</>}
      <button className="primary">{twoFactor?"Vérifier":"Se connecter"}</button>
    </form>
    {twoFactor&&<button type="button" className="ghost" style={{marginTop:8}} onClick={()=>{setTwoFactor(false);setCode("");setDeviceLabel("");}}>← Revenir à la connexion</button>}
    <div className="login-links"><a href={SITE} target="_blank">🌐 Site internet</a><a href={FACEBOOK} target="_blank">ⓕ Facebook</a></div>
  </div></div>
}

function RegisterPage({token}){
  const [info,setInfo]=useState(null),[error,setError]=useState(""),[done,setDone]=useState(false);
  const [form,setForm]=useState({firstName:"",lastName:"",username:"",email:"",phone:"",password:"",confirm:""});
  useEffect(()=>{fetch(`/api/register/${token}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);setInfo(d.invitation);setForm(f=>({...f,firstName:d.invitation.firstName||"",lastName:d.invitation.lastName||"",email:d.invitation.email||"",phone:d.invitation.phone||""}));}).catch(e=>setError(e.message));},[token]);
  async function submit(e){
    e.preventDefault();setError("");
    if(!form.firstName.trim()||!form.lastName.trim())return setError("Le prénom et le nom sont obligatoires.");
    if(form.password!==form.confirm)return setError("Les deux mots de passe sont différents.");
    if(form.password.length<8||!/[A-ZÀ-ÖØ-Ý]/.test(form.password)||!/[0-9]/.test(form.password)||!/[^A-Za-z0-9À-ÖØ-öø-ÿ]/.test(form.password))return setError("Mot de passe : 8 caractères minimum, avec au moins 1 majuscule, 1 chiffre et 1 caractère spécial.");
    const r=await fetch(`/api/register/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const d=await r.json().catch(()=>({}));if(!r.ok)return setError(d.message||"Inscription impossible.");setDone(true);
  }
  if(done)return <div className="login-shell"><div className="login-card"><div className="eyebrow">LP28 SUITE</div><h1>✅ Compte créé</h1><p>Ton accès LP28 est maintenant actif.</p><button className="primary" onClick={()=>location.href="/"}>Se connecter</button></div></div>;
  return <div className="login-shell"><div className="login-card"><img className="login-logo" src="/logo.jpg"/><div className="eyebrow">INVITATION LP28 · 10 MINUTES</div><h1>👤 Créer mon compte</h1>{info&&<p className="muted">Invitation pour <strong>{[info.firstName,info.lastName].filter(Boolean).join(" ")||info.name||"Utilisateur LP28"}</strong></p>}{error&&<div className="alert">{error}</div>}{info&&<form onSubmit={submit}><label>Prénom *</label><input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} required/><label>Nom *</label><input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} required/><label>Identifiant choisi</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength={3}/><label>E-mail</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><label>Téléphone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><label>Mot de passe *</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={8}/><p className="muted" style={{marginTop:4}}>Minimum 8 caractères avec 1 majuscule, 1 chiffre et 1 caractère spécial.</p><label>Confirmer le mot de passe</label><input type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} required/><button className="primary">Créer mon compte</button></form>}</div></div>;
}

function SettingsPage({user}){
  const isAdmin=user?.role==="ADMIN";
  const [settingsTab,setSettingsTab]=useState(isAdmin?"general":"security");
  const [users,setUsers]=useState([]),[collaborators,setCollaborators]=useState([]),[invite,setInvite]=useState({firstName:"",lastName:"",email:"",phone:"",role:"VIEWER",collaboratorId:""}),[inviteUrl,setInviteUrl]=useState(""),[qr,setQr]=useState(null),[codes,setCodes]=useState([]),[totpCode,setTotpCode]=useState(""),[session,setSession]=useState(null),[devices,setDevices]=useState([]);
  const [appearance,setAppearance]=useState(()=>{try{return normalizeAppearance(JSON.parse(localStorage.getItem("lp28.appearance")||"{}"));}catch{return DEFAULT_APPEARANCE;}});
  const [appearancePreview,setAppearancePreview]=useState(()=>resolveAppearanceMode(appearance));
  const [adminNotif,setAdminNotif]=useState({title:"",message:"",type:"INFO",audience:"ADMIN",targetUserId:"",startsAt:"",expiresAt:""});
  const [testUserId,setTestUserId]=useState("");
  const [notificationSound,setNotificationSound]=useState(()=>localStorage.getItem("lp28.notifications.sound")!=="false");
  const [notificationPopup,setNotificationPopup]=useState(()=>localStorage.getItem("lp28.notifications.popup")!=="false");
  const [systemPushStatus,setSystemPushStatus]=useState("unknown");
  const [pushHistory,setPushHistory]=useState([]);
  async function loadPushHistory(){if(!isAdmin)return;try{const r=await fetch("/api/admin/push-history");const d=await r.json();if(d?.ok)setPushHistory(d.history||[]);}catch{}}
  async function activateSystemPush(){try{await enableLp28SystemPush();setSystemPushStatus("enabled");alert("📱 Notifications système activées sur cet appareil.");}catch(err){setSystemPushStatus("error");alert(err.message||"Activation impossible.");}}
  function setNotifSound(v){setNotificationSound(v);localStorage.setItem("lp28.notifications.sound",String(v));}
  function setNotifPopup(v){setNotificationPopup(v);localStorage.setItem("lp28.notifications.popup",String(v));}
  function testLocalNotification(){
    if(notificationSound)playLp28NotificationSound();
    if(notificationPopup){
      const el=document.createElement("div");
      el.textContent="🔔 Test LP28 — Les notifications pop-up fonctionnent.";
      Object.assign(el.style,{position:"fixed",right:"18px",top:"74px",zIndex:"12000",background:"#111827",color:"#fff",border:"1px solid #d6b94f",borderRadius:"14px",padding:"16px",boxShadow:"0 20px 55px rgba(0,0,0,.38)",maxWidth:"390px",fontWeight:"800"});
      document.body.appendChild(el);setTimeout(()=>el.remove(),4500);
    }
  }
  const SAFE_MODULES=[
    {id:"dashboard",label:"Tableau de bord",icon:"🏠"},
    {id:"events",label:"Événements",icon:"📅"},
    {id:"planning",label:"Planning",icon:"🗓️"},
    {id:"materialPlanning",label:"Planning matériel",icon:"📦"},
    {id:"galleries",label:"Galeries",icon:"📸"},
    {id:"booths",label:"Mes bornes",icon:"🖥️"},
    {id:"collaborators",label:"Collaborateurs",icon:"👷"}
  ];
  const [userModules,setUserModules]=useState({});
  async function load(){
    const requests=[
      fetch("/api/session").then(r=>r.json()),
      fetch("/api/account/trusted-devices").then(r=>r.json())
    ];
    if(isAdmin)requests.push(fetch("/api/admin/users").then(r=>r.json()),fetch("/api/collaborators").then(r=>r.json()).catch(()=>({collaborators:[]})));
    const all=await Promise.all(requests);
    setSession(all[0]);setDevices(all[1].devices||[]);
    fetch("/api/account/appearance").then(r=>r.json()).then(d=>{if(d?.ok&&d.appearance){const p=normalizeAppearance(d.appearance);setAppearance(p);setAppearancePreview(applyAppearance(p));}}).catch(()=>{});
    if(isAdmin){
      loadPushHistory();
      const us=all[2].users||[];setUsers(us);setCollaborators(all[3].collaborators||[]);
      const map={};for(const u of us)map[u.id]=Array.isArray(u.permissions?.allowedModules)?u.permissions.allowedModules:(u.role==="INTERVENANT"?["dashboard","events","planning","materialPlanning"]:["dashboard","planning"]);
      setUserModules(map);
    }
  }
  useEffect(()=>{load()},[isAdmin]);
  async function createInvite(){
    if(!invite.firstName.trim()||!invite.lastName.trim())return alert("Le prénom et le nom sont obligatoires.");
    const defaultModules=invite.role==="INTERVENANT"?["dashboard","events","planning","materialPlanning"]:invite.role==="VIEWER"?["dashboard","planning"]:[];
    const payload={...invite,permissions:invite.role==="ADMIN"?{}:{allowedModules:defaultModules}};
    const r=await fetch("/api/admin/invitations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)return alert(d.message);setInviteUrl(d.url);
  }
  function chooseCollaborator(id){const c=collaborators.find(x=>x.id===id);setInvite(v=>({...v,collaboratorId:id,firstName:c?.firstName||v.firstName,lastName:c?.lastName||v.lastName,email:c?.email||v.email,phone:c?.phone||v.phone}));}
  function whatsapp(){if(!inviteUrl)return;const msg=`👋 Bonjour ${invite.firstName||""},\n\nJohan vous invite à créer votre accès personnel à LP28 Suite.\n\n🔐 Ce lien est personnel, utilisable une seule fois et valable 10 minutes :\n${inviteUrl}`;window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");}
  async function setup2fa(){const r=await fetch("/api/account/2fa/setup",{method:"POST"});const d=await r.json();if(!r.ok)return alert(d.message||"Impossible d'activer la 2FA.");setQr(d);setCodes([]);}
  async function enable2fa(){const r=await fetch("/api/account/2fa/enable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:totpCode})});const d=await r.json();if(!r.ok)return alert(d.message);setCodes(d.recoveryCodes||[]);setQr(null);setTotpCode("");await load();}
  async function revokeDevice(id){await fetch(`/api/account/trusted-devices/${id}`,{method:"DELETE"});load();}
  async function accessAction(id,action){
    if(!confirm(action==="REVOKE"?"Révoquer complètement l'accès de ce compte ?":action==="BLOCK"?"Bloquer temporairement ce compte ?":"Confirmer cette action ?"))return;
    const r=await fetch(`/api/admin/users/${id}/access`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});const d=await r.json().catch(()=>({}));
    if(!r.ok)return alert(d.message||"Action impossible.");await load();
  }
  async function savePermissions(u){
    const allowed=(userModules[u.id]||[]).filter(Boolean);
    const r=await fetch(`/api/admin/users/${u.id}/permissions`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({allowedModules:allowed})});const d=await r.json().catch(()=>({}));
    if(!r.ok)return alert(d.message||"Impossible d'enregistrer les accès.");alert(`✅ Accès de ${u.displayName||u.name||u.username} enregistrés.`);await load();
  }
  function toggleModule(uid,id){
    setUserModules(v=>{const cur=new Set(v[uid]||[]);if(id==="dashboard"){cur.add(id);}else if(cur.has(id))cur.delete(id);else cur.add(id);return {...v,[uid]:[...cur]};});
  }
  function statusLabel(u){return u.accountStatus==="REVOKED"?"⛔ Révoqué":u.accountStatus==="BLOCKED"?"🔒 Bloqué":"✅ Actif";}
  function dateFr(v){return v?new Date(v).toLocaleString("fr-FR"):"—";}
  function previewAppearance(next){const p=normalizeAppearance(next);setAppearance(p);setAppearancePreview(applyAppearance(p));}
  async function sendAdminNotification(){const r=await fetch("/api/admin/notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(adminNotif)});const d=await r.json().catch(()=>({}));if(!r.ok)return alert(d.message||"Impossible de créer la notification.");setAdminNotif(p=>({...p,title:"",message:""}));alert("🔔 Notification créée.");}
  function runAccountTest(){const u=users.find(x=>x.id===testUserId);if(!u)return alert("Choisis un compte.");const mods=Array.isArray(u.permissions?.allowedModules)?u.permissions.allowedModules:[];alert(`🧪 ${u.displayName||u.firstName||u.email}\nRôle : ${u.role}\nStatut : ${u.accountStatus||"ACTIVE"}\nModules : ${mods.length?mods.join(", "):"droits par défaut"}`);}
  async function saveAppearance(){
    const p=normalizeAppearance(appearance);applyAppearance(p);
    const r=await fetch("/api/account/appearance",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({appearance:p})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return alert(d.message||"Impossible d'enregistrer l'affichage.");
    window.dispatchEvent(new CustomEvent("lp28-appearance-changed",{detail:p}));
    alert("✅ Mode d'affichage enregistré.");
  }

  return <section>
    <LP28ThemeStyles/>
    <style>{`
      .settings-tabs{display:flex;overflow-x:auto;margin:0 0 16px;border-bottom:1px solid rgba(214,185,79,.28)}
      .settings-tabs button{min-width:170px;padding:13px 18px;border:1px solid rgba(255,255,255,.09);border-bottom:0;border-radius:0;background:#151518;color:#ddd;font-weight:800;white-space:nowrap}
      .settings-tabs button.active{color:#f1d45b;background:rgba(214,185,79,.10);box-shadow:inset 0 -3px 0 #d6b94f}
      .account-admin-card{padding:16px;margin-top:10px;border:1px solid rgba(214,185,79,.22);border-radius:14px;background:rgba(255,255,255,.02)}
      .account-admin-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
      .account-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:7px 16px;margin-top:12px}
      .permission-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin-top:12px}
      .permission-grid label{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.08);border-radius:10px}
      .permission-grid input{width:auto}
      .account-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
      .danger-btn{border-color:rgba(239,68,68,.55)!important;color:#fecaca!important}
      .warn-btn{border-color:rgba(245,158,11,.55)!important;color:#fde68a!important}
      .appearance-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;margin-top:14px}
      .appearance-card{padding:18px;border:1px solid rgba(214,185,79,.22);border-radius:14px;cursor:pointer;min-height:145px}
      .appearance-card.active{border-color:#d6b94f;box-shadow:inset 0 0 0 2px rgba(214,185,79,.22)}
      .appearance-icon{font-size:2rem;margin-bottom:10px}.appearance-card strong{display:block;font-size:1.05rem;margin-bottom:5px}
      .appearance-auto-hours{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;max-width:520px}
      @media(max-width:720px){.appearance-grid{grid-template-columns:1fr}.appearance-auto-hours{grid-template-columns:1fr}}
      .trusted-owner-block{margin-top:18px;padding:14px;border:1px solid rgba(214,185,79,.24);border-radius:14px;background:rgba(255,255,255,.02)}
      .trusted-table-wrap{width:100%;overflow-x:auto}.trusted-table{width:100%;border-collapse:collapse;min-width:650px}
      .trusted-table th,.trusted-table td{text-align:left;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.09)}
      .trusted-table th{color:#d6b94f}.trusted-table td:last-child,.trusted-table th:last-child{text-align:right}
      @media(max-width:700px){.settings-tabs button{min-width:150px}.account-admin-card{padding:12px}}
    `}</style>
    <div className="calendar-toolbar"><div><div className="eyebrow">{isAdmin?"ADMINISTRATION LP28":"MON COMPTE LP28"}</div><h2>⚙️ Paramètres</h2><p className="muted">{isAdmin?"Comptes utilisateurs, sécurité et droits d'accès.":"Sécurité et appareils de ton compte."}</p></div></div>

    <div className="settings-tabs">
      {isAdmin&&<button className={settingsTab==="general"?"active":""} onClick={()=>setSettingsTab("general")}>Comptes & accès</button>}
      <button className={settingsTab==="security"?"active":""} onClick={()=>setSettingsTab("security")}>Sécurité</button>
      <button className={settingsTab==="devices"?"active":""} onClick={()=>setSettingsTab("devices")}>Appareils de confiance</button>
      <button className={settingsTab==="appearance"?"active":""} onClick={()=>setSettingsTab("appearance")}>Affichage</button>
      <button className={settingsTab==="tests-notifications"?"active":""} onClick={()=>setSettingsTab("tests-notifications")}>🧪 Tests & notifications</button>
    </div>

    {isAdmin&&settingsTab==="general"&&<>
      <div className="panel" style={{marginBottom:16}}>
        <h2>👥 Comptes utilisateurs</h2>
        <p className="muted">Tu choisis précisément les modules visibles pour chaque compte. Les montants, paiements, dons et prestations offertes restent réservés à l'administrateur, quel que soit le compte.</p>
        {users.map(u=><div key={u.id} className="account-admin-card">
          <div className="account-admin-head"><div><strong style={{fontSize:"1.08rem"}}>{u.displayName||u.name||u.username||u.email}</strong> · {u.role}<div className="muted">{u.username||"—"} · {u.email||"—"} · {u.phone||"—"}</div></div><strong>{statusLabel(u)}</strong></div>
          <div className="account-meta"><span>📅 Inscription : <strong>{dateFr(u.createdAt)}</strong></span><span>🕒 Dernière connexion : <strong>{dateFr(u.lastLoginAt)}</strong></span><span>🔐 2FA : <strong>{u.totpEnabled?"Activée":"Non activée"}</strong></span></div>
          {u.role!=="ADMIN"&&<>
            <div style={{marginTop:14,fontWeight:900}}>👁️ Modules autorisés</div>
            <div className="permission-grid">{SAFE_MODULES.map(m=><label key={m.id}><input type="checkbox" checked={(userModules[u.id]||[]).includes(m.id)} disabled={m.id==="dashboard"} onChange={()=>toggleModule(u.id,m.id)}/>{m.icon} {m.label}</label>)}</div>
            <div className="muted" style={{marginTop:8}}>🔒 Toujours masqués pour les comptes non administrateurs : montants, règlements, « Don / prestation offerte », Inventaire admin, Documents/contrats, Google et réglages administrateur.</div>
            <div className="account-actions"><button className="primary" onClick={()=>savePermissions(u)}>💾 Enregistrer les accès</button>
              {u.accountStatus==="ACTIVE"&&<button className="warn-btn" onClick={()=>accessAction(u.id,"BLOCK")}>🔒 Bloquer</button>}
              {u.accountStatus==="BLOCKED"&&<button onClick={()=>accessAction(u.id,"UNBLOCK")}>🔓 Débloquer</button>}
              {u.accountStatus!=="REVOKED"&&<button className="danger-btn" onClick={()=>accessAction(u.id,"REVOKE")}>⛔ Révoquer le compte</button>}
              {u.accountStatus==="REVOKED"&&<button onClick={()=>accessAction(u.id,"RESTORE")}>♻️ Réactiver</button>}
            </div>
          </>}
        </div>)}
      </div>
      <div className="panel" style={{marginBottom:16}}><h2>📲 Inviter une personne</h2><p className="muted">Prénom et nom obligatoires. Le lien est personnel, à usage unique et expire après 10 minutes.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><input placeholder="Prénom *" value={invite.firstName} onChange={e=>setInvite({...invite,firstName:e.target.value})} required/><input placeholder="Nom *" value={invite.lastName} onChange={e=>setInvite({...invite,lastName:e.target.value})} required/><input placeholder="E-mail" value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})}/><input placeholder="Téléphone" value={invite.phone} onChange={e=>setInvite({...invite,phone:e.target.value})}/><select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value,collaboratorId:e.target.value==="INTERVENANT"?invite.collaboratorId:""})}><option value="VIEWER">Consultation</option><option value="INTERVENANT">Intervenant</option><option value="ADMIN">Administrateur</option></select>{invite.role==="INTERVENANT"&&<select value={invite.collaboratorId} onChange={e=>chooseCollaborator(e.target.value)}><option value="">Créer automatiquement l'intervenant</option>{collaborators.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.firstName} {c.lastName||""}</option>)}</select>}</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button className="primary" onClick={createInvite}>🔗 Générer le lien 10 min</button>{inviteUrl&&<button onClick={whatsapp}>📲 Envoyer par WhatsApp</button>}</div>{inviteUrl&&<div className="card" style={{marginTop:10,wordBreak:"break-all"}}>{inviteUrl}</div>}</div>
    </>}

    {settingsTab==="security"&&<div className="panel"><h2>🔐 Authentification à deux facteurs</h2><p>{session?.user?.totpEnabled?"✅ 2FA activée sur ton compte.":"La 2FA n'est pas encore activée sur ton compte."}</p>{!session?.user?.totpEnabled&&!qr&&<button className="primary" onClick={setup2fa}>🔐 Activer avec Google Authenticator</button>}{qr&&<div style={{marginTop:12}}><p>1. Ouvre Google Authenticator → + → Scanner un QR code.</p><img src={qr.qrDataUrl} alt="QR code 2FA" style={{width:220,maxWidth:"100%",background:"white",padding:8,borderRadius:12}}/><p className="muted">Clé manuelle : {qr.secret}</p><p>2. Saisis le code à 6 chiffres :</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input value={totpCode} onChange={e=>setTotpCode(e.target.value)} inputMode="numeric" placeholder="123456" style={{maxWidth:180}}/><button className="primary" onClick={enable2fa}>Valider la 2FA</button></div></div>}{codes.length>0&&<div className="alert" style={{marginTop:12}}><strong>⚠️ Codes de récupération — conserve-les hors de LP28 :</strong><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(120px,1fr))",gap:6,marginTop:8}}>{codes.map(c=><code key={c}>{c}</code>)}</div></div>}</div>}

    {settingsTab==="devices"&&<div className="panel"><h2>💻 Appareils de confiance</h2><p className="muted">Chaque appareil peut être révoqué séparément.</p>{devices.length===0&&<p className="muted">Aucun appareil de confiance actif.</p>}{Object.entries(devices.reduce((groups,d)=>{const owner=d.ownerName||"Compte LP28";(groups[owner]||(groups[owner]=[])).push(d);return groups;},{})).map(([owner,ownerDevices])=><div key={owner} className="trusted-owner-block"><h3>👤 {owner}</h3><div className="trusted-table-wrap"><table className="trusted-table"><thead><tr><th>Appareil</th><th>Dernière utilisation</th><th>Approuvé jusqu’au</th><th>Action</th></tr></thead><tbody>{ownerDevices.map(d=><tr key={d.id}><td><strong>{d.label||"Appareil"}</strong></td><td>{new Date(d.lastUsedAt).toLocaleString("fr-FR")}</td><td>{new Date(d.expiresAt).toLocaleDateString("fr-FR")}</td><td><button onClick={()=>revokeDevice(d.id)}>Révoquer</button></td></tr>)}</tbody></table></div></div>)}</div>}

    {settingsTab==="appearance"&&<div className="panel">
      <h2>🎨 Affichage</h2>
      <p className="muted">Choisis l'apparence de LP28. Le réglage est enregistré sur ton compte et s'applique à tes appareils.</p>
      <div className="appearance-grid">
        <div className={`appearance-card ${appearance.mode==="light"?"active":""}`} onClick={()=>previewAppearance({...appearance,mode:"light"})}><div className="appearance-icon">☀️</div><strong>Mode clair</strong><span className="muted">Fond blanc et interface claire.</span></div>
        <div className={`appearance-card ${appearance.mode==="dark"?"active":""}`} onClick={()=>previewAppearance({...appearance,mode:"dark"})}><div className="appearance-icon">🌙</div><strong>Mode sombre</strong><span className="muted">Fond noir, comme l'affichage actuel.</span></div>
        <div className={`appearance-card ${appearance.mode==="auto"?"active":""}`} onClick={()=>previewAppearance({...appearance,mode:"auto"})}><div className="appearance-icon">🌓</div><strong>Mode automatique</strong><span className="muted">LP28 passe automatiquement du clair au sombre selon l'heure.</span></div>
      </div>
      {appearance.mode==="auto"&&<div className="appearance-auto-hours">
        <div><label>☀️ Mode clair à partir de</label><input type="time" value={appearance.lightStart} onChange={e=>previewAppearance({...appearance,lightStart:e.target.value})}/></div>
        <div><label>🌙 Mode sombre à partir de</label><input type="time" value={appearance.darkStart} onChange={e=>previewAppearance({...appearance,darkStart:e.target.value})}/></div>
      </div>}
      <div className="card" style={{marginTop:14,padding:12}}><strong>Aperçu actuel : {appearancePreview==="light"?"☀️ Mode clair":"🌙 Mode sombre"}</strong>{appearance.mode==="auto"&&<div className="muted">Clair de {appearance.lightStart} à {appearance.darkStart}, sombre le reste du temps.</div>}</div>
      <button className="primary" style={{marginTop:14}} onClick={saveAppearance}>💾 Enregistrer l'affichage</button>
    </div>}
    {settingsTab==="tests-notifications"&&<div className="panel">
      <h2>🧪 Tests & notifications</h2>{!isAdmin&&<div className="card" style={{padding:14,marginTop:12}}><strong>🔒 Administration requise</strong><p className="muted">Ce centre est réservé au compte administrateur.</p></div>}
      <div className="card" style={{padding:14,marginTop:12}}><h3>🧪 Mode test</h3><p className="muted">Contrôle rapidement les droits d'un compte sans te déconnecter.</p><select value={testUserId} onChange={e=>setTestUserId(e.target.value)}><option value="">Choisir un compte…</option>{users.filter(u=>u.role!=="ADMIN").map(u=><option key={u.id} value={u.id}>{u.displayName||u.firstName||u.email} — {u.role}</option>)}</select><button style={{marginLeft:8}} onClick={runAccountTest}>▶️ Tester</button></div>
      <div className="card" style={{padding:14,marginTop:14}}><h3>🔔 Créer une notification</h3><div className="form-grid">
        <div><label>Titre</label><input value={adminNotif.title} onChange={e=>setAdminNotif(p=>({...p,title:e.target.value}))}/></div>
        <div><label>Type</label><select value={adminNotif.type} onChange={e=>setAdminNotif(p=>({...p,type:e.target.value}))}><option value="INFO">ℹ️ Information</option><option value="SUCCESS">✅ Succès</option><option value="WARNING">⚠️ Avertissement</option><option value="URGENT">🚨 Urgent</option></select></div>
        <div><label>Destinataires</label><select value={adminNotif.audience} onChange={e=>setAdminNotif(p=>({...p,audience:e.target.value,targetUserId:""}))}><option value="ADMIN">Administrateur</option><option value="ALL">Tous</option><option value="INTERVENANTS">Intervenants</option><option value="VIEWERS">Consultation</option><option value="USER">Une personne</option></select></div>
        {adminNotif.audience==="USER"&&<div><label>Personne</label><select value={adminNotif.targetUserId} onChange={e=>setAdminNotif(p=>({...p,targetUserId:e.target.value}))}><option value="">Choisir…</option>{users.map(u=><option key={u.id} value={u.id}>{u.displayName||u.firstName||u.email}</option>)}</select></div>}
        <div><label>Début</label><input type="datetime-local" value={adminNotif.startsAt} onChange={e=>setAdminNotif(p=>({...p,startsAt:e.target.value}))}/></div><div><label>Fin</label><input type="datetime-local" value={adminNotif.expiresAt} onChange={e=>setAdminNotif(p=>({...p,expiresAt:e.target.value}))}/></div>
      </div><label>Message</label><textarea rows="4" value={adminNotif.message} onChange={e=>setAdminNotif(p=>({...p,message:e.target.value}))}/><button className="primary" style={{marginTop:12}} onClick={sendAdminNotification}>🔔 Publier</button></div>
      <div className="card" style={{padding:14,marginTop:14}}>
        <h3>🔊 Alertes sur cet appareil</h3>
        <p className="muted">Ces réglages concernent uniquement ce navigateur/appareil.</p>
        <label style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}><input type="checkbox" checked={notificationSound} onChange={e=>setNotifSound(e.target.checked)}/> 🔊 Son des nouvelles notifications</label>
        <label style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}><input type="checkbox" checked={notificationPopup} onChange={e=>setNotifPopup(e.target.checked)}/> 🪟 Fenêtre pop-up automatique</label>
        <button className="primary" style={{marginTop:14,marginRight:8}} onClick={activateSystemPush}>📱 Activer les notifications système</button>
        <button style={{marginTop:14}} onClick={testLocalNotification}>🧪 Tester son + pop-up</button>
        {systemPushStatus==="enabled"&&<p style={{marginTop:10}}>✅ Notifications Android/PWA activées sur cet appareil.</p>}
        <p className="muted" style={{marginTop:10}}>Le navigateur peut demander une première interaction avant d’autoriser le son. Le bouton de test permet de l’activer.</p>
      </div>
      {isAdmin&&<div className="card" style={{padding:14,marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:0}}>📬 Historique Push</h3><p className="muted" style={{margin:"5px 0 0"}}>Suivi des notifications envoyées aux comptes et appareils. « Reçue » signifie que le service worker de l’appareil a confirmé la réception ; « Ouverte » signifie que la notification a été touchée.</p></div><button onClick={loadPushHistory}>↻ Actualiser</button></div><div style={{overflowX:"auto",marginTop:12}}><table className="trusted-table"><thead><tr><th>Notification</th><th>Destinataire</th><th>Appareil</th><th>État</th><th>Date</th></tr></thead><tbody>{pushHistory.length===0?<tr><td colSpan="5" className="muted">Aucun envoi Push enregistré.</td></tr>:pushHistory.map(h=><tr key={h.id}><td><strong>{h.title}</strong><div className="muted" style={{fontSize:12}}>{h.message}</div></td><td>{h.userName}<div className="muted" style={{fontSize:12}}>{h.role}</div></td><td>{h.deviceLabel}</td><td>{h.status==="OPENED"?"👁️ Ouverte":h.status==="RECEIVED"?"✅ Reçue":h.status==="SENT"?"📤 Envoyée":h.status==="FAILED"?"❌ Échec":"⏳ En attente"}{h.error&&<div className="muted" style={{fontSize:11}}>{h.error}</div>}</td><td>{dateFr(h.openedAt||h.receivedAt||h.sentAt||h.createdAt)}</td></tr>)}</tbody></table></div></div>}
      <div className="card" style={{padding:14,marginTop:14}}><h3>⚙️ Automatique</h3><p>✅ <strong>Contrat signé</strong> → notification ADMIN automatique.</p>
        <p>💳 <strong>Chèque de caution reçu</strong> → notification quand l’intervenant confirme sa réception.</p>
        <p>↩️ <strong>Chèque de caution rendu</strong> → notification quand l’intervenant confirme sa restitution au client.</p>
        <p>💶 <strong>Règlement reçu</strong> → notification quand l’intervenant confirme le règlement, avec le montant lorsqu’il est disponible.</p>
        <p>▶️ <strong>Début d’événement</strong> → notification quand la prestation passe en cours.</p>
        <p>📅 <strong>Planning Lydie</strong> → notification lorsqu’un événement est ajouté, annulé ou supprimé.</p>
        <p>⛔ <strong>Date bloquée par Lydie</strong> → notification ADMIN avec la période et le motif.</p>
        <p>✅ <strong>Date libérée par Lydie</strong> → notification ADMIN lors de la suppression du blocage.</p></div>
    </div>}
  </section>;
}

function EventForm({event,onClose,onSaved}) {
  const [form,setForm]=useState(event ? JSON.parse(JSON.stringify(event)) : JSON.parse(JSON.stringify(EMPTY_EVENT)));
  const [busy,setBusy]=useState(false);
  const [googleStatus,setGoogleStatus]=useState(null);
  const [googleCalendars,setGoogleCalendars]=useState([]);
const [addressSuggestions,setAddressSuggestions]=useState([]);
const [addressLoading,setAddressLoading]=useState(false);

const [collaboratorPermissions,setCollaboratorPermissions]=useState(()=>{
  const saved=event?.preparation?.collaboratorPermissions||{};
  return {
    canSeeClient:saved.canSeeClient!==false,
    canSeeContract:saved.canSeeContract!==false,
    canSeeInvoice:Boolean(saved.canSeeInvoice),
    canSeeBalance:saved.canSeeBalance!==false,
    canManageCaution:saved.canManageCaution!==false,
    canSeeInstructions:saved.canSeeInstructions!==false
  };
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

const getTravelFee = (preparation) => {
  const p = preparation && typeof preparation === "object" ? preparation : {};
  const distance = Math.max(Number(p.travelDistanceKm || 0), 0);
  const freeKm = p.travelFree15 ? 15 : 0;
  return Math.max(distance - freeKm, 0) * 0.50;
};

const withTravelFee = (basePrice, preparation) =>
  Number(basePrice || 0) + getTravelFee(preparation);

const getFrameFee = (preparation) => {
  const p = preparation && typeof preparation === "object" ? preparation : {};
  return Math.max(Number(p.framePrice || 0), 0);
};

const framePricingLabel = (event) => {
  if(!event || event.frameSource === "NONE") return "Pas de cadre";
  if(event.frameSource === "CLIENT") return "Cadre fourni par le client · Gratuit";
  const p=event.preparation||{};
  if(p.framePricing === "OFFERED") return "Cadre LP28 · Offert";
  return `Cadre LP28 · ${Number(p.framePrice ?? 25).toFixed(2).replace(".",",")} €`;
};

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

        const finalPrice = withTravelFee(price, f.preparation);
        totalPrice = finalPrice.toFixed(2);

        balance = Math.max(
          finalPrice - Number(f.deposit || 0),
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

    const finalPrice = withTravelFee(price, f.preparation);
    totalPrice = finalPrice.toFixed(2);

    balance = Math.max(
      finalPrice - Number(f.deposit || 0),
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
        body:JSON.stringify({
          ...form,
          preparation:{
            ...(form.preparation||{}),
            collaboratorPermissions
          },
          materials:[...new Set(form.materials||[])]
        })
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

      const savedEventId=d.event?.id||event?.id;
      if(savedEventId){
        await fetch(`/api/events/${savedEventId}/collaborator-access-permissions`,{
          method:"PUT",
          credentials:"include",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(collaboratorPermissions)
        }).catch(()=>{});
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
        <div className="wide">
          <label style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:"1px solid rgba(168,85,247,.45)",background:"rgba(126,34,206,.10)",cursor:"pointer",fontWeight:800}}>
            <input
              type="checkbox"
              checked={!!form.preparation?.gifted}
              onChange={e=>setForm(f=>({
                ...f,
                preparation:{...(f.preparation||{}),gifted:e.target.checked}
              }))}
              style={{width:18,height:18}}
            />
            🎁 Don / prestation offerte
          </label>
          <div className="muted" style={{marginTop:6,fontSize:12}}>Coche cette case lorsque la prestation est offerte ou réalisée sous forme de don. L’événement sera identifié par une couleur différente dans la liste.</div>
        </div>
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
  <>
  <style>{`
    .collab-permissions-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:14px}
    .collab-permissions-table{width:100%;border-collapse:separate;border-spacing:0;min-width:760px;border:1px solid rgba(214,185,79,.18);border-radius:14px;overflow:hidden}
    .collab-permissions-table th,.collab-permissions-table td{padding:14px 16px;text-align:left;border-bottom:1px solid rgba(255,255,255,.09);vertical-align:middle}
    .collab-permissions-table th{background:rgba(255,255,255,.035);color:#e8e8e8;font-weight:900}
    .collab-permissions-table th:nth-child(1){width:28%}
    .collab-permissions-table th:nth-child(2){width:54%}
    .collab-permissions-table th:nth-child(3){width:18%;text-align:center}
    .collab-permissions-table td:nth-child(3){text-align:center}
    .collab-permissions-table tbody tr:last-child td{border-bottom:0}
    .collab-permissions-table input[type="checkbox"]{width:20px;height:20px;accent-color:#d6b94f;cursor:pointer}
    .collab-sensitive-info{display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding:12px 14px;border:1px solid rgba(59,130,246,.35);border-radius:12px;background:rgba(37,99,235,.08)}
    .collab-sensitive-info strong{white-space:nowrap}
    @media(max-width:760px){.collab-sensitive-info{flex-direction:column}.collab-permissions-table{min-width:680px}}
    html[data-lp28-theme="light"] .collab-permissions-table{border-color:#d8cda8}
    html[data-lp28-theme="light"] .collab-permissions-table th{background:#f5f2ea;color:#171717}
    html[data-lp28-theme="light"] .collab-permissions-table th,
    html[data-lp28-theme="light"] .collab-permissions-table td{border-bottom-color:#e2ddd3}
    html[data-lp28-theme="light"] .collab-sensitive-info{background:#eef5ff;color:#172033;border-color:#b9d2f5}
  `}</style>
  <div className="card" style={{marginTop:16}}>
    <div className="eyebrow">ACCÈS COLLABORATEUR</div>

    <h3>🔐 Informations autorisées</h3>

    <p className="muted">
      Choisis ce que le collaborateur pourra consulter
      dans sa fiche de prestation.
    </p>

    <div className="collab-permissions-wrap">
      <table className="collab-permissions-table">
        <thead>
          <tr>
            <th>Module</th>
            <th>Description</th>
            <th>Autoriser l’accès</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>👤 Coordonnées du client</strong></td>
            <td>Nom, prénom, téléphone et e-mail du client.</td>
            <td><input aria-label="Autoriser les coordonnées du client" type="checkbox" checked={collaboratorPermissions.canSeeClient} onChange={e=>setCollaboratorPermissions(p=>({...p,canSeeClient:e.target.checked}))}/></td>
          </tr>
          <tr>
            <td><strong>📑 Contrat</strong></td>
            <td>Consultation du contrat lié à la prestation.</td>
            <td><input aria-label="Autoriser le contrat" type="checkbox" checked={collaboratorPermissions.canSeeContract} onChange={e=>setCollaboratorPermissions(p=>({...p,canSeeContract:e.target.checked}))}/></td>
          </tr>
          <tr>
            <td><strong>🧾 Facture</strong></td>
            <td>Consultation de la facture de la prestation.</td>
            <td><input aria-label="Autoriser la facture" type="checkbox" checked={collaboratorPermissions.canSeeInvoice} onChange={e=>setCollaboratorPermissions(p=>({...p,canSeeInvoice:e.target.checked}))}/></td>
          </tr>
          <tr>
            <td><strong>💶 Reste à régler</strong></td>
            <td>Indique si un règlement est à récupérer et le montant restant.</td>
            <td><input aria-label="Autoriser le reste à régler" type="checkbox" checked={collaboratorPermissions.canSeeBalance} onChange={e=>setCollaboratorPermissions(p=>({...p,canSeeBalance:e.target.checked}))}/></td>
          </tr>
          <tr>
            <td><strong>🛡️ Gestion de la caution</strong></td>
            <td>Consultation du statut et des informations de caution.</td>
            <td><input aria-label="Autoriser la gestion de la caution" type="checkbox" checked={collaboratorPermissions.canManageCaution} onChange={e=>setCollaboratorPermissions(p=>({...p,canManageCaution:e.target.checked}))}/></td>
          </tr>
          <tr>
            <td><strong>📝 Consignes de prestation</strong></td>
            <td>Consultation des consignes et informations importantes.</td>
            <td><input aria-label="Autoriser les consignes" type="checkbox" checked={collaboratorPermissions.canSeeInstructions} onChange={e=>setCollaboratorPermissions(p=>({...p,canSeeInstructions:e.target.checked}))}/></td>
          </tr>
        </tbody>
      </table>
      <div className="collab-sensitive-info">
        <strong>🔒 Information commerciale protégée</strong>
        <span>Les dons et prestations offertes restent strictement réservés à l’administrateur et ne sont jamais affichés au collaborateur.</span>
      </div>
    </div>
  </div>
  </>
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

      <div className="card" style={{marginTop:16,marginBottom:16}}>
        <div className="eyebrow">➕ BESOIN PARTICULIER</div>
        <div className="form-grid">
          <div>
            <label>Description</label>
            <input
              value={form.preparation?.specialNeedDescription || ""}
              onChange={e=>setForm(f=>({
                ...f,
                preparation:{...(f.preparation||{}),specialNeedDescription:e.target.value}
              }))}
              placeholder="Ex : décoration personnalisée"
            />
          </div>
          <div>
            <label>Tarif TTC (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.preparation?.specialNeedPrice ?? ""}
              onChange={e=>{
                const value=e.target.value;
                setForm(f=>{
                  const prep=f.preparation||{};
                  const oldFee=Math.max(Number(prep.specialNeedPrice||0),0);
                  const nextFee=value === "" ? 0 : Math.max(Number(value||0),0);
                  const newPrep={...prep,specialNeedPrice:value};
                  const base=Math.max(Number(f.totalPrice||0)-oldFee,0);
                  const total=base+nextFee;
                  return {...f,preparation:newPrep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)};
                });
              }}
              placeholder="Ex : 35 (0 = offert)"
            />
          </div>
        </div>
        <div className="muted" style={{marginTop:8}}>Laisser vide si aucun besoin particulier. Un tarif à 0 € sera indiqué comme offert dans le contrat.</div>
      </div>

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
              totalPrice:price ? withTravelFee(price, f.preparation).toFixed(2) : "",
              balance:price
                ? Math.max(
                    withTravelFee(price, f.preparation)-Number(f.deposit||0),
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
      <div className="card" style={{marginBottom:16}}>
        <div className="form-grid">
          <div>
            <label>Origine</label>
            <div className="choice-row">
              <button type="button" className={form.frameSource==="NONE"?"selected":""} onClick={()=>setForm(f=>{const old=getFrameFee(f.preparation);const prep={...(f.preparation||{}),framePricing:"NONE",framePrice:0};const total=Math.max(Number(f.totalPrice||0)-old,0);return {...f,frameSource:"NONE",frameStatus:"NOT_REQUIRED",preparation:prep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)}})}>Pas de cadre</button>
              <button type="button" className={form.frameSource==="CLIENT"?"selected":""} onClick={()=>setForm(f=>{const old=getFrameFee(f.preparation);const prep={...(f.preparation||{}),framePricing:"CLIENT_FREE",framePrice:0};const total=Math.max(Number(f.totalPrice||0)-old,0);return {...f,frameSource:"CLIENT",frameStatus:f.frameStatus==="NOT_REQUIRED"?"TO_DO":f.frameStatus,preparation:prep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)}})}>Client · Gratuit</button>
              <button type="button" className={form.frameSource==="LP28"?"selected":""} onClick={()=>setForm(f=>{const old=getFrameFee(f.preparation);const prep={...(f.preparation||{}),framePricing:"STANDARD",framePrice:25};const total=Math.max(Number(f.totalPrice||0)-old,0)+25;return {...f,frameSource:"LP28",frameStatus:f.frameStatus==="NOT_REQUIRED"?"TO_DO":f.frameStatus,preparation:prep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)}})}>LP28</button>
            </div>
          </div>
          {form.frameSource==="LP28" && <div>
            <label>Tarification</label>
            <div className="choice-row">
              <button type="button" className={(form.preparation?.framePricing||"STANDARD")==="STANDARD"?"selected":""} onClick={()=>setForm(f=>{const old=getFrameFee(f.preparation);const prep={...(f.preparation||{}),framePricing:"STANDARD",framePrice:25};const total=Math.max(Number(f.totalPrice||0)-old,0)+25;return {...f,preparation:prep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)}})}>25 €</button>
              <button type="button" className={form.preparation?.framePricing==="CUSTOM"?"selected":""} onClick={()=>setForm(f=>({...f,preparation:{...(f.preparation||{}),framePricing:"CUSTOM",framePrice:getFrameFee(f.preparation)||25}}))}>Autre prix</button>
              <button type="button" className={form.preparation?.framePricing==="OFFERED"?"selected":""} onClick={()=>setForm(f=>{const old=getFrameFee(f.preparation);const prep={...(f.preparation||{}),framePricing:"OFFERED",framePrice:0};const total=Math.max(Number(f.totalPrice||0)-old,0);return {...f,preparation:prep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)}})}>🎁 Offert</button>
            </div>
          </div>}
          {form.frameSource==="LP28" && form.preparation?.framePricing==="CUSTOM" && <div>
            <label>Prix du cadre LP28 (€)</label>
            <input type="number" min="0" step="0.01" value={form.preparation?.framePrice??""} onChange={e=>{const value=e.target.value;setForm(f=>{const old=getFrameFee(f.preparation);const next=Math.max(Number(value||0),0);const prep={...(f.preparation||{}),framePricing:"CUSTOM",framePrice:value};const total=Math.max(Number(f.totalPrice||0)-old,0)+next;return {...f,preparation:prep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)}})}} placeholder="Ex : 15"/>
          </div>}
          {form.frameSource!=="NONE" && <div>
            <label>Statut de préparation</label>
            <div className="choice-row">
              <button type="button" className={form.frameStatus==="TO_DO"?"selected":""} onClick={()=>set("frameStatus","TO_DO")}>🔴 À faire</button>
              <button type="button" className={form.frameStatus==="IN_PROGRESS"?"selected":""} onClick={()=>set("frameStatus","IN_PROGRESS")}>🟡 En cours</button>
              <button type="button" className={form.frameStatus==="DONE"?"selected":""} onClick={()=>set("frameStatus","DONE")}>🟢 Terminé</button>
            </div>
          </div>}
          {form.frameSource!=="NONE" && <div className="wide" style={{fontWeight:800}}>💶 {framePricingLabel(form)}</div>}
        </div>
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

      <h3>🚗 Frais de déplacement</h3>
      <div className="card" style={{marginBottom:16}}>
        <div className="form-grid">
          <div>
            <label>Distance totale à facturer (km)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.preparation?.travelDistanceKm ?? ""}
              onChange={e=>{
                const value=e.target.value;
                setForm(f=>{
                  const oldPrep=f.preparation||{};
                  const oldFee=getTravelFee(oldPrep);
                  const newPrep={...oldPrep,travelDistanceKm:value,travelRate:0.50};
                  const newFee=getTravelFee(newPrep);
                  newPrep.travelFee=Number(newFee.toFixed(2));
                  const base=Math.max(Number(f.totalPrice||0)-oldFee,0);
                  const total=base+newFee;
                  return {...f,preparation:newPrep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)};
                });
              }}
              placeholder="Ex : 40"
            />
          </div>
          <div>
            <label>Tarif déplacement</label>
            <input value="0,50 € / km" readOnly />
          </div>
          <label className="switch-line">
            <input
              type="checkbox"
              checked={Boolean(form.preparation?.travelFree15)}
              onChange={e=>setForm(f=>{
                const oldPrep=f.preparation||{};
                const oldFee=getTravelFee(oldPrep);
                const newPrep={...oldPrep,travelFree15:e.target.checked,travelRate:0.50};
                const newFee=getTravelFee(newPrep);
                newPrep.travelFee=Number(newFee.toFixed(2));
                const base=Math.max(Number(f.totalPrice||0)-oldFee,0);
                const total=base+newFee;
                return {...f,preparation:newPrep,totalPrice:total.toFixed(2),balance:Math.max(total-Number(f.deposit||0),0).toFixed(2)};
              })}
            />
            Appliquer 15 km offerts
          </label>
          <div>
            <label>Frais de déplacement calculés</label>
            <input value={`${getTravelFee(form.preparation).toFixed(2)} €`} readOnly />
          </div>
        </div>
      </div>

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


function AdminPlanningCalendar({events,onOpenEvent,onDeleteEvent,refreshKey=0}){
  const [blocks,setBlocks]=useState([]);
  useEffect(()=>{
    let alive=true;
    fetch("/api/account/family-planning/blocks")
      .then(async r=>{const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"Blocages indisponibles"); return d;})
      .then(d=>{if(alive)setBlocks(d.blocks||[])})
      .catch(err=>console.warn("Blocages planning:",err));
    return ()=>{alive=false};
  },[refreshKey]);
  const blockEvents=blocks.map(b=>({
    id:`family-block-${b.id}`,
    name:"NON RÉSERVABLE",
    type:"BLOCAGE",
    date:String(b.startAt||"").slice(0,10),
    pickupDate:String(b.endAt||"").slice(0,10),
    materials:[], archived:false, planningBlock:true
  }));
  return <CalendarView events={[...(events||[]),...blockEvents]} onOpenEvent={e=>{if(!e?.planningBlock)onOpenEvent?.(e)}} onDeleteEvent={onDeleteEvent}/>;
}


function FamilyPlanningAccountControls({onChanged}){
  const [capability,setCapability]=useState(null);
  const [blocks,setBlocks]=useState([]);
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({startDate:"",endDate:"",notes:""});

  async function loadBlocks(){
    try{
      const r=await fetch("/api/account/family-planning/blocks");
      const d=await r.json().catch(()=>({}));
      if(!r.ok){setCapability(false);return;}
      setCapability(Boolean(d.canManage));
      setBlocks(d.blocks||[]);
    }catch{setCapability(false)}
  }
  useEffect(()=>{loadBlocks()},[]);

  async function createBlock(e){
    e.preventDefault();
    if(!form.startDate||!form.endDate)return;
    setSaving(true);
    try{
      const r=await fetch("/api/account/family-planning/blocks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||"Impossible de créer l'indisponibilité.");
      setForm({startDate:"",endDate:"",notes:""}); setOpen(false);
      await loadBlocks(); onChanged?.();
    }catch(err){alert(err.message||"Impossible de créer l'indisponibilité.")}
    finally{setSaving(false)}
  }

  async function removeBlock(id){
    if(!confirm("Rendre cette période de nouveau réservable ?"))return;
    const r=await fetch(`/api/account/family-planning/blocks/${id}`,{method:"DELETE"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return alert(d.message||"Impossible de libérer cette période.");
    await loadBlocks(); onChanged?.();
  }

  if(capability!==true)return null;
  return <section className="panel family-planning-controls" style={{marginBottom:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div><div className="eyebrow">DISPONIBILITÉS</div><h2 style={{margin:"4px 0"}}>🚫 Blocage / indisponibilité</h2><p className="muted" style={{margin:0}}>Bloque une date ou une période afin qu'aucune réservation ne puisse être prise.</p></div>
      <button className="primary" type="button" onClick={()=>setOpen(v=>!v)}>{open?"✕ Fermer":"🚫 Créer une indisponibilité"}</button>
    </div>
    {open&&<form onSubmit={createBlock} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,alignItems:"end",marginTop:14}}>
      <div><label>Du</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/></div>
      <div><label>Au</label><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required/></div>
      <div><label>Motif</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Vacances, famille, indisponible…"/></div>
      <button className="primary" disabled={saving}>{saving?"Enregistrement…":"✅ Bloquer la période"}</button>
    </form>}
    {blocks.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:14}}>{blocks.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:10,border:"1px solid #475569",borderRadius:10,flexWrap:"wrap"}}><div><strong>🚫 {new Date(b.startAt).toLocaleDateString("fr-FR")} → {new Date(b.endAt).toLocaleDateString("fr-FR")}</strong>{b.notes&&<div className="muted">{b.notes}</div>}</div><button className="secondary-btn" type="button" onClick={()=>removeBlock(b.id)}>🔓 Libérer</button></div>)}</div>}
  </section>;
}

function CalendarView({ events, onOpenEvent, onDeleteEvent }) {
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

    // Une prestation bloque le planning depuis sa date de début
    // jusqu'à sa date de reprise incluse. Si aucune reprise n'est
    // renseignée, elle reste affichée uniquement le jour de l'événement.
    const parseLocalDate = value => {
      const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return null;
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    };

    const toIso = date =>
      `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

    for (const event of events.filter(e => !e.archived)) {
      const start = parseLocalDate(event.date);
      if (!start) continue;

      const requestedEnd = parseLocalDate(event.pickupDate);
      const end = requestedEnd && requestedEnd >= start ? requestedEnd : start;

      const day = new Date(start);
      let safety = 0;
      while (day <= end && safety < 370) {
        const iso = toIso(day);
        (map[iso] ||= []).push(event);
        day.setDate(day.getDate() + 1);
        safety += 1;
      }
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

  function printCalendar() {
    const shell = document.getElementById("lp28-calendar-print-area");
    if (!shell) return;

    const weekdays = shell.querySelector(".calendar-weekdays")?.outerHTML || "";
    const grid = shell.querySelector(".calendar-grid")?.cloneNode(true);
    if (!grid) return;

    // L'impression est un document de consultation : on retire les boutons de suppression.
    grid.querySelectorAll('button[aria-label^="Supprimer "]').forEach(el => el.remove());
    grid.querySelectorAll("button").forEach(el => {
      el.removeAttribute("onclick");
      el.setAttribute("tabindex", "-1");
    });

    const w = window.open("", "_blank", "width=1200,height=850");
    if (!w) {
      alert("Le navigateur a bloqué la fenêtre d'impression. Autorise les fenêtres pop-up pour LP28 puis réessaie.");
      return;
    }

    const title = `Location Photobooth 28 — Planning ${monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}`;
    w.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; }
    .print-header { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin:0 0 5mm; }
    .print-brand { font-size:10px; font-weight:800; letter-spacing:.12em; color:#64748b; text-transform:uppercase; }
    h1 { margin:2px 0 0; font-size:22px; }
    .printed-at { font-size:9px; color:#64748b; white-space:nowrap; }
    .calendar-weekdays { display:grid; grid-template-columns:repeat(7,1fr); border:1px solid #cbd5e1; border-bottom:0; }
    .calendar-weekdays > div { padding:5px 4px; text-align:center; font-size:10px; font-weight:800; background:#f1f5f9; border-right:1px solid #cbd5e1; }
    .calendar-weekdays > div:last-child { border-right:0; }
    .calendar-grid { display:flex; flex-direction:column; border-left:1px solid #cbd5e1; border-top:1px solid #cbd5e1; }
    .calendar-week { position:relative; min-height:22mm; border-bottom:1px solid #cbd5e1; overflow:hidden; }
    .calendar-week-days { position:absolute; inset:0; display:grid; grid-template-columns:repeat(7,1fr); }
    .calendar-week-day { min-width:0; padding:3px; border-right:1px solid #cbd5e1; background:#fff; }
    .calendar-week-day:last-child { border-right:0; }
    .muted-cell { background:#f8fafc; }
    .today-cell { box-shadow: inset 0 0 0 1.5px #0f172a; }
    .calendar-day-number { font-size:9px; font-weight:800; margin-bottom:3px; }
    .calendar-week-bars { position:absolute; left:0; right:0; top:8mm; display:grid; grid-template-columns:repeat(7,1fr); grid-auto-rows:5.5mm; row-gap:1mm; }
    .calendar-span-event { min-width:0; height:5.5mm; margin:0 1mm; padding:1mm 1.5mm; border-radius:2mm; display:flex; align-items:center; gap:1.2mm; overflow:hidden; font-size:6.8px; font-weight:700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .calendar-span-label { flex:0 0 auto; font-size:6.5px; font-weight:800; white-space:nowrap; }
    .calendar-span-name { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .calendar-span-gift { flex:0 0 auto; font-size:5.5px; font-weight:800; }
    .calendar-span-delete { display:none !important; }
    button { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    @media print {
      html, body { width:100%; }
      .calendar-week { break-inside:avoid; }
    }
  </style>
</head>
<body>
  <header class="print-header">
    <div><div class="print-brand">Location Photobooth 28</div><h1>Planning — ${monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}</h1></div>
    <div class="printed-at">Imprimé le ${new Date().toLocaleDateString("fr-FR")}</div>
  </header>
  ${weekdays}
  ${grid.outerHTML}
  <script>window.addEventListener("load",()=>setTimeout(()=>{window.focus();window.print();},250));<\/script>
</body>
</html>`);
    w.document.close();
  }

  const typeClass = type => {
    const t = String(type || "").toLowerCase();
    if (t.includes("mariage")) return "event-marriage";
    if (t.includes("anniversaire")) return "event-birthday";
    if (t.includes("entreprise")) return "event-company";
    if (t.includes("bapt")) return "event-baptism";
    return "event-other";
  };

  // Planning visuel : une ligne par borne. Si aucune borne n'est louée
  // mais que le livre d'or audio est réservé seul, on affiche TÉLÉPHONE.
  const planningItems = event => {
    if(event?.planningBlock){
      return [{label:"🚫 NON RÉSERVABLE", background:"#991b1b", color:"#ffffff"}];
    }
    const materials = Array.isArray(event?.materials) ? event.materials : [];
    const names = materials.map(m => typeof m === "string" ? m : (m?.name || m?.material?.name || ""));
    const items = [];

    if (names.some(n => n === "Borne Photobooth Nina")) {
      items.push({label:"NINA", background:"#dc2626", color:"#ffffff"});
    }
    if (names.some(n => n === "Borne Photobooth Miroir Lola")) {
      items.push({label:"LOLA", background:"#7e22ce", color:"#ffffff"});
    }
    if (names.some(n => n === "Borne Photobooth Gabin")) {
      items.push({label:"GABIN", background:"#ea580c", color:"#ffffff"});
    }

    if (!items.length && names.some(n => n === "Location livre d'or audio")) {
      items.push({label:"☎ TÉLÉPHONE", background:"#334155", color:"#ffffff"});
    }

    // Sécurité : si aucun matériel principal n'est identifié, on garde
    // une ligne neutre afin que la prestation reste visible au planning.
    if (!items.length) {
      items.push({label:"PRESTATION", background:"#475569", color:"#ffffff"});
    }

    return items;
  };


  // Affichage desktop : une prestation multi-jours devient un seul bloc continu
  // dans chaque semaine du calendrier, au lieu d'être répétée dans chaque case.
  const parsePlanningDate = value => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  };

  const weekSegments = weekCells => {
    const segments = [];

    for (const event of (events || []).filter(e => !e.archived)) {
      const start = parsePlanningDate(event.date);
      if (!start) continue;
      const requestedEnd = parsePlanningDate(event.pickupDate);
      const end = requestedEnd && requestedEnd >= start ? requestedEnd : start;

      const coveredColumns = [];
      weekCells.forEach((date, index) => {
        if (!date) return;
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        if (d >= start && d <= end) coveredColumns.push(index + 1);
      });
      if (!coveredColumns.length) continue;

      const items = planningItems(event);
      const labels = items.map(item => item.label).join(" + ");
      const primary = items[0] || {background:"#475569",color:"#ffffff"};
      segments.push({
        event,
        startCol:Math.min(...coveredColumns),
        endCol:Math.max(...coveredColumns),
        label:labels,
        background:primary.background,
        color:primary.color,
        gifted:!!event?.preparation?.gifted,
        lane:0
      });
    }

    segments.sort((a,b) => a.startCol - b.startCol || (b.endCol-b.startCol) - (a.endCol-a.startCol));
    const lanes = [];
    for (const segment of segments) {
      let lane = 0;
      while (true) {
        const occupied = (lanes[lane] || []).some(other => !(segment.endCol < other.startCol || segment.startCol > other.endCol));
        if (!occupied) break;
        lane += 1;
      }
      segment.lane = lane;
      (lanes[lane] ||= []).push(segment);
    }
    return {segments,laneCount:Math.max(1,lanes.length)};
  };

  const calendarWeeks = Array.from({length:cells.length/7},(_,weekIndex)=>cells.slice(weekIndex*7,weekIndex*7+7));

  return <>
    <style>{`
      .calendar-mobile-list{display:none;}
      .calendar-grid{display:flex !important;flex-direction:column;border-left:1px solid #28303a;border-top:1px solid #28303a;}
      .calendar-week{position:relative;min-height:150px;border-bottom:1px solid #28303a;overflow:hidden;}
      .calendar-week-days{position:absolute;inset:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));}
      .calendar-week-day{min-width:0;padding:12px 10px;border-right:1px solid #28303a;background:transparent;}
      .calendar-week-day:last-child{border-right:0;}
      .calendar-week-day.muted-cell{background:rgba(255,255,255,.015);}
      .calendar-week-day.today-cell{box-shadow:inset 0 0 0 2px #e7c84a;}
      .calendar-week-day.today-cell .calendar-day-number{display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 8px;border-radius:999px;background:#e7c84a;color:#111827;}
      .calendar-week-bars{position:absolute;left:0;right:0;top:46px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:30px;row-gap:7px;pointer-events:none;}
      .calendar-span-event{min-width:0;height:30px;margin:0 5px;display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:9px;overflow:hidden;cursor:pointer;pointer-events:auto;font-size:11px;font-weight:700;box-shadow:0 1px 0 rgba(255,255,255,.08) inset;}
      .calendar-span-event:hover{filter:brightness(1.08);}
      .calendar-span-label{flex:0 0 auto;font-size:10px;font-weight:900;white-space:nowrap;}
      .calendar-span-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .calendar-span-gift{flex:0 0 auto;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.2);font-size:9px;font-weight:900;white-space:nowrap;}
      .calendar-span-delete{flex:0 0 auto;min-width:24px;height:22px;padding:0 5px !important;border-radius:6px !important;font-size:12px !important;line-height:1 !important;}
      @media (max-width: 1100px){
        .calendar-shell{padding:10px !important;border-radius:14px !important;}
        .calendar-toolbar{align-items:flex-start !important;gap:10px !important;}
        .calendar-toolbar h2{font-size:1.35rem !important;margin:2px 0 0 !important;}
        .calendar-nav{width:100%;display:grid !important;grid-template-columns:44px 1fr 44px !important;gap:7px !important;}
        .calendar-nav button{min-height:42px !important;padding:8px 10px !important;}
        .calendar-nav button:last-child{grid-column:1 / -1 !important;}
        .calendar-weekdays,.calendar-grid{display:none !important;}
        .calendar-mobile-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
        .calendar-mobile-day{border:1px solid #334155;border-radius:12px;padding:10px;background:rgba(15,23,42,.65);}
        .calendar-mobile-day.is-today{outline:2px solid #38bdf8;outline-offset:1px;}
        .calendar-mobile-date{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:7px;}
        .calendar-mobile-date strong{font-size:.98rem;}
        .calendar-mobile-free{font-size:.83rem;color:#94a3b8;font-weight:700;}
        .calendar-mobile-event{display:flex;align-items:stretch;gap:5px;margin-top:5px;}
        .calendar-mobile-event-lines{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px;}
        .calendar-mobile-event .calendar-event{min-height:38px !important;padding:8px 10px !important;}
        .calendar-mobile-event .calendar-event strong{font-size:.78rem !important;}
        .calendar-mobile-event .calendar-event span{font-size:.82rem !important;}

        .role-viewer .calendar-shell{
          display:block !important;
          width:100% !important;
          min-height:320px !important;
          background:#101114 !important;
          color:#f8fafc !important;
          border:1px solid rgba(214,185,79,.28) !important;
        }
        .role-viewer .calendar-mobile-list{
          display:flex !important;
          width:100% !important;
          min-height:220px !important;
          background:#101114 !important;
          color:#f8fafc !important;
          padding:4px !important;
          box-sizing:border-box !important;
        }
        .role-viewer .calendar-mobile-day{
          display:block !important;
          width:100% !important;
          background:#17191e !important;
          color:#f8fafc !important;
          border:1px solid #3a4049 !important;
          box-sizing:border-box !important;
        }
        .role-viewer .calendar-mobile-date strong{color:#f8fafc !important;}
        .role-viewer .calendar-mobile-free{color:#9ca3af !important;}
        .role-viewer .calendar-mobile-event-lines{width:100% !important;}
        .role-viewer .calendar-mobile-event .calendar-event{
          width:100% !important;
          color:#fff !important;
          font-size:.78rem !important;
        }
      }
    `}</style>
    <section className="calendar-shell" id="lp28-calendar-print-area">
    <div className="calendar-toolbar">
      <div>
        <div className="eyebrow">PLANNING</div>
        <h2>{monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}</h2>
      </div>
      <div className="calendar-nav">
        <button className="secondary-btn" onClick={previousMonth}>←</button>
        <button className="secondary-btn" onClick={today}>Aujourd'hui</button>
        <button className="secondary-btn" onClick={nextMonth}>→</button>
        <button className="secondary-btn" onClick={printCalendar}>🖨️ Imprimer le calendrier</button>
      </div>
    </div>

    <div className="calendar-weekdays">
      {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => <div key={d}>{d}</div>)}
    </div>

    <div className="calendar-grid">
      {calendarWeeks.map((weekCells,weekIndex)=>{
        const {segments,laneCount}=weekSegments(weekCells);
        const weekHeight=Math.max(150,58 + laneCount*37);
        return <div className="calendar-week" key={`week-${weekIndex}`} style={{height:weekHeight}}>
          <div className="calendar-week-days">
            {weekCells.map((date,dayIndex)=>{
              if(!date) return <div className="calendar-week-day muted-cell" key={`week-${weekIndex}-empty-${dayIndex}`} />;
              const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
              const now=new Date();
              const isToday=iso===`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
              return <div className={`calendar-week-day ${isToday?"today-cell":""}`} key={iso}>
                <div className="calendar-day-number">{date.getDate()}</div>
              </div>;
            })}
          </div>

          <div className="calendar-week-bars">
            {segments.map((segment,index)=>{
              const event=segment.event;
              const title=`${segment.label} — ${event.name}${segment.gifted?" — Don / prestation offerte":""}${event.date?` — du ${event.date}${event.pickupDate?` au ${event.pickupDate}`:""}`:""}`;
              return <div
                key={`${event.id}-${weekIndex}-${index}`}
                className="calendar-span-event"
                role="button"
                tabIndex={0}
                onClick={()=>onOpenEvent(event)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onOpenEvent(event)}}}
                title={title}
                style={{
                  gridColumn:`${segment.startCol} / ${segment.endCol+1}`,
                  gridRow:segment.lane+1,
                  background:segment.background,
                  color:segment.color
                }}
              >
                <strong className="calendar-span-label">{segment.label}</strong>
                <span className="calendar-span-name">{event.name}</span>
                {segment.gifted&&<span className="calendar-span-gift">🎁 OFFERT</span>}
                {onDeleteEvent&&!event.planningBlock&&<button
                  type="button"
                  className="danger-btn calendar-span-delete"
                  onClick={e=>{e.stopPropagation();onDeleteEvent(event)}}
                  title={`Supprimer définitivement ${event.name}`}
                  aria-label={`Supprimer ${event.name}`}
                >🗑️</button>}
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>

    <div className="calendar-mobile-list">
      {cells.filter(Boolean).map(date => {
        const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
        const dayEvents = byDate[iso] || [];
        const now = new Date();
        const isToday = iso === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
        const dayLabel = date.toLocaleDateString("fr-FR", {weekday:"long",day:"numeric",month:"long"});
        return <div className={`calendar-mobile-day ${isToday ? "is-today" : ""}`} key={`mobile-${iso}`}>
          <div className="calendar-mobile-date">
            <strong>{dayLabel.charAt(0).toUpperCase()+dayLabel.slice(1)}</strong>
            {dayEvents.length===0&&<span className="calendar-mobile-free">Libre</span>}
          </div>
          {dayEvents.map(event => <div className="calendar-mobile-event" key={`mobile-${iso}-${event.id}`}>
            <div className="calendar-mobile-event-lines">
              {planningItems(event).map((item,itemIndex)=><button
                key={`mobile-${event.id}-${item.label}-${itemIndex}`}
                className="calendar-event"
                onClick={() => onOpenEvent(event)}
                title={`${item.label} — ${event.name}${event.time ? ` — installation ${event.time}` : ""}`}
                style={{width:"100%",minWidth:0,display:"flex",alignItems:"center",gap:7,background:item.background,color:item.color,border:"none"}}
              ><strong style={{whiteSpace:"nowrap"}}>{item.label}</strong><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event.preparation?.gifted?"🎁 ":""}{event.name}</span></button>)}
            </div>
            {onDeleteEvent&&!event.planningBlock&&<button type="button" className="danger-btn" onClick={(e)=>{e.stopPropagation();onDeleteEvent(event)}} title={`Supprimer définitivement ${event.name}`} aria-label={`Supprimer ${event.name}`} style={{padding:"4px 8px",minWidth:34,borderRadius:8}}>🗑️</button>}
          </div>)}
        </div>;
      })}
    </div>
  </section>
  </>;
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



const MATHIS_BOOTHS={
  nina:{name:"Nina",icon:"📸",trigger:"Godox X2T"},
  lola:{name:"Lola",icon:"🪞",trigger:"Godox X2T"},
  gabin:{name:"Gabin",icon:"📷",trigger:"Godox AT-16"}
};
const MATHIS_PRINTERS={
  dnp1:{name:"DNP DS620 — N°1",icon:"🖨️"},
  dnp2:{name:"DNP DS620 — N°2",icon:"🖨️"},
  citizen:{name:"Citizen CY-02",icon:"🖨️"},
  unknown:{name:"Je ne sais pas",icon:"❓"}
};
const MATHIS_ISSUES=[
  ["printer","🖨️","Imprimante","Pas d'impression, papier, ruban, bourrage"],
  ["flash","⚡","Flash Godox","Ne s'allume pas, ne déclenche pas, puissance"],
  ["camera","📷","Appareil Nikon","Non détecté, autofocus, connexion USB"],
  ["quality","🖼️","Qualité photo","Floue, sombre, claire, couleurs, cadrage"],
  ["lumabooth","📸","LumaBooth","Blocage, relance, périphérique non détecté"],
  ["internet","🌐","Internet / QR / Galerie","Wi-Fi, 4G, QR Code, synchronisation"],
  ["windows","💻","Borne / Windows","Lenteur, USB, file d'impression, redémarrage"],
  ["other","💬","Autre problème","Je ne trouve pas mon problème dans la liste"]
];


const MATHIS_LED_CODES={
  dnp:[
    {id:"paper-end",label:"PAPER clignote",status:"Fin de papier",safe:"Remplacer le rouleau papier selon la procédure normale.",level:"orange",photos:true,prints:false},
    {id:"ribbon-end",label:"RIBBON clignote",status:"Fin de ruban",safe:"Remplacer le consommable selon la procédure normale.",level:"orange",photos:true,prints:false},
    {id:"door-no-paper",label:"PAPER + ERROR clignotent",status:"Porte ouverte / papier absent",safe:"Contrôler la présence et la mise en place du papier puis fermer complètement le mécanisme.",level:"orange",photos:true,prints:false},
    {id:"door-open",label:"ERROR clignote seul",status:"Porte / mécanisme ouvert",safe:"Fermer complètement le mécanisme sans forcer.",level:"green",photos:true,prints:false},
    {id:"paper-error",label:"PAPER + ERROR fixes",status:"Erreur papier",safe:"Contrôler uniquement le chargement accessible du papier. Ne pas forcer si le papier est coincé.",level:"orange",photos:true,prints:false},
    {id:"ribbon-error",label:"RIBBON + ERROR fixes",status:"Erreur ruban",safe:"Contrôler uniquement la bonne mise en place du ruban. Ne pas toucher la tête thermique.",level:"orange",photos:true,prints:false},
    {id:"media-size",label:"RIBBON et PAPER clignotent alternativement",status:"Taille média incompatible",safe:"Ne pas démonter. Vérifier le format d'impression envoyé et le média installé.",level:"green",photos:true,prints:false},
    {id:"system-error",label:"ERROR fixe seul",status:"Erreur système",safe:"Basculer l'interrupteur ON/Standby puis attendre le redémarrage. Si l'erreur revient : STOP niveau 2.",level:"red",photos:true,prints:false},
    {id:"cooldown",label:"POWER clignote seul",status:"Refroidissement de tête",safe:"Ne rien manipuler : attendre. Le retour à l'état normal est automatique.",level:"green",photos:true,prints:false}
  ],
  citizen:[
    {id:"paper-end",label:"PAPER clignote",status:"Fin de papier",safe:"Remplacer le papier et le ruban en ensemble, conformément au manuel Citizen.",level:"orange",photos:true,prints:false},
    {id:"ribbon-end",label:"RIBBON clignote",status:"Fin de ruban",safe:"Remplacer le papier et le ruban en ensemble, conformément au manuel Citizen.",level:"orange",photos:true,prints:false},
    {id:"door-no-paper",label:"PAPER + ERROR clignotent",status:"Capot ouvert / pas de papier",safe:"Mettre correctement le papier puis fermer le capot avant.",level:"orange",photos:true,prints:false},
    {id:"door-open",label:"ERROR clignote seul",status:"Capot avant ouvert",safe:"Fermer complètement le capot avant sans forcer.",level:"green",photos:true,prints:false},
    {id:"paper-error",label:"PAPER + ERROR fixes",status:"Erreur papier",safe:"Libérer uniquement le papier accessible et le remettre correctement. Si résistance : STOP.",level:"orange",photos:true,prints:false},
    {id:"ribbon-error",label:"RIBBON + ERROR fixes",status:"Erreur ruban",safe:"Remettre correctement le ruban sans toucher la tête thermique.",level:"orange",photos:true,prints:false},
    {id:"system-error",label:"ERROR fixe seul",status:"Erreur système",safe:"Éteindre puis rallumer l'imprimante. Si l'erreur revient : STOP niveau 2.",level:"red",photos:true,prints:false},
    {id:"cooldown",label:"POWER clignote seul",status:"Refroidissement de tête",safe:"Ne rien manipuler : attendre le refroidissement automatique.",level:"green",photos:true,prints:false}
  ]
};

function MathisAssistant({videos=[]}){
  const [open,setOpen]=useState(false);
  const [booth,setBooth]=useState("");
  const [issue,setIssue]=useState("");
  const [printer,setPrinter]=useState("");
  const [step,setStep]=useState("booth");
  const [printerStage,setPrinterStage]=useState("symptom");
  const [printerSymptom,setPrinterSymptom]=useState("");
  const [printerAnswer,setPrinterAnswer]=useState("");
  const [ledCode,setLedCode]=useState("");
  const [incidentStarted]=useState(()=>new Date());
  const [reportOpen,setReportOpen]=useState(false);
  const boothInfo=MATHIS_BOOTHS[booth];
  const issueInfo=MATHIS_ISSUES.find(x=>x[0]===issue);
  const printerInfo=MATHIS_PRINTERS[printer];

  function reset(){
    setBooth("");setIssue("");setPrinter("");setStep("booth");
    setPrinterStage("symptom");setPrinterSymptom("");setPrinterAnswer("");setLedCode("");setReportOpen(false);
  }
  function chooseBooth(id){setBooth(id);setStep("issue")}
  function chooseIssue(id){
    setIssue(id);
    if(id==="printer") setStep("printer");
    else setStep("diagnostic");
  }
  function choosePrinter(id){
    setPrinter(id);setPrinterStage("symptom");setPrinterSymptom("");setPrinterAnswer("");setStep("diagnostic");
  }
  function choosePrinterSymptom(id){
    setPrinterSymptom(id);setPrinterAnswer("");setPrinterStage("action");
  }
  function printerSolved(){
    setPrinterAnswer("solved");setPrinterStage("result");
  }
  function printerStillBroken(){
    setPrinterAnswer("failed");setPrinterStage("result");
  }
  function printerBack(){
    setPrinterStage("symptom");setPrinterSymptom("");setPrinterAnswer("");
  }

  const findVideo=(needles=[])=>{
    const list=Array.isArray(needles)?needles:[needles];
    return videos.find(v=>list.some(n=>String(v.title||"").toLowerCase().includes(String(n).toLowerCase())));
  };
  const jamVideo=findVideo(["bourrage"]);
  const tornVideo=findVideo(["déchir","dechir"]);

  function VideoHelp({video,label}){
    if(!video)return null;
    return <div className="mathis-video-shortcuts"><span>🎥 Aide vidéo Location Photobooth 28</span><a href={video.url} target="_blank" rel="noreferrer">▶️ {label||video.title}</a></div>;
  }

  function ledFamily(){
    if(printer==="dnp1"||printer==="dnp2")return "dnp";
    if(printer==="citizen")return "citizen";
    return "";
  }
  function ledInfo(){
    const family=ledFamily();
    return (MATHIS_LED_CODES[family]||[]).find(x=>x.id===ledCode);
  }
  function riskBadge(level){
    if(level==="red")return "🔴 STOP / niveau 2";
    if(level==="orange")return "🟠 Manipulation guidée";
    return "🟢 Sans risque";
  }
  function symptomLabel(){
    const labels={"not-printing":"Rien ne s'imprime","paper":"Papier / PAPER","ribbon":"Ruban / RIBBON","jam":"Bourrage papier","offline":"Hors ligne / non détectée","queue":"File d'impression bloquée","error":"Voyants / code LED","no-power":"Ne s'allume plus"};
    return labels[printerSymptom]||printerSymptom||"Non précisé";
  }
  function IncidentReport(){
    const led=ledInfo();
    const canPhotos=led?led.photos:true;
    const canPrint=printerAnswer==="solved";
    return <div className="mathis-report">
      <div className="mathis-bubble mathis-bubble-bot"><b>📋 Compte rendu Mathis</b><br/>
        <b>Borne :</b> {boothInfo?.name||"—"}<br/>
        <b>Imprimante :</b> {printerInfo?.name||"—"}<br/>
        <b>Incident :</b> {symptomLabel()}<br/>
        {led&&<><b>Lecture LED :</b> {led.label} → {led.status}<br/><b>Niveau :</b> {riskBadge(led.level)}<br/></>}
        <b>Prise de photos :</b> {canPhotos?"✅ possible":"🔴 indisponible"}<br/>
        <b>Impression :</b> {canPrint?"✅ rétablie":"🟠 à contrôler / indisponible"}<br/>
        <b>État :</b> {printerAnswer==="solved"?"✅ incident résolu":printerAnswer==="failed"?"🔴 intervention niveau 2 demandée":"🟠 diagnostic en cours"}<br/>
        <small>Mathis privilégie la continuité de la prestation et ne valide aucune manipulation non documentée.</small>
      </div>
    </div>;
  }
  function LedDiagnostic(){
    const family=ledFamily();
    const codes=MATHIS_LED_CODES[family]||[];
    const led=ledInfo();
    if(!family)return <div className="mathis-bubble mathis-bubble-bot">Je dois d'abord identifier précisément l'imprimante avant d'interpréter ses voyants.</div>;
    if(!led)return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Regarde les 4 voyants : POWER, RIBBON, PAPER et ERROR.</b><br/>Choisis uniquement la combinaison que tu vois réellement. Si aucune ne correspond, sélectionne « aucune correspondance » : je ne devinerai pas.</div>
      <div className="mathis-choice-grid mathis-led-grid">
        {codes.map(c=><button key={c.id} onClick={()=>setLedCode(c.id)}><span>💡</span><b>{c.label}</b><small>{c.status}</small></button>)}
        <button onClick={()=>setLedCode("unknown")}><span>❓</span><b>Aucune correspondance</b><small>STOP : remontée d'information sans manipulation</small></button>
      </div>
    </>;
    if(ledCode==="unknown")return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>🔴 Je n'identifie pas cette combinaison avec certitude.</b><br/>Ne démonte rien et ne force rien. Les invités peuvent continuer à prendre des photos si Nikon + LumaBooth fonctionnent ; l'impression reste suspendue. Fais une photo des voyants pour le support niveau 2.</div>
      <div className="mathis-actions"><button onClick={()=>{setPrinterAnswer("failed");setPrinterStage("result")}}>📋 Générer le compte rendu</button><button onClick={()=>setLedCode("")}>↩️ Revoir les voyants</button></div>
    </>;
    return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>{riskBadge(led.level)} — {led.status}</b><br/><b>Voyants :</b> {led.label}<br/><b>Action autorisée :</b> {led.safe}<br/><br/>📸 <b>Les invités peuvent continuer à prendre leurs photos</b> tant que Nikon et LumaBooth fonctionnent. L'impression peut rester indisponible pendant le diagnostic.</div>
      <div className="mathis-actions"><button onClick={printerSolved}>✅ Impression rétablie</button><button onClick={printerStillBroken}>❌ Toujours en panne</button><button onClick={()=>setLedCode("")}>↩️ Revoir les voyants</button></div>
    </>;
  }

  function PrinterAction(){
    const isDnp=printer==="dnp1"||printer==="dnp2";
    const model=isDnp?"DNP DS620":printer==="citizen"?"Citizen CY-02":"imprimante";
    const commonButtons=<div className="mathis-actions"><button onClick={printerSolved}>✅ C'est réparé</button><button onClick={printerStillBroken}>❌ Toujours en panne</button><button onClick={printerBack}>↩️ Autre symptôme</button></div>;

    if(printer==="unknown") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Pas de souci.</b><br/>Regarde l'étiquette sur la façade ou le dessus de l'imprimante. Si tu vois <b>DNP DS620</b>, vérifie ensuite le repère physique <b>N°1</b> ou <b>N°2</b>. Si tu vois <b>Citizen CY-02</b>, reviens au choix précédent.</div>
      <div className="mathis-actions"><button onClick={()=>setStep("printer")}>🖨️ Choisir l'imprimante</button></div>
    </>;

    if(printerSymptom==="no-power") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>{printerInfo?.name} ne s'allume pas.</b><br/>1. Vérifie que l'interrupteur de l'imprimante est sur ON.<br/>2. Vérifie le câble secteur côté imprimante puis côté prise/multiprise.<br/>3. Teste la prise avec un autre appareil si possible.<br/><b>Ne démonte pas l'imprimante.</b></div>
      {commonButtons}
    </>;

    if(printerSymptom==="paper") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Problème papier sur {printerInfo?.name}.</b><br/>{isDnp?"Sur la DS620, un voyant PAPER signale généralement qu'il faut contrôler le rouleau papier.":"Sur la Citizen, contrôle d'abord le rouleau papier et sa bonne mise en place."}<br/>Ouvre normalement le tiroir, vérifie qu'il reste du papier et qu'il est correctement chargé, puis referme complètement l'imprimante.</div>
      {tornVideo&&<VideoHelp video={tornVideo} label="Voir la vidéo : papier déchiré"/>}
      {commonButtons}
    </>;

    if(printerSymptom==="ribbon") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Problème ruban sur {printerInfo?.name}.</b><br/>Ouvre normalement l'imprimante, contrôle que le ruban n'est pas terminé, détendu ou mal positionné. Replace la cassette/le ruban sans forcer puis referme complètement.<br/><b>Ne touche pas la tête thermique et n'utilise aucun outil métallique.</b></div>
      {commonButtons}
    </>;

    if(printerSymptom==="jam") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Bourrage papier détecté.</b><br/>Arrête les nouvelles impressions. Ouvre l'imprimante normalement et retire uniquement le papier facilement accessible, doucement et dans le sens naturel de sortie.<br/><b>⚠️ Ne tire jamais en force et ne touche pas au cutter.</b></div>
      {jamVideo&&<VideoHelp video={jamVideo} label="Voir la vidéo : bourrage papier"/>}
      {commonButtons}
    </>;

    if(printerSymptom==="offline") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>{printerInfo?.name} est hors ligne / non détectée.</b><br/>1. Vérifie qu'elle est allumée et prête.<br/>2. Vérifie le câble USB aux deux extrémités.<br/>3. Garde si possible <b>le même port USB</b> sur la borne.<br/>4. Dans Windows → Imprimantes et scanners, vérifie que {model} apparaît.<br/>Ne réinstalle pas le pilote pour l'instant.</div>
      {commonButtons}
    </>;

    if(printerSymptom==="queue") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Impressions bloquées dans Windows.</b><br/>Ferme temporairement LumaBooth pour éviter d'ajouter des travaux. Ouvre Windows → Imprimantes et scanners → {model} → file d'attente, puis annule les travaux bloqués. Attends que la file soit vide avant de relancer LumaBooth.</div>
      {commonButtons}
    </>;

    if(printerSymptom==="error") return <LedDiagnostic/>;

    if(printerSymptom==="not-printing") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>L'imprimante est prête mais aucune photo ne sort.</b><br/>On doit séparer Windows de LumaBooth : essaie d'imprimer une petite image directement depuis Windows sur <b>{printerInfo?.name}</b>.<br/><b>Si Windows imprime, le problème est probablement côté LumaBooth/configuration. Si Windows n'imprime pas, on reste côté imprimante/USB/Windows.</b></div>
      <div className="mathis-actions">
        <button onClick={()=>{setPrinterAnswer("windows-ok");setPrinterStage("result")}}>🟢 Windows imprime</button>
        <button onClick={()=>{setPrinterAnswer("windows-fail");setPrinterStage("result")}}>🔴 Windows n'imprime pas</button>
        <button onClick={printerBack}>↩️ Autre symptôme</button>
      </div>
    </>;

    return null;
  }

  function PrinterDiagnostic(){
    if(printerStage==="symptom") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>Très bien. Je dépanne {boothInfo?.name} avec {printerInfo?.name||"l'imprimante"}.</b><br/>Quel symptôme vois-tu maintenant ?</div>
      <div className="mathis-choice-grid mathis-printer-symptoms">
        <button onClick={()=>choosePrinterSymptom("not-printing")}><span>🖨️</span><b>Rien ne s'imprime</b><small>L'imprimante semble prête</small></button>
        <button onClick={()=>choosePrinterSymptom("paper")}><span>📄</span><b>Papier / PAPER</b><small>Fin, mauvais chargement, papier déchiré</small></button>
        <button onClick={()=>choosePrinterSymptom("ribbon")}><span>🎞️</span><b>Ruban / RIBBON</b><small>Ruban terminé ou mal positionné</small></button>
        <button onClick={()=>choosePrinterSymptom("jam")}><span>⚠️</span><b>Bourrage papier</b><small>Papier coincé dans l'imprimante</small></button>
        <button onClick={()=>choosePrinterSymptom("offline")}><span>🔌</span><b>Hors ligne / non détectée</b><small>Windows ou LumaBooth ne la voit plus</small></button>
        <button onClick={()=>choosePrinterSymptom("queue")}><span>📋</span><b>File d'impression bloquée</b><small>Des travaux restent en attente</small></button>
        <button onClick={()=>choosePrinterSymptom("error")}><span>🔴</span><b>Voyants / code LED</b><small>POWER · RIBBON · PAPER · ERROR</small></button>
        <button onClick={()=>choosePrinterSymptom("no-power")}><span>⛔</span><b>Ne s'allume plus</b><small>Aucun voyant / aucun bruit</small></button>
      </div>
    </>;

    if(printerStage==="action") return <PrinterAction/>;

    if(printerStage==="result"&&printerAnswer==="solved") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>✅ Parfait, la panne semble résolue.</b><br/>Avant de remettre la borne au public, fais <b>une session photo complète avec un tirage test</b>. Si le tirage est correct, la prestation peut reprendre.</div>
      <IncidentReport/><div className="mathis-actions"><button onClick={reset}>✅ Terminer le diagnostic</button><button onClick={printerBack}>🔎 Vérifier autre chose</button></div>
    </>;

    if(printerStage==="result"&&printerAnswer==="windows-ok") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>🟢 Bonne nouvelle : l'imprimante et Windows fonctionnent.</b><br/>Le problème se situe probablement dans LumaBooth ou dans l'imprimante sélectionnée. Ferme puis relance LumaBooth proprement et vérifie <b>Print Setup</b> : sélectionne {printerInfo?.name} et le bon format papier. Fais ensuite un tirage test.</div>
      <div className="mathis-actions"><button onClick={printerSolved}>✅ Ça imprime maintenant</button><button onClick={printerStillBroken}>❌ Toujours rien</button></div>
    </>;

    if(printerStage==="result"&&printerAnswer==="windows-fail") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>🔴 Windows n'arrive pas non plus à imprimer.</b><br/>Ne touche pas encore à LumaBooth. Vérifie le câble USB, que {printerInfo?.name} est bien en ligne dans Windows et vide sa file d'impression. Éteins ensuite l'imprimante 10 secondes, rallume-la et refais un test Windows.</div>
      <div className="mathis-actions"><button onClick={printerSolved}>✅ Le test Windows fonctionne</button><button onClick={printerStillBroken}>❌ Toujours en panne</button></div>
    </>;

    if(printerStage==="result"&&printerAnswer==="failed") return <>
      <div className="mathis-bubble mathis-bubble-bot"><b>🟠 Mathis passe au niveau 2.</b><br/>J'ai déjà identifié : <b>{boothInfo?.name}</b> + <b>{printerInfo?.name}</b> + symptôme <b>{printerSymptom||"impression"}</b>.<br/>N'effectue pas de démontage supplémentaire. Si une imprimante de secours est disponible, utilise-la pour protéger la prestation et contacte le support Location Photobooth 28.</div>
      <IncidentReport/><div className="mathis-actions"><button onClick={printerBack}>↩️ Reprendre le diagnostic</button><button onClick={reset}>🆕 Nouveau diagnostic</button></div>
    </>;

    return null;
  }

  function diagnostic(){
    if(!boothInfo||!issueInfo)return null;
    const trigger=boothInfo.trigger;
    if(issue==="printer") return <PrinterDiagnostic/>;
    if(issue==="flash") return <><div className="mathis-bubble mathis-bubble-bot"><b>{boothInfo.name} utilise le déclencheur {trigger}.</b><br/>On commence sans toucher aux réglages compliqués : le Godox MS300/MS300V est-il allumé et le bouton TEST déclenche-t-il un éclair ?</div><div className="mathis-actions"><button>⚡ Oui, TEST fonctionne</button><button>❌ TEST ne déclenche pas</button><button>⛔ Le flash ne s'allume pas</button></div></>;
    if(issue==="quality") return <><div className="mathis-bubble mathis-bubble-bot">Je vais d'abord déterminer si le défaut vient de la prise de vue ou de l'impression.<br/><b>La photo est-elle déjà mauvaise à l'écran avant son impression ?</b></div><div className="mathis-actions"><button>🖥️ Oui, à l'écran aussi</button><button>🖨️ Non, seulement imprimée</button><button>👀 Je ne sais pas</button></div></>;
    if(issue==="internet") return <><div className="mathis-bubble mathis-bubble-bot">La prestation photo et l'impression doivent rester prioritaires, même sans Internet.<br/><b>Quel est le symptôme sur {boothInfo.name} ?</b></div><div className="mathis-actions"><button>📶 Wi-Fi / 4G absent</button><button>🌐 Connecté mais pas Internet</button><button>🔳 QR Code ne fonctionne pas</button><button>☁️ Galerie non synchronisée</button></div></>;
    if(issue==="lumabooth") return <><div className="mathis-bubble mathis-bubble-bot"><b>LumaBooth sur {boothInfo.name} :</b> que se passe-t-il ?</div><div className="mathis-actions"><button>🧊 LumaBooth est bloqué</button><button>📷 Nikon non détecté</button><button>🖨️ Imprimante non détectée</button><button>🔄 Je veux le relancer proprement</button></div></>;
    if(issue==="camera") return <><div className="mathis-bubble mathis-bubble-bot">On contrôle d'abord le Nikon de {boothInfo.name} sans modifier les réglages.<br/><b>L'appareil est-il allumé et détecté par la borne ?</b></div><div className="mathis-actions"><button>✅ Oui</button><button>🔌 Non détecté</button><button>🔋 Il ne s'allume pas</button></div></>;
    if(issue==="windows") return <><div className="mathis-bubble mathis-bubble-bot">Je vais rester léger pour ne pas ralentir {boothInfo.name}.<br/><b>Quel problème Windows rencontres-tu ?</b></div><div className="mathis-actions"><button>🐌 Borne lente</button><button>🔌 USB non reconnu</button><button>🖨️ Impression bloquée</button><button>🔄 Redémarrage nécessaire</button></div></>;
    return <><div className="mathis-bubble mathis-bubble-bot">Décris-moi le problème rencontré sur <b>{boothInfo.name}</b>. Si je ne peux pas le résoudre de façon sûre, je passerai la main au support niveau 2.</div><textarea className="mathis-free-text" placeholder="Exemple : la photo se prend mais rien ne s'imprime…"/></>;
  }

  return <div className={`mathis-shell ${open?"open":""}`}>
    {!open?<button className="mathis-launch" onClick={()=>setOpen(true)}><img src="/mathis-assistant.png" alt="Mathis"/><span><b>🤖 Mathis — Technicien N1</b><small>Premier intervenant en cas de problème · Ouvrir l'assistant</small></span><strong>Ouvrir →</strong></button>:
    <div className="mathis-panel">
      <div className="mathis-head"><img src="/mathis-assistant.png" alt="Mathis"/><div><span className="mathis-online">● DISPONIBLE À LA DEMANDE</span><h3>🤖 Mathis — Assistant technique</h3><p>Location Photobooth 28 · dépannage léger, sans surveillance permanente</p></div><button onClick={()=>setOpen(false)} aria-label="Fermer">✕</button></div>
      <div className="mathis-chat">
        <div className="mathis-bubble mathis-bubble-bot">Salut 👋 Je suis <b>Mathis</b>, ton premier intervenant technique.<br/>Je vais avancer avec toi <b>une question à la fois</b>, sans lancer de surveillance en arrière-plan.</div>
        {step==="booth"&&<><div className="mathis-bubble mathis-bubble-bot"><b>Quelle borne est impactée ?</b></div><div className="mathis-choice-grid mathis-booths">{Object.entries(MATHIS_BOOTHS).map(([id,b])=><button key={id} onClick={()=>chooseBooth(id)}><span>{b.icon}</span><b>{b.name}</b><small>{b.trigger}</small></button>)}</div></>}
        {step!=="booth"&&<div className="mathis-bubble mathis-bubble-user">{boothInfo?.icon} Borne <b>{boothInfo?.name}</b></div>}
        {step==="issue"&&<><div className="mathis-bubble mathis-bubble-bot">D'accord 👍 <b>Quel problème rencontres-tu sur {boothInfo?.name} ?</b></div><div className="mathis-choice-grid">{MATHIS_ISSUES.map(([id,icon,label,desc])=><button key={id} onClick={()=>chooseIssue(id)}><span>{icon}</span><b>{label}</b><small>{desc}</small></button>)}</div></>}
        {(step==="printer"||step==="diagnostic")&&<div className="mathis-bubble mathis-bubble-user">{issueInfo?.[1]} <b>{issueInfo?.[2]}</b></div>}
        {step==="printer"&&<><div className="mathis-bubble mathis-bubble-bot">Les imprimantes ne sont pas affectées à une borne.<br/><b>Quelle imprimante est actuellement branchée à {boothInfo?.name} ?</b></div><div className="mathis-choice-grid mathis-printers">{Object.entries(MATHIS_PRINTERS).map(([id,p])=><button key={id} onClick={()=>choosePrinter(id)}><span>{p.icon}</span><b>{p.name}</b>{id.startsWith("dnp")&&<small>Repère physique {id==="dnp1"?"1":"2"}</small>}</button>)}</div></>}
        {step==="diagnostic"&&issue==="printer"&&<div className="mathis-bubble mathis-bubble-user">🖨️ <b>{MATHIS_PRINTERS[printer]?.name}</b></div>}
        {step==="diagnostic"&&diagnostic()}
      </div>
      <div className="mathis-footer"><button className="secondary-btn" onClick={reset}>↺ Nouveau diagnostic</button><span>🛡️ Mathis ne propose aucune manipulation mécanique risquée.</span></div>
    </div>}
  </div>;
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

  useEffect(()=>{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(err=>console.warn("Service worker LP28 :",err));
    }
    const onBeforeInstall=e=>{e.preventDefault();setInstallPrompt(e)};
    const onInstalled=()=>{setInstallPrompt(null);setIsStandalone(true)};
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    return ()=>{
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  async function installLp28(){
    if(installPrompt){
      installPrompt.prompt();
      await installPrompt.userChoice.catch(()=>null);
      setInstallPrompt(null);
      return;
    }
    alert("Pour installer LP28 Suite : ouvre le menu de ton navigateur puis choisis ‘Installer l’application’ ou ‘Ajouter à l’écran d’accueil’. Sur iPhone/iPad : Partager → Sur l’écran d’accueil.");
  }
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
    <MathisAssistant videos={data.videos||[]}/>
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



function AdminBooths(){
  const [booths,setBooths]=useState([]),[error,setError]=useState("");
  async function load(){
    try{
      const r=await fetch("/api/admin/booths");
      const d=await r.json();
      if(!r.ok)throw new Error(d.message||"Supervision indisponible.");
      setBooths(d.booths||[]);setError("");
    }catch(e){setError(e.message)}
  }
  useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);
  const ago=s=>{
    if(s===null||typeof s==="undefined")return "Jamais";
    if(s<60)return `il y a ${s} s`;
    if(s<3600)return `il y a ${Math.floor(s/60)} min`;
    return `il y a ${Math.floor(s/3600)} h`;
  };
  return <section>
    <div className="calendar-toolbar">
      <div><div className="eyebrow">SUPERVISION LP28</div><h2>🖥️ Mes bornes</h2><p className="muted">État en direct de Nina, Lola et Gabin.</p></div>
      <button className="ghost" onClick={load}>↻ Actualiser</button>
    </div>
    {error&&<div className="notice error">{error}</div>}
    <div className="stats-grid">
      {booths.map(b=><article className="stat-card" key={b.boothName} style={{textAlign:"left"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
          <strong style={{fontSize:22}}>{b.online?"🟢":"🔴"} {b.boothName}</strong>
          <span>{b.online?"En ligne":"Hors ligne"}</span>
        </div>
        <div style={{marginTop:14,lineHeight:1.8}}>
          <div><b>Événement :</b> {b.eventName||"Aucun"}</div>
          <div>📸 LumaBooth : {b.lumaActive?"🟢 Actif":"⚪ Inactif"}</div>
          <div>☁️ Galerie : {b.syncStatus||"—"}</div>
          {b.counts&&<div>🖼️ Originaux : {b.counts.originals||0} · Tirages : {b.counts.prints||0} · GIF : {b.counts.animated||0}</div>}
          <div>🖨️ Imprimante : {b.printer?.present?`🟢 ${b.printer.model||"Détectée"}`:"⚪ Aucune"}</div>
          {b.printer?.mediaRemaining!==null&&typeof b.printer?.mediaRemaining!=="undefined"&&(()=>{
            const isCitizen=String(b.printer.model||"").toUpperCase().includes("CITIZEN")||String(b.printer.model||"").toUpperCase().includes("CY-02");
            const reportedCapacity=Number(b.printer.mediaCapacity);
            const capacity=Number.isFinite(reportedCapacity)&&reportedCapacity>0?reportedCapacity:(isCitizen?700:null);
            const reportedPct=Number(b.printer.mediaPercent);
            const calculatedPct=capacity?Number(b.printer.mediaRemaining)*100/capacity:NaN;
            const pct=Number.isFinite(reportedPct)&&reportedPct>0?reportedPct:calculatedPct;
            const validPct=Number.isFinite(pct);
            const level=validPct?(pct<10?"🔴":pct<=25?"🟠":"🟢"):"⚪";
            const barValue=validPct?Math.max(0,Math.min(100,pct)):0;
            return <div style={{marginTop:8,marginBottom:8}}>
              <div><b>📄 Papier :</b> {level} {b.printer.mediaRemaining}{capacity?` / ${capacity}`:""}{validPct?` — ${pct.toFixed(1).replace(".0","")} %`:""}</div>
              {validPct&&<div style={{height:10,background:"#e5e7eb",borderRadius:999,overflow:"hidden",marginTop:5}}>
                <div style={{height:"100%",width:`${barValue}%`,background:pct<10?"#dc2626":pct<=25?"#f59e0b":"#16a34a",transition:"width .25s ease"}}/>
              </div>}
              <div className="muted" style={{fontSize:12,marginTop:4}}>
                {b.printer.mediaFresh?"🟢 Lecture récente":"🟠 Dernière lecture connue"}
                {b.printer.mediaAgeSeconds!==null&&typeof b.printer.mediaAgeSeconds!=="undefined"?` · ${ago(b.printer.mediaAgeSeconds)}`:""}
              </div>
            </div>;
          })()}
          {b.printer?.mediaFormat&&<div>📐 Média : {b.printer.mediaFormat}</div>}
          {b.printer?.printCount&&<div>🔢 Compteur : {Number(b.printer.printCount).toLocaleString("fr-FR")}</div>}
          {b.printer?.serialNumber&&<div>🔢 S/N : {b.printer.serialNumber}</div>}
          {b.printer?.portName&&<div>🔌 {b.printer.portName}{b.printer.queueName?` · ${b.printer.queueName}`:""}</div>}
          <div>🕐 Dernière communication : {ago(b.ageSeconds)}</div>
        </div>
      </article>)}
    </div>
  </section>;
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

  useEffect(()=>{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(err=>console.warn("Service worker LP28 :",err));
    }
    const onBeforeInstall=e=>{e.preventDefault();setInstallPrompt(e)};
    const onInstalled=()=>{setInstallPrompt(null);setIsStandalone(true)};
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    return ()=>{
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  async function installLp28(){
    if(installPrompt){
      installPrompt.prompt();
      await installPrompt.userChoice.catch(()=>null);
      setInstallPrompt(null);
      return;
    }
    alert("Pour installer LP28 Suite : ouvre le menu de ton navigateur puis choisis ‘Installer l’application’ ou ‘Ajouter à l’écran d’accueil’. Sur iPhone/iPad : Partager → Sur l’écran d’accueil.");
  }

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

  const galleryState=g=>{
    const completed=g?.status==="COMPLETED"||g?.bookingStatus==="COMPLETED";
    if(completed)return "COMPLETED";
    if(g?.status==="IN_PROGRESS")return "IN_PROGRESS";
    return "UPCOMING";
  };
  const orderedGalleries=[...galleries].sort((a,b)=>{
    const rank={IN_PROGRESS:0,UPCOMING:1,COMPLETED:2};
    const sa=galleryState(a),sb=galleryState(b);
    if(rank[sa]!==rank[sb])return rank[sa]-rank[sb];
    const da=String(a.date||""),db=String(b.date||"");
    return sa==="COMPLETED"?db.localeCompare(da):da.localeCompare(db);
  });

  return <section className="admin-gallery">
    <div className="calendar-toolbar"><div><div className="eyebrow">ADMINISTRATEUR</div><h2>📸 Galeries</h2><p className="muted">En cours en premier, puis à venir du plus proche au plus lointain et prestations terminées de la plus récente à la plus ancienne.</p></div></div>
    <div className="gallery-list">
      {orderedGalleries.map(g=>{
        const state=galleryState(g);
        const inProgress=state==="IN_PROGRESS";
        const completed=state==="COMPLETED";
        return <button className="gallery-list-card" key={g.id} onClick={()=>openGallery(g.id)} style={inProgress?{background:"linear-gradient(135deg,rgba(120,72,18,.30),rgba(69,44,16,.24))",border:"1px solid rgba(245,158,11,.50)",boxShadow:"0 8px 22px rgba(120,72,18,.18)"}:completed?{background:"rgba(22,101,52,.10)",border:"1px solid rgba(34,197,94,.30)"}:undefined}>
          <div style={{minWidth:0}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <strong>{g.name}</strong>
              {inProgress&&<span style={{padding:"4px 8px",borderRadius:999,background:"#92400e",color:"#ffedd5",border:"1px solid #f59e0b",fontSize:11,fontWeight:900}}>🟠 EN COURS</span>}
              {completed&&<span style={{padding:"4px 8px",borderRadius:999,background:"#166534",color:"#dcfce7",border:"1px solid #22c55e",fontSize:11,fontWeight:900}}>✅ TERMINÉE</span>}
            </div>
            <small>{new Date(g.date+"T12:00:00").toLocaleDateString("fr-FR")}</small>
          </div>
          <div className="gallery-stats"><span>📷 {g.photos}</span><span>🎥 {g.videos}</span><span>🙈 {g.hidden}</span></div>
          <span className="gallery-open">Ouvrir →</span>
        </button>
      })}
      {!orderedGalleries.length&&<div className="empty-state"><span>📸</span><p>Aucune galerie active.</p></div>}
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

  const documentState=event=>{
    const completed=event?.status==="COMPLETED"||event?.bookingStatus==="COMPLETED";
    if(completed)return "COMPLETED";
    if(event?.status==="IN_PROGRESS")return "IN_PROGRESS";
    return "UPCOMING";
  };

  const filtered=[...events]
    .filter(event=>(
      `${event.name} ${event.organizerName||""} ${event.type||""}`
    ).toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      const rank={IN_PROGRESS:0,UPCOMING:1,COMPLETED:2};
      const sa=documentState(a),sb=documentState(b);
      if(rank[sa]!==rank[sb])return rank[sa]-rank[sb];
      const da=String(a.date||""),db=String(b.date||"");
      return sa==="COMPLETED"?db.localeCompare(da):da.localeCompare(db);
    });

  return (
    <section>
      <div className="calendar-toolbar">
        <div>
          <div className="eyebrow">DOSSIERS CLIENTS</div>
          <h2>📄 Documents</h2>
          <p className="muted">
            En cours en premier, puis à venir du plus proche au plus lointain et prestations terminées de la plus récente à la plus ancienne.
          </p>
        </div>
      </div>

      <div className="events-toolbar">
        <input
          placeholder="🔎 Rechercher un client ou événement..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        <span>{filtered.length} dossier(s)</span>
      </div>

      <div className="events-list">
        {filtered.map(event=>{
          const state=documentState(event);
          const inProgress=state==="IN_PROGRESS";
          const completed=state==="COMPLETED";
          return (
            <article
              className="event-card"
              key={event.id}
              style={inProgress?{
                background:"linear-gradient(135deg,rgba(120,72,18,.30),rgba(69,44,16,.24))",
                border:"1px solid rgba(245,158,11,.50)",
                boxShadow:"0 8px 22px rgba(120,72,18,.18)"
              }:completed?{
                background:"rgba(22,101,52,.10)",
                border:"1px solid rgba(34,197,94,.30)"
              }:undefined}
            >
              <div className="event-date">
                <strong>{event.date?.slice(8,10)||"--"}</strong>
                <span>
                  {event.date?new Date(event.date+"T12:00:00").toLocaleDateString("fr-FR",{month:"short"}):"--"}
                </span>
              </div>

              <div className="event-content">
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <strong>{event.name}</strong>
                  {inProgress&&<span style={{padding:"4px 8px",borderRadius:999,background:"#92400e",color:"#ffedd5",border:"1px solid #f59e0b",fontSize:11,fontWeight:900}}>🟠 EN COURS</span>}
                  {completed&&<span style={{padding:"4px 8px",borderRadius:999,background:"#166534",color:"#dcfce7",border:"1px solid #22c55e",fontSize:11,fontWeight:900}}>✅ TERMINÉE</span>}
                </div>

                <div className="event-meta">
                  {event.organizerName&&<span>👤 {event.organizerName}</span>}
                  <span>{event.type}</span>
                  {event.contractStatus==="SIGNED"&&<span>🟢 Contrat signé</span>}
                </div>

                <div className="event-actions">
                  <button onClick={()=>onOpen(event)}>📁 Gérer les documents</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EventConsultationModal({event,onClose,onEdit,onDocuments}) {
  if(!event) return null;

  const safeText = value => {
    if(value === null || value === undefined || value === "") return "";
    if(typeof value === "string" || typeof value === "number") return String(value);
    if(typeof value === "boolean") return value ? "Oui" : "Non";
    return "";
  };

  const dateFrSafe = value => {
    const raw=safeText(value);
    if(!raw) return "Non renseignée";
    const iso=raw.slice(0,10);
    const d=new Date(`${iso}T12:00:00`);
    if(Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("fr-FR",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });
  };

  const moneySafe = value => {
    const n=Number(value);
    return Number.isFinite(n)
      ? `${n.toFixed(2).replace(".",",")} €`
      : "Non renseigné";
  };

  const materialName = item => {
    if(typeof item === "string") return item;
    if(item && typeof item === "object"){
      return safeText(item.material?.name || item.name);
    }
    return "";
  };

  const materials=(Array.isArray(event.materials)?event.materials:[])
    .map(materialName)
    .filter(Boolean);

  const boothNames=[
    materials.includes("Borne Photobooth Miroir Lola") ? "LOLA" : "",
    materials.includes("Borne Photobooth Nina") ? "NINA" : "",
    materials.includes("Borne Photobooth Gabin") ? "GABIN" : ""
  ].filter(Boolean);

  let printLabel="Non renseigné";
  if(materials.includes("Forfait impressions personnalisé")){
    const count=Number(event.customPrintCount||0);
    printLabel=count>0 ? `${count} impressions` : "Forfait personnalisé";
  }else if(materials.includes("Forfait sans aucune impression")){
    printLabel="Sans impression";
  }else{
    const pack=materials.find(name=>/^Forfait \d+ impressions$/i.test(name));
    if(pack){
      const match=pack.match(/(\d+)/);
      printLabel=match ? `${match[1]} impressions` : pack;
    }
  }

  const excluded=new Set([
    "Borne Photobooth Miroir Lola",
    "Borne Photobooth Nina",
    "Borne Photobooth Gabin",
    "Forfait sans aucune impression",
    "Forfait 100 impressions",
    "Forfait 200 impressions",
    "Forfait 300 impressions",
    "Forfait 400 impressions",
    "Forfait 700 impressions",
    "Forfait impressions personnalisé"
  ]);
  const extraMaterials=materials.filter(name=>!excluded.has(name));

  const prep=event.preparation && typeof event.preparation==="object"
    ? event.preparation
    : {};

  let frameLabel="Pas de cadre";
  if(event.frameSource==="CLIENT"){
    frameLabel="Cadre fourni par le client · Gratuit";
  }else if(event.frameSource==="LP28"){
    if(prep.framePricing==="OFFERED"){
      frameLabel="Cadre LP28 · Offert";
    }else{
      const price=Number(prep.framePrice ?? 25);
      frameLabel=`Cadre LP28 · ${Number.isFinite(price)?price.toFixed(2).replace(".",","):"25,00"} €`;
    }
  }

  const frameStatus =
    event.frameSource==="NONE" || !event.frameSource
      ? "Non requis"
      : event.frameStatus==="DONE"
        ? "🟢 Terminé"
        : event.frameStatus==="IN_PROGRESS"
          ? "🟡 En cours"
          : "🔴 À faire";

  const contractSigned=event.contractStatus==="SIGNED";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="event-modal"
        style={{maxWidth:980}}
        onClick={e=>e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">CONSULTATION ÉVÉNEMENT</div>
            <h2>{safeText(event.name)||"Événement"}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",
          gap:12
        }}>
          <div className="card">
            <h3>📅 Prestation</h3>
            <p><strong>{safeText(event.type)||"Non renseigné"}</strong></p>
            {prep.gifted && (
              <p><span style={{display:"inline-block",padding:"5px 9px",borderRadius:999,background:"#6d28d9",color:"#fff",fontSize:12,fontWeight:900}}>🎁 DON / PRESTATION OFFERTE</span></p>
            )}
            <p>{dateFrSafe(event.date)}{event.time?` · Installation ${safeText(event.time)}`:""}</p>
            <p>📍 {safeText(event.address)||"Adresse non renseignée"}</p>
            {event.pickupDate && (
              <p>↩️ Reprise {dateFrSafe(event.pickupDate)}
                {event.pickupTime?` à ${safeText(event.pickupTime)}`:""}
              </p>
            )}
          </div>

          <div className="card">
            <h3>👤 Client / organisateur</h3>
            <p><strong>{safeText(event.organizerName)||"Non renseigné"}</strong></p>
            <p>📞 {safeText(event.organizerPhone)||"—"}</p>
            <p>✉️ {safeText(event.organizerEmail)||"—"}</p>
            <p>👥 {safeText(event.guestCount)||"0"} invité(s)</p>
          </div>

          <div className="card">
            <h3>🖥️ Matériel</h3>
            <p><strong>Borne :</strong> {boothNames.join(" + ")||"Aucune"}</p>
            <p><strong>Impressions :</strong> {printLabel}</p>
            {extraMaterials.length===0
              ? <p className="muted">Aucun matériel complémentaire.</p>
              : extraMaterials.map((name,i)=><p key={`${name}-${i}`}>• {name}</p>)}
          </div>

          <div className="card">
            <h3>🎨 Cadre photo</h3>
            <p><strong>{isAdmin?frameLabel:(event.frameSource==="LP28"?"Cadre LP28":"Cadre photo")}</strong></p>
            <p>Préparation : {frameStatus}</p>
          </div>

          {isAdmin
            ? <div className="card">
                <h3>💶 Tarification</h3>
                <p>Total : <strong>{moneySafe(event.totalPrice)}</strong></p>
                <p>Acompte : {moneySafe(event.deposit)}</p>
                <p>Reste : <strong>{moneySafe(event.balance)}</strong></p>
                <p>Cadre : {frameLabel}</p>
              </div>
            : event.canSeeOperationalBalance
              ? <div className="card">
                  <h3>💶 Règlement à récupérer</h3>
                  <p>Montant à récupérer : <strong>{moneySafe(event.operationalBalance)}</strong></p>
                  <p className="muted">Information autorisée par l’administrateur pour cette mission.</p>
                </div>
              : null}

          <div className="card">
            <h3>📑 Suivi</h3>
            {isAdmin&&<p>{prep.gifted?"🎁 Don / prestation offerte":"💼 Prestation facturée"}</p>}
            <p>{contractSigned?"🟢 Contrat signé":"🟠 Contrat non signé"}</p>
            <p>{event.googleCalendarEventId?"📅 Agenda ✓":"📅 Agenda —"}</p>
            <p>{event.googleDriveFolderId?"☁️ Drive ✓":"☁️ Drive —"}</p>
          </div>
        </div>

        {safeText(event.notes) && (
          <div className="card" style={{marginTop:12}}>
            <h3>📝 Notes</h3>
            <p style={{whiteSpace:"pre-wrap"}}>{safeText(event.notes)}</p>
          </div>
        )}

        <div className="event-actions" style={{marginTop:18}}>
          <button type="button" onClick={onClose}>← Retour aux événements</button>
          <button type="button" className="primary" onClick={()=>onEdit(event)}>✏️ Modifier</button>
          <button
            type="button"
            onClick={()=>window.open(`/api/events/${event.id}/contract.pdf`,"_blank","noopener,noreferrer")}
          >
            📄 Voir le contrat
          </button>
          <button type="button" onClick={()=>onDocuments(event)}>📁 Documents</button>
        </div>
      </div>
    </div>
  );
}

function playLp28NotificationSound(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    const ctx=new Ctx();
    const now=ctx.currentTime;
    [880,1174.66].forEach((freq,i)=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type="sine";osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.0001,now+i*.12);
      gain.gain.exponentialRampToValueAtTime(.12,now+i*.12+.02);
      gain.gain.exponentialRampToValueAtTime(.0001,now+i*.12+.20);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start(now+i*.12);osc.stop(now+i*.12+.22);
    });
    setTimeout(()=>ctx.close().catch(()=>{}),700);
  }catch{}
}
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=window.atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function enableLp28SystemPush(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))throw new Error("Les notifications Push ne sont pas prises en charge sur cet appareil.");
  const status=await fetch("/api/push/status").then(r=>r.json());
  if(!status.configured||!status.publicKey)throw new Error("Le serveur Push LP28 n'est pas encore configuré.");
  const permission=await Notification.requestPermission();
  if(permission!=="granted")throw new Error("Autorisation de notification refusée sur cet appareil.");
  const reg=await navigator.serviceWorker.register("/sw.js");await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(status.publicKey)});
  const deviceLabel=/Android/i.test(navigator.userAgent)?"Android LP28":"Appareil LP28";
  const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscription:sub.toJSON(),deviceLabel})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Impossible d'activer les notifications système.");
  return true;
}
function NotificationBell({onOpen}){
  const [count,setCount]=useState(0);
  const [toast,setToast]=useState(null);
  const seenRef=React.useRef(new Set());
  const initializedRef=React.useRef(false);
  function prefs(){
    try{
      return {
        sound:localStorage.getItem("lp28.notifications.sound")!=="false",
        popup:localStorage.getItem("lp28.notifications.popup")!=="false"
      };
    }catch{return {sound:true,popup:true};}
  }
  async function load(){
    try{
      const r=await fetch("/api/notifications");
      const d=await r.json();
      if(!d?.ok)return;
      const items=d.notifications||[];
      const unread=items.filter(n=>!n.read);
      setCount(unread.length);
      if(!initializedRef.current){
        unread.forEach(n=>seenRef.current.add(n.id));
        initializedRef.current=true;
        return;
      }
      const fresh=unread.filter(n=>!seenRef.current.has(n.id));
      unread.forEach(n=>seenRef.current.add(n.id));
      if(fresh.length){
        const n=fresh[0],p=prefs();
        if(p.popup){
          setToast(n);
          setTimeout(()=>setToast(t=>t?.id===n.id?null:t),6500);
        }
        if(p.sound)playLp28NotificationSound();
      }
    }catch{}
  }
  useEffect(()=>{load();const t=setInterval(load,10000);return()=>clearInterval(t)},[]);
  return <>
    <style>{`
      @keyframes lp28BellPulse{0%,100%{transform:rotate(0) scale(1)}25%{transform:rotate(-9deg) scale(1.08)}50%{transform:rotate(9deg) scale(1.08);box-shadow:0 0 20px rgba(214,185,79,.8)}75%{transform:rotate(-5deg) scale(1.04)}}
      @keyframes lp28ToastIn{from{opacity:0;transform:translateY(-14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      .lp28-notification-bell.unread{animation:lp28BellPulse 1.15s ease-in-out infinite;border-color:#d6b94f!important}
      .lp28-notification-toast{position:fixed;right:18px;top:74px;z-index:11000;width:min(390px,calc(100vw - 24px));padding:14px 16px;border-radius:15px;background:#111827;color:#f8fafc;border:1px solid #d6b94f;box-shadow:0 20px 55px rgba(0,0,0,.38);animation:lp28ToastIn .22s ease-out}
    `}</style>
    <button onClick={onOpen} className={`lp28-notification-bell ${count>0?"unread":""}`} style={{position:"relative",fontSize:"1.25rem",minWidth:46,height:46,borderRadius:14}} title="Notifications">
      🔔{count>0&&<span style={{position:"absolute",right:-5,top:-7,background:"#ef4444",color:"#fff",borderRadius:999,padding:"2px 6px",fontSize:11,fontWeight:900}}>{count>99?"99+":count}</span>}
    </button>
    {toast&&<div className="lp28-notification-toast" onClick={()=>{setToast(null);onOpen?.()}} role="status">
      <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
        <strong style={{color:"#fff"}}>{toast.title}</strong>
        <button onClick={e=>{e.stopPropagation();setToast(null)}} style={{background:"#fff",color:"#111827",minWidth:30,height:30}}>✕</button>
      </div>
      <div style={{marginTop:6,color:"#e5e7eb",lineHeight:1.45}}>{toast.message}</div>
      <small style={{display:"block",marginTop:8,color:"#94a3b8"}}>Cliquer pour ouvrir les notifications</small>
    </div>}
  </>;
}
function Dashboard({onLogout,user}) {
  const [view,setView]=useState("dashboard");
  const [planningRefresh,setPlanningRefresh]=useState(0);
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const [notificationOpen,setNotificationOpen]=useState(false),[notificationItems,setNotificationItems]=useState([]);
  async function openNotifications(){try{const r=await fetch("/api/notifications");const d=await r.json();if(d?.ok)setNotificationItems(d.notifications||[])}catch{}setNotificationOpen(true)}
  async function readNotification(n){if(!n.read)await fetch(`/api/notifications/${n.id}/read`,{method:"POST"});setNotificationItems(v=>v.map(x=>x.id===n.id?{...x,read:true}:x));if(n.eventId){setSelectedEventId(n.eventId);setView("events");setNotificationOpen(false)}}
  async function deleteNotification(id){await fetch(`/api/notifications/${id}`,{method:"DELETE"});setNotificationItems(v=>v.filter(x=>x.id!==id));}
  async function deleteAllNotifications(){if(!notificationItems.length)return;if(!confirm("Supprimer toutes tes notifications de la liste ?"))return;const r=await fetch("/api/notifications",{method:"DELETE"});if(r.ok)setNotificationItems([]);}
  async function readAllNotifications(){const r=await fetch("/api/notifications/read-all",{method:"POST"});if(r.ok)setNotificationItems(v=>v.map(x=>({...x,read:true})));}
  const [installPrompt,setInstallPrompt]=useState(null);
  const [isStandalone,setIsStandalone]=useState(()=>window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone===true);
  const [events,setEvents]=useState([]);
  const [stats,setStats]=useState({events:0,inProgress:0,upcoming:0,unsignedUpcomingContracts:0,signedContracts:0,activeGalleries:0});
  const [formEvent,setFormEvent]=useState(undefined);
  const [showForm,setShowForm]=useState(false);
  const [shareEvent,setShareEvent]=useState(null);
  const [documentEvent,setDocumentEvent]=useState(null);
  const [viewEvent,setViewEvent]=useState(null);
  const [search,setSearch]=useState("");
  const [showWeeklyBilledAmount,setShowWeeklyBilledAmount]=useState(true);
  const [showWeeklyGiftAmount,setShowWeeklyGiftAmount]=useState(true);
  const isAdmin=user?.role==="ADMIN";

  const NAV_DEFAULT=[
    {id:"dashboard",label:"Tableau de bord",icon:"🏠",locked:true},
    {id:"events",label:"Événements",icon:"📅",locked:true},
    {id:"planning",label:"Planning",icon:"🗓️",locked:true},
    {id:"materialPlanning",label:"Planning matériel",icon:"📦",locked:true},
    {id:"inventory",label:"Inventaire admin",icon:"🔐",locked:true},
    {id:"longPlanning",label:"Planning 24 mois",icon:"🗓️",locked:true},
    {id:"documents",label:"Documents",icon:"📄",locked:true},
    {id:"galleries",label:"Galeries",icon:"📸",locked:true},
    {id:"booths",label:"Mes bornes",icon:"🖥️",locked:false},
    {id:"collaborators",label:"Collaborateurs",icon:"👷",locked:false},
    {id:"google",label:"Google",icon:"☁️",locked:false},
    {id:"assistance",label:"Assistance",icon:"🆘",locked:true},
    {id:"settings",label:"Paramètres",icon:"⚙️",locked:true}
  ];
  const normalizeNavPrefs=input=>{
    const byId=new Map((Array.isArray(input)?input:[]).map(x=>[x.id,x]));
    return NAV_DEFAULT.map((m,i)=>({...m,visible:m.locked?true:(byId.get(m.id)?.visible!==false),order:Number.isFinite(Number(byId.get(m.id)?.order))?Number(byId.get(m.id).order):i}))
      .sort((a,b)=>a.order-b.order).map((m,i)=>({...m,order:i}));
  };
  const readLocalNavPrefs=()=>{try{return normalizeNavPrefs(JSON.parse(localStorage.getItem("lp28.modulePrefs")||"[]"));}catch{return normalizeNavPrefs([]);}};
  const [navModules,setNavModules]=useState(readLocalNavPrefs);
  useEffect(()=>{
    fetch("/api/account/module-preferences").then(r=>r.json()).then(d=>{
      if(d?.ok&&Array.isArray(d.modules)){const next=normalizeNavPrefs(d.modules);setNavModules(next);localStorage.setItem("lp28.modulePrefs",JSON.stringify(next));}
    }).catch(()=>{});
    const sync=e=>setNavModules(e?.detail?normalizeNavPrefs(e.detail):readLocalNavPrefs());
    window.addEventListener("lp28-module-prefs-changed",sync);window.addEventListener("storage",sync);
    return()=>{window.removeEventListener("lp28-module-prefs-changed",sync);window.removeEventListener("storage",sync);};
  },[]);


  async function load(){
    const [e,d]=await Promise.all([
      fetch("/api/events").then(r=>r.json()),
      fetch("/api/dashboard").then(r=>r.json())
    ]);
    setEvents(e.events||[]);
    setStats(d.stats||{events:0,inProgress:0,upcoming:0,unsignedUpcomingContracts:0,signedContracts:0,activeGalleries:0});
  }

  useEffect(()=>{load()},[]);

  useEffect(()=>{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(err=>console.warn("Service worker LP28 :",err));
    }
    const onBeforeInstall=e=>{e.preventDefault();setInstallPrompt(e)};
    const onInstalled=()=>{setInstallPrompt(null);setIsStandalone(true)};
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    return ()=>{
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  async function installLp28(){
    if(installPrompt){
      installPrompt.prompt();
      await installPrompt.userChoice.catch(()=>null);
      setInstallPrompt(null);
      return;
    }
    alert("Pour installer LP28 Suite : ouvre le menu de ton navigateur puis choisis ‘Installer l’application’ ou ‘Ajouter à l’écran d’accueil’. Sur iPhone/iPad : Partager → Sur l’écran d’accueil.");
  }

  async function startEvent(event){
    if(!confirm(`Démarrer maintenant la prestation "${event.name}" ?\n\nElle restera dans « En cours » jusqu'à ce que tu la marques terminée.`)) return;
    const r=await fetch(`/api/events/${event.id}/start`,{method:"PATCH"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) return alert(d.message||"Impossible de démarrer la prestation.");
    setEventTab("inProgress");
    await load();
  }

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
    const ok=confirm(
      `⚠️ SUPPRESSION DÉFINITIVE\n\n` +
      `Supprimer la prestation "${event.name}" ?\n\n` +
      `Elle disparaîtra des événements, du calendrier, des plannings, des documents et des compteurs LP28.\n` +
      `L'événement Google Agenda sera supprimé s'il existe.\n` +
      `Le dossier Google Drive et les photos sont conservés par sécurité.\n\n` +
      `Cette action est irréversible dans LP28.`
    );
    if(!ok)return;

    const r=await fetch(`/api/events/${event.id}`,{method:"DELETE"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return alert(d.message||"Impossible de supprimer la prestation.");
    await load();
  }

  async function archive(event){
    await fetch(`/api/events/${event.id}/archive`,{method:"POST"});
    load();
  }

  function saved(){setShowForm(false);setFormEvent(undefined);load();}

  const weeklyDashboard=useMemo(()=>{
    const now=new Date();
    const monday=new Date(now);
    const day=(monday.getDay()+6)%7;
    monday.setHours(0,0,0,0);
    monday.setDate(monday.getDate()-day);

    const sunday=new Date(monday);
    sunday.setDate(sunday.getDate()+6);
    sunday.setHours(23,59,59,999);

    const weekEvents=(events||[]).filter(event=>{
      if(event?.archived)return false;
      const booking=String(event?.bookingStatus||"").toUpperCase();
      if(booking==="CANCELLED"||booking==="DECLINED")return false;
      const match=String(event?.date||"").match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(!match)return false;
      const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0,0);
      return date>=monday&&date<=sunday;
    });

    const billedEvents=isAdmin
      ? weekEvents.filter(event=>!event?.preparation?.gifted)
      : weekEvents.filter(event=>event?.canSeeOperationalBalance===true);
    const giftedEvents=isAdmin?weekEvents.filter(event=>!!event?.preparation?.gifted):[];
    const sumTotal=items=>items.reduce((total,event)=>total+Math.max(Number(event?.totalPrice||0),0),0);
    const remainingForEvent=event=>{
      if(!isAdmin){
        const operational=Number(event?.operationalBalance);
        return Number.isFinite(operational)?Math.max(operational,0):0;
      }
      const balance=Number(event?.balance);
      if(Number.isFinite(balance))return Math.max(balance,0);
      const total=Math.max(Number(event?.totalPrice||0),0);
      const deposit=Math.max(Number(event?.deposit||0),0);
      return Math.max(total-deposit,0);
    };
    const sumRemaining=items=>items.reduce((total,event)=>total+remainingForEvent(event),0);

    return {
      count:weekEvents.length,
      billedCount:billedEvents.length,
      giftCount:giftedEvents.length,
      billedAmount:sumRemaining(billedEvents),
      giftAmount:sumTotal(giftedEvents)
    };
  },[events,isAdmin]);

  const dashboardMoney=value=>Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";

  const [eventTab,setEventTab]=useState("upcoming");

  const eventTabCounts=useMemo(()=>{
    const isCompleted=e=>e?.status==="COMPLETED"||e?.bookingStatus==="COMPLETED";
    const isInProgress=e=>e?.status==="IN_PROGRESS"&&!isCompleted(e);
    return {
      upcoming:events.filter(e=>!e.archived&&!isCompleted(e)&&!isInProgress(e)).length,
      inProgress:events.filter(e=>!e.archived&&isInProgress(e)).length,
      completed:events.filter(e=>!e.archived&&isCompleted(e)).length,
      archived:events.filter(e=>e.archived).length
    };
  },[events]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const isCompleted=e=>e?.status==="COMPLETED"||e?.bookingStatus==="COMPLETED";
    const isInProgress=e=>e?.status==="IN_PROGRESS"&&!isCompleted(e);

    return events
      .filter(e=>{
        if(eventTab==="inProgress")return !e.archived&&isInProgress(e);
        if(eventTab==="completed")return !e.archived&&isCompleted(e);
        if(eventTab==="archived")return !!e.archived;
        return !e.archived&&!isCompleted(e)&&!isInProgress(e);
      })
      .filter(e=>(`${e.name||""} ${e.organizerName||""} ${e.type||""}`).toLowerCase().includes(q))
      .sort((a,b)=>{
        const da=String(a.date||"");
        const db=String(b.date||"");
        if(eventTab==="upcoming"||eventTab==="inProgress")return da.localeCompare(db);
        return db.localeCompare(da);
      });
  },[events,search,eventTab]);

  function eventBooths(event){
    const materials=event.materials||[];
    const booths=[];
    if(materials.includes("Borne Photobooth Miroir Lola"))booths.push("LOLA");
    if(materials.includes("Borne Photobooth Nina"))booths.push("NINA");
    if(materials.includes("Borne Photobooth Gabin"))booths.push("GABIN");
    return booths;
  }

  function eventPrintChoice(event){
    const materials=event.materials||[];
    if(materials.includes("Forfait impressions personnalisé")){
      const n=Number(event.customPrintCount||0);
      return n>0?`${n} impressions`:"Personnalisé";
    }
    const pack=materials.find(x=>/^Forfait \d+ impressions$/i.test(String(x)));
    if(pack){
      const m=String(pack).match(/(\d+)/);
      return m?`${m[1]} impressions`:pack;
    }
    if(materials.includes("Forfait sans aucune impression"))return "Sans impression";
    return "Non renseigné";
  }

  function eventExtraMaterials(event){
    const excluded=new Set([
      "Borne Photobooth Miroir Lola",
      "Borne Photobooth Nina",
      "Borne Photobooth Gabin",
      "Forfait sans aucune impression",
      "Forfait 100 impressions",
      "Forfait 200 impressions",
      "Forfait 300 impressions",
      "Forfait 400 impressions",
      "Forfait 700 impressions",
      "Forfait impressions personnalisé"
    ]);
    return (event.materials||[]).filter(x=>!excluded.has(x));
  }

  function materialShortLabel(name){
    const item=MATERIALS.find(m=>m.name===name);
    let label=String(name||"")
      .replace(/^Location\s+/i,"")
      .replace(/^Borne Photobooth\s+/i,"")
      .replace(/Location /i,"");
    if(label.length>34)label=label.slice(0,31)+"…";
    return `${item?.icon||"📦"} ${label}`;
  }

  const currentViewTitle = view==="events"?"Mes événements":view==="planning"?"Planning":view==="materialPlanning"?"Planning matériel":view==="inventory"?"Inventaire admin":view==="longPlanning"?"Planning 24 mois":view==="documents"?"Documents":view==="galleries"?"Galeries":view==="booths"?"Mes bornes":view==="assistance"?"Assistance":view==="collaborators"?"Collaborateurs":view==="google"?"Google":view==="settings"?"Paramètres":"Tableau de bord";

  const navigate = nextView => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  return <><LP28ThemeStyles/><div className={`app-shell ${mobileMenuOpen?"mobile-nav-open":""} role-${String(user?.role||"viewer").toLowerCase()}`}>
    <div style={{position:"fixed",right:18,top:16,zIndex:10020}}><NotificationBell onOpen={openNotifications}/></div>
    {notificationOpen&&<div style={{position:"fixed",right:18,top:72,zIndex:10050,width:"min(480px,calc(100vw - 24px))",maxHeight:"72vh",overflow:"auto",background:"#111827",color:"#f8fafc",border:"1px solid #d6b94f",borderRadius:16,padding:14,boxShadow:"0 20px 60px rgba(0,0,0,.35)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong style={{color:"#f8fafc"}}>🔔 Notifications</strong><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{notificationItems.some(n=>!n.read)&&<button onClick={readAllNotifications} style={{background:"#334155",color:"#fff"}}>✓ Tout lire</button>}{notificationItems.length>0&&<button onClick={deleteAllNotifications} style={{background:"#7f1d1d",color:"#fff"}}>🗑️ Tout supprimer</button>}<button onClick={()=>setNotificationOpen(false)} style={{background:"#fff",color:"#111827",minWidth:34,height:34}}>✕</button></div></div>{notificationItems.length===0&&<p style={{color:"#cbd5e1"}}>Aucune notification.</p>}{notificationItems.map(n=><div key={n.id} style={{padding:12,border:`1px solid ${n.read?"rgba(255,255,255,.16)":"#d6b94f"}`,background:n.read?"rgba(255,255,255,.03)":"rgba(214,185,79,.08)",borderRadius:12,marginTop:9,color:"#f8fafc"}}><div onClick={()=>readNotification(n)} style={{cursor:"pointer"}}><strong style={{display:"block",color:"#f8fafc"}}>{n.title}</strong><div style={{marginTop:5,color:"#e5e7eb",lineHeight:1.45}}>{n.message}</div><small style={{display:"block",marginTop:7,color:"#94a3b8"}}>{new Date(n.createdAt).toLocaleString("fr-FR")}{n.eventId?" · Ouvrir l’événement":""}</small></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><button onClick={()=>deleteNotification(n.id)} style={{background:"#3f1d1d",color:"#fecaca",padding:"7px 10px",minHeight:34}}>🗑️ Supprimer</button></div></div>)}</div>}
    <style>{`
      .lp28-mobile-topbar,.lp28-mobile-backdrop{display:none;}
      @media (max-width:1024px){
        .app-shell{display:block !important;min-height:100vh;}
        .app-shell .content{width:100% !important;max-width:none !important;margin-left:0 !important;padding-top:86px !important;}
        .app-shell .sidebar{position:fixed !important;left:0;top:0;bottom:0;width:min(90vw,380px) !important;max-width:380px;z-index:1202;transform:translateX(-105%);transition:transform .22s ease;box-shadow:18px 0 45px rgba(0,0,0,.42);overflow:hidden;display:flex !important;flex-direction:column;}
        .app-shell .sidebar nav{overflow-y:auto;overflow-x:hidden;flex:1 1 auto;min-height:0;padding-bottom:18px;-webkit-overflow-scrolling:touch;}
        .app-shell .sidebar .sidebar-footer{flex:0 0 auto;}
        .app-shell .sidebar.mobile-open{transform:translateX(0);}
        .lp28-mobile-topbar{display:flex;position:fixed;left:0;right:0;top:0;height:76px;z-index:1200;align-items:center;gap:12px;padding:8px 12px;background:rgba(10,10,12,.96);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.10);}
        .lp28-mobile-menu-btn{min-width:142px;height:58px;display:flex;align-items:center;justify-content:center;gap:11px;flex:0 0 auto;padding:0 20px;border:2px solid rgba(214,185,79,.72);border-radius:16px;background:linear-gradient(135deg,rgba(214,185,79,.24),rgba(21,21,25,.98));color:#fff;font-size:18px;font-weight:900;line-height:1;cursor:pointer;box-shadow:0 7px 20px rgba(0,0,0,.25);}
        .lp28-mobile-menu-btn .menu-bars{font-size:30px;line-height:1;}
        .lp28-mobile-menu-btn .menu-label{letter-spacing:.04em;}
        .lp28-mobile-title{min-width:0;display:flex;flex-direction:column;line-height:1.12;}
        .lp28-mobile-title strong{font-size:.96rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .lp28-mobile-title span{margin-top:3px;font-size:.69rem;font-weight:800;letter-spacing:.08em;color:#d6b94f;text-transform:uppercase;}
        .lp28-install-btn{margin-left:auto;min-height:42px;padding:0 12px;border-radius:12px;border:1px solid rgba(214,185,79,.55);background:rgba(214,185,79,.12);color:#fff;font-weight:900;white-space:nowrap;}
        .lp28-mobile-backdrop{position:fixed;inset:0;z-index:1201;background:rgba(0,0,0,.58);border:0;padding:0;margin:0;}
        .mobile-nav-open .lp28-mobile-backdrop{display:block;}
        .app-shell .sidebar .nav-item{min-height:52px;font-size:1rem;}
        .trusted-owner-block{margin-top:18px;padding:14px;border:1px solid rgba(214,185,79,.24);border-radius:14px;background:rgba(255,255,255,.02);}
        .trusted-owner-block h3{margin:0 0 10px;}
        .trusted-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .trusted-table{width:100%;border-collapse:collapse;min-width:650px;}
        .trusted-table th,.trusted-table td{text-align:left;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.09);vertical-align:middle;}
        .trusted-table th{color:#d6b94f;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em;}
        .trusted-table td:last-child,.trusted-table th:last-child{text-align:right;}
        .trusted-table button{min-height:42px;padding:8px 14px;}
        .settings-tabs{display:flex;overflow-x:auto;margin:0 0 16px;border-bottom:1px solid rgba(214,185,79,.28);scrollbar-width:thin;}
        .settings-tabs button{min-width:170px;padding:13px 18px;border:1px solid rgba(255,255,255,.09);border-bottom:0;border-radius:0;background:#151518;color:#ddd;font-weight:800;white-space:nowrap;}
        .settings-tabs button.active{color:#f1d45b;background:rgba(214,185,79,.09);box-shadow:inset 0 -2px 0 #d6b94f;}
        .module-order-help{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:14px;}
        .module-order-legend{display:flex;gap:18px;flex-wrap:wrap;white-space:nowrap;}
        .module-order-panel{padding:8px 14px;}
        .module-order-head,.module-order-row{display:grid;grid-template-columns:110px minmax(240px,1fr) 120px 120px;gap:12px;align-items:center;}
        .module-order-head{padding:10px 8px;color:#d6b94f;font-weight:900;border-bottom:1px solid rgba(214,185,79,.25);}
        .module-order-row{padding:10px 8px;border-bottom:1px solid rgba(214,185,79,.16);cursor:grab;}
        .module-order-row:hover{background:rgba(214,185,79,.035);}
        .module-order-row:active{cursor:grabbing;}
        .module-drag{display:flex;gap:10px;align-items:center;}
        .module-drag b{display:inline-flex;min-width:30px;height:30px;align-items:center;justify-content:center;border-radius:7px;background:#c5a62d;color:#090909;}
        .module-name{font-weight:800;}
        .module-switch{position:relative;display:inline-block;width:48px;height:26px;}
        .module-switch input{opacity:0;width:0;height:0;}
        .module-switch span{position:absolute;inset:0;background:#444;border-radius:20px;cursor:pointer;}
        .module-switch span:before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.18s;}
        .module-switch input:checked + span{background:#d6b94f;}
        .module-switch input:checked + span:before{transform:translateX(22px);}
        .module-order-actions{display:flex;justify-content:space-between;gap:12px;margin-top:14px;flex-wrap:wrap;}
        @media (max-width:760px){
          .module-order-help{align-items:flex-start;flex-direction:column;}
          .module-order-head{display:none;}
          .module-order-row{grid-template-columns:82px minmax(150px,1fr) 64px;gap:8px;}
          .module-order-row>span:last-child{display:none;}
          .settings-tabs button{min-width:155px;}
        }
      }
      @media (min-width:1025px){
        .app-shell .sidebar{transform:none !important;}
      }

      /* v8.5.65 — consultation Lydie : mobile/tablette plus compacte */
      @media (max-width:1100px){
        .role-viewer .events-list .event-card{
          grid-template-columns:180px minmax(0,1fr) !important;
          gap:10px !important;
          padding:10px !important;
        }
        .role-viewer .events-list .event-card .event-date{
          padding:8px 10px !important;
          min-height:74px !important;
        }
        .role-viewer .events-list .event-card .event-content{
          min-width:0 !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"]{
          gap:8px !important;
          margin:10px 0 8px !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div{
          min-width:0 !important;
          max-width:none !important;
          padding:10px 12px !important;
          border-radius:13px !important;
          gap:10px !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div > span{
          font-size:24px !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div div[style*="font-size:28px"]{
          font-size:20px !important;
        }
        .role-viewer .event-meta{gap:6px !important;font-size:.84rem !important;}
        .role-viewer .event-actions{gap:7px !important;}
        .role-viewer .event-actions button{min-height:38px !important;padding:7px 10px !important;font-size:.83rem !important;}
      }

      @media (max-width:760px){
        .role-viewer .app-shell .content{padding-left:10px !important;padding-right:10px !important;}
        .role-viewer .events-toolbar{gap:8px !important;}
        .role-viewer .events-list .event-card{
          display:block !important;
          grid-template-columns:1fr !important;
          padding:9px !important;
          border-radius:14px !important;
          overflow:hidden !important;
        }
        .role-viewer .events-list .event-card .event-date{
          width:100% !important;
          min-height:0 !important;
          margin:0 0 8px !important;
          padding:8px 10px !important;
          border-radius:10px !important;
          display:flex !important;
          flex-direction:row !important;
          align-items:center !important;
          justify-content:space-between !important;
          gap:8px !important;
        }
        .role-viewer .events-list .event-card .event-date strong,
        .role-viewer .events-list .event-card .event-date span{
          font-size:.82rem !important;
          white-space:normal !important;
        }
        .role-viewer .events-list .event-card .event-content > div:first-child{
          gap:6px !important;
        }
        .role-viewer .events-list .event-card .event-content > div:first-child button{
          font-size:1rem !important;
          line-height:1.2 !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"]{
          display:grid !important;
          grid-template-columns:1fr 1fr !important;
          gap:7px !important;
          margin:8px 0 !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div{
          padding:9px !important;
          border-radius:11px !important;
          gap:7px !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div > span{
          font-size:20px !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div div[style*="font-size:12px"]{
          font-size:9px !important;
          line-height:1.15 !important;
        }
        .role-viewer .events-list .event-card .event-content > div[style*="margin:14px 0 10px"] > div div[style*="font-size:28px"]{
          font-size:16px !important;
          line-height:1.15 !important;
        }
        .role-viewer .event-meta{
          display:grid !important;
          grid-template-columns:1fr !important;
          gap:4px !important;
          margin-top:8px !important;
          font-size:.78rem !important;
        }
        .role-viewer .event-actions{
          display:grid !important;
          grid-template-columns:1fr 1fr !important;
          gap:6px !important;
          margin-top:9px !important;
        }
        .role-viewer .event-actions button{
          width:100% !important;
          min-width:0 !important;
          min-height:38px !important;
          padding:7px 8px !important;
          font-size:.76rem !important;
        }
      }
    `}</style>

    <div className="lp28-mobile-topbar">
      <button type="button" className="lp28-mobile-menu-btn" aria-label="Ouvrir le menu" aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(v=>!v)}><span className="menu-bars">☰</span><span className="menu-label">MENU</span></button>
      <div className="lp28-mobile-title"><strong>Bonjour {user?.firstName||user?.name?.split(" ")?.[0]||""} 👋</strong><span>LP28 Suite</span></div>
      {!isStandalone && <button type="button" className="lp28-install-btn" onClick={installLp28}>📲 Installer</button>}
    </div>
    <button type="button" className="lp28-mobile-backdrop" aria-label="Fermer le menu" onClick={()=>setMobileMenuOpen(false)} />
    <aside className={`sidebar ${mobileMenuOpen?"mobile-open":""}`}>
      <div className="brand"><img src="/logo.jpg"/><div><strong>LP28 Suite</strong><span>Version 8.5.65</span></div></div>
      <nav>
        {navModules.filter(m=>{
          if(m.visible===false)return false;
          if(isAdmin)return true;
          if(m.id==="settings")return true;
          const allowed=Array.isArray(user?.permissions?.allowedModules)?user.permissions.allowedModules:(user?.role==="INTERVENANT"?["dashboard","events","planning","materialPlanning"]:["dashboard","planning"]);
          return allowed.includes(m.id);
        }).map(m=><button key={m.id} className={`nav-item ${view===m.id?"active":""}`} onClick={()=>navigate(m.id)}>{m.icon} {m.label}</button>)}
      </nav>
      <div className="sidebar-footer"><a href={SITE} target="_blank">www.locationphotobooth28.fr</a><button className="logout" onClick={onLogout}>Déconnexion</button></div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div><div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div><h1>{currentViewTitle}</h1><p className="muted">Simple, rapide, efficace.</p></div>
        {isAdmin&&<button className="primary" onClick={()=>{setFormEvent(undefined);setShowForm(true)}}>＋ Nouvel événement</button>}
      </header>

      {view==="dashboard" ? <>
        <section className="stats-grid">
          <article className="stat-card"><span>Événements</span><strong>{stats.events}</strong></article>
          <article className="stat-card" style={{border:"1px solid rgba(245,158,11,.45)",background:"linear-gradient(135deg,rgba(120,72,18,.32),rgba(69,44,16,.24))"}}>
            <span>🟠 Événements en cours</span>
            <strong>{stats.inProgress||0}</strong>
            <small className="muted">Jusqu'à « Prestation terminée »</small>
          </article>
          <article className="stat-card">
            <span>Événements à venir</span>
            <strong>{stats.upcoming}</strong>
            <small className="muted">Aujourd'hui → dimanche 23h59</small>
            {Number(stats.unsignedUpcomingContracts||0)>0
              ? <div style={{marginTop:8,color:"#f59e0b",fontWeight:900}}>⚠️ {stats.unsignedUpcomingContracts} contrat{Number(stats.unsignedUpcomingContracts)>1?"s":""} non signé{Number(stats.unsignedUpcomingContracts)>1?"s":""}</div>
              : <div style={{marginTop:8,color:"#16a34a",fontWeight:800}}>✅ Contrats à jour</div>}
          </article>
          <article className="stat-card"><span>Galeries actives</span><strong>{stats.activeGalleries}</strong></article>
          <article className="stat-card"><span>Contrats signés</span><strong>{stats.signedContracts}</strong></article>

          <article className="stat-card" style={{border:"1px solid rgba(59,130,246,.55)",background:"linear-gradient(135deg,rgba(37,99,235,.15),rgba(15,23,42,.32))"}}>
            <span>🗓️ Événements cette semaine</span>
            <strong style={{color:"#60a5fa"}}>{weeklyDashboard.count}</strong>
            <small className="muted">Du lundi au dimanche</small>
          </article>

          {(isAdmin||user?.role==="INTERVENANT")&&<>
          <article className="stat-card" style={{position:"relative",border:"1px solid rgba(168,85,247,.58)",background:"linear-gradient(135deg,rgba(126,34,206,.16),rgba(31,20,43,.32))"}}>
            <button type="button" aria-label={showWeeklyBilledAmount?"Masquer le montant facturé":"Afficher le montant facturé"} title={showWeeklyBilledAmount?"Masquer le montant":"Afficher le montant"} onClick={()=>setShowWeeklyBilledAmount(v=>!v)} style={{position:"absolute",right:14,top:12,border:0,background:"transparent",color:"#fff",fontSize:22,cursor:"pointer",padding:4}}>👁️</button>
            <span>{isAdmin?"💶 Reste à encaisser cette semaine":"💶 Règlement à récupérer cette semaine"}</span>
            <strong style={{color:"#c084fc",fontSize:"clamp(1.65rem,3vw,2.35rem)",paddingRight:42}}>{showWeeklyBilledAmount?dashboardMoney(weeklyDashboard.billedAmount):"****.** €"}</strong>
            <small className="muted">{isAdmin?`${weeklyDashboard.billedCount} prestation${weeklyDashboard.billedCount>1?"s":""} · après déduction des règlements reçus`:`${weeklyDashboard.billedCount} mission${weeklyDashboard.billedCount>1?"s":""} avec règlement autorisé`}</small>
          </article>

          </>}
          {isAdmin&&<>
          <article className="stat-card" style={{position:"relative",border:"1px solid rgba(34,197,94,.55)",background:"linear-gradient(135deg,rgba(22,101,52,.18),rgba(13,36,25,.34))"}}>
            <button type="button" aria-label={showWeeklyGiftAmount?"Masquer le montant des dons":"Afficher le montant des dons"} title={showWeeklyGiftAmount?"Masquer le montant":"Afficher le montant"} onClick={()=>setShowWeeklyGiftAmount(v=>!v)} style={{position:"absolute",right:14,top:12,border:0,background:"transparent",color:"#fff",fontSize:22,cursor:"pointer",padding:4}}>👁️</button>
            <span>🎁 Don / prestation offerte</span>
            <strong style={{color:"#4ade80",fontSize:"clamp(1.65rem,3vw,2.35rem)",paddingRight:42}}>{showWeeklyGiftAmount?dashboardMoney(weeklyDashboard.giftAmount):"****.** €"}</strong>
            <small className="muted">{weeklyDashboard.giftCount} prestation{weeklyDashboard.giftCount>1?"s":""} offerte{weeklyDashboard.giftCount>1?"s":""}</small>
          </article>          </>}
        </section>
        <section className="panel dashboard-panel"><div><div className="panel-kicker">GESTION DES ÉVÉNEMENTS</div><h2>Prépare tes prestations en quelques clics</h2><p>Crée un événement, sélectionne le matériel réservé et récupère immédiatement les liens organisateur et invités ainsi que le QR Code.</p><button className="primary" onClick={()=>setView("events")}>Voir mes événements</button></div><img src="/logo.jpg"/></section>
      </> : view==="events" ? <>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
          <button
            onClick={()=>setEventTab("upcoming")}
            style={{border:`1px solid ${eventTab==="upcoming"?"#f4c542":"rgba(244,197,66,.55)"}`,background:eventTab==="upcoming"?"#d4ad2d":"rgba(244,197,66,.10)",color:eventTab==="upcoming"?"#111827":"#f8e6a0",fontWeight:900,boxShadow:eventTab==="upcoming"?"0 6px 18px rgba(212,173,45,.18)":"none"}}
          >📅 À venir <strong style={{marginLeft:6}}>{eventTabCounts.upcoming}</strong></button>
          <button
            onClick={()=>setEventTab("inProgress")}
            style={{border:`1px solid ${eventTab==="inProgress"?"#f59e0b":"rgba(245,158,11,.55)"}`,background:eventTab==="inProgress"?"#92400e":"rgba(146,64,14,.20)",color:eventTab==="inProgress"?"#fff7ed":"#fdba74",fontWeight:900,boxShadow:eventTab==="inProgress"?"0 6px 18px rgba(245,158,11,.18)":"none"}}
          >🟠 En cours <strong style={{marginLeft:6}}>{eventTabCounts.inProgress}</strong></button>
          <button
            onClick={()=>setEventTab("completed")}
            style={{border:`1px solid ${eventTab==="completed"?"#22c55e":"rgba(34,197,94,.55)"}`,background:eventTab==="completed"?"#166534":"rgba(34,197,94,.10)",color:eventTab==="completed"?"#ffffff":"#86efac",fontWeight:900,boxShadow:eventTab==="completed"?"0 6px 18px rgba(34,197,94,.18)":"none"}}
          >✅ Prestations terminées <strong style={{marginLeft:6}}>{eventTabCounts.completed}</strong></button>
          <button
            onClick={()=>setEventTab("archived")}
            style={{border:`1px solid ${eventTab==="archived"?"#cbd5e1":"rgba(203,213,225,.48)"}`,background:eventTab==="archived"?"#475569":"rgba(148,163,184,.10)",color:eventTab==="archived"?"#ffffff":"#e2e8f0",fontWeight:900,boxShadow:eventTab==="archived"?"0 6px 18px rgba(148,163,184,.16)":"none"}}
          >📦 Archivées <strong style={{marginLeft:6}}>{eventTabCounts.archived}</strong></button>
        </div>
        <div className="events-toolbar"><input placeholder="🔎 Rechercher un événement..." value={search} onChange={e=>setSearch(e.target.value)}/><span>{filtered.length} événement(s)</span></div>
        <div className="events-list">
          {filtered.length===0 && <div className="empty-state"><span>{eventTab==="inProgress"?"🟠":eventTab==="completed"?"✅":eventTab==="archived"?"📦":"📅"}</span><h2>{eventTab==="inProgress"?"Aucun événement en cours":eventTab==="completed"?"Aucune prestation terminée":eventTab==="archived"?"Aucune prestation archivée":"Aucune prestation à venir"}</h2><p>{eventTab==="upcoming"?"Les prochaines prestations apparaîtront ici.":eventTab==="inProgress"?"Clique sur « Début événement » depuis l'onglet À venir pour démarrer une prestation.":"Aucun dossier dans cet onglet."}</p></div>}
          {filtered.map(event=>{
            const isGifted=!!event.preparation?.gifted;
            const giftedStyle=isGifted?{
              background:"linear-gradient(135deg,rgba(88,28,135,.34),rgba(76,29,149,.24))",
              border:"1px solid rgba(192,132,252,.58)",
              boxShadow:"0 10px 28px rgba(126,34,206,.20)"
            }:{};
            const inProgressStyle=!isGifted&&event.status==="IN_PROGRESS"?{
              background:"linear-gradient(135deg,rgba(120,72,18,.30),rgba(69,44,16,.24))",
              border:"1px solid rgba(245,158,11,.50)",
              boxShadow:"0 10px 28px rgba(120,72,18,.20)"
            }:{};
            return <article className={`event-card ${event.archived?"archived":""}`} key={event.id} style={{gridTemplateColumns:"250px minmax(0,1fr)",...giftedStyle,...inProgressStyle}}>
            <div className="event-date" style={{width:"100%",minWidth:0,boxSizing:"border-box",padding:"10px 14px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",gap:3,overflow:"hidden"}}><strong style={{fontSize:15,lineHeight:1.2,whiteSpace:"nowrap"}}>{event.date?new Date(event.date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long"}).replace(/^./,c=>c.toUpperCase()):"Date"}</strong><span style={{fontSize:13,fontWeight:800,whiteSpace:"nowrap"}}>{event.date?new Date(event.date+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"}):"Non renseignée"}</span></div>
            <div className="event-content">
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <button type="button" onClick={()=>setViewEvent(event)} style={{padding:0,border:0,background:"transparent",color:"inherit",fontWeight:900,fontSize:"inherit",cursor:"pointer",textAlign:"left"}}>👁️ {event.name}</button>
                {event.contractStatus==="SIGNED"&&<span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dcfce7",color:"#166534",fontSize:12,fontWeight:700}}>🟢 Contrat signé</span>}
                {event.preparation?.gifted&&<span style={{display:"inline-block",padding:"5px 10px",borderRadius:999,background:"#7e22ce",color:"#faf5ff",border:"1px solid #c084fc",fontSize:12,fontWeight:900}}>🎁 DON / PRESTATION OFFERTE</span>}
                {event.status==="IN_PROGRESS"&&<span style={{display:"inline-block",padding:"5px 10px",borderRadius:999,background:"#92400e",color:"#ffedd5",border:"1px solid #f59e0b",fontSize:12,fontWeight:900}}>🟠 ÉVÉNEMENT EN COURS</span>}
                {event.status==="COMPLETED"&&<span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dcfce7",color:"#166534",fontSize:12,fontWeight:700}}>✅ Prestation terminée</span>}
                <span className={`booking-status status-${(event.bookingStatus||"CONFIRMED").toLowerCase()}`}>
                  {event.bookingStatus==="OPTION"?"🟠 Option":event.bookingStatus==="QUOTE_SENT"?"📤 Devis envoyé":event.bookingStatus==="QUOTE_DRAFT"?"📝 Devis":event.bookingStatus==="CONFIRMED"?"🟢 Confirmé":event.bookingStatus==="COMPLETED"?"🔵 Terminé":event.bookingStatus==="DECLINED"?"⚪ Refusé":event.bookingStatus==="CANCELLED"?"🔴 Annulé":"Statut"}
                </span>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"14px 0 10px"}}>
                <div style={{
                  flex:"1 1 250px",minWidth:220,maxWidth:390,padding:"16px 20px",borderRadius:18,
                  border:"1px solid #1677ff",background:"linear-gradient(135deg,rgba(10,83,214,.92),rgba(7,52,145,.92))",
                  boxShadow:"0 8px 24px rgba(0,92,255,.18)",display:"flex",alignItems:"center",gap:16
                }}>
                  <span style={{fontSize:34}}>🖥️</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,letterSpacing:.7,textTransform:"uppercase",opacity:.9}}>Borne en prestation</div>
                    <div style={{fontSize:28,fontWeight:900,lineHeight:1.1,marginTop:4}}>{eventBooths(event).length?eventBooths(event).join(" + "):"Aucune"}</div>
                  </div>
                </div>

                <div style={{
                  flex:"1 1 280px",minWidth:240,maxWidth:430,padding:"16px 20px",borderRadius:18,
                  border:"1px solid #8b5cf6",background:"linear-gradient(135deg,rgba(100,53,180,.92),rgba(70,39,132,.92))",
                  boxShadow:"0 8px 24px rgba(124,58,237,.16)",display:"flex",alignItems:"center",gap:16
                }}>
                  <span style={{fontSize:34}}>🖨️</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,letterSpacing:.7,textTransform:"uppercase",opacity:.9}}>Impressions choisies par le client</div>
                    <div style={{fontSize:28,fontWeight:900,lineHeight:1.1,marginTop:4}}>{eventPrintChoice(event)}</div>
                  </div>
                </div>
              </div>

              {eventExtraMaterials(event).length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",margin:"0 0 12px"}}>
                {eventExtraMaterials(event).slice(0,5).map((m,i)=><span key={`${m}-${i}`} style={{
                  display:"inline-flex",alignItems:"center",padding:"6px 10px",borderRadius:999,
                  border:"1px solid rgba(148,163,184,.22)",background:"rgba(30,41,59,.58)",fontSize:12,fontWeight:700
                }}>{materialShortLabel(m)}</span>)}
                {eventExtraMaterials(event).length>5&&<span style={{
                  display:"inline-flex",alignItems:"center",padding:"6px 10px",borderRadius:999,
                  border:"1px solid rgba(148,163,184,.22)",background:"rgba(30,41,59,.58)",fontSize:12,fontWeight:800
                }}>+{eventExtraMaterials(event).length-5} autre(s)</span>}
              </div>}

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
                <button onClick={()=>setViewEvent(event)} style={{border:"1px solid #60a5fa",background:"rgba(30,64,175,.22)",color:"#bfdbfe",fontWeight:900}}>👁️ Voir l'événement</button>
                {event.address&&<button onClick={()=>window.open(`https://waze.com/ul?q=${encodeURIComponent(event.address)}&navigate=yes&utm_source=lp28-suite`,`_blank`,`noopener,noreferrer`)} style={{border:"1px solid #38bdf8",background:"rgba(14,116,144,.20)",color:"#bae6fd",fontWeight:900}}>🚗 Se rendre à l’événement</button>}
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
                {event.status!=="COMPLETED"&&event.status!=="IN_PROGRESS"&&<button onClick={()=>startEvent(event)} style={{border:"1px solid #f59e0b",background:"rgba(146,64,14,.28)",color:"#fdba74",fontWeight:900}}>▶️ Début événement</button>}
                {event.status==="IN_PROGRESS"&&<button onClick={()=>completeEvent(event)} style={{border:"1px solid #22c55e",background:"rgba(22,101,52,.24)",color:"#86efac",fontWeight:900}}>✅ Prestation terminée</button>}
                <button onClick={()=>{setFormEvent(event);setShowForm(true)}}>✏️ Modifier</button>
                <button onClick={()=>archive(event)}>{event.archived?"♻️ Réactiver":"📦 Archiver"}</button>
                <button className="danger-btn" onClick={()=>remove(event)}>🗑️ Supprimer</button>
              </div>
            </div>
          </article>;})}
        </div>
      </> : view==="planning" ? <>
        <FamilyPlanningAccountControls onChanged={()=>setPlanningRefresh(v=>v+1)}/><AdminPlanningCalendar events={events} refreshKey={planningRefresh} onOpenEvent={event=>{setFormEvent(event);setShowForm(true)}} onDeleteEvent={isAdmin?remove:undefined}/>
        <section className="planning-legend"><span><i className="dot dot-marriage"></i>Mariage</span><span><i className="dot dot-anniversaire"></i>Anniversaire</span><span><i className="dot dot-entreprise"></i>Entreprise</span><span><i className="dot dot-bapteme"></i>Baptême</span><span><i className="dot dot-autre"></i>Autre</span>{isAdmin&&<span style={{fontWeight:800}}>🎁 Don / prestation offerte</span>}</section>
      </> : view==="inventory" ? <AdminInventory/> : view==="materialPlanning" ? <MaterialPlanning/> : view==="longPlanning" ? <LongRangePlanning/> : view==="galleries" ? <AdminGalleries/> : view==="booths" ? <AdminBooths/> : view==="collaborators" ? <CollaboratorsPanel/> : view==="google" ? <GooglePanel/> : view==="settings" ? <SettingsPage user={user}/> : view==="assistance" ? <AssistanceCenter/> : view==="documents" ? <AdminDocuments events={events} onOpen={setDocumentEvent}/> : null}
    </main>

    {showForm&&<EventForm event={formEvent} onClose={()=>{setShowForm(false);setFormEvent(undefined)}} onSaved={saved}/>}
    {viewEvent&&(
      <EventConsultationModal
        event={viewEvent}
        onClose={()=>setViewEvent(null)}
        onEdit={event=>{
          setViewEvent(null);
          setFormEvent(event);
          setShowForm(true);
        }}
        onDocuments={event=>{
          setDocumentEvent(event);
          setViewEvent(null);
        }}
      />
    )}
    {shareEvent&&<ShareModal event={shareEvent} onClose={()=>setShareEvent(null)}/>}
    {documentEvent&&<DocumentManager event={documentEvent} onClose={()=>setDocumentEvent(null)}/>}
  </div></>;
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

function FamilyPlanningPage(){
  const [session,setSession]=useState(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [events,setEvents]=useState([]);
  const [blocks,setBlocks]=useState([]);
  const [form,setForm]=useState({startDate:"",endDate:"",notes:""});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    // Le raccourci familial doit conserver sa propre identité et son URL propre.
    if(window.location.pathname === "/planning-famille" && (window.location.search || window.location.hash)){
      window.history.replaceState({}, "", "/planning-famille");
    }
    const oldTitle=document.title;
    document.title="Planning familial LP28";

    let manifest=document.querySelector('link[rel="manifest"]');
    const oldManifestHref=manifest?.getAttribute("href") || null;
    let created=false;
    if(!manifest){
      manifest=document.createElement("link"); manifest.rel="manifest"; document.head.appendChild(manifest); created=true;
    }
    manifest.setAttribute("href","/planning-famille.webmanifest");

    let theme=document.querySelector('meta[name="theme-color"]');
    if(theme) theme.setAttribute("content","#0f172a");

    return ()=>{
      document.title=oldTitle;
      if(created) manifest?.remove();
      else if(manifest && oldManifestHref) manifest.setAttribute("href",oldManifestHref);
    };
  },[]);

  const load=async()=>{
    const s=await fetch("/api/family-planning/session").then(r=>r.json()).catch(()=>({authenticated:false}));
    setSession(s);
    if(s.authenticated){
      const d=await fetch("/api/family-planning/data").then(r=>r.json());
      setEvents(d.events||[]); setBlocks(d.blocks||[]);
    }
  };
  useEffect(()=>{load()},[]);

  useEffect(()=>{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(err=>console.warn("Service worker LP28 :",err));
    }
    const onBeforeInstall=e=>{e.preventDefault();setInstallPrompt(e)};
    const onInstalled=()=>{setInstallPrompt(null);setIsStandalone(true)};
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    return ()=>{
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  async function installLp28(){
    if(installPrompt){
      installPrompt.prompt();
      await installPrompt.userChoice.catch(()=>null);
      setInstallPrompt(null);
      return;
    }
    alert("Pour installer LP28 Suite : ouvre le menu de ton navigateur puis choisis ‘Installer l’application’ ou ‘Ajouter à l’écran d’accueil’. Sur iPhone/iPad : Partager → Sur l’écran d’accueil.");
  }

  async function login(e){
    e.preventDefault(); setError("");
    const r=await fetch("/api/family-planning/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setError(d.message||"Connexion impossible.");return;}
    setSession(d); await load();
  }
  async function logout(){await fetch("/api/family-planning/logout",{method:"POST"});setSession({authenticated:false});}
  async function block(e){
    e.preventDefault(); if(!form.startDate||!form.endDate)return;
    setSaving(true);
    const r=await fetch("/api/family-planning/blocks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const d=await r.json().catch(()=>({})); setSaving(false);
    if(!r.ok)return alert(d.message||"Impossible de bloquer cette période.");
    setForm({startDate:"",endDate:"",notes:""}); await load();
  }
  async function unblock(id){
    if(!confirm("Débloquer cette période ?"))return;
    const r=await fetch(`/api/family-planning/blocks/${id}`,{method:"DELETE"});
    const d=await r.json().catch(()=>({})); if(!r.ok)return alert(d.message||"Impossible de débloquer."); await load();
  }
  if(session===null)return <div className="loading">Chargement…</div>;
  if(!session.authenticated)return <div className="login-page"><form className="login-card" onSubmit={login}><div className="eyebrow">LP28</div><h1>📅 Planning familial</h1><p className="muted">Consultation des locations et blocage des périodes non réservables.</p><label>Adresse e-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<div className="error-box">{error}</div>}<button className="primary" type="submit">Se connecter</button></form></div>;

  return <div style={{maxWidth:1450,margin:"0 auto",padding:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:16}}><div><div className="eyebrow">LOCATION PHOTOBOOTH 28</div><h1 style={{margin:"4px 0"}}>📅 Planning familial</h1><p className="muted" style={{margin:0}}>Consultation générale · accès limité</p></div><button className="secondary-btn" onClick={logout}>Déconnexion</button></div>
    <section className="panel" style={{marginBottom:16}}><h2>🚫 Bloquer une période</h2><form onSubmit={block} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,alignItems:"end"}}><div><label>Du</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/></div><div><label>Au</label><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required/></div><div><label>Motif (facultatif)</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Week-end famille, vacances…"/></div><button className="primary" disabled={saving}>{saving?"Blocage…":"🚫 NON RÉSERVABLE"}</button></form></section>
    {blocks.length>0&&<section className="panel" style={{marginBottom:16}}><h2>Mes périodes bloquées</h2><div style={{display:"flex",flexDirection:"column",gap:8}}>{blocks.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:10,border:"1px solid #475569",borderRadius:10}}><div><strong>🚫 {new Date(b.startAt).toLocaleDateString("fr-FR")} → {new Date(b.endAt).toLocaleDateString("fr-FR")}</strong>{b.notes&&<div className="muted">{b.notes}</div>}</div><button className="secondary-btn" onClick={()=>unblock(b.id)}>🔓 Débloquer</button></div>)}</div></section>}
    <CalendarView events={events} onOpenEvent={()=>{}} />
  </div>;
}

export default function App(){
  const path=window.location.pathname;

  if(path === "/planning-famille"){
    return <FamilyPlanningPage/>;
  }

  const registerMatch=path.match(/^\/inscription\/([^/]+)$/);
  if(registerMatch)return <RegisterPage token={registerMatch[1]}/>;

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

  const [loading,setLoading]=useState(true),[auth,setAuth]=useState(false),[currentUser,setCurrentUser]=useState(null);
  useEffect(()=>{
    let local=DEFAULT_APPEARANCE;try{local=normalizeAppearance(JSON.parse(localStorage.getItem("lp28.appearance")||"{}"));}catch{}
    applyAppearance(local);
    let current=local;
    const refresh=()=>applyAppearance(current);
    const timer=setInterval(refresh,60000);
    const onChange=e=>{current=normalizeAppearance(e?.detail||current);applyAppearance(current);};
    window.addEventListener("lp28-appearance-changed",onChange);
    fetch("/api/session").then(r=>r.json()).then(async d=>{
      setAuth(!!d.authenticated);setCurrentUser(d.user||null);
      if(d.authenticated){
        try{const r=await fetch("/api/account/appearance");const a=await r.json();if(a?.ok&&a.appearance){current=normalizeAppearance(a.appearance);applyAppearance(current);}}catch{}
      }
    }).finally(()=>setLoading(false));
    return()=>{clearInterval(timer);window.removeEventListener("lp28-appearance-changed",onChange);};
  },[]);
  async function logout(){await fetch("/api/logout",{method:"POST"});setAuth(false);setCurrentUser(null)}
  if(loading)return <div className="loading">Chargement…</div>;
  return auth?<Dashboard onLogout={logout} user={currentUser}/>:<><LP28ThemeStyles/><Login onLogin={u=>{setCurrentUser(u);setAuth(true)}}/></>;
}

