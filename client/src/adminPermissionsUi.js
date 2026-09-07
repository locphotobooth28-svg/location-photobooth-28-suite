function normalizeText(value){
  return String(value||"").replace(/\s+/g," ").trim();
}

const portalHelp = [
  ["Organisateur : contrat", "organizer", "Voir et ouvrir le contrat de la prestation."],
  ["Organisateur : documents / factures", "organizer", "Voir les documents et factures mis à disposition."],
  ["Organisateur : partage / QR invités", "organizer", "Partager le portail invité et son QR code."],
  ["Organisateur : assistance Mathis", "organizer", "Accéder aux informations d’assistance Mathis."],
  ["Invité : galerie", "guest", "Accéder à la galerie de l’événement."],
  ["Invité : assistance Mathis", "guest", "Accéder aux informations d’assistance Mathis."],
  ["Autoriser les photos invités", "guest", "Permettre aux invités d’envoyer des photos."],
  ["Autoriser les vidéos invités", "guest", "Permettre aux invités d’envoyer des vidéos."],
  ["Modération avant publication (optionnelle)", "moderation", "Valider les médias avant leur affichage dans la galerie."]
];

function enhanceCollaborator(){
  const eyebrow=[...document.querySelectorAll(".eyebrow")].find(el=>normalizeText(el.textContent).toUpperCase()==="ACCÈS COLLABORATEUR");
  const card=eyebrow?.closest(".card");
  if(!card) return;
  card.classList.add("lp28-permissions-card","lp28-collaborator-card");

  const table=card.querySelector(".collab-permissions-table");
  if(table){
    const headers=[...table.querySelectorAll("thead th")].map(th=>normalizeText(th.textContent));
    table.querySelectorAll("tbody tr").forEach(row=>{
      row.classList.add("lp28-permission-row");
      [...row.children].forEach((cell,index)=>{
        if(headers[index]) cell.dataset.label=headers[index];
      });
    });
  }
}

function enhancePortal(){
  const summarySpan=[...document.querySelectorAll("details.accordion-block > summary span")].find(el=>normalizeText(el.textContent).includes("Portail événement"));
  const details=summarySpan?.closest("details.accordion-block");
  if(!details) return;

  details.classList.add("lp28-portal-settings");
  const grid=details.querySelector(".accordion-content > .form-grid");
  if(grid) grid.classList.add("lp28-portal-grid");

  const visibilityTitle=[...details.querySelectorAll("strong")].find(el=>normalizeText(el.textContent).includes("Visibilité des portails"));
  const visibility=visibilityTitle?.closest("div.wide");
  if(visibility){
    visibility.classList.add("lp28-portal-visibility");
    const inner=visibilityTitle.nextElementSibling;
    if(inner) inner.classList.add("lp28-portal-visibility-grid");
  }

  details.querySelectorAll("label.switch-line").forEach(label=>{
    const text=normalizeText(label.textContent);
    const match=portalHelp.find(([name])=>text.includes(name));
    if(match){
      label.classList.add("lp28-permission-switch");
      label.dataset.lp28Group=match[1];
      label.dataset.lp28Help=match[2];
    }
    if(text.includes("Activer le portail")){
      label.classList.add("lp28-portal-master");
      label.dataset.lp28Help="Mettre en ligne ou désactiver l’espace événement.";
    }
  });

  const expiration=[...details.querySelectorAll("label")].find(el=>normalizeText(el.textContent)==="Expiration");
  expiration?.parentElement?.classList.add("lp28-portal-field");
  const password=[...details.querySelectorAll("label")].find(el=>normalizeText(el.textContent).startsWith("Mot de passe"));
  password?.parentElement?.classList.add("lp28-portal-field");
  const gallery=[...details.querySelectorAll("label")].find(el=>normalizeText(el.textContent).startsWith("Galerie Photos Borne"));
  gallery?.parentElement?.classList.add("lp28-portal-field","lp28-portal-gallery-field");
}

