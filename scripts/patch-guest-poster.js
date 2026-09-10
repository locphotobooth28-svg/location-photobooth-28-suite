const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const needle=`    <details style={{marginTop:16}}>\n      <summary style={{cursor:"pointer",fontWeight:800}}>Liens LP28</summary>`;
if(!src.includes(needle)){console.error('[guest-poster] ShareModal insertion point missing');process.exit(1);}

const insert=`    <div style={{marginTop:16,padding:14,border:"1px solid rgba(234,179,8,.35)",borderRadius:14,background:"rgba(234,179,8,.05)"}}>
      <div style={{fontWeight:900,fontSize:"1.05rem",marginBottom:6}}>🖼️ Affiche pour vos invités</div>
      <div className="muted" style={{marginBottom:12}}>Créez une affiche A4 avec le QR Code Invité. Vous pourrez l’imprimer et la placer près de la borne, à l’entrée ou sur les tables.</div>
      <button type="button" className="primary" onClick={()=>{
        const guestUrl=share.guestUrl||"";
        if(!guestUrl)return alert("Le lien Invité n’est pas encore disponible.");
        const qr='https://api.qrserver.com/v1/create-qr-code/?size=700x700&data='+encodeURIComponent(guestUrl);
        const w=window.open('', '_blank');
        if(!w)return alert("Autorisez les fenêtres pop-up pour générer l’affiche.");
        w.document.write(\`<!doctype html><html><head><meta charset="utf-8"><title>Affiche invités - \${event.name}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#111}.page{width:210mm;height:297mm;padding:18mm 16mm;display:flex;flex-direction:column;align-items:center;text-align:center;border:8px solid #d4af37}.brand{font-size:18px;font-weight:900;letter-spacing:2px;margin-bottom:18px}.title{font-size:46px;font-weight:900;margin:6px 0;color:#111}.event{font-size:24px;font-weight:800;margin-bottom:12px}.lead{font-size:25px;font-weight:800;margin:8px 0 18px}.qr{width:105mm;height:105mm;object-fit:contain;border:4px solid #d4af37;border-radius:18px;padding:8px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%;margin-top:20px;font-size:15px;font-weight:700}.step{padding:10px 5px}.icon{font-size:28px;display:block;margin-bottom:5px}.foot{margin-top:auto;font-size:20px;font-weight:800}.sub{font-size:14px;margin-top:5px}@media print{.no-print{display:none!important}}</style></head><body><div class="page"><div class="brand">📸 LOCATION PHOTOBOOTH 28</div><div class="title">INVITÉS</div><div class="event">\${event.name}</div><div class="lead">Scannez le QR Code et retrouvez les photos de l’événement !</div><img class="qr" src="\${qr}"><div class="steps"><div class="step"><span class="icon">🖼️</span>Consultez<br>les photos</div><div class="step"><span class="icon">👆</span>Sélectionnez<br>vos préférées</div><div class="step"><span class="icon">⬇️</span>Téléchargez<br>directement</div><div class="step"><span class="icon">📲</span>Partagez<br>vos souvenirs</div></div><div class="foot">Merci d’être là ! ✨<div class="sub">Location Photobooth 28 — Vos souvenirs prennent vie</div></div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\\/script></body></html>\`);
        w.document.close();
      }}>🖨️ Générer l’affiche invités A4</button>
    </div>
`;
src=src.replace(needle,insert+needle);
fs.writeFileSync(file,src,'utf8');
console.log('[guest-poster] OK: guest A4 poster generator added to ShareModal');
