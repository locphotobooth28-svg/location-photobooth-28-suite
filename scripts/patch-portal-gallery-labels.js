const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');
let changes=0;

const replacements=[
  ['>📸 Photos Borne</a>','>📸 Photos du Photobooth</a>'],
  ['>📸 Photos Borne — lien bientôt disponible</div>','>📸 Photos du Photobooth — lien bientôt disponible</div>'],
  ['>❤️ Photos partagées</a>','>📱 Galerie photos QR Code</a>'],
  ['<h2>❤️ Photos partagées</h2>','<h2>📱 Galerie photos QR Code</h2>'],
  ['La galerie Photos Borne est disponible pendant 30 jours après l’événement.','La galerie Photos du Photobooth est disponible pendant 30 jours après l’événement.'],
  ['Galerie Photos Borne — lien LumaBooth / FotoShare','Galerie Photos du Photobooth — lien LumaBooth / FotoShare'],
  ['Ce lien alimente le bouton « Photos Borne » du portail. Accès client prévu pendant 30 jours.','Ce lien alimente le bouton « Photos du Photobooth » du portail. Accès client prévu pendant 30 jours.']
];

for(const [oldValue,newValue] of replacements){
  if(src.includes(oldValue)){
    src=src.split(oldValue).join(newValue);
    changes++;
  }
}

const galleryText='La galerie Photos du Photobooth est disponible pendant 30 jours après l’événement.';
const infoText='En cas d’indisponibilité ou de mauvaise qualité réseau, les photos du Photobooth seront disponibles quand la borne fera son retour à notre atelier.';
const apology='Désolé de ce désagrément, mais c’est bien sûr contre notre volonté.';
const infoBlock=`<div style={{marginTop:12,padding:"12px 14px",borderRadius:12,border:"1px solid rgba(59,130,246,.55)",background:"rgba(30,64,175,.12)",display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:18,lineHeight:1}}>ℹ️</span><div><div style={{fontSize:13,lineHeight:1.55}}>${infoText}</div><div style={{fontSize:13,lineHeight:1.55,fontWeight:800,marginTop:4}}>${apology}</div></div></div>`;

const portalNote=`{e.fotoshareUrl&&<p className="portal-note">${galleryText}</p>}`;
const portalNoteWithInfo=`{e.fotoshareUrl&&<><p className="portal-note">${galleryText}</p>${infoBlock}</>}`;

if(src.includes(portalNote)&&!src.includes(infoText)){
  src=src.split(portalNote).join(portalNoteWithInfo);
  changes++;
}

if(!changes){
  if(src.includes('Photos du Photobooth')&&src.includes('Galerie photos QR Code')&&src.includes(infoText)){
    console.log('[LP28] Intitulés et information réseau déjà à jour.');
    process.exit(0);
  }
  throw new Error('[LP28] Zone galerie organisateur/invité introuvable.');
}

fs.writeFileSync(file,src,'utf8');
console.log(`[LP28] ${changes} modification(s) galerie appliquée(s), JSX valide avec information réseau.`);
