import React, {useEffect,useMemo,useState} from "react";

// Guide technique LP28. Valeurs indicatives à confirmer sur chaque borne.
// Le composant est uniquement consultatif : il ne pilote pas le boîtier.
const BOOTHS={
  lola:{name:"Lola",trigger:"Godox X2T-N",orientation:"Portrait (borne miroir)"},
  nina:{name:"Nina",trigger:"Godox X2T-N",orientation:"Paysage"},
  gabin:{name:"Gabin",trigger:"AT-16",orientation:"Selon montage"}
};
const BASE=[
  ["Mode","M (manuel)"],["Vitesse","1/160 s"],["Ouverture","f/8"],
  ["Sensibilité","ISO 100 · ISO auto désactivé"],["Autofocus","AF-S · collimateur adapté aux visages"],
  ["Déclenchement","S (vue par vue)"],["Mesure","Matricielle"],
  ["Balance des blancs","Flash (~ 5400 K)"],["Qualité","JPEG Fine · taille L"],
  ["Espace couleur","sRVB"],["Flash externe","Manuel 1/8, à ajuster après essai"],
  ["Flash intégré","Fermé"],["Bracketing","Désactivé (BKT 0)"]
];
const MENUS=[
  {title:"Prise de vue photo",rows:[
    ["Qualité / taille","JPEG Fine · L"],["Compression JPEG","Priorité à la qualité"],["Zone d'image","DX"],
    ["Picture Control","Standard"],["D-Lighting actif / HDR","Désactivés"],["Réduction du bruit ISO","Faible"],
    ["Balance des blancs","Flash"],["Couleur","sRVB"],["Sensibilité","100 · auto désactivé"],
    ["ML-L3 / surimpression / intervallomètre","Désactivés"]]},
  {title:"A · Autofocus",rows:[
    ["a1 Priorité AF-C","Déclenchement"],["a2 Priorité AF-S","Mise au point (peut bloquer si AF échoue)"],
    ["a3 Lock-On","AF 3 normal"],["a4 Activation AF","Déclencheur / AF-ON"],
    ["a5 Éclairage point AF","Auto"],["a5 Point AF en MAP manuelle","Activé"],
    ["a6 Rotation point AF","Désactivée"],["a7 Nombre de points AF","11"],
    ["a8 Points AF par orientation","Non"],["a9 Illuminateur AF","Activé (pas en Live View)"]]},
  {title:"B · Mesure / exposition",rows:[
    ["b1 Incrément sensibilité","1/3 IL"],["b2 Incrément exposition","1/3 IL"],
    ["b3 Correction exposition simplifiée","Désactivée"],["b4 Zone pondérée centrale","Ø 8 mm"],
    ["b5 Réglage précis exposition","Ne pas modifier (0)"]]},
  {title:"C · Temporisations",rows:[
    ["c1 Mémo expo par déclencheur","Désactivée"],
    ["c2 Mode veille","Durée longue disponible ; vérifier avec LumaBooth"],
    ["c3 Retardateur","10 s / 1 photo / 0,5 s ; molette sur S"],
    ["c4 Extinction moniteur","Visualisation 10 s · menus 1 min · infos 10 s · images 4 s · Live View pas de limite"],
    ["c5 Télécommande ML-L3","1 minute (ML-L3 désactivée)"]]},
  {title:"D · Prise de vue / affichage",rows:[
    ["d1 Signal sonore","Désactivé"],["d2 Continu basse vitesse","3 vps"],
    ["d3 Vues maximales","100"],["d4 Temporisation miroir levé","Désactivée"],
    ["d5 Avertissement flash","Activé"],["d6 Numérotation fichiers","Activée"],
    ["d7 Quadrillage viseur","Désactivé"],["d8 Réglage simple ISO","Désactivé"],
    ["d9 Affichage informations","Automatique"],["d10 Éclairage écran","Désactivé"],
    ["d11 Type piles MB-D15","Sans objet sans poignée"],["d12 Ordre alimentation MB-D15","Sans objet sans poignée"]]},
  {title:"E · Bracketing / flash",rows:[
    ["e1 Synchro flash","1/250 s (sans Auto FP)"],["e2 Vitesse flash","1/60 s (sans effet en M à 1/160 s)"],
    ["e3 Flash intégré","TTL par défaut ; flash fermé"],
    ["e4 Correction expo flash","Vue dans son ensemble"],["e5 Lampe pilote","Désactivée"],
    ["e6 Bracketing auto","Exposition auto & flash ; BKT 0"],["e7 Sens bracketing","Mesure → sous-expo → surexpo"]]},
  {title:"F · Commandes",rows:[
    ["f1 Bouton OK","Point AF central"],["f2 Fn","Défaut (sans action essentielle)"],
    ["f3 Aperçu","Aperçu"],["f4 AE-L/AF-L","Mémo exposition / AF"],
    ["f5 Molettes","Vitesse arrière / ouverture avant"],["f6 Commande lâchée + molette","Non"],
    ["f7 Déclenchement sans carte","Uniquement après confirmation du transfert USB"],
    ["f8 Inversion indicateurs","− à gauche / + à droite"],["f9 Enregistrement vidéo","Aucune fonction"],
    ["f10 MB-D15","Sans objet sans poignée"],["f11 Télécommande WR","Sans objet sans télécommande"]]}
];
const TESTS=[
  "Alimentation EP-5B stable et connecteurs bien fixés",
  "LumaBooth détecte le Nikon en USB",
  "Mode M : 1/160 s · f/8 · ISO 100 · AF-S · S",
  "Déclencheur et flash externes synchronisés",
  "Netteté des visages satisfaisante",
  "Couleur, exposition et cadrage contrôlés",
  "20/20 déclenchements réussis et photos reçues sur le PC",
  "Impression vérifiée si une imprimante est prévue"
];
const DIAG=[
  ["Trigger shutter timed out","Contrôler USB, EP-5B, mode AF-S et possibilité de faire le point. Tester une mise au point manuelle à distance fixe si nécessaire."],
  ["Camera disconnected","Examiner alimentation, câble USB, connecteur, Windows, puis reconnexion dans LumaBooth."],
  ["Pas de flash","Vérifier piles, canal, groupe et veille du X2T-N / AT-16 ainsi que la puissance du flash."],
  ["Photo sombre ou surexposée","Adapter la puissance / distance du Godox, en conservant une base M cohérente."],
  ["Photo floue","Vérifier collimateur, lumière, distance des invités et fonctionnement de l'AF-S."]
];
const STYLE={
  panel:{border:"1px solid rgba(214,185,79,.28)",borderRadius:16,padding:17,marginBottom:12,background:"rgba(128,128,128,.06)"},
  muted:{opacity:.8,lineHeight:1.5},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10},
  spec:{border:"1px solid rgba(214,185,79,.3)",borderRadius:12,padding:12,background:"rgba(214,185,79,.07)"},
  toolbar:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"},
  row:{padding:"9px 4px",borderBottom:"1px solid rgba(128,128,128,.24)",verticalAlign:"top",overflowWrap:"anywhere"}
};
function stored(key){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x&&typeof x==="object"?x:{}}catch{return {}}}
export default function CameraSettingsPage(){
  const [booth,setBooth]=useState("lola");
  const [tab,setTab]=useState("essentiel");
  const [checks,setChecks]=useState(()=>stored("lp28.camera.checks.v1"));
  const [notes,setNotes]=useState(()=>stored("lp28.camera.notes.v1"));
  const current=BOOTHS[booth],done=Array.isArray(checks[booth])?checks[booth]:[];
  useEffect(()=>{try{localStorage.setItem("lp28.camera.checks.v1",JSON.stringify(checks))}catch{}},[checks]);
  useEffect(()=>{try{localStorage.setItem("lp28.camera.notes.v1",JSON.stringify(notes))}catch{}},[notes]);
  const fullText=useMemo(()=>[
    "LP28 — Nikon D7200 — "+current.name+" — Fiche à valider",
    "Déclencheur : "+current.trigger+" — "+current.orientation,
    "",...BASE.map(x=>x.join(" : ")),
    ...MENUS.flatMap(g=>["","### "+g.title,...g.rows.map(x=>x.join(" : "))]),
    "","CHECKLIST",...TESTS.map((s,i)=>(done.includes(i)?"[x] ":"[ ] ")+s),
    "","NOTES",notes[booth]||"Aucune observation."
  ].join("\n"),[booth,current,done,notes]);
  function toggle(i){setChecks(p=>{const v=Array.isArray(p[booth])?p[booth]:[];return {...p,[booth]:v.includes(i)?v.filter(x=>x!==i):[...v,i]}})}
  async function copy(){try{await navigator.clipboard.writeText(fullText);alert("Fiche copiée.")}catch{window.prompt("Copier la fiche :",fullText)}}
  return <div className="lp28-camera-guide" style={{display:"grid",gap:12}}>
    <section style={STYLE.panel}>
      <div style={{fontSize:12,color:"#d6b94f",fontWeight:900,letterSpacing:1}}>🔒 ADMIN LP28 · DOCUMENTATION TECHNIQUE</div>
      <h2 style={{margin:"8px 0"}}>📷 Réglages appareils photo</h2>
      <p style={STYLE.muted}>Guide Nikon D7200 pour Lola, Nina et Gabin. Réglages proposés à confirmer sur chaque borne : cette page ne modifie pas directement l'appareil.</p>
      <div style={STYLE.toolbar}>{Object.entries(BOOTHS).map(([id,b])=><button type="button" key={id} className={booth===id?"primary":""} aria-pressed={booth===id} onClick={()=>setBooth(id)}>📸 {b.name}</button>)}</div>
    </section>
    <section style={STYLE.panel}>
      <h2 style={{margin:"0 0 6px"}}>📸 {current.name} — Nikon D7200</h2>
      <p style={STYLE.muted}>Déclencheur <strong>{current.trigger}</strong> · {current.orientation} · configuration à valider après réinitialisation.</p>
      <div style={STYLE.toolbar}><button type="button" className="primary" onClick={copy}>📋 Copier la fiche</button><button type="button" onClick={()=>window.print()}>🖨️ Imprimer</button></div>
    </section>
    <div style={STYLE.toolbar} role="tablist" aria-label="Sections réglages appareil photo">
      {[["essentiel","⚙️ Réglages M"],["menus","📑 Menus Nikon A–F"],["tests","✅ Checklist"],["depannage","🛠️ Dépannage"]].map(([id,t])=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?"primary":""} onClick={()=>setTab(id)}>{t}</button>)}
    </div>
    {tab==="essentiel"&&<section style={STYLE.panel} role="tabpanel">
      <h2>Réglages essentiels · mode M</h2>
      <div style={STYLE.grid}>{BASE.map(([name,value])=><div key={name} style={STYLE.spec}><div style={{fontSize:12,opacity:.76,marginBottom:5}}>{name}</div><strong>{value}</strong></div>)}</div>
      <p style={STYLE.muted}>Objectif 18–55 mm : adapter focale et recul des invités ; désactiver le VR si le matériel est parfaitement fixe. Le Godox à 1/8 n'est qu'une base : contrôler le résultat réel.</p>
      <p style={STYLE.muted}><strong>Sans carte SD :</strong> ne permettre le déclenchement sans carte qu'après avoir vérifié l'enregistrement des photos par LumaBooth en USB.</p>
    </section>}
    {tab==="menus"&&<section style={STYLE.panel} role="tabpanel">
      <h2>Menus Nikon D7200 · valeurs de référence</h2>
      <p style={STYLE.muted}>Développe chaque groupe. Si le texte affiché sur ton Nikon diffère, privilégie la notice officielle et les tests réels.</p>
      {MENUS.map((g,i)=><details key={g.title} open={i===1?true:undefined} style={{padding:10,border:"1px solid rgba(128,128,128,.25)",borderRadius:12,marginBottom:8}}>
        <summary style={{cursor:"pointer",fontWeight:800}}>{g.title} ({g.rows.length})</summary>
        <table style={{width:"100%",borderCollapse:"collapse",marginTop:8}}><tbody>{g.rows.map(([name,value])=><tr key={name}><td style={{...STYLE.row,fontWeight:700,width:"45%"}}>{name}</td><td style={STYLE.row}>{value}</td></tr>)}</tbody></table>
      </details>)}
    </section>}
    {tab==="tests"&&<section style={STYLE.panel} role="tabpanel">
      <h2>Checklist {current.name} · {done.length}/{TESTS.length}</h2>
      <p style={STYLE.muted}>Effectuer une nouvelle vérification à chaque installation, changement d'alimentation ou modification du Nikon.</p>
      {TESTS.map((t,i)=><label key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 2px",borderBottom:"1px solid rgba(128,128,128,.2)"}}><input type="checkbox" checked={done.includes(i)} onChange={()=>toggle(i)} style={{width:19,height:19,flexShrink:0}}/><span>{t}</span></label>)}
      <button type="button" onClick={()=>{if(window.confirm("Effacer les coches de "+current.name+" ?"))setChecks(p=>({...p,[booth]:[]}))}} style={{marginTop:12}}>↺ Réinitialiser les coches</button>
      <h3>Observations de {current.name}</h3>
      <textarea style={{width:"100%",boxSizing:"border-box",minHeight:115,padding:12,borderRadius:12}} aria-label="Observations sur les réglages" value={notes[booth]||""} onChange={e=>setNotes(p=>({...p,[booth]:e.target.value}))} placeholder="Résultat des 20 photos, distance, puissance flash, date..."/>
      <p style={STYLE.muted}>⚠️ Les coches et observations sont enregistrées uniquement dans ce navigateur, pas synchronisées entre PC et téléphone. Le guide commun reste disponible depuis LP28.</p>
    </section>}
    {tab==="depannage"&&<section style={STYLE.panel} role="tabpanel">
      <h2>Dépannage rapide · {current.name}</h2>
      {DIAG.map(([name,solution])=><details key={name} style={{padding:"11px 4px",borderBottom:"1px solid rgba(128,128,128,.23)"}}><summary style={{cursor:"pointer",fontWeight:800}}>{name}</summary><p style={STYLE.muted}>{solution}</p></details>)}
      <p style={STYLE.muted}>En cas de panne intermittente, comparer les heures des journaux LumaBooth, Agent LP28 et Windows avant de remplacer un composant.</p>
    </section>}
    <p style={{...STYLE.muted,fontSize:12}}>LP28 · Fiche D7200 v1 · 21 octobre 2026 · réglages indicatifs à valider sur matériel réel.</p>
  </div>;
