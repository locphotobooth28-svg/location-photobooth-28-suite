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

if(!changes){
  if(src.includes('Photos du Photobooth')&&src.includes('Galerie photos QR Code')){
    console.log('[LP28] Intitulés des galeries déjà à jour.');
    process.exit(0);
  }
  throw new Error('[LP28] Intitulés de galerie introuvables.');
}

fs.writeFileSync(file,src,'utf8');
console.log(`[LP28] ${changes} groupe(s) d’intitulés galerie mis à jour.`);
