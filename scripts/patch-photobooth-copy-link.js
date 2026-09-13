const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');
const MARK='LP28_PHOTOBOOTH_COPY_LINK_V1';
if(src.includes(MARK)){console.log('[photobooth-copy-link] déjà appliqué');process.exit(0);}

const anchor='{e.fotoshareUrl&&<><p className="portal-note">La galerie Photos du Photobooth est disponible pendant 30 jours après l’événement.</p>';
if(!src.includes(anchor)) throw new Error('[photobooth-copy-link] zone Photos du Photobooth introuvable');

const block=`{e.fotoshareUrl&&<><p className="portal-note">La galerie Photos du Photobooth est disponible pendant 30 jours après l’événement.</p>\n      <div className="lp28-photobooth-link-box" style={{marginTop:12,padding:"14px",border:"1px solid rgba(214,185,79,.28)",borderRadius:12,background:"rgba(214,185,79,.055)"}}>\n        {/* ${MARK} */}\n        <div style={{fontWeight:850,marginBottom:5}}>💻 Retrouvez vos photos sur ordinateur</div>\n        <div className="portal-note" style={{marginBottom:10}}>Pour consulter ou télécharger vos photos plus facilement sur un ordinateur, copiez le lien ci-dessous puis ouvrez-le depuis votre ordinateur.</div>\n        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>\n          <button type="button" className="portal-action" onClick={async()=>{try{await navigator.clipboard.writeText(e.fotoshareUrl);alert("✅ Lien Photos du Photobooth copié !")}catch(_){window.prompt("Copiez ce lien :",e.fotoshareUrl)}}}>🔗 Copier le lien Photos du Photobooth</button>\n          {navigator.share&&<button type="button" className="portal-action" onClick={async()=>{try{await navigator.share({title:"Photos du Photobooth",text:"Retrouvez les photos de notre événement :",url:e.fotoshareUrl})}catch(_){}}}>📤 Partager le lien</button>}\n        </div>\n      </div>`;
src=src.replace(anchor,block);
fs.writeFileSync(file,src,'utf8');
console.log('[photobooth-copy-link] OK : copie + partage du lien Photos du Photobooth ajoutés');