function addStyles(){
  if(document.getElementById("lp28-admin-permissions-style")) return;
  const style=document.createElement("style");
  style.id="lp28-admin-permissions-style";
  style.textContent=`
    .lp28-permissions-card,
    .lp28-portal-settings{
      --lp28-perm-bg:#151518;
      --lp28-perm-card:#1b1b1f;
      --lp28-perm-soft:#202126;
      --lp28-perm-border:rgba(214,185,79,.32);
      --lp28-perm-line:rgba(255,255,255,.10);
      --lp28-perm-text:#f4f4f5;
      --lp28-perm-muted:#b8b8bd;
      --lp28-perm-accent:#d6b94f;
      --lp28-perm-blue:#3977f6;
      --lp28-perm-info-bg:#162238;
      --lp28-perm-info-border:#355f9c;
    }

    html[data-lp28-theme="light"] .lp28-permissions-card,
    html[data-lp28-theme="light"] .lp28-portal-settings{
      --lp28-perm-bg:#ffffff;
      --lp28-perm-card:#ffffff;
      --lp28-perm-soft:#f7f5ef;
      --lp28-perm-border:#d9c98a;
      --lp28-perm-line:#e5e0d7;
      --lp28-perm-text:#181818;
      --lp28-perm-muted:#656565;
      --lp28-perm-accent:#a57b00;
      --lp28-perm-blue:#2f6fed;
      --lp28-perm-info-bg:#eef5ff;
      --lp28-perm-info-border:#b9d2f5;
    }

    .lp28-permissions-card{
      background:var(--lp28-perm-bg)!important;
      color:var(--lp28-perm-text)!important;
      border:1px solid var(--lp28-perm-border)!important;
      border-radius:18px!important;
      padding:20px!important;
    }
    .lp28-permissions-card h3,
    .lp28-permissions-card strong,
    .lp28-permissions-card label{color:var(--lp28-perm-text)!important;}
    .lp28-permissions-card .muted{color:var(--lp28-perm-muted)!important;}
    .lp28-collaborator-card .eyebrow{color:var(--lp28-perm-accent)!important;font-weight:900;letter-spacing:.12em;}
    .lp28-collaborator-card .collab-permissions-wrap{overflow:visible;margin-top:16px;}
    .lp28-collaborator-card .collab-permissions-table{
      min-width:0!important;
      border-color:var(--lp28-perm-border)!important;
      background:var(--lp28-perm-card)!important;
      border-radius:14px!important;
    }
    .lp28-collaborator-card .collab-permissions-table th{
      background:var(--lp28-perm-soft)!important;
      color:var(--lp28-perm-text)!important;
      border-bottom-color:var(--lp28-perm-line)!important;
    }
    .lp28-collaborator-card .collab-permissions-table td{
      color:var(--lp28-perm-text)!important;
      border-bottom-color:var(--lp28-perm-line)!important;
    }
    .lp28-collaborator-card .collab-permissions-table tbody tr:hover td{background:rgba(214,185,79,.045);}
    .lp28-collaborator-card .collab-permissions-table input[type="checkbox"],
    .lp28-portal-settings input[type="checkbox"]{width:22px!important;height:22px!important;accent-color:var(--lp28-perm-accent)!important;cursor:pointer;flex:0 0 auto;}
    .lp28-collaborator-card .collab-sensitive-info{
      background:var(--lp28-perm-info-bg)!important;
      color:var(--lp28-perm-text)!important;
      border-color:var(--lp28-perm-info-border)!important;
      border-radius:12px!important;
    }

    .lp28-portal-settings{
      background:var(--lp28-perm-bg)!important;
      border:1px solid var(--lp28-perm-border)!important;
      border-radius:18px!important;
      color:var(--lp28-perm-text)!important;
      overflow:hidden;
    }
    .lp28-portal-settings > summary{
      padding:17px 18px!important;
      color:var(--lp28-perm-text)!important;
      background:var(--lp28-perm-card)!important;
      border-bottom:1px solid var(--lp28-perm-line)!important;
    }
    .lp28-portal-settings > summary small{color:var(--lp28-perm-muted)!important;}
    .lp28-portal-settings .accordion-content{padding:18px!important;background:var(--lp28-perm-bg)!important;color:var(--lp28-perm-text)!important;}
    .lp28-portal-settings .lp28-portal-grid{gap:14px!important;align-items:stretch;}
    .lp28-portal-settings label,
    .lp28-portal-settings strong{color:var(--lp28-perm-text)!important;}
    .lp28-portal-settings .muted,
    .lp28-portal-settings small{color:var(--lp28-perm-muted)!important;}
    .lp28-portal-settings input:not([type="checkbox"]){
      background:var(--lp28-perm-soft)!important;
      color:var(--lp28-perm-text)!important;
      border:1px solid var(--lp28-perm-line)!important;
      min-height:46px;
    }
    .lp28-portal-settings .lp28-portal-master,
    .lp28-portal-settings .lp28-permission-switch{
      position:relative;
      display:grid!important;
      grid-template-columns:auto 1fr;
      grid-template-rows:auto auto;
      column-gap:12px;
      row-gap:4px;
      align-items:start!important;
      padding:14px!important;
      margin:0!important;
      border:1px solid var(--lp28-perm-line)!important;
      border-radius:13px!important;
      background:var(--lp28-perm-card)!important;
      min-height:78px;
      font-weight:800;
      line-height:1.3;
    }
    .lp28-portal-settings .lp28-portal-master input,
    .lp28-portal-settings .lp28-permission-switch input{grid-row:1 / span 2;margin-top:1px!important;}
    .lp28-portal-settings .lp28-portal-master::after,
    .lp28-portal-settings .lp28-permission-switch::after{
      content:attr(data-lp28-help);
      grid-column:2;
      grid-row:2;
      display:block;
      color:var(--lp28-perm-muted)!important;
      font-size:12px;
      font-weight:500;
      line-height:1.35;
    }
    .lp28-portal-settings .lp28-portal-master{border-color:var(--lp28-perm-border)!important;background:linear-gradient(180deg,rgba(214,185,79,.08),transparent),var(--lp28-perm-card)!important;}
    .lp28-portal-settings .lp28-portal-visibility{
      padding:16px!important;
      border:1px solid var(--lp28-perm-border)!important;
      border-radius:14px!important;
      background:var(--lp28-perm-soft)!important;
    }
    .lp28-portal-settings .lp28-portal-visibility > strong{display:block;margin-bottom:4px;font-size:17px;}
    .lp28-portal-settings .lp28-portal-visibility > strong::after{
      content:"Choisissez précisément ce que chaque type d’utilisateur peut consulter.";
      display:block;margin-top:5px;color:var(--lp28-perm-muted)!important;font-size:12px;font-weight:500;
    }
    .lp28-portal-settings .lp28-portal-visibility-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin-top:14px!important;}
    .lp28-portal-settings .lp28-permission-switch[data-lp28-group="organizer"]{border-left:3px solid var(--lp28-perm-accent)!important;}
    .lp28-portal-settings .lp28-permission-switch[data-lp28-group="guest"]{border-left:3px solid var(--lp28-perm-blue)!important;}
    .lp28-portal-settings .lp28-permission-switch[data-lp28-group="moderation"]{border-left:3px solid #9b7ad8!important;}
    .lp28-portal-settings .lp28-portal-field{padding:2px 0;}
    .lp28-portal-settings .lp28-portal-field > label{display:block;margin-bottom:6px;font-weight:800;}
    .lp28-portal-settings .lp28-portal-gallery-field{grid-column:1/-1!important;}

    @media(max-width:760px){
      .lp28-permissions-card{padding:14px!important;border-radius:15px!important;}
      .lp28-collaborator-card .collab-permissions-table,
      .lp28-collaborator-card .collab-permissions-table tbody,
      .lp28-collaborator-card .collab-permissions-table tr,
      .lp28-collaborator-card .collab-permissions-table td{display:block;width:100%;}
      .lp28-collaborator-card .collab-permissions-table thead{display:none;}
      .lp28-collaborator-card .collab-permissions-table{border:0!important;background:transparent!important;}
      .lp28-collaborator-card .collab-permissions-table tbody{display:grid;gap:10px;}
      .lp28-collaborator-card .collab-permissions-table tr{
        position:relative;
        border:1px solid var(--lp28-perm-line)!important;
        border-radius:13px!important;
        background:var(--lp28-perm-card)!important;
        padding:13px 56px 13px 13px!important;
        min-height:92px;
      }
      .lp28-collaborator-card .collab-permissions-table td{
        border:0!important;padding:2px 0!important;text-align:left!important;
      }
      .lp28-collaborator-card .collab-permissions-table td:nth-child(1){font-size:15px;margin-bottom:4px;}
      .lp28-collaborator-card .collab-permissions-table td:nth-child(2){font-size:12px;color:var(--lp28-perm-muted)!important;line-height:1.4;}
      .lp28-collaborator-card .collab-permissions-table td:nth-child(3){position:absolute;right:15px;top:50%;transform:translateY(-50%);width:auto!important;}
      .lp28-collaborator-card .collab-sensitive-info{flex-direction:row!important;align-items:flex-start!important;font-size:12px;}

      .lp28-portal-settings .accordion-content{padding:13px!important;}
      .lp28-portal-settings .lp28-portal-grid{grid-template-columns:1fr!important;}
      .lp28-portal-settings .lp28-portal-visibility,
      .lp28-portal-settings .wide{grid-column:1!important;}
      .lp28-portal-settings .lp28-portal-visibility-grid{grid-template-columns:1fr!important;}
      .lp28-portal-settings .lp28-portal-master,
      .lp28-portal-settings .lp28-permission-switch{min-height:74px;padding:13px!important;}
      .lp28-portal-settings input:not([type="checkbox"]){width:100%!important;}
      .lp28-portal-settings > summary{padding:15px!important;}
      .lp28-portal-settings > summary span{font-size:15px;}
    }
  `;
  document.head.appendChild(style);
}

function enhance(){
  addStyles();
  enhanceCollaborator();
  enhancePortal();
}

export function installAdminPermissionsUi(){
  if(window.__lp28AdminPermissionsUiInstalled) return;
  window.__lp28AdminPermissionsUiInstalled=true;
  enhance();
  let count=0;
  const timer=setInterval(()=>{
    enhance();
    count+=1;
    if(count>=45) clearInterval(timer);
  },800);
  document.addEventListener("click",()=>setTimeout(enhance,60),true);
}
